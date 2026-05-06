const express = require('express');
const router = express.Router();
const db = require('../db');

router.get('/', (req, res) => {
  const rows = db.prepare('SELECT id, name, username, role, created_at FROM users').all();
  res.json(rows);
});

router.post('/', (req, res) => {
  const { name, username, password, role } = req.body;

  if (!name || !username || !password) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const result = db.prepare(
    'INSERT INTO users (name, username, password, role) VALUES (?, ?, ?, ?)'
  ).run(name, username, password, role || 'staff');

  res.status(201).json({ id: result.lastInsertRowid });
});

router.delete('/:id', (req, res) => {
  const result = db.prepare('DELETE FROM users WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Not found' });
  res.json({ deleted: true });
});

module.exports = router;
