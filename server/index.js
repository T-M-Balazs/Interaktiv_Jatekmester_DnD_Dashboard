const express = require('express');
const multer = require('multer');
const { Storage } = require('@google-cloud/storage');
const cors = require('cors');
const path = require('path');

const app = express(); // <--- EZ HIÁNYZOTT! Itt jön létre az 'app'
app.use(cors());
app.use(express.json());

// Firebase Admin beállítása - Ellenőrizd a JSON fájl nevét!
const storage = new Storage({
  keyFilename: path.join(__dirname, 'firebase-key.json'), 
  projectId: 'szakdoga1-2adc6'
});

const bucket = storage.bucket('szakdoga1-2adc6.firebasestorage.app');
const upload = multer({ storage: multer.memoryStorage() });

// Fájlfeltöltő végpont
app.post('/api/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).send('Nincs fájl.');
    
    const folder = req.query.folder || 'music';
    const destination = `${folder}/${Date.now()}_${req.file.originalname}`;
    const blob = bucket.file(destination);
    
    const blobStream = blob.createWriteStream({
      resumable: false,
      contentType: req.file.mimetype,
      public: true
    });

    blobStream.on('error', (err) => {
      console.error("Feltöltési hiba:", err);
      res.status(500).send(err.message);
    });

    blobStream.on('finish', () => {
      const publicUrl = `https://storage.googleapis.com/${bucket.name}/${blob.name}`;
      console.log("Sikeres feltöltés:", publicUrl);
      res.status(200).send({ url: publicUrl, path: destination });
    });

    blobStream.end(req.file.buffer);
  } catch (e) {
    console.error("Szerver hiba:", e);
    res.status(500).send(e.message);
  }
});

// A szerver indítása
app.listen(3000, '0.0.0.0', () => {
  console.log('-----------------------------------------');
  console.log('Screamer Szerver sikeresen elindult!');
  console.log('Cím: http://localhost:3000');
  console.log('-----------------------------------------');
});