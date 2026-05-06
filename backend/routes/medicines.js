const express = require('express');
const router = express.Router();
const db = require('../db');

router.get('/', (req, res) => {
  const rows = db.prepare('SELECT * FROM medicines').all();
  res.json(rows);
});

router.get('/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM medicines WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Not found' });
  res.json(row);
});

router.post('/', (req, res) => {
  const { name, category_id, quantity, unit, expiration_date, description } = req.body;
  const result = db.prepare(
    'INSERT INTO medicines (name, category_id, quantity, unit, expiration_date, description) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(name, category_id, quantity, unit, expiration_date, description);
  res.status(201).json({ id: result.lastInsertRowid });
});

router.put('/:id', (req, res) => {
  const { name, category_id, quantity, unit, expiration_date, description } = req.body;
  const result = db.prepare(
    'UPDATE medicines SET name = ?, category_id = ?, quantity = ?, unit = ?, expiration_date = ?, description = ? WHERE id = ?'
  ).run(name, category_id, quantity, unit, expiration_date, description, req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Not found' });
  res.json({ updated: true });
});

router.delete('/:id', (req, res) => {
  const result = db.prepare('DELETE FROM medicines WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Not found' });
  res.json({ deleted: true });
});

module.exports = router;
