import { ethers } from 'ethers';
import { CONTRACT_ABIS, CONTRACT_ADDRESSES } from './config';
import { ContractError, StakingPosition, StakingStats } from './types';

export class StakingService {
  private provider: ethers.Provider;
  private signer?: ethers.Signer;
  private contract: ethers.Contract;

  constructor(provider: ethers.Provider, signer?: ethers.Signer) {
    if (!CONTRACT_ADDRESSES.staking) {
      throw new Error('Staking contract address not configured.');
    }

    this.provider = provider;
    this.signer = signer;
    this.contract = new ethers.Contract(
      CONTRACT_ADDRESSES.staking,
      CONTRACT_ABIS.staking,
      signer || provider
    );
  }

  async getStats(): Promise<StakingStats> {
    const [minLock, maxLock, totalStaked, totalSupply, emergencyUnlock] = await Promise.all([
      this.contract.MIN_LOCK(),
      this.contract.MAX_LOCK(),
      this.contract.totalStaked(),
      this.contract.totalSupply(),
      this.contract.emergencyUnlock(),
    ]);

    return {
      minLock: Number(minLock),
      maxLock: Number(maxLock),
      totalStaked: ethers.formatEther(totalStaked),
      totalSupply: ethers.formatEther(totalSupply),
      emergencyUnlock: Boolean(emergencyUnlock),
    };
  }

  async getPositions(account: string): Promise<StakingPosition[]> {
    if (!account) return [];

    const stakeCount = await this.contract.stakeCount(account);
    const total = Number(stakeCount);
    if (!total) return [];

    const ids = Array.from({ length: total }, (_, idx) => idx);
    const stakes = await Promise.all(ids.map((id) => this.contract.stakeInfo(account, id)));

    return stakes.map((position: any, idx: number) => ({
      stakeId: idx,
      amount: ethers.formatEther(position.amount),
      votingPower: ethers.formatEther(position.votingPower),
      unlockTime: Number(position.unlockTime),
      withdrawn: Boolean(position.withdrawn),
    }));
  }

  async stake(amount: string, lockDurationSeconds: number, delegatee?: string): Promise<string> {
    this.ensureSigner('stake');

    const amountWei = ethers.parseEther(amount);
    const duration = BigInt(lockDurationSeconds);
    const delegateeAddress = delegatee && delegatee !== '' ? delegatee : ethers.ZeroAddress;

    const tx = await this.contract.stake(amountWei, duration, delegateeAddress);
    const receipt = await tx.wait();
    return receipt.hash;
  }

  async extendLock(stakeId: number, additionalDurationSeconds: number): Promise<string> {
    this.ensureSigner('extend lock');

    const tx = await this.contract.extendLock(stakeId, BigInt(additionalDurationSeconds));
    const receipt = await tx.wait();
    return receipt.hash;
  }

  async unstake(stakeId: number, recipient?: string): Promise<string> {
    this.ensureSigner('unstake');

    const to = recipient && recipient !== '' ? recipient : ethers.ZeroAddress;
    const tx = await this.contract.unstake(stakeId, to);
    const receipt = await tx.wait();
    return receipt.hash;
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
