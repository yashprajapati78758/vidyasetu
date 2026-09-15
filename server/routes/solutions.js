const express = require('express');
const router = express.Router();
const { db } = require('../database');

// GET all solutions with filters
router.get('/', (req, res) => {
  try {
    const { subject_id, branch, sem, year, search } = req.query;
    let query = `
      SELECT sol.*, s.subject_name, s.subject_code, s.branch_id, s.sem_number, b.name as branch_name,
             qb.title as paper_title
      FROM solutions sol
      JOIN subjects s ON sol.subject_id = s.id
      JOIN branches b ON s.branch_id = b.id
      LEFT JOIN question_banks qb ON sol.question_bank_id = qb.id
      WHERE 1=1
    `;
    const params = [];

    if (subject_id && subject_id !== 'all') {
      query += ' AND sol.subject_id = ?';
      params.push(subject_id);
    }
    if (branch && branch !== 'all') {
      query += ' AND s.branch_id = ?';
      params.push(branch);
    }
    if (sem && sem !== 'all') {
      query += ' AND s.sem_number = ?';
      params.push(parseInt(sem, 10));
    }
    if (year && year !== 'all') {
      query += ' AND sol.exam_year = ?';
      params.push(year);
    }
    if (search) {
      query += ' AND (sol.title LIKE ? OR sol.solution_content LIKE ? OR s.subject_name LIKE ?)';
      const s = `%${search}%`;
      params.push(s, s, s);
    }

    query += ' ORDER BY sol.exam_year DESC, sol.created_at DESC';
    const solutions = db.prepare(query).all(...params);

    res.json({ success: true, count: solutions.length, data: solutions });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET single solution
router.get('/:id', (req, res) => {
  try {
    const solution = db.prepare(`
      SELECT sol.*, s.subject_name, s.subject_code, s.branch_id, s.sem_number, b.name as branch_name,
             qb.title as paper_title
      FROM solutions sol
      JOIN subjects s ON sol.subject_id = s.id
      JOIN branches b ON s.branch_id = b.id
      LEFT JOIN question_banks qb ON sol.question_bank_id = qb.id
      WHERE sol.id = ?
    `).get(req.params.id);

    if (!solution) {
      return res.status(404).json({ success: false, error: 'Solution not found' });
    }

    res.json({ success: true, data: solution });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST create solution (Admin)
router.post('/', (req, res) => {
  try {
    const { question_bank_id, subject_id, title, exam_year, paper_season, solution_content, key_formulas, diagram_guide, verified_by, file_url } = req.body;
    if (!subject_id || !title || !solution_content) {
      return res.status(400).json({ success: false, error: 'subject_id, title and solution_content are required' });
    }

    const insert = db.prepare(`
      INSERT INTO solutions (question_bank_id, subject_id, title, exam_year, paper_season, solution_content, key_formulas, diagram_guide, verified_by, file_url)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = insert.run(
      question_bank_id ? parseInt(question_bank_id, 10) : null,
      subject_id,
      title,
      exam_year || '2024',
      paper_season || 'Winter',
      solution_content,
      key_formulas || '',
      diagram_guide || '',
      verified_by || 'GTU Subject Gold Medalist & Expert Faculty',
      file_url || 'https://vidyasetu.gtu.ac.in/solutions/sample-solution.pdf'
    );

    res.status(201).json({ success: true, message: 'Solution added successfully', id: result.lastInsertRowid });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT update solution (Admin)
router.put('/:id', (req, res) => {
  try {
    const { title, exam_year, paper_season, solution_content, key_formulas, diagram_guide, verified_by, file_url, subject_id, question_bank_id } = req.body;
    const update = db.prepare(`
      UPDATE solutions 
      SET title = COALESCE(?, title),
          exam_year = COALESCE(?, exam_year),
          paper_season = COALESCE(?, paper_season),
          solution_content = COALESCE(?, solution_content),
          key_formulas = COALESCE(?, key_formulas),
          diagram_guide = COALESCE(?, diagram_guide),
          verified_by = COALESCE(?, verified_by),
          file_url = COALESCE(?, file_url),
          subject_id = COALESCE(?, subject_id),
          question_bank_id = COALESCE(?, question_bank_id)
      WHERE id = ?
    `);

    const result = update.run(
      title,
      exam_year,
      paper_season,
      solution_content,
      key_formulas,
      diagram_guide,
      verified_by,
      file_url,
      subject_id,
      question_bank_id ? parseInt(question_bank_id, 10) : null,
      req.params.id
    );

    if (result.changes === 0) {
      return res.status(404).json({ success: false, error: 'Solution not found' });
    }

    res.json({ success: true, message: 'Solution updated successfully' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE solution (Admin)
router.delete('/:id', (req, res) => {
  try {
    const del = db.prepare('DELETE FROM solutions WHERE id = ?');
    const result = del.run(req.params.id);
    if (result.changes === 0) {
      return res.status(404).json({ success: false, error: 'Solution not found' });
    }
    res.json({ success: true, message: 'Solution deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
