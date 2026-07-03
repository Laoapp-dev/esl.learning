// Firebase client initialization.
//
// 1. Create a free Firebase project: https://console.firebase.google.com
// 2. Add a "Web app" inside Project Settings → copy the config values below.
// 3. Enable Firestore: console → Build → Firestore Database → Create database
//    → Start in "production mode" (we lock it down with firestore.rules).
// 4. Put your real values into a `.env` file at the project root (see .env.example).
//    Vite only exposes vars prefixed with VITE_ to the browser — never put
//    secret/admin keys here, only the public web config (it's safe to expose,
//    Firestore security is enforced by firestore.rules, not by hiding this config).

import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

export const firebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);
export const db = getFirestore(firebaseApp);
