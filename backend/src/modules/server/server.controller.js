import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';

const execAsync = promisify(exec);
import { config } from '../../core/config.js';
import { cdrSummary, db, listAlerts, logActivity } from '../../services/db.service.js';
import { createBackup, listBackups, rollbackBackup } from '../../services/backup.service.js';
import { reloadAll, restartAsterisk } from '../../services/reload.service.js';
import { buildHealthSnapshot } from '../../services/health.service.js';
import { logger } from '../../core/logger.js';
import { restartSchema, rollbackSchema, logsQuerySchema } from './server.validator.js';
import { telemetryService } from '../../services/telemetry.service.js';
import { asteriskService } from '../../services/asterisk.service.js';

export async function status(req, res, next) {
  try {
    const appStatus = buildHealthSnapshot();
    const memory = process.memoryUsage();
    const cdr = cdrSummary(7);
    const alerts = listAlerts({ status: 'open', limit: 50 });
    let asteriskVersion = 'unavailable';

    try {
      const versionResult = await asteriskService.command('core show version');
      asteriskVersion = JSON.stringify(versionResult);
    } catch (_error) {
      asteriskVersion = 'AMI unavailable';
    }

    res.json({
      success: true,
      message: 'Server status loaded',
      data: {
        ...appStatus,
        system: {
          hostname: os.hostname(),
          platform: os.platform(),
          arch: os.arch(),
          loadAvg: os.loadavg(),
          totalMem: os.totalmem(),
          freeMem: os.freemem()
        },
        node: {
          memory,
          uptimeSec: Math.round(process.uptime())
        },
        monitoring: {
          realtime: telemetryService.getRealtimeMetrics(),
          cdr,
          alerts
        },
        asterisk: {
          versionRaw: asteriskVersion
        }
      }
    });
  } catch (error) {
    next(error);
  }
}

export async function reload(req, res, next) {
  try {
    const backup = createBackup();
    const result = await reloadAll();
    logActivity('server.reload', 'Soft reload executed', { backup, result, by: req.user?.username });

    res.json({
      success: true,
      message: 'Reload executed',
      data: { backup, result }
    });
  } catch (error) {
    next(error);
  }
}

export async function restart(req, res, next) {
  try {
    const { error } = restartSchema.validate(req.body || {});
    if (error) {
      throw Object.assign(new Error(error.message), { statusCode: 400 });
    }

    const backup = createBackup();
    const result = await restartAsterisk();
    logActivity('server.restart', 'Asterisk restart executed', {
      backup,
      result,
      by: req.user?.username
    });

    res.json({
      success: true,
      message: 'Asterisk restart initiated',
      data: { backup, result }
    });
  } catch (error) {
    next(error);
  }
}

export function apiRestart(req, res) {
  res.json({
    success: true,
    message: 'API restart queued'
  });

  // Defer restart so the response is flushed before the process is replaced.
  setTimeout(() => {
    execAsync(`pm2 restart ${config.pm2ProcessName}`)
      .then(({ stdout }) => {
        logger.info('PM2 restart executed', { stdout });
        logActivity('server.api_restart', 'PM2 restart executed', {
          processName: config.pm2ProcessName,
          by: req.user?.username
        });
      })
      .catch((error) => {
        logger.error('PM2 restart failed', { error: error.message, processName: config.pm2ProcessName });
      });
  }, 500);
}

export function backups(req, res, next) {
  try {
    const entries = listBackups();
    res.json({ success: true, message: 'Backups loaded', data: entries });
  } catch (error) {
    next(error);
  }
}

export async function rollback(req, res, next) {
  try {
    const { value, error } = rollbackSchema.validate(req.body);
    if (error) {
      throw Object.assign(new Error(error.message), { statusCode: 400 });
    }

    const restore = rollbackBackup(value.backupName);
    const reloaded = await reloadAll();

    logActivity('server.rollback', 'Backup restored', {
      backupName: value.backupName,
      restored: restore.restored,
      by: req.user?.username
    });

    res.json({
      success: true,
      message: 'Rollback completed',
      data: {
        restore,
        reloaded
      }
    });
  } catch (error) {
    next(error);
  }
}

export function logs(req, res, next) {
  try {
    const { value, error } = logsQuerySchema.validate(req.query);
    if (error) {
      throw Object.assign(new Error(error.message), { statusCode: 400 });
    }

    const logFile =
      value.source === 'error' ? path.join(config.paths.logDir, 'error.log') : config.asterisk.fullLogFile;
    if (!fs.existsSync(logFile)) {
      res.json({ success: true, message: 'No logs yet', data: { lines: [] } });
      return;
    }

    const text = fs.readFileSync(logFile, 'utf8');
    const lines = text.split(/\r?\n/).filter(Boolean);
    const sliced = lines.slice(-value.lines);

    res.json({
      success: true,
      message: 'Logs loaded',
      data: { lines: sliced, source: value.source }
    });
  } catch (error) {
    next(error);
  }
}

export function activity(req, res, next) {
  try {
    const rows = db
      .prepare('SELECT id, type, message, payload_json, created_at FROM activity_logs ORDER BY id DESC LIMIT 100')
      .all()
      .map((row) => ({
        ...row,
        payload: row.payload_json ? JSON.parse(row.payload_json) : null
      }));

    res.json({ success: true, message: 'Activity loaded', data: rows });
  } catch (error) {
    next(error);
  }
}
