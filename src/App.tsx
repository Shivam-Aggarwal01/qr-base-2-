import { useEffect, useState } from 'react';
import { onAuthStateChanged, signOut, type User as FirebaseUser } from 'firebase/auth';
import { auth, functions } from './firebase';
import { httpsCallable } from 'firebase/functions';
import { InventoryStorage, parseQRCodeFromEntities } from './services/storage';
import {
  COLLECTIONS,
  completeGoogleRedirect,
  deleteFirestoreDocument,
  ensureUserProfile,
  getUserProfile,
  reviewAccountRequest,
  submitAccountRequest,
  STUDENT_SIGNUP_NAME_KEY,
  updateFirestoreDocument,
} from './services/firebaseInventory';
import { readFirestoreState } from './services/firebaseCollections';
import { isStudent } from './services/authRoles';
import { FirebaseAuthPanel } from './components/FirebaseAuthPanel';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { DashboardView } from './components/DashboardView';
import { CatalogView } from './components/CatalogView';
import { AssetsView } from './components/AssetsView';
import { RequestsView } from './components/RequestsView';
import { LocationsView } from './components/LocationsView';
import { ActivityView } from './components/ActivityView';
import { UsersView } from './components/UsersView';
import { BatchQRLabelsModal } from './components/BatchQRLabelsModal';
import { QRScannerModal } from './components/QRScannerModal';
import { QRGeneratorModal } from './components/QRGeneratorModal';
import { QuickActionModal } from './components/QuickActionModal';
import { NewRequestModal } from './components/NewRequestModal';
import { StudentInventoryView } from './components/StudentInventoryView';
import {
  User,
  CatalogItem,
  Location,
  StockLevel,
  Asset,
  AssetAssignment,
  Request,
  InventoryTransaction,
  ViewMode,
  AccountRequest,
  AccountRequestStatus,
  RequestLineDraft,
} from './types/inventory';

type QRResult = ReturnType<typeof parseQRCodeFromEntities>;
type AccessNotice = {
  status: AccountRequestStatus;
  name?: string;
  email?: string;
};
type QRGeneratorData = {
  isOpen: boolean;
  code: string;
  title: string;
  subtitle?: string;
};
type QuickActionData = {
  isOpen: boolean;
  qrResult: QRResult | null;
};

export default function App() {
  // ---------------------------------------------------------------------------
  // Application data
  // ---------------------------------------------------------------------------
  const [users, setUsers] = useState<User[]>([]);
  const [accountRequests, setAccountRequests] = useState<AccountRequest[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [catalogItems, setCatalogItems] = useState<CatalogItem[]>([]);
  const [stockLevels, setStockLevels] = useState<StockLevel[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [, setAssignments] = useState<AssetAssignment[]>([]);
  const [requests, setRequests] = useState<Request[]>([]);
  const [transactions, setTransactions] = useState<InventoryTransaction[]>([]);

  // ---------------------------------------------------------------------------
  // Authentication
  // ---------------------------------------------------------------------------
  const [activeUser, setActiveUser] = useState<User | null>(null);
  const [firebaseUserProfile, setFirebaseUserProfile] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [accessNotice, setAccessNotice] = useState<AccessNotice | null>(null);
  const [authRole, setAuthRole] = useState<User['role'] | undefined>();

  // ---------------------------------------------------------------------------
  // Navigation and modals
  // ---------------------------------------------------------------------------
  const [currentView, setCurrentView] = useState<ViewMode>('dashboard');
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isNewRequestOpen, setIsNewRequestOpen] = useState(false);
  const [newRequestPrefillItems, setNewRequestPrefillItems] = useState<RequestLineDraft[]>([]);
  const [qrGenData, setQrGenData] = useState<QRGeneratorData>({
    isOpen: false,
    code: '',
    title: '',
  });
  const [quickActionData, setQuickActionData] = useState<QuickActionData>({
    isOpen: false,
    qrResult: null,
  });

  // ---------------------------------------------------------------------------
  // Derived state
  // ---------------------------------------------------------------------------
  const currentUser = firebaseUserProfile ?? activeUser;
  // The Firebase Auth custom claim is the source of truth for authorization.
  const effectiveRole = authRole ?? currentUser?.role;
  const isStudentUser = isStudent(effectiveRole);
  const pendingAccountCount = accountRequests.filter((request) => request.status === 'PENDING').length;
  const pendingRequestsCount = isStudentUser
    ? requests.filter(
        (request) =>
          (request.status === 'PENDING' || request.status === 'APPROVED') && request.user_id === currentUser?.id
      ).length
    : requests.filter((request) => request.status === 'PENDING' || request.status === 'APPROVED').length;

  // ---------------------------------------------------------------------------
  // Firestore data
  // ---------------------------------------------------------------------------
  const loadFirestoreData = async () => {
    const state = await readFirestoreState();
    setCatalogItems(state.catalogItems ?? []);
    setLocations(state.locations ?? []);
    setStockLevels(state.stockLevels ?? []);
    setAssets(state.assets ?? []);
    setAssignments(state.assignments ?? []);
    setRequests(state.requests ?? []);
    setTransactions(state.transactions ?? []);
    setUsers(state.users ?? []);
    setAccountRequests(state.accountRequests ?? []);
  };
  const refreshAllData = async () => {
    if (!auth.currentUser) {
      return;
    }
    try {
      await loadFirestoreData();
    } catch (error) {
      console.warn('Could not refresh Firestore data:', error);
    }
  };

  // ---------------------------------------------------------------------------
  // Authentication
  // ---------------------------------------------------------------------------
  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    const applyFirebaseSession = async (firebaseUser: FirebaseUser | null) => {
      if (!firebaseUser) {
        setFirebaseUserProfile(null);
        setActiveUser(null);
        setAuthRole(undefined);
        return;
      }
      try {
        /*
         * Custom claims are the authorization source of truth.
         * Firestore user documents remain profile data only.
         */
        const tokenResult = await firebaseUser.getIdTokenResult();
        const role = tokenResult.claims.role as User['role'] | undefined;
        setAuthRole(role);
        const existingProfile = await getUserProfile(firebaseUser.uid);
        if (role === 'ADMIN') {
          window.sessionStorage.removeItem(STUDENT_SIGNUP_NAME_KEY);
          const profile = existingProfile ?? (await ensureUserProfile(firebaseUser, 'ADMIN'));
          const adminProfile: User = {
            ...profile,
            email: firebaseUser.email ?? profile.email,
            role: 'ADMIN',
          };
          setAccessNotice(null);
          setFirebaseUserProfile(adminProfile);
          setActiveUser(adminProfile);
          await refreshAllData();
          return;
        }
        if (existingProfile) {
          window.sessionStorage.removeItem(STUDENT_SIGNUP_NAME_KEY);
          setAccessNotice(null);
          setFirebaseUserProfile(existingProfile);
          setActiveUser(existingProfile);
          await refreshAllData();
          return;
        }
        /*
         * A newly authenticated student does not receive a profile
         * until their account request is approved.
         */
        const requestedName = window.sessionStorage.getItem(STUDENT_SIGNUP_NAME_KEY);
        const accessRequest = await submitAccountRequest(firebaseUser, requestedName ?? undefined);
        window.sessionStorage.removeItem(STUDENT_SIGNUP_NAME_KEY);
        if (accessRequest.status === 'APPROVED') {
          const profile = await ensureUserProfile(firebaseUser, 'STUDENT', requestedName ?? undefined);
          setAccessNotice(null);
          setFirebaseUserProfile(profile);
          setActiveUser(profile);
          await refreshAllData();
          return;
        }
        setAccessNotice({
          status: accessRequest.status,
          name: accessRequest.name,
          email: accessRequest.email,
        });
        setFirebaseUserProfile(null);
        setActiveUser(null);
        await signOut(auth);
      } catch (error) {
        console.error('Failed to initialise Firebase user:', error);
        setFirebaseUserProfile(null);
        setActiveUser(null);
        setAuthRole(undefined);
        try {
          await signOut(auth);
        } catch {
          // The session may already be signed out.
        }
      }
    };

    const initialiseAuth = async () => {
      try {
        await completeGoogleRedirect();
      } catch (error) {
        console.warn('Google redirect sign-in did not complete:', error);
      }
      try {
        await auth.authStateReady();
      } catch (error) {
        console.warn('Firebase auth persistence was not ready:', error);
      }
      await applyFirebaseSession(auth.currentUser);
      setAuthReady(true);
      unsubscribe = onAuthStateChanged(auth, (firebaseUser: FirebaseUser | null) => {
        void applyFirebaseSession(firebaseUser);
      });
    };
    void initialiseAuth();

    return () => {
      unsubscribe?.();
    };
  }, []);

  // ---------------------------------------------------------------------------
  // Navigation
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (isStudentUser && currentView !== 'dashboard' && currentView !== 'requests' && currentView !== 'inventory') {
      setCurrentView('requests');
    }
  }, [isStudentUser, currentView]);

  // ---------------------------------------------------------------------------
  // User actions
  // ---------------------------------------------------------------------------
  const handleUserChange = (user: User) => {
    // Firebase-authenticated users cannot switch identity from the UI.
    if (auth.currentUser) {
      return;
    }
    const newActiveUser = InventoryStorage.setActiveUser(user.id);
    setActiveUser(newActiveUser);
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setFirebaseUserProfile(null);
      setActiveUser(null);
      setAuthRole(undefined);
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const handleResetData = () => {
    const confirmed = window.confirm('Reset all electronics lab data back to initial seed state?');
    if (!confirmed) {
      return;
    }
    InventoryStorage.resetAllData();
    void refreshAllData();
  };

  // ---------------------------------------------------------------------------
  // QR and request actions
  // ---------------------------------------------------------------------------
  const handleOpenQRGenerator = (code: string, title: string, subtitle?: string) => {
    setQrGenData({
      isOpen: true,
      code,
      title,
      subtitle,
    });
  };

  const openNewRequest = (items: RequestLineDraft[] = []) => {
    setNewRequestPrefillItems(items);
    setIsNewRequestOpen(true);
  };

  const handleScanResult = (code: string) => {
    const result = parseQRCodeFromEntities(code, {
      assets,
      catalog: catalogItems,
      locations,
      requests,
      users,
    });
    setQuickActionData({
      isOpen: true,
      qrResult: result,
    });
  };

  const handleGlobalSearch = (query: string) => {
    const searchQuery = query.trim();
    if (!searchQuery) {
      return;
    }
    const result = parseQRCodeFromEntities(searchQuery, {
      assets,
      catalog: catalogItems,
      locations,
      requests,
      users,
    });
    if (result.type !== 'unknown') {
      setQuickActionData({
        isOpen: true,
        qrResult: result,
      });
      return;
    }
    if (!isStudentUser) {
      setCurrentView('inventory');
    }
  };

  // ---------------------------------------------------------------------------
  // User management
  // ---------------------------------------------------------------------------
  const handleUpdateUserRole = async (userId: string, newRole: User['role']) => {
    try {
      const updateUserRoleFn = httpsCallable(functions, 'updateUserRole');
      await updateUserRoleFn({ userId, newRole });
      await refreshAllData();
    } catch (error) {
      console.error('Failed to update user role:', error);
      window.alert('Failed to update user role.');
    }
  };

  const handleDeleteUser = async (userId: string) => {
    try {
      if (currentUser?.id === userId) {
        throw new Error('You cannot delete your own account.');
      }
      const targetUser = users.find((user) => user.id === userId);
      if (targetUser?.role === 'ADMIN') {
        throw new Error('Admin accounts cannot be removed from the directory.');
      }
      await deleteFirestoreDocument(COLLECTIONS.USERS, userId);
      setUsers((previousUsers) => previousUsers.filter((user) => user.id !== userId));
      await refreshAllData();
    } catch (error) {
      console.error('Failed to delete user:', error);
      const errorCode = typeof error === 'object' && error !== null && 'code' in error ? String(error.code) : '';
      const errorMessage = error instanceof Error ? error.message : String(error);
      const permissionDenied = errorCode === 'permission-denied' || errorMessage.includes('permission-denied');
      window.alert(
        permissionDenied
          ? 'Permission denied. Publish the latest Firestore rules and make sure your account has the required role.'
          : errorMessage || 'Failed to delete user.'
      );
      throw error;
    }
  };

  const handleReviewAccountRequest = async (requestId: string, status: 'APPROVED' | 'REJECTED') => {
    if (!currentUser) {
      return;
    }
    await reviewAccountRequest(requestId, status, currentUser);
    await refreshAllData();
  };

  // ---------------------------------------------------------------------------
  // Authentication screens
  // ---------------------------------------------------------------------------
  if (!authReady) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-6">
        <p className="text-sm font-medium text-slate-500">Restoring session…</p>
      </div>
    );
  }
  if (!currentUser) {
    return <FirebaseAuthPanel accessNotice={accessNotice} />;
  }

  // ---------------------------------------------------------------------------
  // Application
  // ---------------------------------------------------------------------------
  return (
    <div className="flex flex-col h-screen w-screen bg-[#f8fafc] text-slate-900 font-sans overflow-hidden antialiased select-none">
      <Navbar
        activeUser={currentUser}
        users={users}
        onUserChange={handleUserChange}
        lockIdentity={Boolean(auth.currentUser)}
        onOpenScanner={() => setIsScannerOpen(true)}
        onOpenNewRequest={() => openNewRequest()}
        onSearch={handleGlobalSearch}
        onResetData={handleResetData}
        onLogout={handleLogout}
      />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar
          currentView={currentView}
          onSelectView={setCurrentView}
          pendingRequestsCount={pendingRequestsCount}
          pendingAccountCount={pendingAccountCount}
          userRole={effectiveRole ?? currentUser.role}
        />
        <main className="flex-1 flex flex-col overflow-hidden relative">
          {currentView === 'dashboard' && (
            <DashboardView
              assets={assets}
              catalogItems={catalogItems}
              locations={locations}
              requests={requests}
              transactions={transactions}
              users={users}
              stockLevels={stockLevels}
              currentUser={currentUser}
              onSelectView={setCurrentView}
              onOpenQRGenerator={handleOpenQRGenerator}
              onRefreshData={refreshAllData}
              onOpenNewRequest={() => openNewRequest()}
            />
          )}
          {currentView === 'inventory' &&
            (isStudentUser ? (
              <StudentInventoryView
                catalogItems={catalogItems}
                stockLevels={stockLevels}
                assets={assets}
                locations={locations}
                users={users}
                requests={requests}
                currentUser={currentUser}
                onOpenNewRequest={() => openNewRequest()}
              />
            ) : (
              <CatalogView
                catalogItems={catalogItems}
                stockLevels={stockLevels}
                locations={locations}
                assets={assets}
                userRole={effectiveRole ?? currentUser.role}
                onOpenQRGenerator={handleOpenQRGenerator}
                onRefreshData={refreshAllData}
              />
            ))}
          {currentView === 'assets' && (
            <AssetsView
              assets={assets}
              catalogItems={catalogItems}
              locations={locations}
              users={users}
              onRefreshData={refreshAllData}
              onOpenQRGenerator={handleOpenQRGenerator}
            />
          )}
          {currentView === 'requests' && (
            <RequestsView
              requests={requests}
              catalogItems={catalogItems}
              assets={assets}
              locations={locations}
              users={users}
              activeUser={currentUser}
              onOpenNewRequest={() => openNewRequest()}
              onRefreshData={refreshAllData}
            />
          )}
          {currentView === 'locations' && (
            <LocationsView
              locations={locations}
              catalogItems={catalogItems}
              assets={assets}
              stockLevels={stockLevels}
              onOpenQRGenerator={handleOpenQRGenerator}
              onRefreshData={refreshAllData}
            />
          )}
          {currentView === 'activity' && (
            <ActivityView
              transactions={transactions}
              catalogItems={catalogItems}
              assets={assets}
              locations={locations}
              users={users}
              onOpenQRGenerator={handleOpenQRGenerator}
            />
          )}
          {currentView === 'qr-sheet' && (
            <BatchQRLabelsModal assets={assets} catalogItems={catalogItems} locations={locations} />
          )}
          {currentView === 'users' && (
            <UsersView
              users={users}
              assets={assets}
              catalogItems={catalogItems}
              requests={requests}
              activeUser={currentUser}
              userRole={currentUser?.role}
              onUpdateUserRole={handleUpdateUserRole}
              onDeleteUser={handleDeleteUser}
              accountRequests={accountRequests}
              onReviewAccountRequest={handleReviewAccountRequest}
              onRefreshData={refreshAllData}
            />
          )}
        </main>
      </div>
      {/* Global modals */}
      <QRScannerModal isOpen={isScannerOpen} onClose={() => setIsScannerOpen(false)} onScanResult={handleScanResult} />
      <QRGeneratorModal
        isOpen={qrGenData.isOpen}
        onClose={() =>
          setQrGenData((previous) => ({
            ...previous,
            isOpen: false,
          }))
        }
        code={qrGenData.code}
        title={qrGenData.title}
        subtitle={qrGenData.subtitle}
      />
      <QuickActionModal
        isOpen={quickActionData.isOpen}
        onClose={() =>
          setQuickActionData((previous) => ({
            ...previous,
            isOpen: false,
          }))
        }
        qrData={quickActionData.qrResult}
        users={users}
        locations={locations}
        catalogItems={catalogItems}
        stockLevels={stockLevels}
        assets={assets}
        requests={requests}
        activeUser={currentUser}
        onOpenNewRequest={openNewRequest}
        onRefreshData={refreshAllData}
        onOpenQRGenerator={handleOpenQRGenerator}
      />
      <NewRequestModal
        isOpen={isNewRequestOpen}
        onClose={() => setIsNewRequestOpen(false)}
        activeUser={currentUser}
        catalogItems={catalogItems}
        assets={assets}
        initialItems={newRequestPrefillItems.length > 0 ? newRequestPrefillItems : undefined}
        onRefreshData={refreshAllData}
      />
    </div>
  );
}
