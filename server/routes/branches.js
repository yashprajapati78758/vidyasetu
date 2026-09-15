const express = require('express');
const router = express.Router();
const { db } = require('../database');

// GET all branches
router.get('/', (req, res) => {
  try {
    const branches = db.prepare('SELECT * FROM branches ORDER BY name ASC').all();
    res.json({ success: true, count: branches.length, data: branches });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET branch by ID with semesters
router.get('/:id', (req, res) => {
  try {
    const branch = db.prepare('SELECT * FROM branches WHERE id = ?').get(req.params.id);
    if (!branch) {
      return res.status(404).json({ success: false, error: 'Branch not found' });
    }
    const semesters = db.prepare('SELECT * FROM semesters WHERE branch_id = ? ORDER BY sem_number ASC').all(req.params.id);
    res.json({ success: true, data: { ...branch, semesters } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST new branch (Admin)
router.post('/', (req, res) => {
  try {
    const { id, name, code, icon, color, description } = req.body;
    if (!id || !name || !code) {
      return res.status(400).json({ success: false, error: 'id, name and code are required' });
    }
    
    const insert = db.prepare(`
      INSERT INTO branches (id, name, code, icon, color, description)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    insert.run(id.toLowerCase(), name, code, icon || '📚', color || '#3b82f6', description || '');

    // Add 6 semesters by default
    const insertSem = db.prepare('INSERT INTO semesters (branch_id, sem_number, name) VALUES (?, ?, ?)');
    for (let sem = 1; sem <= 6; sem++) {
      insertSem.run(id.toLowerCase(), sem, `Semester ${sem}`);
    }

    res.status(201).json({ success: true, message: 'Branch added successfully' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
