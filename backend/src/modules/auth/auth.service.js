import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { config } from '../../core/config.js';
import { db, logActivity } from '../../services/db.service.js';

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function issueAccessToken(user) {
  return jwt.sign(
    {
      sub: user.id,
      username: user.username,
      role: user.role,
      type: 'access'
    },
    config.jwt.secret,
    {
      expiresIn: config.jwt.accessTtl
    }
  );
}

function issueRefreshToken(user) {
  return jwt.sign(
    {
      sub: user.id,
      username: user.username,
      role: user.role,
      type: 'refresh',
      jti: crypto.randomUUID()
    },
    config.jwt.refreshSecret,
    {
      expiresIn: `${config.jwt.refreshTtlDays}d`
    }
  );
}

function insertRefreshToken(userId, refreshToken) {
  const hashed = hashToken(refreshToken);
  const expiresAt = new Date(Date.now() + config.jwt.refreshTtlDays * 86400 * 1000).toISOString();

  db.prepare('INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES (?, ?, ?)').run(
    userId,
    hashed,
    expiresAt
  );

  db.prepare('DELETE FROM refresh_tokens WHERE datetime(expires_at) <= CURRENT_TIMESTAMP').run();
}

function buildTokenPayload(user) {
  const accessToken = issueAccessToken(user);
  const refreshToken = issueRefreshToken(user);
  insertRefreshToken(user.id, refreshToken);

  return {
    accessToken,
    refreshToken,
    expiresIn: config.jwt.accessTtl,
    user: {
      id: user.id,
      username: user.username,
      role: user.role
    }
  };
}

export async function login(username, password) {
  const user = db
    .prepare('SELECT id, username, password_hash, role FROM users WHERE username = ?')
    .get(username);

  if (!user) {
    throw Object.assign(new Error('Invalid username or password'), { statusCode: 401 });
  }

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    throw Object.assign(new Error('Invalid username or password'), { statusCode: 401 });
  }

  logActivity('auth.login', 'User logged in', { userId: user.id, username: user.username });
  return buildTokenPayload(user);
}

export function refresh(refreshToken) {
  let payload;

  try {
    payload = jwt.verify(refreshToken, config.jwt.refreshSecret);
  } catch (_error) {
    throw Object.assign(new Error('Invalid refresh token'), { statusCode: 401 });
  }

  if (payload.type !== 'refresh') {
    throw Object.assign(new Error('Invalid token type'), { statusCode: 401 });
  }

  const tokenHash = hashToken(refreshToken);
  const tokenRow = db
    .prepare(
      'SELECT id, user_id FROM refresh_tokens WHERE token_hash = ? AND datetime(expires_at) > CURRENT_TIMESTAMP'
    )
    .get(tokenHash);

  if (!tokenRow) {
    throw Object.assign(new Error('Refresh token not recognized or expired'), { statusCode: 401 });
  }

  const user = db.prepare('SELECT id, username, role FROM users WHERE id = ?').get(tokenRow.user_id);
  if (!user) {
    throw Object.assign(new Error('User not found'), { statusCode: 401 });
  }

  db.prepare('DELETE FROM refresh_tokens WHERE id = ?').run(tokenRow.id);

  logActivity('auth.refresh', 'Access token refreshed', { userId: user.id, username: user.username });
  return buildTokenPayload(user);
}
