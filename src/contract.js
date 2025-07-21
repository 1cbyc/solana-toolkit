import { 
  Transaction, 
  TransactionInstruction,
  PublicKey,
  SystemProgram,
  LAMPORTS_PER_SOL
} from '@solana/web3.js';
import { SolanaToolkitError } from './core.js';

class ContractManager {
  constructor(connectionManager, logger) {
    this.connectionManager = connectionManager;
    this.logger = logger;
  }

  async deployProgram(
    payer,
    programData,
    options = {}
  ) {
    try {
      const {
        computeUnits = 400000,
        priorityFee = 0,
        programId = null
      } = options;

      const programKeypair = programId ? new PublicKey(programId) : new PublicKey();
      const transaction = new Transaction();

      const lamports = await this.connectionManager.executeWithRetry(async (connection) => {
        return await connection.getMinimumBalanceForRentExemption(programData.length);
      });

      if (!programId) {
        transaction.add(
          SystemProgram.createAccount({
            fromPubkey: payer.publicKey,
            newAccountPubkey: programKeypair,
            lamports,
            space: programData.length,
            programId: programKeypair
          })
        );
      }

      transaction.add(
        new TransactionInstruction({
          keys: [],
          programId: programKeypair,
          data: programData
        })
      );

      const result = await this.executeTransaction(transaction, [payer], {
        computeUnits,
        priorityFee
      });

      this.logger.info('Program deployed', {
        programId: programKeypair.toString(),
        dataSize: programData.length,
        signature: result.signature
      });

      return {
        programId: programKeypair.toString(),
        signature: result.signature,
        dataSize: programData.length
      };
    } catch (error) {
      throw new SolanaToolkitError(
        `Failed to deploy program: ${error.message}`,
        'PROGRAM_DEPLOYMENT_ERROR',
        { dataSize: programData.length, error: error.message }
      );
    }
  }

  async callProgram(
    payer,
    programId,
    instructionData,
    accounts = [],
    options = {}
  ) {
    try {
      const {
        computeUnits = 200000,
        priorityFee = 0
      } = options;

      const transaction = new Transaction();
      transaction.add(
        new TransactionInstruction({
          keys: accounts.map(acc => ({
            pubkey: new PublicKey(acc.pubkey),
            isSigner: acc.isSigner || false,
            isWritable: acc.isWritable || false
          })),
          programId: new PublicKey(programId),
          data: Buffer.from(instructionData)
        })
      );

      const result = await this.executeTransaction(transaction, [payer], {
        computeUnits,
        priorityFee
      });

      this.logger.info('Program called', {
        programId,
        signature: result.signature,
        accountsCount: accounts.length
      });

      return {
        signature: result.signature,
        programId,
        accountsCount: accounts.length
      };
    } catch (error) {
      throw new SolanaToolkitError(
        `Failed to call program: ${error.message}`,
        'PROGRAM_CALL_ERROR',
        { programId, error: error.message }
      );
    }
  }

  async invokeProgramMethod(
    payer,
    programId,
    methodName,
    methodArguments = {},
    accounts = [],
    options = {}
  ) {
    try {
      const instructionData = this.serializeMethodCall(methodName, methodArguments);
      
      return await this.callProgram(payer, programId, instructionData, accounts, options);
    } catch (error) {
      throw new SolanaToolkitError(
        `Failed to invoke program method: ${error.message}`,
        'PROGRAM_METHOD_INVOCATION_ERROR',
        { programId, methodName, error: error.message }
      );
    }
  }

  async getProgramAccountInfo(programId) {
    try {
      return await this.connectionManager.executeWithRetry(async (connection) => {
        const programKey = new PublicKey(programId);
        const accountInfo = await connection.getAccountInfo(programKey);
        
        if (!accountInfo) {
          throw new SolanaToolkitError(
            'Program account not found',
            'PROGRAM_ACCOUNT_NOT_FOUND',
            { programId }
          );
        }
        
        return {
          programId,
          lamports: accountInfo.lamports,
          owner: accountInfo.owner.toString(),
          executable: accountInfo.executable,
          rentEpoch: accountInfo.rentEpoch,
          dataSize: accountInfo.data.length
        };
      });
    } catch (error) {
      if (error instanceof SolanaToolkitError) {
        throw error;
      }
      throw new SolanaToolkitError(
        `Failed to get program account info: ${error.message}`,
        'PROGRAM_ACCOUNT_INFO_ERROR',
        { programId, error: error.message }
      );
    }
  }

  async getProgramAccounts(
    programId,
    filters = [],
    options = {}
  ) {
    try {
      const {
        encoding = 'base64',
        commitment = 'confirmed',
        dataSlice = null
      } = options;

      return await this.connectionManager.executeWithRetry(async (connection) => {
        const accounts = await connection.getProgramAccounts(
          new PublicKey(programId),
          {
            filters,
            encoding,
            commitment,
            dataSlice
          }
        );

        return accounts.map(account => ({
          pubkey: account.pubkey.toString(),
          account: {
            lamports: account.account.lamports,
            owner: account.account.owner.toString(),
            executable: account.account.executable,
            rentEpoch: account.account.rentEpoch,
            data: account.account.data
          }
        }));
      });
    } catch (error) {
      throw new SolanaToolkitError(
        `Failed to get program accounts: ${error.message}`,
        'PROGRAM_ACCOUNTS_ERROR',
        { programId, error: error.message }
      );
    }
  }

  async deployProgramWithInstructions(
    payer,
    programInstructions,
    options = {}
  ) {
    try {
      const {
        computeUnits = 400000,
        priorityFee = 0
      } = options;

      const transaction = new Transaction();
      
      programInstructions.forEach(instruction => {
        if (instruction instanceof TransactionInstruction) {
          transaction.add(instruction);
        } else {
          transaction.add(
            new TransactionInstruction({
              keys: instruction.keys || [],
              programId: new PublicKey(instruction.programId),
              data: Buffer.from(instruction.data || [])
            })
          );
        }
      });

      const result = await this.executeTransaction(transaction, [payer], {
        computeUnits,
        priorityFee
      });

      this.logger.info('Program deployed with instructions', {
        instructionsCount: programInstructions.length,
        signature: result.signature
      });

      return {
        signature: result.signature,
        instructionsCount: programInstructions.length
      };
    } catch (error) {
      throw new SolanaToolkitError(
        `Failed to deploy program with instructions: ${error.message}`,
        'PROGRAM_INSTRUCTIONS_DEPLOYMENT_ERROR',
        { instructionsCount: programInstructions.length, error: error.message }
      );
    }
  }

  async simulateProgramCall(
    payer,
    programId,
    instructionData,
    accounts = [],
    options = {}
  ) {
    try {
      const { skipPreflight = false } = options;

      const transaction = new Transaction();
      transaction.add(
        new TransactionInstruction({
          keys: accounts.map(acc => ({
            pubkey: new PublicKey(acc.pubkey),
            isSigner: acc.isSigner || false,
            isWritable: acc.isWritable || false
          })),
          programId: new PublicKey(programId),
          data: Buffer.from(instructionData)
        })
      );

      return await this.connectionManager.executeWithRetry(async (connection) => {
        const latestBlockhash = await connection.getLatestBlockhash();
        transaction.recentBlockhash = latestBlockhash.blockhash;
        transaction.sign(payer);

        const simulation = await connection.simulateTransaction(transaction, {
          sigVerify: false,
          commitment: 'confirmed',
          replaceRecentBlockhash: true,
          accounts: {
            encoding: 'base64',
            addresses: transaction.message.accountKeys.map(key => key.toString())
          }
        });

        return {
          err: simulation.value.err,
          logs: simulation.value.logs,
          unitsConsumed: simulation.value.unitsConsumed,
          accounts: simulation.value.accounts
        };
      });
    } catch (error) {
      throw new SolanaToolkitError(
        `Failed to simulate program call: ${error.message}`,
        'PROGRAM_SIMULATION_ERROR',
        { programId, error: error.message }
      );
    }
  }

  async upgradeProgram(
    payer,
    programId,
    newProgramData,
    options = {}
  ) {
    try {
      const {
        computeUnits = 400000,
        priorityFee = 0
      } = options;

      const transaction = new Transaction();
      transaction.add(
        new TransactionInstruction({
          keys: [
            { pubkey: new PublicKey(programId), isSigner: false, isWritable: true },
            { pubkey: payer.publicKey, isSigner: true, isWritable: true },
            { pubkey: SystemProgram.programId, isSigner: false, isWritable: false }
          ],
          programId: new PublicKey('BPFLoaderUpgradeab1e11111111111111111111111'),
          data: Buffer.from([2, ...new Uint8Array(newProgramData)])
        })
      );

      const result = await this.executeTransaction(transaction, [payer], {
        computeUnits,
        priorityFee
      });

      this.logger.info('Program upgraded', {
        programId,
        newDataSize: newProgramData.length,
        signature: result.signature
      });

      return {
        programId,
        signature: result.signature,
        newDataSize: newProgramData.length
      };
    } catch (error) {
      throw new SolanaToolkitError(
        `Failed to upgrade program: ${error.message}`,
        'PROGRAM_UPGRADE_ERROR',
        { programId, error: error.message }
      );
    }
  }

  serializeMethodCall(methodName, methodArguments) {
    try {
      const methodData = {
        method: methodName,
        args: methodArguments,
        timestamp: Date.now()
      };
      
      return Buffer.from(JSON.stringify(methodData), 'utf8');
    } catch (error) {
      throw new SolanaToolkitError(
        `Failed to serialize method call: ${error.message}`,
        'METHOD_SERIALIZATION_ERROR',
        { methodName, error: error.message }
      );
    }
  }

  async executeTransaction(transaction, signers, options = {}) {
    try {
      const {
        computeUnits = 200000,
        priorityFee = 0,
        skipPreflight = false,
        maxRetries = 3
      } = options;

      return await this.connectionManager.executeWithRetry(async (connection) => {
        const latestBlockhash = await connection.getLatestBlockhash();
        transaction.recentBlockhash = latestBlockhash.blockhash;
        transaction.lastValidBlockHeight = latestBlockhash.lastValidBlockHeight;

        if (computeUnits !== 200000) {
          transaction.add(
            new TransactionInstruction({
              keys: [],
              programId: new PublicKey('ComputeBudget111111111111111111111111111111'),
              data: Buffer.from([0, ...new Uint8Array(new Uint32Array([computeUnits]).buffer)])
            })
          );
        }

        if (priorityFee > 0) {
          transaction.add(
            new TransactionInstruction({
              keys: [],
              programId: new PublicKey('ComputeBudget111111111111111111111111111111'),
              data: Buffer.from([3, ...new Uint8Array(new Uint32Array([priorityFee]).buffer)])
            })
          );
        }

        transaction.sign(...signers);

        const signature = await connection.sendTransaction(transaction, {
          skipPreflight,
          maxRetries,
          preflightCommitment: 'confirmed'
        });

        const confirmation = await connection.confirmTransaction({
          signature,
          blockhash: latestBlockhash.blockhash,
          lastValidBlockHeight: latestBlockhash.lastValidBlockHeight
        });

        if (confirmation.value.err) {
          throw new Error(`Transaction failed: ${JSON.stringify(confirmation.value.err)}`);
        }

        return {
          signature: signature.toString(),
          slot: confirmation.context.slot,
          confirmation: confirmation.value
        };
      });
    } catch (error) {
      throw new SolanaToolkitError(
        `Failed to execute transaction: ${error.message}`,
        'TRANSACTION_EXECUTION_ERROR',
        { error: error.message }
      );
    }
  }
}

export { ContractManager };
