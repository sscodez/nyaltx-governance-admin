import { ethers } from 'ethers';
import { CONTRACT_ABIS, CONTRACT_ADDRESSES } from './config';

export class TreasuryBridgeService {
  private provider: ethers.Provider;
  private signer?: ethers.Signer;
  private contract: ethers.Contract;

  constructor(provider: ethers.Provider, signer?: ethers.Signer) {
    this.provider = provider;
    this.signer = signer;

    if (!CONTRACT_ADDRESSES.treasuryBridge) {
      throw new Error('TreasuryBridge contract address not configured.');
    }

    this.contract = new ethers.Contract(
      CONTRACT_ADDRESSES.treasuryBridge,
      CONTRACT_ABIS.treasuryBridge,
      signer || provider
    );
  }

  async transferTreasuryToken(
    token: string,
    destination: string,
    amount: string,
    referenceId: string
  ): Promise<ethers.ContractTransactionResponse> {
    if (!this.signer) throw new Error('Signer required for treasury transfer');
    if (!token || !destination) throw new Error('Token and destination are required');

    const amountWei = ethers.parseEther(amount);
    const referenceBytes = referenceId ? ethers.id(referenceId) : ethers.ZeroHash;

    return await this.contract.transferTreasuryToken(
      token,
      destination,
      amountWei,
      referenceBytes
    );
  }
}
