const express = require('express');
const router = express.Router();
const db = require('../db');

router.get('/summary', (req, res) => {
  try {
    const from = req.query.from || null;
    const to   = req.query.to   || null;
    const conds = [];
    const params = [];
    if (from) { conds.push(`date(created_at) >= ?`); params.push(from); }
    if (to)   { conds.push(`date(created_at) <= ?`); params.push(to); }
    const txWhere    = conds.length ? `WHERE ${conds.join(' AND ')}` : '';
    const txWhereAnd = conds.length ? `AND ${conds.join(' AND ')}` : '';

    const totalMedicines    = db.prepare('SELECT COUNT(*) AS count FROM medicines').get().count;
    const totalTransactions = db.prepare(`SELECT COUNT(*) AS count FROM transactions ${txWhere}`).get(...params).count;
    const lowStock          = db.prepare('SELECT COUNT(*) AS count FROM medicines WHERE quantity <= 10').get().count;
    const expiringSoon      = db.prepare(
      "SELECT COUNT(*) AS count FROM medicines WHERE expiration_date IS NOT NULL AND expiration_date <= date('now', '+30 days') AND expiration_date >= date('now')"
    ).get().count;
    const totalStockIn  = db.prepare(`SELECT COALESCE(SUM(quantity),0) AS total FROM transactions WHERE type='in' ${txWhereAnd}`).get(...params).total  || 0;
    const totalStockOut = db.prepare(`SELECT COALESCE(SUM(quantity),0) AS total FROM transactions WHERE type='out' ${txWhereAnd}`).get(...params).total || 0;
    const approvedRIS   = db.prepare("SELECT COUNT(*) AS count FROM ris_requests WHERE status IN ('approved','delivered')").get().count || 0;
    res.json({ totalMedicines, totalTransactions, lowStock, expiringSoon, totalStockIn, totalStockOut, approvedRIS });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/monthly', (req, res) => {
  try {
    const from = req.query.from || null;
    const to   = req.query.to   || null;
    const conds = [];
    const params = [];
    if (from) { conds.push(`date(created_at) >= ?`); params.push(from); }
    if (to)   { conds.push(`date(created_at) <= ?`); params.push(to); }
    const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';
    const rows = db.prepare(`
      SELECT
        strftime('%Y-%m', created_at) AS month,
        SUM(CASE WHEN type = 'in'  THEN quantity ELSE 0 END) AS stock_in,
        SUM(CASE WHEN type = 'out' THEN quantity ELSE 0 END) AS stock_out
      FROM transactions
      ${where}
      GROUP BY month
      ORDER BY month ASC
    `).all(...params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/top-medicines', (req, res) => {
  try {
    const from = req.query.from || null;
    const to   = req.query.to   || null;
    const conds = [];
    const params = [];
    if (from) { conds.push(`date(t.created_at) >= ?`); params.push(from); }
    if (to)   { conds.push(`date(t.created_at) <= ?`); params.push(to); }
    const whereAnd = conds.length ? `AND ${conds.join(' AND ')}` : '';
    const rows = db.prepare(`
      SELECT
        m.id,
        m.name,
        SUM(t.quantity) AS total_dispensed
      FROM transactions t
      JOIN medicines m ON m.id = t.medicine_id
      WHERE t.type = 'out' ${whereAnd}
      GROUP BY t.medicine_id
      ORDER BY total_dispensed DESC
      LIMIT 5
    `).all(...params);
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

router.get('/personal-summary', (req, res) => {
  try {
    const uid   = req.query.user_id   ? Number(req.query.user_id) : 0;
    const uname = req.query.user_name ? String(req.query.user_name) : '';
    const myTransactions = db.prepare(
      'SELECT COUNT(*) AS count FROM transactions WHERE user_id = ? OR (user_id IS NULL AND performed_by_name = ?)'
    ).get(uid, uname).count;
    const myRequests = db.prepare(
      'SELECT COUNT(*) AS count FROM ris_requests WHERE user_id = ? OR (user_id IS NULL AND requested_by = ?)'
    ).get(uid, uname).count;
    const myApproved = db.prepare(
      "SELECT COUNT(*) AS count FROM ris_requests WHERE (user_id = ? OR (user_id IS NULL AND requested_by = ?)) AND status IN ('approved','delivered')"
    ).get(uid, uname).count;
    const myDispensed = db.prepare(
      "SELECT COALESCE(SUM(quantity),0) AS total FROM transactions WHERE (user_id = ? OR (user_id IS NULL AND performed_by_name = ?)) AND type = 'out'"
    ).get(uid, uname).total || 0;
    res.json({ myTransactions, myRequests, myApproved, myDispensed });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/personal-monthly', (req, res) => {
  try {
    const uid   = req.query.user_id   ? Number(req.query.user_id) : 0;
    const uname = req.query.user_name ? String(req.query.user_name) : '';
    const rows = db.prepare(`
      SELECT
        strftime('%Y-%m', created_at) AS month,
        SUM(CASE WHEN type = 'in'  THEN quantity ELSE 0 END) AS stock_in,
        SUM(CASE WHEN type = 'out' THEN quantity ELSE 0 END) AS stock_out
      FROM transactions
      WHERE user_id = ? OR (user_id IS NULL AND performed_by_name = ?)
      GROUP BY month
      ORDER BY month ASC
    `).all(uid, uname);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/personal-medicines', (req, res) => {
  try {
    const uid   = req.query.user_id   ? Number(req.query.user_id) : 0;
    const uname = req.query.user_name ? String(req.query.user_name) : '';
    const rows = db.prepare(`
      SELECT
        m.name,
        SUM(t.quantity) AS total_dispensed
      FROM transactions t
      JOIN medicines m ON m.id = t.medicine_id
      WHERE (t.user_id = ? OR (t.user_id IS NULL AND t.performed_by_name = ?)) AND t.type = 'out'
      GROUP BY t.medicine_id
      ORDER BY total_dispensed DESC
      LIMIT 8
    `).all(uid, uname);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/personal-ris-status', (req, res) => {
  try {
    const uid   = req.query.user_id   ? Number(req.query.user_id) : 0;
    const uname = req.query.user_name ? String(req.query.user_name) : '';
    const rows = db.prepare(`
      SELECT status, COUNT(*) AS count
      FROM ris_requests
      WHERE user_id = ? OR (user_id IS NULL AND requested_by = ?)
      GROUP BY status
      ORDER BY count DESC
    `).all(uid, uname);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/transactions-report', (req, res) => {
  try {
    const from = req.query.from || null;
    const to   = req.query.to   || null;
    const conditions = [];
    const params     = [];
    if (from) { conditions.push(`date(t.created_at) >= ?`); params.push(from); }
    if (to)   { conditions.push(`date(t.created_at) <= ?`); params.push(to);   }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const rows = db.prepare(`
      SELECT
        t.id,
        m.name                                          AS medicine_name,
        t.type,
        t.quantity,
        t.notes,
        COALESCE(u.name, t.performed_by_name, '-')      AS performed_by,
        t.created_at
      FROM transactions t
      LEFT JOIN medicines m ON m.id = t.medicine_id
      LEFT JOIN users     u ON u.id = t.user_id
      ${where}
      ORDER BY t.id DESC
    `).all(...params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/recent-transactions', (req, res) => {
  try {
    const rows = db.prepare(`
      SELECT
        t.id,
        m.name AS medicine_name,
        t.type,
        t.quantity,
        t.notes,
        t.created_at
      FROM transactions t
      JOIN medicines m ON m.id = t.medicine_id
      ORDER BY t.id DESC
      LIMIT 10
    `).all();
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
