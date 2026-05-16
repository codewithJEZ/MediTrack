const express = require('express');
const router = express.Router();
const db = require('../db');
const bcrypt = require('bcryptjs');

function verifyPassword(input, stored) {
  if (stored && stored.startsWith('$2')) {
    return bcrypt.compareSync(input, stored);
  }
  return input === stored;
}

router.post('/login', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Missing credentials' });
  }

  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);

  if (!user || !verifyPassword(password, user.password)) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  res.json({
    id: user.id,
    name: user.name,
    role: user.role
  });
});

router.post('/change-password', (req, res) => {
  const { userId, currentPassword, newPassword } = req.body;

  if (!userId || !currentPassword || !newPassword) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  if (!verifyPassword(currentPassword, user.password)) {
    return res.status(401).json({ error: 'Current password is incorrect' });
  }

  const hashed = bcrypt.hashSync(newPassword, 10);
  db.prepare('UPDATE users SET password = ? WHERE id = ?').run(hashed, userId);

  res.json({ updated: true });
});

module.exports = router;
