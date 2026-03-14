import { asteriskService } from './asterisk.service.js';
import { logger } from '../core/logger.js';

async function executeWithFallback(command, fallbackMessage) {
  try {
    const result = await asteriskService.command(command);
    return {
      ok: true,
      command,
      result
    };
  } catch (error) {
    logger.warn('AMI command fallback activated', {
      command,
      error: error.message
    });

    return {
      ok: false,
      command,
      result: fallbackMessage,
      error: error.message
    };
  }
}

export async function reloadPjsip() {
  return executeWithFallback('pjsip reload', 'AMI unavailable; simulated pjsip reload');
}

export async function reloadDialplan() {
  return executeWithFallback('dialplan reload', 'AMI unavailable; simulated dialplan reload');
}

export async function reloadAll() {
  const [pjsip, dialplan] = await Promise.all([reloadPjsip(), reloadDialplan()]);
  return { pjsip, dialplan };
}

export async function restartAsterisk() {
  return executeWithFallback('core restart now', 'AMI unavailable; simulated restart');
}
