import { useState, useCallback, useEffect, useMemo } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type { VocabularyWord, CEFRLevel, StudySession, UserProfile, AppSettings, FilterLevel, SortOption, Achievement } from '@/types/vocabulary';

function makeStorageKeys(prefix?: string) {
  const p = prefix || 'lexicon';
  return {
    words: `${p}_words`,
    sessions: `${p}_sessions`,
    profile: `${p}_profile`,
    settings: `${p}_settings`,
    achievements: `${p}_achievements`,
  };
}

// Keep for backward compat (unused now)
const STORAGE_KEYS = makeStorageKeys();

const DEFAULT_PROFILE: UserProfile = {
  username: 'Learner',
  email: '',
  cefrLevel: 'A2',
  dailyGoal: 10,
  joinDate: new Date().toISOString(),
  currentStreak: 0,
  longestStreak: 0,
};

const DEFAULT_SETTINGS: AppSettings = {
  showTranslations: true,
  autoPlayPronunciation: false,
  shuffleCards: true,
  showHints: true,
  theme: 'light',
  fontSize: 'medium',
  googleSheetUrl: '',
  autoSync: false,
};

const INITIAL_WORDS: VocabularyWord[] = [
  {
    id: uuidv4(),
    word: 'Serendipity',
    partOfSpeech: 'noun',
    definition: 'The occurrence of events by chance in a happy or beneficial way',
    exampleSentence: 'Finding this restaurant was pure serendipity.',
    synonym: 'chance, luck',
    antonym: 'misfortune',
    cefrLevel: 'C1',
    category: 'Abstract Nouns',
    dateAdded: new Date().toISOString(),
    studyCount: 3,
    correctCount: 2,
    isStarred: true,
    isLearned: false,
    difficulty: 'medium',
  },
  {
    id: uuidv4(),
    word: 'Ephemeral',
    partOfSpeech: 'adjective',
    definition: 'Lasting for a very short time',
    exampleSentence: 'Fashions are ephemeral; trends come and go overnight.',
    synonym: 'transient, fleeting',
    antonym: 'permanent, eternal',
    cefrLevel: 'C1',
    category: 'Describing Time',
    dateAdded: new Date(Date.now() - 86400000).toISOString(),
    studyCount: 5,
    correctCount: 4,
    isStarred: false,
    isLearned: true,
    difficulty: 'medium',
  },
  {
    id: uuidv4(),
    word: 'Ubiquitous',
    partOfSpeech: 'adjective',
    definition: 'Present, appearing, or found everywhere',
    exampleSentence: 'Smartphones have become ubiquitous in modern society.',
    synonym: 'omnipresent, pervasive',
    antonym: 'rare, scarce',
    cefrLevel: 'C1',
    category: 'Describing Presence',
    dateAdded: new Date(Date.now() - 172800000).toISOString(),
    studyCount: 2,
    correctCount: 1,
    isStarred: true,
    isLearned: false,
    difficulty: 'hard',
  },
  {
    id: uuidv4(),
    word: 'Resilience',
    partOfSpeech: 'noun',
    definition: 'The capacity to recover quickly from difficulties; toughness',
    exampleSentence: 'Her resilience in the face of adversity was inspiring.',
    synonym: 'toughness, flexibility',
    antonym: 'fragility, weakness',
    cefrLevel: 'B2',
    category: 'Personal Qualities',
    dateAdded: new Date(Date.now() - 259200000).toISOString(),
    studyCount: 4,
    correctCount: 4,
    isStarred: false,
    isLearned: true,
    difficulty: 'medium',
  },
  {
    id: uuidv4(),
    word: 'Eloquent',
    partOfSpeech: 'adjective',
    definition: 'Fluent or persuasive in speaking or writing',
    exampleSentence: 'She gave an eloquent speech that moved the audience.',
    synonym: 'articulate, expressive',
    antonym: 'inarticulate, hesitant',
    cefrLevel: 'B2',
    category: 'Communication',
    dateAdded: new Date(Date.now() - 345600000).toISOString(),
    studyCount: 6,
    correctCount: 5,
    isStarred: true,
    isLearned: true,
    difficulty: 'easy',
  },
  {
    id: uuidv4(),
    word: 'Pragmatic',
    partOfSpeech: 'adjective',
    definition: 'Dealing with things sensibly and realistically',
    exampleSentence: 'We need a pragmatic approach to solve this problem.',
    synonym: 'practical, realistic',
    antonym: 'idealistic, impractical',
    cefrLevel: 'B2',
    category: 'Describing People',
    dateAdded: new Date(Date.now() - 432000000).toISOString(),
    studyCount: 3,
    correctCount: 3,
    isStarred: false,
    isLearned: true,
    difficulty: 'easy',
  },
  {
    id: uuidv4(),
    word: 'Ambiguous',
    partOfSpeech: 'adjective',
    definition: 'Open to more than one interpretation; having a double meaning',
    exampleSentence: 'The contract was ambiguous about payment terms.',
    synonym: 'unclear, vague',
    antonym: 'clear, explicit',
    cefrLevel: 'B1',
    category: 'Communication',
    dateAdded: new Date(Date.now() - 518400000).toISOString(),
    studyCount: 7,
    correctCount: 6,
    isStarred: false,
    isLearned: true,
    difficulty: 'medium',
  },
  {
    id: uuidv4(),
    word: 'Candid',
    partOfSpeech: 'adjective',
    definition: 'Truthful and straightforward; frank',
    exampleSentence: 'She was candid about her reasons for leaving.',
    synonym: 'honest, frank',
    antonym: 'evasive, dishonest',
    cefrLevel: 'B1',
    category: 'Describing People',
    dateAdded: new Date(Date.now() - 604800000).toISOString(),
    studyCount: 2,
    correctCount: 2,
    isStarred: false,
    isLearned: true,
    difficulty: 'easy',
  },
  {
    id: uuidv4(),
    word: 'Diligent',
    partOfSpeech: 'adjective',
    definition: 'Having or showing care and conscientiousness in work or duties',
    exampleSentence: 'He was a diligent student who always completed his assignments.',
    synonym: 'hardworking, industrious',
    antonym: 'lazy, negligent',
    cefrLevel: 'A2',
    category: 'Personal Qualities',
    dateAdded: new Date(Date.now() - 691200000).toISOString(),
    studyCount: 8,
    correctCount: 7,
    isStarred: true,
    isLearned: true,
    difficulty: 'easy',
  },
  {
    id: uuidv4(),
    word: 'Gratitude',
    partOfSpeech: 'noun',
    definition: 'The quality of being thankful; readiness to show appreciation',
    exampleSentence: 'She expressed her gratitude for all the help she received.',
    synonym: 'thankfulness, appreciation',
    antonym: 'ingratitude, ungratefulness',
    cefrLevel: 'A2',
    category: 'Emotions',
    dateAdded: new Date(Date.now() - 777600000).toISOString(),
    studyCount: 5,
    correctCount: 5,
    isStarred: false,
    isLearned: true,
    difficulty: 'easy',
  },
  {
    id: uuidv4(),
    word: 'Nostalgia',
    partOfSpeech: 'noun',
    laoTranslation: 'ຄວາມຄິດຮອດ',
    thaiTranslation: 'ความคิดถึง',
    definition: 'A sentimental longing for the past',
    exampleSentence: 'Looking at old photos filled her with nostalgia.',
    synonym: 'remembrance, longing',
    antonym: '',
    cefrLevel: 'B1',
    category: 'Emotions',
    dateAdded: new Date(Date.now() - 86400000 * 2).toISOString(),
    studyCount: 1,
    correctCount: 1,
    isStarred: false,
    isLearned: false,
    difficulty: 'medium',
  },
  {
    id: uuidv4(),
    word: 'Meticulous',
    partOfSpeech: 'adjective',
    laoTranslation: 'ລະອຽດລະອຽດ',
    thaiTranslation: 'พิถีพิถัน',
    definition: 'Showing great attention to detail; very careful and precise',
    exampleSentence: 'The research was conducted with meticulous care.',
    synonym: 'precise, thorough',
    antonym: 'careless, sloppy',
    cefrLevel: 'C1',
    category: 'Describing People',
    dateAdded: new Date(Date.now() - 86400000 * 3).toISOString(),
    studyCount: 0,
    correctCount: 0,
    isStarred: false,
    isLearned: false,
    difficulty: 'hard',
  },
];

const ACHIEVEMENTS: Achievement[] = [
  { id: 'first_word', name: 'First Word', description: 'Add your first word', icon: 'badge-first-word', isUnlocked: true, unlockedDate: new Date().toISOString(), condition: 'word_count', threshold: 1 },
  { id: 'word_collector_10', name: 'Word Collector', description: 'Add 10 words', icon: 'badge-word-collector', isUnlocked: true, unlockedDate: new Date().toISOString(), condition: 'word_count', threshold: 10 },
  { id: 'word_collector_50', name: 'Vocabulary Builder', description: 'Add 50 words', icon: 'badge-vocab-builder', isUnlocked: false, condition: 'word_count', threshold: 50 },
  { id: 'word_collector_100', name: 'Word Master', description: 'Add 100 words', icon: 'badge-master-100', isUnlocked: false, condition: 'word_count', threshold: 100 },
  { id: 'streak_7', name: 'Week Warrior', description: 'Study 7 days in a row', icon: 'badge-streak-7', isUnlocked: false, condition: 'streak', threshold: 7 },
  { id: 'streak_30', name: 'Month Master', description: 'Study 30 days in a row', icon: 'badge-streak-30', isUnlocked: false, condition: 'streak', threshold: 30 },
  { id: 'master_50', name: 'Half Century', description: 'Master 50 words', icon: 'badge-half-century', isUnlocked: false, condition: 'master', threshold: 50 },
  { id: 'quiz_perfect', name: 'Perfect Score', description: 'Get 100% on a quiz', icon: 'badge-quiz-perfect', isUnlocked: false, condition: 'quiz', threshold: 100 },
  { id: 'import_pro', name: 'Import Pro', description: 'Import words from CSV', icon: 'badge-import-pro', isUnlocked: false, condition: 'import', threshold: 1 },
  { id: 'review_100', name: 'Reviewer', description: 'Review 100 words', icon: 'badge-reviewer', isUnlocked: false, condition: 'review', threshold: 100 },
];

function loadFromStorage<T>(key: string, fallback: T): T {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : fallback;
  } catch {
    return fallback;
  }
}

/**
 * Defensive sanitizer for any array of "word-like" objects coming from
 * localStorage, Firestore, Google Sheets, GitHub, or CSV import.
 *
 * ROOT CAUSE OF THE "Cannot read properties of null (reading 'word')" CRASH:
 * every one of those sources can — through an old app version, a corrupted
 * localStorage write, a half-finished sync, or a malformed CSV row — end up
 * with a `null`/`undefined` element sitting in an otherwise valid array.
 * Every place in the app that later does `words.map(w => w.word)` (Quiz,
 * Flashcards, Matching, Dashboard, WordList, …) then throws the instant it
 * hits that hole, which crashes the whole render tree and trips the
 * ErrorBoundary. Filtering the array once, right where it enters app state,
 * makes every downstream `.word` access safe without having to defensively
 * guard dozens of call sites individually.
 */
function sanitizeWords(arr: unknown): VocabularyWord[] {
  if (!Array.isArray(arr)) return [];
  return arr.filter(
    (w): w is VocabularyWord =>
      !!w && typeof w === 'object' && typeof (w as any).word === 'string' && (w as any).word.trim() !== ''
  );
}

function saveToStorage<T>(key: string, value: T): boolean {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    console.error(`Error saving to localStorage:`, error);
    return false;
  }
}

// Shared word list key written by Google Sheet sync (admin sets, all users read)
const GS_WORDS_KEY = 'moe_gsheet_words';

/**
 * Pure upsert: merges `incoming` rows into `base` by matching word text
 * (case-insensitive). Existing words are updated in place (content fields
 * only — study progress like studyCount/isStarred/isLearned is preserved).
 * New words are appended. Used by both the on-load cache merge and by
 * mergeSharedWords(), so every sync path in the app behaves identically and
 * nothing can ever be duplicated.
 */
function upsertWords(
  base: VocabularyWord[],
  incoming: Partial<VocabularyWord>[],
  defaultSource: 'shared' | 'manual' = 'shared'
): {
  result: VocabularyWord[]; added: number; updated: number;
} {
  // Defensive: strip any null/undefined/word-less entries before we touch
  // them. This is what prevents "Cannot read properties of null (reading
  // 'word')" — see sanitizeWords() above for the full explanation.
  const safeBase = sanitizeWords(base);
  const safeIncoming = Array.isArray(incoming)
    ? incoming.filter((w): w is Partial<VocabularyWord> => !!w && typeof w === 'object' && !!(w as any).word && String((w as any).word).trim() !== '')
    : [];

  const keyOf = (w: string) => w.toLowerCase().trim();
  const indexByKey = new Map(safeBase.map((w, i) => [keyOf(w.word), i]));
  const next = [...safeBase];
  const toAppend: VocabularyWord[] = [];
  let added = 0, updated = 0;

  for (const raw of safeIncoming) {
    const w = raw as VocabularyWord;
    if (!w.word || !w.word.trim()) continue;
    const key = keyOf(w.word);
    const idx = indexByKey.get(key);

    if (idx !== undefined) {
      const existing = next[idx];
      next[idx] = {
        ...existing,
        word: w.word,
        partOfSpeech: w.partOfSpeech || existing.partOfSpeech,
        definition: w.definition || existing.definition,
        exampleSentence: w.exampleSentence || existing.exampleSentence,
        cefrLevel: w.cefrLevel || existing.cefrLevel,
        difficulty: w.difficulty || existing.difficulty,
        synonym: w.synonym ?? existing.synonym,
        antonym: w.antonym ?? existing.antonym,
        category: w.category ?? existing.category,
        laoTranslation: w.laoTranslation ?? existing.laoTranslation,
        thaiTranslation: w.thaiTranslation ?? existing.thaiTranslation,
        // Never demote a learner's own manually-added word to 'shared' just
        // because an incoming list happens to contain the same word text —
        // that would make a future curriculum reset delete something the
        // learner typed in themselves. Respect the incoming word's own tag
        // when it explicitly says 'manual' too (e.g. round-tripped from a
        // GitHub per-user backup) — either side saying manual wins.
        source: (existing.source === 'manual' || w.source === 'manual') ? 'manual' : (w.source ?? defaultSource),
      };
      updated++;
    } else {
      const stamped: VocabularyWord = {
        word: w.word,
        partOfSpeech: w.partOfSpeech || 'noun',
        definition: w.definition || '',
        exampleSentence: w.exampleSentence || '',
        cefrLevel: w.cefrLevel || 'B1',
        difficulty: w.difficulty || 'medium',
        id: w.id || `gs_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        dateAdded: w.dateAdded || new Date().toISOString(),
        studyCount: 0, correctCount: 0, isStarred: false, isLearned: false,
        source: w.source ?? defaultSource,
        ...(w.synonym && { synonym: w.synonym }),
        ...(w.antonym && { antonym: w.antonym }),
        ...(w.category && { category: w.category }),
        ...(w.laoTranslation && { laoTranslation: w.laoTranslation }),
        ...(w.thaiTranslation && { thaiTranslation: w.thaiTranslation }),
      };
      indexByKey.set(key, next.length + toAppend.length);
      toAppend.push(stamped);
      added++;
    }
  }

  return { result: added + updated > 0 ? [...next, ...toAppend] : safeBase, added, updated };
}

export function useVocabulary(dataKeyPrefix?: string) {
  const KEYS = useMemo(() => makeStorageKeys(dataKeyPrefix), [dataKeyPrefix]);

  const [words, setWords] = useState<VocabularyWord[]>(() => {
    const userWords = sanitizeWords(loadFromStorage<VocabularyWord[]>(KEYS.words, INITIAL_WORDS));
    // Merge shared sheet words (written by admin sync) into this user's word list
    // on every app load so ALL users see the latest synced vocabulary —
    // upsert, not skip-only, so edits to existing words show up too.
    try {
      const sheetWords = sanitizeWords(JSON.parse(localStorage.getItem(GS_WORDS_KEY) || '[]'));
      if (sheetWords.length > 0) {
        return upsertWords(userWords, sheetWords).result;
      }
    } catch { /* ignore */ }
    return userWords;
  });
  const [sessions, setSessions] = useState<StudySession[]>(() =>
    loadFromStorage(KEYS.sessions, [])
  );
  const [profile, setProfile] = useState<UserProfile>(() =>
    loadFromStorage(KEYS.profile, DEFAULT_PROFILE)
  );
  const [settings, setSettings] = useState<AppSettings>(() =>
    loadFromStorage(KEYS.settings, DEFAULT_SETTINGS)
  );
  const [achievements] = useState<Achievement[]>(() =>
    loadFromStorage(KEYS.achievements, ACHIEVEMENTS)
  );

  // Surfaces failures that saveToStorage used to only console.error — most
  // importantly a quota-exceeded save of the word list itself, which at
  // library sizes approaching localStorage's ~5-10MB per-origin limit
  // (roughly 8,000-10,000 fully-populated words) could otherwise fail
  // completely silently: the import would *look* successful, then vanish
  // on the next reload with no explanation.
  const [storageWarning, setStorageWarning] = useState<string | null>(null);
  const clearStorageWarning = useCallback(() => setStorageWarning(null), []);

  useEffect(() => {
    const ok = saveToStorage(KEYS.words, words);
    if (!ok) {
      setStorageWarning(
        `Couldn't save your ${words.length.toLocaleString()} words — your browser's storage is full. ` +
        `Try removing some words, or ask an admin to prune the shared curriculum.`
      );
    }
  }, [words, KEYS.words]);
  useEffect(() => { saveToStorage(KEYS.sessions, sessions); }, [sessions, KEYS.sessions]);
  useEffect(() => { saveToStorage(KEYS.profile, profile); }, [profile, KEYS.profile]);
  useEffect(() => { saveToStorage(KEYS.settings, settings); }, [settings, KEYS.settings]);
  useEffect(() => { saveToStorage(KEYS.achievements, achievements); }, [achievements, KEYS.achievements]);

  // ── Cross-tab live sync ──────────────────────────────────────────────────
  // Every way words get added — manually via AddWordModal, CSV/Excel import,
  // admin Google Sheet sync, or GitHub sync — ultimately calls setWords(),
  // which the effect above writes to KEYS.words. The browser fires a native
  // `storage` event in every OTHER open tab (never the tab that made the
  // change) whenever that happens. Listening for it means: import a CSV in
  // one tab, and a Flashcards/Quiz/Matching/Spelling/Categories session open
  // in another tab picks up the new words immediately — no reload needed,
  // and no risk of a mid-session page reload losing study progress.
  //
  // Firestore's real-time listener (useFirestoreLiveVocabulary) and the
  // GitHub shared-curriculum pull (App.tsx) already cover the cross-DEVICE
  // case; this covers the cross-TAB case on one device, including for
  // setups that don't use either of those.
  const [externalSyncNotice, setExternalSyncNotice] = useState<{ added: number; updated: number } | null>(null);
  const clearExternalSyncNotice = useCallback(() => setExternalSyncNotice(null), []);

  useEffect(() => {
    function handleStorage(e: StorageEvent) {
      if (e.storageArea !== localStorage || !e.newValue) return;

      if (e.key === KEYS.words) {
        try {
          const incoming = sanitizeWords(JSON.parse(e.newValue));
          setWords(prev => {
            if (incoming.length > prev.length) {
              setExternalSyncNotice({ added: incoming.length - prev.length, updated: 0 });
            }
            // Full replace, not upsert: this is the SAME user's own list as
            // last saved by their other tab, so it's authoritative —
            // last-write-wins, consistent with how this app treats storage
            // everywhere else.
            return incoming;
          });
        } catch { /* ignore malformed payload */ }
        return;
      }

      if (e.key === GS_WORDS_KEY) {
        try {
          const sheetWords = sanitizeWords(JSON.parse(e.newValue));
          if (sheetWords.length === 0) return;
          setWords(prev => {
            const { result, added, updated } = upsertWords(prev, sheetWords);
            if (added > 0 || updated > 0) setExternalSyncNotice({ added, updated });
            return result;
          });
        } catch { /* ignore malformed payload */ }
      }
    }

    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [KEYS.words]);

  // Apply theme to document root
  useEffect(() => {
    const root = document.documentElement;
    const applyTheme = () => {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      const isDark = settings.theme === 'dark' || (settings.theme === 'system' && prefersDark);
      const isLightBlue = settings.theme === 'light-blue';
      root.classList.toggle('dark', isDark);
      root.classList.toggle('light-blue', isLightBlue);
    };
    applyTheme();
    // Listen for system preference changes when theme is 'system'
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    if (settings.theme === 'system') {
      mediaQuery.addEventListener('change', applyTheme);
      return () => mediaQuery.removeEventListener('change', applyTheme);
    }
  }, [settings.theme]);

  // Apply font size to document root
  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('text-size-small', 'text-size-medium', 'text-size-large');
    root.classList.add(`text-size-${settings.fontSize}`);
    const sizes: Record<string, string> = { small: '14px', medium: '16px', large: '18px' };
    root.style.fontSize = sizes[settings.fontSize] || '16px';
  }, [settings.fontSize]);

  const addWord = useCallback((wordData: Omit<VocabularyWord, 'id' | 'dateAdded' | 'studyCount' | 'correctCount' | 'isLearned' | 'difficulty'>) => {
    const newWord: VocabularyWord = {
      ...wordData,
      id: uuidv4(),
      dateAdded: new Date().toISOString(),
      studyCount: 0,
      correctCount: 0,
      isLearned: false,
      difficulty: 'medium',
      source: wordData.source ?? 'manual',
    };
    setWords(prev => [newWord, ...prev]);

    if (settings.autoSync && settings.googleSheetUrl) {
      syncToGoogleSheets(newWord);
    }

    return newWord;
  }, [settings]);

  const updateWord = useCallback((id: string, updates: Partial<VocabularyWord>) => {
    setWords(prev => prev.map(w => w.id === id ? { ...w, ...updates } : w));
  }, []);

  const deleteWord = useCallback((id: string) => {
    setWords(prev => prev.filter(w => w.id !== id));
  }, []);

  const toggleStar = useCallback((id: string) => {
    setWords(prev => prev.map(w => w.id === id ? { ...w, isStarred: !w.isStarred } : w));
  }, []);

  const importWords = useCallback((newWords: Omit<VocabularyWord, 'id' | 'dateAdded' | 'studyCount' | 'correctCount' | 'isLearned' | 'difficulty'>[]) => {
    const imported = newWords.map(w => ({
      ...w,
      id: uuidv4(),
      dateAdded: new Date().toISOString(),
      studyCount: 0,
      correctCount: 0,
      isLearned: false,
      difficulty: 'medium' as const,
    }));
    setWords(prev => [...imported, ...prev]);
    return imported.length;
  }, []);

  const addSession = useCallback((session: Omit<StudySession, 'id'>) => {
    const newSession: StudySession = {
      ...session,
      id: uuidv4(),
    };
    setSessions(prev => [newSession, ...prev]);

    // Update streak
    const today = new Date().toDateString();
    const lastStudy = profile.lastStudyDate ? new Date(profile.lastStudyDate).toDateString() : null;

    if (lastStudy !== today) {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      if (lastStudy === yesterday.toDateString()) {
        const newStreak = profile.currentStreak + 1;
        setProfile(prev => ({
          ...prev,
          currentStreak: newStreak,
          longestStreak: Math.max(newStreak, prev.longestStreak),
          lastStudyDate: new Date().toISOString(),
        }));
      } else {
        setProfile(prev => ({
          ...prev,
          currentStreak: 1,
          lastStudyDate: new Date().toISOString(),
        }));
      }
    }

    return newSession;
  }, [profile]);

  const getFilteredWords = useCallback((filter: FilterLevel, sort: SortOption, searchQuery: string, category?: string) => {
    let filtered = [...words];

    if (filter !== 'all') {
      filtered = filtered.filter(w => w.cefrLevel === filter);
    }

    if (category) {
      filtered = filtered.filter(w => w.category === category);
    }

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(w =>
        w.word.toLowerCase().includes(q) ||
        w.definition.toLowerCase().includes(q) ||
        w.exampleSentence.toLowerCase().includes(q) ||
        (w.synonym && w.synonym.toLowerCase().includes(q)) ||
        (w.laoTranslation && w.laoTranslation.toLowerCase().includes(q)) ||
        (w.thaiTranslation && w.thaiTranslation.toLowerCase().includes(q))
      );
    }

    switch (sort) {
      case 'alphabetical':
        filtered.sort((a, b) => a.word.localeCompare(b.word));
        break;
      case 'level':
        const levelOrder: Record<CEFRLevel, number> = { A1: 1, A2: 2, B1: 3, B2: 4, C1: 5, C2: 6 };
        filtered.sort((a, b) => levelOrder[a.cefrLevel] - levelOrder[b.cefrLevel]);
        break;
      case 'studied':
        filtered.sort((a, b) => b.studyCount - a.studyCount);
        break;
      default:
        filtered.sort((a, b) => new Date(b.dateAdded).getTime() - new Date(a.dateAdded).getTime());
    }

    return filtered;
  }, [words]);

  const getWordsDueForReview = useCallback(() => {
    return words.filter(w => {
      if (w.isLearned) return false;
      if (!w.nextReviewDate) return w.studyCount > 0;
      return new Date(w.nextReviewDate) <= new Date();
    });
  }, [words]);

  const getStarredWords = useCallback(() => {
    return words.filter(w => w.isStarred);
  }, [words]);

  const getLearnedWords = useCallback(() => {
    return words.filter(w => w.isLearned);
  }, [words]);

  const getCategories = useCallback(() => {
    const cats = new Set<string>();
    words.forEach(w => { if (w.category) cats.add(w.category); });
    return Array.from(cats).sort();
  }, [words]);

  const getStats = useCallback(() => {
    const totalWords = words.length;
    const learnedWords = words.filter(w => w.isLearned).length;
    const starredWords = words.filter(w => w.isStarred).length;
    const reviewDue = getWordsDueForReview().length;
    const totalSessions = sessions.length;
    const totalStudyTime = sessions.reduce((acc, s) => acc + s.duration, 0);

    const levelDistribution = words.reduce((acc, w) => {
      acc[w.cefrLevel] = (acc[w.cefrLevel] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const weeklyActivity = Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (6 - i));
      const dateStr = date.toDateString();
      const count = sessions.filter(s => new Date(s.date).toDateString() === dateStr).length;
      return { day: date.toLocaleDateString('en', { weekday: 'short' }), count };
    });

    return {
      totalWords,
      learnedWords,
      starredWords,
      reviewDue,
      totalSessions,
      totalStudyTime,
      levelDistribution,
      weeklyActivity,
      currentStreak: profile.currentStreak,
    };
  }, [words, sessions, profile, getWordsDueForReview]);

  const updateProfile = useCallback((updates: Partial<UserProfile>) => {
    setProfile(prev => ({ ...prev, ...updates }));
  }, []);

  const updateSettings = useCallback((updates: Partial<AppSettings>) => {
    setSettings(prev => ({ ...prev, ...updates }));
  }, []);

  const syncToGoogleSheets = useCallback(async (word?: VocabularyWord) => {
    if (!settings.googleSheetUrl) return { success: false, message: 'No Google Sheet URL configured' };

    try {
      const payload = word ? [word] : words;
      const response = await fetch(settings.googleSheetUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ words: payload }),
      });

      if (!response.ok) throw new Error('Sync failed');
      return { success: true, message: `Synced ${payload.length} words` };
    } catch (error) {
      return { success: false, message: (error as Error).message };
    }
  }, [settings.googleSheetUrl, words]);


  // Merge words from Google Sheet/GitHub/Firestore WITHOUT duplicating.
  // Thin wrapper around upsertWords() — see that function for the actual logic.
  // This is the ONLY function that should be used to bring in words from an
  // external source (sheet/Firestore/GitHub/Excel). Never use importWords for
  // that — importWords always appends and will duplicate on every sync.
  // Scans the CURRENT word list for duplicates (by normalized word text) and
  // reports them without changing anything — used to show the admin exactly
  // what's duplicated before/without committing to a cleanup.
  const findDuplicateWords = useCallback((): { word: string; count: number; ids: string[] }[] => {
    const groups = new Map<string, { word: string; ids: string[] }>();
    for (const w of words) {
      if (!w.word) continue;
      const key = w.word.toLowerCase().trim();
      const g = groups.get(key);
      if (g) g.ids.push(w.id);
      else groups.set(key, { word: w.word, ids: [w.id] });
    }
    return Array.from(groups.values())
      .filter(g => g.ids.length > 1)
      .map(g => ({ word: g.word, count: g.ids.length, ids: g.ids }))
      .sort((a, b) => b.count - a.count);
  }, [words]);

  // Collapses existing duplicates (by normalized word text) down to ONE entry
  // per word. This is the cleanup for words that got duplicated by the old
  // sync bug BEFORE mergeSharedWords existed — that fix only stops NEW
  // duplicates, it doesn't retroactively fix data that's already duplicated
  // in a user's local storage or GitHub backup. Keeps the most complete
  // content (first non-empty field across all copies) and merges study
  // progress (max study/correct count, starred/learned if ANY copy was,
  // earliest dateAdded) rather than arbitrarily picking one copy and
  // discarding a learner's progress on the others.
  const dedupeWords = useCallback((): { removedCount: number; uniqueCount: number } => {
    let removedCount = 0;
    setWords(prev => {
      const order: string[] = [];
      const byKey = new Map<string, VocabularyWord>();

      for (const w of prev) {
        if (!w.word || !w.word.trim()) continue;
        const key = w.word.toLowerCase().trim();
        const existing = byKey.get(key);
        if (!existing) {
          byKey.set(key, { ...w });
          order.push(key);
          continue;
        }
        removedCount++;
        byKey.set(key, {
          ...existing,
          definition: existing.definition || w.definition,
          exampleSentence: existing.exampleSentence || w.exampleSentence,
          synonym: existing.synonym ?? w.synonym,
          antonym: existing.antonym ?? w.antonym,
          category: existing.category ?? w.category,
          laoTranslation: existing.laoTranslation ?? w.laoTranslation,
          thaiTranslation: existing.thaiTranslation ?? w.thaiTranslation,
          studyCount: Math.max(existing.studyCount || 0, w.studyCount || 0),
          correctCount: Math.max(existing.correctCount || 0, w.correctCount || 0),
          isStarred: existing.isStarred || w.isStarred,
          isLearned: existing.isLearned || w.isLearned,
          dateAdded: existing.dateAdded && w.dateAdded
            ? (new Date(existing.dateAdded) < new Date(w.dateAdded) ? existing.dateAdded : w.dateAdded)
            : (existing.dateAdded || w.dateAdded),
        });
      }
      return order.map(k => byKey.get(k)!);
    });
    return { removedCount, uniqueCount: words.length - removedCount };
  }, [words]);

  const mergeSharedWords = useCallback((incoming: Partial<VocabularyWord>[], source: 'shared' | 'manual' = 'shared') => {
    let addedCount = 0;
    let updatedCount = 0;
    setWords(prev => {
      const { result, added, updated } = upsertWords(prev, incoming, source);
      addedCount = added;
      updatedCount = updated;
      return result;
    });
    return { added: addedCount, updated: updatedCount };
  }, []);

  // Replace the ENTIRE shared/admin curriculum with a new snapshot.
  //
  // mergeSharedWords (above) only ever ADDS or UPDATES — it can never remove
  // a word, so re-importing a smaller or corrected CSV/sheet just piles the
  // new words on top of the old ones forever. This is the real "reset and
  // replace" an admin needs when they want the app's vocabulary to actually
  // MATCH a new source file, not just grow to include it.
  //
  // Safety rules:
  //  • Words the learner tagged 'manual' (added themselves) are NEVER
  //    touched, no matter what's in the new set.
  //  • A shared word that's still present in the new set keeps its study
  //    progress (matched by word text) — this is a curriculum refresh, not
  //    a progress wipe.
  //  • A shared word that's no longer in the new set is removed.
  const replaceSharedWords = useCallback((newSharedWords: Partial<VocabularyWord>[]) => {
    let addedCount = 0, updatedCount = 0, removedCount = 0;
    setWords(prev => {
      const manual = prev.filter(w => w.source === 'manual');
      const previousShared = prev.filter(w => w.source !== 'manual');

      const { result: mergedShared, added, updated } = upsertWords(previousShared, newSharedWords);

      const newKeys = new Set(
        (Array.isArray(newSharedWords) ? newSharedWords : [])
          .filter((w): w is Partial<VocabularyWord> & { word: string } => !!w && typeof w.word === 'string' && w.word.trim() !== '')
          .map(w => w.word.toLowerCase().trim())
      );
      const finalShared = mergedShared.filter(w => newKeys.has(w.word.toLowerCase().trim()));

      addedCount = added;
      updatedCount = updated;
      removedCount = mergedShared.length - finalShared.length;

      return [...manual, ...finalShared];
    });
    return { added: addedCount, updated: updatedCount, removed: removedCount };
  }, []);

  // Admin "reset all data" action.
  //  scope 'shared' — clears only admin-pushed words (source:'shared'),
  //    keeping anything a learner added themselves. This is the safe
  //    default: "clear the curriculum, keep my own notes."
  //  scope 'all'    — clears every word, including manual additions. Meant
  //    to be gated behind an explicit, extra-confirmed admin action since
  //    it also deletes things learners typed in themselves.
  // Either way: study SESSIONS history is left alone (it's a log of past
  // activity, not vocabulary content) — pair with resetProgress() if a
  // full wipe including stats/streaks is also wanted.
  const clearVocabulary = useCallback((scope: 'shared' | 'all' = 'shared') => {
    let removedCount = 0;
    setWords(prev => {
      const kept = scope === 'all' ? [] : prev.filter(w => w.source === 'manual');
      removedCount = prev.length - kept.length;
      return kept;
    });
    // Also clear the locally-cached shared snapshot so a page reload
    // doesn't immediately re-merge the words we just cleared back in.
    try { localStorage.removeItem(GS_WORDS_KEY); } catch { /* ignore */ }
    return { removed: removedCount };
  }, []);

  const resetProgress = useCallback(() => {
    setWords(prev => prev.map(w => ({
      ...w,
      studyCount: 0,
      correctCount: 0,
      isLearned: false,
      difficulty: 'medium' as const,
      nextReviewDate: undefined,
    })));
    setSessions([]);
    setProfile(prev => ({ ...prev, currentStreak: 0, longestStreak: 0 }));
  }, []);

  return {
    words,
    sessions,
    profile,
    settings,
    achievements,
    addWord,
    updateWord,
    deleteWord,
    toggleStar,
    importWords,
    addSession,
    getFilteredWords,
    getWordsDueForReview,
    getStarredWords,
    getLearnedWords,
    getCategories,
    getStats,
    updateProfile,
    updateSettings,
    syncToGoogleSheets,
    mergeSharedWords,
    replaceSharedWords,
    clearVocabulary,
    findDuplicateWords,
    dedupeWords,
    resetProgress,
    storageWarning,
    clearStorageWarning,
    externalSyncNotice,
    clearExternalSyncNotice,
  };
}
