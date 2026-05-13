const express = require('express');
const router = express.Router();
const db = require('../db');

try { db.exec('ALTER TABLE transactions ADD COLUMN user_id INTEGER REFERENCES users(id)'); } catch (_) {}

const recentRequests = new Map();
const DEDUP_WINDOW_MS = 5000;

const TX_SELECT = `
  SELECT
    t.id,
    t.medicine_id,
    t.type,
    t.quantity,
    t.notes,
    t.patient_name,
    t.course,
    t.section,
    t.illness,
    t.user_id,
    t.created_at,
    m.name  AS medicine_name,
    u.name  AS performed_by
  FROM transactions t
  LEFT JOIN medicines m ON m.id = t.medicine_id
  LEFT JOIN users     u ON u.id = t.user_id
`;

router.get('/', (req, res) => {
  try {
    const rows = db.prepare(`${TX_SELECT} ORDER BY t.id ASC`).all();
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch transactions.' });
  }
});

router.get('/:id', (req, res) => {
  try {
    const row = db.prepare(`${TX_SELECT} WHERE t.id = ?`).get(req.params.id);
    if (!row) return res.status(404).json({ error: 'Transaction not found.' });
    res.json(row);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch transaction.' });
  }
});

router.post('/', (req, res) => {
  const { medicine_id, type, quantity, notes, patient_name, course, section, illness, user_id } = req.body;

  const missing = [];
  if (!medicine_id) missing.push('medicine_id');
  if (!type)        missing.push('type');
  if (!quantity)    missing.push('quantity');

  if (missing.length) {
    return res.status(400).json({ error: `Missing required fields: ${missing.join(', ')}.` });
  }

  if (type !== 'in' && type !== 'out') {
    return res.status(400).json({ error: 'type must be "in" or "out".' });
  }

  if (type === 'in') {
    return res.status(400).json({ error: 'Stock-in requires an approved RIS.' });
  }

  if (type === 'out') {
    const dispMissing = [];
    if (!patient_name || !String(patient_name).trim()) dispMissing.push('patient_name');
    if (!course       || !String(course).trim())       dispMissing.push('course');
    if (!section      || !String(section).trim())      dispMissing.push('section');
    if (!illness      || !String(illness).trim())      dispMissing.push('illness');
    if (dispMissing.length) {
      return res.status(400).json({ error: `Missing required fields: ${dispMissing.join(', ')}.` });
    }
  }

  const qty = Number(quantity);
  if (!Number.isInteger(qty) || qty <= 0) {
    return res.status(400).json({ error: 'quantity must be a positive integer.' });
  }

  const pName   = patient_name ? String(patient_name).trim() : null;
  const pCourse = course       ? String(course).trim()       : null;
  const pSec    = section      ? String(section).trim()      : null;
  const pIll    = illness      ? String(illness).trim()      : null;
  const uid     = user_id ? Number(user_id) : null;

  const now = Date.now();
  const reqKey = `${medicine_id}|${type}|${qty}|${pName}|${pCourse}|${pSec}|${pIll}|${uid}`;
  if (recentRequests.has(reqKey) && (now - recentRequests.get(reqKey)) < DEDUP_WINDOW_MS) {
    return res.status(429).json({ error: 'Duplicate request detected. Please wait before resubmitting.' });
  }
  recentRequests.set(reqKey, now);
  for (const [key, ts] of recentRequests) {
    if (now - ts > DEDUP_WINDOW_MS) recentRequests.delete(key);
  }

  try {
    const medicine = db.prepare('SELECT * FROM medicines WHERE id = ?').get(medicine_id);
    if (!medicine) return res.status(404).json({ error: 'Medicine not found.' });

    const newQty = type === 'in' ? medicine.quantity + qty : medicine.quantity - qty;
    if (newQty < 0) {
      return res.status(400).json({ error: `Insufficient stock. Only ${medicine.quantity} available.` });
    }

    const insert = db.transaction(() => {
      const result = db.prepare(`
        INSERT INTO transactions
          (medicine_id, type, quantity, notes, patient_name, course, section, illness, user_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(medicine_id, type, qty, notes ? String(notes).trim() : null, pName, pCourse, pSec, pIll, uid);
      db.prepare('UPDATE medicines SET quantity = ? WHERE id = ?').run(newQty, medicine_id);
      return result;
    });

    const result = insert();
    const created = db.prepare(`${TX_SELECT} WHERE t.id = ?`).get(result.lastInsertRowid);
    res.status(201).json({ ...created, new_quantity: newQty });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create transaction.' });
  }
});

router.delete('/:id', (req, res) => {
  try {
    const tx = db.prepare('SELECT id, medicine_id, type, quantity FROM transactions WHERE id = ?').get(req.params.id);
    if (!tx) return res.status(404).json({ error: 'Transaction not found.' });

    const medicine = db.prepare('SELECT id, quantity FROM medicines WHERE id = ?').get(tx.medicine_id);
    if (!medicine) return res.status(404).json({ error: 'Associated medicine not found.' });

    const isIn   = (tx.type || '').toUpperCase() === 'IN';
    const newQty = isIn ? medicine.quantity - tx.quantity : medicine.quantity + tx.quantity;
    if (newQty < 0) {
      return res.status(400).json({ error: 'Cannot delete: reverting this transaction would result in negative stock.' });
    }

    db.transaction(() => {
      db.prepare('UPDATE medicines SET quantity = ? WHERE id = ?').run(newQty, tx.medicine_id);
      db.prepare('DELETE FROM transactions WHERE id = ?').run(tx.id);
    })();

    res.json({ success: true, message: 'Transaction deleted and stock updated.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete transaction.' });
  }
});

module.exports = router;
