import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import './index.css'
import App from './App.tsx'
import { ErrorBoundary } from './components/ErrorBoundary.tsx'

// ── GitHub Pages blank-screen-after-deploy fix ──────────────────────────────
// The PWA service worker is configured with skipWaiting + clientsClaim, so a
// new deploy's SW takes control of ALREADY-OPEN tabs immediately — including
// a tab a user is actively using right now (e.g. right after they log in).
// The React app already running in that tab still holds references to the
// PREVIOUS build's hashed asset filenames. Every GitHub Pages deploy replaces
// the whole folder, so those old hashed files no longer exist on the server.
// The moment the new SW claims the tab, any lazy/dynamic import that isn't
// already loaded in memory requests the OLD filename and gets a 404 — which
// silently breaks that part of the app: exactly the "login works, then blank
// screen" symptom.
//
// Fix: force a one-time full reload the moment a new service worker takes
// control, so the running app always matches the active service worker.
if ('serviceWorker' in navigator) {
  let refreshing = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (refreshing) return;
    refreshing = true;
    window.location.reload();
  });

  // Mobile browsers (iOS Safari in particular) are inconsistent about
  // spontaneously checking for a new service worker version, especially for
  // a PWA reopened from the home screen rather than freshly navigated to.
  // Without this, a phone that first loaded a broken build can stay stuck
  // on it indefinitely even after the site is fixed and redeployed — reload
  // just re-serves the same stale precached shell. Force an explicit check:
  // once now, and again whenever the app is brought to the foreground.
  navigator.serviceWorker.ready.then(reg => {
    reg.update().catch(() => {});
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') reg.update().catch(() => {});
    });
  }).catch(() => {});
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <HashRouter>
        <App />
      </HashRouter>
    </ErrorBoundary>
  </StrictMode>,
)
