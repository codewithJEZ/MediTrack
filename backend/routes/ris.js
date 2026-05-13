const express = require('express');
const router = express.Router();
const db = require('../db');

try { db.exec(`
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
    unit TEXT,
    note TEXT,
    FOREIGN KEY (ris_id) REFERENCES ris_requests(id),
    FOREIGN KEY (medicine_id) REFERENCES medicines(id)
  );
`); } catch (_) {}

try { db.exec(`ALTER TABLE ris_items ADD COLUMN unit TEXT`); } catch (_) {}
try { db.exec(`ALTER TABLE ris_items ADD COLUMN note TEXT`); } catch (_) {}
try { db.exec(`ALTER TABLE ris_requests ADD COLUMN reject_reason TEXT`); } catch (_) {}

router.post('/', (req, res) => {
  const { requested_by, items } = req.body;
  if (!requested_by || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'requested_by and items[] are required.' });
  }
  for (const item of items) {
    if (!item.medicine_id || !item.quantity || item.quantity <= 0) {
      return res.status(400).json({ error: 'Each item requires medicine_id and a positive quantity.' });
    }
  }
  try {
    const result = db.transaction(() => {
      const ris = db.prepare(
        `INSERT INTO ris_requests (requested_by, status) VALUES (?, 'pending')`
      ).run(requested_by);
      const risId = ris.lastInsertRowid;
      const insertItem = db.prepare(
        `INSERT INTO ris_items (ris_id, medicine_id, quantity, unit, note) VALUES (?, ?, ?, ?, ?)`
      );
      const getMedUnit = db.prepare(`SELECT unit FROM medicines WHERE id = ?`);
      for (const item of items) {
        let unit = item.unit || null;
        if (!unit) {
          const med = getMedUnit.get(item.medicine_id);
          unit = med ? (med.unit || null) : null;
        }
        insertItem.run(risId, item.medicine_id, item.quantity, unit, item.note || null);
      }
      return risId;
    })();
    const created = db.prepare(`SELECT * FROM ris_requests WHERE id = ?`).get(result);
    const createdItems = db.prepare(`
      SELECT ri.medicine_id,
             m.name AS medicine_name,
             m.unit AS unit,
             SUM(ri.quantity) AS quantity,
             GROUP_CONCAT(ri.note, ', ') AS note
      FROM ris_items ri
      JOIN medicines m ON ri.medicine_id = m.id
      WHERE ri.ris_id = ?
      GROUP BY ri.medicine_id
`).all(result);
    res.status(201).json({ ...created, items: createdItems });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/', (req, res) => {
  try {
    const rows = db.prepare(`SELECT * FROM ris_requests ORDER BY id DESC`).all();
    const itemsStmt = db.prepare(`
      SELECT ri.medicine_id,
             m.name AS medicine_name,
             m.unit AS unit,
             SUM(ri.quantity) AS quantity,
             GROUP_CONCAT(ri.note, ', ') AS note
      FROM ris_items ri
      JOIN medicines m ON ri.medicine_id = m.id
      WHERE ri.ris_id = ?
      GROUP BY ri.medicine_id
`);
    const result = rows.map(r => ({ ...r, items: itemsStmt.all(r.id) }));
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', (req, res) => {
  try {
    const row = db.prepare(`SELECT * FROM ris_requests WHERE id = ?`).get(req.params.id);
    if (!row) return res.status(404).json({ error: 'RIS not found.' });
    const items = db.prepare(`
      SELECT ri.medicine_id,
             m.name AS medicine_name,
             m.unit AS unit,
             SUM(ri.quantity) AS quantity,
             GROUP_CONCAT(ri.note, ', ') AS note
      FROM ris_items ri
      JOIN medicines m ON ri.medicine_id = m.id
      WHERE ri.ris_id = ?
      GROUP BY ri.medicine_id
`).all(row.id);
    res.json({ ...row, items });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id/approve', (req, res) => {
  try {
    const ris = db.prepare(`SELECT * FROM ris_requests WHERE id = ?`).get(req.params.id);
    if (!ris) return res.status(404).json({ error: 'RIS not found.' });
    if (ris.status !== 'pending') {
      return res.status(400).json({ error: `RIS is already ${ris.status}.` });
    }
    db.prepare(`UPDATE ris_requests SET status = 'approved_for_purchase' WHERE id = ?`).run(ris.id);
    res.json({ ...ris, status: 'approved_for_purchase' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id/deliver', (req, res) => {
  try {
    const ris = db.prepare(`SELECT * FROM ris_requests WHERE id = ?`).get(req.params.id);
    if (!ris) return res.status(404).json({ error: 'RIS not found.' });
    if (ris.status === 'completed') {
      return res.status(400).json({ error: 'RIS has already been delivered.' });
    }
    if (ris.status !== 'approved_for_purchase') {
      return res.status(400).json({ error: `RIS cannot be delivered. Current status: ${ris.status}.` });
    }
    const items = db.prepare(`SELECT * FROM ris_items WHERE ris_id = ?`).all(ris.id);
    db.transaction(() => {
      for (const item of items) {
        db.prepare(`UPDATE medicines SET quantity = quantity + ? WHERE id = ?`).run(item.quantity, item.medicine_id);
        db.prepare(
          `INSERT INTO transactions (medicine_id, type, quantity, notes) VALUES (?, 'in', ?, ?)`
        ).run(item.medicine_id, item.quantity, `Restock via RIS #${ris.id}`);
      }
      db.prepare(`UPDATE ris_requests SET status = 'completed' WHERE id = ?`).run(ris.id);
    })();
    res.json({ ...ris, status: 'completed' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id/reject', (req, res) => {
  try {
    const ris = db.prepare(`SELECT * FROM ris_requests WHERE id = ?`).get(req.params.id);
    if (!ris) return res.status(404).json({ error: 'RIS not found.' });
    if (ris.status !== 'pending') {
      return res.status(400).json({ error: `RIS is already ${ris.status}.` });
    }
    const reason = (req.body && req.body.reason) ? req.body.reason.trim() : null;
    db.prepare(`UPDATE ris_requests SET status = 'rejected', reject_reason = ? WHERE id = ?`).run(reason, req.params.id);
    res.json({ ...ris, status: 'rejected', reject_reason: reason });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', (req, res) => {
  try {
    const ris = db.prepare(`SELECT * FROM ris_requests WHERE id = ?`).get(req.params.id);
    if (!ris) return res.status(404).json({ error: 'RIS not found.' });
    db.transaction(() => {
      db.prepare(`DELETE FROM ris_items WHERE ris_id = ?`).run(ris.id);
      db.prepare(`DELETE FROM ris_requests WHERE id = ?`).run(ris.id);
    })();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
