import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type { AuthUser, AuthState, LoginCredentials, RegisterCredentials, GithubConfig, GoogleProfileDraft } from '@/types/auth';
import { AUTH_STORAGE_KEY, AUTH_CREDS_KEY, AUTH_SESSION_KEY, GITHUB_SYNC_KEY } from '@/types/auth';

// Simple hash for demo (in production, use bcrypt on a server)
function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return hash.toString(36);
}

function loadUsers(): AuthUser[] {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveUsers(users: AuthUser[]) {
  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(users));
}

function loadCreds(): Record<string, string> {
  try {
    const raw = localStorage.getItem(AUTH_CREDS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

function saveCreds(creds: Record<string, string>) {
  localStorage.setItem(AUTH_CREDS_KEY, JSON.stringify(creds));
}

const SESSION_PERSIST_KEY = AUTH_SESSION_KEY + '_persist';
const SESSION_EXPIRE_KEY  = AUTH_SESSION_KEY + '_expire';
const SESSION_DAYS = 7;

function getSessionUser(): AuthUser | null {
  try {
    // Check 7-day expiry for persistent sessions
    const expireAt = localStorage.getItem(SESSION_EXPIRE_KEY);
    if (expireAt && Date.now() > parseInt(expireAt, 10)) {
      localStorage.removeItem(SESSION_PERSIST_KEY);
      localStorage.removeItem(SESSION_EXPIRE_KEY);
      return null;
    }
    const id = sessionStorage.getItem(AUTH_SESSION_KEY) || localStorage.getItem(SESSION_PERSIST_KEY);
    if (!id) return null;
    const users = loadUsers();
    return users.find(u => u.id === id) || null;
  } catch { return null; }
}

function ensureAdminExists() {
  let users = loadUsers();
  let creds = loadCreds();

  // Migrate old admin email if present
  const OLD_EMAIL = 'admin@lexicon.app';
  const NEW_EMAIL = 'berndvh015@gmail.com';
  const oldAdmin = users.find(u => u.role === 'admin' && u.email.toLowerCase() === OLD_EMAIL);
  if (oldAdmin) {
    users = users.map(u =>
      u.id === oldAdmin.id ? { ...u, email: NEW_EMAIL, username: 'Beun Donsavanh' } : u
    );
    delete creds[OLD_EMAIL];
    creds[NEW_EMAIL] = simpleHash('admin123');
    saveUsers(users);
    saveCreds(creds);
    return;
  }

  // Create admin if no admin exists at all
  if (!users.find(u => u.role === 'admin')) {
    const adminId = uuidv4();
    const admin: AuthUser = {
      id: adminId,
      username: 'Beun Donsavanh',
      email: NEW_EMAIL,
      role: 'admin',
      joinDate: new Date().toISOString(),
      isActive: true,
      cefrLevel: 'C2',
      dailyGoal: 20,
      currentStreak: 0,
      longestStreak: 0,
      dataKey: `lexicon_data_${adminId}`,
    };
    users.push(admin);
    saveUsers(users);
    creds[NEW_EMAIL] = simpleHash('admin123');
    saveCreds(creds);
    return;
  }

  // Ensure the correct admin always has a valid credential entry
  const admin = users.find(u => u.role === 'admin');
  if (admin && !creds[admin.email.toLowerCase()]) {
    creds[admin.email.toLowerCase()] = simpleHash('admin123');
    saveCreds(creds);
  }
}

interface AuthContextType extends AuthState {
  login: (creds: LoginCredentials, remember?: boolean) => Promise<{ success: boolean; error?: string }>;
  register: (creds: RegisterCredentials) => Promise<{ success: boolean; error?: string }>;
  loginWithGoogle: () => Promise<{ success: boolean; error?: string; needsProfile?: boolean; draft?: GoogleProfileDraft }>;
  completeGoogleProfile: (draft: GoogleProfileDraft, fullName: string, country: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  getAllUsers: () => AuthUser[];
  updateUser: (id: string, updates: Partial<AuthUser>) => void;
  deleteUser: (id: string) => void;
  toggleUserActive: (id: string) => void;
  updateCurrentUserProfile: (updates: Partial<AuthUser>) => void;
  changePassword: (currentPassword: string, newPassword: string) => { success: boolean; error?: string };
  getGithubConfig: () => GithubConfig | null;
  saveGithubConfig: (config: GithubConfig) => void;
  syncToGithub: (data: object, userId: string) => Promise<{ success: boolean; message: string }>;
  loadFromGithub: (userId: string) => Promise<{ success: boolean; data?: object; message: string }>;
  isOnline: boolean;
}

export const AuthContext = createContext<AuthContextType | null>(null);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    ensureAdminExists();
    const user = getSessionUser();
    if (user) setCurrentUser(user);
    setIsLoading(false);

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const login = useCallback(async (creds: LoginCredentials, remember = false): Promise<{ success: boolean; error?: string }> => {
    const users = loadUsers();
    const storedCreds = loadCreds();
    const user = users.find(u => u.email.toLowerCase() === creds.email.toLowerCase());
    if (!user) return { success: false, error: 'No account found with this email' };
    if (!user.isActive) return { success: false, error: 'Account is deactivated. Contact admin.' };
    const hash = simpleHash(creds.password);
    if (storedCreds[user.email.toLowerCase()] !== hash) return { success: false, error: 'Incorrect password' };

    const updated = { ...user, lastLogin: new Date().toISOString() };
    const newUsers = users.map(u => u.id === user.id ? updated : u);
    saveUsers(newUsers);
    setCurrentUser(updated);
    if (remember) {
      const expireAt = Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000;
      localStorage.setItem(SESSION_PERSIST_KEY, user.id);
      localStorage.setItem(SESSION_EXPIRE_KEY, String(expireAt));
    } else {
      sessionStorage.setItem(AUTH_SESSION_KEY, user.id);
    }
    return { success: true };
  }, []);

  const register = useCallback(async (creds: RegisterCredentials): Promise<{ success: boolean; error?: string }> => {
    const users = loadUsers();
    const storedCreds = loadCreds();
    if (users.find(u => u.email.toLowerCase() === creds.email.toLowerCase())) {
      return { success: false, error: 'An account with this email already exists' };
    }
    if (creds.password.length < 6) return { success: false, error: 'Password must be at least 6 characters' };
    if (!creds.fullName?.trim()) return { success: false, error: 'Full name is required' };
    if (!creds.country?.trim()) return { success: false, error: 'Please select your country' };
    const id = uuidv4();
    const newUser: AuthUser = {
      id,
      username: creds.username.trim(),
      email: creds.email.toLowerCase(),
      role: 'user',
      joinDate: new Date().toISOString(),
      isActive: true,
      cefrLevel: 'A2',
      dailyGoal: 10,
      currentStreak: 0,
      longestStreak: 0,
      dataKey: `lexicon_data_${id}`,
      fullName: creds.fullName.trim(),
      country: creds.country.trim(),
      authProvider: 'password',
    };
    users.push(newUser);
    saveUsers(users);
    storedCreds[creds.email.toLowerCase()] = simpleHash(creds.password);
    saveCreds(storedCreds);
    setCurrentUser(newUser);
    // Auto-login for 7 days after registration
    const expireAt = Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000;
    localStorage.setItem(SESSION_PERSIST_KEY, id);
    localStorage.setItem(SESSION_EXPIRE_KEY, String(expireAt));
    return { success: true };
  }, []);

  // ── Sign in with Google ──────────────────────────────────────────────────────
  // Step 1: open the Google popup. If an account with this email already
  // exists, log straight in (7-day remembered session, same as password
  // login). If it's a brand-new email, DON'T create the account yet — hand
  // back a draft profile so the UI can collect Full Name + Country first.
  const loginWithGoogle = useCallback(async (): Promise<{
    success: boolean; error?: string; needsProfile?: boolean; draft?: GoogleProfileDraft;
  }> => {
    try {
      const { auth, googleProvider, firebaseConfigured } = await import('@/lib/firebase');
      if (!firebaseConfigured()) {
        return { success: false, error: 'Google sign-in is not configured for this app yet. Ask the admin to set up Firebase Authentication.' };
      }
      const { signInWithPopup } = await import('firebase/auth');
      const result = await signInWithPopup(auth, googleProvider);
      const gUser = result.user;
      const email = (gUser.email || '').toLowerCase();
      if (!email) return { success: false, error: 'Your Google account has no email address to sign in with' };

      const users = loadUsers();
      const existing = users.find(u => u.email.toLowerCase() === email);

      if (existing) {
        if (!existing.isActive) return { success: false, error: 'Account is deactivated. Contact admin.' };
        const updated: AuthUser = {
          ...existing,
          lastLogin: new Date().toISOString(),
          authProvider: existing.authProvider ?? 'google',
          googleUid: gUser.uid,
          avatar: existing.avatar || gUser.photoURL || undefined,
        };
        saveUsers(users.map(u => (u.id === existing.id ? updated : u)));
        setCurrentUser(updated);
        // Google sign-in always remembers the session for 7 days.
        const expireAt = Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000;
        localStorage.setItem(SESSION_PERSIST_KEY, existing.id);
        localStorage.setItem(SESSION_EXPIRE_KEY, String(expireAt));
        return { success: true };
      }

      // New Google account — need Full Name + Country before we create it.
      return {
        success: true,
        needsProfile: true,
        draft: {
          googleUid: gUser.uid,
          email,
          suggestedName: gUser.displayName || '',
          avatar: gUser.photoURL || undefined,
        },
      };
    } catch (e) {
      const err = e as { code?: string; message?: string };
      if (err.code === 'auth/popup-closed-by-user') return { success: false, error: 'Sign-in cancelled' };
      return { success: false, error: err.message || 'Google sign-in failed' };
    }
  }, []);

  // Step 2: finish creating the account for a brand-new Google sign-in, once
  // the person has supplied their Full Name and Country.
  const completeGoogleProfile = useCallback(async (
    draft: GoogleProfileDraft, fullName: string, country: string
  ): Promise<{ success: boolean; error?: string }> => {
    if (!fullName.trim()) return { success: false, error: 'Full name is required' };
    if (!country.trim()) return { success: false, error: 'Please select your country' };

    const users = loadUsers();
    if (users.find(u => u.email.toLowerCase() === draft.email)) {
      return { success: false, error: 'An account with this email already exists' };
    }

    const id = uuidv4();
    const newUser: AuthUser = {
      id,
      username: fullName.trim(),
      email: draft.email,
      role: 'user',
      joinDate: new Date().toISOString(),
      isActive: true,
      cefrLevel: 'A2',
      dailyGoal: 10,
      currentStreak: 0,
      longestStreak: 0,
      dataKey: `lexicon_data_${id}`,
      fullName: fullName.trim(),
      country: country.trim(),
      authProvider: 'google',
      googleUid: draft.googleUid,
      avatar: draft.avatar,
      lastLogin: new Date().toISOString(),
    };
    users.push(newUser);
    saveUsers(users);
    setCurrentUser(newUser);

    const expireAt = Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000;
    localStorage.setItem(SESSION_PERSIST_KEY, id);
    localStorage.setItem(SESSION_EXPIRE_KEY, String(expireAt));
    return { success: true };
  }, []);

  const logout = useCallback(() => {
    setCurrentUser(null);
    sessionStorage.removeItem(AUTH_SESSION_KEY);
    localStorage.removeItem(SESSION_PERSIST_KEY);
    localStorage.removeItem(SESSION_EXPIRE_KEY);
    // Best-effort — only relevant for accounts that signed in via Google;
    // harmless no-op otherwise.
    import('@/lib/firebase').then(({ auth }) => import('firebase/auth').then(({ signOut }) => signOut(auth))).catch(() => {});
  }, []);

  const getAllUsers = useCallback(() => loadUsers(), []);

  const updateUser = useCallback((id: string, updates: Partial<AuthUser>) => {
    const users = loadUsers();
    const newUsers = users.map(u => u.id === id ? { ...u, ...updates } : u);
    saveUsers(newUsers);
    if (currentUser?.id === id) setCurrentUser(prev => prev ? { ...prev, ...updates } : prev);
  }, [currentUser]);

  const deleteUser = useCallback((id: string) => {
    const users = loadUsers();
    const user = users.find(u => u.id === id);
    if (user) {
      const creds = loadCreds();
      delete creds[user.email.toLowerCase()];
      saveCreds(creds);
      // Remove user data
      localStorage.removeItem(user.dataKey + '_words');
      localStorage.removeItem(user.dataKey + '_sessions');
      localStorage.removeItem(user.dataKey + '_profile');
      localStorage.removeItem(user.dataKey + '_settings');
    }
    saveUsers(users.filter(u => u.id !== id));
  }, []);

  const toggleUserActive = useCallback((id: string) => {
    const users = loadUsers();
    const newUsers = users.map(u => u.id === id ? { ...u, isActive: !u.isActive } : u);
    saveUsers(newUsers);
  }, []);

  const changePassword = useCallback((currentPassword: string, newPassword: string): { success: boolean; error?: string } => {
    if (!currentUser) return { success: false, error: 'Not logged in' };
    if (newPassword.length < 6) return { success: false, error: 'New password must be at least 6 characters' };
    const creds = loadCreds();
    const hash = simpleHash(currentPassword);
    if (creds[currentUser.email.toLowerCase()] !== hash) return { success: false, error: 'Current password is incorrect' };
    creds[currentUser.email.toLowerCase()] = simpleHash(newPassword);
    saveCreds(creds);
    return { success: true };
  }, [currentUser]);

  const updateCurrentUserProfile = useCallback((updates: Partial<AuthUser>) => {
    if (!currentUser) return;
    updateUser(currentUser.id, updates);
  }, [currentUser, updateUser]);

  const getGithubConfig = useCallback((): GithubConfig | null => {
    try {
      const raw = localStorage.getItem(GITHUB_SYNC_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  }, []);

  const saveGithubConfig = useCallback((config: GithubConfig) => {
    localStorage.setItem(GITHUB_SYNC_KEY, JSON.stringify(config));
  }, []);

  const syncToGithub = useCallback(async (data: object, userId: string): Promise<{ success: boolean; message: string }> => {
    if (!isOnline) return { success: false, message: 'No internet connection. Data saved offline.' };
    const config = getGithubConfig();
    if (!config?.token || !config?.repo) return { success: false, message: 'GitHub not configured' };

    const path = `data/users/${userId}.json`;
    const content = btoa(unescape(encodeURIComponent(JSON.stringify(data, null, 2))));
    const url = `https://api.github.com/repos/${config.repo}/contents/${path}`;

    try {
      // Get existing SHA if file exists
      let sha: string | undefined;
      const getRes = await fetch(url, {
        headers: { Authorization: `token ${config.token}`, Accept: 'application/vnd.github.v3+json' }
      });
      if (getRes.ok) {
        const existing = await getRes.json();
        sha = existing.sha;
      }

      const body: Record<string, string> = {
        message: `Update vocab data for user ${userId} - ${new Date().toISOString()}`,
        content,
        branch: config.branch || 'main',
      };
      if (sha) body.sha = sha;

      const putRes = await fetch(url, {
        method: 'PUT',
        headers: {
          Authorization: `token ${config.token}`,
          Accept: 'application/vnd.github.v3+json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (!putRes.ok) {
        const err = await putRes.json();
        return { success: false, message: err.message || 'GitHub sync failed' };
      }
      return { success: true, message: 'Synced to GitHub successfully' };
    } catch (e) {
      return { success: false, message: (e as Error).message };
    }
  }, [isOnline, getGithubConfig]);

  const loadFromGithub = useCallback(async (userId: string): Promise<{ success: boolean; data?: object; message: string }> => {
    if (!isOnline) return { success: false, message: 'No internet connection' };
    const config = getGithubConfig();
    if (!config?.token || !config?.repo) return { success: false, message: 'GitHub not configured' };

    const path = `data/users/${userId}.json`;
    const url = `https://api.github.com/repos/${config.repo}/contents/${path}`;

    try {
      const res = await fetch(url, {
        headers: { Authorization: `token ${config.token}`, Accept: 'application/vnd.github.v3+json' }
      });
      if (!res.ok) return { success: false, message: 'No data found on GitHub' };
      const file = await res.json();
      const decoded = decodeURIComponent(escape(atob(file.content)));
      return { success: true, data: JSON.parse(decoded), message: 'Loaded from GitHub' };
    } catch (e) {
      return { success: false, message: (e as Error).message };
    }
  }, [isOnline, getGithubConfig]);

  return (
    <AuthContext.Provider value={{
      currentUser,
      isAuthenticated: !!currentUser,
      isLoading,
      isOnline,
      login,
      register,
      loginWithGoogle,
      completeGoogleProfile,
      logout,
      getAllUsers,
      updateUser,
      deleteUser,
      toggleUserActive,
      updateCurrentUserProfile,
      changePassword,
      getGithubConfig,
      saveGithubConfig,
      syncToGithub,
      loadFromGithub,
    }}>
      {children}
    </AuthContext.Provider>
  );
}
