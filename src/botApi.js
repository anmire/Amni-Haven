const crypto = require('crypto');
const express = require('express');
const { getDb } = require('./database');
const router = express.Router();
function generateBotToken() { return 'hvn_' + crypto.randomBytes(24).toString('hex'); }
router.post('/webhook/:token', (req, res) => {
  const db = getDb();
  const bot = db.prepare('SELECT * FROM bots WHERE token = ? AND is_active = 1').get(req.params.token);
  if (!bot) return res.status(401).json({ error: 'Invalid bot token' });
  const { channelCode, content } = req.body || {};
  if (!channelCode || !content || typeof content !== 'string') return res.status(400).json({ error: 'channelCode and content required' });
  if (content.length > 2000) return res.status(400).json({ error: 'Content too long (max 2000)' });
  const channel = db.prepare('SELECT id FROM channels WHERE code = ?').get(channelCode);
  if (!channel) return res.status(404).json({ error: 'Channel not found' });
  const result = db.prepare(
    'INSERT INTO messages (channel_id, user_id, content, is_bot) VALUES (?, ?, ?, 1)'
  ).run(channel.id, bot.created_by, content.trim());
  const message = {
    id: result.lastInsertRowid, content: content.trim(), created_at: new Date().toISOString(),
    username: `🤖 ${bot.name}`, user_id: bot.created_by, reply_to: null, replyContext: null,
    reactions: [], edited_at: null, is_bot: true, bot_name: bot.name
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
