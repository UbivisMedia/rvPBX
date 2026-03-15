import { asteriskService } from '../../services/asterisk.service.js';
import { logActivity } from '../../services/db.service.js';
import { logger } from '../../core/logger.js';

/**
 * Parse the text output of `module show` or `module show like <keyword>`.
 *
 * Typical output:
 *   Module                         Description                    Use Count  Status      Support Level
 *   app_dial.so                    Dialing Application            0          Running         core
 *   ...
 *   N modules loaded
 */
function parseModuleList(rawOutput) {
  const text = typeof rawOutput === 'string' ? rawOutput : JSON.stringify(rawOutput);
  const lines = text.split(/\r?\n/).filter(Boolean);
  const modules = [];

  for (const line of lines) {
    // Skip header and summary lines
    if (/^Module\s+Description/i.test(line) || /^\d+ module/i.test(line)) {
      continue;
    }

    // Expect at least 4 space-separated tokens
    const parts = line.trim().split(/\s{2,}/);
    if (parts.length < 4) {
      continue;
    }

    modules.push({
      name: parts[0].trim(),
      description: parts[1].trim(),
      useCount: Number(parts[2].trim()) || 0,
      status: parts[3].trim(),
      supportLevel: parts[4]?.trim() ?? ''
    });
  }

  return modules;
}

export async function listAsteriskModules(filter = '') {
  const command = filter ? `module show like ${filter}` : 'module show';

  if (!asteriskService.getStatus().connected) {
    return { connected: false, modules: [], raw: 'AMI not connected' };
  }

  try {
    const result = await asteriskService.command(command);
    const raw = typeof result === 'string' ? result : JSON.stringify(result);
    const modules = parseModuleList(raw);
    return { connected: true, modules, raw };
  } catch (err) {
    logger.warn('Failed to list Asterisk modules', { error: err.message });
    return { connected: false, modules: [], raw: err.message };
  }
}

export async function reloadAsteriskModule(name) {
  if (!asteriskService.getStatus().connected) {
    return { ok: false, name, message: 'AMI not connected' };
  }

  try {
    const result = await asteriskService.action({
      action: 'ModuleLoad',
      module: name,
      loadtype: 'reload'
    });

    logActivity('asterisk-modules.reload', `Module reloaded: ${name}`, { name, result });
    logger.info('Asterisk module reloaded', { name });

    return { ok: true, name, result };
  } catch (err) {
    logger.warn('Failed to reload Asterisk module', { name, error: err.message });
    return { ok: false, name, message: err.message };
  }
}

export async function loadAsteriskModule(name) {
  if (!asteriskService.getStatus().connected) {
    return { ok: false, name, message: 'AMI not connected' };
  }

  try {
    const result = await asteriskService.action({
      action: 'ModuleLoad',
      module: name,
      loadtype: 'load'
    });

    logActivity('asterisk-modules.load', `Module loaded: ${name}`, { name, result });
    logger.info('Asterisk module loaded', { name });

    return { ok: true, name, result };
  } catch (err) {
    logger.warn('Failed to load Asterisk module', { name, error: err.message });
    return { ok: false, name, message: err.message };
  }
}

export async function unloadAsteriskModule(name) {
  if (!asteriskService.getStatus().connected) {
    return { ok: false, name, message: 'AMI not connected' };
  }

  try {
    const result = await asteriskService.action({
      action: 'ModuleLoad',
      module: name,
      loadtype: 'unload'
    });

    logActivity('asterisk-modules.unload', `Module unloaded: ${name}`, { name, result });
    logger.info('Asterisk module unloaded', { name });

    return { ok: true, name, result };
  } catch (err) {
    logger.warn('Failed to unload Asterisk module', { name, error: err.message });
    return { ok: false, name, message: err.message };
  }
}
