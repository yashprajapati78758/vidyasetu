const express = require('express');
const router = express.Router();
const { db } = require('../database');

// GET all subjects or filtered by branch, semester, and scheme (New 43-series vs Old 33-series)
router.get('/', (req, res) => {
  try {
    const { branch, sem, scheme, search } = req.query;
    let query = 'SELECT s.*, b.name as branch_name, b.code as branch_code FROM subjects s JOIN branches b ON s.branch_id = b.id WHERE 1=1';
    const params = [];

    if (branch && branch !== 'all') {
      query += ' AND s.branch_id = ?';
      params.push(branch);
    }
    if (sem && sem !== 'all') {
      query += ' AND s.sem_number = ?';
      params.push(parseInt(sem, 10));
    }
    if (scheme && scheme !== 'all') {
      query += " AND (s.scheme = ? OR (s.scheme IS NULL AND ? = 'new'))";
      params.push(scheme, scheme);
    }
    if (search) {
      query += ' AND (s.subject_name LIKE ? OR s.subject_code LIKE ? OR s.description LIKE ?)';
      const searchWild = `%${search}%`;
      params.push(searchWild, searchWild, searchWild);
    }

    query += ' ORDER BY s.sem_number ASC, s.scheme ASC, s.subject_code ASC';
    const subjects = db.prepare(query).all(...params);

    // Attach counts for materials, books, question papers & solutions for each subject
    const statsStmt = db.prepare(`
      SELECT 
        (SELECT COUNT(*) FROM materials WHERE subject_id = ?) as materials_count,
        (SELECT COUNT(*) FROM books WHERE subject_id = ?) as books_count,
        (SELECT COUNT(*) FROM question_banks WHERE subject_id = ?) as questions_count,
        (SELECT COUNT(*) FROM solutions WHERE subject_id = ?) as solutions_count
    `);

    const subjectsWithStats = subjects.map(sub => {
      const stats = statsStmt.get(sub.id, sub.id, sub.id, sub.id);
      return { 
        ...sub, 
        scheme: sub.scheme || (sub.subject_code.startsWith('33') ? 'old' : 'new'),
        ...stats 
      };
    });

    res.json({ success: true, count: subjectsWithStats.length, data: subjectsWithStats });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET single subject by ID with full details
router.get('/:id', (req, res) => {
  try {
    const subject = db.prepare(`
      SELECT s.*, b.name as branch_name, b.code as branch_code, b.icon as branch_icon
      FROM subjects s 
      JOIN branches b ON s.branch_id = b.id 
      WHERE s.id = ?
    `).get(req.params.id);

    if (!subject) {
      return res.status(404).json({ success: false, error: 'Subject not found' });
    }

    const materials = db.prepare('SELECT * FROM materials WHERE subject_id = ? ORDER BY chapter_no ASC').all(req.params.id);
    const books = db.prepare('SELECT * FROM books WHERE subject_id = ? ORDER BY title ASC').all(req.params.id);
    const questions = db.prepare('SELECT * FROM question_banks WHERE subject_id = ? ORDER BY exam_year DESC').all(req.params.id);
    const solutions = db.prepare('SELECT * FROM solutions WHERE subject_id = ? ORDER BY exam_year DESC').all(req.params.id);

    res.json({
      success: true,
      data: {
        ...subject,
        scheme: subject.scheme || (subject.subject_code.startsWith('33') ? 'old' : 'new'),
        materials,
        books,
        questions,
        solutions
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST new subject (Admin)
router.post('/', (req, res) => {
  try {
    const { branch_id, sem_number, scheme, subject_code, subject_name, credits, category, syllabus_url, description } = req.body;
    if (!branch_id || !sem_number || !subject_code || !subject_name) {
      return res.status(400).json({ success: false, error: 'branch_id, sem_number, subject_code and subject_name are required' });
    }

    const cleanCode = subject_code.trim();
    const detectedScheme = scheme || (cleanCode.startsWith('33') ? 'old' : 'new');
    const id = `sub_${branch_id}_${sem_number}_${cleanCode}`;

    const insert = db.prepare(`
      INSERT INTO subjects (id, branch_id, sem_number, scheme, subject_code, subject_name, credits, category, syllabus_url, description)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insert.run(
      id,
      branch_id,
      parseInt(sem_number, 10),
      detectedScheme,
      cleanCode,
      subject_name.trim(),
      parseInt(credits || 4, 10),
      category || 'Core Engineering',
      syllabus_url || '',
      description || ''
    );

    res.status(201).json({ success: true, message: 'Subject created successfully', id });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT update subject (Admin)
router.put('/:id', (req, res) => {
  try {
    const { branch_id, sem_number, scheme, subject_code, subject_name, credits, category, syllabus_url, description } = req.body;
    const update = db.prepare(`
      UPDATE subjects 
      SET branch_id = COALESCE(?, branch_id),
          sem_number = COALESCE(?, sem_number),
          scheme = COALESCE(?, scheme),
          subject_code = COALESCE(?, subject_code),
          subject_name = COALESCE(?, subject_name),
          credits = COALESCE(?, credits),
          category = COALESCE(?, category),
          syllabus_url = COALESCE(?, syllabus_url),
          description = COALESCE(?, description)
      WHERE id = ?
    `);

    const result = update.run(
      branch_id,
      sem_number ? parseInt(sem_number, 10) : null,
      scheme,
      subject_code,
      subject_name,
      credits ? parseInt(credits, 10) : null,
      category,
      syllabus_url,
      description,
      req.params.id
    );

    if (result.changes === 0) {
      return res.status(404).json({ success: false, error: 'Subject not found' });
    }

    res.json({ success: true, message: 'Subject updated successfully' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE subject (Admin)
router.delete('/:id', (req, res) => {
  try {
    const del = db.prepare('DELETE FROM subjects WHERE id = ?');
    const result = del.run(req.params.id);
    if (result.changes === 0) {
      return res.status(404).json({ success: false, error: 'Subject not found' });
    }
    res.json({ success: true, message: 'Subject deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
