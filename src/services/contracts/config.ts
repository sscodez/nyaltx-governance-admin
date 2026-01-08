
// Contract addresses - Update these with deployed contract addresses
export const CONTRACT_ADDRESSES: any = {
  nyaxToken: process.env.NEXT_NYAX_TOKEN_ADDRESS || '0xa879282ad7097f2503A4D128b807546e79A88F2f',
  legacyToken: process.env.NEXT_PUBLIC_LEGACY_TOKEN_ADDRESS || '0xe75B4240053FC34c5c5751Ab0282190149dfC4Be',
  legacyMigrationVault: '0x0b8963BaD0B5331852D5FA5d15661317Cb96a40B',
  staking: process.env.NEXT_PUBLIC_STAKING_ADDRESS || '0xA6518003fb0F4062e370C21b5f5096F9d88bcDfE',
  folderRegistry: process.env.NEXT_PUBLIC_FOLDER_REGISTRY_ADDRESS || '0x9b8209dA26ab232C1F6Caa30Ddcf3B6fA0394C34',
  nyaxGovernor: process.env.NEXT_PUBLIC_GOVERNOR_ADDRESS || '0xD69743C1b6Ee9Ab46922993b282D3BA7dd093086',
  timelock: process.env.NEXT_PUBLIC_TIMELOCK_ADDRESS || '0xa17B822F9D0A26C20BDe453F0e566a2D2787E851',
  treasury: '0x817716Ad67Cda88aC23F9dAd446d3826f818D155',
  multisig: process.env.NEXT_PUBLIC_MULTISIG_ADDRESS || '0x5cD8aD5E36324C386b6F62Ce2374aa3F3f8Ae0aD',
  vestingFactory: process.env.NEXT_PUBLIC_VESTING_FACTORY_ADDRESS || '',
  treasuryBridge: process.env.NEXT_PUBLIC_TREASURY_BRIDGE_ADDRESS || '0x7ab3eBb87afa9A921d0770Fa304F20Fc8D2a4763',
  folderEscrow: process.env.NEXT_PUBLIC_FOLDER_ESCROW_ADDRESS || '',
  folderEscrowFactory: '0x97E354A506f22a233AD47C19138Abed1d8934925',

};

// Contract ABIs - Import from generated files or define here
export const CONTRACT_ABIS = {
  nyaxToken: [
    // ERC20 + ERC20Votes functions
    'function name() view returns (string)',
    'function symbol() view returns (string)',
    'function decimals() view returns (uint8)',
    'function totalSupply() view returns (uint256)',
    'function balanceOf(address) view returns (uint256)',
    'function transfer(address to, uint256 amount) returns (bool)',
    'function allowance(address owner, address spender) view returns (uint256)',
    'function approve(address spender, uint256 amount) returns (bool)',
    'function transferFrom(address from, address to, uint256 amount) returns (bool)',
    
    // ERC20Votes functions
    'function getVotes(address account) view returns (uint256)',
    'function getPastVotes(address account, uint256 blockNumber) view returns (uint256)',
    'function getPastTotalSupply(uint256 blockNumber) view returns (uint256)',
    'function delegates(address account) view returns (address)',
    'function delegate(address delegatee)',
    'function delegateBySig(address delegatee, uint256 nonce, uint256 expiry, uint8 v, bytes32 r, bytes32 s)',
    
    // NYAX specific functions
    'function MAX_SUPPLY() view returns (uint256)',
    'function treasury() view returns (address)',
    'function transfersEnabled() view returns (bool)',
    'function blacklisted(address) view returns (bool)',
    'function remainingMintableSupply() view returns (uint256)',
    'function paused() view returns (bool)',
    'function mint(address to, uint256 amount)',
    'function burn(address from, uint256 amount)',
    'function burnSelf(uint256 amount)',
    'function setTreasury(address _treasury)',
    'function setTransfersEnabled(bool enabled)',
    'function setBlacklisted(address account, bool _blacklisted)',
    
    // Events
    'event Transfer(address indexed from, address indexed to, uint256 value)',
    'event Approval(address indexed owner, address indexed spender, uint256 value)',
    'event DelegateChanged(address indexed delegator, address indexed fromDelegate, address indexed toDelegate)',
    'event DelegateVotesChanged(address indexed delegate, uint256 previousBalance, uint256 newBalance)',
    'event TreasuryUpdated(address indexed oldTreasury, address indexed newTreasury)',
    'event TransfersToggled(bool enabled)',
    'event AddressBlacklisted(address indexed account, bool blacklisted)',
    'event TokensMinted(address indexed to, uint256 amount)',
    'event TokensBurned(address indexed from, uint256 amount)',
  ],

  legacyMigrationVault: [{"inputs":[{"internalType":"contract IERC20","name":"legacy","type":"address"},{"internalType":"contract NYALTXGovernanceToken","name":"gov","type":"address"},{"internalType":"uint256","name":"ratio","type":"uint256"},{"internalType":"address","name":"admin","type":"address"}],"stateMutability":"nonpayable","type":"constructor"},{"inputs":[{"internalType":"address","name":"owner","type":"address"}],"name":"OwnableInvalidOwner","type":"error"},{"inputs":[{"internalType":"address","name":"account","type":"address"}],"name":"OwnableUnauthorizedAccount","type":"error"},{"inputs":[],"name":"ReentrancyGuardReentrantCall","type":"error"},{"inputs":[{"internalType":"address","name":"token","type":"address"}],"name":"SafeERC20FailedOperation","type":"error"},{"anonymous":false,"inputs":[{"indexed":false,"internalType":"uint256","name":"ratio","type":"uint256"}],"name":"ConversionRatioUpdated","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"internalType":"bool","name":"enabled","type":"bool"}],"name":"DepositsToggled","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"account","type":"address"},{"indexed":false,"internalType":"uint256","name":"legacyAmount","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"governanceMinted","type":"uint256"}],"name":"LegacyDeposited","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"previousOwner","type":"address"},{"indexed":true,"internalType":"address","name":"newOwner","type":"address"}],"name":"OwnershipTransferStarted","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"previousOwner","type":"address"},{"indexed":true,"internalType":"address","name":"newOwner","type":"address"}],"name":"OwnershipTransferred","type":"event"},{"inputs":[],"name":"acceptOwnership","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"bool","name":"authorized","type":"bool"}],"name":"authorizeMigrationContract","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"conversionRatio","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"amount","type":"uint256"},{"internalType":"address","name":"beneficiary","type":"address"}],"name":"depositLegacy","outputs":[{"internalType":"uint256","name":"minted","type":"uint256"}],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"depositsEnabled","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"governanceToken","outputs":[{"internalType":"contract NYALTXGovernanceToken","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"legacyToken","outputs":[{"internalType":"contract IERC20","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"owner","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"pendingOwner","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"renounceOwnership","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256","name":"ratio","type":"uint256"}],"name":"setConversionRatio","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"bool","name":"enabled","type":"bool"}],"name":"setDepositsEnabled","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"newOwner","type":"address"}],"name":"transferOwnership","outputs":[],"stateMutability":"nonpayable","type":"function"}],
  
  nyaxGovernor: [
    // Core Governor view/pure functions
    'function name() view returns (string)',
    'function version() view returns (string)',
    'function COUNTING_MODE() view returns (string)',
    'function hashProposal(address[] targets, uint256[] values, bytes[] calldatas, bytes32 descriptionHash) pure returns (uint256)',
    'function state(uint256 proposalId) view returns (uint8)',
    'function proposalSnapshot(uint256 proposalId) view returns (uint256)',
    'function proposalDeadline(uint256 proposalId) view returns (uint256)',
    'function proposalEta(uint256 proposalId) view returns (uint256)',
    'function proposalThreshold() view returns (uint256)',
    'function votingDelay() view returns (uint256)',
    'function votingPeriod() view returns (uint256)',
    'function quorum(uint256 blockNumber) view returns (uint256)',
    'function quorumNumerator() view returns (uint256)',
    'function quorumDenominator() view returns (uint256)',

    // Proposal interactions
    'function propose(address[] targets, uint256[] values, bytes[] calldatas, string description) returns (uint256)',
    'function cancel(address[] targets, uint256[] values, bytes[] calldatas, bytes32 descriptionHash) returns (uint256)',
    'function queue(address[] targets, uint256[] values, bytes[] calldatas, bytes32 descriptionHash) returns (uint256)',
    'function execute(address[] targets, uint256[] values, bytes[] calldatas, bytes32 descriptionHash) payable returns (uint256)',
    'function proposalVotes(uint256 proposalId) view returns (uint256 againstVotes, uint256 forVotes, uint256 abstainVotes)',
    'function hasVoted(uint256 proposalId, address account) view returns (bool)',
    'function getAllProposalIds() view returns (uint256[])',
    'function getProposalData(uint256 proposalId) view returns (address proposer,uint256 snapshotBlock,uint256 deadlineBlock,uint256 forVotes,uint256 againstVotes,uint256 abstainVotes,uint8 stateOrdinal)',
    'function getFullProposalDetails(uint256 proposalId) view returns (address proposer,address[] targets,uint256[] values,bytes[] calldatas,bytes32 descriptionHash,uint256 snapshotBlock,uint256 deadlineBlock,uint256 forVotes,uint256 againstVotes,uint256 abstainVotes,uint8 stateOrdinal)',
    'function getProposalDescriptionHash(uint256 proposalId) view returns (bytes32)',
    'function getProposalPayload(uint256 proposalId) view returns (address[] targets,uint256[] values,bytes[] calldatas)',

    // Voting helpers
    'function castVote(uint256 proposalId, uint8 support) returns (uint256)',
    'function castVoteWithReason(uint256 proposalId, uint8 support, string reason) returns (uint256)',
    'function castVoteBySig(uint256 proposalId, uint8 support, uint256 nonce, uint256 expiry, uint8 v, bytes32 r, bytes32 s) returns (uint256)',
    'function castVoteWithReasonAndParams(uint256 proposalId, uint8 support, string reason, bytes params) returns (uint256)',
    'function castVoteWithReasonAndParamsBySig(uint256 proposalId, uint8 support, string reason, bytes params, bytes signature) returns (uint256)',
    'function getVotes(address account, uint256 timepoint) view returns (uint256)',
    'function getVotesWithParams(address account, uint256 timepoint, bytes params) view returns (uint256)',

    // Admin setters
    'function setVotingDelay(uint48 newVotingDelay)',
    'function setVotingPeriod(uint32 newVotingPeriod)',
    'function setProposalThreshold(uint256 newProposalThreshold)',
    'function updateQuorumNumerator(uint256 newQuorumNumerator)',
    'function updateTimelock(address newTimelock)',

    // Events
    'event ProposalCreated(uint256 proposalId, address proposer, address[] targets, uint256[] values, string[] signatures, bytes[] calldatas, uint256 startBlock, uint256 endBlock, string description)',
    'event ProposalCanceled(uint256 proposalId)',
    'event ProposalExecuted(uint256 proposalId)',
    'event ProposalQueued(uint256 proposalId, uint256 etaSeconds)',
    'event VoteCast(address indexed voter, uint256 proposalId, uint8 support, uint256 weight, string reason)',
    'event VoteCastWithReason(address indexed voter, uint256 proposalId, uint8 support, uint256 weight, string reason)',
    'event VotingDelaySet(uint256 oldVotingDelay, uint256 newVotingDelay)',
    'event VotingPeriodSet(uint256 oldVotingPeriod, uint256 newVotingPeriod)',
    'event ProposalThresholdSet(uint256 oldProposalThreshold, uint256 newProposalThreshold)',
    'event QuorumNumeratorUpdated(uint256 oldQuorumNumerator, uint256 newQuorumNumerator)',
    'event TimelockChange(address oldTimelock, address newTimelock)',
  ],
  
  multisig: [
    // MultiSig functions
    'function threshold() view returns (uint256)',
    'function owners(uint256) view returns (address)',
    'function isOwner(address) view returns (bool)',
    'function transactionCount() view returns (uint256)',
    'function transactions(uint256) view returns (address to, uint256 value, bytes data, bool executed, uint256 confirmations)',
    
    'function submitTransaction(address to, uint256 value, bytes data) returns (uint256)',
    'function confirmTransaction(uint256 txIndex)',
    'function revokeConfirmation(uint256 txIndex)',
    'function executeTransaction(uint256 txIndex)',
    'function getTransaction(uint256 txIndex) view returns (address to, uint256 value, bytes data, bool executed, uint256 confirmations)',
    'function isConfirmed(uint256 txIndex, address owner) view returns (bool)',
    'function getOwners() view returns (address[])',
    'function getOwnerCount() view returns (uint256)',
    'function getTransactionCount() view returns (uint256)',
    
    // Events
    'event TransactionSubmitted(uint256 indexed txIndex, address indexed to, uint256 value, bytes data)',
    'event TransactionConfirmed(address indexed owner, uint256 indexed txIndex)',
    'event TransactionRevoked(address indexed owner, uint256 indexed txIndex)',
    'event TransactionExecuted(uint256 indexed txIndex)',
  ],
  
  folderRegistry: [
    'function folderCount() view returns (uint256)',
    'function folders(uint256 folderId) view returns (string name, uint32 defaultPermissions, tuple(uint64 cliff, uint64 duration, bool revocable) template, uint256 totalAllocated, bool exists)',
    'function permissionsOf(uint256 folderId, address account) view returns (uint32)',
    'function unlockedTokens(uint256 folderId, address account, uint64 timestamp) view returns (uint256)',
    'function folderMembers(uint256 folderId) view returns (address[])',
    'function getAllocation(uint256 folderId, address account) view returns (uint256 amount, uint256 claimed, tuple(uint64 start, uint64 cliff, uint64 duration, bool revocable, bool revoked, uint64 revokedAt) vesting, uint32 permissions, bool exists)',
    'function createFolder(string name, uint32 permissions, tuple(uint64 cliff, uint64 duration, bool revocable) template) returns (uint256)',
    'function updateFolder(uint256 folderId, uint32 permissions, tuple(uint64 cliff, uint64 duration, bool revocable) template)',
    'function setAllocation(uint256 folderId, address account, uint256 amount, tuple(uint64 start, uint64 cliff, uint64 duration, bool revocable, bool revoked, uint64 revokedAt) schedule, uint32 permissions)',
    'function claim(uint256 folderId, address account, uint256 amount)',
    'function revoke(uint256 folderId, address account)'
  ],
  
  treasuryBridge: [
    'function TREASURY_CONTROLLER_ROLE() view returns (bytes32)',
    'function transferTreasuryToken(address token, address to, uint256 amount, bytes32 referenceId)',
    'function transferTreasuryETH(address to, uint256 amount, bytes32 referenceId)',
    'event TreasuryTransfer(address indexed token, address indexed to, uint256 amount, bytes32 referenceId)'
  ],
  
  staking: [
    'function MIN_LOCK() view returns (uint64)',
    'function MAX_LOCK() view returns (uint64)',
    'function totalStaked() view returns (uint256)',
    'function totalSupply() view returns (uint256)',
    'function emergencyUnlock() view returns (bool)',
    'function stake(uint256 amount, uint64 lockDuration, address delegatee) returns (uint256 stakeId, uint256 votingPower)',
    'function extendLock(uint256 stakeId, uint64 additionalDuration)',
    'function unstake(uint256 stakeId, address recipient)',
    'function stakeCount(address account) view returns (uint256)',
    'function stakeInfo(address account, uint256 stakeId) view returns (uint128 amount, uint128 votingPower, uint64 unlockTime, bool withdrawn)'
  ],
  
  vestingFactory: [
    // VestingFactory functions
    'function nyaxToken() view returns (address)',
    'function categoryVestingContracts(string, uint256) view returns (address)',
    'function isVestingContract(address) view returns (bool)',
    'function contractCategory(address) view returns (string)',
    'function allVestingContracts(uint256) view returns (address)',
    'function categories(uint256) view returns (string)',
    'function categoryExists(string) view returns (bool)',
    
    'function createVestingContract(string category) returns (address)',
    'function getCategoryContracts(string category) view returns (address[])',
    'function getAllContracts() view returns (address[])',
    'function getCategories() view returns (string[])',
    'function getCategoryContractCount(string category) view returns (uint256)',
    'function getTotalContractCount() view returns (uint256)',
    'function isFactoryContract(address contractAddress) view returns (bool)',
    'function getContractCategory(address contractAddress) view returns (string)',
    
    // Events
    'event VestingContractCreated(address indexed vestingContract, string indexed category, address indexed creator)',
    'event CategoryAdded(string indexed category)',
  ],
  
  vestingWallet: [
    // VestingWallet functions
    'function token() view returns (address)',
    'function BASIS_POINTS() view returns (uint256)',
    'function vestingSchedules(bytes32) view returns (address beneficiary, uint256 totalAmount, uint256 start, uint256 cliff, uint256 duration, uint256 released, bool revoked, bool revocable, string category)',
    'function beneficiarySchedules(address, uint256) view returns (bytes32)',
    'function allScheduleIds(uint256) view returns (bytes32)',
    'function paused() view returns (bool)',
    
    'function createVestingSchedule(address beneficiary, uint256 totalAmount, uint256 start, uint256 cliffDuration, uint256 duration, bool revocable, string category) returns (bytes32)',
    'function addMilestone(bytes32 scheduleId, uint256 timestamp, uint256 percentage, string description)',
    'function vestedAmount(bytes32 scheduleId, uint256 timestamp) view returns (uint256)',
    'function getMilestoneVested(bytes32 scheduleId, uint256 timestamp) view returns (uint256)',
    'function release(bytes32 scheduleId)',
    'function revoke(bytes32 scheduleId)',
    'function releasableAmount(bytes32 scheduleId) view returns (uint256)',
    'function getBeneficiarySchedules(address beneficiary) view returns (bytes32[])',
    'function getAllSchedules() view returns (bytes32[])',
    'function getMilestones(bytes32 scheduleId) view returns (tuple(uint256 timestamp, uint256 percentage, bool released, string description)[])',
    'function togglePause()',
    'function getContractBalance() view returns (uint256)',
    
    // Events
    'event VestingScheduleCreated(bytes32 indexed scheduleId, address indexed beneficiary, uint256 totalAmount, uint256 start, uint256 cliff, uint256 duration, string category)',
    'event TokensReleased(bytes32 indexed scheduleId, address indexed beneficiary, uint256 amount)',
    'event VestingRevoked(bytes32 indexed scheduleId, address indexed beneficiary, uint256 unreleased)',
    'event MilestoneAdded(bytes32 indexed scheduleId, uint256 timestamp, uint256 percentage, string description)',
    'event MilestoneReleased(bytes32 indexed scheduleId, uint256 amount, string description)',
  ],

  folderRegisteryFactory: [
    // Constructor
    'constructor(address governance)',
    
    // Public constants
    'function GOVERNANCE_ROLE() view returns (bytes32)',
    
    // Folder Creation
    'function createFolder(string name, address token, address folderAdmin) returns (address)',
    
    // Token Statistics
    'function totalSupply() view returns (uint256 total)',
    'function circulating() view returns (uint256 totalClaimed)',
    'function stakedValue() view returns (uint256 totalLocked)',
    'function totalHolders() view returns (uint256 holders)',
    
    // Views
    'function getFolderByName(string name) view returns (address)',
    'function getAllFolders() view returns (address[])',
    'function totalFolders() view returns (uint256)',
    
    // Mappings
    'function folderByNameHash(bytes32) view returns (address)',
    'function folderInfo(address) view returns (string name, address folder, uint256 createdAt)',
    'function allFolders(uint256) view returns (address)',
    
    // Access Control
    'function hasRole(bytes32 role, address account) view returns (bool)',
    'function getRoleAdmin(bytes32 role) view returns (bytes32)',
    'function grantRole(bytes32 role, address account)',
    'function revokeRole(bytes32 role, address account)',
    'function renounceRole(bytes32 role, address account)',
    
    // Events
    'event FolderCreated(string name, address indexed folder, address indexed token)',
    'event RoleGranted(bytes32 indexed role, address indexed account, address indexed sender)',
    'event RoleRevoked(bytes32 indexed role, address indexed account, address indexed sender)',
  ],

  folderEscrow: [
    // Constructor
    'constructor(address _token, address admin, string _folderName, address _registry)',
    
    // Public constants
    'function FOLDER_ADMIN_ROLE() view returns (bytes32)',
    'function token() view returns (address)',
    'function folderName() view returns (string)',
    'function registry() view returns (address)',
    'function folderBalance() view returns (uint256)',
    'function nextBeneficiaryId() view returns (uint256)',
    
    // Beneficiary Management
    'function addBeneficiary(address wallet, uint256 totalAllocation, uint256 start, uint256 cliff, uint256 duration, string walletName)',
    'function pauseBeneficiary(uint256 beneficiaryId)',
    'function resumeBeneficiary(uint256 beneficiaryId)',
    'function cancelBeneficiary(uint256 beneficiaryId)',
    'function updateWalletName(uint256 beneficiaryId, string newName)',
    
    // Claiming
    'function claim()',
    
    // Vesting Calculation
    'function _vestedAmount(uint256 beneficiaryId) view returns (uint256)',
    
    // Views
    'function getTotalAllocated() view returns (uint256)',
    'function getBeneficiaryCount() view returns (uint256)',
    'function getBeneficiaryById(uint256 beneficiaryId) view returns (uint256 id, address wallet, uint256 totalAllocation, uint256 claimed, uint256 start, uint256 cliff, uint256 duration, bool paused, bool cancelled, string walletName)',
    'function getBeneficiaryIdsByWallet(address wallet) view returns (uint256[])',
    'function getBeneficiaryInfo(address wallet) view returns (uint256 totalAllocation, uint256 claimed, uint256 start, uint256 cliff, uint256 duration, bool paused, bool cancelled, string walletName)',
    'function getWalletByName(string walletName) view returns (uint256)',
    'function getFolderBalance() view returns (uint256)',
    
    // Mappings
    'function beneficiaries(uint256) view returns (uint256 id, address wallet, uint256 totalAllocation, uint256 claimed, uint256 start, uint256 cliff, uint256 duration, bool paused, bool cancelled, string walletName)',
    'function walletToBeneficiaryIds(address, uint256) view returns (uint256)',
    'function walletByNameHash(bytes32) view returns (uint256)',
    
    // Folder Controls
    'function pauseFolder()',
    'function unpauseFolder()',
    'function paused() view returns (bool)',
    'function trackFunding(uint256 amount)',
    
    // Access Control
    'function hasRole(bytes32 role, address account) view returns (bool)',
    'function getRoleAdmin(bytes32 role) view returns (bytes32)',
    'function grantRole(bytes32 role, address account)',
    'function revokeRole(bytes32 role, address account)',
    'function renounceRole(bytes32 role, address account)',
    
    // Events
    'event BeneficiaryAdded(address wallet, string walletName, uint256 amount, uint256 start, uint256 cliff, uint256 duration)',
    'event Claimed(address wallet, uint256 amount)',
    'event BeneficiaryPaused(address wallet)',
    'event BeneficiaryResumed(address wallet)',
    'event BeneficiaryCancelled(address wallet)',
    'event FolderFunded(uint256 amount, uint256 newBalance)',
    'event WalletNameUpdated(address wallet, string oldName, string newName)',
    'event RoleGranted(bytes32 indexed role, address indexed account, address indexed sender)',
    'event RoleRevoked(bytes32 indexed role, address indexed account, address indexed sender)',
    'event Paused(address account)',
    'event Unpaused(address account)',
  ],

  treasury: [
    // Constructor
    'constructor(address _token, address governance)',
    
    // Public constants
    'function TREASURY_ADMIN_ROLE() view returns (bytes32)',
    'function GOVERNANCE_ROLE() view returns (bytes32)',
    'function token() view returns (address)',
    
    // Folder Management
    'function approveFolder(address folder)',
    'function removeFolder(address folder)',
    'function approvedFolders(address) view returns (bool)',
    'function folders(uint256) view returns (address)',
    'function getFolders() view returns (address[])',
    'function folderBalances(address) view returns (uint256)',
    
    // Treasury Actions
    'function sendToFolder(address folder, uint256 amount)',
    
    // Emergency Controls
    'function pauseTreasury()',
    'function unpauseTreasury()',
    'function paused() view returns (bool)',
    
    // Views
    'function treasuryBalance() view returns (uint256)',
    'function getFolderBalance(address folder) view returns (uint256)',
    'function getAllFolderBalances() view returns (address[], uint256[])',
    
    // Access Control
    'function hasRole(bytes32 role, address account) view returns (bool)',
    'function getRoleAdmin(bytes32 role) view returns (bytes32)',
    'function grantRole(bytes32 role, address account)',
    'function revokeRole(bytes32 role, address account)',
    'function renounceRole(bytes32 role, address account)',
    
    // Events
    'event FolderApproved(address folder)',
    'event FolderRemoved(address folder)',
    'event TokensSentToFolder(address indexed folder, uint256 amount, uint256 totalSent)',
    'event RoleGranted(bytes32 indexed role, address indexed account, address indexed sender)',
    'event RoleRevoked(bytes32 indexed role, address indexed account, address indexed sender)',
    'event Paused(address account)',
    'event Unpaused(address account)',
  ]
};

// Network configuration
export const NETWORK_CONFIG = {
  chainId: '11155111',
  rpcUrl: 'https://sepolia.infura.io/v3/3d29d60f06d34421b156caabee3f5ed4',
  blockExplorer:  'https://sepolia.etherscan.io',
};

// Constants
export const CONSTANTS = {
  BASIS_POINTS: 10000,
  ZERO_ADDRESS: '0x0000000000000000000000000000000000000000',
  MAX_UINT256: '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff',
  PROPOSAL_STATES: {
    0: 'Pending',
    1: 'Active',
    2: 'Canceled',
    3: 'Defeated',
    4: 'Succeeded',
    5: 'Queued',
    6: 'Expired',
    7: 'Executed',
  } as const,
  VOTE_SUPPORT: {
    AGAINST: 0,
    FOR: 1,
    ABSTAIN: 2,
  } as const,
};
