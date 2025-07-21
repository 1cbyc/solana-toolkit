# Solana Toolkit - Usage Guide

## 🚀 Quick Start

### Installation
```bash
npm install solana-toolkit
```

### Basic Usage
```javascript
import SolanaToolkit from 'solana-toolkit';

// Initialize the toolkit
const toolkit = new SolanaToolkit('https://api.devnet.solana.com', {
  enableLogging: true,
  commitment: 'confirmed'
});
```

## 📚 Complete Usage Examples

### 1. Account Management

```javascript
// Create a new account
const account = toolkit.account.createAccount();
console.log('Public Key:', account.publicKey.toString());
console.log('Secret Key Length:', account.secretKey.length);

// Restore account from secret key
const restoredAccount = toolkit.account.restoreAccount(account.secretKeyBase58);

// Get account balance
const balance = await toolkit.account.getAccountBalance(account.publicKey);
console.log('Balance:', balance.formatted);

// Request airdrop (devnet only)
const airdrop = await toolkit.account.requestAirdrop(account.publicKey, 1000000000);
console.log('Airdrop result:', airdrop.signature);
```

### 2. Utility Functions

```javascript
// SOL/Lamports conversion
const sol = toolkit.utils.lamportsToSol(1000000000);
console.log(sol.formatted); // "1.000000000 SOL"

const lamports = toolkit.utils.solToLamports(1.5);
console.log(lamports.formatted); // "1500000000 lamports"

// Base58 encoding/decoding
const encoded = toolkit.utils.encodeBase58('Hello World');
console.log(encoded.encoded); // Base58 encoded string

const decoded = toolkit.utils.decodeBase58(encoded.encoded);
console.log(decoded.decodedString); // "Hello World"

// Base64 encoding/decoding
const base64Encoded = toolkit.utils.encodeBase64('Test Data');
const base64Decoded = toolkit.utils.decodeBase64(base64Encoded.encoded);

// Mnemonic generation
const mnemonic = toolkit.utils.generateMnemonic(12);
console.log('Mnemonic:', mnemonic.mnemonic);
console.log('Words:', mnemonic.words);

// Random keypair generation
const keypair = toolkit.utils.generateRandomKeypair();
console.log('Public Key:', keypair.publicKey);
console.log('Secret Key:', keypair.secretKeyBase58);

// Data hashing
const hash = toolkit.utils.hashData('test data', 'sha256');
console.log('Hash:', hash.hash);

// Random bytes
const randomBytes = toolkit.utils.generateRandomBytes(32);
console.log('Random bytes:', randomBytes.bytes);

// Number formatting
const formatted = toolkit.utils.formatNumber(1234567.89, 2);
console.log(formatted.formatted); // "1,234,567.89"

// Currency formatting
const currency = toolkit.utils.formatCurrency(1234.56, 'USD');
console.log(currency.formatted); // "$1,234.56"

// Validation
const isValidPublicKey = toolkit.utils.validatePublicKey(account.publicKey.toString());
const isValidSecretKey = toolkit.utils.validateSecretKey(account.secretKeyBase58);
```

### 3. Transaction Management

```javascript
// Send SOL transaction
const transaction = await toolkit.transaction.sendSolTransaction(
  fromAccount,
  toPublicKey,
  1000000000, // 1 SOL in lamports
  'Payment for services'
);

// Get transaction details
const txDetails = await toolkit.transaction.getTransactionDetails(transaction.signature);

// Simulate transaction
const simulation = await toolkit.transaction.simulateTransaction(transaction);

// Estimate fees
const fees = await toolkit.transaction.estimateFees(transaction);
```

### 4. Token Operations

```javascript
// Create token mint
const mint = await toolkit.token.createTokenMint(
  payerAccount,
  mintAuthority,
  decimals
);

// Create associated token account
const tokenAccount = await toolkit.token.createAssociatedTokenAccount(
  payerAccount,
  ownerPublicKey,
  mintPublicKey
);

// Transfer tokens
const tokenTransfer = await toolkit.token.transferTokens(
  fromAccount,
  toTokenAccount,
  mintPublicKey,
  amount
);

// Mint tokens
const mintTokens = await toolkit.token.mintTokens(
  mintAuthority,
  mintPublicKey,
  tokenAccount,
  amount
);

// Burn tokens
const burnTokens = await toolkit.token.burnTokens(
  ownerAccount,
  tokenAccount,
  mintPublicKey,
  amount
);
```

### 5. Smart Contract Operations

```javascript
// Deploy program
const program = await toolkit.contract.deployProgram(
  payerAccount,
  programBuffer,
  'My Program'
);

// Call program
const result = await toolkit.contract.callProgram(
  payerAccount,
  programId,
  instructionData
);

// Get program account info
const accountInfo = await toolkit.contract.getProgramAccountInfo(
  programId,
  accountPublicKey
);

// Simulate program call
const simulation = await toolkit.contract.simulateProgramCall(
  programId,
  instructionData
);
```

### 6. Configuration Management

```javascript
// Get current configuration
const config = toolkit.getConfig();
console.log('Networks:', config.networks);
console.log('Commitment:', config.defaultCommitment);

// Update configuration
toolkit.setConfig({
  commitment: 'finalized',
  maxRetries: 5,
  enableLogging: true,
  timeout: 60000
});

// Switch networks
toolkit.switchNetwork('https://api.mainnet-beta.solana.com', 'confirmed');

// Check network health
const health = toolkit.getHealthStatus();
console.log('Network healthy:', health.isHealthy);
```

### 7. Error Handling

```javascript
try {
  const result = await toolkit.account.getAccountBalance(invalidPublicKey);
} catch (error) {
  if (error.name === 'SolanaToolkitError') {
    console.log('Error code:', error.code);
    console.log('Error message:', error.message);
    console.log('Error context:', error.context);
  }
}
```

## 🔧 Advanced Usage

### Custom Error Handling
```javascript
import { SolanaToolkitError } from 'solana-toolkit';

class CustomErrorHandler {
  static handle(error) {
    if (error instanceof SolanaToolkitError) {
      switch (error.code) {
        case 'CONNECTION_INIT_ERROR':
          console.error('Connection failed:', error.message);
          break;
        case 'INSUFFICIENT_FUNDS':
          console.error('Insufficient funds for transaction');
          break;
        default:
          console.error('Toolkit error:', error.message);
      }
    }
  }
}
```

### Batch Operations
```javascript
// Batch account info retrieval
const publicKeys = [account1.publicKey, account2.publicKey, account3.publicKey];
const accountsInfo = await toolkit.account.getBatchAccountInfo(publicKeys);

// Batch transaction processing
const transactions = [tx1, tx2, tx3];
const results = await toolkit.transaction.batchTransactions(transactions);
```

### Network Monitoring
```javascript
// Monitor network health
setInterval(async () => {
  const health = toolkit.getHealthStatus();
  if (!health.isHealthy) {
    console.warn('Network health check failed');
  }
}, 30000);
```

## 📦 Available Networks

```javascript
// Built-in network endpoints
const networks = {
  mainnet: 'https://api.mainnet-beta.solana.com',
  testnet: 'https://api.testnet.solana.com',
  devnet: 'https://api.devnet.solana.com',
  localnet: 'http://localhost:8899'
};

// Use custom endpoint
const toolkit = new SolanaToolkit('https://your-custom-rpc.com');
```

## 🛠️ Development

### Building from Source
```bash
git clone https://github.com/1cbyc/solana-toolkit.git
cd solana-toolkit
npm install
npm run build
```

### Running Tests
```bash
npm test
npm run test:coverage
```

### Linting
```bash
npm run lint
npm run lint:fix
```

## 📖 API Reference

For detailed API documentation, see the `docs/explanation.md` file or run:
```bash
npm run docs
```

## 🚨 Important Notes

1. **Security**: Never expose secret keys in client-side code
2. **Network Selection**: Use appropriate networks for development vs production
3. **Error Handling**: Always implement proper error handling for production use
4. **Rate Limiting**: Be mindful of RPC rate limits when making multiple requests
5. **Transaction Fees**: Account for transaction fees in your calculations

## 🆘 Support

- **Documentation**: See `docs/explanation.md` for technical details
- **Roadmap**: See `docs/whats-next.md` for upcoming features
- **Issues**: Report bugs on GitHub
- **Contributing**: See CONTRIBUTING.md for development guidelines

---

**The Solana Toolkit is production-ready and suitable for real-world blockchain applications!** 