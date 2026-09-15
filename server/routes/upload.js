const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure uploads directory exists in public folder
const uploadDir = path.join(__dirname, '..', '..', 'public', 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer storage configuration with sanitized timestamp naming
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E6);
    const ext = path.extname(file.originalname).toLowerCase();
    const cleanBase = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9_-]/g, '_');
    cb(null, `${cleanBase}_${uniqueSuffix}${ext}`);
  }
});

// Allowed file types: PDF, Word (doc/docx), text, presentations & images
const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  const allowed = ['.pdf', '.doc', '.docx', '.txt', '.ppt', '.pptx', '.jpg', '.jpeg', '.png', '.webp'];
  if (allowed.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error(`File type ${ext} is not supported. Allowed: PDF, Word (.docx/.doc), TXT, PPT, Images.`));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 50 * 1024 * 1024 } // 50 MB max
});

function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function getFileTypeBadge(ext) {
  const e = ext.toLowerCase().replace('.', '');
  if (e === 'pdf') return 'PDF';
  if (e === 'doc' || e === 'docx') return 'WORD';
  if (e === 'ppt' || e === 'pptx') return 'PPT';
  if (['jpg', 'jpeg', 'png', 'webp'].includes(e)) return 'IMAGE';
  return 'DOCUMENT';
}

// POST /api/upload - Single document file upload
router.post('/', upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No file was uploaded.' });
    }

    const relativeUrl = `/uploads/${req.file.filename}`;
    const ext = path.extname(req.file.originalname);
    const fileSizeStr = formatBytes(req.file.size);
    const fileTypeStr = getFileTypeBadge(ext);

    res.json({
      success: true,
      data: {
        file_url: relativeUrl,
        filename: req.file.filename,
        original_name: req.file.originalname,
        file_size: fileSizeStr,
        file_type: fileTypeStr,
        size_bytes: req.file.size
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
