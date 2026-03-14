import { db, logActivity } from '../../services/db.service.js';
import { writeDialplanManagedConfig } from '../../services/dialplan-writer.js';
import { reloadDialplan } from '../../services/reload.service.js';

async function syncDialplan(activity, payload = null) {
  const dialplanPath = writeDialplanManagedConfig();
  const reloadResult = await reloadDialplan();
  logActivity('callgroups.config_sync', activity, {
    ...payload,
    dialplanPath,
    reloadResult
  });

  return { dialplanPath, reloadResult };
}

function ensureMembersExist(members) {
  if (!members.length) {
    return;
  }

  const placeholders = members.map(() => '?').join(',');
  const found = db
    .prepare(`SELECT extension FROM endpoints WHERE extension IN (${placeholders})`)
    .all(...members)
    .map((row) => row.extension);

  const missing = members.filter((member) => !found.includes(member));
  if (missing.length > 0) {
    throw Object.assign(new Error(`Unknown endpoint extensions: ${missing.join(', ')}`), {
      statusCode: 400
    });
  }
}

export function listCallgroups() {
  const rows = db.prepare('SELECT * FROM callgroups ORDER BY id ASC').all();
  return rows.map((row) => ({
    ...row,
    members: JSON.parse(row.members_json || '[]')
  }));
}

export function getCallgroup(id) {
  const row = db.prepare('SELECT * FROM callgroups WHERE id = ?').get(id);

  if (!row) {
    throw Object.assign(new Error('Callgroup not found'), { statusCode: 404 });
  }

  return {
    ...row,
    members: JSON.parse(row.members_json || '[]')
  };
}

export async function createCallgroup(payload) {
  ensureMembersExist(payload.members);

  const result = db.prepare(`
    INSERT INTO callgroups (name, extension, strategy, timeout, failover_target, members_json, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
  `).run(
    payload.name,
    payload.extension,
    payload.strategy,
    payload.timeout,
    payload.failoverTarget,
    JSON.stringify(payload.members)
  );

  const callgroup = getCallgroup(result.lastInsertRowid);
  const sync = await syncDialplan('Callgroup created', { callgroupId: callgroup.id });
  return { callgroup, sync };
}

export async function updateCallgroup(id, payload) {
  const current = getCallgroup(id);
  const merged = {
    name: payload.name ?? current.name,
    extension: payload.extension ?? current.extension,
    strategy: payload.strategy ?? current.strategy,
    timeout: payload.timeout ?? current.timeout,
    failoverTarget:
      payload.failoverTarget === undefined ? current.failover_target : payload.failoverTarget,
    members: payload.members ?? current.members
  };

  ensureMembersExist(merged.members);

  db.prepare(`
    UPDATE callgroups
    SET name = ?,
        extension = ?,
        strategy = ?,
        timeout = ?,
        failover_target = ?,
        members_json = ?,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(
    merged.name,
    merged.extension,
    merged.strategy,
    merged.timeout,
    merged.failoverTarget,
    JSON.stringify(merged.members),
    id
  );

  const callgroup = getCallgroup(id);
  const sync = await syncDialplan('Callgroup updated', { callgroupId: id });
  return { callgroup, sync };
}

export async function deleteCallgroup(id) {
  getCallgroup(id);
  db.prepare('DELETE FROM callgroups WHERE id = ?').run(id);
  const sync = await syncDialplan('Callgroup deleted', { callgroupId: id });
  return sync;
}
