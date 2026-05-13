const db = require('./db');

db.exec(`
  CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE
  );

  CREATE TABLE IF NOT EXISTS medicines (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    category_id INTEGER,
    quantity INTEGER NOT NULL DEFAULT 0,
    unit TEXT,
    dosage_form TEXT,
    strength TEXT,
    expiration_date DATE,
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES categories(id)
  );

  CREATE TABLE IF NOT EXISTS transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    medicine_id INTEGER NOT NULL,
    type TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    notes TEXT,
    patient_name TEXT,
    course TEXT,
    section TEXT,
    illness TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (medicine_id) REFERENCES medicines(id)
  );

  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    username TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'staff',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    key TEXT NOT NULL,
    value TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS ris_requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    requested_by TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS ris_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ris_id INTEGER NOT NULL,
    medicine_id INTEGER NOT NULL,
    quantity INTEGER NOT NULL,
    FOREIGN KEY (ris_id) REFERENCES ris_requests(id),
    FOREIGN KEY (medicine_id) REFERENCES medicines(id)
  );
`);

try { db.exec('ALTER TABLE medicines ADD COLUMN dosage_form TEXT'); } catch (_) {}
try { db.exec('ALTER TABLE medicines ADD COLUMN strength TEXT'); } catch (_) {}
try { db.exec('ALTER TABLE transactions ADD COLUMN notes TEXT'); } catch (_) {}
try { db.exec('ALTER TABLE transactions ADD COLUMN patient_name TEXT'); } catch (_) {}
try { db.exec('ALTER TABLE transactions ADD COLUMN course TEXT'); } catch (_) {}
try { db.exec('ALTER TABLE transactions ADD COLUMN section TEXT'); } catch (_) {}
try { db.exec('ALTER TABLE transactions ADD COLUMN illness TEXT'); } catch (_) {}

const existing = db.prepare('SELECT * FROM users WHERE username = ?').get('admin');

if (!existing) {
  db.prepare(`INSERT INTO users (name, username, password, role) VALUES (?, ?, ?, ?)`)
    .run('Super Admin', 'admin', 'admin123', 'admin');
}

console.log('Database initialized successfully.');
db.close();
