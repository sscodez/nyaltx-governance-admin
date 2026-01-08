import { ethers } from 'ethers';
import { CONTRACT_ABIS, CONTRACT_ADDRESSES } from './config';
import { ContractError, LegacyDepositEvent, LegacyDepositResult, MigrationVaultStats } from './types';

const LEGACY_TOKEN_ABI = [
  'function allowance(address owner, address spender) view returns (uint256)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function balanceOf(address account) view returns (uint256)',
];

type LegacyTokenContract = ethers.Contract & {
  allowance(owner: string, spender: string): Promise<bigint>;
  approve(spender: string, amount: bigint): Promise<ethers.TransactionResponse>;
  balanceOf(account: string): Promise<bigint>;
  connect(signer: ethers.Signer): LegacyTokenContract;
};

export class MigrationVaultService {
  private provider: ethers.Provider;
  private signer?: ethers.Signer;
  private contract: ethers.Contract;
  private legacyToken?: LegacyTokenContract;

  constructor(provider: ethers.Provider, signer?: ethers.Signer) {
    if (!CONTRACT_ADDRESSES.legacyMigrationVault) {
      throw new Error('Legacy migration vault address not configured.');
    }

    this.provider = provider;
    this.signer = signer;
    this.contract = new ethers.Contract(
      CONTRACT_ADDRESSES.legacyMigrationVault,
      CONTRACT_ABIS.legacyMigrationVault,
      signer || provider
    );

    if (CONTRACT_ADDRESSES.legacyToken) {
      this.legacyToken = new ethers.Contract(
        CONTRACT_ADDRESSES.legacyToken,
        LEGACY_TOKEN_ABI,
        signer || provider
      ) as LegacyTokenContract;
    }
  }

  async getStats(): Promise<MigrationVaultStats> {
    const [ratio, enabled, legacyToken, governanceToken] = await Promise.all([
      this.contract.conversionRatio(),
      this.contract.depositsEnabled(),
      this.contract.legacyToken(),
      this.contract.governanceToken(),
    ]);

    return {
      conversionRatio: ethers.formatUnits(ratio, 18),
      depositsEnabled: Boolean(enabled),
      legacyToken,
      governanceToken,
    };
  }

  async depositLegacy(amount: string, beneficiary?: string): Promise<LegacyDepositResult> {
    this.ensureSigner('deposit legacy tokens');

    const amountWei = ethers.parseEther(amount);
    const signerAddress = await this.signer!.getAddress();
    await this.ensureDepositPreconditions(signerAddress, amountWei);

    try {
      const tx = await this.contract.depositLegacy(amountWei, beneficiary ?? signerAddress);
      const receipt = await tx.wait();

      const legacyDeposit = this.extractLegacyDepositFromReceipt(receipt);
      const minted = legacyDeposit
        ? ethers.formatEther(legacyDeposit.governanceMinted)
        : await this.estimateMintedAmount(amount);

      return {
        txHash: receipt.hash,
        mintedAmount: minted,
      };
    } catch (error) {
      const message = this.describeDepositError(error);
      throw new Error(message);
    }
  }

  async getRecentDeposits(limit = 10, lookbackBlocks = 100_000): Promise<LegacyDepositEvent[]> {
    try {
      const latestBlock = await this.provider.getBlockNumber();
      const earliestBlock = Math.max(latestBlock - lookbackBlocks, 0);
      const topic = ethers.id('LegacyDeposited(address,uint256,uint256)');
      const maxRange = 4_000; // stay under RPC 10k range limit with buffer

      const collectedLogs: ethers.Log[] = [];
      let toBlock = latestBlock;

      while (toBlock >= earliestBlock && collectedLogs.length < limit) {
        const rangeStart = Math.max(toBlock - maxRange, earliestBlock);

        const logs = await this.fetchLogsWithRetry({
          address: CONTRACT_ADDRESSES.legacyMigrationVault,
          topics: [topic],
          fromBlock: rangeStart,
          toBlock,
        });

        collectedLogs.unshift(...logs); // maintain chronological order
        toBlock = rangeStart > 0 ? rangeStart - 1 : -1;
      }

      const recentLogs = collectedLogs.slice(-limit);

      const events = await Promise.all(
        recentLogs
          .reverse()
          .map(async (log) => {
            const parsed = this.contract.interface.parseLog(log);
            if (!parsed) return null;
            const block = await this.provider.getBlock(log.blockNumber);
            const { account, legacyAmount, governanceMinted } = parsed.args as unknown as {
              account: string;
              legacyAmount: bigint;
              governanceMinted: bigint;
            };

            return {
              account,
              legacyAmount: ethers.formatEther(legacyAmount),
              governanceMinted: ethers.formatEther(governanceMinted),
              blockNumber: log.blockNumber,
              timestamp: Number(block?.timestamp ?? 0),
              txHash: log.transactionHash,
            } satisfies LegacyDepositEvent;
          })
      );

      return events.filter((entry): entry is LegacyDepositEvent => Boolean(entry));
    } catch (error) {
      console.error('Error fetching legacy deposits:', error);
      return [];
    }
  }

  private async fetchLogsWithRetry(filter: ethers.Filter, attempt = 0): Promise<ethers.Log[]> {
    try {
      return await this.provider.getLogs(filter);
    } catch (error: any) {
      const isRateLimited = error?.code === -32005 || error?.message?.toLowerCase().includes('too many requests');
      if (isRateLimited && attempt < 3) {
        const delayMs = 500 * (attempt + 1);
        await this.sleep(delayMs);
        return this.fetchLogsWithRetry(filter, attempt + 1);
      }
      throw error;
    }
  }

  private async sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private async estimateMintedAmount(amount: string): Promise<string> {
    const ratio = await this.contract.conversionRatio();
    const amountWei = ethers.parseEther(amount);
    const minted = (amountWei * ratio) / ethers.parseUnits('1', 18);
    return ethers.formatEther(minted);
  }

  private async ensureDepositPreconditions(owner: string, amountWei: bigint) {
    if (amountWei <= BigInt(0)) {
      throw new Error('Enter an amount greater than zero.');
    }

    const depositsEnabled = await this.contract.depositsEnabled();
    if (!depositsEnabled) {
      throw new Error('Legacy deposits are currently disabled by governance.');
    }

    await this.ensureSufficientAllowance(owner, amountWei);
  }

  private async ensureSufficientAllowance(owner: string, amountWei: bigint) {
    if (!this.legacyToken) {
      throw new Error('Legacy token contract not configured.');
    }

    const allowance = await this.legacyToken.allowance(owner, this.contract.target as string);
    if (allowance >= amountWei) return;

    if (!this.signer) {
      throw new Error('Signer required to approve legacy tokens. Connect a wallet first.');
    }

    const legacyWithSigner :any = this.legacyToken.connect(this.signer);
    const approvalTx = await legacyWithSigner.approve(this.contract.target as string, amountWei);
    await approvalTx.wait();
  }

  private extractLegacyDepositFromReceipt(receipt: ethers.TransactionReceipt) {
    for (const log of receipt.logs) {
      try {
        const parsed = this.contract.interface.parseLog(log);
        if (parsed && parsed.name === 'LegacyDeposited') {
          const { account, legacyAmount, governanceMinted } = parsed.args as unknown as {
            account: string;
            legacyAmount: bigint;
            governanceMinted: bigint;
          };

          return { account, legacyAmount, governanceMinted };
        }
      } catch (error) {
        // Ignore logs that do not belong to the legacy vault contract
        continue;
      }
    }

    return null;
  }

  private describeDepositError(error: any): string {
    if (!error) {
      return 'Deposit failed for an unknown reason. Check your allowance and try again.';
    }

    if (typeof error.message === 'string' && error.message.includes('missing revert data')) {
      return 'Transaction simulation failed. Ensure you have approved the vault and that deposits are enabled.';
    }

    if (error.reason) {
      return `Vault reverted: ${error.reason}`;
    }

    const handled = this.handleError(error);
    return handled.message || 'Deposit failed. Check your allowance and try again.';
  }

  private ensureSigner(action: string) {
    if (!this.signer) {
      throw new Error(`Signer required to ${action}. Connect a wallet first.`);
    }
  }

  private handleError(error: any): ContractError {
    if (error.code === 'CALL_EXCEPTION') {
      return {
        code: 'CALL_EXCEPTION',
        message: error.reason || 'Contract call failed',
        data: error.data,
      };
    }

    if (error.code === 'INSUFFICIENT_FUNDS') {
      return {
        code: 'INSUFFICIENT_FUNDS',
        message: 'Insufficient funds for transaction',
      };
    }

    return {
      code: 'UNKNOWN_ERROR',
      message: error.message || 'An unknown error occurred',
      data: error,
    };
  }
}
