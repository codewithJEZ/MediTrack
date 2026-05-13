const express = require('express');
const router = express.Router();
const db = require('../db');

router.get('/', (req, res) => {
  try {
    const rows = db.prepare(
      'SELECT id, name, category_id, dosage_form, strength, quantity, unit, expiration_date, description, created_at FROM medicines'
    ).all();
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', (req, res) => {
  try {
    const row = db.prepare(
      'SELECT id, name, category_id, dosage_form, strength, quantity, unit, expiration_date, description, created_at FROM medicines WHERE id = ?'
    ).get(req.params.id);
    if (!row) return res.status(404).json({ error: 'Not found' });
    res.json(row);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', (req, res) => {
  try {
    const { name, category_id, dosage_form, strength, quantity, unit, expiration_date, description } = req.body;
    if (!name) return res.status(400).json({ error: 'name is required.' });
    if (!dosage_form) return res.status(400).json({ error: 'dosage_form is required.' });
    const result = db.prepare(
      'INSERT INTO medicines (name, category_id, dosage_form, strength, quantity, unit, expiration_date, description) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    ).run(
      name,
      category_id ? parseInt(category_id) : null,
      dosage_form,
      strength || null,
      parseInt(quantity) || 0,
      unit || null,
      expiration_date || null,
      description || null
    );
    const created = db.prepare(
      'SELECT id, name, category_id, dosage_form, strength, quantity, unit, expiration_date, description, created_at FROM medicines WHERE id = ?'
    ).get(result.lastInsertRowid);
    res.status(201).json(created);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', (req, res) => {
  try {
    const { name, category_id, dosage_form, strength, unit, expiration_date, description } = req.body;
    if (!name) return res.status(400).json({ error: 'name is required.' });
    if (!dosage_form) return res.status(400).json({ error: 'dosage_form is required.' });
    const result = db.prepare(
      'UPDATE medicines SET name = ?, category_id = ?, dosage_form = ?, strength = ?, unit = ?, expiration_date = ?, description = ? WHERE id = ?'
    ).run(
      name,
      category_id ? parseInt(category_id) : null,
      dosage_form,
      strength || null,
      unit || null,
      expiration_date || null,
      description || null,
      req.params.id
    );
    if (result.changes === 0) return res.status(404).json({ error: 'Not found' });
    const updated = db.prepare(
      'SELECT id, name, category_id, dosage_form, strength, quantity, unit, expiration_date, description, created_at FROM medicines WHERE id = ?'
    ).get(req.params.id);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', (req, res) => {
  try {
    const inUse = db.prepare('SELECT 1 FROM transactions WHERE medicine_id = ? LIMIT 1').get(req.params.id);
    if (inUse) return res.status(409).json({ error: 'Cannot delete medicine, already used in transactions.' });
    const result = db.prepare('DELETE FROM medicines WHERE id = ?').run(req.params.id);
    if (result.changes === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ deleted: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
