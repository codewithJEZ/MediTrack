const express = require('express');
const router = express.Router();
const db = require('../db');

router.get('/', (req, res) => {
  const { user_id } = req.query;
  let rows;
  if (user_id === undefined) {
    rows = db.prepare('SELECT * FROM settings').all();
  } else if (user_id === 'null' || user_id === '') {
    rows = db.prepare('SELECT * FROM settings WHERE user_id IS NULL').all();
  } else {
    rows = db.prepare('SELECT * FROM settings WHERE user_id = ? OR user_id IS NULL').all(user_id);
  }
  res.json(rows);
});

router.get('/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM settings WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Not found' });
  res.json(row);
});

router.post('/', (req, res) => {
  const { user_id = null, key, value } = req.body;
  const result = db.prepare(
    'INSERT INTO settings (user_id, key, value) VALUES (?, ?, ?)'
  ).run(user_id, key, value);
  res.status(201).json({ id: result.lastInsertRowid });
});

router.put('/:id', (req, res) => {
  const { user_id = null, key, value } = req.body;
  const result = db.prepare(
    'UPDATE settings SET user_id = ?, key = ?, value = ? WHERE id = ?'
  ).run(user_id, key, value, req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Not found' });
  res.json({ updated: true });
});

router.delete('/:id', (req, res) => {
  const result = db.prepare('DELETE FROM settings WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Not found' });
  res.json({ deleted: true });
});

module.exports = router;
