const express = require('express');
const router = express.Router();
const { db } = require('../database');

// GET all question banks with filters
router.get('/', (req, res) => {
  try {
    const { branch, sem, subject_id, year, season, search } = req.query;
    let query = `
      SELECT q.*, s.subject_name, s.subject_code, b.name as branch_name,
        (SELECT COUNT(*) FROM solutions WHERE question_bank_id = q.id) as solution_available
      FROM question_banks q
      JOIN subjects s ON q.subject_id = s.id
      JOIN branches b ON q.branch_id = b.id
      WHERE 1=1
    `;
    const params = [];

    if (branch && branch !== 'all') {
      query += ' AND q.branch_id = ?';
      params.push(branch);
    }
    if (sem && sem !== 'all') {
      query += ' AND q.sem_number = ?';
      params.push(parseInt(sem, 10));
    }
    if (subject_id && subject_id !== 'all') {
      query += ' AND q.subject_id = ?';
      params.push(subject_id);
    }
    if (year && year !== 'all') {
      query += ' AND q.exam_year = ?';
      params.push(year);
    }
    if (season && season !== 'all') {
      query += ' AND q.exam_season = ?';
      params.push(season);
    }
    if (search) {
      query += ' AND (q.title LIKE ? OR q.description LIKE ? OR s.subject_name LIKE ?)';
      const s = `%${search}%`;
      params.push(s, s, s);
    }

    query += ' ORDER BY q.exam_year DESC, q.created_at DESC';
    const questions = db.prepare(query).all(...params);

    res.json({ success: true, count: questions.length, data: questions });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET single question bank with attached solution if any
router.get('/:id', (req, res) => {
  try {
    const question = db.prepare(`
      SELECT q.*, s.subject_name, s.subject_code, b.name as branch_name 
      FROM question_banks q
      JOIN subjects s ON q.subject_id = s.id
      JOIN branches b ON q.branch_id = b.id
      WHERE q.id = ?
    `).get(req.params.id);

    if (!question) {
      return res.status(404).json({ success: false, error: 'Question bank not found' });
    }

    const solutions = db.prepare('SELECT * FROM solutions WHERE question_bank_id = ? OR subject_id = ?').all(question.id, question.subject_id);

    res.json({ success: true, data: { ...question, solutions } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST create question bank (Admin)
router.post('/', (req, res) => {
  try {
    const { subject_id, branch_id, sem_number, title, exam_year, exam_season, total_marks, paper_type, file_url, questions_count, description } = req.body;
    if (!subject_id || !title || !exam_year) {
      return res.status(400).json({ success: false, error: 'subject_id, title and exam_year are required' });
    }

    let bId = branch_id;
    let sNum = sem_number;
    if (!bId || !sNum) {
      const sub = db.prepare('SELECT branch_id, sem_number FROM subjects WHERE id = ?').get(subject_id);
      if (sub) {
        bId = sub.branch_id;
        sNum = sub.sem_number;
      }
    }

    const insert = db.prepare(`
      INSERT INTO question_banks (subject_id, branch_id, sem_number, title, exam_year, exam_season, total_marks, paper_type, file_url, questions_count, description)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = insert.run(
      subject_id,
      bId,
      parseInt(sNum || 1, 10),
      title,
      exam_year,
      exam_season || 'Winter',
      parseInt(total_marks || 70, 10),
      paper_type || 'GTU End-Sem Exam',
      file_url || 'https://vidyasetu.gtu.ac.in/papers/sample-paper.pdf',
      parseInt(questions_count || 14, 10),
      description || ''
    );

    res.status(201).json({ success: true, message: 'Question paper added successfully', id: result.lastInsertRowid });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT update question bank (Admin)
router.put('/:id', (req, res) => {
  try {
    const { title, exam_year, exam_season, total_marks, paper_type, file_url, questions_count, description, subject_id } = req.body;
    const update = db.prepare(`
      UPDATE question_banks 
      SET title = COALESCE(?, title),
          exam_year = COALESCE(?, exam_year),
          exam_season = COALESCE(?, exam_season),
          total_marks = COALESCE(?, total_marks),
          paper_type = COALESCE(?, paper_type),
          file_url = COALESCE(?, file_url),
          questions_count = COALESCE(?, questions_count),
          description = COALESCE(?, description),
          subject_id = COALESCE(?, subject_id)
      WHERE id = ?
    `);

    const result = update.run(
      title,
      exam_year,
      exam_season,
      total_marks ? parseInt(total_marks, 10) : null,
      paper_type,
      file_url,
      questions_count ? parseInt(questions_count, 10) : null,
      description,
      subject_id,
      req.params.id
    );

    if (result.changes === 0) {
      return res.status(404).json({ success: false, error: 'Question bank not found' });
    }

    res.json({ success: true, message: 'Question bank updated successfully' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE question bank (Admin)
router.delete('/:id', (req, res) => {
  try {
    const del = db.prepare('DELETE FROM question_banks WHERE id = ?');
    const result = del.run(req.params.id);
    if (result.changes === 0) {
      return res.status(404).json({ success: false, error: 'Question bank not found' });
    }
    res.json({ success: true, message: 'Question bank deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
