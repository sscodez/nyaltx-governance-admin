import { ethers } from 'ethers';
import { CONTRACT_ABIS, CONTRACT_ADDRESSES } from './config';
import { ContractError, FolderAllocationScheduleInput, FolderInfo, FolderMemberInfo, FolderTemplate } from './types';

export class FolderRegistryService {
  private provider: ethers.Provider;
  private signer?: ethers.Signer;
  private contract: ethers.Contract;

  constructor(provider: ethers.Provider, signer?: ethers.Signer) {
    if (!CONTRACT_ADDRESSES.folderRegistry) {
      throw new Error('FolderRegistry contract address not configured.');
    }

    this.provider = provider;
    this.signer = signer;
    this.contract = new ethers.Contract(
      CONTRACT_ADDRESSES.folderRegistry,
      CONTRACT_ABIS.folderRegistry,
      signer || provider
    );
  }

  async getFolderCount(): Promise<number> {
    const count = await this.contract.folderCount();
    return Number(count);
  }

  async getFolders(): Promise<FolderInfo[]> {
    const count = await this.getFolderCount();
    if (count === 0) return [];

    const folderIds = Array.from({ length: count }, (_, idx) => idx + 1);
    const folders = await Promise.all(folderIds.map(id => this.getFolder(id)));
    return folders.filter((folder): folder is FolderInfo => folder !== null);
  }

  async getAllFolders(): Promise<FolderInfo[]> {
    return await this.getFolders();
  }

  async getFolder(folderId: number): Promise<FolderInfo | null> {
    const data = await this.contract.folders(folderId);
    if (!data || !data.exists) return null;

    const members: string[] = await this.contract.folderMembers(folderId);

    return {
      id: folderId,
      name: data.name,
      defaultPermissions: Number(data.defaultPermissions),
      totalAllocated: ethers.formatEther(data.totalAllocated),
      template: {
        cliff: Number(data.template.cliff),
        duration: Number(data.template.duration),
        revocable: Boolean(data.template.revocable),
      },
      locked: Boolean(data.locked),
      exists: data.exists,
      members,
    };
  }

  async getFolderMembers(folderId: number): Promise<FolderMemberInfo[]> {
    const members: string[] = await this.contract.folderMembers(folderId);
    if (!members.length) return [];

    const timestamp = Math.floor(Date.now() / 1000);
    const detailed = await Promise.all(
      members.map(async (account) => {
        const permissions = await this.contract.permissionsOf(folderId, account);
        const unlocked = await this.contract.unlockedTokens(folderId, account, timestamp);
        return {
          account,
          permissions: Number(permissions),
          unlockedAmount: ethers.formatEther(unlocked),
        } as FolderMemberInfo;
      })
    );

    return detailed;
  }

  async createFolder(name: string, permissions: number, template: FolderTemplate): Promise<string> {
    this.ensureSigner('create folder');
    const tx = await this.contract.createFolder(name, permissions, template);
    const receipt = await tx.wait();
    return receipt.hash;
  }

  async updateFolder(folderId: number, permissions: number, template: FolderTemplate): Promise<string> {
    this.ensureSigner('update folder');
    const tx = await this.contract.updateFolder(folderId, permissions, template);
    const receipt = await tx.wait();
    return receipt.hash;
  }

  async setAllocation(
    folderId: number,
    account: string,
    amount: string,
    schedule: FolderAllocationScheduleInput,
    permissions?: number,
  ): Promise<string> {
    this.ensureSigner('set allocation');
    const amountWei = ethers.parseEther(amount);
    const formattedSchedule = {
      start: schedule.start,
      cliff: schedule.cliff,
      duration: schedule.duration,
      revocable: schedule.revocable,
      revoked: false,
      revokedAt: 0,
    };

    const tx = await this.contract.setAllocation(folderId, account, amountWei, formattedSchedule, permissions ?? 0);
    const receipt = await tx.wait();
    return receipt.hash;
  }

  async claimAllocation(folderId: number, account: string, amount: string): Promise<string> {
    this.ensureSigner('claim allocation');
    const amountWei = ethers.parseEther(amount);
    const tx = await this.contract.claim(folderId, account, amountWei);
    const receipt = await tx.wait();
    return receipt.hash;
  }

  async revokeAllocation(folderId: number, account: string): Promise<string> {
    this.ensureSigner('revoke allocation');
    const tx = await this.contract.revoke(folderId, account);
    const receipt = await tx.wait();
    return receipt.hash;
  }

  async setFolderLocked(folderId: number, locked: boolean): Promise<string> {
    this.ensureSigner(locked ? 'lock folder' : 'unlock folder');
    const tx = await this.contract.setFolderLocked(folderId, locked);
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

  // Pause/Unpause Controls
  async pauseFolder(signer: ethers.Signer): Promise<ethers.ContractTransaction> {
    this.ensureSigner('pause folder');
    const contractWithSigner = this.contract.connect(signer) as ethers.Contract;
    return await contractWithSigner.pauseFolder();
  }

  async unpauseFolder(signer: ethers.Signer): Promise<ethers.ContractTransaction> {
    this.ensureSigner('unpause folder');
    const contractWithSigner = this.contract.connect(signer) as ethers.Contract;
    return await contractWithSigner.unpauseFolder();
  }

  async isFolderPaused(): Promise<boolean> {
    return await this.contract.paused();
  }
}
