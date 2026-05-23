const express = require('express');
const router = express.Router();
const multer = require('multer');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

// Use memory storage for multer to process image before saving
const storage = multer.memoryStorage();
const upload = multer({ 
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only images are allowed.'));
    }
  }
});

router.post('/', upload.single('image'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No image uploaded' });
  }

  try {
    const uniqueFilename = `${Date.now()}-${Math.round(Math.random() * 1e9)}.webp`;
    
    // Ensure the upload directory exists
    const uploadDir = path.join(__dirname, '../../public/uploads/foods');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const outputPath = path.join(uploadDir, uniqueFilename);

    // Compress and convert to .webp
    await sharp(req.file.buffer)
      .webp({ quality: 80 })
      .resize({ width: 800, withoutEnlargement: true }) // Optional: resize to a max width for extra savings
      .toFile(outputPath);

    // Return the URL that will be accessible on the frontend
    const url = `/uploads/foods/${uniqueFilename}`;
    
    res.status(200).json({
      success: true,
      data: {
        url: url
      }
    });

  } catch (error) {
    console.error('[Image Upload Error]', error);
    res.status(500).json({ error: 'Failed to process and upload image.' });
  }
});

module.exports = router;
