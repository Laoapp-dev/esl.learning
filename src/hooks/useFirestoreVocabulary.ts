/**
 * useFirestoreVocabulary — incremental vocabulary sync from Firestore.
 *
 * WHY THIS FIXES YOUR DUPLICATION PROBLEM FOR GOOD:
 *  - Every word document lives at vocabulary/{slug(word)} in Firestore — the
 *    document ID *is* the word, so the same word can never exist twice server
 *    side, no matter how many times you import your Excel file.
 *  - Every write stamps an `updatedAt` server timestamp. The client remembers
 *    the timestamp of its last successful sync (localStorage) and only asks
 *    Firestore for documents changed *after* that point:
 *        where('updatedAt', '>', lastSyncAt)
 *    So after the first full sync, subsequent syncs only transfer the rows
 *    you actually edited in Excel — not the whole sheet.
 *  - Results are merged in with vocabulary.mergeSharedWords(), which itself
 *    is also dedup-safe (upserts by word text), so even a full resync can't
 *    duplicate anything.
 *
 * Free tier notes (Firebase Spark plan, no credit card required):
 *  - 50,000 reads/day, 20,000 writes/day, 20,000 deletes/day, 1 GiB stored.
 *  - A vocabulary list of a few thousand words easily fits in that quota,
 *    even with many users doing incremental syncs daily.
 */
import { useCallback, useState } from 'react';
import {
  collection, query, where, orderBy, getDocs, Timestamp,
} from 'firebase/firestore';
import type { VocabularyWord } from '@/types/vocabulary';

const COLLECTION = 'vocabulary';
export const FS_LAST_SYNC_KEY = 'moe_firestore_lastsync'; // ISO string

export function useFirestoreVocabulary() {
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getLastSync = useCallback((): Date | null => {
    const raw = localStorage.getItem(FS_LAST_SYNC_KEY);
    return raw ? new Date(raw) : null;
  }, []);

  /**
   * Pull only words changed since the last sync (or ALL words on first run).
   * Pass in vocabulary.mergeSharedWords as `mergeFn`.
   * Returns how many docs were read from Firestore and merged locally.
   */
  const syncNow = useCallback(async (
    mergeFn: (incoming: Partial<VocabularyWord>[]) => { added: number; updated: number } | void,
    opts?: { forceFull?: boolean }
  ): Promise<{ success: boolean; read: number; added?: number; updated?: number; error?: string }> => {
    setSyncing(true);
    setError(null);
    try {
      // Lazy-import so this page never pays the Firebase bundle cost (and
      // can't affect page load) unless an admin actually triggers a sync.
      const { db } = await import('@/lib/firebase');
      const last = opts?.forceFull ? null : getLastSync();
      const col = collection(db, COLLECTION);
      const q = last
        ? query(col, where('updatedAt', '>', Timestamp.fromDate(last)), orderBy('updatedAt', 'asc'))
        : query(col, orderBy('updatedAt', 'asc'));

      const snap = await getDocs(q);
      const words: Partial<VocabularyWord>[] = [];
      let latest = last ?? new Date(0);

      snap.forEach(docSnap => {
        const data = docSnap.data() as any;
        if (data.updatedAt?.toDate) {
          const t = data.updatedAt.toDate() as Date;
          if (t > latest) latest = t;
        }
        if (data.deleted) return; // soft-deleted rows are skipped, not imported
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

      const result = words.length > 0 ? mergeFn(words) : undefined;
      localStorage.setItem(FS_LAST_SYNC_KEY, latest.toISOString());
      setSyncing(false);
      return { success: true, read: snap.size, added: result?.added, updated: result?.updated };
    } catch (err) {
      const msg = (err as Error).message;
      setError(msg);
      setSyncing(false);
      return { success: false, read: 0, error: msg };
    }
  }, [getLastSync]);

  return { syncing, error, syncNow, getLastSync };
}
