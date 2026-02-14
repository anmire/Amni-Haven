const { DATA_DIR, DB_PATH, ENV_PATH, CERTS_DIR, UPLOADS_DIR } = require('./src/paths');
const fs = require('fs');
const path = require('path');
if (!fs.existsSync(ENV_PATH)) {
  const example = path.join(__dirname, '.env.example');
  fs.existsSync(example) ? fs.copyFileSync(example, ENV_PATH) : fs.writeFileSync(ENV_PATH, 'JWT_SECRET=change-me-to-something-random-and-long\n');
  if (fs.existsSync(example)) console.log(`Created .env in ${DATA_DIR} from template`);
}
require('dotenv').config({ path: ENV_PATH });
const express = require('express');
const { createServer } = require('http');
const { createServer: createHttpsServer } = require('https');
const { Server } = require('socket.io');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const helmet = require('helmet');
const multer = require('multer');
const { startTunnel, stopTunnel, getTunnelStatus } = require('./src/tunnel');
const { router: botRoutes } = require('./src/botApi');
const { setupWizardRoutes, wizardMiddleware } = require('./src/setupWizard');
const os = require('os');
console.log(`Data directory: ${DATA_DIR}`);

if (process.env.JWT_SECRET === 'change-me-to-something-random-and-long' || !process.env.JWT_SECRET) {
  const generated = crypto.randomBytes(48).toString('base64');
  let envContent = fs.readFileSync(ENV_PATH, 'utf-8');
  envContent = envContent.replace(/JWT_SECRET=.*/, `JWT_SECRET=${generated}`);
  fs.writeFileSync(ENV_PATH, envContent);
  process.env.JWT_SECRET = generated;
  console.log('Auto-generated strong JWT_SECRET (saved to .env)');
}
const { initDatabase } = require('./src/database');
const { router: authRoutes, authLimiter, verifyToken } = require('./src/auth');
const { setupSocketHandlers } = require('./src/socketHandlers');
const app = express();

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-eval'", "'wasm-unsafe-eval'", "https://cdn.emulatorjs.org", "https://sdk.scdn.co", "https://unpkg.com"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.emulatorjs.org"],
      imgSrc: ["'self'", "data:", "blob:", "https:"],
      connectSrc: ["'self'", "wss:", "ws:", "http:", "https:", "blob:", "https://cdn.emulatorjs.org", "https://api.spotify.com", "wss://dealer.spotify.com", "https://unpkg.com"],
      mediaSrc: ["'self'", "blob:", "https://*.scdn.co", "https://*.spotifycdn.com"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
      frameSrc: ["'self'", "https://open.spotify.com", "https://www.youtube.com", "https://www.youtube-nocookie.com", "https://w.soundcloud.com", "https://player.vimeo.com"],
      frameAncestors: ["'none'"],
      workerSrc: ["'self'", "blob:", "https://unpkg.com"],
    }
  },
  crossOriginEmbedderPolicy: false,
  crossOriginOpenerPolicy: false,
  hsts: { maxAge: 31536000, includeSubDomains: false },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
}));
app.use((req, res, next) => {
  res.setHeader('Permissions-Policy', 'camera=(), geolocation=(), payment=()');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  next();
});
app.use('/games', (req, res, next) => {
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
  next();
});
app.disable('x-powered-by');
app.use(express.json({ limit: '16kb' }));
app.use(express.urlencoded({ extended: false, limit: '16kb' }));
app.use(express.static(path.join(__dirname, 'public'), {
  dotfiles: 'deny',
  etag: true,
  lastModified: true,
  maxAge: 0,
}));
setupWizardRoutes(app);
app.use(wizardMiddleware);

// ── Serve uploads from external data directory ──────────
app.use('/uploads', express.static(UPLOADS_DIR, {
  dotfiles: 'deny',
  etag: true,
  lastModified: true,
  maxAge: '1h',
  setHeaders: (res, filePath) => {
    const ext = path.extname(filePath).toLowerCase();
    if (!['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext)) {
      res.setHeader('Content-Disposition', 'attachment');
    }
  }
}));

// ── File uploads (images, max 5 MB) ─────────────────────
const uploadDir = UPLOADS_DIR;

const uploadStorage = multer.diskStorage({
  destination: uploadDir,
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${Date.now()}-${crypto.randomBytes(8).toString('hex')}${ext}`);
  }
});

const upload = multer({
  storage: uploadStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (/^image\/(jpeg|png|gif|webp)$/.test(file.mimetype)) cb(null, true);
    else cb(new Error('Only images allowed (jpg, png, gif, webp)'));
  }
});

// ── API routes (rate-limited) ────────────────────────────
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/bot', express.json(), botRoutes);
app.get('/api/auth/auto-login', authLimiter, (req, res) => {
  const ip = req.ip || req.socket.remoteAddress || '';
  const isLocal = ['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(ip);
  if (!isLocal) return res.status(403).json({ error: 'Forbidden' });
  const db = require('./src/database').getDb();
  const adminName = (process.env.ADMIN_USERNAME || 'admin').toLowerCase();
  const admin = db.prepare('SELECT * FROM users WHERE LOWER(username) = ?').get(adminName);
  if (!admin) return res.status(404).json({ error: 'Admin not registered yet' });
  const token = jwt.sign({ id: admin.id, username: admin.username, isAdmin: true }, process.env.JWT_SECRET, { expiresIn: '7d' });
  res.json({ token, user: { id: admin.id, username: admin.username, displayName: admin.display_name || null, isAdmin: true } });
});
app.post('/api/user/display-name', express.json(), (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  const user = token ? verifyToken(token) : null;
  if (!user) return res.status(401).json({ error: 'Unauthorized' });
  const name = typeof req.body.displayName === 'string' ? req.body.displayName.trim().slice(0, 32) : null;
  if (name && (name.length < 1 || name.length > 32)) return res.status(400).json({ error: 'Display name must be 1-32 chars' });
  const db = require('./src/database').getDb();
  db.prepare('UPDATE users SET display_name = ? WHERE id = ?').run(name || null, user.id);
  res.json({ displayName: name || null });
});

// ── Serve pages ──────────────────────────────────────────
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/app', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'app.html'));
});

app.get('/games/flappy', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'games', 'flappy.html'));
});

app.options('/api/health', (req, res) => {
  res.set({'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET', 'Access-Control-Allow-Headers': 'Content-Type'});
  res.sendStatus(204);
});
app.get('/api/health', (req, res) => {
  res.set('Access-Control-Allow-Origin', '*');
  const onlineUsers = global.havenIO ? global.havenIO.engine.clientsCount : 0;
  const userList = [];
  if (global.havenIO) {
    for (const [, s] of global.havenIO.sockets.sockets) {
      if (s.user?.username) userList.push({ id: s.user.id, username: s.user.displayName || s.user.username });
    }
  }
  res.json({ status: 'online', name: process.env.SERVER_NAME || 'Haven', onlineUsers, users: userList });
});
app.options('/api/ping', (req, res) => {
  res.set({'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST', 'Access-Control-Allow-Headers': 'Content-Type'});
  res.sendStatus(204);
});
app.post('/api/ping', express.json(), (req, res) => {
  res.set('Access-Control-Allow-Origin', '*');
  const { fromServer, fromUser, toUserId, message } = req.body || {};
  if (!fromUser || !toUserId) return res.status(400).json({ error: 'Missing fromUser or toUserId' });
  if (!global.havenIO) return res.status(503).json({ error: 'Server not ready' });
  let delivered = false;
  for (const [, s] of global.havenIO.sockets.sockets) {
    if (String(s.user?.id) === String(toUserId)) {
      s.emit('cross-server-ping', { fromServer: fromServer || 'Unknown', fromUser, message: message || 'pinged you!' });
      delivered = true;
    }
  }
  res.json({ delivered });
});

// ── Upload rate limiting ─────────────────────────────────
const uploadLimitStore = new Map();
function uploadLimiter(req, res, next) {
  const ip = req.ip || req.socket.remoteAddress;
  const now = Date.now();
  const windowMs = 60 * 1000; // 1 minute
  const maxUploads = 10;
  if (!uploadLimitStore.has(ip)) uploadLimitStore.set(ip, []);
  const stamps = uploadLimitStore.get(ip).filter(t => now - t < windowMs);
  uploadLimitStore.set(ip, stamps);
  if (stamps.length >= maxUploads) return res.status(429).json({ error: 'Upload rate limit — try again in a minute' });
  stamps.push(now);
  next();
}
setInterval(() => { const now = Date.now(); for (const [ip, t] of uploadLimitStore) { const f = t.filter(x => now - x < 60000); if (!f.length) uploadLimitStore.delete(ip); else uploadLimitStore.set(ip, f); } }, 5 * 60 * 1000);

// ── Image upload (authenticated + not banned) ────────────
app.post('/api/upload', uploadLimiter, (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  const user = token ? verifyToken(token) : null;
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  // Check if user is banned
  const { getDb } = require('./src/database');
  const ban = getDb().prepare('SELECT id FROM bans WHERE user_id = ?').get(user.id);
  if (ban) return res.status(403).json({ error: 'Banned users cannot upload' });

  upload.single('image')(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.message });
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    try {
      const fd = fs.openSync(req.file.path, 'r');
      const hdr = Buffer.alloc(12);
      fs.readSync(fd, hdr, 0, 12, 0);
      fs.closeSync(fd);
      let validMagic = false;
      if (req.file.mimetype === 'image/jpeg') validMagic = hdr[0] === 0xFF && hdr[1] === 0xD8 && hdr[2] === 0xFF;
      else if (req.file.mimetype === 'image/png') validMagic = hdr[0] === 0x89 && hdr[1] === 0x50 && hdr[2] === 0x4E && hdr[3] === 0x47;
      else if (req.file.mimetype === 'image/gif') validMagic = hdr.slice(0, 6).toString().startsWith('GIF8');
      else if (req.file.mimetype === 'image/webp') validMagic = hdr.slice(0, 4).toString() === 'RIFF' && hdr.slice(8, 12).toString() === 'WEBP';
      if (!validMagic) { fs.unlinkSync(req.file.path); return res.status(400).json({ error: 'File content does not match image type' }); }
    } catch { try { fs.unlinkSync(req.file.path); } catch {} return res.status(400).json({ error: 'Failed to validate file' }); }
    const mimeToExt = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/gif': '.gif', 'image/webp': '.webp' };
    const safeExt = mimeToExt[req.file.mimetype];
    if (!safeExt) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: 'Invalid file type' });
    }
    // Rename file to use safe extension if it doesn't already match
    const currentExt = path.extname(req.file.filename).toLowerCase();
    if (currentExt !== safeExt) {
      const safeName = req.file.filename.replace(/\.[^.]+$/, '') + safeExt;
      const oldPath = req.file.path;
      const newPath = path.join(uploadDir, safeName);
      fs.renameSync(oldPath, newPath);
      return res.json({ url: `/uploads/${safeName}` });
    }
    res.json({ url: `/uploads/${req.file.filename}` });
  });
});
app.post('/api/upload-avatar', uploadLimiter, (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  const user = token ? verifyToken(token) : null;
  if (!user) return res.status(401).json({ error: 'Unauthorized' });
  upload.single('image')(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.message });
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    if (req.file.size > 2 * 1024 * 1024) { fs.unlinkSync(req.file.path); return res.status(400).json({ error: 'Avatar must be under 2 MB' }); }
    try {
      const fd = fs.openSync(req.file.path, 'r');
      const hdr = Buffer.alloc(12);
      fs.readSync(fd, hdr, 0, 12, 0);
      fs.closeSync(fd);
      let validMagic = false;
      if (req.file.mimetype === 'image/jpeg') validMagic = hdr[0] === 0xFF && hdr[1] === 0xD8 && hdr[2] === 0xFF;
      else if (req.file.mimetype === 'image/png') validMagic = hdr[0] === 0x89 && hdr[1] === 0x50 && hdr[2] === 0x4E && hdr[3] === 0x47;
      else if (req.file.mimetype === 'image/gif') validMagic = hdr.slice(0, 6).toString().startsWith('GIF8');
      else if (req.file.mimetype === 'image/webp') validMagic = hdr.slice(0, 4).toString() === 'RIFF' && hdr.slice(8, 12).toString() === 'WEBP';
      if (!validMagic) { fs.unlinkSync(req.file.path); return res.status(400).json({ error: 'Invalid image' }); }
    } catch { try { fs.unlinkSync(req.file.path); } catch {} return res.status(400).json({ error: 'Failed to validate' }); }
    const avatarUrl = `/uploads/${req.file.filename}`;
    const { getDb } = require('./src/database');
    getDb().prepare('UPDATE users SET avatar = ? WHERE id = ?').run(avatarUrl, user.id);
    res.json({ url: avatarUrl });
  });
});

function getGiphyKey() {
  try {
    const { getDb } = require('./src/database');
    const row = getDb().prepare("SELECT value FROM server_settings WHERE key = 'giphy_api_key'").get();
    if (row && row.value) return row.value;
  } catch {}
  return process.env.GIPHY_API_KEY || '';
}
const gifLimitStore = new Map();
function gifLimiter(req, res, next) {
  const ip = req.ip || req.socket.remoteAddress;
  const now = Date.now();
  const windowMs = 60 * 1000;
  const maxReqs = 30;
  if (!gifLimitStore.has(ip)) gifLimitStore.set(ip, []);
  const stamps = gifLimitStore.get(ip).filter(t => now - t < windowMs);
  gifLimitStore.set(ip, stamps);
  if (stamps.length >= maxReqs) return res.status(429).json({ error: 'Rate limited' });
  stamps.push(now);
  next();
}
setInterval(() => { const now = Date.now(); for (const [ip, t] of gifLimitStore) { const f = t.filter(x => now - x < 60000); if (!f.length) gifLimitStore.delete(ip); else gifLimitStore.set(ip, f); } }, 5 * 60 * 1000);
app.get('/api/gif/giphy/search', gifLimiter, (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  const user = token ? verifyToken(token) : null;
  if (!user) return res.status(401).json({ error: 'Unauthorized' });
  const key = getGiphyKey();
  if (!key) return res.status(501).json({ error: 'giphy_not_configured' });
  const q = (req.query.q || '').trim().slice(0, 100);
  if (!q) return res.status(400).json({ error: 'Missing search query' });
  const limit = Math.min(parseInt(req.query.limit) || 20, 50);
  const url = `https://api.giphy.com/v1/gifs/search?api_key=${key}&q=${encodeURIComponent(q)}&limit=${limit}&rating=r`;
  fetch(url).then(r => r.json()).then(data => {
    const results = (data.data || []).map(g => ({
      id: g.id, title: g.title || '',
      tiny: g.images?.fixed_width_small?.url || g.images?.preview_gif?.url || '',
      full: g.images?.original?.url || g.images?.downsized?.url || '',
    }));
    res.json({ results, provider: 'giphy' });
  }).catch(() => res.status(502).json({ error: 'Giphy API error' }));
});
app.get('/api/gif/giphy/trending', gifLimiter, (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  const user = token ? verifyToken(token) : null;
  if (!user) return res.status(401).json({ error: 'Unauthorized' });
  const key = getGiphyKey();
  if (!key) return res.status(501).json({ error: 'giphy_not_configured' });
  const limit = Math.min(parseInt(req.query.limit) || 20, 50);
  const url = `https://api.giphy.com/v1/gifs/trending?api_key=${key}&limit=${limit}&rating=r`;
  fetch(url).then(r => r.json()).then(data => {
    const results = (data.data || []).map(g => ({
      id: g.id, title: g.title || '',
      tiny: g.images?.fixed_width_small?.url || g.images?.preview_gif?.url || '',
      full: g.images?.original?.url || g.images?.downsized?.url || '',
    }));
    res.json({ results, provider: 'giphy' });
  }).catch(() => res.status(502).json({ error: 'Giphy API error' }));
});
function getSpotifyCredentials() {
  try {
    const { getDb } = require('./src/database');
    const clientId = getDb().prepare("SELECT value FROM server_settings WHERE key = 'spotify_client_id'").get();
    const clientSecret = getDb().prepare("SELECT value FROM server_settings WHERE key = 'spotify_client_secret'").get();
    return { clientId: clientId?.value || process.env.SPOTIFY_CLIENT_ID || '', clientSecret: clientSecret?.value || process.env.SPOTIFY_CLIENT_SECRET || '' };
  } catch { return { clientId: '', clientSecret: '' }; }
}
app.get('/api/spotify/auth-url', (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  const user = token ? verifyToken(token) : null;
  if (!user) return res.status(401).json({ error: 'Unauthorized' });
  const { clientId } = getSpotifyCredentials();
  if (!clientId) return res.status(501).json({ error: 'spotify_not_configured' });
  const redirectUri = `${req.protocol}://${req.get('host')}/api/spotify/callback`;
  const scopes = 'streaming user-read-email user-read-private user-modify-playback-state user-read-playback-state';
  const state = Buffer.from(JSON.stringify({ userId: user.id, ts: Date.now() })).toString('base64url');
  const authUrl = `https://accounts.spotify.com/authorize?client_id=${clientId}&response_type=code&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scopes)}&state=${state}`;
  res.json({ url: authUrl });
});
app.get('/api/spotify/callback', async (req, res) => {
  const { code, state, error } = req.query;
  if (error) return res.redirect('/app?spotify_error=' + encodeURIComponent(error));
  if (!code || !state) return res.redirect('/app?spotify_error=missing_params');
  let stateData;
  try { stateData = JSON.parse(Buffer.from(state, 'base64url').toString()); } catch { return res.redirect('/app?spotify_error=invalid_state'); }
  if (Date.now() - stateData.ts > 10 * 60 * 1000) return res.redirect('/app?spotify_error=expired');
  const { clientId, clientSecret } = getSpotifyCredentials();
  const redirectUri = `${req.protocol}://${req.get('host')}/api/spotify/callback`;
  const tokenRes = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded', Authorization: 'Basic ' + Buffer.from(`${clientId}:${clientSecret}`).toString('base64') },
    body: `grant_type=authorization_code&code=${code}&redirect_uri=${encodeURIComponent(redirectUri)}`
  }).catch(() => null);
  if (!tokenRes || !tokenRes.ok) return res.redirect('/app?spotify_error=token_failed');
  const tokens = await tokenRes.json();
  const profileRes = await fetch('https://api.spotify.com/v1/me', { headers: { Authorization: `Bearer ${tokens.access_token}` } }).catch(() => null);
  const profile = profileRes?.ok ? await profileRes.json() : {};
  const { getDb } = require('./src/database');
  const expiresAt = Math.floor(Date.now() / 1000) + (tokens.expires_in || 3600);
  getDb().prepare(`INSERT INTO spotify_tokens (user_id, access_token, refresh_token, expires_at, product, display_name, updated_at) VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP) ON CONFLICT(user_id) DO UPDATE SET access_token = excluded.access_token, refresh_token = excluded.refresh_token, expires_at = excluded.expires_at, product = excluded.product, display_name = excluded.display_name, updated_at = CURRENT_TIMESTAMP`).run(stateData.userId, tokens.access_token, tokens.refresh_token, expiresAt, profile.product || 'free', profile.display_name || '');
  res.redirect('/app?spotify_linked=1');
});
app.get('/api/spotify/token', async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  const user = token ? verifyToken(token) : null;
  if (!user) return res.status(401).json({ error: 'Unauthorized' });
  const { getDb } = require('./src/database');
  const row = getDb().prepare('SELECT * FROM spotify_tokens WHERE user_id = ?').get(user.id);
  if (!row) return res.status(404).json({ error: 'not_linked' });
  const now = Math.floor(Date.now() / 1000);
  if (row.expires_at <= now + 300) {
    const { clientId, clientSecret } = getSpotifyCredentials();
    const refreshRes = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded', Authorization: 'Basic ' + Buffer.from(`${clientId}:${clientSecret}`).toString('base64') },
      body: `grant_type=refresh_token&refresh_token=${row.refresh_token}`
    }).catch(() => null);
    if (!refreshRes?.ok) return res.status(401).json({ error: 'refresh_failed' });
    const newTokens = await refreshRes.json();
    const newExpires = Math.floor(Date.now() / 1000) + (newTokens.expires_in || 3600);
    getDb().prepare('UPDATE spotify_tokens SET access_token = ?, expires_at = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?').run(newTokens.access_token, newExpires, user.id);
    return res.json({ accessToken: newTokens.access_token, expiresAt: newExpires, product: row.product, displayName: row.display_name });
  }
  res.json({ accessToken: row.access_token, expiresAt: row.expires_at, product: row.product, displayName: row.display_name });
});
app.delete('/api/spotify/unlink', (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  const user = token ? verifyToken(token) : null;
  if (!user) return res.status(401).json({ error: 'Unauthorized' });
  const { getDb } = require('./src/database');
  getDb().prepare('DELETE FROM spotify_tokens WHERE user_id = ?').run(user.id);
  res.json({ success: true });
});
app.get('/api/spotify/status', (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  const user = token ? verifyToken(token) : null;
  if (!user) return res.status(401).json({ error: 'Unauthorized' });
  const { getDb } = require('./src/database');
  const row = getDb().prepare('SELECT product, display_name FROM spotify_tokens WHERE user_id = ?').get(user.id);
  const { clientId } = getSpotifyCredentials();
  res.json({ linked: !!row, premium: row?.product === 'premium', displayName: row?.display_name || null, configured: !!clientId });
});
app.get('/api/tunnel/status', (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  const u = token ? verifyToken(token) : null;
  if (!u || !u.isAdmin) return res.status(403).json({ error: 'Admin only' });
  res.json(getTunnelStatus());
});
const linkPreviewCache = new Map();
const PREVIEW_CACHE_TTL = 30 * 60 * 1000;
const PREVIEW_MAX_SIZE = 256 * 1024;
const dns = require('dns');
const { promisify } = require('util');
const dnsResolve = promisify(dns.resolve4);
const previewLimitStore = new Map();
function previewLimiter(req, res, next) {
  const ip = req.ip || req.socket.remoteAddress;
  const now = Date.now();
  const windowMs = 60 * 1000;
  const maxReqs = 30;
  if (!previewLimitStore.has(ip)) previewLimitStore.set(ip, []);
  const stamps = previewLimitStore.get(ip).filter(t => now - t < windowMs);
  previewLimitStore.set(ip, stamps);
  if (stamps.length >= maxReqs) return res.status(429).json({ error: 'Rate limited' });
  stamps.push(now);
  next();
}
setInterval(() => { const now = Date.now(); for (const [ip, t] of previewLimitStore) { const f = t.filter(x => now - x < 60000); if (!f.length) previewLimitStore.delete(ip); else previewLimitStore.set(ip, f); } }, 5 * 60 * 1000);
function isPrivateIP(ip) {
  if (!ip) return true;
  return ip === '127.0.0.1' || ip === '0.0.0.0' || ip === '::1' || ip === '::' ||
    ip.startsWith('10.') || ip.startsWith('192.168.') ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(ip) ||
    ip.startsWith('169.254.') || ip.startsWith('fc00:') || ip.startsWith('fd') ||
    ip.startsWith('fe80:');
}
app.get('/api/link-preview', previewLimiter, async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  const user = token ? verifyToken(token) : null;
  if (!user) return res.status(401).json({ error: 'Unauthorized' });
  const url = (req.query.url || '').trim();
  if (!url) return res.status(400).json({ error: 'Missing url param' });
  let parsed;
  try {
    parsed = new URL(url);
    if (!['http:', 'https:'].includes(parsed.protocol)) return res.status(400).json({ error: 'Only http/https URLs allowed' });
    const host = parsed.hostname.toLowerCase();
    if (host === 'localhost' || host === '127.0.0.1' || host === '0.0.0.0' ||
        host === '::1' || host === '[::1]' ||
        host.startsWith('10.') || host.startsWith('192.168.') ||
        /^172\.(1[6-9]|2\d|3[01])\./.test(host) ||
        host === '169.254.169.254' ||
        host.endsWith('.local') || host.endsWith('.internal')) {
      return res.status(400).json({ error: 'Private addresses not allowed' });
    }
  } catch { return res.status(400).json({ error: 'Invalid URL' }); }
  try {
    const addresses = await dnsResolve(parsed.hostname);
    if (addresses.some(isPrivateIP)) return res.status(400).json({ error: 'Private addresses not allowed' });
  } catch {}
  const cached = linkPreviewCache.get(url);
  if (cached && Date.now() - cached.ts < PREVIEW_CACHE_TTL) return res.json(cached.data);

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const resp = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'HavenBot/1.0 (link preview)',
        'Accept': 'text/html'
      },
      redirect: 'follow',
      size: PREVIEW_MAX_SIZE
    });
    clearTimeout(timeout);

    const contentType = resp.headers.get('content-type') || '';
    if (!contentType.includes('text/html')) {
      return res.json({ title: null, description: null, image: null, siteName: null });
    }

    const html = await resp.text();
    // Truncate to max size for safety
    const chunk = html.slice(0, PREVIEW_MAX_SIZE);

    const getMetaContent = (property) => {
      const ogRe = new RegExp(`<meta[^>]+(?:property|name)=["']${property}["'][^>]+content=["']([^"']+)["']`, 'i');
      const ogRe2 = new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${property}["']`, 'i');
      const m = chunk.match(ogRe) || chunk.match(ogRe2);
      return m ? m[1].trim() : null;
    };

    const titleTag = chunk.match(/<title[^>]*>([^<]+)<\/title>/i);

    const data = {
      title: getMetaContent('og:title') || getMetaContent('twitter:title') || (titleTag ? titleTag[1].trim() : null),
      description: getMetaContent('og:description') || getMetaContent('twitter:description') || getMetaContent('description'),
      image: getMetaContent('og:image') || getMetaContent('twitter:image'),
      siteName: getMetaContent('og:site_name') || new URL(url).hostname,
      url: getMetaContent('og:url') || url
    };

    linkPreviewCache.set(url, { data, ts: Date.now() });

    // Prune old cache entries if over 500
    if (linkPreviewCache.size > 500) {
      const now = Date.now();
      for (const [k, v] of linkPreviewCache) {
        if (now - v.ts > PREVIEW_CACHE_TTL) linkPreviewCache.delete(k);
      }
    }

    res.json(data);
  } catch {
    res.json({ title: null, description: null, image: null, siteName: null });
  }
});

// ── Catch-all: 404 ──────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// ── Global error handler (never leak stack traces) ──────
app.use((err, req, res, _next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Create HTTP or HTTPS server
let server;

// Resolve SSL paths: if set in .env resolve relative to DATA_DIR, otherwise auto-detect
let sslCert = process.env.SSL_CERT_PATH;
let sslKey  = process.env.SSL_KEY_PATH;

// If not explicitly configured, check if the startup scripts generated certs
if (!sslCert && !sslKey) {
  const autoCert = path.join(CERTS_DIR, 'cert.pem');
  const autoKey  = path.join(CERTS_DIR, 'key.pem');
  if (fs.existsSync(autoCert) && fs.existsSync(autoKey)) {
    sslCert = autoCert;
    sslKey  = autoKey;
  }
} else {
  // Resolve relative paths against the data directory
  if (sslCert && !path.isAbsolute(sslCert)) sslCert = path.resolve(DATA_DIR, sslCert);
  if (sslKey  && !path.isAbsolute(sslKey))  sslKey  = path.resolve(DATA_DIR, sslKey);
}

const useSSL = sslCert && sslKey;

if (useSSL) {
  try {
    const sslOptions = {
      cert: fs.readFileSync(sslCert),
      key: fs.readFileSync(sslKey)
    };
    server = createHttpsServer(sslOptions, app);
    console.log('🔒 HTTPS enabled');

    // Also start an HTTP server that redirects to HTTPS
    const httpRedirect = express();
    httpRedirect.disable('x-powered-by');
    const redirectHits = new Map();
    httpRedirect.use((req, res, next) => {
      const ip = req.ip || req.socket.remoteAddress;
      const now = Date.now();
      if (!redirectHits.has(ip)) redirectHits.set(ip, []);
      const stamps = redirectHits.get(ip).filter(t => now - t < 60000);
      redirectHits.set(ip, stamps);
      if (stamps.length > 60) return res.status(429).end('Rate limited');
      stamps.push(now);
      next();
    });
    setInterval(() => { const now = Date.now(); for (const [ip, t] of redirectHits) { const f = t.filter(x => now - x < 60000); if (!f.length) redirectHits.delete(ip); else redirectHits.set(ip, f); } }, 5 * 60 * 1000);
    const safePort = parseInt(process.env.PORT || 3000);
    httpRedirect.all('*', (req, res) => {
      const safePath = (req.url || '/').replace(/[\r\n]/g, '');
      res.redirect(301, `https://localhost:${safePort}${safePath}`);
    });
    const HTTP_REDIRECT_PORT = safePort + 1;
    const httpRedirectServer = createServer(httpRedirect);
    httpRedirectServer.headersTimeout = 5000;
    httpRedirectServer.requestTimeout = 5000;
    httpRedirectServer.listen(HTTP_REDIRECT_PORT, process.env.HOST || '0.0.0.0', () => {
      console.log(`↪️  HTTP redirect running on port ${HTTP_REDIRECT_PORT} → HTTPS`);
    });
  } catch (err) {
    console.error('Failed to load SSL certs, falling back to HTTP:', err.message);
    server = createServer(app);
  }
} else {
  server = createServer(app);
  console.log('⚠️  Running HTTP — voice chat requires HTTPS for remote connections');
}

// Socket.IO — locked down
const io = new Server(server, {
  cors: {
    origin: false,         // same-origin only — no cross-site connections
  },
  maxHttpBufferSize: 64 * 1024,  // 64KB max per message (was 1MB)
  pingTimeout: 20000,
  pingInterval: 25000,
  connectTimeout: 10000,
  // Limit simultaneous connections per IP
  connectionStateRecovery: { maxDisconnectionDuration: 2 * 60 * 1000 },
});

global.havenIO = io;
const db = initDatabase();
setupSocketHandlers(io, db);

// ── Auto-cleanup interval (runs every 15 minutes) ───────
function runAutoCleanup() {
  try {
    const getSetting = (key) => {
      const row = db.prepare('SELECT value FROM server_settings WHERE key = ?').get(key);
      return row ? row.value : null;
    };

    const enabled = getSetting('cleanup_enabled');
    if (enabled !== 'true') return;

    const maxAgeDays = parseInt(getSetting('cleanup_max_age_days') || '0');
    const maxSizeMb = parseInt(getSetting('cleanup_max_size_mb') || '0');
    let totalDeleted = 0;

    // 1. Delete messages older than N days
    if (maxAgeDays > 0) {
      // Delete reactions for old messages first
      db.prepare(`
        DELETE FROM reactions WHERE message_id IN (
          SELECT id FROM messages WHERE created_at < datetime('now', ?)
        )
      `).run(`-${maxAgeDays} days`);
      const result = db.prepare(
        "DELETE FROM messages WHERE created_at < datetime('now', ?)"
      ).run(`-${maxAgeDays} days`);
      totalDeleted += result.changes;
    }

    // 2. If total DB size exceeds maxSizeMb, trim oldest messages
    if (maxSizeMb > 0) {
      const dbPath = DB_PATH;
      const stats = require('fs').statSync(dbPath);
      const sizeMb = stats.size / (1024 * 1024);
      if (sizeMb > maxSizeMb) {
        // Delete oldest 10% of messages to bring size down
        const totalCount = db.prepare('SELECT COUNT(*) as cnt FROM messages').get().cnt;
        const deleteCount = Math.max(Math.floor(totalCount * 0.1), 100);
        const oldestIds = db.prepare(
          'SELECT id FROM messages ORDER BY created_at ASC LIMIT ?'
        ).all(deleteCount).map(r => r.id);
        if (oldestIds.length > 0) {
          const placeholders = oldestIds.map(() => '?').join(',');
          db.prepare(`DELETE FROM reactions WHERE message_id IN (${placeholders})`).run(...oldestIds);
          const result = db.prepare(`DELETE FROM messages WHERE id IN (${placeholders})`).run(...oldestIds);
          totalDeleted += result.changes;
        }
      }
    }

    // Also clean up old uploaded files if age cleanup is set
    if (maxAgeDays > 0) {
      const uploadsDir = UPLOADS_DIR;
      if (require('fs').existsSync(uploadsDir)) {
        const cutoff = Date.now() - (maxAgeDays * 24 * 60 * 60 * 1000);
        const files = require('fs').readdirSync(uploadsDir);
        let filesDeleted = 0;
        files.forEach(f => {
          try {
            const fpath = require('path').join(uploadsDir, f);
            const stat = require('fs').statSync(fpath);
            if (stat.mtimeMs < cutoff) {
              require('fs').unlinkSync(fpath);
              filesDeleted++;
            }
          } catch { /* skip */ }
        });
        if (filesDeleted > 0) {
          console.log(`🗑️  Auto-cleanup: removed ${filesDeleted} old uploaded files`);
        }
      }
    }

    if (totalDeleted > 0) {
      console.log(`🗑️  Auto-cleanup: deleted ${totalDeleted} old messages`);
    }
  } catch (err) {
    console.error('Auto-cleanup error:', err);
  }
}

// Run cleanup every 15 minutes
setInterval(runAutoCleanup, 15 * 60 * 1000);
// Also run once at startup (delayed 30s to let DB settle)
setTimeout(runAutoCleanup, 30000);
// Expose globally so socketHandlers can trigger it
global.runAutoCleanup = runAutoCleanup;

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';
const protocol = useSSL ? 'https' : 'http';
server.headersTimeout = 15000;
server.requestTimeout = 30000;
server.keepAliveTimeout = 65000;
server.timeout = 120000;
function getLocalIP() {
  const nets = require('os').networkInterfaces();
  const candidates = [];
  for (const [name, iface] of Object.entries(nets)) {
    for (const cfg of iface) {
      if (cfg.family === 'IPv4' && !cfg.internal) {
        const ip = cfg.address;
        const isLAN = ip.startsWith('192.168.') || ip.startsWith('10.') || /^172\.(1[6-9]|2\d|3[01])\./.test(ip);
        const isCGNAT = /^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./.test(ip);
        candidates.push({ ip, name, priority: isLAN ? 0 : isCGNAT ? 2 : 1 });
      }
    }
  }
  candidates.sort((a, b) => a.priority - b.priority);
  return candidates.length ? candidates[0].ip : '0.0.0.0';
}
async function getPublicIP() {
  const services = ['https://api.ipify.org', 'https://ifconfig.me/ip', 'https://icanhazip.com'];
  for (const url of services) {
    try {
      const res = await fetch(url, { timeout: 3000 });
      if (res.ok) { const ip = (await res.text()).trim(); if (/^\d+\.\d+\.\d+\.\d+$/.test(ip)) return ip; }
    } catch {}
  }
  return null;
}
server.listen(PORT, HOST, async () => {
  const localIP = getLocalIP();
  const publicIP = await getPublicIP();
  console.log(`
╔══════════════════════════════════════════╗
║       🏠  HAVEN is running               ║
╠══════════════════════════════════════════╣
║  Name:    ${(process.env.SERVER_NAME || 'Haven').padEnd(29)}║
║  Local:   ${protocol}://localhost:${PORT}             ║
║  LAN:     ${(protocol + '://' + localIP + ':' + PORT).padEnd(31)}║
║  Public:  ${(publicIP ? protocol + '://' + publicIP + ':' + PORT : 'Could not detect').padEnd(31)}║
║  Admin:   ${(process.env.ADMIN_USERNAME || 'admin').padEnd(29)}║
║  Cipher:  Standard (AES-256)             ║
╚══════════════════════════════════════════╝
  `);
  try {
    const { getDb } = require('./src/database');
    const tunRow = getDb().prepare("SELECT value FROM server_settings WHERE key = 'tunnel_enabled'").get();
    if (tunRow && tunRow.value === 'true') {
      const url = await startTunnel(PORT);
      if (url) console.log(`🌐 Tunnel active: ${url}`);
    }
  } catch {}
});
