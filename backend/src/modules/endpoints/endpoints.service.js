import { db, logActivity } from '../../services/db.service.js';
import { writePjsipManagedConfig } from '../../services/pjsip-writer.js';
import { writeDialplanManagedConfig } from '../../services/dialplan-writer.js';
import { reloadAll } from '../../services/reload.service.js';
import { asteriskService } from '../../services/asterisk.service.js';
import { telemetryService } from '../../services/telemetry.service.js';
import { config } from '../../core/config.js';
import { logger } from '../../core/logger.js';
import { randomUUID } from 'node:crypto';

function normalizeCodecs(codecs) {
  if (Array.isArray(codecs)) {
    return codecs.join(',');
  }

  return String(codecs || 'ulaw,alaw');
}

async function syncConfig(activity, payload = null) {
  const pjsipPath = writePjsipManagedConfig();
  const dialplanPath = writeDialplanManagedConfig();
  const reload = await reloadAll();

  logActivity('endpoints.config_sync', activity, {
    ...payload,
    pjsipPath,
    dialplanPath,
    reload
  });

  return { pjsipPath, dialplanPath, reload };
}

export function listEndpoints() {
  return db
    .prepare('SELECT * FROM endpoints ORDER BY extension ASC')
    .all()
    .map((endpoint) => ({
      ...endpoint,
      provisioning_url: `${config.provisioningBaseUrl}/${endpoint.provisioning_key || endpoint.extension}`
    }));
}

export function getEndpoint(id) {
  const endpoint = db.prepare('SELECT * FROM endpoints WHERE id = ?').get(id);

  if (!endpoint) {
    throw Object.assign(new Error('Endpoint not found'), { statusCode: 404 });
  }

  return {
    ...endpoint,
    provisioning_url: `${config.provisioningBaseUrl}/${endpoint.provisioning_key || endpoint.extension}`
  };
}

export async function createEndpoint(payload) {
  const provisioningKey = randomUUID();
  const result = db.prepare(`
    INSERT INTO endpoints (
      extension,
      display_name,
      username,
      password,
      codecs,
      context,
      template,
      provisioning_key,
      voicemail_enabled,
      voicemail_box,
      updated_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
  `).run(
    payload.extension,
    payload.displayName,
    payload.username,
    payload.password,
    normalizeCodecs(payload.codecs),
    payload.context,
    payload.template,
    provisioningKey,
    payload.voicemailEnabled ? 1 : 0,
    payload.voicemailBox
  );

  const endpoint = getEndpoint(result.lastInsertRowid);
  telemetryService.setEndpointStatus(endpoint.extension, endpoint.status || 'unknown', { source: 'db' });
  const sync = await syncConfig('Endpoint created', { endpointId: endpoint.id });
  return { endpoint, sync };
}

export async function updateEndpoint(id, payload) {
  const current = getEndpoint(id);
  const merged = {
    extension: payload.extension ?? current.extension,
    displayName: payload.displayName ?? current.display_name,
    username: payload.username ?? current.username,
    password: payload.password ?? current.password,
    codecs: normalizeCodecs(payload.codecs ?? current.codecs),
    context: payload.context ?? current.context,
    template: payload.template ?? current.template,
    provisioningKey: current.provisioning_key ?? randomUUID(),
    voicemailEnabled:
      payload.voicemailEnabled === undefined ? Boolean(current.voicemail_enabled) : payload.voicemailEnabled,
    voicemailBox: payload.voicemailBox === undefined ? current.voicemail_box : payload.voicemailBox
  };

  db.prepare(`
    UPDATE endpoints
    SET extension = ?,
        display_name = ?,
        username = ?,
        password = ?,
        codecs = ?,
        context = ?,
        template = ?,
        provisioning_key = ?,
        voicemail_enabled = ?,
        voicemail_box = ?,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(
    merged.extension,
    merged.displayName,
    merged.username,
    merged.password,
    merged.codecs,
    merged.context,
    merged.template,
    merged.provisioningKey,
    merged.voicemailEnabled ? 1 : 0,
    merged.voicemailBox,
    id
  );

  const endpoint = getEndpoint(id);
  telemetryService.setEndpointStatus(endpoint.extension, endpoint.status || 'unknown', { source: 'db' });
  const sync = await syncConfig('Endpoint updated', { endpointId: id });
  return { endpoint, sync };
}

export async function deleteEndpoint(id) {
  const endpoint = getEndpoint(id);

  const groups = db.prepare('SELECT id, name, members_json FROM callgroups').all();
  const usedBy = groups.filter((group) => {
    const members = JSON.parse(group.members_json || '[]');
    return members.includes(endpoint.extension);
  });

  if (usedBy.length > 0) {
    throw Object.assign(
      new Error(`Endpoint is part of callgroups: ${usedBy.map((group) => group.name).join(', ')}`),
      { statusCode: 409 }
    );
  }

  db.prepare('DELETE FROM endpoints WHERE id = ?').run(id);
  const sync = await syncConfig('Endpoint deleted', { endpointId: id });
  return sync;
}

export async function importEndpointsCsv(rows) {
  const results = [];

  for (const row of rows) {
    try {
      const created = await createEndpoint(row);
      results.push({
        extension: row.extension,
        success: true,
        endpointId: created.endpoint.id
      });
    } catch (error) {
      results.push({
        extension: row.extension,
        success: false,
        error: error.message
      });
    }
  }

  return {
    total: rows.length,
    success: results.filter((entry) => entry.success).length,
    failed: results.filter((entry) => !entry.success).length,
    results
  };
}

export async function endpointStatus(id) {
  const endpoint = getEndpoint(id);

  let status = endpoint.status || 'unknown';
  let details = 'No live AMI data';

  if (asteriskService.getStatus().connected) {
    try {
      const response = await asteriskService.command(
        `pjsip show endpoint ext-${endpoint.extension}-endpoint`
      );
      const text = JSON.stringify(response).toLowerCase();
      status = text.includes('avail') ? 'registered' : 'unknown';
      details = response;
      db.prepare('UPDATE endpoints SET status = ?, last_seen_at = CURRENT_TIMESTAMP WHERE id = ?').run(
        status,
        id
      );
      telemetryService.setEndpointStatus(endpoint.extension, status, { source: 'ami' });
    } catch (error) {
      logger.warn('AMI endpoint status check failed', { id, error: error.message });
      status = endpoint.status || 'unknown';
    }
  }

  return {
    id: endpoint.id,
    extension: endpoint.extension,
    status,
    details,
    provisioningUrl: endpoint.provisioning_url
  };
}
