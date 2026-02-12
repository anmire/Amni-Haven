const Database = require('better-sqlite3');
const path = require('path');
const { DB_PATH } = require('./paths');
let db;
function initDatabase() {
  db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL COLLATE NOCASE,
      password_hash TEXT NOT NULL,
      is_admin INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS channels (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      code TEXT UNIQUE NOT NULL,
      created_by INTEGER REFERENCES users(id),
      channel_type TEXT NOT NULL DEFAULT 'both',
      parent_id INTEGER REFERENCES channels(id) ON DELETE CASCADE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS channel_members (
      channel_id INTEGER REFERENCES channels(id) ON DELETE CASCADE,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (channel_id, user_id)
    );
    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      channel_id INTEGER REFERENCES channels(id) ON DELETE CASCADE,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      content TEXT NOT NULL,
      reply_to INTEGER REFERENCES messages(id) ON DELETE SET NULL,
      is_bot INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS reactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      message_id INTEGER NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      emoji TEXT NOT NULL,
      gif_url TEXT DEFAULT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(message_id, user_id, emoji)
    );
    CREATE TABLE IF NOT EXISTS bans (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      banned_by INTEGER NOT NULL REFERENCES users(id),
      reason TEXT DEFAULT '',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id)
    );
    CREATE TABLE IF NOT EXISTS mutes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      muted_by INTEGER NOT NULL REFERENCES users(id),
      reason TEXT DEFAULT '',
      expires_at DATETIME NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS server_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS user_preferences (
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      key TEXT NOT NULL,
      value TEXT NOT NULL,
      PRIMARY KEY (user_id, key)
    );
    CREATE TABLE IF NOT EXISTS eula_acceptances (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      version TEXT NOT NULL,
      ip_address TEXT,
      accepted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, version)
    );
    CREATE TABLE IF NOT EXISTS blocks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      blocker_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      blocked_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(blocker_id, blocked_id)
    );
    CREATE TABLE IF NOT EXISTS dm_channels (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user1_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      user2_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      channel_code TEXT UNIQUE NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user1_id, user2_id)
    );
    CREATE TABLE IF NOT EXISTS bots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      token TEXT UNIQUE NOT NULL,
      webhook_url TEXT DEFAULT NULL,
      created_by INTEGER NOT NULL REFERENCES users(id),
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS private_calls (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      caller_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      callee_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      status TEXT NOT NULL DEFAULT 'pending',
      channel_code TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS game_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      host_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      channel_code TEXT NOT NULL,
      console_id TEXT NOT NULL,
      rom_name TEXT NOT NULL,
      max_players INTEGER DEFAULT 4,
      state TEXT DEFAULT 'waiting',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_game_sessions_channel ON game_sessions(channel_code, state);
    CREATE INDEX IF NOT EXISTS idx_messages_channel ON messages(channel_id, created_at);
    CREATE INDEX IF NOT EXISTS idx_channel_code ON channels(code);
    CREATE INDEX IF NOT EXISTS idx_reactions_message ON reactions(message_id);
    CREATE INDEX IF NOT EXISTS idx_bans_user ON bans(user_id);
    CREATE INDEX IF NOT EXISTS idx_mutes_user ON mutes(user_id, expires_at);
    CREATE INDEX IF NOT EXISTS idx_blocks_blocker ON blocks(blocker_id);
    CREATE INDEX IF NOT EXISTS idx_blocks_blocked ON blocks(blocked_id);
    CREATE INDEX IF NOT EXISTS idx_dm_channels_users ON dm_channels(user1_id, user2_id);
    CREATE INDEX IF NOT EXISTS idx_bots_token ON bots(token);
    CREATE INDEX IF NOT EXISTS idx_private_calls_status ON private_calls(status, created_at);
  `);

  try {
    db.prepare("SELECT reply_to FROM messages LIMIT 0").get();
  } catch {
    db.exec("ALTER TABLE messages ADD COLUMN reply_to INTEGER REFERENCES messages(id) ON DELETE SET NULL");
  }
  try {
    db.exec("CREATE INDEX IF NOT EXISTS idx_reactions_message ON reactions(message_id)");
  } catch {}
  try {
    db.prepare("SELECT edited_at FROM messages LIMIT 0").get();
  } catch {
    db.exec("ALTER TABLE messages ADD COLUMN edited_at DATETIME DEFAULT NULL");
  }
  try {
    db.prepare("SELECT channel_type FROM channels LIMIT 0").get();
  } catch {
    db.exec("ALTER TABLE channels ADD COLUMN channel_type TEXT NOT NULL DEFAULT 'both'");
  }
  try {
    db.prepare("SELECT is_bot FROM messages LIMIT 0").get();
  } catch {
    db.exec("ALTER TABLE messages ADD COLUMN is_bot INTEGER DEFAULT 0");
  }
  try {
    db.prepare("SELECT parent_id FROM channels LIMIT 0").get();
  } catch {
    db.exec("ALTER TABLE channels ADD COLUMN parent_id INTEGER REFERENCES channels(id) ON DELETE CASCADE");
  }
  try {
    db.prepare("SELECT gif_url FROM reactions LIMIT 0").get();
  } catch {
    db.exec("ALTER TABLE reactions ADD COLUMN gif_url TEXT DEFAULT NULL");
  }
  try {
    db.prepare("SELECT is_private FROM channels LIMIT 0").get();
  } catch {
    db.exec("ALTER TABLE channels ADD COLUMN is_private INTEGER DEFAULT 0");
  }
  try {
    db.prepare("SELECT is_html FROM messages LIMIT 0").get();
  } catch {
    db.exec("ALTER TABLE messages ADD COLUMN is_html INTEGER DEFAULT 0");
  }
  db.exec(`
    CREATE TABLE IF NOT EXISTS channel_permissions (
      channel_id INTEGER NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      granted_by INTEGER REFERENCES users(id),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (channel_id, user_id)
    );
    CREATE INDEX IF NOT EXISTS idx_channel_perms_user ON channel_permissions(user_id);
    CREATE INDEX IF NOT EXISTS idx_channel_perms_channel ON channel_permissions(channel_id);
  `);
  db.exec(`
    CREATE TABLE IF NOT EXISTS high_scores (
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      game TEXT NOT NULL,
      score INTEGER NOT NULL DEFAULT 0,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (user_id, game)
    );
  `);
  db.exec(`
    CREATE TABLE IF NOT EXISTS whitelist (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL COLLATE NOCASE,
      added_by INTEGER REFERENCES users(id),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);
  db.exec(`
    CREATE TABLE IF NOT EXISTS blocks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      blocker_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      blocked_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(blocker_id, blocked_id)
    );
    CREATE INDEX IF NOT EXISTS idx_blocks_blocker ON blocks(blocker_id);
    CREATE INDEX IF NOT EXISTS idx_blocks_blocked ON blocks(blocked_id);
  `);
  db.exec(`
    CREATE TABLE IF NOT EXISTS dm_channels (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user1_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      user2_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      channel_code TEXT UNIQUE NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user1_id, user2_id)
    );
    CREATE INDEX IF NOT EXISTS idx_dm_channels_users ON dm_channels(user1_id, user2_id);
  `);
  db.exec(`
    CREATE TABLE IF NOT EXISTS bots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      token TEXT UNIQUE NOT NULL,
      webhook_url TEXT DEFAULT NULL,
      created_by INTEGER NOT NULL REFERENCES users(id),
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_bots_token ON bots(token);
  `);
  db.exec(`
    CREATE TABLE IF NOT EXISTS private_calls (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      caller_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      callee_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      status TEXT NOT NULL DEFAULT 'pending',
      channel_code TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_private_calls_status ON private_calls(status, created_at);
  `);
  const insertSetting = db.prepare(
    'INSERT OR IGNORE INTO server_settings (key, value) VALUES (?, ?)'
  );
  insertSetting.run('member_visibility', 'online');
  insertSetting.run('cleanup_enabled', 'false');
  insertSetting.run('cleanup_max_age_days', '0');
  insertSetting.run('cleanup_max_size_mb', '0');
  insertSetting.run('whitelist_enabled', 'false');
  insertSetting.run('giphy_api_key', '');
  insertSetting.run('tunnel_enabled', 'false');
  insertSetting.run('tunnel_provider', 'localtunnel');
  db.exec(`
    CREATE TABLE IF NOT EXISTS pinned_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      message_id INTEGER NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
      channel_id INTEGER NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
      pinned_by INTEGER NOT NULL REFERENCES users(id),
      pinned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(message_id)
    );
    CREATE INDEX IF NOT EXISTS idx_pinned_channel ON pinned_messages(channel_id);
  `);
  db.exec(`
    CREATE TABLE IF NOT EXISTS listen_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      channel_code TEXT NOT NULL,
      host_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      media_url TEXT NOT NULL,
      media_title TEXT DEFAULT '',
      is_playing INTEGER DEFAULT 1,
      position REAL DEFAULT 0,
      started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_listen_channel ON listen_sessions(channel_code);
  `);
  return db;
}
function getDb() {
  return db;
}
module.exports = { initDatabase, getDb };
