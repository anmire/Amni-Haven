const { verifyToken, generateChannelCode, generateToken } = require('./auth');
const crypto = require('crypto');
const { setupBotSocketHandlers } = require('./botApi');

// ── Input validation helpers ────────────────────────────
function isString(v, min = 0, max = Infinity) {
  return typeof v === 'string' && v.length >= min && v.length <= max;
}

function isInt(v) {
  return Number.isInteger(v);
}

function setupSocketHandlers(io, db) {
  const ADMIN_USERNAME = (process.env.ADMIN_USERNAME || 'admin').toLowerCase();

  // ── Socket connection rate limiting (per IP) ────────────
  const connTracker = new Map(); // ip → { count, resetTime }
  const MAX_CONN_PER_MIN = 15;

  io.use((socket, next) => {
    const ip = socket.handshake.address;
    const now = Date.now();

    if (!connTracker.has(ip)) {
      connTracker.set(ip, { count: 0, resetTime: now + 60000 });
    }

    const entry = connTracker.get(ip);
    if (now > entry.resetTime) {
      entry.count = 0;
      entry.resetTime = now + 60000;
    }

    entry.count++;
    if (entry.count > MAX_CONN_PER_MIN) {
      return next(new Error('Rate limited — too many connections'));
    }

    next();
  });

  // ── Auth middleware ───────────────────────────────────────
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token || typeof token !== 'string') return next(new Error('Authentication required'));

    const user = verifyToken(token);
    if (!user) return next(new Error('Invalid token'));

    // Check if user is banned
    const ban = db.prepare('SELECT id FROM bans WHERE user_id = ?').get(user.id);
    if (ban) return next(new Error('You have been banned from this server'));

    socket.user = user;
    try {
      const uRow = db.prepare('SELECT display_name, is_admin, username, avatar FROM users WHERE id = ?').get(user.id);
      socket.user.displayName = (uRow && uRow.display_name) ? uRow.display_name : user.username;
      socket.user.avatar = uRow?.avatar || null;
      if (uRow) {
        const shouldBeAdmin = uRow.username.toLowerCase() === ADMIN_USERNAME ? 1 : 0;
        if (uRow.is_admin !== shouldBeAdmin) {
          db.prepare('UPDATE users SET is_admin = ? WHERE id = ?').run(shouldBeAdmin, user.id);
        }
        socket.user.isAdmin = !!shouldBeAdmin;
      }
    } catch {
      socket.user.displayName = user.displayName || user.username;
    }
    next();
  });

  // Clean up connection tracker every 5 min
  setInterval(() => {
    const now = Date.now();
    for (const [ip, entry] of connTracker) {
      if (now > entry.resetTime + 120000) connTracker.delete(ip);
    }
  }, 5 * 60 * 1000);

  // Online tracking:  code → Map<userId, { id, username, socketId }>
  const channelUsers = new Map();
  const voiceUsers = new Map();
  const globalOnline = new Map();
  function emitGlobalOnlineCount() { io.emit('global-online-count', globalOnline.size); }

  io.on('connection', (socket) => {
    // Guard: if auth middleware somehow didn't attach user, disconnect
    if (!socket.user || !socket.user.username) {
      console.warn('⚠️  Connection without valid user — disconnecting');
      socket.disconnect(true);
      return;
    }

    console.log(`✅ ${socket.user.username} connected`);
    socket.currentChannel = null;
    globalOnline.set(socket.user.id, socket.user.username);
    emitGlobalOnlineCount();
    socket.emit('session-info', {
      id: socket.user.id,
      username: socket.user.username,
      isAdmin: socket.user.isAdmin,
      displayName: socket.user.displayName,
      avatar: socket.user.avatar || null
    });

    // ── Per-socket flood protection ─────────────────────────
    const floodBuckets = { message: [], event: [] };
    const FLOOD_LIMITS = {
      message: { max: 10, windowMs: 10000 },  // 10 msgs per 10s
      event:   { max: 60, windowMs: 10000 },  // 60 events per 10s (total)
    };

    function floodCheck(bucket) {
      const limit = FLOOD_LIMITS[bucket];
      const now = Date.now();
      const timestamps = floodBuckets[bucket].filter(t => now - t < limit.windowMs);
      floodBuckets[bucket] = timestamps;

      if (timestamps.length >= limit.max) {
        return true; // flooded
      }
      timestamps.push(now);
      return false;
    }

    // Global event counter — disconnect if spamming
    socket.use((packet, next) => {
      if (floodCheck('event')) {
        socket.emit('error-msg', 'Slow down — too many requests');
        return; // drop the event silently
      }
      next();
    });

    // ── Get user's channels ─────────────────────────────────
    socket.on('get-channels', () => {
      const query = socket.user.isAdmin
        ? `SELECT c.id, c.name, c.code, c.created_by, c.channel_type, c.parent_id, c.is_private FROM channels c JOIN channel_members cm ON c.id = cm.channel_id WHERE cm.user_id = ? ORDER BY c.name`
        : `SELECT DISTINCT c.id, c.name, c.code, c.created_by, c.channel_type, c.parent_id, c.is_private FROM channels c JOIN channel_members cm ON c.id = cm.channel_id LEFT JOIN channel_permissions cp ON c.id = cp.channel_id AND cp.user_id = ? WHERE cm.user_id = ? AND (c.is_private = 0 OR c.is_private IS NULL OR cp.user_id IS NOT NULL) ORDER BY c.name`;
      const channels = socket.user.isAdmin ? db.prepare(query).all(socket.user.id) : db.prepare(query).all(socket.user.id, socket.user.id);
      channels.forEach(ch => socket.join(`channel:${ch.code}`));
      socket.emit('channels-list', channels);
    });

    // ── Create channel (admin only) ─────────────────────────
    socket.on('create-channel', (data) => {
      if (!data || typeof data !== 'object') return;
      if (!socket.user.isAdmin) {
        return socket.emit('error-msg', 'Only admins can create channels');
      }

      const name = typeof data.name === 'string' ? data.name.trim() : '';
      if (!name || name.length === 0) {
        return socket.emit('error-msg', 'Channel name required');
      }
      if (name.length > 50) {
        return socket.emit('error-msg', 'Channel name too long (max 50)');
      }
      // Only allow safe characters in channel names
      if (!/^[\w\s\-!?.,']+$/i.test(name)) {
        return socket.emit('error-msg', 'Channel name contains invalid characters');
      }

      const channelType = typeof data.type === 'string' && ['text','voice','both'].includes(data.type) ? data.type : 'both';
      const parentId = typeof data.parentId === 'number' ? data.parentId : null;
      const isPrivate = data.isPrivate ? 1 : 0;
      if (parentId) {
        const parent = db.prepare('SELECT id FROM channels WHERE id = ?').get(parentId);
        if (!parent) return socket.emit('error-msg', 'Parent channel not found');
      }
      const code = generateChannelCode();
      try {
        const result = db.prepare(
          'INSERT INTO channels (name, code, created_by, channel_type, parent_id, is_private) VALUES (?, ?, ?, ?, ?, ?)'
        ).run(name.trim(), code, socket.user.id, channelType, parentId, isPrivate);

        // Auto-join creator
        db.prepare(
          'INSERT INTO channel_members (channel_id, user_id) VALUES (?, ?)'
        ).run(result.lastInsertRowid, socket.user.id);

        const channel = {
          id: result.lastInsertRowid,
          name: name.trim(),
          code,
          created_by: socket.user.id,
          channel_type: channelType,
          parent_id: parentId,
          is_private: isPrivate
        };

        socket.join(`channel:${code}`);
        socket.emit('channel-created', channel);
      } catch (err) {
        console.error('Create channel error:', err);
        socket.emit('error-msg', 'Failed to create channel');
      }
    });

    // ── Join channel by code ────────────────────────────────
    socket.on('join-channel', (data) => {
      if (!data || typeof data !== 'object') return;
      const code = typeof data.code === 'string' ? data.code.trim() : '';
      if (!code || !/^[a-f0-9]{8}$/i.test(code)) {
        return socket.emit('error-msg', 'Invalid channel code format');
      }

      const channel = db.prepare('SELECT * FROM channels WHERE code = ?').get(code);
      if (!channel) {
        return socket.emit('error-msg', 'Invalid channel code — double-check it');
      }
      if (channel.is_private && !socket.user.isAdmin) {
        const hasPerm = db.prepare('SELECT 1 FROM channel_permissions WHERE channel_id = ? AND user_id = ?').get(channel.id, socket.user.id);
        if (!hasPerm) return socket.emit('error-msg', 'You need permission to join this channel');
      }
      const membership = db.prepare(
        'SELECT * FROM channel_members WHERE channel_id = ? AND user_id = ?'
      ).get(channel.id, socket.user.id);

      if (!membership) {
        db.prepare(
          'INSERT INTO channel_members (channel_id, user_id) VALUES (?, ?)'
        ).run(channel.id, socket.user.id);
      }

      socket.join(`channel:${code}`);

      // Notify channel
      io.to(`channel:${code}`).emit('user-joined', {
        channelCode: code,
        user: { id: socket.user.id, username: socket.user.username }
      });

      // Send channel info to joiner
      socket.emit('channel-joined', {
        id: channel.id,
        name: channel.name,
        code: channel.code,
        created_by: channel.created_by
      });
    });

    // ── Switch active channel ───────────────────────────────
    socket.on('enter-channel', (data) => {
      if (!data || typeof data !== 'object') return;
      const code = typeof data.code === 'string' ? data.code.trim() : '';
      if (!code || !/^[a-f0-9]{8}$/i.test(code)) return;

      // Verify membership before allowing channel access
      const ch = db.prepare('SELECT id FROM channels WHERE code = ?').get(code);
      if (!ch) return;
      const isMember = db.prepare(
        'SELECT 1 FROM channel_members WHERE channel_id = ? AND user_id = ?'
      ).get(ch.id, socket.user.id);
      if (!isMember) return socket.emit('error-msg', 'Not a member of this channel');

      // Remove from previous channel's online tracking
      if (socket.currentChannel && socket.currentChannel !== code) {
        const prevUsers = channelUsers.get(socket.currentChannel);
        if (prevUsers) {
          prevUsers.delete(socket.user.id);
          emitOnlineUsers(socket.currentChannel);
        }
      }

      socket.currentChannel = code;
      socket.join(`channel:${code}`);
      const userRow = db.prepare('SELECT display_name FROM users WHERE id = ?').get(socket.user.id);
      const displayName = userRow?.display_name || null;
      socket.user.displayName = displayName;
      if (!channelUsers.has(code)) channelUsers.set(code, new Map());
      channelUsers.get(code).set(socket.user.id, {
        id: socket.user.id,
        username: socket.user.username,
        displayName,
        socketId: socket.id
      });

      // Broadcast online users
      emitOnlineUsers(code);
    });

    // ── Get message history ─────────────────────────────────
    socket.on('get-messages', (data) => {
      if (!data || typeof data !== 'object') return;
      const code = typeof data.code === 'string' ? data.code.trim() : '';
      if (!code || !/^[a-f0-9]{8}$/i.test(code)) return;
      const before = isInt(data.before) ? data.before : null;
      const limit = isInt(data.limit) && data.limit > 0 && data.limit <= 100 ? data.limit : 80;

      const channel = db.prepare('SELECT id FROM channels WHERE code = ?').get(code);
      if (!channel) return;

      const member = db.prepare(
        'SELECT 1 FROM channel_members WHERE channel_id = ? AND user_id = ?'
      ).get(channel.id, socket.user.id);
      if (!member) return socket.emit('error-msg', 'Not a member of this channel');

      let messages;
      if (before) {
        messages = db.prepare(`
          SELECT m.id, m.content, m.created_at, m.reply_to, m.edited_at, m.is_html,
                 COALESCE(u.username, '[Deleted User]') as username, u.display_name as displayName, u.id as user_id
          FROM messages m LEFT JOIN users u ON m.user_id = u.id
          WHERE m.channel_id = ? AND m.id < ?
          ORDER BY m.created_at DESC LIMIT ?
        `).all(channel.id, before, limit);
      } else {
        messages = db.prepare(`
          SELECT m.id, m.content, m.created_at, m.reply_to, m.edited_at, m.is_html,
                 COALESCE(u.username, '[Deleted User]') as username, u.display_name as displayName, u.id as user_id
          FROM messages m LEFT JOIN users u ON m.user_id = u.id
          WHERE m.channel_id = ?
          ORDER BY m.created_at DESC LIMIT ?
        `).all(channel.id, limit);
      }

      // Attach reply context and reactions to each message
      const getReplyStmt = db.prepare(`
        SELECT m.id, m.content, COALESCE(u.username, '[Deleted User]') as username FROM messages m
        LEFT JOIN users u ON m.user_id = u.id WHERE m.id = ?
      `);
      const getReactionsStmt = db.prepare(`
        SELECT r.emoji, r.user_id, u.username FROM reactions r
        JOIN users u ON r.user_id = u.id WHERE r.message_id = ?
      `);

      const isPinnedStmt = db.prepare(
        'SELECT 1 FROM pinned_messages WHERE message_id = ?'
      );

      const enriched = messages.map(m => {
        const obj = { ...m };
        if (m.reply_to) {
          obj.replyContext = getReplyStmt.get(m.reply_to) || null;
        }
        obj.reactions = getReactionsStmt.all(m.id);
        obj.pinned = !!isPinnedStmt.get(m.id);
        return obj;
      });

      socket.emit('message-history', {
        channelCode: code,
        messages: enriched.reverse()
      });
    });

    // ── Search messages ─────────────────────────────────────
    socket.on('search-messages', (data) => {
      if (!data || typeof data !== 'object') return;
      const code = typeof data.code === 'string' ? data.code.trim() : '';
      const query = typeof data.query === 'string' ? data.query.trim() : '';
      if (!code || !query || query.length < 2) return;

      const channel = db.prepare('SELECT id FROM channels WHERE code = ?').get(code);
      if (!channel) return;

      const member = db.prepare(
        'SELECT 1 FROM channel_members WHERE channel_id = ? AND user_id = ?'
      ).get(channel.id, socket.user.id);
      if (!member) return;

      const results = db.prepare(`
        SELECT m.id, m.content, m.created_at,
               COALESCE(u.username, '[Deleted User]') as username, u.display_name as displayName, u.id as user_id
        FROM messages m LEFT JOIN users u ON m.user_id = u.id
        WHERE m.channel_id = ? AND m.content LIKE ?
        ORDER BY m.created_at DESC LIMIT 25
      `).all(channel.id, `%${query}%`);

      socket.emit('search-results', { results, query });
    });

    // ── Send message ────────────────────────────────────────
    socket.on('send-message', (data) => {
      if (!data || typeof data !== 'object') return;
      const code = typeof data.code === 'string' ? data.code.trim() : '';
      const content = typeof data.content === 'string' ? data.content : '';

      if (!code || !/^[a-f0-9]{8}$/i.test(code)) return;
      if (!content || content.trim().length === 0) return;
      if (content.length > 2000) {
        return socket.emit('error-msg', 'Message too long (max 2000 characters)');
      }

      // Flood check for messages specifically
      if (floodCheck('message')) {
        return socket.emit('error-msg', 'Slow down — you\'re sending messages too fast');
      }

      // ── Mute check ───────────────────────────────────
      const activeMute = db.prepare(
        'SELECT id, expires_at FROM mutes WHERE user_id = ? AND expires_at > datetime(\'now\') ORDER BY expires_at DESC LIMIT 1'
      ).get(socket.user.id);
      if (activeMute) {
        const remaining = Math.ceil((new Date(activeMute.expires_at + 'Z') - Date.now()) / 60000);
        return socket.emit('error-msg', `You are muted for ${remaining} more minute${remaining !== 1 ? 's' : ''}`);
      }

      const channel = db.prepare('SELECT id FROM channels WHERE code = ?').get(code);
      if (!channel) return;

      const member = db.prepare(
        'SELECT 1 FROM channel_members WHERE channel_id = ? AND user_id = ?'
      ).get(channel.id, socket.user.id);
      if (!member) return socket.emit('error-msg', 'Not a member of this channel');

      // ── Slash commands ────────────────────────────────
      // Skip slash command parsing for image uploads and file paths
      const trimmed = content.trim();
      const isImage = data.isImage === true;
      const isUpload = /^\/uploads\b/i.test(trimmed);
      const isPath = trimmed.startsWith('/') && trimmed.indexOf('/', 1) !== -1;
      const slashMatch = (!isImage && !isUpload && !isPath) ? trimmed.match(/^\/([a-zA-Z]+)(?:\s+(.*))?$/) : null;
      if (slashMatch) {
        const cmd = slashMatch[1].toLowerCase();
        const arg = (slashMatch[2] || '').trim();
        const slashResult = processSlashCommand(cmd, arg, socket.user.username);
        if (slashResult) {
          const finalContent = slashResult.content;

          const result = db.prepare(
            'INSERT INTO messages (channel_id, user_id, content, reply_to) VALUES (?, ?, ?, ?)'
          ).run(channel.id, socket.user.id, finalContent, null);

          const message = {
            id: result.lastInsertRowid,
            content: finalContent,
            created_at: new Date().toISOString(),
            username: socket.user.username,
            displayName: socket.user.displayName || null,
            user_id: socket.user.id,
            reply_to: null,
            replyContext: null,
            reactions: [],
            edited_at: null
          };
          if (slashResult.tts) message.tts = true;

          io.to(`channel:${code}`).emit('new-message', { channelCode: code, message });
          return;
        }
        // Unknown command — tell the user
        return socket.emit('error-msg', `Unknown command: /${cmd}`);
      }

      const replyTo = isInt(data.replyTo) ? data.replyTo : null;

      const result = db.prepare(
        'INSERT INTO messages (channel_id, user_id, content, reply_to) VALUES (?, ?, ?, ?)'
      ).run(channel.id, socket.user.id, content.trim(), replyTo);

      const message = {
        id: result.lastInsertRowid,
        content: content.trim(),
        created_at: new Date().toISOString(),
        username: socket.user.username,
        displayName: socket.user.displayName || null,
        user_id: socket.user.id,
        reply_to: replyTo,
        replyContext: null,
        reactions: [],
        edited_at: null
      };

      // Attach reply context if replying
      if (replyTo) {
        message.replyContext = db.prepare(`
          SELECT m.id, m.content, COALESCE(u.username, '[Deleted User]') as username FROM messages m
          LEFT JOIN users u ON m.user_id = u.id WHERE m.id = ?
        `).get(replyTo) || null;
      }

      io.to(`channel:${code}`).emit('new-message', { channelCode: code, message });
    });

    // ── Typing indicator ────────────────────────────────────
    socket.on('typing', (data) => {
      if (!data || typeof data !== 'object') return;
      if (!isString(data.code, 8, 8)) return;
      socket.to(`channel:${data.code}`).emit('user-typing', {
        channelCode: data.code,
        username: socket.user.displayName || socket.user.username
      });
    });

    // ── Ping / latency measurement ──────────────────────────
    socket.on('ping-check', () => {
      socket.emit('pong-check');
    });

    // ═══════════════ VOICE (WebRTC Signaling) ═══════════════

    socket.on('voice-join', (data) => {
      if (!data || typeof data !== 'object') return;
      const code = typeof data.code === 'string' ? data.code.trim() : '';
      if (!code || !/^[a-f0-9]{8}$/i.test(code)) return;

      // Verify channel membership before allowing voice
      const vch = db.prepare('SELECT id FROM channels WHERE code = ?').get(code);
      if (!vch) return;
      const vMember = db.prepare(
        'SELECT 1 FROM channel_members WHERE channel_id = ? AND user_id = ?'
      ).get(vch.id, socket.user.id);
      if (!vMember) return socket.emit('error-msg', 'Not a member of this channel');

      if (!voiceUsers.has(code)) voiceUsers.set(code, new Map());

      // Existing users before this one joins
      const existingUsers = Array.from(voiceUsers.get(code).values());

      // Add new voice user
      voiceUsers.get(code).set(socket.user.id, {
        id: socket.user.id,
        username: socket.user.username,
        socketId: socket.id
      });

      // Tell new user about existing peers (they'll create offers)
      socket.emit('voice-existing-users', {
        channelCode: code,
        users: existingUsers.map(u => ({ id: u.id, username: u.username }))
      });

      // Tell existing users about new peer (they'll expect offers)
      existingUsers.forEach(u => {
        io.to(u.socketId).emit('voice-user-joined', {
          channelCode: code,
          user: { id: socket.user.id, username: socket.user.username }
        });
      });

      // Update voice user list for the whole channel
      broadcastVoiceUsers(code);
    });

    socket.on('voice-offer', (data) => {
      if (!data || typeof data !== 'object') return;
      if (!isString(data.code, 8, 8) || !isInt(data.targetUserId) || !data.offer) return;
      const target = voiceUsers.get(data.code)?.get(data.targetUserId);
      if (target) {
        io.to(target.socketId).emit('voice-offer', {
          from: { id: socket.user.id, username: socket.user.username },
          offer: data.offer,
          channelCode: data.code
        });
      }
    });

    socket.on('voice-answer', (data) => {
      if (!data || typeof data !== 'object') return;
      if (!isString(data.code, 8, 8) || !isInt(data.targetUserId) || !data.answer) return;
      const target = voiceUsers.get(data.code)?.get(data.targetUserId);
      if (target) {
        io.to(target.socketId).emit('voice-answer', {
          from: { id: socket.user.id, username: socket.user.username },
          answer: data.answer,
          channelCode: data.code
        });
      }
    });

    socket.on('voice-ice-candidate', (data) => {
      if (!data || typeof data !== 'object') return;
      if (!isString(data.code, 8, 8) || !isInt(data.targetUserId)) return;
      const target = voiceUsers.get(data.code)?.get(data.targetUserId);
      if (target) {
        io.to(target.socketId).emit('voice-ice-candidate', {
          from: { id: socket.user.id, username: socket.user.username },
          candidate: data.candidate,
          channelCode: data.code
        });
      }
    });

    socket.on('voice-leave', (data) => {
      if (!data || typeof data !== 'object') return;
      if (!isString(data.code, 8, 8)) return;
      handleVoiceLeave(socket, data.code);
    });

    // ── Screen Sharing Signaling ──────────────────────────

    socket.on('screen-share-started', (data) => {
      if (!data || typeof data !== 'object') return;
      if (!isString(data.code, 8, 8)) return;
      const voiceRoom = voiceUsers.get(data.code);
      if (!voiceRoom || !voiceRoom.has(socket.user.id)) return;
      // Broadcast to all voice users in the channel
      for (const [uid, user] of voiceRoom) {
        if (uid !== socket.user.id) {
          io.to(user.socketId).emit('screen-share-started', {
            userId: socket.user.id,
            username: socket.user.username,
            channelCode: data.code
          });
        }
      }
    });

    socket.on('screen-share-stopped', (data) => {
      if (!data || typeof data !== 'object') return;
      if (!isString(data.code, 8, 8)) return;
      const voiceRoom = voiceUsers.get(data.code);
      if (!voiceRoom || !voiceRoom.has(socket.user.id)) return;
      for (const [uid, user] of voiceRoom) {
        if (uid !== socket.user.id) {
          io.to(user.socketId).emit('screen-share-stopped', {
            userId: socket.user.id,
            channelCode: data.code
          });
        }
      }
    });

    // ═══════════════ REACTIONS ═════════════════════════════════

    socket.on('add-reaction', (data) => {
      if (!data || typeof data !== 'object') return;
      if (!isInt(data.messageId) || !isString(data.emoji, 1, 8)) return;

      // Verify the emoji is a real emoji (allow compound emojis, skin tones, ZWJ sequences)
      const allowed = /^[\p{Emoji}\p{Emoji_Component}\uFE0F\u200D]+$/u;
      if (!allowed.test(data.emoji) || data.emoji.length > 16) return;

      const code = socket.currentChannel;
      if (!code) return;

      const channel = db.prepare('SELECT id FROM channels WHERE code = ?').get(code);
      if (!channel) return;

      // Verify message belongs to this channel
      const msg = db.prepare('SELECT id FROM messages WHERE id = ? AND channel_id = ?').get(data.messageId, channel.id);
      if (!msg) return;

      try {
        db.prepare(
          'INSERT OR IGNORE INTO reactions (message_id, user_id, emoji, gif_url) VALUES (?, ?, ?, ?)'
        ).run(data.messageId, socket.user.id, data.emoji, data.gifUrl || null);
        const reactions = db.prepare(`
          SELECT r.emoji, r.user_id, u.username, r.gif_url FROM reactions r
          JOIN users u ON r.user_id = u.id WHERE r.message_id = ?
        `).all(data.messageId);

        io.to(`channel:${code}`).emit('reactions-updated', {
          channelCode: code,
          messageId: data.messageId,
          reactions
        });
      } catch { /* duplicate — ignore */ }
    });

    socket.on('remove-reaction', (data) => {
      if (!data || typeof data !== 'object') return;
      if (!isInt(data.messageId) || !isString(data.emoji, 1, 8)) return;

      const code = socket.currentChannel;
      if (!code) return;

      db.prepare(
        'DELETE FROM reactions WHERE message_id = ? AND user_id = ? AND emoji = ?'
      ).run(data.messageId, socket.user.id, data.emoji);

      const reactions = db.prepare(`
        SELECT r.emoji, r.user_id, u.username FROM reactions r
        JOIN users u ON r.user_id = u.id WHERE r.message_id = ?
      `).all(data.messageId);

      io.to(`channel:${code}`).emit('reactions-updated', {
        channelCode: code,
        messageId: data.messageId,
        reactions
      });
    });

    // ═══════════════ CHANNEL MEMBERS (for @mentions) ═════════

    socket.on('get-channel-members', (data) => {
      if (!data || typeof data !== 'object') return;
      const code = typeof data.code === 'string' ? data.code.trim() : '';
      if (!code || !/^[a-f0-9]{8}$/i.test(code)) return;

      const channel = db.prepare('SELECT id FROM channels WHERE code = ?').get(code);
      if (!channel) return;

      const member = db.prepare(
        'SELECT 1 FROM channel_members WHERE channel_id = ? AND user_id = ?'
      ).get(channel.id, socket.user.id);
      if (!member) return;

      const members = db.prepare(`
        SELECT u.id, u.username FROM users u
        JOIN channel_members cm ON u.id = cm.user_id
        WHERE cm.channel_id = ?
        ORDER BY u.username
      `).all(channel.id);

      socket.emit('channel-members', { channelCode: code, members });
    });

    // ═══════════════ USERNAME RENAME ══════════════════

    socket.on('rename-user', (data) => {
      if (!data || typeof data !== 'object') return;
      const newName = typeof data.username === 'string' ? data.username.trim() : '';

      if (!newName || newName.length < 3 || newName.length > 20) {
        return socket.emit('error-msg', 'Username must be 3-20 characters');
      }
      if (!/^[a-zA-Z0-9_]+$/.test(newName)) {
        return socket.emit('error-msg', 'Letters, numbers, and underscores only');
      }

      // Check if name is taken by someone else
      const existing = db.prepare(
        'SELECT id FROM users WHERE username = ? COLLATE NOCASE AND id != ?'
      ).get(newName, socket.user.id);
      if (existing) {
        return socket.emit('error-msg', 'Username already taken');
      }

      try {
        db.prepare('UPDATE users SET username = ? WHERE id = ?').run(newName, socket.user.id);
      } catch (err) {
        console.error('Rename error:', err);
        return socket.emit('error-msg', 'Failed to update username');
      }

      // Block renaming to the admin username (privilege escalation prevention)
      const adminName = (process.env.ADMIN_USERNAME || 'admin').toLowerCase();
      if (newName.toLowerCase() === adminName && socket.user.id !== db.prepare('SELECT id FROM users WHERE username = ? COLLATE NOCASE').get(adminName)?.id) {
        return socket.emit('error-msg', 'That username is reserved');
      }

      const oldName = socket.user.username;
      socket.user.username = newName;

      // Issue fresh JWT with new username
      const newToken = generateToken({
        id: socket.user.id,
        username: newName,
        isAdmin: socket.user.isAdmin
      });

      // Update online tracking maps
      for (const [code, users] of channelUsers) {
        if (users.has(socket.user.id)) {
          users.get(socket.user.id).username = newName;
          emitOnlineUsers(code);
        }
      }

      for (const [code, users] of voiceUsers) {
        if (users.has(socket.user.id)) {
          users.get(socket.user.id).username = newName;
          broadcastVoiceUsers(code);
        }
      }

      // Send new credentials to client
      socket.emit('renamed', {
        token: newToken,
        user: { id: socket.user.id, username: newName, isAdmin: socket.user.isAdmin },
        oldName
      });

      // Announce in current channel
      if (socket.currentChannel) {
        socket.to(`channel:${socket.currentChannel}`).emit('user-renamed', {
          channelCode: socket.currentChannel,
          oldName,
          newName
        });
      }

      console.log(`✏️  ${oldName} renamed to ${newName}`);
    });
    socket.on('update-display-name', (data) => {
      if (!data || typeof data !== 'object') return;
      const newName = typeof data.displayName === 'string' ? data.displayName.trim().slice(0, 32) : '';
      const displayName = newName.length > 0 ? newName : null;
      try {
        db.prepare('UPDATE users SET display_name = ? WHERE id = ?').run(displayName, socket.user.id);
      } catch (err) {
        console.error('Display name update error:', err);
        return socket.emit('error-msg', 'Failed to update display name');
      }
      socket.user.displayName = displayName;
      for (const [code, users] of channelUsers) {
        if (users.has(socket.user.id)) {
          users.get(socket.user.id).displayName = displayName;
          emitOnlineUsers(code);
        }
      }
      socket.emit('display-name-updated', { displayName });
      console.log(`✏️  ${socket.user.username} display name: ${displayName || '(cleared)'}`);
    });

    // ═══════════════ ADMIN: DELETE CHANNEL ═══════════════════

    socket.on('delete-channel', (data) => {
      if (!data || typeof data !== 'object') return;
      if (!socket.user.isAdmin) {
        return socket.emit('error-msg', 'Only admins can delete channels');
      }

      const code = typeof data.code === 'string' ? data.code.trim() : '';
      if (!code || !/^[a-f0-9]{8}$/i.test(code)) return;
      const channel = db.prepare('SELECT * FROM channels WHERE code = ?').get(code);
      if (!channel) return;

      const deleteAll = db.transaction((chId) => {
        // Delete reactions first (they reference messages)
        db.prepare('DELETE FROM reactions WHERE message_id IN (SELECT id FROM messages WHERE channel_id = ?)').run(chId);
        db.prepare('DELETE FROM messages WHERE channel_id = ?').run(chId);
        db.prepare('DELETE FROM channel_members WHERE channel_id = ?').run(chId);
        db.prepare('DELETE FROM channels WHERE id = ?').run(chId);
      });
      deleteAll(channel.id);

      io.to(`channel:${code}`).emit('channel-deleted', { code });

      channelUsers.delete(code);
      voiceUsers.delete(code);
    });

    // ═══════════════ CHANNEL PERMISSIONS ═════════════════════

    socket.on('get-channel-permissions', (data) => {
      if (!data?.code || !socket.user.isAdmin) return;
      const channel = db.prepare('SELECT id, is_private FROM channels WHERE code = ?').get(data.code);
      if (!channel) return;
      const users = db.prepare(`SELECT u.id, u.username, cp.created_at FROM channel_permissions cp JOIN users u ON cp.user_id = u.id WHERE cp.channel_id = ? ORDER BY u.username`).all(channel.id);
      socket.emit('channel-permissions', { code: data.code, users, isPrivate: !!channel.is_private });
    });

    socket.on('add-channel-user', (data) => {
      if (!socket.user.isAdmin) return socket.emit('error-msg', 'Admin only');
      if (!data?.code || !data?.username) return;
      const channel = db.prepare('SELECT id, code, name FROM channels WHERE code = ?').get(data.code);
      if (!channel) return socket.emit('error-msg', 'Channel not found');
      const targetUser = db.prepare('SELECT id, username FROM users WHERE username = ? COLLATE NOCASE').get(data.username.trim());
      if (!targetUser) return socket.emit('error-msg', 'User not found');
      try {
        db.prepare('INSERT OR IGNORE INTO channel_permissions (channel_id, user_id, granted_by) VALUES (?, ?, ?)').run(channel.id, targetUser.id, socket.user.id);
        db.prepare('INSERT OR IGNORE INTO channel_members (channel_id, user_id) VALUES (?, ?)').run(channel.id, targetUser.id);
        socket.emit('success-msg', `${targetUser.username} added to ${channel.name}`);
        const users = db.prepare(`SELECT u.id, u.username, cp.created_at FROM channel_permissions cp JOIN users u ON cp.user_id = u.id WHERE cp.channel_id = ? ORDER BY u.username`).all(channel.id);
        socket.emit('channel-permissions', { code: data.code, users, isPrivate: true });
        const targetSocket = [...io.sockets.sockets.values()].find(s => s.user?.id === targetUser.id);
        if (targetSocket) {
          targetSocket.join(`channel:${channel.code}`);
          targetSocket.emit('channel-joined', { id: channel.id, name: channel.name, code: channel.code, created_by: channel.created_by });
          targetSocket.emit('channels-refresh');
        }
      } catch (e) { socket.emit('error-msg', 'Failed to add user'); }
    });

    socket.on('remove-channel-user', (data) => {
      if (!socket.user.isAdmin) return socket.emit('error-msg', 'Admin only');
      if (!data?.code || !data?.userId) return;
      const channel = db.prepare('SELECT id, code, name FROM channels WHERE code = ?').get(data.code);
      if (!channel) return socket.emit('error-msg', 'Channel not found');
      db.prepare('DELETE FROM channel_permissions WHERE channel_id = ? AND user_id = ?').run(channel.id, data.userId);
      db.prepare('DELETE FROM channel_members WHERE channel_id = ? AND user_id = ?').run(channel.id, data.userId);
      const users = db.prepare(`SELECT u.id, u.username, cp.created_at FROM channel_permissions cp JOIN users u ON cp.user_id = u.id WHERE cp.channel_id = ? ORDER BY u.username`).all(channel.id);
      socket.emit('channel-permissions', { code: data.code, users, isPrivate: true });
      const targetSocket = [...io.sockets.sockets.values()].find(s => s.user?.id === data.userId);
      if (targetSocket) {
        targetSocket.leave(`channel:${channel.code}`);
        targetSocket.emit('channel-removed', { code: channel.code });
        targetSocket.emit('channels-refresh');
      }
    });

    socket.on('leave-channel', (data) => {
      if (!data?.code) return;
      const channel = db.prepare('SELECT id, is_private FROM channels WHERE code = ?').get(data.code);
      if (!channel) return;
      if (channel.is_private && !socket.user.isAdmin) {
        return socket.emit('error-msg', 'Cannot leave private channels - ask admin to remove you');
      }
      db.prepare('DELETE FROM channel_members WHERE channel_id = ? AND user_id = ?').run(channel.id, socket.user.id);
      socket.leave(`channel:${data.code}`);
      socket.emit('channel-left', { code: data.code });
      io.to(`channel:${data.code}`).emit('user-left', { channelCode: data.code, userId: socket.user.id, username: socket.user.username });
    });

    socket.on('get-all-channels', () => {
      if (!socket.user.isAdmin) return;
      const channels = db.prepare('SELECT id, name, code, channel_type, parent_id, is_private FROM channels ORDER BY name').all();
      socket.emit('all-channels-list', channels);
    });

    // ═══════════════ EDIT MESSAGE ═══════════════════════════

    socket.on('edit-message', (data) => {
      if (!data || typeof data !== 'object') return;
      if (!isInt(data.messageId) || !isString(data.content, 1, 2000)) return;

      const code = socket.currentChannel;
      if (!code) return;

      const channel = db.prepare('SELECT id FROM channels WHERE code = ?').get(code);
      if (!channel) return;

      const msg = db.prepare(
        'SELECT id, user_id FROM messages WHERE id = ? AND channel_id = ?'
      ).get(data.messageId, channel.id);
      if (!msg) return;

      // Only author can edit
      if (msg.user_id !== socket.user.id) {
        return socket.emit('error-msg', 'You can only edit your own messages');
      }

      const newContent = data.content.trim();
      if (!newContent) return;

      db.prepare(
        'UPDATE messages SET content = ?, edited_at = datetime(\'now\') WHERE id = ?'
      ).run(newContent, data.messageId);

      io.to(`channel:${code}`).emit('message-edited', {
        channelCode: code,
        messageId: data.messageId,
        content: newContent,
        editedAt: new Date().toISOString()
      });
    });

    // ═══════════════ DELETE MESSAGE ═════════════════════════

    socket.on('delete-message', (data) => {
      if (!data || typeof data !== 'object') return;
      if (!isInt(data.messageId)) return;

      const code = socket.currentChannel;
      if (!code) return;

      const channel = db.prepare('SELECT id FROM channels WHERE code = ?').get(code);
      if (!channel) return;

      const msg = db.prepare(
        'SELECT id, user_id FROM messages WHERE id = ? AND channel_id = ?'
      ).get(data.messageId, channel.id);
      if (!msg) return;

      // Author or admin can delete
      if (msg.user_id !== socket.user.id && !socket.user.isAdmin) {
        return socket.emit('error-msg', 'You can only delete your own messages');
      }

      db.prepare('DELETE FROM reactions WHERE message_id = ?').run(data.messageId);
      db.prepare('DELETE FROM messages WHERE id = ?').run(data.messageId);

      io.to(`channel:${code}`).emit('message-deleted', {
        channelCode: code,
        messageId: data.messageId
      });
    });

    // ═══════════════ PIN / UNPIN MESSAGE ════════════════════

    socket.on('pin-message', (data) => {
      if (!data || typeof data !== 'object') return;
      if (!isInt(data.messageId)) return;
      if (!socket.user.isAdmin) {
        return socket.emit('error-msg', 'Only admins can pin messages');
      }

      const code = socket.currentChannel;
      if (!code) return;

      const channel = db.prepare('SELECT id FROM channels WHERE code = ?').get(code);
      if (!channel) return;

      const msg = db.prepare(
        'SELECT id FROM messages WHERE id = ? AND channel_id = ?'
      ).get(data.messageId, channel.id);
      if (!msg) return socket.emit('error-msg', 'Message not found');

      // Check if already pinned
      const existing = db.prepare(
        'SELECT id FROM pinned_messages WHERE message_id = ?'
      ).get(data.messageId);
      if (existing) return socket.emit('error-msg', 'Message is already pinned');

      // Max 50 pins per channel
      const pinCount = db.prepare(
        'SELECT COUNT(*) as cnt FROM pinned_messages WHERE channel_id = ?'
      ).get(channel.id);
      if (pinCount.cnt >= 50) {
        return socket.emit('error-msg', 'Channel has reached the 50-pin limit');
      }

      db.prepare(
        'INSERT INTO pinned_messages (message_id, channel_id, pinned_by) VALUES (?, ?, ?)'
      ).run(data.messageId, channel.id, socket.user.id);

      io.to(`channel:${code}`).emit('message-pinned', {
        channelCode: code,
        messageId: data.messageId,
        pinnedBy: socket.user.username
      });
    });

    socket.on('unpin-message', (data) => {
      if (!data || typeof data !== 'object') return;
      if (!isInt(data.messageId)) return;
      if (!socket.user.isAdmin) {
        return socket.emit('error-msg', 'Only admins can unpin messages');
      }

      const code = socket.currentChannel;
      if (!code) return;

      const channel = db.prepare('SELECT id FROM channels WHERE code = ?').get(code);
      if (!channel) return;

      const pin = db.prepare(
        'SELECT id FROM pinned_messages WHERE message_id = ? AND channel_id = ?'
      ).get(data.messageId, channel.id);
      if (!pin) return socket.emit('error-msg', 'Message is not pinned');

      db.prepare('DELETE FROM pinned_messages WHERE message_id = ?').run(data.messageId);

      io.to(`channel:${code}`).emit('message-unpinned', {
        channelCode: code,
        messageId: data.messageId
      });
    });

    socket.on('get-pinned-messages', (data) => {
      if (!data || typeof data !== 'object') return;
      const code = typeof data.code === 'string' ? data.code.trim() : '';
      if (!code || !/^[a-f0-9]{8}$/i.test(code)) return;

      const channel = db.prepare('SELECT id FROM channels WHERE code = ?').get(code);
      if (!channel) return;

      const member = db.prepare(
        'SELECT 1 FROM channel_members WHERE channel_id = ? AND user_id = ?'
      ).get(channel.id, socket.user.id);
      if (!member) return;

      const pins = db.prepare(`
        SELECT m.id, m.content, m.created_at, m.edited_at,
               COALESCE(u.username, '[Deleted User]') as username, u.id as user_id,
               pm.pinned_at, COALESCE(pb.username, '[Deleted User]') as pinned_by
        FROM pinned_messages pm
        JOIN messages m ON pm.message_id = m.id
        LEFT JOIN users u ON m.user_id = u.id
        LEFT JOIN users pb ON pm.pinned_by = pb.id
        WHERE pm.channel_id = ?
        ORDER BY pm.pinned_at DESC
      `).all(channel.id);

      socket.emit('pinned-messages', { channelCode: code, pins });
    });

    // ═══════════════ ADMIN: KICK USER ═══════════════════════

    socket.on('kick-user', (data) => {
      if (!data || typeof data !== 'object') return;
      if (!socket.user.isAdmin) {
        return socket.emit('error-msg', 'Only admins can kick users');
      }
      if (!isInt(data.userId)) return;
      if (data.userId === socket.user.id) {
        return socket.emit('error-msg', 'You can\'t kick yourself');
      }

      const code = socket.currentChannel;
      if (!code) return;

      // Find target socket and disconnect from channel
      const channelRoom = channelUsers.get(code);
      const targetInfo = channelRoom ? channelRoom.get(data.userId) : null;
      if (!targetInfo) {
        return socket.emit('error-msg', 'User is not currently online in this channel (use ban instead)');
      }

      // Emit kicked event to target
      io.to(targetInfo.socketId).emit('kicked', {
        channelCode: code,
        reason: typeof data.reason === 'string' ? data.reason.trim().slice(0, 200) : ''
      });

      // Remove from channel tracking
      channelRoom.delete(data.userId);

      // Broadcast updated online users
      const online = Array.from(channelRoom.values()).map(u => ({
        id: u.id, username: u.username
      }));
      io.to(`channel:${code}`).emit('online-users', {
        channelCode: code,
        users: online
      });

      io.to(`channel:${code}`).emit('new-message', {
        channelCode: code,
        message: {
          id: 0, content: `${targetInfo.username} was kicked`, created_at: new Date().toISOString(),
          username: 'System', user_id: 0, reply_to: null, replyContext: null, reactions: [], edited_at: null, system: true
        }
      });

      socket.emit('error-msg', `Kicked ${targetInfo.username}`);
    });

    // ═══════════════ ADMIN: BAN USER ════════════════════════

    socket.on('ban-user', (data) => {
      if (!data || typeof data !== 'object') return;
      if (!socket.user.isAdmin) {
        return socket.emit('error-msg', 'Only admins can ban users');
      }
      if (!isInt(data.userId)) return;
      if (data.userId === socket.user.id) {
        return socket.emit('error-msg', 'You can\'t ban yourself');
      }

      const reason = typeof data.reason === 'string' ? data.reason.trim().slice(0, 200) : '';

      // Get username before banning (works for ANY user, online or offline)
      const targetUser = db.prepare('SELECT id, username FROM users WHERE id = ?').get(data.userId);
      if (!targetUser) return socket.emit('error-msg', 'User not found');

      try {
        db.prepare(
          'INSERT OR REPLACE INTO bans (user_id, banned_by, reason) VALUES (?, ?, ?)'
        ).run(data.userId, socket.user.id, reason);
      } catch (err) {
        console.error('Ban error:', err);
        return socket.emit('error-msg', 'Failed to ban user');
      }

      // Disconnect all sockets of banned user
      for (const [, s] of io.sockets.sockets) {
        if (s.user && s.user.id === data.userId) {
          s.emit('banned', { reason });
          s.disconnect(true);
        }
      }

      // Re-emit online users for all channels to remove banned user from lists
      for (const [code] of channelUsers) {
        emitOnlineUsers(code);
      }

      socket.emit('error-msg', `Banned ${targetUser.username}`);
    });

    // ═══════════════ ADMIN: UNBAN USER ══════════════════════

    socket.on('unban-user', (data) => {
      if (!data || typeof data !== 'object') return;
      if (!socket.user.isAdmin) {
        return socket.emit('error-msg', 'Only admins can unban users');
      }
      if (!isInt(data.userId)) return;

      db.prepare('DELETE FROM bans WHERE user_id = ?').run(data.userId);
      const targetUser = db.prepare('SELECT username FROM users WHERE id = ?').get(data.userId);
      socket.emit('error-msg', `Unbanned ${targetUser ? targetUser.username : 'user'}`);

      // Send updated ban list to admin
      const bans = db.prepare(`
        SELECT b.id, b.user_id, b.reason, b.created_at, u.username
        FROM bans b JOIN users u ON b.user_id = u.id ORDER BY b.created_at DESC
      `).all();
      socket.emit('ban-list', bans);
    });

    // ═══════════════ ADMIN: DELETE USER (purge) ═════════════

    socket.on('delete-user', (data) => {
      if (!data || typeof data !== 'object') return;
      if (!socket.user.isAdmin) {
        return socket.emit('error-msg', 'Only admins can delete users');
      }
      if (!isInt(data.userId)) return;
      if (data.userId === socket.user.id) {
        return socket.emit('error-msg', 'You can\'t delete yourself');
      }

      const targetUser = db.prepare('SELECT id, username FROM users WHERE id = ?').get(data.userId);
      if (!targetUser) return socket.emit('error-msg', 'User not found');

      // Disconnect the user if online
      for (const [, s] of io.sockets.sockets) {
        if (s.user && s.user.id === data.userId) {
          s.emit('banned', { reason: 'Your account has been deleted by an admin.' });
          s.disconnect(true);
        }
      }

      // Remove from online/voice tracking
      for (const [code, users] of channelUsers) {
        if (users.has(data.userId)) {
          users.delete(data.userId);
          emitOnlineUsers(code);
        }
      }
      for (const [code, users] of voiceUsers) {
        if (users.has(data.userId)) {
          users.delete(data.userId);
          broadcastVoiceUsers(code);
        }
      }

      // Purge all user data in a transaction
      const purge = db.transaction((uid) => {
        db.prepare('DELETE FROM reactions WHERE user_id = ?').run(uid);
        db.prepare('DELETE FROM mutes WHERE user_id = ?').run(uid);
        db.prepare('DELETE FROM bans WHERE user_id = ?').run(uid);
        db.prepare('DELETE FROM channel_members WHERE user_id = ?').run(uid);
        // Mark their messages as [deleted user] instead of deleting (preserves chat history)
        db.prepare('UPDATE messages SET user_id = NULL WHERE user_id = ?').run(uid);
        db.prepare('DELETE FROM users WHERE id = ?').run(uid);
      });

      try {
        purge(data.userId);
      } catch (err) {
        console.error('Delete user error:', err);
        return socket.emit('error-msg', 'Failed to delete user');
      }

      socket.emit('error-msg', `Deleted user "${targetUser.username}" — username is now available`);

      // Refresh ban list for admin
      const bans = db.prepare(`
        SELECT b.id, b.user_id, b.reason, b.created_at, u.username
        FROM bans b JOIN users u ON b.user_id = u.id ORDER BY b.created_at DESC
      `).all();
      socket.emit('ban-list', bans);

      console.log(`🗑️  Admin deleted user "${targetUser.username}" (id: ${data.userId})`);
    });

    // ═══════════════ ADMIN: MUTE USER ═══════════════════════

    socket.on('mute-user', (data) => {
      if (!data || typeof data !== 'object') return;
      if (!socket.user.isAdmin) {
        return socket.emit('error-msg', 'Only admins can mute users');
      }
      if (!isInt(data.userId)) return;
      if (data.userId === socket.user.id) {
        return socket.emit('error-msg', 'You can\'t mute yourself');
      }

      const durationMinutes = isInt(data.duration) && data.duration > 0 && data.duration <= 43200
        ? data.duration : 10; // default 10 min, max 30 days
      const reason = typeof data.reason === 'string' ? data.reason.trim().slice(0, 200) : '';

      const targetUser = db.prepare('SELECT username FROM users WHERE id = ?').get(data.userId);
      if (!targetUser) return socket.emit('error-msg', 'User not found');

      try {
        db.prepare(
          'INSERT INTO mutes (user_id, muted_by, reason, expires_at) VALUES (?, ?, ?, datetime(\'now\', ?))'
        ).run(data.userId, socket.user.id, reason, `+${durationMinutes} minutes`);
      } catch (err) {
        console.error('Mute error:', err);
        return socket.emit('error-msg', 'Failed to mute user');
      }

      // Notify the muted user
      for (const [, s] of io.sockets.sockets) {
        if (s.user && s.user.id === data.userId) {
          s.emit('muted', { duration: durationMinutes, reason });
        }
      }

      socket.emit('error-msg', `Muted ${targetUser.username} for ${durationMinutes} min`);
    });

    // ═══════════════ ADMIN: UNMUTE USER ═════════════════════

    socket.on('unmute-user', (data) => {
      if (!data || typeof data !== 'object') return;
      if (!socket.user.isAdmin) {
        return socket.emit('error-msg', 'Only admins can unmute users');
      }
      if (!isInt(data.userId)) return;

      db.prepare('DELETE FROM mutes WHERE user_id = ?').run(data.userId);
      const targetUser = db.prepare('SELECT username FROM users WHERE id = ?').get(data.userId);
      socket.emit('error-msg', `Unmuted ${targetUser ? targetUser.username : 'user'}`);
    });

    // ═══════════════ ADMIN: GET BAN LIST ════════════════════

    socket.on('get-bans', () => {
      if (!socket.user.isAdmin) return;
      const bans = db.prepare(`
        SELECT b.id, b.user_id, b.reason, b.created_at, u.username
        FROM bans b JOIN users u ON b.user_id = u.id ORDER BY b.created_at DESC
      `).all();
      socket.emit('ban-list', bans);
    });

    // ═══════════════ SERVER SETTINGS ════════════════════════

    socket.on('get-server-settings', () => {
      const rows = db.prepare('SELECT key, value FROM server_settings').all();
      const settings = {};
      rows.forEach(r => { settings[r.key] = r.value; });
      socket.emit('server-settings', settings);
    });

    // ═══════════════ WHITELIST MANAGEMENT ═══════════════════

    socket.on('get-whitelist', () => {
      if (!socket.user.isAdmin) return;
      const rows = db.prepare('SELECT id, username, created_at FROM whitelist ORDER BY username').all();
      socket.emit('whitelist-list', rows);
    });

    socket.on('whitelist-add', (data) => {
      if (!socket.user.isAdmin) return;
      if (!data || typeof data !== 'object') return;
      const username = typeof data.username === 'string' ? data.username.trim() : '';
      if (!username || username.length < 3 || username.length > 20) {
        return socket.emit('error-msg', 'Username must be 3-20 characters');
      }
      if (!/^[a-zA-Z0-9_]+$/.test(username)) {
        return socket.emit('error-msg', 'Invalid username format');
      }

      try {
        db.prepare('INSERT OR IGNORE INTO whitelist (username, added_by) VALUES (?, ?)').run(username, socket.user.id);
        socket.emit('error-msg', `Added "${username}" to whitelist`);
        // Send updated list
        const rows = db.prepare('SELECT id, username, created_at FROM whitelist ORDER BY username').all();
        socket.emit('whitelist-list', rows);
      } catch {
        socket.emit('error-msg', 'Failed to add to whitelist');
      }
    });

    socket.on('whitelist-remove', (data) => {
      if (!socket.user.isAdmin) return;
      if (!data || typeof data !== 'object') return;
      const username = typeof data.username === 'string' ? data.username.trim() : '';
      if (!username) return;

      db.prepare('DELETE FROM whitelist WHERE username = ?').run(username);
      socket.emit('error-msg', `Removed "${username}" from whitelist`);
      // Send updated list
      const rows = db.prepare('SELECT id, username, created_at FROM whitelist ORDER BY username').all();
      socket.emit('whitelist-list', rows);
    });

    socket.on('whitelist-toggle', (data) => {
      if (!socket.user.isAdmin) return;
      if (!data || typeof data !== 'object') return;
      const enabled = data.enabled === true ? 'true' : 'false';
      db.prepare("INSERT OR REPLACE INTO server_settings (key, value) VALUES ('whitelist_enabled', ?)").run(enabled);
      socket.emit('error-msg', `Whitelist ${enabled === 'true' ? 'enabled' : 'disabled'}`);
    });

    // ═══════════════ USER PREFERENCES ═══════════════════

    socket.on('get-preferences', () => {
      const rows = db.prepare('SELECT key, value FROM user_preferences WHERE user_id = ?').all(socket.user.id);
      const prefs = {};
      rows.forEach(r => { prefs[r.key] = r.value; });
      socket.emit('preferences', prefs);
    });

    socket.on('set-preference', (data) => {
      if (!data || typeof data !== 'object') return;
      const key = typeof data.key === 'string' ? data.key.trim() : '';
      const value = typeof data.value === 'string' ? data.value.trim() : '';

      const allowedKeys = ['theme', 'sound_pack', 'noise_suppression'];
      if (!allowedKeys.includes(key) || !value || value.length > 50) return;

      db.prepare(
        'INSERT OR REPLACE INTO user_preferences (user_id, key, value) VALUES (?, ?, ?)'
      ).run(socket.user.id, key, value);

      socket.emit('preference-saved', { key, value });
    });

    // ═══════════════ HIGH SCORES ════════════════════════

    socket.on('submit-high-score', (data) => {
      if (!data || typeof data !== 'object') return;
      const game = typeof data.game === 'string' ? data.game.trim() : '';
      const score = isInt(data.score) && data.score >= 0 ? data.score : 0;
      if (!game || !['flappy'].includes(game)) return;

      const current = db.prepare(
        'SELECT score FROM high_scores WHERE user_id = ? AND game = ?'
      ).get(socket.user.id, game);

      if (!current || score > current.score) {
        db.prepare(
          'INSERT OR REPLACE INTO high_scores (user_id, game, score, updated_at) VALUES (?, ?, ?, datetime(\'now\'))'
        ).run(socket.user.id, game, score);
      }

      // Broadcast updated leaderboard
      const leaderboard = db.prepare(`
        SELECT hs.user_id, u.username, hs.score
        FROM high_scores hs JOIN users u ON hs.user_id = u.id
        WHERE hs.game = ? AND hs.score > 0
        ORDER BY hs.score DESC LIMIT 50
      `).all(game);
      io.emit('high-scores', { game, leaderboard });
    });

    socket.on('get-high-scores', (data) => {
      if (!data || typeof data !== 'object') return;
      const game = typeof data.game === 'string' ? data.game.trim() : 'flappy';
      const leaderboard = db.prepare(`
        SELECT hs.user_id, u.username, hs.score
        FROM high_scores hs JOIN users u ON hs.user_id = u.id
        WHERE hs.game = ? AND hs.score > 0
        ORDER BY hs.score DESC LIMIT 50
      `).all(game);
      socket.emit('high-scores', { game, leaderboard });
    });

    socket.on('update-server-setting', (data) => {
      if (!data || typeof data !== 'object') return;
      if (!socket.user.isAdmin) {
        return socket.emit('error-msg', 'Only admins can change server settings');
      }

      const key = typeof data.key === 'string' ? data.key.trim() : '';
      const value = typeof data.value === 'string' ? data.value.trim() : '';

      const allowedKeys = ['member_visibility', 'cleanup_enabled', 'cleanup_max_age_days', 'cleanup_max_size_mb', 'tenor_api_key', 'giphy_api_key', 'tunnel_enabled', 'tunnel_provider', 'noise_suppression'];
      if (!allowedKeys.includes(key)) return;

      if (key === 'member_visibility' && !['all', 'online', 'none'].includes(value)) return;
      if (key === 'cleanup_enabled' && !['true', 'false'].includes(value)) return;
      if (key === 'cleanup_max_age_days') {
        const n = parseInt(value);
        if (isNaN(n) || n < 0 || n > 3650) return;
      }
      if (key === 'cleanup_max_size_mb') {
        const n = parseInt(value);
        if (isNaN(n) || n < 0 || n > 100000) return;
      }
      if (key === 'tenor_api_key' || key === 'giphy_api_key') {
        if (value && (value.length < 10 || value.length > 100)) return;
      }
      if (key === 'tunnel_enabled' && !['true', 'false'].includes(value)) return;
      if (key === 'tunnel_provider' && !['localtunnel', 'cloudflared'].includes(value)) return;
      if (key === 'noise_suppression' && !['true', 'false'].includes(value)) return;

      db.prepare(
        'INSERT OR REPLACE INTO server_settings (key, value) VALUES (?, ?)'
      ).run(key, value);

      // Broadcast to all connected clients
      io.emit('server-setting-changed', { key, value });

      // If visibility changed, re-emit online users for all channels
      if (key === 'member_visibility') {
        for (const [code, users] of channelUsers) {
          emitOnlineUsers(code);
        }
      }
    });

    // ═══════════════ ADMIN: RUN CLEANUP NOW ═════════════════

    socket.on('run-cleanup-now', () => {
      if (!socket.user.isAdmin) {
        return socket.emit('error-msg', 'Only admins can run cleanup');
      }
      if (typeof global.runAutoCleanup === 'function') {
        global.runAutoCleanup();
        socket.emit('error-msg', 'Cleanup ran — check server console for details');
      } else {
        socket.emit('error-msg', 'Cleanup function not available');
      }
    });
    socket.on('block-user', (data) => {
      if (!data) return;
      const uid = data.userId ?? data.targetUserId;
      if (!isInt(uid)) return;
      if (uid === socket.user.id) return socket.emit('error-msg', "Can't block yourself");
      data.userId = uid;
      try {
        db.prepare('INSERT OR IGNORE INTO blocks (blocker_id, blocked_id) VALUES (?, ?)').run(socket.user.id, data.userId);
        socket.emit('block-updated', { userId: data.userId, blocked: true });
      } catch { socket.emit('error-msg', 'Failed to block user'); }
    });
    socket.on('unblock-user', (data) => {
      if (!data) return;
      const uid = data.userId ?? data.targetUserId;
      if (!isInt(uid)) return;
      data.userId = uid;
      db.prepare('DELETE FROM blocks WHERE blocker_id = ? AND blocked_id = ?').run(socket.user.id, data.userId);
      socket.emit('block-updated', { userId: data.userId, blocked: false });
    });
    socket.on('get-blocks', () => {
      const blocks = db.prepare('SELECT b.blocked_id as userId, u.username FROM blocks b JOIN users u ON b.blocked_id = u.id WHERE b.blocker_id = ?').all(socket.user.id);
      socket.emit('blocks-list', blocks);
    });
    socket.on('create-dm', (data) => {
      if (!data) return;
      const dmTarget = data.userId ?? data.targetUserId;
      if (!isInt(dmTarget)) return;
      data.userId = dmTarget;
      if (data.userId === socket.user.id) return;
      const blocked = db.prepare('SELECT 1 FROM blocks WHERE (blocker_id = ? AND blocked_id = ?) OR (blocker_id = ? AND blocked_id = ?)').get(data.userId, socket.user.id, socket.user.id, data.userId);
      if (blocked) return socket.emit('error-msg', 'Cannot DM this user');
      const existing = db.prepare('SELECT * FROM dm_channels WHERE (user1_id = ? AND user2_id = ?) OR (user1_id = ? AND user2_id = ?)').get(socket.user.id, data.userId, data.userId, socket.user.id);
      if (existing) {
        const otherUser = db.prepare('SELECT username, display_name FROM users WHERE id = ?').get(data.userId);
        return socket.emit('dm-opened', { ...existing, other_username: otherUser?.display_name || otherUser?.username || 'User', other_id: data.userId });
      }
      const code = crypto.randomBytes(8).toString('hex');
      db.prepare('INSERT INTO dm_channels (user1_id, user2_id, channel_code) VALUES (?, ?, ?)').run(Math.min(socket.user.id, data.userId), Math.max(socket.user.id, data.userId), code);
      const dm = db.prepare('SELECT * FROM dm_channels WHERE channel_code = ?').get(code);
      const targetUser = db.prepare('SELECT username, display_name FROM users WHERE id = ?').get(data.userId);
      socket.emit('dm-opened', { ...dm, other_username: targetUser?.display_name || targetUser?.username || 'User', other_id: data.userId });
      for (const [, s] of io.sockets.sockets) {
        if (s.user && s.user.id === data.userId) {
          s.emit('dm-opened', { ...dm, other_username: socket.user.displayName || socket.user.username, other_id: socket.user.id });
        }
      }
    });
    socket.on('get-dms', () => {
      const dms = db.prepare(`
        SELECT d.*,
               CASE WHEN d.user1_id = ? THEN COALESCE(u2.display_name, u2.username) ELSE COALESCE(u1.display_name, u1.username) END as other_username,
               CASE WHEN d.user1_id = ? THEN u2.username ELSE u1.username END as username,
               CASE WHEN d.user1_id = ? THEN d.user2_id ELSE d.user1_id END as other_id
        FROM dm_channels d
        JOIN users u1 ON d.user1_id = u1.id JOIN users u2 ON d.user2_id = u2.id
        WHERE d.user1_id = ? OR d.user2_id = ?
      `).all(socket.user.id, socket.user.id, socket.user.id, socket.user.id, socket.user.id);
      socket.emit('dms-list', dms);
    });
    socket.on('get-dm-messages', (data) => {
      if (!data || typeof data.code !== 'string') return;
      const dm = db.prepare('SELECT * FROM dm_channels WHERE channel_code = ?').get(data.code);
      if (!dm) return;
      if (dm.user1_id !== socket.user.id && dm.user2_id !== socket.user.id) return;
      const msgs = db.prepare(`
        SELECT m.id, m.content, m.created_at, u.username, u.display_name as displayName, m.user_id
        FROM dm_messages m JOIN users u ON m.user_id = u.id
        WHERE m.dm_channel_code = ? ORDER BY m.created_at DESC LIMIT 80
      `).all(data.code);
      socket.emit('dm-message-history', { code: data.code, messages: msgs.reverse() });
    });
    socket.on('send-dm', (data) => {
      if (!data || typeof data.code !== 'string' || typeof data.content !== 'string') return;
      if (!data.content.trim() || data.content.length > 2000) return;
      const dm = db.prepare('SELECT * FROM dm_channels WHERE channel_code = ?').get(data.code);
      if (!dm) return;
      if (dm.user1_id !== socket.user.id && dm.user2_id !== socket.user.id) return;
      const blocked = db.prepare('SELECT 1 FROM blocks WHERE (blocker_id = ? AND blocked_id = ?) OR (blocker_id = ? AND blocked_id = ?)').get(dm.user1_id, dm.user2_id, dm.user2_id, dm.user1_id);
      if (blocked) return socket.emit('error-msg', 'Blocked');
      const otherId = dm.user1_id === socket.user.id ? dm.user2_id : dm.user1_id;
      const result = db.prepare('INSERT INTO dm_messages (dm_channel_code, user_id, content) VALUES (?, ?, ?)').run(data.code, socket.user.id, data.content.trim());
      const msg = { id: result.lastInsertRowid, content: data.content.trim(), username: socket.user.username, user_id: socket.user.id, created_at: new Date().toISOString(), dm_code: data.code };
      socket.emit('dm-message', msg);
      for (const [, s] of io.sockets.sockets) {
        if (s.user && s.user.id === otherId) s.emit('dm-message', msg);
      }
    });
    socket.on('initiate-call', (data) => {
      if (!data || !isInt(data.userId)) return;
      const callType = data.type === 'video' ? 'video' : 'voice';
      const code = crypto.randomBytes(8).toString('hex');
      try {
        db.prepare('INSERT INTO private_calls (caller_id, callee_id, status, channel_code) VALUES (?, ?, ?, ?)').run(socket.user.id, data.userId, 'ringing', code);
      } catch { return socket.emit('error-msg', 'Call failed'); }
      for (const [, s] of io.sockets.sockets) {
        if (s.user && s.user.id === data.userId) {
          s.emit('incoming-call', { callerId: socket.user.id, callerName: socket.user.username, code, type: callType });
        }
      }
      socket.emit('call-initiated', { code, type: callType, targetId: data.userId });
    });
    socket.on('accept-call', (data) => {
      if (!data || typeof data.code !== 'string') return;
      db.prepare("UPDATE private_calls SET status = 'active' WHERE channel_code = ? AND callee_id = ?").run(data.code, socket.user.id);
      const call = db.prepare('SELECT * FROM private_calls WHERE channel_code = ?').get(data.code);
      if (!call) return;
      for (const [, s] of io.sockets.sockets) {
        if (s.user && s.user.id === call.caller_id) s.emit('call-accepted', { code: data.code });
      }
    });
    socket.on('reject-call', (data) => {
      if (!data || typeof data.code !== 'string') return;
      const call = db.prepare('SELECT * FROM private_calls WHERE channel_code = ?').get(data.code);
      if (!call) return;
      db.prepare("UPDATE private_calls SET status = 'ended' WHERE channel_code = ?").run(data.code);
      for (const [, s] of io.sockets.sockets) {
        if (s.user && s.user.id === call.caller_id) s.emit('call-rejected', { code: data.code });
      }
    });
    socket.on('end-call', (data) => {
      if (!data || typeof data.code !== 'string') return;
      const call = db.prepare('SELECT * FROM private_calls WHERE channel_code = ?').get(data.code);
      if (!call) return;
      db.prepare("UPDATE private_calls SET status = 'ended' WHERE channel_code = ?").run(data.code);
      const otherId = call.caller_id === socket.user.id ? call.callee_id : call.caller_id;
      for (const [, s] of io.sockets.sockets) {
        if (s.user && s.user.id === otherId) s.emit('call-ended', { code: data.code });
      }
    });
    socket.on('call-signal', (data) => {
      if (!data || typeof data.code !== 'string') return;
      const call = db.prepare('SELECT * FROM private_calls WHERE channel_code = ?').get(data.code);
      if (!call) return;
      const otherId = call.caller_id === socket.user.id ? call.callee_id : call.caller_id;
      for (const [, s] of io.sockets.sockets) {
        if (s.user && s.user.id === otherId) s.emit('call-signal', { code: data.code, signal: data.signal });
      }
    });

    // ═══════════════ DISCONNECT ═════════════════════════════

    socket.on('disconnect', () => {
      if (!socket.user) return; // safety guard
      console.log(`❌ ${socket.user.username} disconnected`);
      const otherSockets = Array.from(io.sockets.sockets.values()).filter(s => s.user && s.user.id === socket.user.id && s.id !== socket.id);
      if (otherSockets.length === 0) globalOnline.delete(socket.user.id);
      emitGlobalOnlineCount();

      // Remove from all channel online lists
      for (const [code, users] of channelUsers) {
        if (users.has(socket.user.id)) {
          users.delete(socket.user.id);
          emitOnlineUsers(code);
        }
      }

      // Remove from all voice channels
      for (const [code] of voiceUsers) {
        handleVoiceLeave(socket, code);
      }
    });

    // ── Helpers ─────────────────────────────────────────────

    function handleVoiceLeave(socket, code) {
      const voiceRoom = voiceUsers.get(code);
      if (!voiceRoom || !voiceRoom.has(socket.user.id)) return;

      voiceRoom.delete(socket.user.id);

      // Tell remaining peers to close connection to this user
      for (const [, user] of voiceRoom) {
        io.to(user.socketId).emit('voice-user-left', {
          channelCode: code,
          user: { id: socket.user.id, username: socket.user.username }
        });
      }

      broadcastVoiceUsers(code);
    }

    function broadcastVoiceUsers(code) {
      const room = voiceUsers.get(code);
      const users = room
        ? Array.from(room.values()).map(u => ({ id: u.id, username: u.username }))
        : [];
      io.emit('voice-users-update', {
        channelCode: code,
        users
      });
    }

    function emitOnlineUsers(code) {
      const room = channelUsers.get(code);

      const visibility = db.prepare(
        "SELECT value FROM server_settings WHERE key = 'member_visibility'"
      ).get();
      const mode = visibility ? visibility.value : 'all';

      // Also fetch high scores to include in user data
      const scores = {};
      try {
        const scoreRows = db.prepare(
          'SELECT user_id, score FROM high_scores WHERE game = ? AND score > 0'
        ).all('flappy');
        scoreRows.forEach(r => { scores[r.user_id] = r.score; });
      } catch { /* table may not exist yet */ }

      let users;
      if (mode === 'none') {
        users = [];
      } else if (mode === 'all') {
        const allUsers = db.prepare(
          'SELECT u.id, u.username, u.display_name FROM users u LEFT JOIN bans b ON u.id = b.user_id WHERE b.id IS NULL ORDER BY u.username'
        ).all();
        const onlineIds = room ? new Set(room.keys()) : new Set();
        users = allUsers.map(m => ({
          id: m.id, username: m.username, displayName: m.display_name || null, online: onlineIds.has(m.id),
          highScore: scores[m.id] || 0
        }));
      } else {
        if (!room) return;
        users = Array.from(room.values()).map(u => ({
          id: u.id, username: u.username, displayName: u.displayName || null, online: true,
          highScore: scores[u.id] || 0
        }));
      }

      // Sort: online first, then alphabetical within each group
      users.sort((a, b) => {
        if (a.online !== b.online) return a.online ? -1 : 1;
        return a.username.toLowerCase().localeCompare(b.username.toLowerCase());
      });

      io.to(`channel:${code}`).emit('online-users', {
        channelCode: code,
        users,
        visibilityMode: mode
      });
    }

    // ── Slash command processor ──────────────────────────────
    function processSlashCommand(cmd, arg, username) {
      const commands = {
        shrug:     () => ({ content: `${arg ? arg + ' ' : ''}¯\\_(ツ)_/¯` }),
        tableflip: () => ({ content: `${arg ? arg + ' ' : ''}(╯°□°)╯︵ ┻━┻` }),
        unflip:    () => ({ content: `${arg ? arg + ' ' : ''}┬─┬ ノ( ゜-゜ノ)` }),
        lenny:     () => ({ content: `${arg ? arg + ' ' : ''}( ͡° ͜ʖ ͡°)` }),
        disapprove:() => ({ content: `${arg ? arg + ' ' : ''}ಠ_ಠ` }),
        bbs:       () => ({ content: `🕐 ${username} will be back soon` }),
        boobs:     () => ({ content: `( . Y . )` }),
        brb:       () => ({ content: `⏳ ${username} will be right back` }),
        afk:       () => ({ content: `💤 ${username} is away from keyboard` }),
        me:        () => arg ? ({ content: `_${username} ${arg}_` }) : null,
        spoiler:   () => arg ? ({ content: `||${arg}||` }) : null,
        tts:       () => arg ? ({ content: arg, tts: true }) : null,
        flip:      () => ({ content: `🪙 ${username} flipped a coin: **${Math.random() < 0.5 ? 'Heads' : 'Tails'}**!` }),
        roll:      () => {
          const m = (arg || '1d6').match(/^(\d{1,2})?d(\d{1,4})$/i);
          if (!m) return { content: `🎲 ${username} rolled: **${Math.floor(Math.random() * 6) + 1}**` };
          const count = Math.min(parseInt(m[1] || '1'), 20);
          const sides = Math.min(parseInt(m[2]), 1000);
          const rolls = Array.from({ length: count }, () => Math.floor(Math.random() * sides) + 1);
          const total = rolls.reduce((a, b) => a + b, 0);
          return { content: `🎲 ${username} rolled ${count}d${sides}: [${rolls.join(', ')}] = **${total}**` };
        },
        hug:       () => arg ? ({ content: `🤗 ${username} hugs ${arg}` }) : null,
        wave:      () => ({ content: `👋 ${username} waves${arg ? ' ' + arg : ''}` }),
      };

      const handler = commands[cmd];
      if (!handler) return null;
      return handler();
    }
    socket.on('listen-start', (data) => {
      if (!data || !data.url || !socket.user) return;
      const channelCode = socket.currentChannel || data.channelCode;
      if (!channelCode) return socket.emit('error-msg', 'Join a channel first');
      const url = typeof data.url === 'string' ? data.url.trim().slice(0, 2048) : '';
      const title = typeof data.title === 'string' ? data.title.trim().slice(0, 200) : '';
      if (!url) return;
      const allowedDomains = /^https:\/\/(www\.)?(youtube\.com|youtu\.be|open\.spotify\.com|soundcloud\.com|vimeo\.com)\//i;
      if (!allowedDomains.test(url)) return socket.emit('error-msg', 'Only YouTube, Spotify, SoundCloud, and Vimeo URLs allowed');
      try {
        db.prepare('DELETE FROM listen_sessions WHERE channel_code = ?').run(channelCode);
        db.prepare('INSERT INTO listen_sessions (channel_code, host_id, media_url, media_title) VALUES (?, ?, ?, ?)').run(channelCode, socket.user.id, url, title);
      } catch {}
      const session = { url, title, hostId: socket.user.id, hostName: socket.user.username, isPlaying: true, position: 0 };
      io.to(`channel:${channelCode}`).emit('listen-session', session);
    });
    socket.on('listen-sync', (data) => {
      if (!data || !socket.user) return;
      const channelCode = socket.currentChannel || data.channelCode;
      if (!channelCode) return;
      const hostCheck = db.prepare('SELECT id FROM listen_sessions WHERE channel_code = ? AND host_id = ?').get(channelCode, socket.user.id);
      if (!hostCheck) return socket.emit('error-msg', 'Only the host can sync');
      const isPlaying = typeof data.isPlaying === 'boolean' ? data.isPlaying : true;
      const position = typeof data.position === 'number' ? data.position : 0;
      try {
        db.prepare('UPDATE listen_sessions SET is_playing = ?, position = ?, updated_at = CURRENT_TIMESTAMP WHERE channel_code = ? AND host_id = ?').run(isPlaying ? 1 : 0, position, channelCode, socket.user.id);
      } catch {}
      socket.to(`channel:${channelCode}`).emit('listen-sync-update', { isPlaying, position, hostId: socket.user.id });
    });
    socket.on('listen-stop', (data) => {
      const channelCode = socket.currentChannel || (data && data.channelCode);
      if (!channelCode || !socket.user) return;
      try { db.prepare('DELETE FROM listen_sessions WHERE channel_code = ? AND host_id = ?').run(channelCode, socket.user.id); } catch {}
      io.to(`channel:${channelCode}`).emit('listen-ended', { hostId: socket.user.id });
    });
    socket.on('listen-get', (data) => {
      const channelCode = socket.currentChannel || (data && data.channelCode);
      if (!channelCode) return;
      const row = db.prepare('SELECT * FROM listen_sessions WHERE channel_code = ? ORDER BY started_at DESC LIMIT 1').get(channelCode);
      if (row) {
        const host = db.prepare('SELECT username FROM users WHERE id = ?').get(row.host_id);
        socket.emit('listen-session', { url: row.media_url, title: row.media_title, hostId: row.host_id, hostName: host ? host.username : 'Unknown', isPlaying: !!row.is_playing, position: row.position });
      } else {
        socket.emit('listen-session', null);
      }
    });
    const gameSessions = new Map();
    socket.on('game-start', (data) => {
      const channelCode = socket.currentChannel || data?.channelCode;
      if (!channelCode || !socket.user || !data?.consoleId || !data?.romName) return;
      const existing = gameSessions.get(channelCode);
      if (existing && existing.hostId !== socket.user.id) return socket.emit('game-error', { msg: 'A game session is already active' });
      const session = { hostId: socket.user.id, hostName: socket.user.username, consoleId: data.consoleId, romName: data.romName, maxPlayers: data.maxPlayers || 4, players: [{ id: socket.user.id, name: socket.user.username, controller: 1 }], controllers: [[1, socket.user.id]], spectators: [], state: 'loading', startedAt: Date.now() };
      gameSessions.set(channelCode, session);
      try { db.prepare('INSERT INTO game_sessions (host_id, channel_code, console_id, rom_name, max_players, state) VALUES (?, ?, ?, ?, ?, ?)').run(socket.user.id, channelCode, data.consoleId, data.romName, session.maxPlayers, 'loading'); } catch {}
      io.to(`channel:${channelCode}`).emit('game-session', session);
    });
    socket.on('game-join', (data) => {
      const channelCode = socket.currentChannel || data?.channelCode;
      if (!channelCode || !socket.user) return;
      const session = gameSessions.get(channelCode);
      if (!session) return socket.emit('game-error', { msg: 'No active game session' });
      const alreadyIn = session.players.find(p => p.id === socket.user.id) || session.spectators.includes(socket.user.id);
      if (!alreadyIn) {
        session.spectators.push(socket.user.id);
        io.to(`channel:${channelCode}`).emit('game-player-joined', { userId: socket.user.id, username: socket.user.username, asSpectator: true });
      }
      socket.emit('game-session', session);
    });
    socket.on('game-request-controller', (data) => {
      const channelCode = socket.currentChannel || data?.channelCode;
      if (!channelCode || !socket.user || !data?.controllerId) return;
      const session = gameSessions.get(channelCode);
      if (!session) return;
      const cid = parseInt(data.controllerId);
      if (cid < 1 || cid > session.maxPlayers) return;
      const taken = session.controllers.find(c => c[0] === cid);
      if (taken) return socket.emit('game-error', { msg: `Controller ${cid} is already taken` });
      session.controllers = session.controllers.filter(c => c[1] !== socket.user.id);
      session.controllers.push([cid, socket.user.id]);
      session.spectators = session.spectators.filter(id => id !== socket.user.id);
      const pIdx = session.players.findIndex(p => p.id === socket.user.id);
      pIdx >= 0 ? session.players[pIdx].controller = cid : session.players.push({ id: socket.user.id, name: socket.user.username, controller: cid });
      io.to(`channel:${channelCode}`).emit('game-controller-assigned', { userId: socket.user.id, username: socket.user.username, controllerId: cid });
    });
    socket.on('game-release-controller', (data) => {
      const channelCode = socket.currentChannel || data?.channelCode;
      if (!channelCode || !socket.user) return;
      const session = gameSessions.get(channelCode);
      if (!session) return;
      const myC = session.controllers.find(c => c[1] === socket.user.id);
      if (!myC) return;
      session.controllers = session.controllers.filter(c => c[1] !== socket.user.id);
      const pIdx = session.players.findIndex(p => p.id === socket.user.id);
      if (pIdx >= 0) session.players[pIdx].controller = null;
      if (!session.spectators.includes(socket.user.id)) session.spectators.push(socket.user.id);
      io.to(`channel:${channelCode}`).emit('game-controller-released', { userId: socket.user.id, controllerId: myC[0] });
    });
    socket.on('game-input', (data) => {
      const channelCode = socket.currentChannel || data?.channelCode;
      if (!channelCode || !socket.user) return;
      const session = gameSessions.get(channelCode);
      if (!session || session.state !== 'playing') return;
      const hasController = session.controllers.find(c => c[1] === socket.user.id && c[0] === data.controllerId);
      if (!hasController) return;
      socket.to(`channel:${channelCode}`).emit('game-input-sync', { userId: socket.user.id, controllerId: data.controllerId, input: data.input, frame: data.frame });
    });
    socket.on('game-state', (data) => {
      const channelCode = socket.currentChannel || data?.channelCode;
      if (!channelCode || !socket.user) return;
      const session = gameSessions.get(channelCode);
      if (!session || session.hostId !== socket.user.id) return;
      session.state = data.state || 'playing';
      try { db.prepare('UPDATE game_sessions SET state = ? WHERE channel_code = ? AND host_id = ?').run(session.state, channelCode, socket.user.id); } catch {}
      io.to(`channel:${channelCode}`).emit('game-session', session);
    });
    socket.on('game-state-sync', (data) => {
      const channelCode = socket.currentChannel || data?.channelCode;
      if (!channelCode || !socket.user) return;
      const session = gameSessions.get(channelCode);
      if (!session || session.hostId !== socket.user.id) return;
      socket.to(`channel:${channelCode}`).emit('game-state-sync', { saveState: data.saveState });
    });
    socket.on('game-end', (data) => {
      const channelCode = socket.currentChannel || data?.channelCode;
      if (!channelCode || !socket.user) return;
      const session = gameSessions.get(channelCode);
      if (!session || session.hostId !== socket.user.id) return;
      gameSessions.delete(channelCode);
      try { db.prepare('DELETE FROM game_sessions WHERE channel_code = ? AND host_id = ?').run(channelCode, socket.user.id); } catch {}
      io.to(`channel:${channelCode}`).emit('game-ended', { hostId: socket.user.id });
    });
    socket.on('game-get', (data) => {
      const channelCode = socket.currentChannel || data?.channelCode;
      if (!channelCode) return;
      const session = gameSessions.get(channelCode);
      socket.emit('game-session', session || null);
    });
  });
  setupBotSocketHandlers(io, db);
}
module.exports = { setupSocketHandlers };
