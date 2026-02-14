const crypto = require('crypto');
const express = require('express');
const { getDb } = require('./database');
const router = express.Router();
const botRateStore = new Map();
function botRateLimiter(req, res, next) {
  const t = req.params.token || req.ip;
  const now = Date.now(), w = 60000, max = 30;
  if (!botRateStore.has(t)) botRateStore.set(t, []);
  const s = botRateStore.get(t).filter(x => now - x < w);
  botRateStore.set(t, s);
  if (s.length >= max) return res.status(429).json({ error: 'Rate limited' });
  s.push(now); next();
}
function generateBotToken() { return 'hvn_' + crypto.randomBytes(24).toString('hex'); }
function discordColorToHex(c) { return c ? `#${c.toString(16).padStart(6,'0')}` : '#5865f2'; }
function embedsToHtml(embeds) {
  if (!Array.isArray(embeds) || !embeds.length) return null;
  return embeds.map(e => {
    const col = discordColorToHex(e.color);
    let h = `<div class="embed" style="border-left:4px solid ${col};background:var(--bg-tertiary);padding:12px;border-radius:4px;margin:4px 0">`;
    if (e.title) h += `<div class="embed-title" style="font-weight:600;color:var(--text-primary);margin-bottom:8px">${escapeHtml(e.title)}</div>`;
    if (e.description) h += `<div class="embed-desc" style="color:var(--text-secondary);margin-bottom:8px">${escapeHtml(e.description)}</div>`;
    if (e.fields && e.fields.length) {
      h += '<div class="embed-fields" style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px">';
      e.fields.forEach(f => {
        const w = f.inline ? 'auto' : '100%';
        h += `<div style="grid-column:${f.inline?'auto':'1/-1'}"><div style="font-size:11px;color:var(--text-muted);text-transform:uppercase">${escapeHtml(f.name)}</div><div style="color:var(--text-primary)">${escapeHtml(f.value).replace(/`([^`]+)`/g,'<code>$1</code>')}</div></div>`;
      });
      h += '</div>';
    }
    if (e.footer && e.footer.text) h += `<div class="embed-footer" style="font-size:11px;color:var(--text-muted);margin-top:8px">${escapeHtml(e.footer.text)}</div>`;
    h += '</div>';
    return h;
  }).join('');
}
function escapeHtml(str) { return String(str||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
router.post('/webhook/:token', botRateLimiter, (req, res) => {
  const db = getDb();
  const bot = db.prepare('SELECT * FROM bots WHERE token = ? AND is_active = 1').get(req.params.token);
  if (!bot) return res.status(401).json({ error: 'Invalid bot token' });
  const { channelCode, content, embeds, username } = req.body || {};
  if (!channelCode) return res.status(400).json({ error: 'channelCode required' });
  let msgContent = '';
  if (embeds && Array.isArray(embeds) && embeds.length) msgContent = embedsToHtml(embeds);
  else if (content && typeof content === 'string') msgContent = escapeHtml(content.trim());
  if (!msgContent) return res.status(400).json({ error: 'content or embeds required' });
  if (msgContent.length > 8000) return res.status(400).json({ error: 'Content too long (max 8000)' });
  const channel = db.prepare('SELECT id FROM channels WHERE code = ?').get(channelCode);
  if (!channel) return res.status(404).json({ error: 'Channel not found' });
  const isHtml = !!(embeds && embeds.length);
  const result = db.prepare(
    'INSERT INTO messages (channel_id, user_id, content, is_bot, is_html) VALUES (?, ?, ?, 1, ?)'
  ).run(channel.id, bot.created_by, msgContent, isHtml ? 1 : 0);
  const displayName = username ? `🤖 ${username}` : `🤖 ${bot.name}`;
  const message = {
    id: result.lastInsertRowid, content: msgContent, created_at: new Date().toISOString(),
    username: displayName, user_id: bot.created_by, reply_to: null, replyContext: null,
    reactions: [], edited_at: null, is_bot: true, bot_name: bot.name, is_html: isHtml
  };
  if (global.havenIO) {
    global.havenIO.to(`channel:${channelCode}`).emit('new-message', { channelCode, message });
  }
  res.json({ success: true, messageId: result.lastInsertRowid });
});
router.get('/info/:token', (req, res) => {
  const db = getDb();
  const bot = db.prepare('SELECT id, name, is_active, created_at FROM bots WHERE token = ?').get(req.params.token);
  if (!bot) return res.status(401).json({ error: 'Invalid bot token' });
  res.json(bot);
});
function setupBotSocketHandlers(socket, db) {
  socket.on('create-bot', (data) => {
    if (!socket.user.isAdmin) return socket.emit('error-msg', 'Only admins can create bots');
    if (!data || typeof data.name !== 'string' || data.name.trim().length < 1) return socket.emit('error-msg', 'Bot name required');
    const name = data.name.trim().slice(0, 30);
    const token = generateBotToken();
    try {
      const result = db.prepare('INSERT INTO bots (name, token, created_by) VALUES (?, ?, ?)').run(name, token, socket.user.id);
      socket.emit('bot-created', { id: result.lastInsertRowid, name, token });
      socket.emit('error-msg', `Bot "${name}" created! Token: ${token}`);
      const bots = db.prepare('SELECT id, name, is_active, created_at FROM bots ORDER BY created_at DESC').all();
      socket.emit('bot-list', bots);
    } catch (err) { socket.emit('error-msg', 'Failed to create bot'); }
  });
  socket.on('delete-bot', (data) => {
    if (!socket.user.isAdmin) return socket.emit('error-msg', 'Only admins can delete bots');
    if (!data || !Number.isInteger(data.botId)) return;
    db.prepare('DELETE FROM bots WHERE id = ?').run(data.botId);
    socket.emit('error-msg', 'Bot deleted');
    const bots = db.prepare('SELECT id, name, is_active, created_at FROM bots ORDER BY created_at DESC').all();
    socket.emit('bot-list', bots);
  });
  socket.on('toggle-bot', (data) => {
    if (!socket.user.isAdmin) return socket.emit('error-msg', 'Only admins can toggle bots');
    if (!data || !Number.isInteger(data.botId)) return;
    const bot = db.prepare('SELECT is_active FROM bots WHERE id = ?').get(data.botId);
    if (!bot) return;
    db.prepare('UPDATE bots SET is_active = ? WHERE id = ?').run(bot.is_active ? 0 : 1, data.botId);
    const bots = db.prepare('SELECT id, name, is_active, created_at FROM bots ORDER BY created_at DESC').all();
    socket.emit('bot-list', bots);
  });
  socket.on('get-bots', () => {
    if (!socket.user.isAdmin) return;
    const bots = db.prepare('SELECT id, name, is_active, created_at FROM bots ORDER BY created_at DESC').all();
    socket.emit('bot-list', bots);
  });
}
module.exports = { router, setupBotSocketHandlers, generateBotToken };
