import { ethers } from 'ethers';
import { CONSTANTS, CONTRACT_ABIS, CONTRACT_ADDRESSES } from './config';
import {
  GovernanceStats,
  TokenInfo,
  TreasuryCategory,
  TreasuryStats,
  VotingPower
} from './types';

export class DAOService {
  private provider: ethers.Provider;
  private signer?: ethers.Signer;

  constructor(provider: ethers.Provider, signer?: ethers.Signer) {
    this.provider = provider;
    this.signer = signer;
  }

  // Contract instances
  private getNYAXTokenContract(withSigner = false) {
    if (!CONTRACT_ADDRESSES.nyaxToken) {
      throw new Error('NYAX Token contract address not configured. Please check your environment variables.');
    }
    const contract = new ethers.Contract(
      CONTRACT_ADDRESSES.nyaxToken,
      CONTRACT_ABIS.nyaxToken,
      withSigner && this.signer ? this.signer : this.provider
    );
    return contract;
  }

  private getGovernorContract(withSigner = false) {
    if (!CONTRACT_ADDRESSES.nyaxGovernor) {
      throw new Error('NYAX Governor contract address not configured. Please check your environment variables.');
    }
    const contract = new ethers.Contract(
      CONTRACT_ADDRESSES.nyaxGovernor,
      CONTRACT_ABIS.nyaxGovernor,
      withSigner && this.signer ? this.signer : this.provider
    );
    return contract;
  }

  private getTreasuryContract(withSigner = false) {
    if (!CONTRACT_ADDRESSES.treasury) {
      throw new Error('Treasury contract address not configured. Please check your environment variables.');
    }
    const contract = new ethers.Contract(
      CONTRACT_ADDRESSES.treasury,
      CONTRACT_ABIS.treasury,
      withSigner && this.signer ? this.signer : this.provider
    );
    return contract;
  }

  private getMultisigContract(withSigner = false) {
    if (!CONTRACT_ADDRESSES.multisig) {
      throw new Error('Multisig contract address not configured. Please check your environment variables.');
    }
    const contract = new ethers.Contract(
      CONTRACT_ADDRESSES.multisig,
      CONTRACT_ABIS.multisig,
      withSigner && this.signer ? this.signer : this.provider
    );
    return contract;
  }

  private getVestingFactoryContract(withSigner = false) {
    if (!CONTRACT_ADDRESSES.vestingFactory) {
      throw new Error('Vesting Factory contract address not configured. Please check your environment variables.');
    }
    const contract = new ethers.Contract(
      CONTRACT_ADDRESSES.vestingFactory,
      CONTRACT_ABIS.vestingFactory,
      withSigner && this.signer ? this.signer : this.provider
    );
    return contract;
  }

  private getVestingWalletContract(address: string, withSigner = false) {
    const contract = new ethers.Contract(
      address,
      CONTRACT_ABIS.vestingWallet,
      withSigner && this.signer ? this.signer : this.provider
    );
    return contract;
  }

  // Token functions
  async getTokenInfo(): Promise<TokenInfo> {
    const contract = this.getNYAXTokenContract();
    
    const [name, symbol, decimals, totalSupply, maxSupply, remainingMintable, treasury, transfersEnabled, paused] = await Promise.all([
      contract.name(),
      contract.symbol(),
      contract.decimals(),
      contract.totalSupply(),
      contract.MAX_SUPPLY(),
      contract.remainingMintableSupply(),
      contract.treasury(),
      contract.transfersEnabled(),
      contract.paused()
    ]);

    return {
      name,
      symbol,
      decimals: Number(decimals),
      totalSupply: ethers.formatEther(totalSupply),
      maxSupply: ethers.formatEther(maxSupply),
      remainingMintable: ethers.formatEther(remainingMintable),
      treasury,
      transfersEnabled,
      paused
    };
  }

  // Additional Token Functions
  async isBlacklisted(address: string): Promise<boolean> {
    const contract = this.getNYAXTokenContract();
    return await contract.blacklisted(address);
  }

  async mintTokens(to: string, amount: string): Promise<ethers.ContractTransactionResponse> {
    if (!this.signer) throw new Error('Signer required for minting');
    const contract = this.getNYAXTokenContract(true);
    const amountWei = ethers.parseEther(amount);
    return await contract.mint(to, amountWei);
  }

  async burnTokens(from: string, amount: string): Promise<ethers.ContractTransactionResponse> {
    if (!this.signer) throw new Error('Signer required for burning');
    const contract = this.getNYAXTokenContract(true);
    const amountWei = ethers.parseEther(amount);
    return await contract.burn(from, amountWei);
  }

  async burnSelfTokens(amount: string): Promise<ethers.ContractTransactionResponse> {
    if (!this.signer) throw new Error('Signer required for burning');
    const contract = this.getNYAXTokenContract(true);
    const amountWei = ethers.parseEther(amount);
    return await contract.burnSelf(amountWei);
  }

  async setTransfersEnabled(enabled: boolean): Promise<ethers.ContractTransactionResponse> {
    if (!this.signer) throw new Error('Signer required for setting transfers');
    const contract = this.getNYAXTokenContract(true);
    return await contract.setTransfersEnabled(enabled);
  }

  async pauseToken(): Promise<ethers.ContractTransactionResponse> {
    if (!this.signer) throw new Error('Signer required to pause token');
    const contract = this.getNYAXTokenContract(true);
    return await contract.pause();
  }

  async unpauseToken(): Promise<ethers.ContractTransactionResponse> {
    if (!this.signer) throw new Error('Signer required to unpause token');
    const contract = this.getNYAXTokenContract(true);
    return await contract.unpause();
  }

  async setBlacklisted(account: string, isBlacklisted: boolean): Promise<ethers.ContractTransactionResponse> {
    if (!this.signer) throw new Error('Signer required for blacklisting');
    const contract = this.getNYAXTokenContract(true);
    return await contract.setBlacklisted(account, isBlacklisted);
  }

  async batchSetBlacklisted(accounts: string[], isBlacklisted: boolean): Promise<ethers.ContractTransactionResponse> {
    if (!this.signer) throw new Error('Signer required for batch blacklisting');
    const contract = this.getNYAXTokenContract(true);
    return await contract.batchSetBlacklisted(accounts, isBlacklisted);
  }

  async recoverERC20(tokenAddress: string, amount: string): Promise<ethers.ContractTransactionResponse> {
    if (!this.signer) throw new Error('Signer required for recovery');
    const contract = this.getNYAXTokenContract(true);
    const amountWei = ethers.parseEther(amount);
    return await contract.recoverERC20(tokenAddress, amountWei);
  }

  async recoverETH(): Promise<ethers.ContractTransactionResponse> {
    if (!this.signer) throw new Error('Signer required for recovery');
    const contract = this.getNYAXTokenContract(true);
    return await contract.recoverETH();
  }

  async getTokenBalance(address: string): Promise<string> {
    const contract = this.getNYAXTokenContract();
    const balance = await contract.balanceOf(address);
    return ethers.formatEther(balance);
  }

  async getVotingPower(address: string): Promise<VotingPower> {
    const contract = this.getNYAXTokenContract();
    
    const [balance, votes, delegatedTo] = await Promise.all([
      contract.balanceOf(address),
      contract.getVotes(address),
      contract.delegates(address)
    ]);

    return {
      balance: ethers.formatEther(balance),
      votes: ethers.formatEther(votes),
      delegatedTo,
      delegatedFrom: [] // Would need to query events for this
    };
  }

  async delegateVotes(delegatee: string): Promise<ethers.ContractTransactionResponse> {
    if (!this.signer) throw new Error('Signer required for delegation');
    const contract = this.getNYAXTokenContract(true);
    return await contract.delegate(delegatee);
  }

  // Governance functions
  async getGovernanceStats(): Promise<GovernanceStats> {
    const contract = this.getGovernorContract();
    
    const [proposalThreshold, votingDelay, votingPeriod] = await Promise.all([
      contract.proposalThreshold(),
      contract.votingDelay(),
      contract.votingPeriod()
    ]);

    // Get current block for quorum calculation
    const currentBlock = await this.provider.getBlockNumber();
    const quorumVotes = await contract.quorum(currentBlock);

    return {
      totalProposals: 0, // Would need to query events
      activeProposals: 0, // Would need to query events
      totalVoters: 0, // Would need to query events
      quorumVotes: ethers.formatEther(quorumVotes),
      proposalThreshold: ethers.formatEther(proposalThreshold),
      votingDelay: Number(votingDelay),
      votingPeriod: Number(votingPeriod)
    };
  }

  async createProposal(
    targets: string[],
    values: string[],
    calldatas: string[],
    description: string
  ): Promise<ethers.ContractTransactionResponse> {
    if (!this.signer) throw new Error('Signer required for proposal creation');
    const contract = this.getGovernorContract(true);
    return await contract.propose(targets, values, calldatas, description);
  }

  async castVote(
    proposalId: string,
    support: 0 | 1 | 2,
    reason?: string
  ): Promise<ethers.ContractTransactionResponse> {
    if (!this.signer) throw new Error('Signer required for voting');
    const contract = this.getGovernorContract(true);
    
    if (reason) {
      return await contract.castVoteWithReason(proposalId, support, reason);
    } else {
      return await contract.castVote(proposalId, support);
    }
  }

  async getProposalState(proposalId: string): Promise<string> {
    const contract = this.getGovernorContract();
    const state = await contract.state(proposalId);
    return CONSTANTS.PROPOSAL_STATES[state as keyof typeof CONSTANTS.PROPOSAL_STATES] || 'Unknown';
  }

  async getProposalVotes(proposalId: string): Promise<{ against: string; for: string; abstain: string }> {
    const contract = this.getGovernorContract();
    const [againstVotes, forVotes, abstainVotes] = await contract.proposalVotes(proposalId);
    
    return {
      against: ethers.formatEther(againstVotes),
      for: ethers.formatEther(forVotes),
      abstain: ethers.formatEther(abstainVotes)
    };
  }

  // Additional Governor Functions
  async createEmergencyProposal(
    targets: string[],
    values: string[],
    calldatas: string[],
    description: string
  ): Promise<ethers.ContractTransactionResponse> {
    if (!this.signer) throw new Error('Signer required for emergency proposal creation');
    const contract = this.getGovernorContract(true);
    return await contract.proposeEmergency(targets, values, calldatas, description);
  }

  async enableFastTrack(proposalId: string): Promise<ethers.ContractTransactionResponse> {
    if (!this.signer) throw new Error('Signer required for fast track');
    const contract = this.getGovernorContract(true);
    return await contract.enableFastTrack(proposalId);
  }

  async isEmergencyProposal(proposalId: string): Promise<boolean> {
    const contract = this.getGovernorContract();
    return await contract.isEmergencyProposal(proposalId);
  }

  async isFastTrackEnabled(proposalId: string): Promise<boolean> {
    const contract = this.getGovernorContract();
    return await contract.isFastTrackEnabled(proposalId);
  }

  async getProposalDetails(proposalId: string): Promise<{
    proposer: string;
    eta: number;
    startBlock: number;
    endBlock: number;
    forVotes: string;
    againstVotes: string;
    abstainVotes: string;
    isEmergency: boolean;
    isFastTrack: boolean;
    currentState: string;
  }> {
    const contract = this.getGovernorContract();
    const details = await contract.getProposalDetails(proposalId);
    
    return {
      proposer: details.proposer,
      eta: Number(details.eta),
      startBlock: Number(details.startBlock),
      endBlock: Number(details.endBlock),
      forVotes: ethers.formatEther(details.forVotes),
      againstVotes: ethers.formatEther(details.againstVotes),
      abstainVotes: ethers.formatEther(details.abstainVotes),
      isEmergency: details.isEmergency,
      isFastTrack: details.isFastTrack,
      currentState: CONSTANTS.PROPOSAL_STATES[details.currentState as keyof typeof CONSTANTS.PROPOSAL_STATES] || 'Unknown'
    };
  }

  async hasVoted(proposalId: string, account: string): Promise<boolean> {
    const contract = this.getGovernorContract();
    return await contract.hasVoted(proposalId, account);
  }

  async getProposalSnapshot(proposalId: string): Promise<number> {
    const contract = this.getGovernorContract();
    const snapshot = await contract.proposalSnapshot(proposalId);
    return Number(snapshot);
  }

  async getProposalDeadline(proposalId: string): Promise<number> {
    const contract = this.getGovernorContract();
    const deadline = await contract.proposalDeadline(proposalId);
    return Number(deadline);
  }

  async executeProposal(
    targets: string[],
    values: string[],
    calldatas: string[],
    descriptionHash: string
  ): Promise<ethers.ContractTransactionResponse> {
    if (!this.signer) throw new Error('Signer required for proposal execution');
    const contract = this.getGovernorContract(true);
    return await contract.execute(targets, values, calldatas, descriptionHash);
  }

  async cancelProposal(
    targets: string[],
    values: string[],
    calldatas: string[],
    descriptionHash: string
  ): Promise<ethers.ContractTransactionResponse> {
    if (!this.signer) throw new Error('Signer required for proposal cancellation');
    const contract = this.getGovernorContract(true);
    return await contract.cancel(targets, values, calldatas, descriptionHash);
  }

  // Treasury functions
  async getTreasuryStats(): Promise<TreasuryStats> {
    const contract = this.getTreasuryContract();

    const normalizeBigNumberish = (value: any): ethers.BigNumberish => {
      if (value === undefined || value === null) return '0';
      if (typeof value === 'string' || typeof value === 'number' || typeof value === 'bigint') return value;
      return '0';
    };

    const [balanceRaw, categoriesRaw, multisigThresholdRaw, foldersRaw, pausedRaw] = await Promise.all([
      contract.getTreasuryBalance?.().catch(() => null) ?? contract.treasuryBalance?.().catch(() => null) ?? null,
      contract.getCategories?.().catch(() => []) ?? [],
      contract.MULTISIG_THRESHOLD?.().catch(() => null) ?? null,
      contract.getFolders?.().catch(() => []) ?? [],
      contract.paused?.().catch(() => false) ?? false
    ]);

    const folders: string[] = Array.isArray(foldersRaw) ? foldersRaw : [];
    const categories: any[] = Array.isArray(categoriesRaw) ? categoriesRaw : [];

    let approvedCount = 0;
    if (folders.length && typeof contract.approvedFolders === 'function') {
      const approvals = await Promise.all(
        folders.map(async (folder: string) => {
          try {
            return await contract.approvedFolders(folder);
          } catch {
            return false;
          }
        })
      );
      approvedCount = approvals.filter(Boolean).length;
    }

    const totalAllocationRaw = await contract.getTotalAllocation?.().catch(() => null);

    const balance = ethers.formatEther(normalizeBigNumberish(balanceRaw));
    const totalAllocation = totalAllocationRaw !== null ? Number(totalAllocationRaw) : 0;
    const multisigThreshold = ethers.formatEther(normalizeBigNumberish(multisigThresholdRaw));

    return {
      treasuryBalance: balance,
      totalFolders: folders.length,
      approvedFolders: approvedCount,
      isPaused: Boolean(pausedRaw),
      totalBalance: balance,
      totalAllocated: totalAllocation,
      categoriesCount: categories.length,
      multisigThreshold
    };
  }

  async getTreasuryCategories(): Promise<TreasuryCategory[]> {
    const contract = this.getTreasuryContract();
    const categories = await contract.getCategories();
    
    const categoryData = await Promise.all(
      categories.map(async (category: string) => {
        const info = await contract.getCategoryInfo(category);
        return {
          name: category,
          wallet: info.wallet,
          allocation: Number(info.allocation),
          distributed: ethers.formatEther(info.distributed),
          remaining: ethers.formatEther(info.remaining)
        };
      })
    );

    return categoryData;
  }

  async mintToTreasury(amount: string, reason: string): Promise<ethers.ContractTransactionResponse> {
    if (!this.signer) throw new Error('Signer required for minting');
    const contract = this.getTreasuryContract(true);
    const amountWei = ethers.parseEther(amount);
    return await contract.mintToTreasury(amountWei, reason);
  }

  // Additional Treasury Functions
  async setCategoryWallet(
    category: string,
    wallet: string,
    allocation: number
  ): Promise<ethers.ContractTransactionResponse> {
    if (!this.signer) throw new Error('Signer required for setting category');
    const contract = this.getTreasuryContract(true);
    return await contract.setCategoryWallet(category, wallet, allocation);
  }

  async removeCategory(category: string): Promise<ethers.ContractTransactionResponse> {
    if (!this.signer) throw new Error('Signer required for removing category');
    const contract = this.getTreasuryContract(true);
    return await contract.removeCategory(category);
  }

  async transferTo(
    to: string,
    amount: string,
    reason: string,
    category: string
  ): Promise<ethers.ContractTransactionResponse> {
    if (!this.signer) throw new Error('Signer required for transfer');
    const contract = this.getTreasuryContract(true);
    const amountWei = ethers.parseEther(amount);
    return await contract.transferTo(to, amountWei, reason, category);
  }

  async multisigTransfer(
    to: string,
    amount: string,
    reason: string,
    category: string
  ): Promise<ethers.ContractTransactionResponse> {
    if (!this.signer) throw new Error('Signer required for multisig transfer');
    const contract = this.getTreasuryContract(true);
    const amountWei = ethers.parseEther(amount);
    return await contract.multisigTransfer(to, amountWei, reason, category);
  }

  async mintTo(
    to: string,
    amount: string,
    reason: string,
    category: string
  ): Promise<ethers.ContractTransactionResponse> {
    if (!this.signer) throw new Error('Signer required for minting');
    const contract = this.getTreasuryContract(true);
    const amountWei = ethers.parseEther(amount);
    return await contract.mintTo(to, amountWei, reason, category);
  }

  async burnFromTreasury(amount: string, reason: string): Promise<ethers.ContractTransactionResponse> {
    if (!this.signer) throw new Error('Signer required for burning');
    const contract = this.getTreasuryContract(true);
    const amountWei = ethers.parseEther(amount);
    return await contract.burnFromTreasury(amountWei, reason);
  }

  async setTreasuryMultisig(multisig: string): Promise<ethers.ContractTransactionResponse> {
    if (!this.signer) throw new Error('Signer required for setting multisig');
    const contract = this.getTreasuryContract(true);
    return await contract.setMultisig(multisig);
  }

  async requiresMultisig(amount: string): Promise<boolean> {
    const contract = this.getTreasuryContract();
    const amountWei = ethers.parseEther(amount);
    return await contract.requiresMultisig(amountWei);
  }

  async emergencyRecoverERC20(tokenAddress: string, amount: string): Promise<ethers.ContractTransactionResponse> {
    if (!this.signer) throw new Error('Signer required for recovery');
    const contract = this.getTreasuryContract(true);
    const amountWei = ethers.parseEther(amount);
    return await contract.emergencyRecoverERC20(tokenAddress, amountWei);
  }

  async emergencyRecoverETH(): Promise<ethers.ContractTransactionResponse> {
    if (!this.signer) throw new Error('Signer required for recovery');
    const contract = this.getTreasuryContract(true);
    return await contract.emergencyRecoverETH();
  }

  // Multisig functions
  async getMultisigInfo(): Promise<{ threshold: number; owners: string[]; transactionCount: number }> {
    const contract = this.getMultisigContract();
    
    const [threshold, owners, transactionCount] = await Promise.all([
      contract.threshold(),
      contract.getOwners(),
      contract.getTransactionCount()
    ]);

    return {
      threshold: Number(threshold),
      owners,
      transactionCount: Number(transactionCount)
    };
  }

  async submitMultisigTransaction(
    to: string,
    value: string,
    data: string
  ): Promise<ethers.ContractTransactionResponse> {
    if (!this.signer) throw new Error('Signer required for multisig transaction');
    const contract = this.getMultisigContract(true);
    const valueWei = ethers.parseEther(value);
    return await contract.submitTransaction(to, valueWei, data);
  }

  async confirmMultisigTransaction(txIndex: number): Promise<ethers.ContractTransactionResponse> {
    if (!this.signer) throw new Error('Signer required for confirmation');
    const contract = this.getMultisigContract(true);
    return await contract.confirmTransaction(txIndex);
  }

  async executeMultisigTransaction(txIndex: number): Promise<ethers.ContractTransactionResponse> {
    if (!this.signer) throw new Error('Signer required for execution');
    const contract = this.getMultisigContract(true);
    return await contract.executeTransaction(txIndex);
  }

  // Additional Multisig Functions
  async revokeConfirmation(txIndex: number): Promise<ethers.ContractTransactionResponse> {
    if (!this.signer) throw new Error('Signer required for revocation');
    const contract = this.getMultisigContract(true);
    return await contract.revokeConfirmation(txIndex);
  }

  async getMultisigTransaction(txIndex: number): Promise<{
    to: string;
    value: string;
    data: string;
    executed: boolean;
    confirmations: number;
  }> {
    const contract = this.getMultisigContract();
    const tx = await contract.getTransaction(txIndex);
    
    return {
      to: tx.to,
      value: ethers.formatEther(tx.value),
      data: tx.data,
      executed: tx.executed,
      confirmations: Number(tx.confirmations)
    };
  }

  async isConfirmed(txIndex: number, owner: string): Promise<boolean> {
    const contract = this.getMultisigContract();
    return await contract.isConfirmed(txIndex, owner);
  }

  async getOwnerCount(): Promise<number> {
    const contract = this.getMultisigContract();
    const count = await contract.getOwnerCount();
    return Number(count);
  }

  async isOwner(address: string): Promise<boolean> {
    const contract = this.getMultisigContract();
    return await contract.isOwner(address);
  }

  // Vesting functions
  async createVestingContract(category: string): Promise<ethers.ContractTransactionResponse> {
    if (!this.signer) throw new Error('Signer required for vesting contract creation');
    const contract = this.getVestingFactoryContract(true);
    return await contract.createVestingContract(category);
  }

  async getVestingContracts(category?: string): Promise<string[]> {
    const contract = this.getVestingFactoryContract();
    
    if (category) {
      return await contract.getCategoryContracts(category);
    } else {
      return await contract.getAllContracts();
    }
  }

  async getVestingCategories(): Promise<string[]> {
    const contract = this.getVestingFactoryContract();
    return await contract.getCategories();
  }

  // Additional Vesting Factory Functions
  async getCategoryContractCount(category: string): Promise<number> {
    const contract = this.getVestingFactoryContract();
    const count = await contract.getCategoryContractCount(category);
    return Number(count);
  }

  async getTotalContractCount(): Promise<number> {
    const contract = this.getVestingFactoryContract();
    const count = await contract.getTotalContractCount();
    return Number(count);
  }

  async isFactoryContract(contractAddress: string): Promise<boolean> {
    const contract = this.getVestingFactoryContract();
    return await contract.isFactoryContract(contractAddress);
  }

  async getContractCategory(contractAddress: string): Promise<string> {
    const contract = this.getVestingFactoryContract();
    return await contract.getContractCategory(contractAddress);
  }

  // VestingWallet Functions
  async createVestingSchedule(
    vestingWalletAddress: string,
    beneficiary: string,
    totalAmount: string,
    start: number,
    cliffDuration: number,
    duration: number,
    revocable: boolean,
    category: string
  ): Promise<ethers.ContractTransactionResponse> {
    if (!this.signer) throw new Error('Signer required for creating vesting schedule');
    const contract = this.getVestingWalletContract(vestingWalletAddress, true);
    const amountWei = ethers.parseEther(totalAmount);
    return await contract.createVestingSchedule(
      beneficiary,
      amountWei,
      start,
      cliffDuration,
      duration,
      revocable,
      category
    );
  }

  async addMilestone(
    vestingWalletAddress: string,
    scheduleId: string,
    timestamp: number,
    percentage: number,
    description: string
  ): Promise<ethers.ContractTransactionResponse> {
    if (!this.signer) throw new Error('Signer required for adding milestone');
    const contract = this.getVestingWalletContract(vestingWalletAddress, true);
    return await contract.addMilestone(scheduleId, timestamp, percentage, description);
  }

  async getVestedAmount(
    vestingWalletAddress: string,
    scheduleId: string,
    timestamp: number
  ): Promise<string> {
    const contract = this.getVestingWalletContract(vestingWalletAddress);
    const amount = await contract.vestedAmount(scheduleId, timestamp);
    return ethers.formatEther(amount);
  }

  async getMilestoneVested(
    vestingWalletAddress: string,
    scheduleId: string,
    timestamp: number
  ): Promise<string> {
    const contract = this.getVestingWalletContract(vestingWalletAddress);
    const amount = await contract.getMilestoneVested(scheduleId, timestamp);
    return ethers.formatEther(amount);
  }

  async releaseVestedTokens(
    vestingWalletAddress: string,
    scheduleId: string
  ): Promise<ethers.ContractTransactionResponse> {
    if (!this.signer) throw new Error('Signer required for releasing tokens');
    const contract = this.getVestingWalletContract(vestingWalletAddress, true);
    return await contract.release(scheduleId);
  }

  async revokeVesting(
    vestingWalletAddress: string,
    scheduleId: string
  ): Promise<ethers.ContractTransactionResponse> {
    if (!this.signer) throw new Error('Signer required for revoking vesting');
    const contract = this.getVestingWalletContract(vestingWalletAddress, true);
    return await contract.revoke(scheduleId);
  }

  async getReleasableAmount(
    vestingWalletAddress: string,
    scheduleId: string
  ): Promise<string> {
    const contract = this.getVestingWalletContract(vestingWalletAddress);
    const amount = await contract.releasableAmount(scheduleId);
    return ethers.formatEther(amount);
  }

  async getBeneficiarySchedules(
    vestingWalletAddress: string,
    beneficiary: string
  ): Promise<string[]> {
    const contract = this.getVestingWalletContract(vestingWalletAddress);
    return await contract.getBeneficiarySchedules(beneficiary);
  }

  async getAllSchedules(vestingWalletAddress: string): Promise<string[]> {
    const contract = this.getVestingWalletContract(vestingWalletAddress);
    return await contract.getAllSchedules();
  }

  async getMilestones(
    vestingWalletAddress: string,
    scheduleId: string
  ): Promise<Array<{
    timestamp: number;
    percentage: number;
    released: boolean;
    description: string;
  }>> {
    const contract = this.getVestingWalletContract(vestingWalletAddress);
    const milestones = await contract.getMilestones(scheduleId);
    
    return milestones.map((milestone: any) => ({
      timestamp: Number(milestone.timestamp),
      percentage: Number(milestone.percentage),
      released: milestone.released,
      description: milestone.description
    }));
  }

  async toggleVestingPause(vestingWalletAddress: string): Promise<ethers.ContractTransactionResponse> {
    if (!this.signer) throw new Error('Signer required for toggling pause');
    const contract = this.getVestingWalletContract(vestingWalletAddress, true);
    return await contract.togglePause();
  }

  async getVestingContractBalance(vestingWalletAddress: string): Promise<string> {
    const contract = this.getVestingWalletContract(vestingWalletAddress);
    const balance = await contract.getContractBalance();
    return ethers.formatEther(balance);
  }

  async isVestingPaused(vestingWalletAddress: string): Promise<boolean> {
    const contract = this.getVestingWalletContract(vestingWalletAddress);
    return await contract.paused();
  }

  async getVestingSchedule(
    vestingWalletAddress: string,
    scheduleId: string
  ): Promise<{
    beneficiary: string;
    totalAmount: string;
    start: number;
    cliff: number;
    duration: number;
    released: string;
    revoked: boolean;
    revocable: boolean;
    category: string;
  }> {
    const contract = this.getVestingWalletContract(vestingWalletAddress);
    const schedule = await contract.vestingSchedules(scheduleId);
    
    return {
      beneficiary: schedule.beneficiary,
      totalAmount: ethers.formatEther(schedule.totalAmount),
      start: Number(schedule.start),
      cliff: Number(schedule.cliff),
      duration: Number(schedule.duration),
      released: ethers.formatEther(schedule.released),
      revoked: schedule.revoked,
      revocable: schedule.revocable,
      category: schedule.category
    };
  }

  // Utility functions
  async isValidAddress(address: string): Promise<boolean> {
    try {
      return ethers.isAddress(address);
    } catch {
      return false;
    }
  }

  async getCurrentBlock(): Promise<number> {
    return await this.provider.getBlockNumber();
  }

  async getTransactionReceipt(txHash: string): Promise<ethers.TransactionReceipt | null> {
    return await this.provider.getTransactionReceipt(txHash);
  }

  // Event listeners
  onProposalCreated(callback: (event: any) => void) {
    const contract = this.getGovernorContract();
    contract.on('ProposalCreated', callback);
    return () => contract.off('ProposalCreated', callback);
  }

  onVoteCast(callback: (event: any) => void) {
    const contract = this.getGovernorContract();
    contract.on('VoteCast', callback);
    return () => contract.off('VoteCast', callback);
  }

  onTokenTransfer(callback: (event: any) => void) {
    const contract = this.getNYAXTokenContract();
    contract.on('Transfer', callback);
    return () => contract.off('Transfer', callback);
  }
}

// Singleton instance
let daoServiceInstance: DAOService | null = null;

export const initializeDAOService = (provider: ethers.Provider, signer?: ethers.Signer) => {
  daoServiceInstance = new DAOService(provider, signer);
  return daoServiceInstance;
};

export const getDAOService = (): DAOService => {
  if (!daoServiceInstance) {
    throw new Error('DAO Service not initialized. Call initializeDAOService first.');
  }
  return daoServiceInstance;
};
