const express = require('express');
const router = express.Router();
const db = require('../db');

router.get('/summary', (req, res) => {
  try {
    const totalMedicines    = db.prepare('SELECT COUNT(*) AS count FROM medicines').get().count;
    const totalTransactions = db.prepare('SELECT COUNT(*) AS count FROM transactions').get().count;
    const lowStock          = db.prepare('SELECT COUNT(*) AS count FROM medicines WHERE quantity <= 10').get().count;
    const expiringSoon      = db.prepare(
      "SELECT COUNT(*) AS count FROM medicines WHERE expiration_date IS NOT NULL AND expiration_date <= date('now', '+30 days') AND expiration_date >= date('now')"
    ).get().count;
    res.json({ totalMedicines, totalTransactions, lowStock, expiringSoon });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/monthly', (req, res) => {
  try {
    const rows = db.prepare(`
      SELECT
        strftime('%Y-%m', created_at) AS month,
        SUM(CASE WHEN type = 'in'  THEN quantity ELSE 0 END) AS stock_in,
        SUM(CASE WHEN type = 'out' THEN quantity ELSE 0 END) AS stock_out
      FROM transactions
      GROUP BY month
      ORDER BY month ASC
    `).all();
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/top-medicines', (req, res) => {
  try {
    const rows = db.prepare(`
      SELECT
        m.id,
        m.name,
        SUM(t.quantity) AS total_dispensed
      FROM transactions t
      JOIN medicines m ON m.id = t.medicine_id
      WHERE t.type = 'out'
      GROUP BY t.medicine_id
      ORDER BY total_dispensed DESC
      LIMIT 5
    `).all();
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/low-stock', (req, res) => {
  try {
    const rows = db.prepare(`
      SELECT
        m.id,
        m.name,
        m.quantity,
        m.unit,
        m.expiration_date,
        c.name AS category_name
      FROM medicines m
      LEFT JOIN categories c ON c.id = m.category_id
      WHERE m.quantity <= 10
      ORDER BY m.quantity ASC
    `).all();
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/expiring', (req, res) => {
  try {
    const rows = db.prepare(
      "SELECT id, name, quantity, unit, expiration_date FROM medicines WHERE expiration_date IS NOT NULL AND expiration_date <= date('now', '+30 days') AND expiration_date >= date('now') ORDER BY expiration_date ASC"
    ).all();
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
