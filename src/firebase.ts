import { initializeApp } from 'firebase/app';
import { getAnalytics } from 'firebase/analytics';
import { getFirestore } from 'firebase/firestore';
import { getFunctions } from 'firebase/functions';
import { browserLocalPersistence, browserPopupRedirectResolver, getAuth, initializeAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: 'AIzaSyDvZc4N7LpYXsTtZZu9xQNzp8mJcXHWS6s',
  authDomain: 'inventory-management-sys-564f5.firebaseapp.com',
  projectId: 'inventory-management-sys-564f5',
  storageBucket: 'inventory-management-sys-564f5.firebasestorage.app',
  messagingSenderId: '86746785859',
  appId: '1:86746785859:web:bf0d01b3d6cb196f898cf6',
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
export default app;
