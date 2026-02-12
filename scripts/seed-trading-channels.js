const Database = require('better-sqlite3');
const path = require('path');
const crypto = require('crypto');
const os = require('os');
const dataDir = process.env.HAVEN_DATA_DIR || (process.platform === 'win32' ? path.join(process.env.APPDATA || os.homedir(), 'Haven') : path.join(os.homedir(), '.haven'));
const DB_PATH = path.join(dataDir, 'haven.db');
console.log(`\n📁 Data directory: ${dataDir}`);
console.log(`📂 Database path: ${DB_PATH}\n`);
const fs = require('fs');
if (!fs.existsSync(DB_PATH)) { console.error('[!] Database not found - start Haven server first and register an admin account'); process.exit(1); }
const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');
const genCode = () => crypto.randomBytes(4).toString('hex');
const admin = db.prepare('SELECT id FROM users WHERE is_admin = 1 LIMIT 1').get();
if (!admin) { console.error('[!] No admin user found - register admin first'); process.exit(1); }
const adminId = admin.id;
const createCh = (name, type, parentId, isPrivate) => {
  const code = genCode();
  const existing = db.prepare('SELECT id FROM channels WHERE name = ? AND parent_id IS ?').get(name, parentId);
  if (existing) { console.log(`  [skip] "${name}" already exists`); return existing.id; }
  const res = db.prepare('INSERT INTO channels (name, code, created_by, channel_type, parent_id, is_private) VALUES (?, ?, ?, ?, ?, ?)').run(name, code, adminId, type, parentId, isPrivate ? 1 : 0);
  db.prepare('INSERT INTO channel_members (channel_id, user_id) VALUES (?, ?)').run(res.lastInsertRowid, adminId);
  console.log(`  [+] Created "${name}" (${code}) ${isPrivate ? '[PRIVATE]' : '[PUBLIC]'}`);
  return res.lastInsertRowid;
};
console.log('\n📊 Creating PRIVATE Trading Hub (Admin-Only)...');
const tradingHubId = createCh('📊 Trading Hub', 'text', null, true);
createCh('Admin Charting', 'text', tradingHubId, true);
createCh('Portfolio', 'text', tradingHubId, true);
createCh('Executed Trades', 'text', tradingHubId, true);
console.log('\n📈 Creating PUBLIC Market Feed...');
const marketFeedId = createCh('📈 Market Feed', 'text', null, false);
createCh('Prompting', 'text', marketFeedId, false);
createCh('Subscriptions', 'text', marketFeedId, false);
createCh('Newsfeeds', 'text', marketFeedId, false);
console.log('\n✅ Trading channels seeded successfully!');
console.log('   Private channels visible only to admins');
console.log('   Public channels visible to all users\n');
db.close();
