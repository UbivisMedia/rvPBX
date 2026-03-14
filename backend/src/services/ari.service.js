import AriClient from 'ari-client';
import { config } from '../core/config.js';
import { logger } from '../core/logger.js';

class AriService {
  constructor() {
    this.client = null;
    this.connected = false;
  }

  async init() {
    if (!config.asterisk.enabled) {
      logger.info('ARI disabled by configuration');
      return;
    }

    try {
      this.client = await AriClient.connect(
        config.asterisk.ariUrl,
        config.asterisk.ariUser,
        config.asterisk.ariPass
      );
      this.connected = true;
      logger.info('ARI connected');
    } catch (error) {
      this.connected = false;
      logger.warn('ARI connection failed', { error: error.message });
    }
  }

  getStatus() {
    return {
      enabled: config.asterisk.enabled,
      connected: this.connected,
      url: config.asterisk.ariUrl
    };
  }
}

export const ariService = new AriService();
