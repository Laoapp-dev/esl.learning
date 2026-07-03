/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

interface ImportMetaEnv {
  /** Public "publish to web" CSV URL of the master vocabulary Google Sheet.
   *  Baked into the build so EVERY user's app can auto-sync it — not just
   *  whichever browser the admin configured it in via Settings. */
  readonly VITE_SHEET_CSV_URL?: string;
  /** How often (minutes) each open app tab re-fetches the sheet automatically. */
  readonly VITE_SHEET_AUTO_SYNC_MIN?: string;

  readonly VITE_FIREBASE_API_KEY?: string;
  readonly VITE_FIREBASE_AUTH_DOMAIN?: string;
  readonly VITE_FIREBASE_PROJECT_ID?: string;
  readonly VITE_FIREBASE_STORAGE_BUCKET?: string;
  readonly VITE_FIREBASE_MESSAGING_SENDER_ID?: string;
  readonly VITE_FIREBASE_APP_ID?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
