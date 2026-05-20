const Database = require('better-sqlite3');
const path = require('path');

const dbPath = process.env.DB_PATH || path.join(__dirname, 'database.db');
const db = new Database(dbPath);

db.pragma('journal_mode = DELETE');
db.pragma('synchronous = NORMAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT    NOT NULL,
    username    TEXT    NOT NULL UNIQUE,
    password    TEXT    NOT NULL,
    role        TEXT    NOT NULL DEFAULT 'staff',
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS categories (
    id    INTEGER PRIMARY KEY AUTOINCREMENT,
    name  TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS medicines (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    name            TEXT    NOT NULL,
    category_id     INTEGER REFERENCES categories(id),
    dosage_form     TEXT,
    strength        TEXT,
    quantity        INTEGER NOT NULL DEFAULT 0,
    unit            TEXT,
    expiration_date TEXT,
    description     TEXT,
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS transactions (
    id                INTEGER PRIMARY KEY AUTOINCREMENT,
    medicine_id       INTEGER REFERENCES medicines(id),
    type              TEXT    NOT NULL,
    quantity          INTEGER NOT NULL,
    notes             TEXT,
    patient_name      TEXT,
    course            TEXT,
    section           TEXT,
    illness           TEXT,
    user_id           INTEGER REFERENCES users(id),
    performed_by_name TEXT,
    created_at        DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS settings (
    id      INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER REFERENCES users(id),
    key     TEXT NOT NULL,
    value   TEXT
  );

  CREATE TABLE IF NOT EXISTS ris_requests (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    requested_by TEXT    NOT NULL,
    status       TEXT    NOT NULL DEFAULT 'pending',
    reject_reason TEXT,
    user_id      INTEGER REFERENCES users(id),
    created_at   DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS ris_items (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    ris_id      INTEGER NOT NULL REFERENCES ris_requests(id),
    medicine_id INTEGER NOT NULL REFERENCES medicines(id),
    quantity    INTEGER NOT NULL,
    unit        TEXT,
    note        TEXT
  );
`);

// Safe column additions for databases created before schema migrations
try { db.exec('ALTER TABLE medicines ADD COLUMN dosage_form TEXT'); } catch (_) {}
try { db.exec('ALTER TABLE medicines ADD COLUMN strength TEXT'); } catch (_) {}
try { db.exec('ALTER TABLE medicines ADD COLUMN description TEXT'); } catch (_) {}

try { db.exec('ALTER TABLE transactions ADD COLUMN patient_name TEXT'); } catch (_) {}
try { db.exec('ALTER TABLE transactions ADD COLUMN course TEXT'); } catch (_) {}
try { db.exec('ALTER TABLE transactions ADD COLUMN section TEXT'); } catch (_) {}
try { db.exec('ALTER TABLE transactions ADD COLUMN illness TEXT'); } catch (_) {}
try { db.exec('ALTER TABLE transactions ADD COLUMN user_id INTEGER REFERENCES users(id)'); } catch (_) {}
try { db.exec('ALTER TABLE transactions ADD COLUMN performed_by_name TEXT'); } catch (_) {}

try { db.exec('ALTER TABLE ris_requests ADD COLUMN reject_reason TEXT'); } catch (_) {}
try { db.exec('ALTER TABLE ris_requests ADD COLUMN user_id INTEGER REFERENCES users(id)'); } catch (_) {}

try { db.exec('ALTER TABLE ris_items ADD COLUMN unit TEXT'); } catch (_) {}
try { db.exec('ALTER TABLE ris_items ADD COLUMN note TEXT'); } catch (_) {}

module.exports = db;
