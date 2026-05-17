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
  const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
  if (existing) return res.status(409).json({ error: 'Username already exists' });
  const result = db.prepare(
    'INSERT INTO users (name, username, password, role) VALUES (?, ?, ?, ?)'
  ).run(name, username, password, role || 'staff');
  res.status(201).json({ id: result.lastInsertRowid });
});

router.put('/:id', (req, res) => {
  const id = Number(req.params.id);
  const { name, username, role } = req.body;
  if (!name || !username || !role) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  const existing = db.prepare('SELECT id FROM users WHERE username = ? AND id != ?').get(username, id);
  if (existing) return res.status(409).json({ error: 'Username already exists' });
  const result = db.prepare(
    'UPDATE users SET name = ?, username = ?, role = ? WHERE id = ?'
  ).run(name, username, role, id);
  if (result.changes === 0) return res.status(404).json({ error: 'Not found' });
  res.json({ updated: true });
});

router.post('/:id/reset-password', (req, res) => {
  const result = db.prepare('UPDATE users SET password = ? WHERE id = ?').run('123456', req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Not found' });
  res.json({ reset: true });
});

router.delete('/:id', (req, res) => {
  const id = Number(req.params.id);

  if (id === 1) {
    return res.status(403).json({ error: 'Super Admin cannot be deleted' });
  }

  const result = db.prepare('DELETE FROM users WHERE id = ?').run(id);

  if (result.changes === 0) {
    return res.status(404).json({ error: 'User not found' });
  }

  res.json({ deleted: true });
});

module.exports = router;
