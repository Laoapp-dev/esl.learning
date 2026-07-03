/**
 * useFirestoreLiveVocabulary
 * ---------------------------------------------------------------------------
 * Opens a REAL-TIME Firestore listener on the shared "vocabulary" collection.
 * Every connected user's app receives new/changed words the moment the admin
 * import script writes them — no manual sync button, no page reload, no
 * per-device setup. This is the piece that makes "admin uploads once → all
 * users see it automatically" actually true across different devices.
 *
 * Safe no-op if Firebase isn't configured yet (missing .env values) — the
 * app just falls back to whatever other sync method (Google Sheet) is set up.
 *
 * Admin-only writes are enforced by firestore.rules (see project root),
 * NOT by anything in this file — regular users have no write path at all,
 * client-side or otherwise.
 */
import { useEffect, useRef } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import type { VocabularyWord } from '@/types/vocabulary';

const COLLECTION = 'vocabulary';

function firebaseConfigured(): boolean {
  return Boolean(
    import.meta.env.VITE_FIREBASE_API_KEY &&
    import.meta.env.VITE_FIREBASE_PROJECT_ID
  );
}

export function useFirestoreLiveVocabulary(
  enabled: boolean,
  mergeFn: (incoming: Partial<VocabularyWord>[]) => void
) {
  // Keep mergeFn fresh without re-subscribing the listener on every render
  const mergeRef = useRef(mergeFn);
  mergeRef.current = mergeFn;

  useEffect(() => {
    if (!enabled || !firebaseConfigured()) return;

    let unsub: (() => void) | undefined;
    let isFirstSnapshot = true;

    // Lazy-import so apps that never configure Firebase don't pay the
    // bundle-size cost, and so a missing/invalid config can't crash the app.
    import('@/lib/firebase').then(({ db }) => {
      const col = collection(db, COLLECTION);
      unsub = onSnapshot(col, (snap) => {
        const words: Partial<VocabularyWord>[] = [];
        snap.forEach(docSnap => {
          const data = docSnap.data() as any;
          if (data.deleted) return;
          words.push({
            word: data.word,
            partOfSpeech: data.partOfSpeech,
            definition: data.definition,
            exampleSentence: data.exampleSentence,
            synonym: data.synonym || undefined,
            antonym: data.antonym || undefined,
            cefrLevel: data.cefrLevel,
            category: data.category || undefined,
            difficulty: data.difficulty,
            laoTranslation: data.laoTranslation || undefined,
            thaiTranslation: data.thaiTranslation || undefined,
          });
        });
        if (words.length > 0) mergeRef.current(words);
        isFirstSnapshot = false;
      }, (err) => {
        // Silent — e.g. offline, or Firestore not set up yet. Other sync
        // paths (Google Sheet) still work independently of this.
        console.warn('Firestore live vocabulary sync unavailable:', err.message);
      });
    }).catch(() => {/* firebase.ts import failed — not configured, ignore */});

    return () => { if (unsub) unsub(); };
  }, [enabled]);
}
