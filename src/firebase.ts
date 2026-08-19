import { initializeApp } from 'firebase/app';
import { getAnalytics } from 'firebase/analytics';
import { getFirestore } from 'firebase/firestore';
import {
  browserLocalPersistence,
  browserPopupRedirectResolver,
  initializeAuth
} from 'firebase/auth';

const firebaseConfig = {
  apiKey: 'AIzaSyBGtsHb0kh8JFZ5O0JGaNtlNn0djRYuWYE',
  authDomain: 'inventory-management-sys-aab7d.firebaseapp.com',
  projectId: 'inventory-management-sys-aab7d',
  storageBucket: 'inventory-management-sys-aab7d.firebasestorage.app',
  messagingSenderId: '231677064197',
  appId: '1:231677064197:web:83084680699546cfe7d86c',
  measurementId: 'G-GG57BH5933'
};

const app = initializeApp(firebaseConfig);

export const analytics = getAnalytics(app);
export const auth = initializeAuth(app, {
  persistence: browserLocalPersistence,
  popupRedirectResolver: browserPopupRedirectResolver
});
export const db = getFirestore(app);

export default app;
