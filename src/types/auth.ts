export type UserRole = 'admin' | 'user';

export interface AuthUser {
  id: string;
  username: string;
  email: string;
  role: UserRole;
  avatar?: string;
  joinDate: string;
  lastLogin?: string;
  isActive: boolean;
  cefrLevel: string;
  dailyGoal: number;
  currentStreak: number;
  longestStreak: number;
  lastStudyDate?: string;
  // Per-user vocabulary data keys in storage
  dataKey: string;
  pretestDone?: boolean;
  pretestScore?: number;
  pretestLevel?: string;
  pretestDate?: string;
  // Full name + country, collected at registration (incl. after Google sign-in)
  fullName?: string;
  country?: string;
  // How this account authenticates — password accounts can still change
  // password; 'google' accounts sign in exclusively via Google popup.
  authProvider?: 'password' | 'google';
  googleUid?: string;
}

export interface AuthState {
  currentUser: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterCredentials {
  username: string;
  email: string;
  password: string;
  fullName: string;
  country: string;
}

// Data collected after a successful Google popup sign-in, before we know
// whether this is a brand-new account (needs Full Name + Country) or an
// existing one (logs straight in).
export interface GoogleProfileDraft {
  googleUid: string;
  email: string;
  suggestedName: string;
  avatar?: string;
}

export interface StoredCredentials {
  email: string;
  passwordHash: string;
}

export const AUTH_STORAGE_KEY = 'lexicon_auth_users';
export const AUTH_CREDS_KEY = 'lexicon_auth_creds';
export const AUTH_SESSION_KEY = 'lexicon_auth_session';
export const GITHUB_SYNC_KEY = 'lexicon_github_config';

export interface GithubConfig {
  token: string;
  repo: string; // "owner/repo"
  branch: string;
}

// Pre-test result stored on the user record
export interface PretestResult {
  score: number;          // 0–25
  cefrLevel: string;      // level assigned by score
  completedAt: string;    // ISO date
  totalQuestions: number;
}
