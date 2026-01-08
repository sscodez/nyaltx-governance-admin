import { ethers } from 'ethers';
import { CONTRACT_ABIS, CONTRACT_ADDRESSES } from './config';
import { ContractError, VestingSchedule } from './types';

export class VestingService {
  private provider: ethers.Provider;
  private signer?: ethers.Signer;
  private factoryContract?: ethers.Contract;

  constructor(provider: ethers.Provider, signer?: ethers.Signer) {
    this.provider = provider;
    this.signer = signer;
    const address = CONTRACT_ADDRESSES.vestingFactory;
    if (address) {
      this.factoryContract = new ethers.Contract(address, CONTRACT_ABIS.vestingFactory, signer || provider);
    }
  }

  private requireFactoryContract(): ethers.Contract {
    if (!this.factoryContract) {
      throw new Error('Vesting factory contract address not configured.');
    }
    return this.factoryContract;
  }

  // Factory Management
  async createVestingContract(category: string): Promise<string> {
    try {
      if (!this.signer) throw new Error('Signer required for creating vesting contract');
      
      const contract = this.requireFactoryContract();
      const tx = await contract.createVestingContract(category);
      const receipt = await tx.wait();
      
      // Get the contract address from events
      const event = receipt.logs.find((log: ethers.Log) => 
        log.topics && log.topics[0] === ethers.id('VestingContractCreated(address,string,address)')
      );
      
      return event && event.topics ? event.topics[1] : '';
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async getAllVestingContracts(): Promise<string[]> {
    try {
      const contract = this.factoryContract;
      if (!contract) return [];
      return await contract.getAllContracts();
    } catch (error) {
      console.error('Error fetching vesting contracts:', error);
      return [];
    }
  }

  async getCategoryContracts(category: string): Promise<string[]> {
    try {
      const contract = this.factoryContract;
      if (!contract) return [];
      return await contract.getCategoryContracts(category);
    } catch (error) {
      console.error('Error fetching category contracts:', error);
      return [];
    }
  }

  async getVestingCategories(): Promise<string[]> {
    try {
      const contract = this.factoryContract;
      if (!contract) return [];
      return await contract.getCategories();
    } catch (error) {
      console.error('Error fetching vesting categories:', error);
      return [];
    }
  }

  // Vesting Schedule Management
  async createVestingSchedule(
    vestingContractAddress: string,
    beneficiary: string,
    totalAmount: string,
    start: number,
    cliffDuration: number,
    duration: number,
    revocable: boolean,
    category: string
  ): Promise<string> {
    try {
      if (!this.signer) throw new Error('Signer required for creating vesting schedule');
      
      const vestingContract = new ethers.Contract(
        vestingContractAddress,
        CONTRACT_ABIS.vestingWallet,
        this.signer
      );
      
      const amountWei = ethers.parseEther(totalAmount);
      const tx = await vestingContract.createVestingSchedule(
        beneficiary,
        amountWei,
        start,
        cliffDuration,
        duration,
        revocable,
        category
      );
      
      const receipt = await tx.wait();
      return receipt.hash;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async getVestingSchedule(
    vestingContractAddress: string,
    scheduleId: string
  ): Promise<VestingSchedule | null> {
    try {
      const vestingContract = new ethers.Contract(
        vestingContractAddress,
        CONTRACT_ABIS.vestingWallet,
        this.provider
      );
      
      const schedule = await vestingContract.vestingSchedules(scheduleId);
      const releasableAmount = await vestingContract.releasableAmount(scheduleId);
      const vestedAmount = await vestingContract.vestedAmount(scheduleId, Math.floor(Date.now() / 1000));
      
      return {
        id: scheduleId,
        beneficiary: schedule.beneficiary,
        totalAmount: ethers.formatEther(schedule.totalAmount),
        start: Number(schedule.start),
        cliff: Number(schedule.cliff),
        duration: Number(schedule.duration),
        released: ethers.formatEther(schedule.released),
        revoked: schedule.revoked,
        revocable: schedule.revocable,
        category: schedule.category,
        releasableAmount: ethers.formatEther(releasableAmount),
        vestedAmount: ethers.formatEther(vestedAmount),
      };
    } catch (error) {
      console.error('Error fetching vesting schedule:', error);
      return null;
    }
  }

  async getBeneficiarySchedules(
    vestingContractAddress: string,
    beneficiary: string
  ): Promise<VestingSchedule[]> {
    try {
      const vestingContract = new ethers.Contract(
        vestingContractAddress,
        CONTRACT_ABIS.vestingWallet,
        this.provider
      );
      
      const scheduleIds = await vestingContract.getBeneficiarySchedules(beneficiary);
      
      const schedules = await Promise.all(
        scheduleIds.map(async (id: string) => 
          this.getVestingSchedule(vestingContractAddress, id)
        )
      );
      
      return schedules.filter((s): s is VestingSchedule => s !== null);
    } catch (error) {
      console.error('Error fetching beneficiary schedules:', error);
      return [];
    }
  }

  async getAllSchedules(vestingContractAddress: string): Promise<VestingSchedule[]> {
    try {
      const vestingContract = new ethers.Contract(
        vestingContractAddress,
        CONTRACT_ABIS.vestingWallet,
        this.provider
      );
      
      const scheduleIds = await vestingContract.getAllSchedules();
      
      const schedules = await Promise.all(
        scheduleIds.map(async (id: string) => 
          this.getVestingSchedule(vestingContractAddress, id)
        )
      );
      
      return schedules.filter((s): s is VestingSchedule => s !== null);
    } catch (error) {
      console.error('Error fetching all schedules:', error);
      return [];
    }
  }

  // Vesting Operations
  async releaseVestedTokens(
    vestingContractAddress: string,
    scheduleId: string
  ): Promise<string> {
    try {
      if (!this.signer) throw new Error('Signer required for releasing tokens');
      
      const vestingContract = new ethers.Contract(
        vestingContractAddress,
        CONTRACT_ABIS.vestingWallet,
        this.signer
      );
      
      const tx = await vestingContract.release(scheduleId);
      const receipt = await tx.wait();
      return receipt.hash;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async revokeVestingSchedule(
    vestingContractAddress: string,
    scheduleId: string
  ): Promise<string> {
    try {
      if (!this.signer) throw new Error('Signer required for revoking schedule');
      
      const vestingContract = new ethers.Contract(
        vestingContractAddress,
        CONTRACT_ABIS.vestingWallet,
        this.signer
      );
      
      const tx = await vestingContract.revoke(scheduleId);
      const receipt = await tx.wait();
      return receipt.hash;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async addMilestone(
    vestingContractAddress: string,
    scheduleId: string,
    timestamp: number,
    percentage: number,
    description: string
  ): Promise<string> {
    try {
      if (!this.signer) throw new Error('Signer required for adding milestone');
      
      const vestingContract = new ethers.Contract(
        vestingContractAddress,
        CONTRACT_ABIS.vestingWallet,
        this.signer
      );
      
      const tx = await vestingContract.addMilestone(scheduleId, timestamp, percentage, description);
      const receipt = await tx.wait();
      return receipt.hash;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Utility Methods
  async getVestingContractBalance(vestingContractAddress: string): Promise<string> {
    try {
      const vestingContract = new ethers.Contract(
        vestingContractAddress,
        CONTRACT_ABIS.vestingWallet,
        this.provider
      );
      
      const balance = await vestingContract.getContractBalance();
      return ethers.formatEther(balance);
    } catch (error) {
      console.error('Error fetching contract balance:', error);
      return '0';
    }
  }

  async isVestingContractPaused(vestingContractAddress: string): Promise<boolean> {
    try {
      const vestingContract = new ethers.Contract(
        vestingContractAddress,
        CONTRACT_ABIS.vestingWallet,
        this.provider
      );
      
      return await vestingContract.paused();
    } catch (error) {
      console.error('Error checking pause status:', error);
      return false;
    }
  }

  calculateVestingProgress(schedule: VestingSchedule): {
    progressPercentage: number;
    timeRemaining: number;
    isCliffPassed: boolean;
    isFullyVested: boolean;
  } {
    const now = Math.floor(Date.now() / 1000);
    const totalDuration = schedule.duration;
    const elapsed = Math.max(0, now - schedule.start);
    
    const progressPercentage = Math.min(100, (elapsed / totalDuration) * 100);
    const timeRemaining = Math.max(0, schedule.start + schedule.duration - now);
    const isCliffPassed = now >= schedule.cliff;
    const isFullyVested = now >= schedule.start + schedule.duration;
    
    return {
      progressPercentage,
      timeRemaining,
      isCliffPassed,
      isFullyVested,
    };
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

  // Event Listeners
  onVestingContractCreated(callback: (contractAddress: string, category: string, creator: string) => void) {
    if (!this.factoryContract) {
      console.warn('Vesting factory contract not configured; skipping listener.');
      return;
    }
    this.factoryContract.on('VestingContractCreated', (contractAddress, category, creator) => {
      callback(contractAddress, category, creator);
    });
  }

  onVestingScheduleCreated(
    vestingContractAddress: string,
    callback: (scheduleId: string, beneficiary: string, totalAmount: string, category: string) => void
  ) {
    const vestingContract = new ethers.Contract(
      vestingContractAddress,
      CONTRACT_ABIS.vestingWallet,
      this.provider
    );
    
    vestingContract.on('VestingScheduleCreated', (scheduleId, beneficiary, totalAmount, start, cliff, duration, category) => {
      callback(scheduleId, beneficiary, ethers.formatEther(totalAmount), category);
    });
  }

  onTokensReleased(
    vestingContractAddress: string,
    callback: (scheduleId: string, beneficiary: string, amount: string) => void
  ) {
    const vestingContract = new ethers.Contract(
      vestingContractAddress,
      CONTRACT_ABIS.vestingWallet,
      this.provider
    );
    
    vestingContract.on('TokensReleased', (scheduleId, beneficiary, amount) => {
      callback(scheduleId, beneficiary, ethers.formatEther(amount));
    });
  }

  // Cleanup
  removeAllListeners() {
    if (this.factoryContract) {
      this.factoryContract.removeAllListeners();
    }
  }
}
