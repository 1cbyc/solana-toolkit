import SolanaToolkit from '../src/index.js';

async function basicExample() {
  try {
    const toolkit = new SolanaToolkit('https://api.devnet.solana.com', {
      enableLogging: true,
      commitment: 'confirmed'
    });

    console.log('Solana Toolkit initialized successfully!');

    const account = toolkit.account.createAccount();
    console.log('New account created:', account.publicKey.toString());

    const balance = await toolkit.account.getAccountBalance(account.publicKey);
    console.log('Account balance:', balance.formatted);

    const sol = toolkit.utils.lamportsToSol(1000000000);
    console.log('1 billion lamports =', sol.formatted);

    const lamports = toolkit.utils.solToLamports(1.5);
    console.log('1.5 SOL =', lamports.formatted);

    const mnemonic = toolkit.utils.generateMnemonic(12);
    console.log('Generated mnemonic:', mnemonic.mnemonic);

    const encoded = toolkit.utils.encodeBase58('Hello Solana!');
    console.log('Base58 encoded:', encoded.encoded);

    const decoded = toolkit.utils.decodeBase58(encoded.encoded);
    console.log('Base58 decoded:', decoded.decodedString);

    console.log('All basic operations completed successfully!');
  } catch (error) {
    console.error('Error:', error.message);
  }
}

basicExample(); 