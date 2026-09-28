// Firebase init — the single source of the app's Firestore/Auth/Storage handles.
// OWNER: Hadi (DevOps). Freeze after setup; announce before editing.
//
// Dev runs against the local Firestore EMULATOR (no real project needed).
// Set VITE_USE_EMULATOR=false + real VITE_FB_* keys in web/.env for a live project.
import { initializeApp } from 'firebase/app';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getStorage, connectStorageEmulator } from 'firebase/storage';
import { getFunctions, connectFunctionsEmulator } from 'firebase/functions';

const config = {
  apiKey: import.meta.env.VITE_FB_API_KEY || 'demo-key',
  authDomain: import.meta.env.VITE_FB_AUTH_DOMAIN || 'foundit-demo.firebaseapp.com',
  projectId: import.meta.env.VITE_FB_PROJECT_ID || 'foundit-demo',
  storageBucket: import.meta.env.VITE_FB_STORAGE_BUCKET || 'foundit-demo.appspot.com',
  messagingSenderId: import.meta.env.VITE_FB_SENDER_ID || '0',
  appId: import.meta.env.VITE_FB_APP_ID || 'demo-app',
};

// Use the emulator in dev mode unless explicitly turned off; never in production unless explicitly set.
export const USE_EMULATOR = import.meta.env.DEV
  ? import.meta.env.VITE_USE_EMULATOR !== 'false'
  : import.meta.env.VITE_USE_EMULATOR === 'true';

export const app = initializeApp(config);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);
export const functions = getFunctions(app, 'us-central1');

if (USE_EMULATOR) {
  // Guard against double-connect during Vite HMR.
  if (!globalThis.__FOUNDIT_EMULATOR__) {
    connectFirestoreEmulator(db, '127.0.0.1', 8080);
    connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
    connectStorageEmulator(storage, '127.0.0.1', 9199);
    connectFunctionsEmulator(functions, '127.0.0.1', 5001);
    globalThis.__FOUNDIT_EMULATOR__ = true;
    // eslint-disable-next-line no-console
    console.info('[FoundIt] Connected to Firebase emulators.');
  }
}
