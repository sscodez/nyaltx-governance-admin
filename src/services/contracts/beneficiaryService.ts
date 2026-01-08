import { ethers } from 'ethers';
import { FolderAllocationScheduleInput } from './types';

export interface BeneficiaryInfo {
  folderId: number;
  account: string;
  amount: string;
  startDate: string;
  cliffDays: string;
  durationDays: string;
  permissions: string;
}

export class BeneficiaryService {
  private provider: ethers.Provider;
  private signer?: ethers.Signer;
  private folderRegistryService: any;

  constructor(provider: ethers.Provider, signer?: ethers.Signer, folderRegistryService?: any) {
    this.provider = provider;
    this.signer = signer;
    this.folderRegistryService = folderRegistryService;
  }

  private ensureSigner(operation: string): void {
    if (!this.signer) {
      throw new Error(`Signer is required for ${operation}`);
    }
  }

  async addBeneficiary(beneficiary: BeneficiaryInfo): Promise<ethers.ContractTransaction> {
    if (!this.folderRegistryService) {
      throw new Error('FolderRegistryService is required for beneficiary operations');
    }

    this.ensureSigner('add beneficiary');

    const schedule: FolderAllocationScheduleInput = {
      start: beneficiary.startDate
        ? Math.floor(new Date(beneficiary.startDate).getTime() / 1000)
        : Math.floor(Date.now() / 1000),
      cliff: Number(beneficiary.cliffDays || '0') * 86400, // DAY_IN_SECONDS
      duration: Number(beneficiary.durationDays || '0') * 86400, // DAY_IN_SECONDS
      revocable: true,
    };

    return await this.folderRegistryService.setAllocation({
      folderId: beneficiary.folderId,
      account: beneficiary.account,
      amount: beneficiary.amount,
      schedule,
      permissions: beneficiary.permissions ? Number(beneficiary.permissions) : undefined,
    });
  }

  async removeBeneficiary(folderId: number, account: string): Promise<string> {
    if (!this.folderRegistryService) {
      throw new Error('FolderRegistryService is required for beneficiary operations');
    }

    this.ensureSigner('remove beneficiary');
    
    return await this.folderRegistryService.revokeAllocation(folderId, account);
  }

  async getBeneficiaries(folderId: number): Promise<any[]> {
    if (!this.folderRegistryService) {
      throw new Error('FolderRegistryService is required for beneficiary operations');
    }

    return await this.folderRegistryService.getFolderMembers(folderId);
  }

  async updateBeneficiaryPermissions(
    folderId: number, 
    account: string, 
    permissions: number
  ): Promise<ethers.ContractTransaction> {
    if (!this.folderRegistryService) {
      throw new Error('FolderRegistryService is required for beneficiary operations');
    }

    this.ensureSigner('update beneficiary permissions');

    return await this.folderRegistryService.setAllocation({
      folderId,
      account,
      amount: '0', // This would need to be handled differently in a real implementation
      schedule: {
        start: Math.floor(Date.now() / 1000),
        cliff: 0,
        duration: 0,
        revocable: true,
      },
      permissions,
    });
  }
}
