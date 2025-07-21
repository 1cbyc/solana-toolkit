import { Connection, clusterApiUrl } from '@solana/web3.js';

class SolanaToolkitError extends Error {
  constructor(message, code, context = {}) {
    super(message);
    this.name = 'SolanaToolkitError';
    this.code = code;
    this.context = context;
    this.timestamp = new Date().toISOString();
  }
}

class ConnectionManager {
  constructor(endpoint, commitment = 'confirmed') {
    this.endpoint = endpoint;
    this.commitment = commitment;
    this.connection = null;
    this.retryAttempts = 3;
    this.retryDelay = 1000;
    this.healthCheckInterval = 30000;
    this.isHealthy = true;
    this.lastHealthCheck = Date.now();
    this.initializeConnection();
  }

  initializeConnection() {
    try {
      this.connection = new Connection(this.endpoint, {
        commitment: this.commitment,
        confirmTransactionInitialTimeout: 60000,
        disableRetryOnRateLimit: false,
        httpHeaders: {
          'User-Agent': 'SolanaToolkit/2.0.0'
        }
      });
      this.startHealthCheck();
    } catch (error) {
      throw new SolanaToolkitError(
        `Failed to initialize connection: ${error.message}`,
        'CONNECTION_INIT_ERROR',
        { endpoint: this.endpoint, error: error.message }
      );
    }
  }

  async startHealthCheck() {
    setInterval(async () => {
      try {
        const startTime = Date.now();
        await this.connection.getSlot();
        const responseTime = Date.now() - startTime;
        
        this.isHealthy = responseTime < 5000;
        this.lastHealthCheck = Date.now();
        
        if (!this.isHealthy) {
          console.warn(`Connection health check failed: ${responseTime}ms response time`);
        }
      } catch (error) {
        this.isHealthy = false;
        console.error('Connection health check failed:', error.message);
      }
    }, this.healthCheckInterval);
  }

  async executeWithRetry(operation, maxRetries = this.retryAttempts) {
    let lastError;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        if (!this.isHealthy) {
          throw new SolanaToolkitError(
            'Connection is unhealthy',
            'UNHEALTHY_CONNECTION',
            { attempt, maxRetries }
          );
        }
        
        return await operation(this.connection);
      } catch (error) {
        lastError = error;
        
        if (attempt === maxRetries) {
          break;
        }
        
        const delay = this.retryDelay * Math.pow(2, attempt - 1);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    throw new SolanaToolkitError(
      `Operation failed after ${maxRetries} attempts: ${lastError.message}`,
      'OPERATION_FAILED',
      { maxRetries, lastError: lastError.message }
    );
  }

  switchNetwork(newEndpoint, newCommitment = this.commitment) {
    this.endpoint = newEndpoint;
    this.commitment = newCommitment;
    this.initializeConnection();
  }

  getConnection() {
    return this.connection;
  }

  getHealthStatus() {
    return {
      isHealthy: this.isHealthy,
      lastHealthCheck: this.lastHealthCheck,
      endpoint: this.endpoint,
      commitment: this.commitment
    };
  }
}

class Configuration {
  constructor() {
    this.networks = {
      mainnet: clusterApiUrl('mainnet-beta'),
      testnet: clusterApiUrl('testnet'),
      devnet: clusterApiUrl('devnet'),
      localnet: 'http://localhost:8899'
    };
    
    this.defaultCommitment = 'confirmed';
    this.maxRetries = 3;
    this.retryDelay = 1000;
    this.timeout = 60000;
    this.loggingEnabled = false;
  }

  setNetwork(networkName) {
    if (!this.networks[networkName]) {
      throw new SolanaToolkitError(
        `Invalid network: ${networkName}`,
        'INVALID_NETWORK',
        { availableNetworks: Object.keys(this.networks) }
      );
    }
    return this.networks[networkName];
  }

  setCustomEndpoint(endpoint) {
    return endpoint;
  }

  setCommitment(commitment) {
    const validCommitments = ['processed', 'confirmed', 'finalized'];
    if (!validCommitments.includes(commitment)) {
      throw new SolanaToolkitError(
        `Invalid commitment: ${commitment}`,
        'INVALID_COMMITMENT',
        { validCommitments }
      );
    }
    this.defaultCommitment = commitment;
  }

  setRetryConfig(maxRetries, retryDelay) {
    this.maxRetries = maxRetries;
    this.retryDelay = retryDelay;
  }

  setTimeout(timeout) {
    this.timeout = timeout;
  }

  enableLogging(enabled = true) {
    this.loggingEnabled = enabled;
  }

  getConfig() {
    return {
      networks: this.networks,
      defaultCommitment: this.defaultCommitment,
      maxRetries: this.maxRetries,
      retryDelay: this.retryDelay,
      timeout: this.timeout,
      enableLogging: this.loggingEnabled
    };
  }
}

class Logger {
  constructor(enabled = false) {
    this.enabled = enabled;
  }

  log(level, message, data = {}) {
    if (!this.enabled) return;
    
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      message,
      data
    };
    
    switch (level) {
      case 'error':
        console.error(`[${timestamp}] ERROR: ${message}`, data);
        break;
      case 'warn':
        console.warn(`[${timestamp}] WARN: ${message}`, data);
        break;
      case 'info':
        console.info(`[${timestamp}] INFO: ${message}`, data);
        break;
      case 'debug':
        console.debug(`[${timestamp}] DEBUG: ${message}`, data);
        break;
      default:
        console.log(`[${timestamp}] ${level.toUpperCase()}: ${message}`, data);
    }
  }

  error(message, data) {
    this.log('error', message, data);
  }

  warn(message, data) {
    this.log('warn', message, data);
  }

  info(message, data) {
    this.log('info', message, data);
  }

  debug(message, data) {
    this.log('debug', message, data);
  }
}

export { ConnectionManager, Configuration, Logger, SolanaToolkitError }; 