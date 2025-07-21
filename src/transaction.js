import { 
  Transaction, 
  SystemProgram, 
  PublicKey, 
  LAMPORTS_PER_SOL,
  TransactionInstruction,
  sendAndConfirmTransaction,
  VersionedTransaction,
  MessageV0,
  AddressLookupTableAccount
} from '@solana/web3.js';
import { SolanaToolkitError } from './core.js';

class TransactionManager {
  constructor(connectionManager, logger) {
    this.connectionManager = connectionManager;
    this.logger = logger;
  }

  async sendTransaction(senderAccount, receiverAccount, amount, options = {}) {
    try {
      const {
        memo = '',
        computeUnits = 200000,
        priorityFee = 0,
        skipPreflight = false
      } = options;

      if (amount <= 0) {
        throw new SolanaToolkitError(
          'Transaction amount must be greater than 0',
          'INVALID_AMOUNT',
          { amount }
        );
      }

      const transaction = new Transaction();
      
      if (memo) {
        transaction.add(
          new TransactionInstruction({
            keys: [],
            programId: new PublicKey('MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr'),
            data: Buffer.from(memo, 'utf8')
          })
        );
      }

      transaction.add(
        SystemProgram.transfer({
          fromPubkey: senderAccount.publicKey,
          toPubkey: new PublicKey(receiverAccount),
          lamports: amount
        })
      );

      return await this.executeTransaction(transaction, [senderAccount], {
        computeUnits,
        priorityFee,
        skipPreflight
      });
    } catch (error) {
      throw new SolanaToolkitError(
        `Failed to send transaction: ${error.message}`,
        'TRANSACTION_SEND_ERROR',
        { sender: senderAccount.publicKey.toString(), receiver: receiverAccount, amount, error: error.message }
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

        this.logger.info('Transaction executed successfully', {
          signature: signature.toString(),
          slot: confirmation.context.slot
        });

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

  async getTransactionDetails(signature) {
    try {
      return await this.connectionManager.executeWithRetry(async (connection) => {
        const transaction = await connection.getTransaction(signature, {
          maxSupportedTransactionVersion: 0,
          commitment: 'confirmed'
        });

        if (!transaction) {
          throw new SolanaToolkitError(
            'Transaction not found',
            'TRANSACTION_NOT_FOUND',
            { signature }
          );
        }

        return {
          signature: signature,
          slot: transaction.slot,
          blockTime: transaction.blockTime,
          fee: transaction.meta?.fee || 0,
          status: transaction.meta?.err ? 'failed' : 'success',
          error: transaction.meta?.err,
          accounts: transaction.transaction.message.accountKeys.map(key => key.toString()),
          instructions: transaction.transaction.message.instructions.map(ix => ({
            programId: transaction.transaction.message.accountKeys[ix.programIdIndex].toString(),
            accounts: ix.accounts.map(acc => transaction.transaction.message.accountKeys[acc].toString()),
            data: ix.data
          }))
        };
      });
    } catch (error) {
      if (error instanceof SolanaToolkitError) {
        throw error;
      }
      throw new SolanaToolkitError(
        `Failed to get transaction details: ${error.message}`,
        'TRANSACTION_DETAILS_ERROR',
        { signature, error: error.message }
      );
    }
  }

  async simulateTransaction(transaction, signers, options = {}) {
    try {
      const { skipPreflight = false } = options;

      return await this.connectionManager.executeWithRetry(async (connection) => {
        const latestBlockhash = await connection.getLatestBlockhash();
        transaction.recentBlockhash = latestBlockhash.blockhash;
        transaction.sign(...signers);

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
        `Failed to simulate transaction: ${error.message}`,
        'TRANSACTION_SIMULATION_ERROR',
        { error: error.message }
      );
    }
  }

  async getRecentTransactions(publicKey, limit = 20) {
    try {
      const pubKey = new PublicKey(publicKey);

      return await this.connectionManager.executeWithRetry(async (connection) => {
        const signatures = await connection.getSignaturesForAddress(pubKey, { limit });

        const transactions = await Promise.all(
          signatures.map(async (sig) => {
            try {
              const tx = await connection.getTransaction(sig.signature, {
                maxSupportedTransactionVersion: 0
              });

              return {
                signature: sig.signature.toString(),
                slot: sig.slot,
                blockTime: sig.blockTime,
                err: sig.err,
                memo: sig.memo,
                fee: tx?.meta?.fee || 0,
                status: tx?.meta?.err ? 'failed' : 'success'
              };
            } catch (error) {
              return {
                signature: sig.signature.toString(),
                slot: sig.slot,
                blockTime: sig.blockTime,
                err: sig.err,
                memo: sig.memo,
                error: error.message
              };
            }
          })
        );

        return transactions;
      });
    } catch (error) {
      throw new SolanaToolkitError(
        `Failed to get recent transactions: ${error.message}`,
        'RECENT_TRANSACTIONS_ERROR',
        { publicKey, limit, error: error.message }
      );
    }
  }

  async estimateTransactionFee(transaction, signers) {
    try {
      return await this.connectionManager.executeWithRetry(async (connection) => {
        const latestBlockhash = await connection.getLatestBlockhash();
        transaction.recentBlockhash = latestBlockhash.blockhash;
        transaction.sign(...signers);

        const fee = await connection.getFeeForMessage(transaction.message, latestBlockhash.blockhash);
        
        return {
          fee: fee.value,
          sol: fee.value / LAMPORTS_PER_SOL,
          formatted: `${(fee.value / LAMPORTS_PER_SOL).toFixed(9)} SOL`
        };
      });
    } catch (error) {
      throw new SolanaToolkitError(
        `Failed to estimate transaction fee: ${error.message}`,
        'FEE_ESTIMATION_ERROR',
        { error: error.message }
      );
    }
  }

  async createTokenTransferTransaction(
    senderAccount,
    receiverPublicKey,
    amount,
    tokenProgramId,
    options = {}
  ) {
    try {
      const {
        memo = '',
        computeUnits = 200000,
        priorityFee = 0
      } = options;

      const transaction = new Transaction();

      if (memo) {
        transaction.add(
          new TransactionInstruction({
            keys: [],
            programId: new PublicKey('MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr'),
            data: Buffer.from(memo, 'utf8')
          })
        );
      }

      transaction.add(
        new TransactionInstruction({
          keys: [
            { pubkey: senderAccount.publicKey, isSigner: true, isWritable: true },
            { pubkey: new PublicKey(receiverPublicKey), isSigner: false, isWritable: true },
            { pubkey: SystemProgram.programId, isSigner: false, isWritable: false }
          ],
          programId: new PublicKey(tokenProgramId),
          data: Buffer.from([2, ...new Uint8Array(new Uint64Array([amount]).buffer)])
        })
      );

      return await this.executeTransaction(transaction, [senderAccount], {
        computeUnits,
        priorityFee
      });
    } catch (error) {
      throw new SolanaToolkitError(
        `Failed to create token transfer transaction: ${error.message}`,
        'TOKEN_TRANSFER_ERROR',
        { sender: senderAccount.publicKey.toString(), receiver: receiverPublicKey, amount, error: error.message }
      );
    }
  }

  async batchTransactions(transactions, signers, options = {}) {
    try {
      const { maxRetries = 3 } = options;

      const results = [];
      for (let i = 0; i < transactions.length; i++) {
        try {
          const result = await this.executeTransaction(transactions[i], signers, { maxRetries });
          results.push({ index: i, success: true, result });
        } catch (error) {
          results.push({ index: i, success: false, error: error.message });
        }
      }

      return {
        total: transactions.length,
        successful: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length,
        results
      };
    } catch (error) {
      throw new SolanaToolkitError(
        `Failed to batch transactions: ${error.message}`,
        'BATCH_TRANSACTIONS_ERROR',
        { error: error.message }
      );
    }
  }
}

export { TransactionManager };
