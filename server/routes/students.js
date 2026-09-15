const express = require('express');
const router = express.Router();
const { db } = require('../database');

// POST /api/students/register - Create new Student Account
router.post('/register', (req, res) => {
  try {
    const { name, enrollment_no, email, password, branch_id, semester } = req.body;

    if (!name || !enrollment_no || !password || !branch_id) {
      return res.status(400).json({ 
        success: false, 
        error: 'Name, GTU Enrollment Number, Password, and Engineering Branch are required' 
      });
    }

    const cleanEnroll = enrollment_no.trim();
    const cleanEmail = (email || `${cleanEnroll}@student.gtu.ac.in`).trim().toLowerCase();
    const cleanName = name.trim();
    const sem = parseInt(semester, 10) || 1;

    // Check if enrollment number or email already registered
    const existing = db.prepare('SELECT * FROM users WHERE enrollment_no = ? OR email = ?').get(cleanEnroll, cleanEmail);
    if (existing) {
      return res.status(400).json({
        success: false,
        error: existing.enrollment_no === cleanEnroll 
          ? `Enrollment number ${cleanEnroll} is already registered. Please sign in instead.`
          : `Email ${cleanEmail} is already in use. Please sign in.`
      });
    }

    const userId = `stud_${Date.now()}`;
    const avatar = `https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&q=80`;

    const insert = db.prepare(`
      INSERT INTO users (id, name, enrollment_no, email, password, branch_id, semester, role, avatar)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'student', ?)
    `);

    insert.run(userId, cleanName, cleanEnroll, cleanEmail, password, branch_id, sem, avatar);

    // Fetch branch info
    const branch = db.prepare('SELECT name, code FROM branches WHERE id = ?').get(branch_id);

    const user = {
      id: userId,
      name: cleanName,
      enrollment_no: cleanEnroll,
      email: cleanEmail,
      branch_id: branch_id,
      branch_name: branch ? branch.name : 'Engineering',
      branch_code: branch ? branch.code : '07',
      semester: sem,
      role: 'student',
      avatar
    };

    const token = `student_auth_${userId}_${Date.now()}`;

    res.status(201).json({
      success: true,
      message: `Welcome to VidyaSetu, ${cleanName}!`,
      token,
      user
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/students/login - Authenticate Student
router.post('/login', (req, res) => {
  try {
    const { identifier, password } = req.body;

    if (!identifier || !password) {
      return res.status(400).json({ success: false, error: 'Enrollment Number / Email and Password are required' });
    }

    const cleanIdent = identifier.trim();

    const user = db.prepare(`
      SELECT u.*, b.name as branch_name, b.code as branch_code 
      FROM users u 
      LEFT JOIN branches b ON u.branch_id = b.id 
      WHERE (u.enrollment_no = ? OR u.email = ?) AND u.password = ?
    `).get(cleanIdent, cleanIdent.toLowerCase(), password);

    if (!user) {
      return res.status(401).json({ 
        success: false, 
        error: 'Invalid GTU Enrollment Number or Password. Please check your credentials.' 
      });
    }

    const token = `student_auth_${user.id}_${Date.now()}`;
    const { password: _, ...safeUser } = user;

    res.json({
      success: true,
      message: `Welcome back, ${safeUser.name}!`,
      token,
      user: safeUser
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/students/me - Get Current Student Profile & Stats
router.get('/me', (req, res) => {
  try {
    const userId = req.query.userId || req.headers['x-user-id'];
    if (!userId) {
      return res.status(400).json({ success: false, error: 'User ID is required' });
    }

    const user = db.prepare(`
      SELECT u.id, u.name, u.enrollment_no, u.email, u.branch_id, u.semester, u.role, u.avatar,
             b.name as branch_name, b.code as branch_code
      FROM users u
      LEFT JOIN branches b ON u.branch_id = b.id
      WHERE u.id = ?
    `).get(userId);

    if (!user) {
      return res.status(404).json({ success: false, error: 'Student profile not found' });
    }

    // Get progress counts
    const progressCount = db.prepare('SELECT COUNT(*) as count FROM student_progress WHERE user_id = ? AND status = ?').get(userId, 'completed');

    res.json({
      success: true,
      user: {
        ...user,
        completed_topics: progressCount ? progressCount.count : 0
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /api/students/profile - Update Student Profile
router.put('/profile', (req, res) => {
  try {
    const { user_id, name, branch_id, semester } = req.body;
    if (!user_id) {
      return res.status(400).json({ success: false, error: 'user_id is required' });
    }

    const update = db.prepare(`
      UPDATE users 
      SET name = COALESCE(?, name),
          branch_id = COALESCE(?, branch_id),
          semester = COALESCE(?, semester)
      WHERE id = ?
    `);

    update.run(name ? name.trim() : null, branch_id || null, semester ? parseInt(semester, 10) : null, user_id);

    const user = db.prepare(`
      SELECT u.id, u.name, u.enrollment_no, u.email, u.branch_id, u.semester, u.role, u.avatar,
             b.name as branch_name, b.code as branch_code
      FROM users u
      LEFT JOIN branches b ON u.branch_id = b.id
      WHERE u.id = ?
    `).get(user_id);

    res.json({
      success: true,
      message: 'Profile updated successfully!',
      user
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
