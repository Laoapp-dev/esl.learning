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

function saveToStorage<T>(key: string, value: T) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error(`Error saving to localStorage:`, error);
  }
}

export function useVocabulary(dataKeyPrefix?: string) {
  const KEYS = useMemo(() => makeStorageKeys(dataKeyPrefix), [dataKeyPrefix]);

  const [words, setWords] = useState<VocabularyWord[]>(() =>
    loadFromStorage(KEYS.words, INITIAL_WORDS)
  );
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

  useEffect(() => saveToStorage(KEYS.words, words), [words, KEYS.words]);
  useEffect(() => saveToStorage(KEYS.sessions, sessions), [sessions, KEYS.sessions]);
  useEffect(() => saveToStorage(KEYS.profile, profile), [profile, KEYS.profile]);
  useEffect(() => saveToStorage(KEYS.settings, settings), [settings, KEYS.settings]);
  useEffect(() => saveToStorage(KEYS.achievements, achievements), [achievements, KEYS.achievements]);

  // Apply theme to document root
  useEffect(() => {
    const root = document.documentElement;
    const applyTheme = () => {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      const isDark = settings.theme === 'dark' || (settings.theme === 'system' && prefersDark);
      root.classList.toggle('dark', isDark);
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


  /**
   * mergeSharedWords — called when pulling from GitHub shared store.
   * Adds words that don't exist locally yet (by word text, case-insensitive).
   * Never overwrites existing local words so study progress is preserved.
   */
  const mergeSharedWords = useCallback((incoming: VocabularyWord[]) => {
    setWords(prev => {
      const existingKeys = new Set(prev.map(w => w.word.toLowerCase().trim()));
      const toAdd = incoming.filter(w => !existingKeys.has(w.word.toLowerCase().trim()));
      if (toAdd.length === 0) return prev;
      const stamped = toAdd.map(w => ({ ...w, id: `shared_${w.id}` }));
      return [...prev, ...stamped];
    });
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
    resetProgress,
    mergeSharedWords,
  };
}
