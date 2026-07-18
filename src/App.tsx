import { Routes, Route } from 'react-router-dom';
import { createContext, useContext, useCallback, useEffect, useRef, Suspense, lazy, type ComponentType } from 'react';
import { useVocabulary } from '@/hooks/useVocabulary';
import { useToast } from '@/hooks/useToast';
import { useAuth, AuthProvider } from '@/hooks/useAuth';
import { useGoogleSheet } from '@/hooks/useGoogleSheet';
import { useGithubUserSync } from '@/hooks/useGithubUserSync';
import { useFirestoreLiveVocabulary } from '@/hooks/useFirestoreLiveVocabulary';
import { Sidebar } from '@/components/Sidebar';
import { MobileNav } from '@/components/MobileNav';
import { ToastContainer } from '@/components/ToastContainer';
import { AuthPage } from '@/pages/AuthPage';

// ── Lazy-loaded pages ────────────────────────────────────────────────────────
// Every page below is its own separate JS chunk, loaded on demand instead of
// all being bundled into one giant file that every visitor has to download
// (and that has to succeed loading perfectly) before anything can render.
//
// This also fixes a real risk that existed before: AdminPanel pulls in
// Firestore (`useFirestoreVocabulary`), and because AdminPanel used to be
// imported eagerly at the top of this file, Firebase was being initialized
// for EVERY visitor on EVERY page load — not just for admins opening the
// admin panel. Now that code only loads if an admin actually navigates to
// /admin.
// ── Resilient lazy loading ───────────────────────────────────────────────────
// A plain `lazy(() => import(...))` throws straight into the top-level
// ErrorBoundary the instant a chunk request fails — which happens far more
// often than it should: a flaky mobile connection, a tab that's been open
// since before the latest deploy requesting a JS filename that no longer
// exists on the server, or the service worker swapping in new precached
// assets mid-navigation. None of those mean the app is actually broken, but
// without a retry they all produced the exact "Something went wrong" screen
// on what should have just been "try that navigation again."
//
// lazyWithRetry: on failure, waits briefly and retries the import a couple of
// times (covers transient network blips) before giving up. If every retry
// still fails — the classic sign of a stale build referencing a hashed
// filename that's been replaced by a new deploy — it forces a single full
// page reload (guarded by sessionStorage so a genuinely broken deploy can't
// reload-loop forever) so the browser picks up the current build's chunk
// manifest instead of the stale one it started this tab with.
function lazyWithRetry<T extends { default: ComponentType<any> }>(
  importFn: () => Promise<T>,
  chunkName: string,
) {
  return lazy(async () => {
    const attempts = 3;
    let lastErr: unknown;
    for (let i = 0; i < attempts; i++) {
      try {
        return await importFn();
      } catch (err) {
        lastErr = err;
        if (i < attempts - 1) {
          await new Promise(res => setTimeout(res, 300 * (i + 1)));
        }
      }
    }
    const reloadGuardKey = `esl_chunk_reload_${chunkName}`;
    if (sessionStorage.getItem(reloadGuardKey) !== '1') {
      sessionStorage.setItem(reloadGuardKey, '1');
      window.location.reload();
      // Never resolves — the reload is already in flight, so there's no
      // meaningful component to return and no point rendering the error UI
      // for the instant before the page navigates away.
      return new Promise<T>(() => {});
    }
    // Already tried the reload-once fix for this chunk this session and it
    // still failed — surface it for real via the ErrorBoundary rather than
    // looping reloads forever.
    throw lastErr;
  });
}

const Dashboard      = lazyWithRetry(() => import('@/pages/Dashboard').then(m => ({ default: m.Dashboard })), 'dashboard');
const WordList       = lazyWithRetry(() => import('@/pages/WordList').then(m => ({ default: m.WordList })), 'wordlist');
const Favorites      = lazyWithRetry(() => import('@/pages/Favorites').then(m => ({ default: m.Favorites })), 'favorites');
const LevelJourney   = lazyWithRetry(() => import('@/pages/LevelJourney').then(m => ({ default: m.LevelJourney })), 'leveljourney');
const Categories     = lazyWithRetry(() => import('@/pages/Categories').then(m => ({ default: m.Categories })), 'categories');
const StudyLayout    = lazyWithRetry(() => import('@/pages/StudyLayout').then(m => ({ default: m.StudyLayout })), 'studylayout');
const Flashcards     = lazyWithRetry(() => import('@/pages/Flashcards').then(m => ({ default: m.Flashcards })), 'flashcards');
const Quiz           = lazyWithRetry(() => import('@/pages/Quiz').then(m => ({ default: m.Quiz })), 'quiz');
const Matching       = lazyWithRetry(() => import('@/pages/Matching').then(m => ({ default: m.Matching })), 'matching');
const Spelling       = lazyWithRetry(() => import('@/pages/Spelling').then(m => ({ default: m.Spelling })), 'spelling');
const Settings       = lazyWithRetry(() => import('@/pages/Settings').then(m => ({ default: m.Settings })), 'settings');
const Profile        = lazyWithRetry(() => import('@/pages/Profile').then(m => ({ default: m.Profile })), 'profile');
const AdminPanel     = lazyWithRetry(() => import('@/pages/AdminPanel').then(m => ({ default: m.AdminPanel })), 'adminpanel');
const UserDashboard  = lazyWithRetry(() => import('@/pages/UserDashboard').then(m => ({ default: m.UserDashboard })), 'userdashboard');
const PreTest        = lazyWithRetry(() => import('@/pages/PreTest').then(m => ({ default: m.PreTest })), 'pretest');
const Practice       = lazyWithRetry(() => import('@/pages/Practice').then(m => ({ default: m.Practice })), 'practice');

function PageLoading() {
  return (
    <div className="flex h-full min-h-[50vh] items-center justify-center">
      <div className="h-8 w-8 border-[3px] border-[#1A1A2E]/20 border-t-[#1A1A2E] rounded-full animate-spin" />
    </div>
  );
}

interface AppContextType {
  vocabulary: ReturnType<typeof useVocabulary>;
  addToast: (message: string, type?: 'success' | 'error' | 'info' | 'warning') => string;
  gsheet: ReturnType<typeof useGoogleSheet>;
  githubSync: ReturnType<typeof useGithubUserSync>;
}

export const AppContext = createContext<AppContextType | null>(null);
export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}

function AppInner() {
  const { currentUser, isAuthenticated, isLoading } = useAuth();
  const vocabulary = useVocabulary(currentUser?.dataKey);
  const { toasts, addToast, removeToast } = useToast();
  const gsheet = useGoogleSheet();
  const githubSync = useGithubUserSync();

  // Track previous auth state to fire effects only on login transition
  const prevAuthRef = useRef(false);

  // Surface warnings/notices bubbled up from useVocabulary as toasts —
  // the hook itself has no UI, so App.tsx is where these become visible.
  useEffect(() => {
    if (vocabulary.storageWarning) {
      addToast(vocabulary.storageWarning, 'error');
      vocabulary.clearStorageWarning();
    }
  }, [vocabulary.storageWarning]); // eslint-disable-line

  useEffect(() => {
    if (vocabulary.externalSyncNotice) {
      const { added, updated } = vocabulary.externalSyncNotice;
      const parts: string[] = [];
      if (added > 0) parts.push(`${added} new word${added === 1 ? '' : 's'}`);
      if (updated > 0) parts.push(`${updated} updated`);
      if (parts.length > 0) addToast(`✨ Vocabulary synced from another tab — ${parts.join(', ')}`, 'success');
      vocabulary.clearExternalSyncNotice();
    }
  }, [vocabulary.externalSyncNotice]); // eslint-disable-line

  // On login: merge shared Google Sheet words + pull vocab from GitHub
  useEffect(() => {
    if (!isAuthenticated || !currentUser) return;
    if (prevAuthRef.current) return; // already ran for this session
    prevAuthRef.current = true;

    // Merge Google Sheet shared words (cached in localStorage)
    const shared = gsheet.getSharedWords();
    if (shared.length > 0) {
      vocabulary.mergeSharedWords(shared);
    }

    // Pull vocab from GitHub in background (cross-device sync)
    githubSync.pullVocab(currentUser.id).then(r => {
      if (r.success && r.data?.words && r.data.words.length > 0) {
        vocabulary.mergeSharedWords(r.data.words);
      }
    }).catch(() => {/* silent — GitHub not configured yet */});

  }, [isAuthenticated, currentUser?.id]); // eslint-disable-line

  // Reset prevAuthRef when user logs out
  useEffect(() => {
    if (!isAuthenticated) prevAuthRef.current = false;
  }, [isAuthenticated]);

  // ── Auto-sync shared vocabulary for EVERY user, automatically ────────────────
  // This is the piece that makes "admin syncs once → all users see it" actually
  // work. The old auto-sync only fired if the CURRENT browser had a CSV URL
  // saved locally in Settings — which only the admin's own browser ever had.
  // A regular user's device never had it configured, so it silently did
  // nothing for them. Fix: the source URL is baked into the app at build time
  // (VITE_SHEET_CSV_URL in .env), so it's identical and present on every
  // visitor's device — admin or not — with zero setup required from them.
  const sheetUrl = import.meta.env.VITE_SHEET_CSV_URL as string | undefined;
  useEffect(() => {
    if (!isAuthenticated || !sheetUrl) return;

    const run = () => {
      gsheet.syncNow((words) => vocabulary.mergeSharedWords(words), { csvUrl: sheetUrl, mode: 'csv' });
    };

    run(); // fetch once immediately on login/app open
    const minutes = Number(import.meta.env.VITE_SHEET_AUTO_SYNC_MIN) || 15;
    const id = setInterval(run, minutes * 60_000); // and keep refreshing while the tab stays open
    return () => clearInterval(id);
  }, [isAuthenticated, sheetUrl]); // eslint-disable-line

  // ── Firestore live sync for EVERY user (real-time, no polling, no button) ────
  // If Firebase env vars are configured (see MIGRATION_GUIDE.md), this opens a
  // live connection: the moment the admin's import script writes a new/changed
  // word to Firestore, every open app updates within seconds automatically —
  // no reload, no manual sync, no per-device setup. Safe to leave the Google
  // Sheet auto-sync above running at the same time; both funnel into the same
  // dedup-safe mergeSharedWords, so nothing can double up between the two.
  useFirestoreLiveVocabulary(isAuthenticated, (words) => vocabulary.mergeSharedWords(words));

  // ── Shared curriculum sync via GitHub (EVERY user, works without a rebuild) ──
  // This is what makes "admin resets + imports CSV/Sheet + pushes" actually
  // reach other devices: a fixed file in the admin's configured GitHub repo
  // that every learner's app pulls on login and periodically thereafter.
  // Uses replaceSharedWords (reconciling replace), not mergeSharedWords (add
  // -only) — so when the admin pushes a fresh curriculum snapshot, words
  // that are no longer in it actually disappear from learners' devices
  // instead of piling up next to the new ones forever. A learner's own
  // manually-added words (source:'manual') are never touched by this.
  useEffect(() => {
    if (!isAuthenticated) return;

    const run = () => {
      githubSync.pullSharedVocabulary().then(r => {
        if (r.success && r.words && r.words.length > 0) {
          vocabulary.replaceSharedWords(r.words);
        }
      }).catch(() => {/* silent — GitHub not configured, or nothing pushed yet */});
    };

    run(); // once on login
    const id = setInterval(run, 15 * 60_000); // and every 15 min while the tab stays open
    return () => clearInterval(id);
  }, [isAuthenticated]); // eslint-disable-line

  // Legacy per-browser auto-sync (Admin Panel "auto sync" timer + interval
  // config). Kept for backward compatibility / manual testing by admin, but
  // NOT what makes vocabulary reach other users — see the effect above.
  useEffect(() => {
    const handler = () => {
      gsheet.syncNow((words) => vocabulary.mergeSharedWords(words));
    };
    window.addEventListener('moe-gsheet-autosync', handler);
    return () => window.removeEventListener('moe-gsheet-autosync', handler);
  }, []); // eslint-disable-line

  // Auto-push vocab to GitHub when words change (debounced 10s)
  // Only runs when authenticated and words are loaded
  useEffect(() => {
    if (!currentUser || !isAuthenticated || vocabulary.words.length === 0) return;
    githubSync.schedulePush(currentUser.id, vocabulary.words, vocabulary.sessions);
  }, [vocabulary.words.length, currentUser?.id, isAuthenticated]); // eslint-disable-line

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 border-[3px] border-[#1A1A2E]/20 border-t-[#1A1A2E] rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) return <AuthPage />;

  return (
    <AppContext.Provider value={{ vocabulary, addToast, gsheet, githubSync }}>
      <div className="flex h-screen w-screen overflow-hidden bg-background dot-grid-bg">
        <div className="sidebar-desktop hidden md:block">
          <Sidebar profile={vocabulary.profile} currentStreak={vocabulary.profile.currentStreak} />
        </div>
        <main className="flex-1 overflow-y-auto main-content">
          <div className="mx-auto max-w-[960px] px-4 py-6 md:px-8 md:py-8 main-content-mobile-pad md:pb-8">
            <Suspense fallback={<PageLoading />}>
              <Routes>
                <Route path="/"              element={<Dashboard />} />
                <Route path="/words"         element={<WordList />} />
                <Route path="/favorites"     element={<Favorites />} />
                <Route path="/pretest"       element={<PreTest />} />
                <Route path="/study"         element={<StudyLayout />}>
                  <Route path="level"        element={<LevelJourney />} />
                  <Route path="categories"   element={<Categories />} />
                  <Route path="flashcards"   element={<Flashcards />} />
                  <Route path="quiz"         element={<Quiz />} />
                  <Route path="matching"     element={<Matching />} />
                  <Route path="spelling"     element={<Spelling />} />
                </Route>
                <Route path="/settings"      element={<Settings />} />
                <Route path="/profile"       element={<Profile />} />
                <Route path="/my-account"    element={<UserDashboard />} />
                <Route path="/practice"        element={<Practice />} />
                {currentUser?.role === 'admin' && (
                  <Route path="/admin" element={<AdminPanel />} />
                )}
              </Routes>
            </Suspense>
          </div>
        </main>
        <MobileNav />
        <ToastContainer toasts={toasts} onRemove={removeToast} />
      </div>
    </AppContext.Provider>
  );
}

export default function App() {
  return <AuthProvider><AppInner /></AuthProvider>;
}
