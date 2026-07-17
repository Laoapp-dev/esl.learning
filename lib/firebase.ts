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
import { getAuth, GoogleAuthProvider } from 'firebase/auth';

// Some people copy their Firebase key including the surrounding quote marks
// (e.g. from a JSON snippet or an old .env file: "AIzaSy...") and paste that
// whole string — quotes and all — into the GitHub Actions secret value.
// Vite just substitutes the literal secret string, so the quotes become part
// of the actual key at runtime, and every request fails. This strips any
// wrapping " or ' (and stray whitespace) so a mis-pasted secret still works.
function clean(v: string | undefined): string {
  if (!v) return '';
  return v.trim().replace(/^['"]+|['"]+$/g, '').trim();
}

const firebaseConfig = {
  apiKey: clean(import.meta.env.VITE_FIREBASE_API_KEY),
  authDomain: clean(import.meta.env.VITE_FIREBASE_AUTH_DOMAIN),
  projectId: clean(import.meta.env.VITE_FIREBASE_PROJECT_ID),
  storageBucket: clean(import.meta.env.VITE_FIREBASE_STORAGE_BUCKET),
  messagingSenderId: clean(import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID),
  appId: clean(import.meta.env.VITE_FIREBASE_APP_ID),
};

export function firebaseConfigured(): boolean {
  return firebaseConfigDiagnostics().length === 0;
}

/**
 * Returns a list of human-readable problems with the baked-in Firebase
 * config, or an empty array if everything looks valid. Never includes the
 * actual key value (only whether it's present / well-formed) so it's safe
 * to log or show in the UI.
 *
 * Open your browser DevTools console on the live site — this runs on load
 * (see the warning below) so you can see exactly what the DEPLOYED build
 * actually received from your GitHub Actions secrets, without needing
 * repo/server access to check.
 */
export function firebaseConfigDiagnostics(): string[] {
  const problems: string[] = [];
  const key = (firebaseConfig.apiKey || '').trim();
  const project = (firebaseConfig.projectId || '').trim();
  const authDomain = (firebaseConfig.authDomain || '').trim();

  if (!key) problems.push('VITE_FIREBASE_API_KEY is empty/missing in this build');
  else if (!key.startsWith('AIza')) problems.push(`VITE_FIREBASE_API_KEY doesn't look like a real Firebase key (should start with "AIza", got "${key.slice(0, 6)}…")`);

  if (!project) problems.push('VITE_FIREBASE_PROJECT_ID is empty/missing in this build');
  if (!authDomain) problems.push('VITE_FIREBASE_AUTH_DOMAIN is empty/missing in this build');

  return problems;
}

if (typeof window !== 'undefined') {
  const problems = firebaseConfigDiagnostics();
  if (problems.length > 0) {
    // eslint-disable-next-line no-console
    console.warn('[ESL Learning] Firebase is not fully configured in this build:\n' + problems.map(p => ' - ' + p).join('\n') +
      '\nIf you just added/fixed GitHub Actions secrets, remember: secrets are only baked in at BUILD time. ' +
      'You must trigger a new deploy (push a commit, or Actions tab → Run workflow) — merely saving the secret does nothing to an already-deployed build. ' +
      'Also try an Incognito window or unregister the service worker (Application tab) — this app caches aggressively for offline use, so an old build can keep being served after a successful redeploy.');
  }
}

export const firebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);
export const db = getFirestore(firebaseApp);

// Auth — used for "Sign in with Google". Safe to call getAuth() even if the
// env vars are missing; it just won't be able to complete a real sign-in
// until a valid Firebase project is configured (see .env.example).
export const auth = getAuth(firebaseApp);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });
