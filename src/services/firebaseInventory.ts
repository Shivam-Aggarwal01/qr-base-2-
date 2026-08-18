import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  signOut,
  type User as FirebaseUser
} from 'firebase/auth';
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  setDoc,
  updateDoc
} from 'firebase/firestore';
import { auth, db } from '../firebase';
import type { User, UserRole } from '../types/inventory';
import { resolveRoleFromEmail } from './roleConfig';

export const COLLECTIONS = {
  USERS: 'users',
  CATALOG_ITEMS: 'catalog_items',
  LOCATIONS: 'locations',
  STOCK_LEVELS: 'stock_levels',
  ASSETS: 'assets',
  ASSET_ASSIGNMENTS: 'asset_assignments',
  REQUESTS: 'requests',
  REQUEST_ITEMS: 'request_items',
  INVENTORY_TRANSACTIONS: 'inventory_transactions',
  AUDIT_LOGS: 'audit_logs'
} as const;

export type FirebaseUserProfile = User;

export function mapFirebaseUserToLabUser(
  firebaseUser: FirebaseUser,
  role: UserRole = 'STUDENT'
): User {
  const email = firebaseUser.email ?? 'lab-user@local.demo';
  const resolvedRole = resolveRoleFromEmail(email) || role;
  const baseName = firebaseUser.displayName ?? email.split('@')[0] ?? 'Lab User';

  return {
    id: firebaseUser.uid,
    user_code: `STU-${Date.now().toString().slice(-6)}`,
    name: baseName,
    email,
    role: resolvedRole,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
}

export async function getUserProfile(uid: string): Promise<User | null> {
  const userRef = doc(db, COLLECTIONS.USERS, uid);
  const snapshot = await getDoc(userRef);

  if (!snapshot.exists()) return null;

  const current = snapshot.data() as User;
  const email = current.email ?? '';
  const resolvedRole = resolveRoleFromEmail(email) || current.role || 'STUDENT';
  const normalizedProfile: User = {
    id: snapshot.id,
    ...current,
    email,
    role: resolvedRole,
    updated_at: new Date().toISOString()
  };

  if (current.role !== resolvedRole || current.email !== email) {
    await setDoc(userRef, {
      ...normalizedProfile,
      updated_at: serverTimestamp()
    }, { merge: true });
  }

  return normalizedProfile;
}

export async function ensureUserProfile(
  firebaseUser: FirebaseUser,
  role: UserRole = 'STUDENT'
): Promise<User> {
  const userRef = doc(db, COLLECTIONS.USERS, firebaseUser.uid);
  const snapshot = await getDoc(userRef);
  const email = firebaseUser.email ?? 'lab-user@local.demo';
  const resolvedRole = resolveRoleFromEmail(email) || role;

  if (snapshot.exists()) {
    const current = snapshot.data() as User;
    const finalRole = resolveRoleFromEmail(current.email ?? email) || current.role || resolvedRole;
    const normalizedProfile: User = {
      id: snapshot.id,
      ...current,
      email: current.email ?? email,
      role: finalRole,
      updated_at: new Date().toISOString()
    };

    if (current.role !== finalRole || current.email !== normalizedProfile.email) {
      await setDoc(userRef, {
        ...normalizedProfile,
        updated_at: serverTimestamp()
      }, { merge: true });
    }

    return normalizedProfile;
  }

  const profile = mapFirebaseUserToLabUser(firebaseUser, resolvedRole);
  await setDoc(userRef, {
    ...profile,
    created_at: serverTimestamp(),
    updated_at: serverTimestamp()
  });

  return profile;
}

export async function createFirebaseAccount(
  email: string,
  password: string,
  role: UserRole,
  displayName?: string
): Promise<User> {
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  const user = userCredential.user;
  const resolvedRole = resolveRoleFromEmail(email) || role;

  const baseProfile = mapFirebaseUserToLabUser(user, resolvedRole);
  const profile: User = {
    ...baseProfile,
    name: displayName || baseProfile.name,
    user_code: `LAB-${Math.random().toString(36).slice(2, 8).toUpperCase()}`
  };

  await setDoc(doc(db, COLLECTIONS.USERS, user.uid), {
    ...profile,
    created_at: serverTimestamp(),
    updated_at: serverTimestamp()
  });

  return profile;
}

export async function loginToFirebase(email: string, password: string): Promise<User> {
  const userCredential = await signInWithEmailAndPassword(auth, email, password);
  const firebaseUser = userCredential.user;

  const profile = await ensureUserProfile(firebaseUser, 'STUDENT');
  return profile;
}

export async function loginWithGoogle(): Promise<User | null> {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({
    prompt: 'select_account'
  });

  try {
    const result = await signInWithPopup(auth, provider);
    const profile = await ensureUserProfile(result.user, 'STUDENT');
    return profile;
  } catch (error: any) {
    const isPopupBlocked = error?.code === 'auth/popup-blocked'
      || error?.code === 'auth/cancelled-popup-request'
      || error?.code === 'auth/popup-closed-by-user';

    if (isPopupBlocked) {
      await signInWithRedirect(auth, provider);
      return null;
    }

    throw error;
  }
}

export async function logoutFromFirebase(): Promise<void> {
  await signOut(auth);
}

export async function listCollection<T>(collectionName: string): Promise<T[]> {
  const snapshot = await getDocs(collection(db, collectionName));
  return snapshot.docs.map((docSnap) => ({
    id: docSnap.id,
    ...docSnap.data()
  })) as T[];
}

export async function createCatalogItemInFirestore(
  payload: {
    item_code: string;
    name: string;
    type: 'CONSUMABLE' | 'REUSABLE' | 'TOOL';
    description?: string;
    unit?: string;
    tracking_mode?: 'BOX' | 'INDIVIDUAL';
    min_stock_alert?: number;
    storage_place?: string | null;
  }
): Promise<void> {
  try {
    console.log('🔐 Current auth:', {
      uid: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified
    });

    const docRef = await addDoc(collection(db, COLLECTIONS.CATALOG_ITEMS), {
      id: '',
      ...payload,
      description: payload.description ?? '',
      unit: payload.unit ?? 'pcs',
      tracking_mode: payload.tracking_mode ?? null,
      min_stock_alert: payload.min_stock_alert ?? 10,
      storage_place: payload.storage_place ?? null,
      created_at: serverTimestamp(),
      updated_at: serverTimestamp()
    });

    console.log('✅ Document created with ID:', docRef.id);

    await updateDoc(doc(db, COLLECTIONS.CATALOG_ITEMS, docRef.id), {
      id: docRef.id
    });

    console.log('✅ Document ID field updated');
  } catch (error: any) {
    console.error('❌ Firestore error details:', {
      code: error?.code,
      message: error?.message,
      fullError: error
    });
    throw error;
  }
}

export async function createLocationInFirestore(payload: { name: string; code?: string }): Promise<void> {
  await addDoc(collection(db, COLLECTIONS.LOCATIONS), {
    id: '',
    name: payload.name,
    code: payload.code ?? '',
    created_at: serverTimestamp(),
    updated_at: serverTimestamp()
  });
}

export async function createAssetInFirestore(payload: {
  asset_code: string;
  catalog_item_id: string;
  serial_number?: string;
  status?: string;
  location_id?: string | null;
  assigned_to_user_id?: string | null;
  tracking_mode?: 'BOX' | 'INDIVIDUAL';
  is_box?: boolean;
  box_capacity?: number;
  available_in_box?: number;
  notes?: string;
}): Promise<void> {
  await addDoc(collection(db, COLLECTIONS.ASSETS), {
    id: '',
    ...payload,
    status: payload.status ?? 'AVAILABLE',
    location_id: payload.location_id ?? null,
    assigned_to_user_id: payload.assigned_to_user_id ?? null,
    tracking_mode: payload.tracking_mode ?? null,
    is_box: payload.is_box ?? false,
    box_capacity: payload.box_capacity ?? 1,
    available_in_box: payload.available_in_box ?? payload.box_capacity ?? 1,
    notes: payload.notes ?? '',
    created_at: serverTimestamp(),
    updated_at: serverTimestamp()
  });
}



export async function updateFirestoreDocument(
  collectionName: string,
  documentId: string,
  updates: Record<string, unknown>
): Promise<void> {
  const ref = doc(db, collectionName, documentId);
  await updateDoc(ref, {
    ...updates,
    updated_at: new Date().toISOString()
  });
}
