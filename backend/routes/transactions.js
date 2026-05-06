const express = require('express');
const router = express.Router();
const db = require('../db');

router.get('/', (req, res) => {
  const rows = db.prepare('SELECT * FROM transactions').all();
  res.json(rows);
});

router.get('/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM transactions WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Not found' });
  res.json(row);
});

router.post('/', (req, res) => {
  const { medicine_id, type, quantity } = req.body;

  const medicine = db.prepare('SELECT * FROM medicines WHERE id = ?').get(medicine_id);
  if (!medicine) return res.status(404).json({ error: 'Medicine not found' });

  const newQty = type === 'in'
    ? medicine.quantity + quantity
    : medicine.quantity - quantity;

  if (newQty < 0) return res.status(400).json({ error: 'Insufficient quantity' });

  const insert = db.transaction(() => {
    const result = db.prepare(
      'INSERT INTO transactions (medicine_id, type, quantity) VALUES (?, ?, ?)'
    ).run(medicine_id, type, quantity);
    db.prepare('UPDATE medicines SET quantity = ? WHERE id = ?').run(newQty, medicine_id);
    return result;
  });

  const result = insert();
  res.status(201).json({ id: result.lastInsertRowid, new_quantity: newQty });
});

router.delete('/:id', (req, res) => {
  const result = db.prepare('DELETE FROM transactions WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Not found' });
  res.json({ deleted: true });
});

module.exports = router;
