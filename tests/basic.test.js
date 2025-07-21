import { UtilsManager } from '../src/utils.js';

describe('UtilsManager', () => {
  let utils;

  beforeEach(() => {
    utils = new UtilsManager({ info: () => {} });
  });

  test('should convert lamports to SOL', () => {
    const result = utils.lamportsToSol(1000000000);
    expect(result.lamports).toBe(1000000000);
    expect(result.sol).toBe(1);
    expect(result.formatted).toBe('1.000000000 SOL');
  });

  test('should convert SOL to lamports', () => {
    const result = utils.solToLamports(1.5);
    expect(result.sol).toBe(1.5);
    expect(result.lamports).toBe(1500000000);
    expect(result.formatted).toBe('1500000000 lamports');
  });

  test('should encode to Base58', () => {
    const result = utils.encodeBase58('Hello World');
    expect(result.encoded).toBeDefined();
    expect(result.length).toBeGreaterThan(0);
  });

  test('should decode from Base58', () => {
    const encoded = utils.encodeBase58('Hello World');
    const decoded = utils.decodeBase58(encoded.encoded);
    expect(decoded.decodedString).toBe('Hello World');
  });

  test('should generate mnemonic', () => {
    const mnemonic = utils.generateMnemonic(12);
    expect(mnemonic.mnemonic).toBeDefined();
    expect(mnemonic.words).toHaveLength(12);
  });
}); 