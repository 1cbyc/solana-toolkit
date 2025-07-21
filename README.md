# Solana Toolkit

Solana blockchain development toolkit designed for professional applications. This toolkit provides comprehensive utilities for account management, transaction handling, smart contract interactions, token operations, and blockchain utilities.

## Features

- **Advanced Connection Management**: Automatic retry logic, health monitoring, and network switching
- **Comprehensive Account Operations**: Account creation, recovery, balance management, and history tracking
- **Sophisticated Transaction Handling**: Transaction building, signing, simulation, and batch operations
- **Full SPL Token Support**: Token creation, transfers, minting, burning, and metadata management
- **Smart Contract Integration**: Program deployment, interaction, and upgrade capabilities
- **Utility Functions**: Encoding/decoding, validation, formatting, and cryptographic operations
- **Error Handling**: Custom error classes with detailed context and recovery mechanisms
- **Logging System**: Configurable logging for debugging and monitoring
- **Type Safety**: Strong validation and error checking throughout

## Installation

```bash
npm install solana-toolkit
```

## Quick Start

```javascript
import SolanaToolkit from 'solana-toolkit';

const toolkit = new SolanaToolkit('https://api.mainnet-beta.solana.com', {
  enableLogging: true,
  commitment: 'confirmed'
});

// Create a new account
const account = toolkit.account.createAccount();

// Get account balance
const balance = await toolkit.account.getAccountBalance(account.publicKey);

// Send a transaction
const result = await toolkit.transaction.sendTransaction(
  account,
  'destination_public_key',
  1000000
);
```

## Core Modules

### Connection Management

```javascript
// Switch networks
toolkit.switchNetwork('https://api.devnet.solana.com');

// Check connection health
const health = toolkit.getHealthStatus();

// Configure settings
toolkit.setConfig({
  commitment: 'finalized',
  maxRetries: 5,
  timeout: 30000,
  enableLogging: true
});
```

### Account Management

```javascript
// Create new account
const newAccount = toolkit.account.createAccount();

// Restore account from secret key
const restoredAccount = toolkit.account.createAccountFromSecretKey(secretKey);

// Get account information
const accountInfo = await toolkit.account.getAccountInfo(publicKey);

// Get account balance
const balance = await toolkit.account.getAccountBalance(publicKey);

// Request airdrop
const airdrop = await toolkit.account.requestAirdrop(publicKey, 1000000);

// Get account history
const history = await toolkit.account.getAccountHistory(publicKey, 50);

// Get token accounts
const tokenAccounts = await toolkit.account.getTokenAccounts(publicKey);
```

### Transaction Management

```javascript
// Send SOL transaction
const txResult = await toolkit.transaction.sendTransaction(
  senderAccount,
  receiverPublicKey,
  amount,
  {
    memo: 'Payment for services',
    computeUnits: 200000,
    priorityFee: 1000
  }
);

// Get transaction details
const details = await toolkit.transaction.getTransactionDetails(signature);

// Simulate transaction
const simulation = await toolkit.transaction.simulateTransaction(
  transaction,
  signers
);

// Get recent transactions
const recent = await toolkit.transaction.getRecentTransactions(publicKey, 20);

// Estimate transaction fee
const fee = await toolkit.transaction.estimateTransactionFee(transaction, signers);

// Batch transactions
const batchResult = await toolkit.transaction.batchTransactions(
  transactions,
  signers
);
```

### Token Operations

```javascript
// Create token mint
const mint = await toolkit.token.createTokenMint(
  payer,
  mintAuthority,
  freezeAuthority,
  9
);

// Create associated token account
const ata = await toolkit.token.createAssociatedTokenAccount(
  payer,
  owner,
  mint
);

// Transfer tokens
const transfer = await toolkit.token.transferTokens(
  sender,
  sourceTokenAccount,
  destinationTokenAccount,
  amount
);

// Mint tokens
const minted = await toolkit.token.mintTokens(
  mintAuthority,
  mint,
  destinationTokenAccount,
  amount
);

// Burn tokens
const burned = await toolkit.token.burnTokens(
  owner,
  tokenAccount,
  mint,
  amount
);

// Get token account info
const tokenInfo = await toolkit.token.getTokenAccountInfo(tokenAccount);

// Get mint information
const mintInfo = await toolkit.token.getMintInfo(mint);

// Get token balance
const tokenBalance = await toolkit.token.getTokenBalance(tokenAccount);
```

### Smart Contract Operations

```javascript
// Deploy program
const deployment = await toolkit.contract.deployProgram(
  payer,
  programData,
  {
    computeUnits: 400000,
    priorityFee: 0
  }
);

// Call program
const callResult = await toolkit.contract.callProgram(
  payer,
  programId,
  instructionData,
  accounts
);

// Invoke program method
const methodResult = await toolkit.contract.invokeProgramMethod(
  payer,
  programId,
  'methodName',
  { param1: 'value1' },
  accounts
);

// Get program account info
const programInfo = await toolkit.contract.getProgramAccountInfo(programId);

// Get program accounts
const accounts = await toolkit.contract.getProgramAccounts(programId, filters);

// Simulate program call
const simulation = await toolkit.contract.simulateProgramCall(
  payer,
  programId,
  instructionData,
  accounts
);

// Upgrade program
const upgrade = await toolkit.contract.upgradeProgram(
  payer,
  programId,
  newProgramData
);
```

### Utility Functions

```javascript
// Convert lamports to SOL
const sol = toolkit.utils.lamportsToSol(1000000000);

// Convert SOL to lamports
const lamports = toolkit.utils.solToLamports(1.5);

// Generate random keypair
const keypair = toolkit.utils.generateRandomKeypair();

// Encode/Decode Base58
const encoded = toolkit.utils.encodeBase58('Hello World');
const decoded = toolkit.utils.decodeBase58(encoded.encoded);

// Encode/Decode Base64
const base64 = toolkit.utils.encodeBase64('Hello World');
const decoded64 = toolkit.utils.decodeBase64(base64.encoded);

// Validate public key
const isValid = toolkit.utils.validatePublicKey(publicKey);

// Validate secret key
const isValidSecret = toolkit.utils.validateSecretKey(secretKey);

// Generate mnemonic
const mnemonic = toolkit.utils.generateMnemonic(12);

// Format numbers
const formatted = toolkit.utils.formatNumber(1234567.89, 2);

// Format currency
const currency = toolkit.utils.formatCurrency(1234.56, 'USD');

// Generate random bytes
const randomBytes = toolkit.utils.generateRandomBytes(32);

// Hash data
const hash = toolkit.utils.hashData('Hello World', 'sha256');
```

## Error Handling

The toolkit provides comprehensive error handling with custom error classes:

```javascript
try {
  const result = await toolkit.account.getAccountBalance(invalidPublicKey);
} catch (error) {
  if (error instanceof SolanaToolkitError) {
    console.log('Error Code:', error.code);
    console.log('Error Context:', error.context);
    console.log('Timestamp:', error.timestamp);
  }
}
```

## Configuration

```javascript
const toolkit = new SolanaToolkit(endpoint, {
  enableLogging: true,
  commitment: 'confirmed',
  maxRetries: 3,
  retryDelay: 1000,
  timeout: 60000
});
```

## Networks

- **Mainnet**: `https://api.mainnet-beta.solana.com`
- **Testnet**: `https://api.testnet.solana.com`
- **Devnet**: `https://api.devnet.solana.com`
- **Localnet**: `http://localhost:8899`

## Dependencies

- `@solana/web3.js`: Core Solana web3 functionality
- `@solana/spl-token`: SPL token standard support
- `@solana/spl-associated-token-account`: Associated token account utilities
- `bs58`: Base58 encoding/decoding
- `tweetnacl`: Cryptographic operations

## Development

```bash
# Install dependencies
npm install

# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Lint code
npm run lint

# Build
npm run build

# Generate documentation
npm run docs
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass
6. Submit a pull request

## License

MIT License - see LICENSE.md for details

## Support

- GitHub Issues: [https://github.com/1cbyc/solana-toolkit/issues](https://github.com/1cbyc/solana-toolkit/issues)
- Documentation: [https://github.com/1cbyc/solana-toolkit#readme](https://github.com/1cbyc/solana-toolkit#readme)

## Roadmap

See [docs/whats-next.md](docs/whats-next.md) for detailed development roadmap and future features.
