import { useEffect, useState, useMemo, useCallback } from 'react';
import { onAuthStateChanged, signOut, type User as FirebaseUser } from 'firebase/auth';
import { Helmet } from 'react-helmet-async';
import { useLocation, useNavigate } from 'react-router-dom';

// Shared layer
import { auth } from '../shared/api';
import {
  COLLECTIONS,
  completeGoogleRedirect,
  deleteFirestoreDocument,
  updateFirestoreDocument,
  ensureUserProfile,
  getUserProfile,
  getAccountRequest,
  reviewAccountRequest,
} from '../shared/api';
import { readFirestoreState } from '../shared/api';
import { isStudent, InventoryStorage, parseQRCodeFromEntities } from '../shared/lib';
import { useKeyboardShortcuts, type ShortcutConfig } from '../shared/lib/useKeyboardShortcuts';
import type {
  User,
  CatalogItem,
  Location,
  StockLevel,
  Asset,
  Request,
  InventoryTransaction,
  ViewMode,
  AccountRequest,
  AccountRequestStatus,
  RequestLineDraft,
} from '../shared/types/inventory';

// Widgets layer
import { Navbar } from '../widgets/navbar';
import { Sidebar } from '../widgets/sidebar';

// Pages layer
import { DashboardPage } from '../pages/dashboard';
import { StaffInventoryPage, StudentInventoryPage } from '../pages/inventory';
import { AssetsPage } from '../pages/assets';
import { RequestsPage } from '../pages/requests';
import { LocationsPage } from '../pages/locations';
import { ActivityPage } from '../pages/activity';
import { UsersPage } from '../pages/users';
import { LegalPage } from '../pages/legal';

// Features layer
import { FirebaseAuthPanel } from '../features/auth';
import { QRScannerModal } from '../features/qr-scanner';
import { QRGeneratorModal } from '../features/qr-generator';
import { QuickActionModal } from '../features/quick-action';
import { NewRequestModal } from '../features/request-management';
import { BatchQRLabelsModal } from '../features/batch-labels';
import { ShortcutsHelpModal } from '../features/shortcuts-help';

type QRResult = ReturnType<typeof parseQRCodeFromEntities>;
type AccessNotice = {
  status: AccountRequestStatus;
  name?: string;
  email?: string;
};

interface QRGeneratorData {
  isOpen: boolean;
  code: string;
  title: string;
  subtitle?: string;
}

interface QuickActionData {
  isOpen: boolean;
  qrResult: QRResult | null;
}

const viewMetadata: Record<ViewMode, { title: string; description: string }> = {
  dashboard: {
    title: 'Overview',
    description: 'A live look at lab equipment, stock, and current requests.',
  },
  inventory: {
    title: 'Inventory',
    description: 'Track materials, consumables, tools, and current quantities.',
  },
  assets: {
    title: 'Equipment',
    description: 'Manage individual equipment, operational status, and assignments.',
  },
  requests: {
    title: 'Requests',
    description: 'Review, approve, checkout, and return lab items and equipment.',
  },
  locations: {
    title: 'Locations',
    description: 'Workbenches, tool cabinets, storage racks, and lab shelves.',
  },
  activity: {
    title: 'Activity',
    description: 'Real-time ledger of checkouts, returns, repairs, and stock adjustments.',
  },
  users: {
    title: 'Directory',
    description: 'Manage lab members, student engineers, roles, and approvals.',
  },
  legal: {
    title: 'Policies & Governance',
    description: 'Review our Terms of Service, Privacy Policy, and lab safety rules.',
  },
};

export function App() {
  const navigate = useNavigate();
  const location = useLocation();

  const isLegalRoute = location.pathname === '/privacy' || location.pathname === '/terms';
  const [currentView, setCurrentView] = useState<ViewMode>(isLegalRoute ? 'legal' : 'dashboard');

  useEffect(() => {
    if (isLegalRoute) {
      setCurrentView('legal');
    } else if (currentView === 'legal') {
      setCurrentView('dashboard');
    }
  }, [location.pathname, isLegalRoute, currentView]);

  const pageMeta = viewMetadata[currentView] ?? viewMetadata.dashboard;
  const canonicalUrl = `${window.location.origin}${location.pathname}`;

  const renderHelmet = () => (
    <Helmet>
      <title>{`${pageMeta.title} | AICTE IDEA Lab Inventory`}</title>
      <meta name="description" content={pageMeta.description} />
      <link rel="canonical" href={canonicalUrl} />
      <meta property="og:type" content="website" />
      <meta property="og:title" content={`${pageMeta.title} | AICTE IDEA Lab Inventory`} />
      <meta property="og:description" content={pageMeta.description} />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:image" content={`${window.location.origin}/logo.png`} />
      <meta name="twitter:card" content="summary" />
      <meta name="twitter:title" content={`${pageMeta.title} | AICTE IDEA Lab Inventory`} />
      <meta name="twitter:description" content={pageMeta.description} />
      <meta name="twitter:image" content={`${window.location.origin}/logo.png`} />
      <meta name="twitter:image:alt" content="AICTE Inventory Management System" />
    </Helmet>
  );

  // ---------------------------------------------------------------------------
  // Application data
  // ---------------------------------------------------------------------------
  const [users, setUsers] = useState<User[]>([]);
  const [accountRequests, setAccountRequests] = useState<AccountRequest[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [catalogItems, setCatalogItems] = useState<CatalogItem[]>([]);
  const [stockLevels, setStockLevels] = useState<StockLevel[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
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
  const [isBatchLabelsOpen, setIsBatchLabelsOpen] = useState(false);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [pendingNewUser, setPendingNewUser] = useState<FirebaseUser | null>(null);

  // ---------------------------------------------------------------------------
  // Derived state
  // ---------------------------------------------------------------------------
  const currentUser = firebaseUserProfile ?? activeUser;
  const effectiveRole = authRole ?? currentUser?.role;
  const isStudentUser = isStudent(effectiveRole);
  const pendingAccountCount = useMemo(
    () => accountRequests.filter((request) => request.status === 'PENDING').length,
    [accountRequests]
  );
  const pendingRequestsCount = useMemo(
    () =>
      isStudentUser
        ? requests.filter(
            (request) =>
              (request.status === 'PENDING' || request.status === 'APPROVED') && request.user_id === currentUser?.id
          ).length
        : requests.filter((request) => request.status === 'PENDING' || request.status === 'APPROVED').length,
    [isStudentUser, requests, currentUser?.id]
  );

  // ---------------------------------------------------------------------------
  // Firestore data
  // ---------------------------------------------------------------------------
  const loadFirestoreData = async () => {
    const state = await readFirestoreState();
    setCatalogItems(state.catalogItems ?? []);
    setLocations(state.locations ?? []);
    setStockLevels(state.stockLevels ?? []);
    setAssets(state.assets ?? []);
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
  // Authentication effect
  // ---------------------------------------------------------------------------
  useEffect(() => {
    let isSubscribed = true;

    const initializeAuth = async () => {
      try {
        const redirectedUser = await completeGoogleRedirect();
        if (redirectedUser && isSubscribed) {
          await syncAuthenticatedUser(redirectedUser);
        }
      } catch (error) {
        console.warn('Redirect processing:', error);
      }

      onAuthStateChanged(auth, async (firebaseUser) => {
        if (!isSubscribed) return;

        if (firebaseUser) {
          await syncAuthenticatedUser(firebaseUser);
        } else {
          setFirebaseUserProfile(null);
          setAuthRole(undefined);
          setAccessNotice(null);
          setPendingNewUser(null);
          setAuthReady(true);
        }
      });
    };

    void initializeAuth();

    return () => {
      isSubscribed = false;
    };
  }, []);

  const syncAuthenticatedUser = async (firebaseUser: FirebaseUser) => {
    try {
      const tokenResult = await firebaseUser.getIdTokenResult(true);
      const roleClaim = tokenResult.claims.role as User['role'] | undefined;
      setAuthRole(roleClaim);

      const existingProfile = await getUserProfile(firebaseUser.uid);
      if (existingProfile) {
        setFirebaseUserProfile(existingProfile);
        setActiveUser(existingProfile);
        setAccessNotice(null);
        setPendingNewUser(null);
        await loadFirestoreData();
        setAuthReady(true);
        return;
      }

      const accountRequest = await getAccountRequest(firebaseUser.uid);
      if (accountRequest) {
        if (accountRequest.status === 'APPROVED') {
          const profile = await ensureUserProfile(firebaseUser, 'STUDENT', accountRequest.name);
          setFirebaseUserProfile(profile);
          setActiveUser(profile);
          setAccessNotice(null);
          setPendingNewUser(null);
          await loadFirestoreData();
          setAuthReady(true);
          return;
        }

        setAccessNotice({
          status: accountRequest.status,
          name: accountRequest.name,
          email: accountRequest.email,
        });
        setPendingNewUser(null);
        setAuthReady(true);
        return;
      }

      setPendingNewUser(firebaseUser);
      setAccessNotice(null);
      setAuthReady(true);
    } catch (error) {
      console.error('Error synchronizing user profile:', error);
      setAuthReady(true);
    }
  };

  const handleSignOut = async () => {
    await signOut(auth);
    setFirebaseUserProfile(null);
    setAuthRole(undefined);
    setAccessNotice(null);
    setPendingNewUser(null);
    navigate('/');
  };

  // ---------------------------------------------------------------------------
  // Modal handlers
  // ---------------------------------------------------------------------------
  const handleOpenQRGenerator = useCallback((code: string, title: string, subtitle?: string) => {
    setQrGenData({
      isOpen: true,
      code,
      title,
      subtitle,
    });
  }, []);

  const openNewRequest = useCallback((prefillItems?: RequestLineDraft[]) => {
    setNewRequestPrefillItems(prefillItems ?? []);
    setIsNewRequestOpen(true);
  }, []);

  const handleScanResult = useCallback((code: string) => {
    setIsScannerOpen(false);
    const parsed = parseQRCodeFromEntities(code, {
      assets,
      catalog: catalogItems,
      locations,
      users,
    });
    setQuickActionData({
      isOpen: true,
      qrResult: parsed,
    });
  }, [assets, catalogItems, locations, users]);

  const handleUpdateUserRole = async (userId: string, newRole: User['role']) => {
    try {
      await updateFirestoreDocument(COLLECTIONS.USERS, userId, { role: newRole });
      await refreshAllData();
    } catch (error) {
      console.error('Failed to update user role:', error);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    try {
      await deleteFirestoreDocument(COLLECTIONS.USERS, userId);
      await refreshAllData();
    } catch (error) {
      console.error('Failed to delete user:', error);
    }
  };

  const handleReviewAccountRequest = async (requestId: string, status: 'APPROVED' | 'REJECTED') => {
    if (!currentUser) return;
    try {
      await reviewAccountRequest(requestId, status, currentUser);
      await refreshAllData();
    } catch (error) {
      console.error('Failed to review account request:', error);
    }
  };

  // ---------------------------------------------------------------------------
  // Close any active modal handler
  // ---------------------------------------------------------------------------
  const closeTopModal = useCallback(() => {
    if (isShortcutsOpen) {
      setIsShortcutsOpen(false);
      return;
    }
    if (isScannerOpen) {
      setIsScannerOpen(false);
      return;
    }
    if (qrGenData.isOpen) {
      setQrGenData((prev) => ({ ...prev, isOpen: false }));
      return;
    }
    if (quickActionData.isOpen) {
      setQuickActionData((prev) => ({ ...prev, isOpen: false }));
      return;
    }
    if (isNewRequestOpen) {
      setIsNewRequestOpen(false);
      return;
    }
    if (isBatchLabelsOpen) {
      setIsBatchLabelsOpen(false);
      return;
    }
    if (mobileMenuOpen) {
      setMobileMenuOpen(false);
      return;
    }
  }, [
    isShortcutsOpen,
    isScannerOpen,
    qrGenData.isOpen,
    quickActionData.isOpen,
    isNewRequestOpen,
    isBatchLabelsOpen,
    mobileMenuOpen,
  ]);

  // ---------------------------------------------------------------------------
  // Global Keyboard Shortcuts
  // ---------------------------------------------------------------------------
  const shortcuts: ShortcutConfig[] = useMemo(
    () => [
      {
        key: '?',
        shift: true,
        description: 'Show keyboard shortcuts guide',
        category: 'Dialogs',
        handler: () => setIsShortcutsOpen((prev) => !prev),
      },
      {
        key: '/',
        description: 'Focus search input',
        category: 'Actions',
        handler: () => {
          const searchInput = document.querySelector<HTMLInputElement>(
            'input[placeholder*="Search"], input[placeholder*="search"]'
          );
          if (searchInput) {
            searchInput.focus();
            searchInput.select();
          }
        },
      },
      {
        key: 'q',
        description: 'Open QR Scanner',
        category: 'Actions',
        handler: () => setIsScannerOpen((prev) => !prev),
      },
      {
        key: 'k',
        ctrlOrMeta: true,
        description: 'Open QR Scanner (Cmd/Ctrl + K)',
        category: 'Actions',
        allowInInputs: true,
        handler: () => setIsScannerOpen(true),
      },
      {
        key: 'n',
        description: 'Open New Request form',
        category: 'Actions',
        handler: () => openNewRequest(),
      },
      {
        key: 'Escape',
        allowInInputs: true,
        description: 'Close active modal, drawer, or cancel search',
        category: 'Dialogs',
        handler: () => closeTopModal(),
      },
      {
        key: '1',
        description: 'Navigate to Overview',
        category: 'Navigation',
        handler: () => setCurrentView('dashboard'),
      },
      {
        key: '2',
        description: 'Navigate to Inventory',
        category: 'Navigation',
        handler: () => setCurrentView('inventory'),
      },
      {
        key: '3',
        description: 'Navigate to Equipment',
        category: 'Navigation',
        handler: () => {
          if (!isStudentUser) setCurrentView('assets');
        },
      },
      {
        key: '4',
        description: 'Navigate to Requests',
        category: 'Navigation',
        handler: () => setCurrentView('requests'),
      },
      {
        key: '5',
        description: 'Navigate to Locations',
        category: 'Navigation',
        handler: () => {
          if (!isStudentUser) setCurrentView('locations');
        },
      },
      {
        key: '6',
        description: 'Navigate to Activity',
        category: 'Navigation',
        handler: () => {
          if (!isStudentUser) setCurrentView('activity');
        },
      },
      {
        key: '7',
        description: 'Navigate to Directory',
        category: 'Navigation',
        handler: () => {
          if (!isStudentUser) setCurrentView('users');
        },
      },
    ],
    [openNewRequest, closeTopModal, isStudentUser]
  );

  useKeyboardShortcuts(shortcuts, authReady && !!currentUser && !accessNotice && !pendingNewUser);

  // ---------------------------------------------------------------------------
  // Unauthenticated / Auth in progress states
  // ---------------------------------------------------------------------------
  if (!authReady) {
    return (
      <div className="min-h-screen bg-[var(--color-idea-bg)] flex items-center justify-center p-4">
        {renderHelmet()}
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-3 border-[var(--color-idea-blue)] border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-[var(--color-idea-muted)] font-medium">Connecting to AICTE IDEA Lab...</p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-[var(--color-idea-bg)] flex flex-col">
        {renderHelmet()}
        <header className="h-16 flex items-center justify-between px-4 sm:px-6 lg:px-8 border-b border-[var(--color-idea-border)] bg-white">
          <div className="flex items-center gap-2.5">
            <img src="/logo.png" alt="AICTE IDEA Lab" className="h-9 w-auto object-contain" />
            <div>
              <p className="text-xs font-bold tracking-tight text-[var(--color-idea-text)]">AICTE IDEA LAB</p>
              <p className="text-[9px] text-[var(--color-idea-muted)] tracking-wider uppercase font-medium">
                Inventory Management System
              </p>
            </div>
          </div>
        </header>
        <main className="flex-1 flex items-center justify-center p-4">
          <FirebaseAuthPanel
            accessNotice={accessNotice}
            pendingNewUser={pendingNewUser}
            onClearPendingNewUser={() => setPendingNewUser(null)}
          />
        </main>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Authenticated Main Workspace
  // ---------------------------------------------------------------------------
  return (
    <div className="h-full h-screen h-[100dvh] max-h-screen bg-[var(--color-idea-bg)] flex flex-col antialiased overflow-hidden">
      {renderHelmet()}
      <Navbar
        activeUser={currentUser}
        users={users}
        onUserChange={setActiveUser}
        onOpenScanner={() => setIsScannerOpen(true)}
        onOpenNewRequest={() => openNewRequest()}
        onSearch={() => {}}
        onResetData={() => InventoryStorage.resetAllData()}
        onLogout={handleSignOut}
        lockIdentity={true}
        onToggleMobileMenu={() => setMobileMenuOpen((prev) => !prev)}
        onOpenShortcuts={() => setIsShortcutsOpen(true)}
      />

      <div className="flex flex-col-reverse md:flex-row flex-1 min-h-0 overflow-hidden">
        <Sidebar
          currentView={currentView}
          onSelectView={setCurrentView}
          pendingRequestsCount={pendingRequestsCount}
          pendingAccountCount={pendingAccountCount}
          userRole={effectiveRole ?? currentUser.role}
          mobileOpen={mobileMenuOpen}
          onCloseMobile={() => setMobileMenuOpen(false)}
        />

        <main className="flex-1 min-h-0 flex flex-col overflow-hidden relative" id="main-content" tabIndex={-1}>
          {currentView === 'dashboard' && (
            <DashboardPage
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
              <StudentInventoryPage
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
              <StaffInventoryPage
                catalogItems={catalogItems}
                stockLevels={stockLevels}
                locations={locations}
                userRole={effectiveRole ?? currentUser.role}
                onOpenQRGenerator={handleOpenQRGenerator}
                onRefreshData={refreshAllData}
              />
            ))}

          {currentView === 'assets' && (
            <AssetsPage
              assets={assets}
              locations={locations}
              users={users}
              userRole={effectiveRole ?? currentUser.role}
              onRefreshData={refreshAllData}
              onOpenQRGenerator={handleOpenQRGenerator}
              onOpenBatchLabels={() => setIsBatchLabelsOpen(true)}
            />
          )}

          {currentView === 'requests' && (
            <RequestsPage
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
            <LocationsPage
              locations={locations}
              catalogItems={catalogItems}
              assets={assets}
              stockLevels={stockLevels}
              userRole={effectiveRole ?? currentUser.role}
              onOpenQRGenerator={handleOpenQRGenerator}
              onRefreshData={refreshAllData}
            />
          )}

          {currentView === 'activity' && (
            <ActivityPage
              transactions={transactions}
              catalogItems={catalogItems}
              assets={assets}
              locations={locations}
              users={users}
              onOpenQRGenerator={handleOpenQRGenerator}
            />
          )}

          {currentView === 'users' && (
            <UsersPage
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

          {currentView === 'legal' && (
            <LegalPage kind={location.pathname === '/terms' ? 'terms' : 'privacy'} inAppShell={true} />
          )}
        </main>
      </div>

      {/* Global Modals & Dialogs */}
      <ShortcutsHelpModal isOpen={isShortcutsOpen} onClose={() => setIsShortcutsOpen(false)} />

      <QRScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScanResult={handleScanResult}
      />

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

      <BatchQRLabelsModal
        isOpen={isBatchLabelsOpen}
        onClose={() => setIsBatchLabelsOpen(false)}
        assets={assets}
        catalogItems={catalogItems}
        locations={locations}
      />
    </div>
  );
}

export default App;
