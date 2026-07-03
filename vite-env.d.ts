/**
 * useGithubSync — shared vocabulary sync via GitHub
 *
 * HOW IT WORKS:
 *  - Admin publishes words → pushed to  data/shared/words.json  in the repo
 *  - Any device/user opens the app    → pulls that same file and merges words
 *  - Public repos: READ is free (no token needed for users)
 *  - Private repos: token required for both admin and users
 *
 * STORAGE KEY for config:
 *  lexicon_github_config  (already used by AdminPanel — reused here)
 */

import { useCallback, useEffect, useRef } from 'react';
import type { VocabularyWord } from '@/types/vocabulary';
import type { GithubConfig } from '@/types/auth';
import { GITHUB_SYNC_KEY } from '@/types/auth';

const SHARED_PATH = 'data/shared/words.json';
const LAST_PULL_KEY = 'lexicon_last_shared_pull';
const PULL_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

function getConfig(): GithubConfig | null {
  try {
    const raw = localStorage.getItem(GITHUB_SYNC_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function encodeContent(data: object): string {
  return btoa(unescape(encodeURIComponent(JSON.stringify(data, null, 2))));
}

function decodeContent(base64: string): object {
  return JSON.parse(decodeURIComponent(escape(atob(base64))));
}

export interface SharedSyncResult {
  success: boolean;
  message: string;
  wordCount?: number;
}

export function useGithubSync(
  words: VocabularyWord[],
  onWordsReceived: (words: VocabularyWord[]) => void,
  isAdmin: boolean,
  isOnline: boolean
) {
  const lastPullRef = useRef<number>(
    parseInt(localStorage.getItem(LAST_PULL_KEY) || '0', 10)
  );

  // ── PUSH: admin publishes all words to shared store ──────────────
  const publishWords = useCallback(async (): Promise<SharedSyncResult> => {
    if (!isOnline) return { success: false, message: 'No internet connection' };
    const config = getConfig();
    if (!config?.token || !config?.repo) {
      return { success: false, message: 'GitHub not configured — go to Admin Panel → Sync tab' };
    }

    const url = `https://api.github.com/repos/${config.repo}/contents/${SHARED_PATH}`;
    const headers = {
      Authorization: `token ${config.token}`,
      Accept: 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
    };

    try {
      // Get existing SHA (needed for update)
      let sha: string | undefined;
      const getRes = await fetch(url, { headers });
      if (getRes.ok) {
        const existing = await getRes.json();
        sha = existing.sha;
      }

      const payload = {
        publishedAt: new Date().toISOString(),
        wordCount: words.length,
        words,
      };

      const body: Record<string, unknown> = {
        message: `Publish ${words.length} words — ${new Date().toISOString()}`,
        content: encodeContent(payload),
        branch: config.branch || 'main',
      };
      if (sha) body.sha = sha;

      const putRes = await fetch(url, { method: 'PUT', headers, body: JSON.stringify(body) });
      if (!putRes.ok) {
        const err = await putRes.json();
        return { success: false, message: err.message || 'Publish failed' };
      }
      return { success: true, message: `Published ${words.length} words to GitHub`, wordCount: words.length };
    } catch (e) {
      return { success: false, message: (e as Error).message };
    }
  }, [words, isOnline]);

  // ── PULL: any device fetches shared words ────────────────────────
  const pullWords = useCallback(async (force = false): Promise<SharedSyncResult> => {
    if (!isOnline) return { success: false, message: 'No internet connection' };
    const config = getConfig();
    if (!config?.repo) {
      return { success: false, message: 'GitHub repo not configured' };
    }

    // Throttle: skip if pulled recently (unless forced)
    const now = Date.now();
    if (!force && now - lastPullRef.current < PULL_INTERVAL_MS) {
      return { success: true, message: 'Words already up to date', wordCount: 0 };
    }

    // Public repos can be read without a token via raw URL
    const useToken = !!config.token;
    const url = useToken
      ? `https://api.github.com/repos/${config.repo}/contents/${SHARED_PATH}`
      : `https://raw.githubusercontent.com/${config.repo}/${config.branch || 'main'}/${SHARED_PATH}`;

    try {
      const headers: Record<string, string> = { Accept: 'application/vnd.github.v3+json' };
      if (useToken) headers.Authorization = `token ${config.token}`;

      const res = await fetch(url, { headers });
      if (!res.ok) return { success: false, message: 'No shared words found on GitHub yet' };

      let payload: { words: VocabularyWord[]; publishedAt?: string };
      if (useToken) {
        const file = await res.json();
        payload = decodeContent(file.content) as typeof payload;
      } else {
        // raw URL returns content directly
        payload = await res.json();
      }

      const incoming = payload?.words;
      if (!Array.isArray(incoming) || incoming.length === 0) {
        return { success: false, message: 'No words in shared store' };
      }

      onWordsReceived(incoming);
      lastPullRef.current = now;
      localStorage.setItem(LAST_PULL_KEY, String(now));

      return {
        success: true,
        message: `Loaded ${incoming.length} words from GitHub`,
        wordCount: incoming.length,
      };
    } catch (e) {
      return { success: false, message: (e as Error).message };
    }
  }, [isOnline, onWordsReceived]);

  // ── AUTO-PULL on mount and every 5 minutes ───────────────────────
  useEffect(() => {
    if (!isOnline) return;
    const config = getConfig();
    if (!config?.repo) return;

    // Pull on mount (non-admin always; admin also pulls to stay in sync)
    pullWords(false);

    // Poll every 5 minutes
    const interval = setInterval(() => pullWords(false), PULL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [isOnline, pullWords]);

  return { publishWords, pullWords };
}
