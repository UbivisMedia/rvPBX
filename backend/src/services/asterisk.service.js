import { EventEmitter } from 'node:events';
import { createRequire } from 'node:module';
import { config } from '../core/config.js';
import { logger } from '../core/logger.js';

const require = createRequire(import.meta.url);

let AsteriskManager;
try {
  AsteriskManager = require('asterisk-manager');
} catch (error) {
  logger.warn('asterisk-manager package unavailable, AMI will stay disabled', {
    error: error.message
  });
}

class AsteriskService extends EventEmitter {
  constructor() {
    super();

    this.client = null;
    this.connected = false;
    this.connecting = false;
    this.retryCount = 0;
    this.retryTimer = null;
  }

  getStatus() {
    return {
      enabled: config.asterisk.enabled,
      connected: this.connected,
      host: config.asterisk.host,
      port: config.asterisk.amiPort,
      retryCount: this.retryCount
    };
  }

  async init() {
    if (!config.asterisk.enabled) {
      logger.info('AMI disabled by configuration');
      return;
    }

    if (!AsteriskManager) {
      logger.warn('AMI disabled because asterisk-manager is missing');
      return;
    }

    await this.connect();
  }

  async connect() {
    if (this.connecting || this.connected) {
      return;
    }

    this.connecting = true;

    try {
      this.client = new AsteriskManager(
        config.asterisk.amiPort,
        config.asterisk.host,
        config.asterisk.amiUser,
        config.asterisk.amiPass,
        true
      );

      if (typeof this.client.keepConnected === 'function') {
        this.client.keepConnected();
      }

      this.client.on('managerevent', (event) => {
        this.emit('event', event);
      });

      this.client.on('connect', () => {
        this.connected = true;
        this.connecting = false;
        this.retryCount = 0;
        logger.info('AMI connected');
        this.emit('connected');
      });

      this.client.on('disconnect', () => {
        if (!this.connected && !this.connecting) {
          return;
        }

        this.connected = false;
        this.connecting = false;
        logger.warn('AMI disconnected');
        this.emit('disconnected');
        this.scheduleReconnect();
      });

      this.client.on('error', (error) => {
        this.connected = false;
        this.connecting = false;
        logger.error('AMI error', { error: error.message });
        this.emit('error', error);
        this.scheduleReconnect();
      });

      // Trigger first command to validate authentication.
      await this.command('core show version');
      this.connected = true;
      this.connecting = false;
      this.retryCount = 0;
      this.emit('connected');
    } catch (error) {
      this.connected = false;
      this.connecting = false;
      logger.warn('AMI connection failed', { error: error.message });
      this.scheduleReconnect();
    }
  }

  scheduleReconnect() {
    if (!config.asterisk.enabled || this.retryTimer) {
      return;
    }

    const baseDelay = 1000;
    const maxDelay = 30000;
    const delay = Math.min(baseDelay * 2 ** this.retryCount, maxDelay);
    this.retryCount += 1;

    this.retryTimer = setTimeout(() => {
      this.retryTimer = null;
      this.connect().catch((error) => {
        logger.error('AMI reconnect failed', { error: error.message });
      });
    }, delay);

    logger.info('AMI reconnect scheduled', { delayMs: delay, retryCount: this.retryCount });
  }

  action(payload) {
    return new Promise((resolve, reject) => {
      if (!this.client || !this.connected) {
        reject(new Error('AMI not connected'));
        return;
      }

      this.client.action(payload, (error, response) => {
        if (error) {
          reject(error);
          return;
        }

        resolve(response);
      });
    });
  }

  async command(command) {
    if (!config.asterisk.enabled) {
      return { response: 'AMI disabled', command };
    }

    return this.action({ action: 'Command', command });
  }
}

export const asteriskService = new AsteriskService();
