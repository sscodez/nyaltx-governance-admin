import { ethers } from 'ethers';
import { CONTRACT_ABIS, CONTRACT_ADDRESSES } from './config';
import { ContractError, MultisigTransaction } from './types';

export class MultisigService {
  private provider: ethers.Provider;
  private signer?: ethers.Signer;
  private multisigContract: ethers.Contract;

  constructor(provider: ethers.Provider, signer?: ethers.Signer) {
    this.provider = provider;
    this.signer = signer;
    
    this.multisigContract = new ethers.Contract(
      CONTRACT_ADDRESSES.multisig,
      CONTRACT_ABIS.multisig,
      signer || provider
    );
  }

  // Transaction Management
  async submitTransaction(
    to: string,
    value: string,
    data: string = '0x'
  ): Promise<number> {
    try {
      if (!this.signer) throw new Error('Signer required for submitting transactions');
      
      const valueWei = ethers.parseEther(value);
      const tx = await this.multisigContract.submitTransaction(to, valueWei, data);
      const receipt = await tx.wait();
      
      // Get transaction index from events
      const event = receipt.logs.find((log: ethers.Log) => 
        log.topics && log.topics[0] === ethers.id('TransactionSubmitted(uint256,address,uint256,bytes)')
      );
      
      if (event && event.topics) {
        return parseInt(event.topics[1], 16);
      }
      
      throw new Error('Transaction submission failed');
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async confirmTransaction(txIndex: number): Promise<string> {
    try {
      if (!this.signer) throw new Error('Signer required for confirming transactions');
      
      const tx = await this.multisigContract.confirmTransaction(txIndex);
      const receipt = await tx.wait();
      return receipt.hash;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async revokeConfirmation(txIndex: number): Promise<string> {
    try {
      if (!this.signer) throw new Error('Signer required for revoking confirmation');
      
      const tx = await this.multisigContract.revokeConfirmation(txIndex);
      const receipt = await tx.wait();
      return receipt.hash;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async executeTransaction(txIndex: number): Promise<string> {
    try {
      if (!this.signer) throw new Error('Signer required for executing transactions');
      
      const tx = await this.multisigContract.executeTransaction(txIndex);
      const receipt = await tx.wait();
      return receipt.hash;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Transaction Queries
  async getTransaction(txIndex: number): Promise<MultisigTransaction | null> {
    try {
      const [to, value, data, executed, confirmations] = await this.multisigContract.getTransaction(txIndex);
      
      // Check if current signer has confirmed
      let isConfirmed = false;
      if (this.signer) {
        const signerAddress = await this.signer.getAddress();
        isConfirmed = await this.multisigContract.isConfirmed(txIndex, signerAddress);
      }
      
      return {
        id: txIndex,
        to,
        value: ethers.formatEther(value),
        data,
        executed,
        confirmations: Number(confirmations),
        isConfirmed,
      };
    } catch (error) {
      console.error('Error fetching transaction:', error);
      return null;
    }
  }

  async getAllTransactions(): Promise<MultisigTransaction[]> {
    try {
      const transactionCount = await this.multisigContract.getTransactionCount();
      const transactions: MultisigTransaction[] = [];
      
      for (let i = 0; i < Number(transactionCount); i++) {
        const transaction = await this.getTransaction(i);
        if (transaction) {
          transactions.push(transaction);
        }
      }
      
      return transactions;
    } catch (error) {
      console.error('Error fetching all transactions:', error);
      return [];
    }
  }

  async getPendingTransactions(): Promise<MultisigTransaction[]> {
    const allTransactions = await this.getAllTransactions();
    return allTransactions.filter(tx => !tx.executed);
  }

  async getExecutedTransactions(): Promise<MultisigTransaction[]> {
    const allTransactions = await this.getAllTransactions();
    return allTransactions.filter(tx => tx.executed);
  }

  // Multisig Info
  async getMultisigInfo(): Promise<{
    owners: string[];
    threshold: number;
    transactionCount: number;
  }> {
    try {
      const [owners, threshold, transactionCount] = await Promise.all([
        this.multisigContract.getOwners(),
        this.multisigContract.threshold(),
        this.multisigContract.getTransactionCount()
      ]);
      
      return {
        owners,
        threshold: Number(threshold),
        transactionCount: Number(transactionCount),
      };
    } catch (error) {
      console.error('Error fetching multisig info:', error);
      return {
        owners: [],
        threshold: 0,
        transactionCount: 0,
      };
    }
  }

  async isOwner(address: string): Promise<boolean> {
    try {
      return await this.multisigContract.isOwner(address);
    } catch (error) {
      console.error('Error checking owner status:', error);
      return false;
    }
  }

  async getRequiredConfirmations(): Promise<number> {
    try {
      const threshold = await this.multisigContract.threshold();
      return Number(threshold);
    } catch (error) {
      console.error('Error fetching threshold:', error);
      return 0;
    }
  }

  // Transaction Helpers
  async canExecuteTransaction(txIndex: number): Promise<boolean> {
    try {
      const transaction = await this.getTransaction(txIndex);
      if (!transaction || transaction.executed) return false;
      
      const threshold = await this.getRequiredConfirmations();
      return transaction.confirmations >= threshold;
    } catch (error) {
      console.error('Error checking execution eligibility:', error);
      return false;
    }
  }

  async hasConfirmed(txIndex: number, owner: string): Promise<boolean> {
    try {
      return await this.multisigContract.isConfirmed(txIndex, owner);
    } catch (error) {
      console.error('Error checking confirmation status:', error);
      return false;
    }
  }

  // Utility Methods for Common Operations
  async createTokenTransferTransaction(
    tokenAddress: string,
    to: string,
    amount: string
  ): Promise<number> {
    // Create ERC20 transfer calldata
    const tokenInterface = new ethers.Interface([
      'function transfer(address to, uint256 amount) returns (bool)'
    ]);
    
    const amountWei = ethers.parseEther(amount);
    const data = tokenInterface.encodeFunctionData('transfer', [to, amountWei]);
    
    return this.submitTransaction(tokenAddress, '0', data);
  }

  async createETHTransferTransaction(
    to: string,
    amount: string
  ): Promise<number> {
    return this.submitTransaction(to, amount, '0x');
  }

  async createContractCallTransaction(
    contractAddress: string,
    functionSignature: string,
    params: any[],
    value: string = '0'
  ): Promise<number> {
    const contractInterface = new ethers.Interface([functionSignature]);
    const functionName = functionSignature.split('(')[0].split(' ').pop();
    
    if (!functionName) throw new Error('Invalid function signature');
    
    const data = contractInterface.encodeFunctionData(functionName, params);
    return this.submitTransaction(contractAddress, value, data);
  }

  // Transaction Analysis
  analyzeTransactionData(data: string): {
    functionSelector: string;
    decodedData?: any;
    isTokenTransfer: boolean;
    isETHTransfer: boolean;
  } {
    if (data === '0x' || data === '0x00') {
      return {
        functionSelector: '0x',
        isTokenTransfer: false,
        isETHTransfer: true,
      };
    }
    
    const functionSelector = data.slice(0, 10);
    const isTokenTransfer = functionSelector === '0xa9059cbb'; // transfer(address,uint256)
    
    let decodedData;
    if (isTokenTransfer) {
      try {
        const tokenInterface = new ethers.Interface([
          'function transfer(address to, uint256 amount) returns (bool)'
        ]);
        decodedData = tokenInterface.decodeFunctionData('transfer', data);
      } catch (error) {
        console.error('Error decoding token transfer data:', error);
      }
    }
    
    return {
      functionSelector,
      decodedData,
      isTokenTransfer,
      isETHTransfer: false,
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
  onTransactionSubmitted(callback: (txIndex: number, to: string, value: string) => void) {
    this.multisigContract.on('TransactionSubmitted', (txIndex, to, value) => {
      callback(Number(txIndex), to, ethers.formatEther(value));
    });
  }

  onTransactionConfirmed(callback: (owner: string, txIndex: number) => void) {
    this.multisigContract.on('TransactionConfirmed', (owner, txIndex) => {
      callback(owner, Number(txIndex));
    });
  }

  onTransactionExecuted(callback: (txIndex: number) => void) {
    this.multisigContract.on('TransactionExecuted', (txIndex) => {
      callback(Number(txIndex));
    });
  }

  // Cleanup
  removeAllListeners() {
    this.multisigContract.removeAllListeners();
  }
}
