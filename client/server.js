const express = require('express');
const path = require('path');
const app = express();

const DIST_FOLDER = path.join(__dirname, 'dist'); 

app.use(express.static(DIST_FOLDER));

// JAVÍTOTT RÉSZ: Speciális karakterek helyett egy függvényt használunk
app.get(/.*/, (req, res) => {
    res.sendFile(path.join(DIST_FOLDER, 'index.html'));
});

const PORT = 4200;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`===========================================`);
    console.log(`✅ A Node.js szerver sikeresen elindult!`);
    console.log(`🔗 Helyi cím: http://localhost:${PORT}`);
    console.log(`===========================================`);
});