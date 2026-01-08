import { ethers } from 'ethers';
import { CONTRACT_ABIS, CONTRACT_ADDRESSES } from './config';

export interface FolderInfo {
  address: string;
  approved: boolean;
}

export interface TreasuryStats {
  treasuryBalance: string;
  totalFolders: number;
  approvedFolders: number;
  isPaused: boolean;
}

export class TreasuryService {
  private provider: ethers.Provider;
  private signer?: ethers.Signer;
  private contract: ethers.Contract;

  constructor(provider: ethers.Provider, signer?: ethers.Signer) {
    this.provider = provider;
    this.signer = signer;
    const address = CONTRACT_ADDRESSES.treasury;
    const abi = CONTRACT_ABIS.treasury;
    
    if (!address) {
      throw new Error('Treasury address not configured');
    }
    
    this.contract = new ethers.Contract(address, abi, signer || provider);
  }

  // Get contract with signer for write operations
  getContractWithSigner(signer: ethers.Signer): ethers.Contract {
    return this.contract.connect(signer) as ethers.Contract;
  }

  // Public constants
  async getTreasuryAdminRole(): Promise<string> {
    return await this.contract.TREASURY_ADMIN_ROLE();
  }

  async getGovernanceRole(): Promise<string> {
    return await this.contract.GOVERNANCE_ROLE();
  }

  async getToken(): Promise<string> {
    return await this.contract.token();
  }

  async getTokenInfo(): Promise<{
    transfersEnabled: boolean;
    paused: boolean;
    totalSupply: string;
    maxSupply: string;
    remainingMintable: string;
  }> {
    const [transfersEnabled, paused, totalSupply, maxSupply] = await Promise.all([
      this.contract.transfersEnabled(),
      this.contract.paused(),
      this.contract.totalSupply(),
      this.contract.maxSupply()
    ]);

    const remainingMintable = maxSupply - totalSupply;

    return {
      transfersEnabled,
      paused,
      totalSupply: ethers.formatEther(totalSupply),
      maxSupply: ethers.formatEther(maxSupply),
      remainingMintable: ethers.formatEther(remainingMintable)
    };
  }

  // Folder Management
  async approveFolder(folder: string, signer: ethers.Signer): Promise<ethers.ContractTransaction> {
    const contractWithSigner = this.getContractWithSigner(signer);
    return await contractWithSigner.approveFolder(folder);
  }

  async removeFolder(folder: string, signer: ethers.Signer): Promise<ethers.ContractTransaction> {
    const contractWithSigner = this.getContractWithSigner(signer);
    return await contractWithSigner.removeFolder(folder);
  }

  async isFolderApproved(folder: string): Promise<boolean> {
    return await this.contract.approvedFolders(folder);
  }

  async getFolderByIndex(index: number): Promise<string> {
    return await this.contract.folders(index);
  }

  async getFolders(): Promise<string[]> {
    return await this.contract.getFolders();
  }

  async getTotalFolders(): Promise<number> {
    const folders = await this.getFolders();
    return folders.length;
  }

  async getApprovedFolders(): Promise<FolderInfo[]> {
    const allFolders = await this.getFolders();
    const approvedFolders = await Promise.all(
      allFolders.map(async (folderAddress) => {
        const approved = await this.isFolderApproved(folderAddress);
        return {
          address: folderAddress,
          approved
        };
      })
    );
    return approvedFolders.filter(folder => folder.approved);
  }

  // Treasury Actions
  async sendToFolder(
    folder: string,
    amount: bigint,
    signer: ethers.Signer
  ): Promise<ethers.ContractTransaction> {
    const contractWithSigner = this.getContractWithSigner(signer);
    return await contractWithSigner.sendToFolder(folder, amount);
  }

  // Emergency Controls
  async pauseTreasury(signer: ethers.Signer): Promise<ethers.ContractTransaction> {
    const contractWithSigner = this.getContractWithSigner(signer);
    return await contractWithSigner.pauseTreasury();
  }

  async unpauseTreasury(signer: ethers.Signer): Promise<ethers.ContractTransaction> {
    const contractWithSigner = this.getContractWithSigner(signer);
    return await contractWithSigner.unpauseTreasury();
  }

  async isPaused(): Promise<boolean> {
    return await this.contract.paused();
  }

  // Balance Tracking
  async getFolderBalance(folder: string): Promise<string> {
    const balance = await this.contract.getFolderBalance(folder);
    return ethers.formatEther(balance);
  }

  async getAllFolderBalances(): Promise<{ folders: string[]; balances: string[] }> {
    const [folders, balances] = await this.contract.getAllFolderBalances();
    return {
      folders,
      balances: balances.map((b: bigint) => ethers.formatEther(b))
    };
  }

  // Token Transfer Controls
  async setTokenTransfersEnabled(enabled: boolean, signer?: ethers.Signer): Promise<ethers.ContractTransaction> {
    const actualSigner = signer || this.signer;
    if (!actualSigner) {
      throw new Error('Signer is required for setTokenTransfersEnabled');
    }
    const contractWithSigner = this.getContractWithSigner(actualSigner);
    return await contractWithSigner.setTokenTransfersEnabled(enabled);
  }

  async pauseToken(signer?: ethers.Signer): Promise<ethers.ContractTransaction> {
    const actualSigner = signer || this.signer;
    if (!actualSigner) {
      throw new Error('Signer is required for pauseToken');
    }
    const contractWithSigner = this.getContractWithSigner(actualSigner);
    return await contractWithSigner.pauseToken();
  }

  async unpauseToken(signer?: ethers.Signer): Promise<ethers.ContractTransaction> {
    const actualSigner = signer || this.signer;
    if (!actualSigner) {
      throw new Error('Signer is required for unpauseToken');
    }
    const contractWithSigner = this.getContractWithSigner(actualSigner);
    return await contractWithSigner.unpauseToken();
  }

  // Token Minting/Burning
  async mintGovernanceTokens(to: string, amount: string, signer?: ethers.Signer): Promise<ethers.ContractTransaction> {
    const actualSigner = signer || this.signer;
    if (!actualSigner) {
      throw new Error('Signer is required for mintGovernanceTokens');
    }
    const contractWithSigner = this.getContractWithSigner(actualSigner);
    return await contractWithSigner.mint(to, ethers.parseEther(amount));
  }

  async burnGovernanceTokens(from: string, amount: string, signer?: ethers.Signer): Promise<ethers.ContractTransaction> {
    const actualSigner = signer || this.signer;
    if (!actualSigner) {
      throw new Error('Signer is required for burnGovernanceTokens');
    }
    const contractWithSigner = this.getContractWithSigner(actualSigner);
    return await contractWithSigner.burn(from, ethers.parseEther(amount));
  }

  // Views
  async getTreasuryBalance(): Promise<bigint> {
    return await this.contract.treasuryBalance();
  }

  async getTreasuryBalanceFormatted(): Promise<string> {
    const balance = await this.getTreasuryBalance();
    return ethers.formatEther(balance);
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

  // Event Handling
  async getTokensSentToFolderEvents(fromBlock?: number, toBlock?: number): Promise<Array<{
    folder: string;
    amount: string;
    blockNumber: number;
    transactionHash: string;
  }>> {
    try {
      const filter = this.contract.filters.TokensSentToFolder();
      const events = await this.contract.queryFilter(filter, fromBlock, toBlock);
      
      return events.map(event => {
        const eventLog = event as any; // Type assertion for EventLog
        return {
          folder: eventLog.args?.folder || '',
          amount: ethers.formatEther(eventLog.args?.amount || BigInt(0)),
          blockNumber: event.blockNumber,
          transactionHash: event.transactionHash
        };
      });
    } catch (error) {
      console.error('Failed to fetch TokensSentToFolder events:', error);
      return [];
    }
  }

  async getRecentTransfers(limit: number = 10): Promise<Array<{
    folder: string;
    amount: string;
    blockNumber: number;
    transactionHash: string;
    timestamp: number;
  }>> {
    try {
      const latestBlock = await this.provider.getBlockNumber();
      const fromBlock = Math.max(0, latestBlock - 1000); // Check last 1000 blocks
      const events = await this.getTokensSentToFolderEvents(fromBlock, latestBlock);
      
      // Get timestamps for each event
      const eventsWithTimestamps = await Promise.all(
        events.slice(0, limit).map(async (event) => {
          const block = await this.provider.getBlock(event.blockNumber);
          return {
            ...event,
            timestamp: block?.timestamp || 0
          };
        })
      );
      
      return eventsWithTimestamps.sort((a, b) => b.timestamp - a.timestamp);
    } catch (error) {
      console.error('Failed to fetch recent transfers:', error);
      return [];
    }
  }

  onTokensSentToFolder(callback: (folder: string, amount: string, event: any) => void) {
    this.contract.on('TokensSentToFolder', (folder, amount, event) => {
      callback(folder, ethers.formatEther(amount), event);
    });
  }

  // removeAllListeners() {
  //   this.contract.removeAllListeners();
  // }

  // Event Listeners
  onFolderApproved(callback: (folder: string, event: any) => void) {
    this.contract.on('FolderApproved', (folder, event) => {
      callback(folder, event);
    });
  }

  onFolderRemoved(callback: (folder: string, event: any) => void) {
    this.contract.on('FolderRemoved', (folder, event) => {
      callback(folder, event);
    });
  }

  onRoleGranted(callback: (role: string, account: string, sender: string, event: any) => void) {
    this.contract.on('RoleGranted', (role, account, sender, event) => {
      callback(role, account, sender, event);
    });
  }

  onRoleRevoked(callback: (role: string, account: string, sender: string, event: any) => void) {
    this.contract.on('RoleRevoked', (role, account, sender, event) => {
      callback(role, account, sender, event);
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
  async getTreasuryStats(): Promise<TreasuryStats> {
    const [balance, folders, approvedFolders, isPaused] = await Promise.all([
      this.getTreasuryBalanceFormatted(),
      this.getTotalFolders(),
      this.getApprovedFolders(),
      this.isPaused()
    ]);

    return {
      treasuryBalance: balance,
      totalFolders: folders,
      approvedFolders: approvedFolders.length,
      isPaused
    };
  }

  async canSendToFolder(folder: string, amount: bigint): Promise<{ canSend: boolean; reason?: string }> {
    try {
      // Check if folder is approved
      const isApproved = await this.isFolderApproved(folder);
      if (!isApproved) {
        return { canSend: false, reason: 'Folder is not approved' };
      }

      // Check if treasury is paused
      const paused = await this.isPaused();
      if (paused) {
        return { canSend: false, reason: 'Treasury is paused' };
      }

      // Check if amount is valid
      if (amount <= 0) {
        return { canSend: false, reason: 'Invalid amount' };
      }

      // Check treasury balance
      const balance = await this.getTreasuryBalance();
      if (balance < amount) {
        return { canSend: false, reason: 'Insufficient treasury balance' };
      }

      return { canSend: true };
    } catch (error) {
      return { canSend: false, reason: 'Error checking conditions' };
    }
  }

  async checkPermissions(account: string): Promise<{
    isTreasuryAdmin: boolean;
    isGovernance: boolean;
    canApproveFolders: boolean;
    canSendTokens: boolean;
    canPauseTreasury: boolean;
  }> {
    const [treasuryAdminRole, governanceRole] = await Promise.all([
      this.getTreasuryAdminRole(),
      this.getGovernanceRole()
    ]);

    const [isTreasuryAdmin, isGovernance] = await Promise.all([
      this.hasRole(treasuryAdminRole, account),
      this.hasRole(governanceRole, account)
    ]);

    return {
      isTreasuryAdmin,
      isGovernance,
      canApproveFolders: isTreasuryAdmin,
      canSendTokens: isGovernance,
      canPauseTreasury: isTreasuryAdmin
    };
  }

  // Get contract address
  getContractAddress(): string {
    return CONTRACT_ADDRESSES.treasury;
  }

  // Get contract instance
  getContract(): ethers.Contract {
    return this.contract;
  }

  // Cleanup
  removeAllListeners() {
    this.contract.removeAllListeners();
  }
}

// Singleton instance
let treasuryService: TreasuryService | null = null;

export const getTreasuryService = (provider: ethers.BrowserProvider): TreasuryService => {
  if (!treasuryService) {
    treasuryService = new TreasuryService(provider);
  }
  return treasuryService;
};

export default TreasuryService;
