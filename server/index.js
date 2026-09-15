const express = require('express');
const cors = require('cors');
const path = require('path');
const { initDatabase } = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize SQLite Database schema and initial seeds
initDatabase();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve frontend static files
app.use(express.static(path.join(__dirname, '..', 'public')));

// Explicit Admin Portal route
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'admin.html'));
});

// Explicit Student Portal route
app.get('/student', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

// API Routes
app.use('/api/upload', require('./routes/upload'));
app.use('/api/branches', require('./routes/branches'));
app.use('/api/subjects', require('./routes/subjects'));
app.use('/api/materials', require('./routes/materials'));
app.use('/api/books', require('./routes/books'));
app.use('/api/question-banks', require('./routes/questions'));
app.use('/api/solutions', require('./routes/solutions'));
app.use('/api/progress', require('./routes/progress'));
app.use('/api/ai', require('./routes/ai'));
app.use('/api/students', require('./routes/students'));
app.use('/api/admin', require('./routes/admin'));

// Fallback to index.html for SPA client-side routing
app.use((req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

// Start Server if not running as serverless function
if (require.main === module || !process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`====================================================`);
    console.log(`🚀 VidyaSetu Platform Running on http://localhost:${PORT}`);
    console.log(`👨‍🎓 Student Portal: http://localhost:${PORT}/`);
    console.log(`⚙️ Admin Panel:    http://localhost:${PORT}/admin`);
    console.log(`====================================================`);
  });
}

module.exports = app;
