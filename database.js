const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'data.db');

let _db = null;

function save() {
  if (!_db) return;
  const data = _db.export();
  fs.writeFileSync(DB_PATH, Buffer.from(data));
}

function getDb() {
  return {
    prepare(sql) {
      return {
        get(...params) {
          const stmt = _db.prepare(sql);
          if (params.length) stmt.bind(params);
          if (stmt.step()) {
            const row = stmt.getAsObject();
            stmt.free();
            return row;
          }
          stmt.free();
          return undefined;
        },
        all(...params) {
          const stmt = _db.prepare(sql);
          if (params.length) stmt.bind(params);
          const rows = [];
          while (stmt.step()) {
            rows.push(stmt.getAsObject());
          }
          stmt.free();
          return rows;
        },
        run(...params) {
          _db.run(sql, params);
          save();
          return { changes: _db.getRowsModified() };
        },
      };
    },
    exec(sql) {
      _db.run(sql);
      save();
    },
  };
}

let _ready = null;

function initDB() {
  if (_ready) return _ready;
  _ready = (async () => {
    const SQL = await initSqlJs();
    if (fs.existsSync(DB_PATH)) {
      _db = new SQL.Database(fs.readFileSync(DB_PATH));
    } else {
      _db = new SQL.Database();
    }
    _db.run('PRAGMA foreign_keys = ON');

    _db.run(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        username TEXT NOT NULL,
        discriminator TEXT,
        avatar TEXT,
        access_token TEXT,
        refresh_token TEXT,
        token_expires_at INTEGER
      );
      CREATE TABLE IF NOT EXISTS servers (
        id TEXT PRIMARY KEY,
        guild_id TEXT UNIQUE NOT NULL,
        owner_id TEXT NOT NULL,
        verified_role_id TEXT,
        verify_channel_id TEXT,
        verify_message_id TEXT,
        webhook_url TEXT,
        auto_backup INTEGER DEFAULT 0,
        created_at INTEGER
      );
      CREATE TABLE IF NOT EXISTS members (
        id TEXT NOT NULL,
        guild_id TEXT NOT NULL,
        username TEXT,
        discriminator TEXT,
        avatar TEXT,
        roles TEXT DEFAULT '[]',
        joined_at INTEGER,
        backed_at INTEGER,
        PRIMARY KEY (id, guild_id)
      );
      CREATE TABLE IF NOT EXISTS blacklist (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        guild_id TEXT NOT NULL,
        user_id TEXT,
        ip TEXT,
        reason TEXT,
        created_at INTEGER
      );
      CREATE TABLE IF NOT EXISTS verify_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        guild_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        username TEXT,
        ip TEXT,
        status TEXT DEFAULT 'success',
        created_at INTEGER
      );
    `);
    save();
    console.log('[DB] Base de données initialisée');
    return getDb();
  })();
  return _ready;
}

module.exports = initDB;
