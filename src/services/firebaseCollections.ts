import {
  addDoc,
  writeBatch,
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  documentId,
} from 'firebase/firestore';
import type { DocumentData, Query, QueryDocumentSnapshot } from 'firebase/firestore';
import { auth, db } from '../firebase';
import type {
  Asset,
  AssetAssignment,
  CatalogItem,
  InventoryTransaction,
  Location,
  Request,
  StockLevel,
  User,
  AccountRequest,
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
  auditLogs: 'audit_logs',
} as const;

export const firebaseCollections = collectionName;

function requireSignedInUser(): void {
  if (!auth.currentUser) {
    throw new Error('Firestore access blocked: user is not signed in.');
  }
}

function getMs(val: any): number {
  if (!val) return 0;
  if (typeof val.toMillis === 'function') return val.toMillis();
  if (typeof val.toDate === 'function') return val.toDate().getTime();
  if (val.seconds !== undefined) return val.seconds * 1000;
  const time = new Date(val).getTime();
  return isNaN(time) ? 0 : time;
}

function tsToString(val: any): string {
  if (!val) return new Date().toISOString();
  if (typeof val === 'string') return val;
  if (typeof val.toDate === 'function') return val.toDate().toISOString();
  if (val.seconds !== undefined) return new Date(val.seconds * 1000).toISOString();
  return new Date().toISOString();
}

export async function getCollection<T>(name: string): Promise<T[]> {
  try {
    requireSignedInUser();

    let collectionRef: Query<DocumentData, DocumentData> = collection(db, name);
    if (name === 'requests' && auth.currentUser) {
      const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
      const userRole = userDoc.exists() ? (userDoc.data().role as string | undefined) : undefined;
      if (!userRole || userRole === 'STUDENT') {
        collectionRef = query(collectionRef, where('user_id', '==', auth.currentUser.uid));
      }
    }

    if (name === 'account_requests' && auth.currentUser) {
      const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
      const userRole = userDoc.exists() ? (userDoc.data().role as string | undefined) : undefined;
      if (!userRole || userRole === 'STUDENT') {
        collectionRef = query(collectionRef, where(documentId(), '==', auth.currentUser.uid));
      }
    }

    const snapshot = await getDocs(collectionRef);
    console.log(`📂 Firestore read ${name}: ${snapshot.size} docs`);

    const items = snapshot.docs.map((document: QueryDocumentSnapshot) => {
      const raw = document.data();

      // Normalize: trim whitespace from all keys (fixes keys like 'name ')
      const cleaned: Record<string, any> = {};
      for (const [key, value] of Object.entries(raw)) {
        cleaned[key.trim()] = value;
      }

      // Convert Firestore Timestamps to ISO strings
      if (cleaned.created_at) cleaned.created_at = tsToString(cleaned.created_at);
      if (cleaned.updated_at) cleaned.updated_at = tsToString(cleaned.updated_at);
      if (cleaned.assigned_at) cleaned.assigned_at = tsToString(cleaned.assigned_at);
      if (cleaned.returned_at) cleaned.returned_at = tsToString(cleaned.returned_at);

      return {
        ...cleaned,
        id: document.id, // Firestore doc ID MUST always win
      };
    }) as any[];

    items.sort((a, b) => {
      const timeA = getMs(a.created_at || a.assigned_at || a.updated_at);
      const timeB = getMs(b.created_at || b.assigned_at || b.updated_at);
      return timeB - timeA;
    });

    return items as T[];
  } catch (error) {
    console.warn(`Firestore read failed for ${name}:`, error);
    return [];
  }
}

export async function getUserProfileFromFirestore(uid: string): Promise<User | null> {
  try {
    requireSignedInUser();
    const snapshot = await getDoc(doc(db, 'users', uid));
    if (!snapshot.exists()) return null;
    return {
      id: snapshot.id,
      ...(snapshot.data() as Omit<User, 'id'>),
    };
  } catch (error) {
    console.warn('Failed to read user profile from Firestore:', error);
    return null;
  }
}

export async function saveUserProfileToFirestore(user: User): Promise<void> {
  requireSignedInUser();
  await setDoc(doc(db, 'users', user.id), {
    ...user,
    updated_at: new Date().toISOString(),
    created_at: user.created_at || new Date().toISOString(),
  });
}

export async function createCatalogItemFirestore(
  payload: Omit<CatalogItem, 'id' | 'created_at' | 'updated_at'>
): Promise<CatalogItem> {
  const now = new Date().toISOString();
  const docRef = await addDoc(collection(db, 'catalog_items'), {
    ...payload,
    created_at: serverTimestamp(),
    updated_at: serverTimestamp(),
  });

  return {
    id: docRef.id,
    ...payload,
    created_at: now,
    updated_at: now,
  };
}

export async function createLocationFirestore(
  payload: Omit<Location, 'id' | 'created_at' | 'updated_at'>
): Promise<Location> {
  const now = new Date().toISOString();
  const docRef = await addDoc(collection(db, 'locations'), {
    ...payload,
    created_at: serverTimestamp(),
    updated_at: serverTimestamp(),
  });

  return {
    id: docRef.id,
    ...payload,
    created_at: now,
    updated_at: now,
  };
}

export async function createAssetFirestore(payload: Omit<Asset, 'id' | 'created_at' | 'updated_at'>): Promise<Asset> {
  const now = new Date().toISOString();
  const docRef = await addDoc(collection(db, 'assets'), {
    ...payload,
    created_at: serverTimestamp(),
    updated_at: serverTimestamp(),
  });

  return {
    id: docRef.id,
    ...payload,
    created_at: now,
    updated_at: now,
  };
}

export async function createRequestFirestore(
  payload: Omit<Request, 'id' | 'created_at' | 'updated_at' | 'items'> & {
    items?: any[];
  }
): Promise<Request> {
  const now = new Date().toISOString();
  const docRef = await addDoc(collection(db, 'requests'), {
    ...payload,
    items: payload.items || [],
    created_at: serverTimestamp(),
    updated_at: serverTimestamp(),
  });

  return {
    id: docRef.id,
    ...payload,
    items: payload.items || [],
    created_at: now,
    updated_at: now,
  };
}

export async function createInventoryTransactionFirestore(
  payload: Omit<InventoryTransaction, 'id' | 'created_at'>
): Promise<InventoryTransaction> {
  const now = new Date().toISOString();
  const docRef = await addDoc(collection(db, 'inventory_transactions'), {
    ...payload,
    created_at: serverTimestamp(),
  });

  return {
    id: docRef.id,
    ...payload,
    created_at: now,
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
    created_at: payload.created_at || new Date().toISOString(),
  });
}

export async function updateDocument<T>(
  collectionName: string,
  documentId: string,
  updates: Partial<T>
): Promise<void> {
  requireSignedInUser();
  const ref = doc(db, collectionName, documentId);
  await updateDoc(ref, {
    ...updates,
    updated_at: new Date().toISOString(),
  });
}

export async function readFirestoreState() {
  if (!auth.currentUser) {
    return {
      catalogItems: [],
      locations: [],
      stockLevels: [],
      assets: [],
      assignments: [],
      requests: [],
      transactions: [],
      users: [],
      accountRequests: [],
    };
  }

  const [catalogItems, locations, stockLevels, assets, assignments, requests, transactions, users, accountRequests] =
    await Promise.all([
      getCollection<CatalogItem>('catalog_items'),
      getCollection<Location>('locations'),
      getCollection<StockLevel>('stock_levels'),
      getCollection<Asset>('assets'),
      getCollection<AssetAssignment>('asset_assignments'),
      getCollection<Request>('requests'),
      getCollection<InventoryTransaction>('inventory_transactions'),
      getCollection<User>('users'),
      getCollection<AccountRequest>('account_requests'),
    ]);

  return {
    catalogItems,
    locations,
    stockLevels,
    assets,
    assignments,
    requests,
    transactions,
    users,
    accountRequests,
  };
}

export async function createFirestoreDocument<T>(collectionName: string, data: T): Promise<string> {
  const payload = {
    ...data,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const docRef = await addDoc(collection(db, collectionName), payload as Record<string, unknown>);
  return docRef.id;
}

export async function receiveCatalogStock(
  catalogItemId: string,
  locationId: string,
  quantity: number,
  remarks: string
): Promise<void> {
  requireSignedInUser();

  const stocksQuery = query(
    collection(db, 'stock_levels'),
    where('catalog_item_id', '==', catalogItemId),
    where('location_id', '==', locationId)
  );
  const stockSnapshot = await getDocs(stocksQuery);
  const batch = writeBatch(db);
  const now = new Date().toISOString();

  if (stockSnapshot.empty) {
    const stockRef = doc(collection(db, 'stock_levels'));
    batch.set(stockRef, {
      catalog_item_id: catalogItemId,
      location_id: locationId,
      quantity,
      created_at: now,
      updated_at: now,
    });
  } else {
    const stockDoc = stockSnapshot.docs[0];
    batch.update(stockDoc.ref, {
      quantity: (stockDoc.data().quantity || 0) + quantity,
      updated_at: now,
    });
  }

  const transactionRef = doc(collection(db, 'inventory_transactions'));
  batch.set(transactionRef, {
    catalog_item_id: catalogItemId,
    transaction_type: 'RECEIVE',
    quantity,
    to_location_id: locationId,
    processed_by_user_id: auth.currentUser!.uid,
    remarks,
    created_at: now,
  });

  await batch.commit();
}
