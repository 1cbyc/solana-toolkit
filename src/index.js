import { ConnectionManager, Configuration, Logger, SolanaToolkitError } from './core.js';
import { AccountManager } from './account.js';
import { TransactionManager } from './transaction.js';
import { TokenManager } from './token.js';
import { ContractManager } from './contract.js';
import { UtilsManager } from './utils.js';

class SolanaToolkit {
  constructor(endpoint, options = {}) {
    this.config = new Configuration();
    this.logger = new Logger(options.enableLogging || false);
    this.connectionManager = new ConnectionManager(endpoint, options.commitment || 'confirmed');
    
    this.account = new AccountManager(this.connectionManager, this.logger);
    this.transaction = new TransactionManager(this.connectionManager, this.logger);
    this.token = new TokenManager(this.connectionManager, this.logger);
    this.contract = new ContractManager(this.connectionManager, this.logger);
    this.utils = new UtilsManager(this.logger);
    
    this.logger.info('Solana Toolkit initialized', { endpoint });
  }

  switchNetwork(endpoint, commitment = 'confirmed') {
    this.connectionManager.switchNetwork(endpoint, commitment);
    this.logger.info('Network switched', { endpoint, commitment });
  }

  getHealthStatus() {
    return this.connectionManager.getHealthStatus();
  }

  getConfig() {
    return this.config.getConfig();
  }

  setConfig(options) {
    if (options.commitment) {
      this.config.setCommitment(options.commitment);
    }
    if (options.maxRetries !== undefined) {
      this.config.setRetryConfig(options.maxRetries, options.retryDelay || 1000);
    }
    if (options.timeout !== undefined) {
      this.config.setTimeout(options.timeout);
    }
    if (options.enableLogging !== undefined) {
      this.config.enableLogging(options.enableLogging);
      this.logger.enabled = options.enableLogging;
    }
  }
}

export default SolanaToolkit;
export { 
  SolanaToolkitError,
  ConnectionManager,
  Configuration,
  Logger,
  AccountManager,
  TransactionManager,
  TokenManager,
  ContractManager,
  UtilsManager
};
