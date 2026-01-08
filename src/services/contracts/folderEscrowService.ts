import { ethers } from 'ethers';
import { CONTRACT_ABIS } from './config';

export interface Beneficiary {
  id: bigint;
  wallet: string;
  totalAllocation: bigint;
  claimed: bigint;
  start: bigint;
  cliff: bigint;
  duration: bigint;
  paused: boolean;
  cancelled: boolean;
  walletName: string;
}

export interface BeneficiaryInfo {
  totalAllocation: bigint;
  claimed: bigint;
  start: bigint;
  cliff: bigint;
  duration: bigint;
  paused: boolean;
  cancelled: boolean;
  walletName?: string;
}

export interface VestingCalculation {
  vested: bigint;
  claimable: bigint;
  totalAllocation: bigint;
  claimed: bigint;
  isClaimable: boolean;
  cliffReached: boolean;
  fullyVested: boolean;
}

export class FolderEscrowService {
  private contract: ethers.Contract;
  private provider: ethers.BrowserProvider;

  constructor(contractAddress: string, provider: ethers.BrowserProvider) {
    this.provider = provider;
    const abi = CONTRACT_ABIS.folderEscrow;
    
    if (!contractAddress) {
      throw new Error('FolderEscrow contract address is required');
    }
    
    this.contract = new ethers.Contract(contractAddress, abi, provider);
  }

  // Get contract with signer for write operations
  getContractWithSigner(signer: ethers.Signer): ethers.Contract {
    return this.contract.connect(signer) as ethers.Contract;
  }

  // Public constants
  async getFolderAdminRole(): Promise<string> {
    return await this.contract.FOLDER_ADMIN_ROLE();
  }

  async getToken(): Promise<string> {
    return await this.contract.token();
  }

  async getFolderName(): Promise<string> {
    return await this.contract.folderName();
  }

  async getRegistry(): Promise<string> {
    return await this.contract.registry();
  }

  async getFolderBalance(): Promise<bigint> {
    return await this.contract.getFolderBalance();
  }

  async getTotalAllocated(): Promise<bigint> {
    return await this.contract.getTotalAllocated();
  }

  // Beneficiary Management
  async addBeneficiary(
    wallet: string,
    totalAllocation: bigint,
    start: bigint,
    cliff: bigint,
    duration: bigint,
    walletName: string,
    signer: ethers.Signer
  ): Promise<ethers.ContractTransaction> {
    const contractWithSigner = this.getContractWithSigner(signer);
    return await contractWithSigner.addBeneficiary(wallet, totalAllocation, start, cliff, duration, walletName);
  }

  async pauseBeneficiary(beneficiaryId: number, signer: ethers.Signer): Promise<ethers.ContractTransaction> {
    const contractWithSigner = this.getContractWithSigner(signer);
    return await contractWithSigner.pauseBeneficiary(beneficiaryId);
  }

  async resumeBeneficiary(beneficiaryId: number, signer: ethers.Signer): Promise<ethers.ContractTransaction> {
    const contractWithSigner = this.getContractWithSigner(signer);
    return await contractWithSigner.resumeBeneficiary(beneficiaryId);
  }

  async cancelBeneficiary(beneficiaryId: number, signer: ethers.Signer): Promise<ethers.ContractTransaction> {
    const contractWithSigner = this.getContractWithSigner(signer);
    return await contractWithSigner.cancelBeneficiary(beneficiaryId);
  }

  async updateWalletName(beneficiaryId: number, newName: string, signer: ethers.Signer): Promise<ethers.ContractTransaction> {
    const contractWithSigner = this.getContractWithSigner(signer);
    return await contractWithSigner.updateWalletName(beneficiaryId, newName);
  }

  // Claiming
  async claim(signer: ethers.Signer): Promise<ethers.ContractTransaction> {
    const contractWithSigner = this.getContractWithSigner(signer);
    return await contractWithSigner.claim();
  }

  // Vesting Calculation
  async getVestedAmount(beneficiaryId: number): Promise<bigint> {
    return await this.contract._vestedAmount(beneficiaryId);
  }

  async getVestedAmountForWallet(wallet: string): Promise<bigint> {
    const beneficiaryIds = await this.getBeneficiaryIdsByWallet(wallet);
    if (beneficiaryIds.length === 0) return BigInt(0);
    
    let totalVested = BigInt(0);
    for (const id of beneficiaryIds) {
      const vested = await this.getVestedAmount(Number(id));
      totalVested += vested;
    }
    return totalVested;
  }

  async calculateVesting(wallet: string): Promise<VestingCalculation> {
    const [beneficiaryInfo, vestedAmount] = await Promise.all([
      this.getBeneficiaryInfo(wallet),
      this.getVestedAmountForWallet(wallet)
    ]);

    const claimable = vestedAmount - beneficiaryInfo.claimed;
    const currentTime = BigInt(Math.floor(Date.now() / 1000));
    const cliffTime = beneficiaryInfo.start + beneficiaryInfo.cliff;
    const endTime = beneficiaryInfo.start + beneficiaryInfo.duration;

    return {
      vested: vestedAmount,
      claimable: claimable > 0 ? claimable : BigInt(0),
      totalAllocation: beneficiaryInfo.totalAllocation,
      claimed: beneficiaryInfo.claimed,
      isClaimable: claimable > 0 && !beneficiaryInfo.paused && !beneficiaryInfo.cancelled && currentTime >= cliffTime,
      cliffReached: currentTime >= cliffTime,
      fullyVested: currentTime >= endTime
    };
  }

  // Views
  async getBeneficiaryCount(): Promise<number> {
    const count = await this.contract.getBeneficiaryCount();
    return Number(count);
  }

  async getBeneficiaryById(beneficiaryId: number): Promise<Beneficiary> {
    const result = await this.contract.getBeneficiaryById(beneficiaryId);
    return {
      id: result[0],
      wallet: result[1],
      totalAllocation: result[2],
      claimed: result[3],
      start: result[4],
      cliff: result[5],
      duration: result[6],
      paused: result[7],
      cancelled: result[8],
      walletName: result[9]
    };
  }

  async getBeneficiaryIdsByWallet(wallet: string): Promise<bigint[]> {
    return await this.contract.getBeneficiaryIdsByWallet(wallet);
  }

  async getAllBeneficiaries(): Promise<Beneficiary[]> {
    const count = await this.getBeneficiaryCount();
    const beneficiaries: Beneficiary[] = [];
    
    for (let i = 0; i < count; i++) {
      const beneficiary = await this.getBeneficiaryById(i);
      beneficiaries.push(beneficiary);
    }
    
    return beneficiaries;
  }

  async getBeneficiaryInfo(wallet: string): Promise<BeneficiaryInfo> {
    const result = await this.contract.getBeneficiaryInfo(wallet);
    return {
      totalAllocation: result[0],
      claimed: result[1],
      start: result[2],
      cliff: result[3],
      duration: result[4],
      paused: result[5],
      cancelled: result[6],
      walletName: result[7] || undefined
    };
  }

  async getBeneficiaryIdByName(walletName: string): Promise<number> {
    const id = await this.contract.getWalletByName(walletName);
    return Number(id);
  }

  // Direct contract mappings
  async getBeneficiaryFromMapping(beneficiaryId: number): Promise<Beneficiary> {
    const result = await this.contract.beneficiaries(beneficiaryId);
    return {
      id: result[0],
      wallet: result[1],
      totalAllocation: result[2],
      claimed: result[3],
      start: result[4],
      cliff: result[5],
      duration: result[6],
      paused: result[7],
      cancelled: result[8],
      walletName: result[9]
    };
  }

  // Folder Controls
  async pauseFolder(signer: ethers.Signer): Promise<ethers.ContractTransaction> {
    const contractWithSigner = this.getContractWithSigner(signer);
    return await contractWithSigner.pauseFolder();
  }

  async unpauseFolder(signer: ethers.Signer): Promise<ethers.ContractTransaction> {
    const contractWithSigner = this.getContractWithSigner(signer);
    return await contractWithSigner.unpauseFolder();
  }

  async isPaused(): Promise<boolean> {
    return await this.contract.paused();
  }

  // Access Control
  async hasRole(role: string, account: string): Promise<boolean> {
    return await this.contract.hasRole(role, account);
  }

  async getRoleAdmin(role: string): Promise<string> {
    return await this.contract.getRoleAdmin(role);
  }

  async grantRole(role: string, account: string, signer: ethers.Signer): Promise<ethers.ContractTransaction> {
    const contractWithSigner = this.getContractWithSigner(signer);
    return await contractWithSigner.grantRole(role, account);
  }

  async revokeRole(role: string, account: string, signer: ethers.Signer): Promise<ethers.ContractTransaction> {
    const contractWithSigner = this.getContractWithSigner(signer);
    return await contractWithSigner.revokeRole(role, account);
  }

  async renounceRole(role: string, account: string, signer: ethers.Signer): Promise<ethers.ContractTransaction> {
    const contractWithSigner = this.getContractWithSigner(signer);
    return await contractWithSigner.renounceRole(role, account);
  }

  // Event Listeners
  onBeneficiaryAdded(callback: (wallet: string, walletName: string, amount: bigint, start: bigint, cliff: bigint, duration: bigint, event: any) => void) {
    this.contract.on('BeneficiaryAdded', (wallet, walletName, amount, start, cliff, duration, event) => {
      callback(wallet, walletName, amount, start, cliff, duration, event);
    });
  }

  onFolderFunded(callback: (amount: bigint, newBalance: bigint, event: any) => void) {
    this.contract.on('FolderFunded', (amount, newBalance, event) => {
      callback(amount, newBalance, event);
    });
  }

  onWalletNameUpdated(callback: (wallet: string, oldName: string, newName: string, event: any) => void) {
    this.contract.on('WalletNameUpdated', (wallet, oldName, newName, event) => {
      callback(wallet, oldName, newName, event);
    });
  }

  onClaimed(callback: (wallet: string, amount: bigint, event: any) => void) {
    this.contract.on('Claimed', (wallet, amount, event) => {
      callback(wallet, amount, event);
    });
  }

  onBeneficiaryPaused(callback: (wallet: string, event: any) => void) {
    this.contract.on('BeneficiaryPaused', (wallet, event) => {
      callback(wallet, event);
    });
  }

  onBeneficiaryResumed(callback: (wallet: string, event: any) => void) {
    this.contract.on('BeneficiaryResumed', (wallet, event) => {
      callback(wallet, event);
    });
  }

  onBeneficiaryCancelled(callback: (wallet: string, event: any) => void) {
    this.contract.on('BeneficiaryCancelled', (wallet, event) => {
      callback(wallet, event);
    });
  }

  onPaused(callback: (account: string, event: any) => void) {
    this.contract.on('Paused', (account, event) => {
      callback(account, event);
    });
  }

  onUnpaused(callback: (account: string, event: any) => void) {
    this.contract.on('Unpaused', (account, event) => {
      callback(account, event);
    });
  }

  // Utility Methods
  async getAllBeneficiariesWithVesting(): Promise<Array<{ wallet: string; info: BeneficiaryInfo; vesting: VestingCalculation }>> {
    const beneficiaries = await this.getAllBeneficiaries();
    const uniqueWallets = [...new Set(beneficiaries.map(b => b.wallet))];
    const beneficiariesWithVesting = await Promise.all(
      uniqueWallets.map(async (wallet: string) => {
        const [info, vesting] = await Promise.all([
          this.getBeneficiaryInfo(wallet),
          this.calculateVesting(wallet)
        ]);
        return {
          wallet,
          info,
          vesting
        };
      })
    );
    return beneficiariesWithVesting;
  }

  async getTotalClaimed(): Promise<bigint> {
    const beneficiaries = await this.getAllBeneficiaries();
    let total = BigInt(0);
    
    for (const beneficiary of beneficiaries) {
      total += beneficiary.claimed;
    }
    
    return total;
  }

  async getTotalVested(): Promise<bigint> {
    const beneficiaries = await this.getAllBeneficiaries();
    let total = BigInt(0);
    
    for (const beneficiary of beneficiaries) {
      const vested = await this.getVestedAmount(Number(beneficiary.id));
      total += vested;
    }
    
    return total;
  }

  async canClaim(wallet: string): Promise<boolean> {
    const vesting = await this.calculateVesting(wallet);
    return vesting.isClaimable;
  }

  async getFolderStats(): Promise<{
    totalBeneficiaries: number;
    totalAllocated: bigint;
    totalClaimed: bigint;
    totalVested: bigint;
    isPaused: boolean;
  }> {
    const [beneficiaryCount, totalAllocated, totalClaimed, totalVested, isPaused] = await Promise.all([
      this.getBeneficiaryCount(),
      this.getTotalAllocated(),
      this.getTotalClaimed(),
      this.getTotalVested(),
      this.isPaused()
    ]);

    return {
      totalBeneficiaries: beneficiaryCount,
      totalAllocated,
      totalClaimed,
      totalVested,
      isPaused
    };
  }

  // Optimized method to get all folder data with minimal blockchain calls
  async getFolderStatsOptimized(): Promise<{
    totalBeneficiaries: number;
    totalAllocated: bigint;
    totalClaimed: bigint;
    totalVested: bigint;
    isPaused: boolean;
    folderBalance: bigint;
    beneficiaries: Beneficiary[];
    vestingStart: number;
    vestingCliff: number;
    vestingDuration: number;
  }> {
    // Fetch all basic data in parallel
    const [beneficiaryCount, totalAllocated, isPaused, folderBalance] = await Promise.all([
      this.getBeneficiaryCount(),
      this.getTotalAllocated(),
      this.isPaused(),
      this.getFolderBalance()
    ]);

    // Get all beneficiaries in parallel
    const beneficiaries: Beneficiary[] = [];
    const beneficiaryPromises = [];
    for (let i = 0; i < beneficiaryCount; i++) {
      beneficiaryPromises.push(this.getBeneficiaryById(i));
    }
    const fetchedBeneficiaries = await Promise.all(beneficiaryPromises);
    beneficiaries.push(...fetchedBeneficiaries);

    // Calculate totals from beneficiary data (already fetched)
    let totalClaimed = BigInt(0);
    let totalVested = BigInt(0);
    
    // Get all vested amounts in parallel
    const vestedPromises = beneficiaries.map(b => this.getVestedAmount(Number(b.id)));
    const vestedAmounts = await Promise.all(vestedPromises);
    
    beneficiaries.forEach((b, index) => {
      totalClaimed += b.claimed;
      totalVested += vestedAmounts[index];
    });

    // Get vesting time info from first beneficiary
    let vestingStart = 0;
    let vestingCliff = 0;
    let vestingDuration = 0;
    if (beneficiaries.length > 0) {
      vestingStart = Number(beneficiaries[0].start);
      vestingCliff = Number(beneficiaries[0].cliff);
      vestingDuration = Number(beneficiaries[0].duration);
    }

    return {
      totalBeneficiaries: beneficiaryCount,
      totalAllocated,
      totalClaimed,
      totalVested,
      isPaused,
      folderBalance,
      beneficiaries,
      vestingStart,
      vestingCliff,
      vestingDuration
    };
  }

  // Get contract address
  getContractAddress(): string {
    return this.contract.target as string;
  }

  // Get contract instance
  getContract(): ethers.Contract {
    return this.contract;
  }
}

// Factory function to create service instances
export const createFolderEscrowService = (
  contractAddress: string,
  provider: ethers.BrowserProvider
): FolderEscrowService => {
  return new FolderEscrowService(contractAddress, provider);
};

export default FolderEscrowService;
