import crypto from 'node:crypto';
import { db } from './db.service.js';
import { asteriskService } from './asterisk.service.js';
import { ariService } from './ari.service.js';
import { telemetryService } from './telemetry.service.js';

export function buildHealthSnapshot() {
  const trunkCount = db.prepare('SELECT COUNT(1) AS count FROM trunks').get().count;
  const endpointCount = db.prepare('SELECT COUNT(1) AS count FROM endpoints').get().count;
  const callgroupCount = db.prepare('SELECT COUNT(1) AS count FROM callgroups').get().count;

  return {
    app: {
      status: 'ok',
      uptimeSec: Math.round(process.uptime()),
      version: process.version,
      pid: process.pid,
      startedAt: new Date(Date.now() - process.uptime() * 1000).toISOString()
    },
    asterisk: {
      ami: asteriskService.getStatus(),
      ari: ariService.getStatus()
    },
    stats: {
      trunks: trunkCount,
      endpoints: endpointCount,
      callgroups: callgroupCount
    },
    realtime: telemetryService.getRealtimeMetrics(),
    traceId: crypto.randomUUID()
  };
}
