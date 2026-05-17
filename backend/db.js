const Database = require('better-sqlite3');
const path = require('path');
const db = new Database(path.join(__dirname, 'database.db'));
db.pragma('journal_mode = DELETE');

try { db.exec('ALTER TABLE medicines ADD COLUMN dosage_form TEXT'); } catch (_) {}
try { db.exec('ALTER TABLE medicines ADD COLUMN strength TEXT'); } catch (_) {}
try { db.exec('ALTER TABLE medicines ADD COLUMN description TEXT'); } catch (_) {}

module.exports = db;
