const express = require('express');
const router = express.Router();
const { db } = require('../database');

// GET all books with filters
router.get('/', (req, res) => {
  try {
    const { branch, sem, subject_id, search } = req.query;
    let query = `
      SELECT b.*, s.subject_name, s.subject_code, br.name as branch_name 
      FROM books b
      JOIN subjects s ON b.subject_id = s.id
      JOIN branches br ON b.branch_id = br.id
      WHERE 1=1
    `;
    const params = [];

    if (branch && branch !== 'all') {
      query += ' AND b.branch_id = ?';
      params.push(branch);
    }
    if (sem && sem !== 'all') {
      query += ' AND b.sem_number = ?';
      params.push(parseInt(sem, 10));
    }
    if (subject_id && subject_id !== 'all') {
      query += ' AND b.subject_id = ?';
      params.push(subject_id);
    }
    if (search) {
      query += ' AND (b.title LIKE ? OR b.author LIKE ? OR b.publisher LIKE ?)';
      const s = `%${search}%`;
      params.push(s, s, s);
    }

    query += ' ORDER BY b.download_count DESC, b.title ASC';
    const books = db.prepare(query).all(...params);

    res.json({ success: true, count: books.length, data: books });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET single book
router.get('/:id', (req, res) => {
  try {
    const book = db.prepare(`
      SELECT b.*, s.subject_name, s.subject_code, br.name as branch_name 
      FROM books b
      JOIN subjects s ON b.subject_id = s.id
      JOIN branches br ON b.branch_id = br.id
      WHERE b.id = ?
    `).get(req.params.id);

    if (!book) {
      return res.status(404).json({ success: false, error: 'Book not found' });
    }
    res.json({ success: true, data: book });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST create book (Admin)
router.post('/', (req, res) => {
  try {
    const { subject_id, branch_id, sem_number, title, author, publisher, edition, cover_image, file_url, pages, file_size, rating } = req.body;
    if (!subject_id || !title || !author) {
      return res.status(400).json({ success: false, error: 'subject_id, title and author are required' });
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
      INSERT INTO books (subject_id, branch_id, sem_number, title, author, publisher, edition, cover_image, file_url, pages, file_size, rating)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = insert.run(
      subject_id,
      bId,
      parseInt(sNum || 1, 10),
      title,
      author,
      publisher || 'GTU Recommended Publications',
      edition || 'Latest Edition 2024',
      cover_image || 'https://images.unsplash.com/photo-1532012164546-f432f2e3edd4?w=400&q=80',
      file_url || 'https://vidyasetu.gtu.ac.in/books/sample-textbook.pdf',
      parseInt(pages || 350, 10),
      file_size || '16.5 MB',
      parseFloat(rating || 4.8)
    );

    res.status(201).json({ success: true, message: 'Book added successfully', id: result.lastInsertRowid });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT update book (Admin)
router.put('/:id', (req, res) => {
  try {
    const { title, author, publisher, edition, cover_image, file_url, pages, file_size, rating, subject_id } = req.body;
    const update = db.prepare(`
      UPDATE books 
      SET title = COALESCE(?, title),
          author = COALESCE(?, author),
          publisher = COALESCE(?, publisher),
          edition = COALESCE(?, edition),
          cover_image = COALESCE(?, cover_image),
          file_url = COALESCE(?, file_url),
          pages = COALESCE(?, pages),
          file_size = COALESCE(?, file_size),
          rating = COALESCE(?, rating),
          subject_id = COALESCE(?, subject_id)
      WHERE id = ?
    `);

    const result = update.run(
      title,
      author,
      publisher,
      edition,
      cover_image,
      file_url,
      pages ? parseInt(pages, 10) : null,
      file_size,
      rating ? parseFloat(rating) : null,
      subject_id,
      req.params.id
    );

    if (result.changes === 0) {
      return res.status(404).json({ success: false, error: 'Book not found' });
    }

    res.json({ success: true, message: 'Book updated successfully' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE book (Admin)
router.delete('/:id', (req, res) => {
  try {
    const del = db.prepare('DELETE FROM books WHERE id = ?');
    const result = del.run(req.params.id);
    if (result.changes === 0) {
      return res.status(404).json({ success: false, error: 'Book not found' });
    }
    res.json({ success: true, message: 'Book deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
