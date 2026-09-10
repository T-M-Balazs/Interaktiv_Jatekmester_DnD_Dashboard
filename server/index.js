const express = require('express');
const multer = require('multer');
const { Storage } = require('@google-cloud/storage');
const admin = require('firebase-admin');
const { AccessToken } = require('livekit-server-sdk');
const cors = require('cors');
const path = require('path');
const crypto = require('crypto');

const app = express(); // <--- EZ HIÁNYZOTT! Itt jön létre az 'app'
app.use(cors());
app.use(express.json());

const livekitApiKey = process.env.LIVEKIT_API_KEY;
const livekitApiSecret = process.env.LIVEKIT_API_SECRET;

if (!livekitApiKey || !livekitApiSecret) {
  console.warn('LIVEKIT_API_KEY vagy LIVEKIT_API_SECRET nincs beállítva.');
}

// Firebase Admin beállítása - Ellenőrizd a JSON fájl nevét!
const storage = new Storage({
  keyFilename: path.join(__dirname, 'firebase-key.json'), 
  projectId: 'szakdoga1-2adc6'
});

admin.initializeApp({
  credential: admin.credential.cert(path.join(__dirname, 'firebase-key.json'))
});

const bucket = storage.bucket('szakdoga1-2adc6.firebasestorage.app');

app.post('/api/livekit/token', async (req, res) => {
  try {
    if (!livekitApiKey || !livekitApiSecret) {
      return res.status(503).json({ error: 'A LiveKit szerver nincs konfigurálva.' });
    }

    const authorization = req.get('authorization') || '';
    const idToken = authorization.startsWith('Bearer ')
      ? authorization.slice('Bearer '.length)
      : '';

    if (!idToken) {
      return res.status(401).json({ error: 'Hiányzó bejelentkezési token.' });
    }

    const decodedToken = await admin.auth().verifyIdToken(idToken);
    const roomName = String(req.body?.roomName || '').trim();
    const participantName = String(
      req.body?.participantName || decodedToken.name || decodedToken.email || decodedToken.uid
    ).trim();

    if (!roomName || roomName.length > 128 || !participantName || participantName.length > 128) {
      return res.status(400).json({ error: 'Érvénytelen szoba- vagy résztvevőnév.' });
    }

    const token = new AccessToken(livekitApiKey, livekitApiSecret, {
      identity: decodedToken.uid,
      name: participantName
    });
    token.addGrant({
      roomJoin: true,
      room: roomName,
      canPublish: true,
      canSubscribe: true
    });

    return res.json({ token: await token.toJwt() });
  } catch (error) {
    console.error('LiveKit token hiba:', error);
    if (typeof error?.code === 'string' && error.code.startsWith('auth/')) {
      return res.status(401).json({ error: 'Érvénytelen vagy lejárt bejelentkezési token.' });
    }

    return res.status(500).json({ error: 'A LiveKit token létrehozása sikertelen.' });
  }
});
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024
  },
  fileFilter: (req, file, callback) => {
    const allowedTypes = /^(audio|image)\//;

    if (allowedTypes.test(file.mimetype)) {
      callback(null, true);
      return;
    }

    callback(new Error('Csak audio- és képfájlok tölthetők fel.'));
  }
});

// Fájlfeltöltő végpont
app.post('/api/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).send('Nincs fájl.');
    
    const allowedFolders = new Set(['audio', 'music', 'shorts']);
    const requestedFolder = String(req.query.folder || 'music');
    const folder = allowedFolders.has(requestedFolder) ? requestedFolder : 'music';
    const extension = path.extname(req.file.originalname).toLowerCase();
    const destination = `${folder}/${crypto.randomUUID()}${extension}`;
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