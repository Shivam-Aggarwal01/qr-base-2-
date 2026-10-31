import { initializeApp } from 'firebase/app';
import { getAnalytics } from 'firebase/analytics';
import { getFirestore } from 'firebase/firestore';
import { getFunctions } from 'firebase/functions';
import { getStorage } from 'firebase/storage';
import { browserLocalPersistence, browserPopupRedirectResolver, getAuth, initializeAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyCKpJFJxjquHF9Om6rE3I0FQLz4-0sCkE4',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'qr-based-2.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'qr-based-2',
  storageBucket:
    import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'qr-based-2.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '992338317616',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:992338317616:web:084910f62498bd9ade78f5',
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || 'G-MHN3L5CQQW',
};

const app = initializeApp(firebaseConfig);

export const analytics = (() => {
  try {
    return getAnalytics(app);
  } catch {
    return undefined;
  }
})();

export const auth = (() => {
  try {
    return initializeAuth(app, {
      persistence: [browserLocalPersistence],
      popupRedirectResolver: browserPopupRedirectResolver,
    });
  } catch {
    return getAuth(app);
  }
})();
export const db = getFirestore(app);
export const functions = getFunctions(app);
export const storage = getStorage(app);
export default app;
