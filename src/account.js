import { Keypair, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { SolanaToolkitError } from './core.js';
import bs58 from 'bs58';
import nacl from 'tweetnacl';

class AccountManager {
  constructor(connectionManager, logger) {
    this.connectionManager = connectionManager;
    this.logger = logger;
  }

  createAccount() {
    try {
      const keypair = Keypair.generate();
      this.logger.info('New account created', {
        publicKey: keypair.publicKey.toString(),
        secretKeyLength: keypair.secretKey.length
      });
      return keypair;
    } catch (error) {
      throw new SolanaToolkitError(
        `Failed to create account: ${error.message}`,
        'ACCOUNT_CREATION_ERROR',
        { error: error.message }
      );
    }
  }

  createAccountFromSecretKey(secretKey) {
    try {
      let decodedKey;
      
      if (typeof secretKey === 'string') {
        if (secretKey.startsWith('[') && secretKey.endsWith(']')) {
          decodedKey = JSON.parse(secretKey);
        } else {
          decodedKey = bs58.decode(secretKey);
        }
      } else if (Array.isArray(secretKey)) {
        decodedKey = new Uint8Array(secretKey);
      } else if (secretKey instanceof Uint8Array) {
        decodedKey = secretKey;
      } else {
        throw new Error('Invalid secret key format');
      }

      if (decodedKey.length !== 64) {
        throw new Error('Secret key must be 64 bytes');
      }

      const keypair = Keypair.fromSecretKey(decodedKey);
      this.logger.info('Account restored from secret key', {
        publicKey: keypair.publicKey.toString()
      });
      return keypair;
    } catch (error) {
      throw new SolanaToolkitError(
        `Failed to create account from secret key: ${error.message}`,
        'ACCOUNT_RESTORE_ERROR',
        { error: error.message }
      );
    }
  }

  async getAccountInfo(publicKey) {
    try {
      const pubKey = new PublicKey(publicKey);
      
      return await this.connectionManager.executeWithRetry(async (connection) => {
        const accountInfo = await connection.getAccountInfo(pubKey);
        
        if (!accountInfo) {
          throw new SolanaToolkitError(
            'Account not found',
            'ACCOUNT_NOT_FOUND',
            { publicKey: pubKey.toString() }
          );
        }
        
        return {
          lamports: accountInfo.lamports,
          owner: accountInfo.owner.toString(),
          executable: accountInfo.executable,
          rentEpoch: accountInfo.rentEpoch,
          data: accountInfo.data
        };
      });
    } catch (error) {
      if (error instanceof SolanaToolkitError) {
        throw error;
      }
      throw new SolanaToolkitError(
        `Failed to get account info: ${error.message}`,
        'ACCOUNT_INFO_ERROR',
        { publicKey, error: error.message }
      );
    }
  }

  async getAccountBalance(publicKey) {
    try {
      const pubKey = new PublicKey(publicKey);
      
      return await this.connectionManager.executeWithRetry(async (connection) => {
        const balance = await connection.getBalance(pubKey);
        return {
          lamports: balance,
          sol: balance / LAMPORTS_PER_SOL,
          formatted: `${(balance / LAMPORTS_PER_SOL).toFixed(9)} SOL`
        };
      });
    } catch (error) {
      throw new SolanaToolkitError(
        `Failed to get account balance: ${error.message}`,
        'BALANCE_ERROR',
        { publicKey, error: error.message }
      );
    }
  }

  async requestAirdrop(publicKey, amount = LAMPORTS_PER_SOL) {
    try {
      const pubKey = new PublicKey(publicKey);
      
      if (amount > 2 * LAMPORTS_PER_SOL) {
        throw new SolanaToolkitError(
          'Airdrop amount exceeds maximum allowed',
          'AIRDROP_LIMIT_EXCEEDED',
          { amount, maxAllowed: 2 * LAMPORTS_PER_SOL }
        );
      }
      
      return await this.connectionManager.executeWithRetry(async (connection) => {
        const signature = await connection.requestAirdrop(pubKey, amount);
        await connection.confirmTransaction(signature);
        
        this.logger.info('Airdrop completed', {
          publicKey: pubKey.toString(),
          amount,
          signature: signature.toString()
        });
        
        return {
          signature: signature.toString(),
          amount,
          sol: amount / LAMPORTS_PER_SOL
        };
      });
    } catch (error) {
      throw new SolanaToolkitError(
        `Failed to request airdrop: ${error.message}`,
        'AIRDROP_ERROR',
        { publicKey, amount, error: error.message }
      );
    }
  }

  async getMultipleAccountInfo(publicKeys) {
    try {
      if (!Array.isArray(publicKeys) || publicKeys.length === 0) {
        throw new Error('Public keys must be a non-empty array');
      }
      
      const pubKeys = publicKeys.map(key => new PublicKey(key));
      
      return await this.connectionManager.executeWithRetry(async (connection) => {
        const accountInfos = await connection.getMultipleAccountsInfo(pubKeys);
        
        return accountInfos.map((info, index) => ({
          publicKey: pubKeys[index].toString(),
          accountInfo: info ? {
            lamports: info.lamports,
            owner: info.owner.toString(),
            executable: info.executable,
            rentEpoch: info.rentEpoch,
            data: info.data
          } : null
        }));
      });
    } catch (error) {
      throw new SolanaToolkitError(
        `Failed to get multiple account info: ${error.message}`,
        'MULTIPLE_ACCOUNT_INFO_ERROR',
        { publicKeys, error: error.message }
      );
    }
  }

  async getAccountHistory(publicKey, limit = 100) {
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
                err: sig.err,
                memo: sig.memo,
                blockTime: sig.blockTime,
                transaction: tx
              };
            } catch (error) {
              return {
                signature: sig.signature.toString(),
                slot: sig.slot,
                err: sig.err,
                memo: sig.memo,
                blockTime: sig.blockTime,
                transaction: null,
                error: error.message
              };
            }
          })
        );
        
        return transactions;
      });
    } catch (error) {
      throw new SolanaToolkitError(
        `Failed to get account history: ${error.message}`,
        'ACCOUNT_HISTORY_ERROR',
        { publicKey, limit, error: error.message }
      );
    }
  }

  validatePublicKey(publicKey) {
    try {
      new PublicKey(publicKey);
      return true;
    } catch (error) {
      return false;
    }
  }

  async getTokenAccounts(publicKey) {
    try {
      const pubKey = new PublicKey(publicKey);
      
      return await this.connectionManager.executeWithRetry(async (connection) => {
        const tokenAccounts = await connection.getParsedTokenAccountsByOwner(pubKey, {
          programId: new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA')
        });
        
        return tokenAccounts.value.map(account => ({
          pubkey: account.pubkey.toString(),
          mint: account.account.data.parsed.info.mint,
          owner: account.account.data.parsed.info.owner,
          amount: account.account.data.parsed.info.tokenAmount.uiAmount,
          decimals: account.account.data.parsed.info.tokenAmount.decimals
        }));
      });
    } catch (error) {
      throw new SolanaToolkitError(
        `Failed to get token accounts: ${error.message}`,
        'TOKEN_ACCOUNTS_ERROR',
        { publicKey, error: error.message }
      );
    }
  }

  async getMinimumBalanceForRentExemption(dataLength) {
    try {
      return await this.connectionManager.executeWithRetry(async (connection) => {
        return await connection.getMinimumBalanceForRentExemption(dataLength);
      });
    } catch (error) {
      throw new SolanaToolkitError(
        `Failed to get minimum balance for rent exemption: ${error.message}`,
        'RENT_EXEMPTION_ERROR',
        { dataLength, error: error.message }
      );
    }
  }
}

export { AccountManager };
