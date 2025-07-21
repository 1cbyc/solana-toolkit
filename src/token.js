import { 
  PublicKey, 
  Transaction, 
  TransactionInstruction,
  SystemProgram,
  SYSVAR_RENT_PUBKEY,
  LAMPORTS_PER_SOL
} from '@solana/web3.js';
import { 
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
  createTransferInstruction,
  createMintToInstruction,
  createBurnInstruction,
  getAccount,
  getMint,
  createInitializeMintInstruction,
  createInitializeAccountInstruction,
  MINT_SIZE,
  ACCOUNT_SIZE
} from '@solana/spl-token';
import { SolanaToolkitError } from './core.js';

class TokenManager {
  constructor(connectionManager, logger) {
    this.connectionManager = connectionManager;
    this.logger = logger;
  }

  async createTokenMint(
    payer,
    mintAuthority,
    freezeAuthority = null,
    decimals = 9,
    options = {}
  ) {
    try {
      const {
        computeUnits = 400000,
        priorityFee = 0
      } = options;

      const mint = new PublicKey();
      const transaction = new Transaction();

      const lamports = await this.connectionManager.executeWithRetry(async (connection) => {
        return await connection.getMinimumBalanceForRentExemption(MINT_SIZE);
      });

      transaction.add(
        SystemProgram.createAccount({
          fromPubkey: payer.publicKey,
          newAccountPubkey: mint,
          space: MINT_SIZE,
          lamports,
          programId: TOKEN_PROGRAM_ID
        }),
        createInitializeMintInstruction(
          mint,
          decimals,
          mintAuthority.publicKey,
          freezeAuthority?.publicKey || null,
          TOKEN_PROGRAM_ID
        )
      );

      const result = await this.executeTransaction(transaction, [payer, mintAuthority], {
        computeUnits,
        priorityFee
      });

      this.logger.info('Token mint created', {
        mint: mint.toString(),
        decimals,
        mintAuthority: mintAuthority.publicKey.toString(),
        freezeAuthority: freezeAuthority?.publicKey.toString() || null
      });

      return {
        mint: mint.toString(),
        decimals,
        mintAuthority: mintAuthority.publicKey.toString(),
        freezeAuthority: freezeAuthority?.publicKey.toString() || null,
        signature: result.signature
      };
    } catch (error) {
      throw new SolanaToolkitError(
        `Failed to create token mint: ${error.message}`,
        'TOKEN_MINT_CREATION_ERROR',
        { decimals, error: error.message }
      );
    }
  }

  async createAssociatedTokenAccount(
    payer,
    owner,
    mint,
    options = {}
  ) {
    try {
      const {
        computeUnits = 200000,
        priorityFee = 0
      } = options;

      const associatedTokenAddress = await getAssociatedTokenAddress(
        new PublicKey(mint),
        new PublicKey(owner),
        false,
        TOKEN_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID
      );

      const transaction = new Transaction();
      transaction.add(
        createAssociatedTokenAccountInstruction(
          payer.publicKey,
          associatedTokenAddress,
          new PublicKey(owner),
          new PublicKey(mint),
          TOKEN_PROGRAM_ID,
          ASSOCIATED_TOKEN_PROGRAM_ID
        )
      );

      const result = await this.executeTransaction(transaction, [payer], {
        computeUnits,
        priorityFee
      });

      this.logger.info('Associated token account created', {
        associatedTokenAddress: associatedTokenAddress.toString(),
        owner,
        mint
      });

      return {
        associatedTokenAddress: associatedTokenAddress.toString(),
        owner,
        mint,
        signature: result.signature
      };
    } catch (error) {
      throw new SolanaToolkitError(
        `Failed to create associated token account: ${error.message}`,
        'ASSOCIATED_TOKEN_ACCOUNT_CREATION_ERROR',
        { owner, mint, error: error.message }
      );
    }
  }

  async getOrCreateAssociatedTokenAccount(
    payer,
    owner,
    mint,
    options = {}
  ) {
    try {
      const associatedTokenAddress = await getAssociatedTokenAddress(
        new PublicKey(mint),
        new PublicKey(owner),
        false,
        TOKEN_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID
      );

      const accountInfo = await this.connectionManager.executeWithRetry(async (connection) => {
        return await connection.getAccountInfo(associatedTokenAddress);
      });

      if (accountInfo) {
        return {
          associatedTokenAddress: associatedTokenAddress.toString(),
          exists: true
        };
      }

      const result = await this.createAssociatedTokenAccount(payer, owner, mint, options);
      return {
        ...result,
        exists: false
      };
    } catch (error) {
      throw new SolanaToolkitError(
        `Failed to get or create associated token account: ${error.message}`,
        'ASSOCIATED_TOKEN_ACCOUNT_ERROR',
        { owner, mint, error: error.message }
      );
    }
  }

  async transferTokens(
    sender,
    sourceTokenAccount,
    destinationTokenAccount,
    amount,
    options = {}
  ) {
    try {
      const {
        computeUnits = 200000,
        priorityFee = 0
      } = options;

      const transaction = new Transaction();
      transaction.add(
        createTransferInstruction(
          new PublicKey(sourceTokenAccount),
          new PublicKey(destinationTokenAccount),
          sender.publicKey,
          amount,
          [],
          TOKEN_PROGRAM_ID
        )
      );

      const result = await this.executeTransaction(transaction, [sender], {
        computeUnits,
        priorityFee
      });

      this.logger.info('Token transfer completed', {
        source: sourceTokenAccount,
        destination: destinationTokenAccount,
        amount,
        signature: result.signature
      });

      return {
        signature: result.signature,
        amount,
        source: sourceTokenAccount,
        destination: destinationTokenAccount
      };
    } catch (error) {
      throw new SolanaToolkitError(
        `Failed to transfer tokens: ${error.message}`,
        'TOKEN_TRANSFER_ERROR',
        { source: sourceTokenAccount, destination: destinationTokenAccount, amount, error: error.message }
      );
    }
  }

  async mintTokens(
    mintAuthority,
    mint,
    destinationTokenAccount,
    amount,
    options = {}
  ) {
    try {
      const {
        computeUnits = 200000,
        priorityFee = 0
      } = options;

      const transaction = new Transaction();
      transaction.add(
        createMintToInstruction(
          new PublicKey(mint),
          new PublicKey(destinationTokenAccount),
          mintAuthority.publicKey,
          amount,
          [],
          TOKEN_PROGRAM_ID
        )
      );

      const result = await this.executeTransaction(transaction, [mintAuthority], {
        computeUnits,
        priorityFee
      });

      this.logger.info('Tokens minted', {
        mint,
        destination: destinationTokenAccount,
        amount,
        signature: result.signature
      });

      return {
        signature: result.signature,
        amount,
        mint,
        destination: destinationTokenAccount
      };
    } catch (error) {
      throw new SolanaToolkitError(
        `Failed to mint tokens: ${error.message}`,
        'TOKEN_MINT_ERROR',
        { mint, destination: destinationTokenAccount, amount, error: error.message }
      );
    }
  }

  async burnTokens(
    owner,
    tokenAccount,
    mint,
    amount,
    options = {}
  ) {
    try {
      const {
        computeUnits = 200000,
        priorityFee = 0
      } = options;

      const transaction = new Transaction();
      transaction.add(
        createBurnInstruction(
          new PublicKey(tokenAccount),
          new PublicKey(mint),
          owner.publicKey,
          amount,
          [],
          TOKEN_PROGRAM_ID
        )
      );

      const result = await this.executeTransaction(transaction, [owner], {
        computeUnits,
        priorityFee
      });

      this.logger.info('Tokens burned', {
        tokenAccount,
        mint,
        amount,
        signature: result.signature
      });

      return {
        signature: result.signature,
        amount,
        tokenAccount,
        mint
      };
    } catch (error) {
      throw new SolanaToolkitError(
        `Failed to burn tokens: ${error.message}`,
        'TOKEN_BURN_ERROR',
        { tokenAccount, mint, amount, error: error.message }
      );
    }
  }

  async getTokenAccountInfo(tokenAccount) {
    try {
      return await this.connectionManager.executeWithRetry(async (connection) => {
        const accountInfo = await getAccount(connection, new PublicKey(tokenAccount));
        
        return {
          mint: accountInfo.mint.toString(),
          owner: accountInfo.owner.toString(),
          amount: accountInfo.amount.toString(),
          delegate: accountInfo.delegate?.toString() || null,
          state: accountInfo.state,
          isNative: accountInfo.isNative,
          delegatedAmount: accountInfo.delegatedAmount.toString(),
          closeAuthority: accountInfo.closeAuthority?.toString() || null
        };
      });
    } catch (error) {
      throw new SolanaToolkitError(
        `Failed to get token account info: ${error.message}`,
        'TOKEN_ACCOUNT_INFO_ERROR',
        { tokenAccount, error: error.message }
      );
    }
  }

  async getMintInfo(mint) {
    try {
      return await this.connectionManager.executeWithRetry(async (connection) => {
        const mintInfo = await getMint(connection, new PublicKey(mint));
        
        return {
          mint: mintInfo.address.toString(),
          decimals: mintInfo.decimals,
          supply: mintInfo.supply.toString(),
          isInitialized: mintInfo.isInitialized,
          freezeAuthority: mintInfo.freezeAuthority?.toString() || null,
          mintAuthority: mintInfo.mintAuthority?.toString() || null
        };
      });
    } catch (error) {
      throw new SolanaToolkitError(
        `Failed to get mint info: ${error.message}`,
        'MINT_INFO_ERROR',
        { mint, error: error.message }
      );
    }
  }

  async getTokenBalance(tokenAccount) {
    try {
      return await this.connectionManager.executeWithRetry(async (connection) => {
        const accountInfo = await getAccount(connection, new PublicKey(tokenAccount));
        const mintInfo = await getMint(connection, accountInfo.mint);
        
        const rawAmount = Number(accountInfo.amount);
        const decimals = mintInfo.decimals;
        const amount = rawAmount / Math.pow(10, decimals);
        
        return {
          rawAmount: rawAmount.toString(),
          amount,
          decimals,
          mint: accountInfo.mint.toString()
        };
      });
    } catch (error) {
      throw new SolanaToolkitError(
        `Failed to get token balance: ${error.message}`,
        'TOKEN_BALANCE_ERROR',
        { tokenAccount, error: error.message }
      );
    }
  }

  async getTokenAccountsByOwner(owner) {
    try {
      return await this.connectionManager.executeWithRetry(async (connection) => {
        const tokenAccounts = await connection.getParsedTokenAccountsByOwner(
          new PublicKey(owner),
          { programId: TOKEN_PROGRAM_ID }
        );

        return tokenAccounts.value.map(account => ({
          pubkey: account.pubkey.toString(),
          mint: account.account.data.parsed.info.mint,
          owner: account.account.data.parsed.info.owner,
          amount: account.account.data.parsed.info.tokenAmount.uiAmount,
          decimals: account.account.data.parsed.info.tokenAmount.decimals,
          state: account.account.data.parsed.info.state
        }));
      });
    } catch (error) {
      throw new SolanaToolkitError(
        `Failed to get token accounts by owner: ${error.message}`,
        'TOKEN_ACCOUNTS_BY_OWNER_ERROR',
        { owner, error: error.message }
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

export { TokenManager }; 