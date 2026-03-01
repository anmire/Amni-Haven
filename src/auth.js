const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { getDb } = require('./database');
const OTPAuth = require('otpauth');
const QRCode = require('qrcode');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.error('FATAL: JWT_SECRET is not set. Check your .env file or let server.js auto-generate it.');
  process.exit(1);
}
const ADMIN_USERNAME = (process.env.ADMIN_USERNAME || 'admin').toLowerCase();

// ── TOTP helpers ─────────────────────────────────────────
// Short-lived tokens for the TOTP verification step (not full session tokens)
function generateTotpChallengeToken(userId) {
  return jwt.sign({ id: userId, purpose: 'totp_challenge' }, JWT_SECRET, { expiresIn: '5m' });
}

function verifyTotpChallengeToken(token) {
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.purpose !== 'totp_challenge') return null;
    return decoded;
  } catch { return null; }
}

function generateBackupCodes(count = 8) {
  const codes = [];
  for (let i = 0; i < count; i++) {
    // 8-char alphanumeric codes, grouped as XXXX-XXXX for readability
    const raw = crypto.randomBytes(4).toString('hex').toUpperCase();
    codes.push(raw.slice(0, 4) + '-' + raw.slice(4));
  }
  return codes;
}

// ── Rate Limiting (in-memory, no extra deps) ────────────
const rateLimitStore = new Map();

function authLimiter(req, res, next) {
  const ip = req.ip || req.socket.remoteAddress;
  const now = Date.now();
  const windowMs = 15 * 60 * 1000; // 15 minutes
  const maxAttempts = 20;           // 20 auth requests per 15 min per IP

  if (!rateLimitStore.has(ip)) {
    rateLimitStore.set(ip, []);
  }

  const timestamps = rateLimitStore.get(ip).filter(t => now - t < windowMs);
  rateLimitStore.set(ip, timestamps);

  if (timestamps.length >= maxAttempts) {
    return res.status(429).json({
      error: 'Too many attempts. Try again in a few minutes.'
    });
  }

  timestamps.push(now);
  next();
}

// Clean up stale entries every 30 minutes
setInterval(() => {
  const now = Date.now();
  const windowMs = 15 * 60 * 1000;
  for (const [ip, timestamps] of rateLimitStore) {
    const fresh = timestamps.filter(t => now - t < windowMs);
    if (fresh.length === 0) rateLimitStore.delete(ip);
    else rateLimitStore.set(ip, fresh);
  }
}, 30 * 60 * 1000);

// ── Input Sanitization ──────────────────────────────────
function sanitizeString(str, maxLen = 200) {
  if (typeof str !== 'string') return '';
  return str.trim().slice(0, maxLen);
}

// ── Register ──────────────────────────────────────────────
router.post('/register', async (req, res) => {
  try {
    const username = sanitizeString(req.body.username, 20);
    const password = typeof req.body.password === 'string' ? req.body.password : '';
    const eulaVersion = typeof req.body.eulaVersion === 'string' ? req.body.eulaVersion.trim() : '';
    const ageVerified = req.body.ageVerified === true;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }
    if (!eulaVersion) {
      return res.status(400).json({ error: 'You must accept the Terms of Service & Release of Liability Agreement' });
    }
    if (!ageVerified) {
      return res.status(400).json({ error: 'You must confirm that you are 18 years of age or older' });
    }

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }
    if (username.length < 3 || username.length > 20) {
      return res.status(400).json({ error: 'Username must be 3-20 characters' });
    }
    if (password.length < 8 || password.length > 128) {
      return res.status(400).json({ error: 'Password must be 8-128 characters' });
    }
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      return res.status(400).json({ error: 'Username: letters, numbers, underscores only' });
    }

    const db = getDb();

    // Whitelist check — if enabled, only pre-approved usernames can register
    const wlSetting = db.prepare("SELECT value FROM server_settings WHERE key = 'whitelist_enabled'").get();
    if (wlSetting && wlSetting.value === 'true') {
      const onList = db.prepare('SELECT 1 FROM whitelist WHERE username = ?').get(username);
      if (!onList) {
        return res.status(403).json({ error: 'Registration is restricted. Your username is not on the whitelist.' });
      }
    }

    const existing = db.prepare('SELECT id FROM users WHERE LOWER(username) = LOWER(?)').get(username);
    if (existing) {
      return res.status(400).json({ error: 'Registration could not be completed' });
    }

    const hash = await bcrypt.hash(password, 12);
    const isAdmin = username.toLowerCase() === ADMIN_USERNAME ? 1 : 0;

    const result = db.prepare(
      'INSERT INTO users (username, password_hash, is_admin) VALUES (?, ?, ?)'
    ).run(username, hash, isAdmin);

    // Auto-assign roles flagged as auto_assign to new users
    try {
      const autoRoles = db.prepare("SELECT id FROM roles WHERE auto_assign = 1 AND scope = 'server'").all();
      const insertRole = db.prepare('INSERT OR IGNORE INTO user_roles (user_id, role_id, channel_id, granted_by) VALUES (?, ?, NULL, NULL)');
      for (const role of autoRoles) {
        insertRole.run(result.lastInsertRowid, role.id);
        // Grant linked channel access for this role (fixes #79)
        try {
          const r = db.prepare('SELECT link_channel_access FROM roles WHERE id = ?').get(role.id);
          if (r && r.link_channel_access) {
            const grantChannels = db.prepare(
              'SELECT channel_id FROM role_channel_access WHERE role_id = ? AND grant_on_promote = 1'
            ).all(role.id);
            const ins = db.prepare('INSERT OR IGNORE INTO channel_members (channel_id, user_id) VALUES (?, ?)');
            for (const ch of grantChannels) ins.run(ch.channel_id, result.lastInsertRowid);
          }
        } catch { /* non-critical */ }
      }
    } catch { /* non-critical */ }

    const token = jwt.sign(
      { id: result.lastInsertRowid, username, isAdmin: !!isAdmin, displayName: username, pwv: 1 },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Record EULA acceptance
    if (eulaVersion) {
      try {
        db.prepare(
          'INSERT OR IGNORE INTO eula_acceptances (user_id, version, ip_address, age_verified) VALUES (?, ?, ?, ?)'
        ).run(result.lastInsertRowid, eulaVersion, req.ip || req.socket.remoteAddress || '', ageVerified ? 1 : 0);
      } catch { /* non-critical */ }
    }

    res.json({
      token,
      user: { id: result.lastInsertRowid, username, isAdmin: !!isAdmin, displayName: username }
    });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── Login ─────────────────────────────────────────────────
router.post('/login', async (req, res) => {
  try {
    const username = sanitizeString(req.body.username, 20);
    const password = typeof req.body.password === 'string' ? req.body.password : '';
    const eulaVersion = typeof req.body.eulaVersion === 'string' ? req.body.eulaVersion.trim() : '';
    const ageVerified = req.body.ageVerified === true;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }
    if (!eulaVersion) {
      return res.status(400).json({ error: 'You must accept the Terms of Service & Release of Liability Agreement' });
    }
    if (!ageVerified) {
      return res.status(400).json({ error: 'You must confirm that you are 18 years of age or older' });
    }

    const db = getDb();
    const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check if user is banned
    const ban = db.prepare('SELECT reason FROM bans WHERE user_id = ?').get(user.id);
    if (ban) {
      return res.status(403).json({ error: 'You have been banned from this server' });
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Sync admin status from .env (handles ADMIN_USERNAME changes between restarts)
    const shouldBeAdmin = user.username.toLowerCase() === ADMIN_USERNAME ? 1 : 0;
    if (user.is_admin !== shouldBeAdmin) {
      db.prepare('UPDATE users SET is_admin = ? WHERE id = ?').run(shouldBeAdmin, user.id);
      user.is_admin = shouldBeAdmin;
    }

    const displayName = user.display_name || user.username;

    // ── TOTP check: if enabled, require a second step ──
    if (user.totp_enabled) {
      const challengeToken = generateTotpChallengeToken(user.id);
      return res.json({ requiresTOTP: true, challengeToken });
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, isAdmin: !!user.is_admin, displayName, pwv: user.password_version || 1 },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Record EULA acceptance
    if (eulaVersion) {
      try {
        db.prepare(
          'INSERT OR IGNORE INTO eula_acceptances (user_id, version, ip_address, age_verified) VALUES (?, ?, ?, ?)'
        ).run(user.id, eulaVersion, req.ip || req.socket.remoteAddress || '', ageVerified ? 1 : 0);
      } catch { /* non-critical */ }
    }

    res.json({
      token,
      user: { id: user.id, username: user.username, isAdmin: !!user.is_admin, displayName }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── TOTP Validate (second step of login) ─────────────────
router.post('/totp/validate', async (req, res) => {
  try {
    const challengeToken = typeof req.body.challengeToken === 'string' ? req.body.challengeToken : '';
    const code = typeof req.body.code === 'string' ? req.body.code.replace(/\s/g, '') : '';

    if (!challengeToken || !code) {
      return res.status(400).json({ error: 'Challenge token and code required' });
    }

    const challenge = verifyTotpChallengeToken(challengeToken);
    if (!challenge) {
      return res.status(401).json({ error: 'Invalid or expired challenge. Please log in again.' });
    }

    const db = getDb();
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(challenge.id);
    if (!user || !user.totp_enabled || !user.totp_secret) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Try TOTP code first
    const totp = new OTPAuth.TOTP({
      issuer: 'Haven',
      label: user.username,
      algorithm: 'SHA1',
      digits: 6,
      period: 30,
      secret: OTPAuth.Secret.fromBase32(user.totp_secret)
    });

    const delta = totp.validate({ token: code, window: 1 });
    let valid = delta !== null;

    // If not a valid TOTP code, check backup codes
    if (!valid) {
      const normalizedCode = code.toUpperCase().replace(/-/g, '');
      const backupCodes = db.prepare(
        'SELECT id, code_hash FROM totp_backup_codes WHERE user_id = ? AND used = 0'
      ).all(user.id);

      for (const bc of backupCodes) {
        // Compare hashed backup code
        const codeToCheck = normalizedCode.slice(0, 4) + '-' + normalizedCode.slice(4);
        if (crypto.timingSafeEqual(
          Buffer.from(bc.code_hash, 'hex'),
          Buffer.from(crypto.createHash('sha256').update(codeToCheck).digest('hex'), 'hex')
        )) {
          // Mark backup code as used
          db.prepare('UPDATE totp_backup_codes SET used = 1 WHERE id = ?').run(bc.id);
          valid = true;
          break;
        }
      }
    }

    if (!valid) {
      return res.status(401).json({ error: 'Invalid code' });
    }

    const displayName = user.display_name || user.username;
    const token = jwt.sign(
      { id: user.id, username: user.username, isAdmin: !!user.is_admin, displayName, pwv: user.password_version || 1 },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: { id: user.id, username: user.username, isAdmin: !!user.is_admin, displayName }
    });
  } catch (err) {
    console.error('TOTP validate error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── TOTP Setup (generate secret + QR) ────────────────────
router.post('/totp/setup', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Unauthorized' });
    const decoded = verifyToken(token);
    if (!decoded) return res.status(401).json({ error: 'Unauthorized' });

    const db = getDb();
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(decoded.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    if (user.totp_enabled) {
      return res.status(400).json({ error: '2FA is already enabled' });
    }

    // Generate a new TOTP secret
    const secret = new OTPAuth.Secret({ size: 20 });
    const totp = new OTPAuth.TOTP({
      issuer: 'Haven',
      label: user.username,
      algorithm: 'SHA1',
      digits: 6,
      period: 30,
      secret
    });

    // Store secret (not yet enabled — user must verify first)
    db.prepare('UPDATE users SET totp_secret = ? WHERE id = ?').run(secret.base32, user.id);

    const otpauthUri = totp.toString();
    const qrDataUrl = await QRCode.toDataURL(otpauthUri, { width: 256, margin: 2 });

    res.json({
      secret: secret.base32,
      otpauthUri,
      qrCode: qrDataUrl
    });
  } catch (err) {
    console.error('TOTP setup error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── TOTP Verify Setup (confirm code → enable) ────────────
router.post('/totp/verify-setup', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Unauthorized' });
    const decoded = verifyToken(token);
    if (!decoded) return res.status(401).json({ error: 'Unauthorized' });

    const code = typeof req.body.code === 'string' ? req.body.code.replace(/\s/g, '') : '';
    if (!code) return res.status(400).json({ error: 'Verification code required' });

    const db = getDb();
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(decoded.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    if (user.totp_enabled) {
      return res.status(400).json({ error: '2FA is already enabled' });
    }
    if (!user.totp_secret) {
      return res.status(400).json({ error: 'No 2FA setup in progress. Start setup first.' });
    }

    const totp = new OTPAuth.TOTP({
      issuer: 'Haven',
      label: user.username,
      algorithm: 'SHA1',
      digits: 6,
      period: 30,
      secret: OTPAuth.Secret.fromBase32(user.totp_secret)
    });

    const delta = totp.validate({ token: code, window: 1 });
    if (delta === null) {
      return res.status(401).json({ error: 'Invalid code. Make sure your authenticator app is synced and try again.' });
    }

    // Enable TOTP
    db.prepare('UPDATE users SET totp_enabled = 1 WHERE id = ?').run(user.id);

    // Generate backup codes
    const backupCodes = generateBackupCodes(8);
    const insertCode = db.prepare('INSERT INTO totp_backup_codes (user_id, code_hash) VALUES (?, ?)');
    // Clear any old backup codes
    db.prepare('DELETE FROM totp_backup_codes WHERE user_id = ?').run(user.id);
    for (const c of backupCodes) {
      const hash = crypto.createHash('sha256').update(c).digest('hex');
      insertCode.run(user.id, hash);
    }

    res.json({ success: true, backupCodes });
  } catch (err) {
    console.error('TOTP verify-setup error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── TOTP Disable ─────────────────────────────────────────
router.post('/totp/disable', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Unauthorized' });
    const decoded = verifyToken(token);
    if (!decoded) return res.status(401).json({ error: 'Unauthorized' });

    const password = typeof req.body.password === 'string' ? req.body.password : '';
    if (!password) return res.status(400).json({ error: 'Password required to disable 2FA' });

    const db = getDb();
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(decoded.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    if (!user.totp_enabled) {
      return res.status(400).json({ error: '2FA is not enabled' });
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(401).json({ error: 'Incorrect password' });

    db.prepare('UPDATE users SET totp_enabled = 0, totp_secret = NULL WHERE id = ?').run(user.id);
    db.prepare('DELETE FROM totp_backup_codes WHERE user_id = ?').run(user.id);

    res.json({ success: true });
  } catch (err) {
    console.error('TOTP disable error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── TOTP Status ──────────────────────────────────────────
router.get('/totp/status', (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Unauthorized' });
    const decoded = verifyToken(token);
    if (!decoded) return res.status(401).json({ error: 'Unauthorized' });

    const db = getDb();
    const user = db.prepare('SELECT totp_enabled FROM users WHERE id = ?').get(decoded.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const remaining = db.prepare(
      'SELECT COUNT(*) as count FROM totp_backup_codes WHERE user_id = ? AND used = 0'
    ).get(decoded.id);

    res.json({ enabled: !!user.totp_enabled, backupCodesRemaining: remaining?.count || 0 });
  } catch (err) {
    console.error('TOTP status error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── TOTP Regenerate Backup Codes ─────────────────────────
router.post('/totp/regenerate-backup', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Unauthorized' });
    const decoded = verifyToken(token);
    if (!decoded) return res.status(401).json({ error: 'Unauthorized' });

    const password = typeof req.body.password === 'string' ? req.body.password : '';
    if (!password) return res.status(400).json({ error: 'Password required' });

    const db = getDb();
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(decoded.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    if (!user.totp_enabled) {
      return res.status(400).json({ error: '2FA is not enabled' });
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(401).json({ error: 'Incorrect password' });

    const backupCodes = generateBackupCodes(8);
    db.prepare('DELETE FROM totp_backup_codes WHERE user_id = ?').run(user.id);
    const insertCode = db.prepare('INSERT INTO totp_backup_codes (user_id, code_hash) VALUES (?, ?)');
    for (const c of backupCodes) {
      const hash = crypto.createHash('sha256').update(c).digest('hex');
      insertCode.run(user.id, hash);
    }

    res.json({ success: true, backupCodes });
  } catch (err) {
    console.error('TOTP regenerate-backup error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── Change Password ──────────────────────────────────────
router.post('/change-password', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Unauthorized' });
    const decoded = verifyToken(token);
    if (!decoded) return res.status(401).json({ error: 'Unauthorized' });

    const currentPassword = typeof req.body.currentPassword === 'string' ? req.body.currentPassword : '';
    const newPassword = typeof req.body.newPassword === 'string' ? req.body.newPassword : '';

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current and new password required' });
    }
    if (newPassword.length < 8 || newPassword.length > 128) {
      return res.status(400).json({ error: 'New password must be 8-128 characters' });
    }

    const db = getDb();
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(decoded.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const valid = await bcrypt.compare(currentPassword, user.password_hash);
    if (!valid) return res.status(401).json({ error: 'Current password is incorrect' });

    const hash = await bcrypt.hash(newPassword, 12);
    const newPwv = (user.password_version || 1) + 1;
    db.prepare('UPDATE users SET password_hash = ?, password_version = ? WHERE id = ?').run(hash, newPwv, user.id);

    // Issue a fresh token so the session stays alive
    const freshToken = jwt.sign(
      { id: user.id, username: user.username, isAdmin: !!user.is_admin, displayName: user.display_name || user.username, pwv: newPwv },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Send the response FIRST so the client can store the fresh token
    // before we disconnect sockets (prevents redirect loop)
    res.json({ message: 'Password changed successfully', token: freshToken });

    // Disconnect all existing sockets for this user (forces re-login on other sessions)
    const io = req.app.get('io');
    if (io) {
      // Small delay to let the HTTP response reach the client first
      setTimeout(() => {
        for (const [, s] of io.sockets.sockets) {
          if (s.user && s.user.id === user.id) {
            s.emit('force-logout', { reason: 'password_changed' });
            s.disconnect(true);
          }
        }
      }, 500);
    }
  } catch (err) {
    console.error('Change password error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── Helpers ───────────────────────────────────────────────

// ── Verify Password (lightweight, for E2E password prompt) ──
router.post('/verify-password', async (req, res) => {
  try {
    const username = sanitizeString(req.body.username, 20);
    const password = typeof req.body.password === 'string' ? req.body.password : '';
    if (!username || !password) {
      return res.status(400).json({ valid: false, error: 'Username and password required' });
    }
    const db = getDb();
    const user = db.prepare('SELECT password_hash FROM users WHERE username = ?').get(username);
    if (!user) {
      return res.status(401).json({ valid: false, error: 'Invalid credentials' });
    }
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ valid: false, error: 'Invalid credentials' });
    }
    res.json({ valid: true });
  } catch (err) {
    console.error('Verify password error:', err);
    res.status(500).json({ valid: false, error: 'Server error' });
  }
});

function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}

// ── Admin Recovery ──────────────────────────────────────
// Allows the server owner to reclaim admin access using their .env credentials.
// This is a last-resort mechanism if the admin gets banned, demoted, or locked out.
// Requires ADMIN_USERNAME and the admin account's password (verified against DB hash).
router.post('/admin-recover', authLimiter, async (req, res) => {
  try {
    const username = sanitizeString(req.body.username, 20);
    const password = typeof req.body.password === 'string' ? req.body.password : '';
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }

    // Only the ADMIN_USERNAME from .env can use this endpoint
    if (username.toLowerCase() !== ADMIN_USERNAME) {
      return res.status(403).json({ error: 'This endpoint is only available for the server admin account' });
    }

    const db = getDb();
    const user = db.prepare('SELECT * FROM users WHERE LOWER(username) = LOWER(?)').get(username);
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Restore admin status
    db.prepare('UPDATE users SET is_admin = 1 WHERE id = ?').run(user.id);

    // Remove any active ban on the admin
    db.prepare('DELETE FROM bans WHERE user_id = ?').run(user.id);

    // Remove any active mute on the admin
    db.prepare('DELETE FROM mutes WHERE user_id = ?').run(user.id);

    const displayName = user.display_name || user.username;
    const token = jwt.sign(
      { id: user.id, username: user.username, isAdmin: true, displayName, pwv: user.password_version || 1 },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    console.log(`🔑 Admin recovery used for "${user.username}" from ${req.ip || 'unknown'}`);
    res.json({ token, user: { id: user.id, username: user.username, isAdmin: true, displayName } });
  } catch (err) {
    console.error('Admin recovery error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

function generateToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

function generateChannelCode() {
  return crypto.randomBytes(4).toString('hex'); // 8-char hex string
}

module.exports = { router, verifyToken, generateChannelCode, generateToken, authLimiter };
