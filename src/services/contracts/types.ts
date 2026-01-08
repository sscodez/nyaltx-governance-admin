// Contract Types and Interfaces
export interface ContractAddresses {
  nyaxToken: string;
  legacyToken: string;
  legacyMigrationVault: string;
  staking: string;
  folderRegistry: string;
  nyaxGovernor: string;
  timelock: string;
  treasury: string;
  multisig: string;
  vestingFactory: string;
  treasuryBridge: string;
}

export interface FolderTemplate {
  cliff: number;
  duration: number;
  revocable: boolean;
}

export interface FolderAllocationScheduleInput extends FolderTemplate {
  start: number;
}

export interface FolderInfo {
  id: number;
  name: string;
  defaultPermissions: number;
  totalAllocated: string;
  template: FolderTemplate;
  locked: boolean;
  exists: boolean;
  members: string[];
}

export interface FolderMemberInfo {
  account: string;
  permissions: number;
  unlockedAmount: string;
  walletName?: string;
}

export interface StakingPosition {
  stakeId: number;
  amount: string;
  votingPower: string;
  unlockTime: number;
  withdrawn: boolean;
}

export interface StakingStats {
  minLock: number;
  maxLock: number;
  totalStaked: string;
  totalSupply: string;
  emergencyUnlock: boolean;
}

export interface MigrationVaultStats {
  conversionRatio: string;
  depositsEnabled: boolean;
  legacyToken: string;
  governanceToken: string;
}

export interface LegacyDepositResult {
  txHash: string;
  mintedAmount: string;
}

export interface LegacyDepositEvent {
  account: string;
  legacyAmount: string;
  governanceMinted: string;
  blockNumber: number;
  timestamp: number;
  txHash: string;
}

export interface VoteEvent {
  voter: string;
  proposalId: string;
  support: number;
  weight: string;
  reason: string;
  txHash: string;
  blockNumber: number;
  timestamp: number;
}

export interface TreasuryBridgeInfo {
  treasuryMultisig: string;
  timelockController: string;
  governor: string;
  controllerRole: string;
}

export interface ProposalData {
  id: string;
  title: string;
  description: string;
  proposer: string;
  status: 'active' | 'succeeded' | 'defeated' | 'queued' | 'executed' | 'canceled';
  forVotes: string;
  againstVotes: string;
  abstainVotes: string;
  startBlock: number;
  endBlock: number;
  startTimestamp?: number;
  endTimestamp?: number;
  eta: number;
  isEmergency: boolean;
  isFastTrack: boolean;
  category: string;
  targets: string[];
  values: string[];
  calldatas: string[];
}

export interface VestingSchedule {
  id: string;
  beneficiary: string;
  totalAmount: string;
  start: number;
  cliff: number;
  duration: number;
  released: string;
  revoked: boolean;
  revocable: boolean;
  category: string;
  releasableAmount: string;
  vestedAmount: string;
}

export interface TreasuryCategory {
  name: string;
  wallet: string;
  allocation: number; // basis points
  distributed: string;
  remaining: string;
}

export interface TreasuryTransfer {
  txHash: string;
  to: string;
  amount: string;
  reason: string;
  category: string;
  blockNumber: number;
  timestamp: number;
}

export interface MultisigTransaction {
  id: number;
  to: string;
  value: string;
  data: string;
  executed: boolean;
  confirmations: number;
  isConfirmed: boolean;
}

export interface TokenInfo {
  name: string;
  symbol: string;
  decimals: number;
  totalSupply: string;
  maxSupply: string;
  remainingMintable: string;
  treasury: string;
  transfersEnabled: boolean;
  paused: boolean;
}

export interface VotingPower {
  balance: string;
  votes: string;
  delegatedTo: string;
  delegatedFrom: string[];
}

export interface GovernanceStats {
  totalProposals: number;
  activeProposals: number;
  totalVoters: number;
  quorumVotes: string;
  proposalThreshold: string;
  votingDelay: number;
  votingPeriod: number;
}

export interface TreasuryStats {
  totalBalance: string;
  totalAllocated: number;
  categoriesCount: number;
  multisigThreshold: string;
}

export interface ContractError {
  code: string;
  message: string;
  data?: any;
}

export type VoteSupport = 0 | 1 | 2; // Against, For, Abstain
