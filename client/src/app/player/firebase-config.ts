// 🔥 Firebase alap importok
import { initializeApp } from 'firebase/app';

// 🔐 Authentication
import { getAuth } from 'firebase/auth';

// 🗄 Firestore (adatbázis)
import { getFirestore } from 'firebase/firestore';

// 📦 Storage (fájlfeltöltés)
import { getStorage } from 'firebase/storage';

/**
 * 👉 A TE Firebase projekt konfigurációd
 * (ezek NEM titkos adatok, mehetnek frontendbe)
 */
const firebaseConfig = {
  apiKey: 'AIzaSyBXbw1DqFbmuo4TPdgUEPNj6ccVVo1vMyg',
  authDomain: 'szakdoga1-2adc6.firebaseapp.com',
  projectId: 'szakdoga1-2adc6',
  storageBucket: 'szakdoga1-2adc6.firebasestorage.app',
  messagingSenderId: '255456048979',
  appId: '1:255456048979:web:f3033cf1e5808ee8b793a6'
};

// 🚀 Firebase App inicializálása (EGYSZER)
export const app = initializeApp(firebaseConfig);

// 🔐 Auth példány
export const auth = getAuth(app);

// 🗄 Firestore példány
export const db = getFirestore(app);

// 📦 Storage példány
export const storage = getStorage(app);
