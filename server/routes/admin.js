const express = require('express');
const router = express.Router();
const { db } = require('../database');

// Admin Login Authentication
router.post('/login', (req, res) => {
  try {
    const { username, password } = req.body;
    if (username === 'admin' && (password === 'admin123' || password === 'admin')) {
      return res.json({
        success: true,
        message: 'Login successful',
        token: 'vidyasetu_admin_jwt_session_' + Date.now(),
        admin: {
          id: 'usr_admin',
          name: 'GTU Administrator',
          role: 'admin',
          email: 'admin@vidyasetu.gtu.ac.in',
          avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&q=80'
        }
      });
    } else {
      return res.status(401).json({ success: false, error: 'Invalid admin username or password. Use demo: admin / admin123' });
    }
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET Admin Dashboard Statistics & Analytics
router.get('/stats', (req, res) => {
  try {
    const totalMaterials = db.prepare('SELECT COUNT(*) as count FROM materials').get().count;
    const totalBooks = db.prepare('SELECT COUNT(*) as count FROM books').get().count;
    const totalQuestions = db.prepare('SELECT COUNT(*) as count FROM question_banks').get().count;
    const totalSolutions = db.prepare('SELECT COUNT(*) as count FROM solutions').get().count;
    const totalSubjects = db.prepare('SELECT COUNT(*) as count FROM subjects').get().count;
    const totalBranches = db.prepare('SELECT COUNT(*) as count FROM branches').get().count;
    const totalStudents = db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'student'").get().count;
    const totalAiQueries = db.prepare('SELECT COUNT(*) as count FROM ai_chats').get().count;

    // Total downloads across materials & books
    const matDownloads = db.prepare('SELECT SUM(download_count) as total FROM materials').get().total || 0;
    const bookDownloads = db.prepare('SELECT SUM(download_count) as total FROM books').get().total || 0;

    // Branch-wise subject & material distribution
    const branchStats = db.prepare(`
      SELECT b.id, b.name, b.code, b.color,
             (SELECT COUNT(*) FROM subjects WHERE branch_id = b.id) as subjects_count,
             (SELECT COUNT(*) FROM materials WHERE branch_id = b.id) as materials_count,
             (SELECT COUNT(*) FROM books WHERE branch_id = b.id) as books_count,
             (SELECT COUNT(*) FROM question_banks WHERE branch_id = b.id) as questions_count
      FROM branches b
    `).all();

    // Recent AI student queries
    const recentQueries = db.prepare('SELECT * FROM ai_chats ORDER BY created_at DESC LIMIT 6').all();

    // Recent uploads
    const recentMaterials = db.prepare(`
      SELECT m.id, m.title, m.created_at, s.subject_name, b.name as branch_name, 'Material' as type
      FROM materials m
      JOIN subjects s ON m.subject_id = s.id
      JOIN branches b ON m.branch_id = b.id
      ORDER BY m.created_at DESC LIMIT 5
    `).all();

    res.json({
      success: true,
      data: {
        counts: {
          materials: totalMaterials,
          books: totalBooks,
          questions: totalQuestions,
          solutions: totalSolutions,
          subjects: totalSubjects,
          branches: totalBranches,
          students: totalStudents,
          ai_queries: totalAiQueries,
          total_downloads: matDownloads + bookDownloads
        },
        branch_stats: branchStats,
        recent_queries: recentQueries,
        recent_materials: recentMaterials
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET registered students list with progress
router.get('/students', (req, res) => {
  try {
    const students = db.prepare(`
      SELECT u.*, b.name as branch_name,
             (SELECT COUNT(*) FROM student_progress WHERE user_id = u.id AND status = 'completed') as completed_topics,
             (SELECT COUNT(*) FROM bookmarks WHERE user_id = u.id) as bookmarks_count
      FROM users u
      LEFT JOIN branches b ON u.branch_id = b.id
      WHERE u.role = 'student'
      ORDER BY u.created_at DESC
    `).all();

    res.json({ success: true, count: students.length, data: students });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET AI Query Logs
router.get('/ai-logs', (req, res) => {
  try {
    const logs = db.prepare('SELECT * FROM ai_chats ORDER BY created_at DESC LIMIT 50').all();
    res.json({ success: true, count: logs.length, data: logs });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET Announcements
router.get('/announcements', (req, res) => {
  try {
    const announcements = db.prepare('SELECT * FROM announcements ORDER BY is_pinned DESC, created_at DESC').all();
    res.json({ success: true, count: announcements.length, data: announcements });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST create Announcement (Admin)
router.post('/announcements', (req, res) => {
  try {
    const { title, category, badge, content, link, is_pinned } = req.body;
    if (!title || !content) {
      return res.status(400).json({ success: false, error: 'Title and content are required' });
    }

    const insert = db.prepare(`
      INSERT INTO announcements (title, category, badge, content, link, is_pinned)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    const result = insert.run(title, category || 'Circular', badge || 'NEW', content, link || '', is_pinned ? 1 : 0);
    res.status(201).json({ success: true, message: 'Announcement published successfully', id: result.lastInsertRowid });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE announcement
router.delete('/announcements/:id', (req, res) => {
  try {
    db.prepare('DELETE FROM announcements WHERE id = ?').run(req.params.id);
    res.json({ success: true, message: 'Announcement deleted' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
