const express = require('express');
const router = express.Router();
const { db } = require('../database');

// GET all study materials with filters
router.get('/', (req, res) => {
  try {
    const { branch, sem, subject_id, search } = req.query;
    let query = `
      SELECT m.*, s.subject_name, s.subject_code, b.name as branch_name 
      FROM materials m
      JOIN subjects s ON m.subject_id = s.id
      JOIN branches b ON m.branch_id = b.id
      WHERE 1=1
    `;
    const params = [];

    if (branch && branch !== 'all') {
      query += ' AND m.branch_id = ?';
      params.push(branch);
    }
    if (sem && sem !== 'all') {
      query += ' AND m.sem_number = ?';
      params.push(parseInt(sem, 10));
    }
    if (subject_id && subject_id !== 'all') {
      query += ' AND m.subject_id = ?';
      params.push(subject_id);
    }
    if (search) {
      query += ' AND (m.title LIKE ? OR m.chapter_name LIKE ? OR m.description LIKE ?)';
      const s = `%${search}%`;
      params.push(s, s, s);
    }

    query += ' ORDER BY m.created_at DESC, m.chapter_no ASC';
    const materials = db.prepare(query).all(...params);

    res.json({ success: true, count: materials.length, data: materials });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET single material
router.get('/:id', (req, res) => {
  try {
    const material = db.prepare(`
      SELECT m.*, s.subject_name, s.subject_code, b.name as branch_name 
      FROM materials m
      JOIN subjects s ON m.subject_id = s.id
      JOIN branches b ON m.branch_id = b.id
      WHERE m.id = ?
    `).get(req.params.id);

    if (!material) {
      return res.status(404).json({ success: false, error: 'Material not found' });
    }
    res.json({ success: true, data: material });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Increment download count
router.post('/:id/download', (req, res) => {
  try {
    db.prepare('UPDATE materials SET download_count = download_count + 1 WHERE id = ?').run(req.params.id);
    res.json({ success: true, message: 'Download counter updated' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST create material (Admin)
router.post('/', (req, res) => {
  try {
    const { subject_id, branch_id, sem_number, title, chapter_no, chapter_name, file_type, file_url, file_size, description, author } = req.body;
    if (!subject_id || !title) {
      return res.status(400).json({ success: false, error: 'subject_id and title are required' });
    }

    // Lookup branch & sem from subject if not provided
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
      INSERT INTO materials (subject_id, branch_id, sem_number, title, chapter_no, chapter_name, file_type, file_url, file_size, description, author)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = insert.run(
      subject_id,
      bId,
      parseInt(sNum || 1, 10),
      title,
      parseInt(chapter_no || 1, 10),
      chapter_name || `Chapter ${chapter_no || 1}`,
      file_type || 'PDF',
      file_url || 'https://vidyasetu.gtu.ac.in/docs/sample-notes.pdf',
      file_size || '3.2 MB',
      description || '',
      author || 'GTU Subject Faculty'
    );

    res.status(201).json({ success: true, message: 'Material added successfully', id: result.lastInsertRowid });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT update material (Admin)
router.put('/:id', (req, res) => {
  try {
    const { title, chapter_no, chapter_name, file_type, file_url, file_size, description, author, subject_id } = req.body;
    const update = db.prepare(`
      UPDATE materials 
      SET title = COALESCE(?, title),
          chapter_no = COALESCE(?, chapter_no),
          chapter_name = COALESCE(?, chapter_name),
          file_type = COALESCE(?, file_type),
          file_url = COALESCE(?, file_url),
          file_size = COALESCE(?, file_size),
          description = COALESCE(?, description),
          author = COALESCE(?, author),
          subject_id = COALESCE(?, subject_id)
      WHERE id = ?
    `);

    const result = update.run(title, chapter_no ? parseInt(chapter_no, 10) : null, chapter_name, file_type, file_url, file_size, description, author, subject_id, req.params.id);
    if (result.changes === 0) {
      return res.status(404).json({ success: false, error: 'Material not found' });
    }

    res.json({ success: true, message: 'Material updated successfully' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE material (Admin)
router.delete('/:id', (req, res) => {
  try {
    const del = db.prepare('DELETE FROM materials WHERE id = ?');
    const result = del.run(req.params.id);
    if (result.changes === 0) {
      return res.status(404).json({ success: false, error: 'Material not found' });
    }
    res.json({ success: true, message: 'Material deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
