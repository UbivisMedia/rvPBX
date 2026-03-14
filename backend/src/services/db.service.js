import fs from 'node:fs';
import path from 'node:path';
import bcrypt from 'bcryptjs';
import Database from 'better-sqlite3';
import { config } from '../core/config.js';
import { logger } from '../core/logger.js';

fs.mkdirSync(config.paths.dataDir, { recursive: true });

const dbPath = path.join(config.paths.dataDir, 'asterisk-admin.db');
export const db = new Database(dbPath);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

function migrate() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'admin',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS refresh_tokens (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      token_hash TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS trunks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      host TEXT NOT NULL,
      username TEXT,
      password TEXT,
      transport TEXT NOT NULL DEFAULT 'udp',
      context TEXT NOT NULL DEFAULT 'from-trunk',
      register_enabled INTEGER NOT NULL DEFAULT 1,
      status TEXT NOT NULL DEFAULT 'unknown',
      last_tested_at TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS endpoints (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      extension TEXT NOT NULL UNIQUE,
      display_name TEXT,
      username TEXT NOT NULL,
      password TEXT NOT NULL,
      codecs TEXT NOT NULL DEFAULT 'ulaw,alaw',
      context TEXT NOT NULL DEFAULT 'internal',
      template TEXT NOT NULL DEFAULT 'softphone',
      provisioning_key TEXT,
      voicemail_enabled INTEGER NOT NULL DEFAULT 0,
      voicemail_box TEXT,
      status TEXT NOT NULL DEFAULT 'unknown',
      last_seen_at TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS callgroups (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      extension TEXT NOT NULL UNIQUE,
      strategy TEXT NOT NULL DEFAULT 'simultaneous',
      timeout INTEGER NOT NULL DEFAULT 20,
      failover_target TEXT,
      members_json TEXT NOT NULL DEFAULT '[]',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS activity_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL,
      message TEXT NOT NULL,
      payload_json TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS cdr_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      unique_id TEXT,
      caller TEXT,
      callee TEXT,
      trunk TEXT,
      endpoint TEXT,
      disposition TEXT NOT NULL DEFAULT 'UNKNOWN',
      duration_sec INTEGER NOT NULL DEFAULT 0,
      billsec INTEGER NOT NULL DEFAULT 0,
      started_at TEXT NOT NULL,
      ended_at TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS alerts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      severity TEXT NOT NULL DEFAULT 'warning',
      source TEXT NOT NULL,
      key TEXT NOT NULL,
      message TEXT NOT NULL,
      payload_json TEXT,
      status TEXT NOT NULL DEFAULT 'open',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      acknowledged_at TEXT,
      UNIQUE(source, key, status)
    );

    CREATE INDEX IF NOT EXISTS idx_cdr_started_at ON cdr_records(started_at);
    CREATE INDEX IF NOT EXISTS idx_alerts_status_created_at ON alerts(status, created_at);
  `);

  // Backward-compatible additive migration for older DBs.
  const endpointColumns = db.prepare(`PRAGMA table_info(endpoints)`).all();
  const endpointColumnNames = new Set(endpointColumns.map((column) => column.name));

  if (!endpointColumnNames.has('provisioning_key')) {
    db.exec('ALTER TABLE endpoints ADD COLUMN provisioning_key TEXT');
  }

  if (!endpointColumnNames.has('voicemail_enabled')) {
    db.exec('ALTER TABLE endpoints ADD COLUMN voicemail_enabled INTEGER NOT NULL DEFAULT 0');
  }

  if (!endpointColumnNames.has('voicemail_box')) {
    db.exec('ALTER TABLE endpoints ADD COLUMN voicemail_box TEXT');
  }
}

function seedDefaultAdmin() {
  const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(config.admin.username);

  if (existing) {
    return;
  }

  const hash = bcrypt.hashSync(config.admin.password, 12);
  db.prepare('INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)').run(
    config.admin.username,
    hash,
    'admin'
  );

  logger.info('Seeded default admin user', { username: config.admin.username });
}

export function logActivity(type, message, payload = null) {
  db.prepare('INSERT INTO activity_logs (type, message, payload_json) VALUES (?, ?, ?)').run(
    type,
    message,
    payload ? JSON.stringify(payload) : null
  );
}

export function createCdrRecord(record) {
  db.prepare(`
    INSERT INTO cdr_records (
      unique_id,
      caller,
      callee,
      trunk,
      endpoint,
      disposition,
      duration_sec,
      billsec,
      started_at,
      ended_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    record.uniqueId ?? null,
    record.caller ?? null,
    record.callee ?? null,
    record.trunk ?? null,
    record.endpoint ?? null,
    record.disposition ?? 'UNKNOWN',
    record.durationSec ?? 0,
    record.billsec ?? 0,
    record.startedAt ?? new Date().toISOString(),
    record.endedAt ?? null
  );
}

export function cdrSummary(days = 7) {
  const safeDays = Math.max(1, Math.min(90, Number(days) || 7));
  const rows = db
    .prepare(
      `
      SELECT substr(started_at, 1, 10) AS day,
             COUNT(1) AS total,
             SUM(CASE WHEN disposition = 'ANSWERED' THEN 1 ELSE 0 END) AS answered,
             AVG(duration_sec) AS avg_duration
      FROM cdr_records
      WHERE datetime(started_at) >= datetime('now', ?)
      GROUP BY day
      ORDER BY day ASC
    `
    )
    .all(`-${safeDays} days`);

  const totals = db
    .prepare(
      `
      SELECT COUNT(1) AS total,
             SUM(CASE WHEN disposition = 'ANSWERED' THEN 1 ELSE 0 END) AS answered,
             SUM(duration_sec) AS duration
      FROM cdr_records
      WHERE datetime(started_at) >= datetime('now', ?)
    `
    )
    .get(`-${safeDays} days`);

  return {
    days: safeDays,
    series: rows.map((row) => ({
      day: row.day,
      total: Number(row.total || 0),
      answered: Number(row.answered || 0),
      avgDuration: Number(row.avg_duration || 0)
    })),
    totals: {
      total: Number(totals.total || 0),
      answered: Number(totals.answered || 0),
      duration: Number(totals.duration || 0)
    }
  };
}

export function openOrRefreshAlert({ severity = 'warning', source, key, message, payload = null }) {
  const existing = db
    .prepare('SELECT id FROM alerts WHERE source = ? AND key = ? AND status = ?')
    .get(source, key, 'open');

  if (existing) {
    db.prepare(
      `
      UPDATE alerts
      SET severity = ?, message = ?, payload_json = ?, created_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `
    ).run(severity, message, payload ? JSON.stringify(payload) : null, existing.id);
    return existing.id;
  }

  const result = db
    .prepare(
      `
      INSERT INTO alerts (severity, source, key, message, payload_json, status)
      VALUES (?, ?, ?, ?, ?, 'open')
    `
    )
    .run(severity, source, key, message, payload ? JSON.stringify(payload) : null);

  return result.lastInsertRowid;
}

export function acknowledgeAlert(id) {
  db.prepare(
    `
    UPDATE alerts
    SET status = 'acknowledged', acknowledged_at = CURRENT_TIMESTAMP
    WHERE id = ? AND status = 'open'
  `
  ).run(id);
}

export function acknowledgeAlertsBySourceKey(source, key) {
  db.prepare(
    `
    UPDATE alerts
    SET status = 'acknowledged', acknowledged_at = CURRENT_TIMESTAMP
    WHERE source = ? AND key = ? AND status = 'open'
  `
  ).run(source, key);
}

export function listAlerts({ status = 'open', limit = 100 } = {}) {
  const safeLimit = Math.max(1, Math.min(500, Number(limit) || 100));

  const rows =
    status === 'all'
      ? db.prepare('SELECT * FROM alerts ORDER BY id DESC LIMIT ?').all(safeLimit)
      : db.prepare('SELECT * FROM alerts WHERE status = ? ORDER BY id DESC LIMIT ?').all(status, safeLimit);

  return rows.map((row) => ({
    ...row,
    payload: row.payload_json ? JSON.parse(row.payload_json) : null
  }));
}

migrate();
seedDefaultAdmin();

export { dbPath };
