import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc
} from 'firebase/firestore';
import { db } from '../firebase';
import type {
  Asset,
  AssetAssignment,
  CatalogItem,
  InventoryTransaction,
  Location,
  Request,
  StockLevel,
  User
} from '../types/inventory';

const collectionName = {
  users: 'users',
  catalogItems: 'catalog_items',
  locations: 'locations',
  stockLevels: 'stock_levels',
  assets: 'assets',
  assetAssignments: 'asset_assignments',
  requests: 'requests',
  requestItems: 'request_items',
  inventoryTransactions: 'inventory_transactions',
  auditLogs: 'audit_logs'
} as const;

export const firebaseCollections = collectionName;

export async function getCollection<T>(name: string): Promise<T[]> {
  try {
    const q = query(collection(db, name), orderBy('created_at', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((document) => ({
      id: document.id,
      ...(document.data() as T)
    })) as T[];
  } catch (error) {
    console.warn(`Firestore read failed for ${name}:`, error);
    return [];
  }
}

export async function getUserProfileFromFirestore(uid: string): Promise<User | null> {
  try {
    const snapshot = await getDoc(doc(db, 'users', uid));
    if (!snapshot.exists()) return null;
    return {
      id: snapshot.id,
      ...(snapshot.data() as Omit<User, 'id'>)
    };
  } catch (error) {
    console.warn('Failed to read user profile from Firestore:', error);
    return null;
  }
}

export async function saveUserProfileToFirestore(user: User): Promise<void> {
  await setDoc(doc(db, 'users', user.id), {
    ...user,
    updated_at: new Date().toISOString(),
    created_at: user.created_at || new Date().toISOString()
  });
}

export async function createCatalogItemFirestore(payload: Omit<CatalogItem, 'id' | 'created_at' | 'updated_at'>): Promise<CatalogItem> {
  const now = new Date().toISOString();
  const docRef = await addDoc(collection(db, 'catalog_items'), {
    ...payload,
    created_at: serverTimestamp(),
    updated_at: serverTimestamp()
  });

  return {
    id: docRef.id,
    ...payload,
    created_at: now,
    updated_at: now
  };
}

export async function createLocationFirestore(payload: Omit<Location, 'id' | 'created_at' | 'updated_at'>): Promise<Location> {
  const now = new Date().toISOString();
  const docRef = await addDoc(collection(db, 'locations'), {
    ...payload,
    created_at: serverTimestamp(),
    updated_at: serverTimestamp()
  });

  return {
    id: docRef.id,
    ...payload,
    created_at: now,
    updated_at: now
  };
}

export async function createAssetFirestore(payload: Omit<Asset, 'id' | 'created_at' | 'updated_at'>): Promise<Asset> {
  const now = new Date().toISOString();
  const docRef = await addDoc(collection(db, 'assets'), {
    ...payload,
    created_at: serverTimestamp(),
    updated_at: serverTimestamp()
  });

  return {
    id: docRef.id,
    ...payload,
    created_at: now,
    updated_at: now
  };
}

export async function createRequestFirestore(payload: Omit<Request, 'id' | 'created_at' | 'updated_at' | 'items'> & { items?: any[] }): Promise<Request> {
  const now = new Date().toISOString();
  const docRef = await addDoc(collection(db, 'requests'), {
    ...payload,
    items: payload.items || [],
    created_at: serverTimestamp(),
    updated_at: serverTimestamp()
  });

  return {
    id: docRef.id,
    ...payload,
    items: payload.items || [],
    created_at: now,
    updated_at: now
  };
}

export async function createInventoryTransactionFirestore(payload: Omit<InventoryTransaction, 'id' | 'created_at'>): Promise<InventoryTransaction> {
  const now = new Date().toISOString();
  const docRef = await addDoc(collection(db, 'inventory_transactions'), {
    ...payload,
    created_at: serverTimestamp()
  });

  return {
    id: docRef.id,
    ...payload,
    created_at: now
  };
}

export async function createAuditLogFirestore(payload: {
  user_id?: string | null;
  action: string;
  entity_type: string;
  entity_id: string;
  created_at?: string;
}): Promise<void> {
  await addDoc(collection(db, 'audit_logs'), {
    ...payload,
    created_at: payload.created_at || new Date().toISOString()
  });
}

export async function updateDocument<T>(collectionName: string, documentId: string, updates: Partial<T>): Promise<void> {
  const ref = doc(db, collectionName, documentId);
  await updateDoc(ref, {
    ...updates,
    updated_at: new Date().toISOString()
  });
}

export async function readFirestoreState() {
  const [catalogItems, locations, stockLevels, assets, assignments, requests, transactions, users] = await Promise.all([
    getCollection<CatalogItem>('catalog_items'),
    getCollection<Location>('locations'),
    getCollection<StockLevel>('stock_levels'),
    getCollection<Asset>('assets'),
    getCollection<AssetAssignment>('asset_assignments'),
    getCollection<Request>('requests'),
    getCollection<InventoryTransaction>('inventory_transactions'),
    getCollection<User>('users')
  ]);

  return {
    catalogItems,
    locations,
    stockLevels,
    assets,
    assignments,
    requests,
    transactions,
    users
  };
}
