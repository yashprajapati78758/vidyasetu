const express = require('express');
const router = express.Router();
const { db } = require('../database');

// GET student progress summary
router.get('/:userId', (req, res) => {
  try {
    const { userId } = req.params;
    const { sem } = req.query;

    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    const currentSem = sem ? parseInt(sem, 10) : user.semester;

    // Get subjects for this user's branch & sem
    const subjects = db.prepare(`
      SELECT s.*, b.name as branch_name 
      FROM subjects s 
      JOIN branches b ON s.branch_id = b.id
      WHERE s.branch_id = ? AND s.sem_number = ?
    `).all(user.branch_id, currentSem);

    // Get all completed progress items for this user
    const progressRecords = db.prepare(`
      SELECT * FROM student_progress WHERE user_id = ?
    `).all(userId);

    const progressMap = {};
    progressRecords.forEach(r => {
      if (!progressMap[r.subject_id]) progressMap[r.subject_id] = [];
      progressMap[r.subject_id].push(r);
    });

    // Compute progress stats per subject
    const subjectProgress = subjects.map(sub => {
      const records = progressMap[sub.id] || [];
      const completedCount = records.filter(r => r.status === 'completed').length;
      // Default assume 6 core topics per subject if not customized
      const totalTopics = 6;
      const percentage = Math.min(100, Math.round((completedCount / totalTopics) * 100));

      return {
        ...sub,
        completed_topics: completedCount,
        total_topics: totalTopics,
        percentage,
        records
      };
    });

    const totalPossible = subjects.length * 6;
    const totalCompleted = subjectProgress.reduce((acc, s) => acc + s.completed_topics, 0);
    const overallPercentage = totalPossible > 0 ? Math.round((totalCompleted / totalPossible) * 100) : 0;

    res.json({
      success: true,
      data: {
        user,
        current_semester: currentSem,
        overall_percentage: overallPercentage,
        total_completed: totalCompleted,
        total_topics: totalPossible,
        subject_progress: subjectProgress
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST toggle/update topic progress
router.post('/toggle', (req, res) => {
  try {
    const { user_id, subject_id, topic_id, topic_title, status, notes } = req.body;
    if (!user_id || !subject_id || !topic_id) {
      return res.status(400).json({ success: false, error: 'user_id, subject_id and topic_id are required' });
    }

    const existing = db.prepare('SELECT * FROM student_progress WHERE user_id = ? AND subject_id = ? AND topic_id = ?').get(user_id, subject_id, topic_id);

    if (existing) {
      const newStatus = status || (existing.status === 'completed' ? 'in_progress' : 'completed');
      db.prepare(`
        UPDATE student_progress 
        SET status = ?, notes = COALESCE(?, notes), updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(newStatus, notes, existing.id);
      return res.json({ success: true, message: 'Progress updated', status: newStatus });
    } else {
      db.prepare(`
        INSERT INTO student_progress (user_id, subject_id, topic_id, topic_title, status, notes)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(user_id, subject_id, topic_id, topic_title || 'Topic Item', status || 'completed', notes || '');
      return res.json({ success: true, message: 'Progress recorded', status: status || 'completed' });
    }
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Bookmarks endpoints
router.get('/bookmarks/:userId', (req, res) => {
  try {
    const bookmarks = db.prepare('SELECT * FROM bookmarks WHERE user_id = ? ORDER BY created_at DESC').all(req.params.userId);
    res.json({ success: true, count: bookmarks.length, data: bookmarks });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/bookmarks/toggle', (req, res) => {
  try {
    const { user_id, item_type, item_id } = req.body;
    if (!user_id || !item_type || !item_id) {
      return res.status(400).json({ success: false, error: 'user_id, item_type and item_id are required' });
    }

    const existing = db.prepare('SELECT * FROM bookmarks WHERE user_id = ? AND item_type = ? AND item_id = ?').get(user_id, item_type, item_id);

    if (existing) {
      db.prepare('DELETE FROM bookmarks WHERE id = ?').run(existing.id);
      return res.json({ success: true, is_bookmarked: false, message: 'Bookmark removed' });
    } else {
      db.prepare('INSERT INTO bookmarks (user_id, item_type, item_id) VALUES (?, ?, ?)').run(user_id, item_type, item_id);
      return res.json({ success: true, is_bookmarked: true, message: 'Bookmarked successfully' });
    }
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
