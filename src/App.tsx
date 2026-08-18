import React, { useState, useEffect } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth } from './firebase';
import { InventoryStorage } from './services/storage';
import { ensureUserProfile, getUserProfile } from './services/firebaseInventory';
import { readFirestoreState } from './services/firebaseCollections';
import { FirebaseAuthPanel } from './components/FirebaseAuthPanel';
import { resolveRoleFromEmail } from './services/roleConfig';
import {
  User,
  CatalogItem,
  Location,
  StockLevel,
  Asset,
  AssetAssignment,
  Request,
  InventoryTransaction,
  ViewMode
} from './types/inventory';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { DashboardView } from './components/DashboardView';
import { CatalogView } from './components/CatalogView';
import { AssetsView } from './components/AssetsView';
import { RequestsView } from './components/RequestsView';
import { LocationsView } from './components/LocationsView';
import { ActivityView } from './components/ActivityView';
import { UsersView } from './components/UsersView';
import { isStudent } from './services/authRoles';
import { BatchQRLabelsModal } from './components/BatchQRLabelsModal';
import { QRScannerModal } from './components/QRScannerModal';
import { QRGeneratorModal } from './components/QRGeneratorModal';
import { QuickActionModal } from './components/QuickActionModal';
import { NewRequestModal } from './components/NewRequestModal';

export default function App() {
  const [users, setUsers] = useState<User[]>([]);
  const [activeUser, setActiveUser] = useState<User | null>(null);
  const [firebaseUserProfile, setFirebaseUserProfile] = useState<User | null>(null);
  const [locations, setLocations] = useState<Location[]>([]);
  const [catalogItems, setCatalogItems] = useState<CatalogItem[]>([]);
  const [stockLevels, setStockLevels] = useState<StockLevel[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [assignments, setAssignments] = useState<AssetAssignment[]>([]);
  const [requests, setRequests] = useState<Request[]>([]);
  const [transactions, setTransactions] = useState<InventoryTransaction[]>([]);

  // Navigation
  const [currentView, setCurrentView] = useState<ViewMode>('dashboard');

  // Modals
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isNewRequestOpen, setIsNewRequestOpen] = useState(false);

  // QR Generator Modal State
  const [qrGenData, setQrGenData] = useState<{
    isOpen: boolean;
    code: string;
    title: string;
    subtitle?: string;
  }>({
    isOpen: false,
    code: '',
    title: ''
  });

  // Quick Action Modal State
  const [quickActionData, setQuickActionData] = useState<{
    isOpen: boolean;
    qrResult: any;
  }>({
    isOpen: false,
    qrResult: null
  });

  // Load state from Storage
  const refreshAllData = async () => {
    console.log('🔄 Refreshing all data... currentUser:', auth.currentUser?.email);
    
    if (!auth.currentUser) {
      console.log('⚠️ No auth user, loading from local storage');
      const fallbackUsers = InventoryStorage.getUsers();
      setUsers(fallbackUsers);
      setActiveUser(fallbackUsers[0] ?? null);
      setLocations(InventoryStorage.getLocations());
      setCatalogItems(InventoryStorage.getCatalog());
      setStockLevels(InventoryStorage.getStockLevels());
      setAssets(InventoryStorage.getAssets());
      setAssignments(InventoryStorage.getAssignments());
      setRequests(InventoryStorage.getRequests());
      setTransactions(InventoryStorage.getTransactions());
      return;
    }

    try {
      const firestoreState = await readFirestoreState();
      
      console.log('📊 Firestore data loaded:', {
        catalogItems: firestoreState.catalogItems?.length || 0,
        locations: firestoreState.locations?.length || 0,
        stockLevels: firestoreState.stockLevels?.length || 0,
        assets: firestoreState.assets?.length || 0,
        requests: firestoreState.requests?.length || 0,
        transactions: firestoreState.transactions?.length || 0,
        users: firestoreState.users?.length || 0,
      });

      // Use Firestore data directly — it is the source of truth
      setCatalogItems(firestoreState.catalogItems || []);
      setLocations(firestoreState.locations || []);
      setStockLevels(firestoreState.stockLevels || []);
      setAssets(firestoreState.assets || []);
      setAssignments(firestoreState.assignments || []);
      setRequests(firestoreState.requests || []);
      setTransactions(firestoreState.transactions || []);
      setUsers(firestoreState.users || []);
    } catch (error) {
      console.error('❌ Firebase state unavailable, using local fallback state.', error);
      const fallbackUsers = InventoryStorage.getUsers();
      setUsers(fallbackUsers);
      setActiveUser(fallbackUsers[0] ?? null);
      setLocations(InventoryStorage.getLocations());
      setCatalogItems(InventoryStorage.getCatalog());
      setStockLevels(InventoryStorage.getStockLevels());
      setAssets(InventoryStorage.getAssets());
      setAssignments(InventoryStorage.getAssignments());
      setRequests(InventoryStorage.getRequests());
      setTransactions(InventoryStorage.getTransactions());
    }
  };

  useEffect(() => {
    refreshAllData();
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const existingProfile = await getUserProfile(firebaseUser.uid);
        if (existingProfile) {
          setFirebaseUserProfile(existingProfile);
          setActiveUser(existingProfile);
          await refreshAllData();
          return;
        }

        const fallbackRole = resolveRoleFromEmail(firebaseUser.email ?? '') || 'STUDENT';
        const fallbackProfile = await ensureUserProfile(firebaseUser, fallbackRole);
        setFirebaseUserProfile(fallbackProfile);
        setActiveUser(fallbackProfile);
        await refreshAllData();
        return;
      }

      setFirebaseUserProfile(null);
      setActiveUser(null);
      await refreshAllData();
    });

    return () => unsubscribe();
  }, []);

  const handleUserChange = (u: User) => {
    const newActive = InventoryStorage.setActiveUser(u.id);
    setActiveUser(newActive);
    setFirebaseUserProfile(null);
  };

  const handleResetData = () => {
    if (confirm('Reset all electronics lab data back to initial seed state?')) {
      InventoryStorage.resetAllData();
      refreshAllData();
    }
  };

  const handleOpenQRGenerator = (code: string, title: string, subtitle?: string) => {
    setQrGenData({
      isOpen: true,
      code,
      title,
      subtitle
    });
  };

  const handleScanResult = (code: string) => {
    const parsed = InventoryStorage.parseQRCode(code);
    setQuickActionData({
      isOpen: true,
      qrResult: parsed
    });
  };

  const handleGlobalSearch = (query: string) => {
    if (!query.trim()) return;
    // Check if query directly matches a QR code
    const parsed = InventoryStorage.parseQRCode(query);
    if (parsed.type !== 'unknown') {
      setQuickActionData({
        isOpen: true,
        qrResult: parsed
      });
    } else {
      // Default navigate to inventory filter
      setCurrentView('inventory');
    }
  };

  const currentUser = firebaseUserProfile || activeUser;
  const isStudentUser = isStudent(currentUser?.role);

  useEffect(() => {
    if (isStudentUser && currentView !== 'requests' && currentView !== 'dashboard') {
      setCurrentView('requests');
    }
  }, [isStudentUser, currentView]);

  const handleAuthSuccess = (user: User) => {
    setFirebaseUserProfile(user);
    setActiveUser(user);
  };

  const handleLogout = async () => {
    await signOut(auth);
    setFirebaseUserProfile(null);
    setActiveUser(null);
  };

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-6">
        <FirebaseAuthPanel onAuthSuccess={handleAuthSuccess} />
      </div>
    );
  }

  const pendingRequestsCount = requests.filter((r) => r.status === 'PENDING').length;

  return (
    <div className="flex flex-col h-screen w-screen bg-[#f8fafc] text-slate-900 font-sans overflow-hidden antialiased select-none">
      {/* Top Navigation */}
      <Navbar
        activeUser={currentUser}
        users={users}
        onUserChange={handleUserChange}
        onOpenScanner={() => setIsScannerOpen(true)}
        onOpenNewRequest={() => setIsNewRequestOpen(true)}
        onSearch={handleGlobalSearch}
        onResetData={handleResetData}
        onLogout={handleLogout}
      />

      {/* Main Body */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar Menu */}
        <Sidebar
          currentView={currentView}
          onSelectView={setCurrentView}
          pendingRequestsCount={pendingRequestsCount}
          onOpenScanner={() => setIsScannerOpen(true)}
          userRole={currentUser?.role}
        />

        {/* Center Content View */}
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
              onSelectView={setCurrentView}
              onOpenQRGenerator={handleOpenQRGenerator}
              onRefreshData={refreshAllData}
            />
          )}

          {currentView === 'inventory' && (
            <CatalogView
              catalogItems={catalogItems}
              stockLevels={stockLevels}
              locations={locations}
              assets={assets}
              userRole={currentUser?.role}
              onOpenQRGenerator={handleOpenQRGenerator}
              onRefreshData={refreshAllData}
            />
          )}

          {currentView === 'assets' && (
            <AssetsView
              assets={assets}
              catalogItems={catalogItems}
              locations={locations}
              users={users}
              onOpenQRGenerator={handleOpenQRGenerator}
              onRefreshData={refreshAllData}
            />
          )}

          {currentView === 'requests' && (
            <RequestsView
              requests={requests}
              catalogItems={catalogItems}
              users={users}
              activeUser={currentUser}
              onOpenNewRequest={() => setIsNewRequestOpen(true)}
              onOpenQRGenerator={handleOpenQRGenerator}
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
            <BatchQRLabelsModal
              assets={assets}
              catalogItems={catalogItems}
              locations={locations}
            />
          )}

          {currentView === 'users' && (
            <UsersView
              users={users}
              assets={assets}
              catalogItems={catalogItems}
              onOpenQRGenerator={handleOpenQRGenerator}
              onRefreshData={refreshAllData}
            />
          )}
        </main>
      </div>

      {/* Global Modals */}
      <QRScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScanResult={handleScanResult}
      />

      <QRGeneratorModal
        isOpen={qrGenData.isOpen}
        onClose={() => setQrGenData({ ...qrGenData, isOpen: false })}
        code={qrGenData.code}
        title={qrGenData.title}
        subtitle={qrGenData.subtitle}
      />

      <QuickActionModal
        isOpen={quickActionData.isOpen}
        onClose={() => setQuickActionData({ ...quickActionData, isOpen: false })}
        qrData={quickActionData.qrResult}
        users={users}
        locations={locations}
        catalogItems={catalogItems}
        onRefreshData={refreshAllData}
        onOpenQRGenerator={handleOpenQRGenerator}
      />

      <NewRequestModal
        isOpen={isNewRequestOpen}
        onClose={() => setIsNewRequestOpen(false)}
        activeUser={currentUser}
        catalogItems={catalogItems}
        onRefreshData={refreshAllData}
      />
    </div>
  );
}
