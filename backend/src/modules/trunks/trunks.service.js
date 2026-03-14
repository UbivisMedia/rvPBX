import { db, logActivity } from '../../services/db.service.js';
import { writePjsipManagedConfig } from '../../services/pjsip-writer.js';
import { reloadPjsip } from '../../services/reload.service.js';
import { asteriskService } from '../../services/asterisk.service.js';
import { telemetryService } from '../../services/telemetry.service.js';
import { emitSocket } from '../../services/socket.service.js';

function touchConfig(label, payload = null) {
  const configPath = writePjsipManagedConfig();
  return reloadPjsip().then((reloadResult) => {
    logActivity('trunks.config_sync', label, {
      ...payload,
      configPath,
      reloadResult
    });

    return { configPath, reloadResult };
  });
}

export function listTrunks() {
  return db.prepare('SELECT * FROM trunks ORDER BY id ASC').all();
}

export function getTrunkById(id) {
  const trunk = db.prepare('SELECT * FROM trunks WHERE id = ?').get(id);

  if (!trunk) {
    throw Object.assign(new Error('Trunk not found'), { statusCode: 404 });
  }

  return trunk;
}

export async function createTrunk(payload) {
  const stmt = db.prepare(`
    INSERT INTO trunks (name, host, username, password, transport, context, register_enabled, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
  `);

  const result = stmt.run(
    payload.name,
    payload.host,
    payload.username,
    payload.password,
    payload.transport,
    payload.context,
    payload.registerEnabled ? 1 : 0
  );

  const trunk = getTrunkById(result.lastInsertRowid);
  const sync = await touchConfig('Trunk created', { trunkId: trunk.id });
  return { trunk, sync };
}

export async function updateTrunk(id, payload) {
  const existing = getTrunkById(id);
  const merged = {
    name: payload.name ?? existing.name,
    host: payload.host ?? existing.host,
    username: payload.username ?? existing.username,
    password: payload.password ?? existing.password,
    transport: payload.transport ?? existing.transport,
    context: payload.context ?? existing.context,
    registerEnabled:
      payload.registerEnabled === undefined ? Boolean(existing.register_enabled) : payload.registerEnabled
  };

  db.prepare(`
    UPDATE trunks
    SET name = ?,
        host = ?,
        username = ?,
        password = ?,
        transport = ?,
        context = ?,
        register_enabled = ?,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(
    merged.name,
    merged.host,
    merged.username,
    merged.password,
    merged.transport,
    merged.context,
    merged.registerEnabled ? 1 : 0,
    id
  );

  const trunk = getTrunkById(id);
  const sync = await touchConfig('Trunk updated', { trunkId: trunk.id });
  return { trunk, sync };
}

export async function deleteTrunk(id) {
  getTrunkById(id);
  db.prepare('DELETE FROM trunks WHERE id = ?').run(id);
  const sync = await touchConfig('Trunk deleted', { trunkId: id });
  return sync;
}

export async function testTrunk(id) {
  const trunk = getTrunkById(id);
  emitSocket('trunk-test-update', {
    trunkId: id,
    trunkName: trunk.name,
    stage: 'start',
    message: `Trunk ${trunk.name} wird getestet`,
    at: new Date().toISOString()
  });

  let result;
  try {
    emitSocket('trunk-test-update', {
      trunkId: id,
      trunkName: trunk.name,
      stage: 'command',
      message: `AMI Command: pjsip show endpoint trunk-${trunk.name}-endpoint`,
      at: new Date().toISOString()
    });
    result = await asteriskService.command(`pjsip show endpoint trunk-${trunk.name}-endpoint`);
    db.prepare('UPDATE trunks SET status = ?, last_tested_at = CURRENT_TIMESTAMP WHERE id = ?').run(
      'tested',
      id
    );
    telemetryService.setTrunkStatus(trunk.name, 'registered', { reason: 'test-ok' });
  } catch (_error) {
    result = {
      response: 'AMI unavailable, test simulated',
      endpoint: `trunk-${trunk.name}`
    };
    db.prepare('UPDATE trunks SET status = ?, last_tested_at = CURRENT_TIMESTAMP WHERE id = ?').run(
      'simulated',
      id
    );
    telemetryService.setTrunkStatus(trunk.name, 'offline', { reason: 'test-fallback' });
  }

  logActivity('trunks.test', 'Trunk test executed', {
    trunkId: id,
    trunkName: trunk.name
  });

  emitSocket('trunk-test-update', {
    trunkId: id,
    trunkName: trunk.name,
    stage: 'done',
    message: 'Trunk-Test abgeschlossen',
    result,
    at: new Date().toISOString()
  });

  return {
    trunkId: id,
    trunkName: trunk.name,
    result
  };
}

export async function trunkStatus(id) {
  const trunk = getTrunkById(id);

  let liveStatus = trunk.status;
  if (asteriskService.getStatus().connected) {
    try {
      const result = await asteriskService.command(`pjsip show endpoint trunk-${trunk.name}-endpoint`);
      const text = JSON.stringify(result).toLowerCase();
      liveStatus = text.includes('avail') ? 'registered' : 'unknown';
      db.prepare('UPDATE trunks SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(
        liveStatus,
        id
      );
      telemetryService.setTrunkStatus(trunk.name, liveStatus, { source: 'ami' });
    } catch (_error) {
      liveStatus = trunk.status || 'unknown';
    }
  }

  return {
    id: trunk.id,
    name: trunk.name,
    status: liveStatus,
    lastTestedAt: trunk.last_tested_at,
    updatedAt: trunk.updated_at
  };
}
