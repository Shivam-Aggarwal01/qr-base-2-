import { useEffect, useState } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth } from "./firebase";
import { InventoryStorage, parseQRCodeFromEntities } from "./services/storage";
import {
  ensureUserProfile,
  getUserProfile,
  completeGoogleRedirect,
  updateFirestoreDocument,
  deleteFirestoreDocument,
  COLLECTIONS,
} from "./services/firebaseInventory";
import { readFirestoreState } from "./services/firebaseCollections";
import { resolveRoleFromEmail } from "./services/roleConfig";
import { isStudent } from "./services/authRoles";
import { FirebaseAuthPanel } from "./components/FirebaseAuthPanel";
import { Navbar } from "./components/Navbar";
import { Sidebar } from "./components/Sidebar";
import { DashboardView } from "./components/DashboardView";
import { CatalogView } from "./components/CatalogView";
import { AssetsView } from "./components/AssetsView";
import { RequestsView } from "./components/RequestsView";
import { LocationsView } from "./components/LocationsView";
import { ActivityView } from "./components/ActivityView";
import { UsersView } from "./components/UsersView";
import { BatchQRLabelsModal } from "./components/BatchQRLabelsModal";
import { QRScannerModal } from "./components/QRScannerModal";
import { QRGeneratorModal } from "./components/QRGeneratorModal";
import { QuickActionModal } from "./components/QuickActionModal";
import { NewRequestModal } from "./components/NewRequestModal";
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
} from "./types/inventory";

export default function App() {
  // Data
  const [users, setUsers] = useState<User[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [catalogItems, setCatalogItems] = useState<CatalogItem[]>([]);
  const [stockLevels, setStockLevels] = useState<StockLevel[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [assignments, setAssignments] = useState<AssetAssignment[]>([]);
  const [requests, setRequests] = useState<Request[]>([]);
  const [transactions, setTransactions] = useState<InventoryTransaction[]>([]);
  // Authentication
  const [activeUser, setActiveUser] = useState<User | null>(null);
  const [firebaseUserProfile, setFirebaseUserProfile] = useState<User | null>(
    null,
  );
  // Navigation
  const [currentView, setCurrentView] = useState<ViewMode>("dashboard");
  // Scanner
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  // New request
  const [isNewRequestOpen, setIsNewRequestOpen] = useState(false);
  const [newRequestPrefillItems, setNewRequestPrefillItems] = useState<
    {
      catalog_item_id: string;
      requested_qty: number;
    }[]
  >([]);
  // QR generator
  const [qrGenData, setQrGenData] = useState<{
    isOpen: boolean;
    code: string;
    title: string;
    subtitle?: string;
  }>({
    isOpen: false,
    code: "",
    title: "",
  });
  // Quick actions
  const [quickActionData, setQuickActionData] = useState<{
    isOpen: boolean;
    qrResult: any;
  }>({
    isOpen: false,
    qrResult: null,
  });
  //  DERIVED STATE
  const currentUser = firebaseUserProfile ?? activeUser;
  const isStudentUser = isStudent(currentUser?.role);
  const pendingRequestsCount = isStudentUser
    ? requests.filter(
        (request) =>
          request.status === "PENDING" && request.user_id === currentUser?.id,
      ).length
    : requests.filter((request) => request.status === "PENDING").length;

  //  DATA LOADING
  const loadLocalData = () => {
    const localUsers = InventoryStorage.getUsers();
    setUsers(localUsers);
    setActiveUser(localUsers[0] ?? null);
    setLocations(InventoryStorage.getLocations());
    setCatalogItems(InventoryStorage.getCatalog());
    setStockLevels(InventoryStorage.getStockLevels());
    setAssets(InventoryStorage.getAssets());
    setAssignments(InventoryStorage.getAssignments());
    setRequests(InventoryStorage.getRequests());
    setTransactions(InventoryStorage.getTransactions());
  };
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
  };
  const refreshAllData = async () => {
    if (!auth.currentUser) {
      loadLocalData();
      return;
    }
    try {
      await loadFirestoreData();
    } catch (error) {
      loadLocalData();
    }
  };

  //  AUTHENTICATION
  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    const initialiseAuth = async () => {
      try {
        await completeGoogleRedirect();
      } catch (error) {
        console.warn("Google redirect sign-in did not complete:", error);
      }
      unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
        if (!firebaseUser) {
          setFirebaseUserProfile(null);
          setActiveUser(null);
          await refreshAllData();
          return;
        }
        try {
          let profile = await getUserProfile(firebaseUser.uid);
          if (!profile) {
            const role =
              resolveRoleFromEmail(firebaseUser.email ?? "") ?? "STUDENT";

            profile = await ensureUserProfile(firebaseUser, role);
          }
          setFirebaseUserProfile(profile);
          setActiveUser(profile);
          await refreshAllData();
        } catch (error) {
          console.error("❌ Failed to initialise Firebase user:", error);
        }
      });
    };
    void initialiseAuth();
    return () => {
      unsubscribe?.();
    };
  }, []);

  //  NAVIGATION
  useEffect(() => {
    if (
      isStudentUser &&
      currentView !== "dashboard" &&
      currentView !== "requests"
    ) {
      setCurrentView("requests");
    }
  }, [isStudentUser, currentView]);

  //  USER ACTIONS
  const handleUserChange = (user: User) => {
    const newActiveUser = InventoryStorage.setActiveUser(user.id);
    setActiveUser(newActiveUser);
    setFirebaseUserProfile(null);
  };
  const handleAuthSuccess = (user: User) => {
    setFirebaseUserProfile(user);
    setActiveUser(user);
  };
  const handleLogout = async () => {
    try {
      await signOut(auth);
      setFirebaseUserProfile(null);
      setActiveUser(null);
    } catch (error) {
      console.error("❌ Logout failed:", error);
    }
  };
  const handleResetData = () => {
    const confirmed = confirm(
      "Reset all electronics lab data back to initial seed state?",
    );
    if (!confirmed) {
      return;
    }
    InventoryStorage.resetAllData();
    void refreshAllData();
  };

  //  QR / REQUEST ACTIONS
  const handleOpenQRGenerator = (
    code: string,
    title: string,
    subtitle?: string,
  ) => {
    setQrGenData({
      isOpen: true,
      code,
      title,
      subtitle,
    });
  };
  const openNewRequest = (
    items: {
      catalog_item_id: string;
      requested_qty: number;
    }[] = [],
  ) => {
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
    if (result.type !== "unknown") {
      setQuickActionData({
        isOpen: true,
        qrResult: result,
      });
      return;
    }
    if (!isStudentUser) {
      setCurrentView("inventory");
    }
  };

  //  USER MANAGEMENT
  const handleUpdateUserRole = async (
    userId: string,
    newRole: User["role"],
  ) => {
    try {
      await updateFirestoreDocument(COLLECTIONS.USERS, userId, {
        role: newRole,
      });
      await refreshAllData();
    } catch (error) {
      console.error("❌ Failed to update user role:", error);
      alert("Failed to update user role.");
    }
  };
  const handleDeleteUser = async (userId: string) => {
    try {
      await deleteFirestoreDocument(COLLECTIONS.USERS, userId);
      await refreshAllData();
    } catch (error) {
      console.error("❌ Failed to delete user:", error);
      alert("Failed to delete user.");
    }
  };

  //  AUTH SCREEN
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-6">
        <FirebaseAuthPanel onAuthSuccess={handleAuthSuccess} />
      </div>
    );
  }

  //  APPLICATION
  return (
    <div className="flex flex-col h-screen w-screen bg-[#f8fafc] text-slate-900 font-sans overflow-hidden antialiased select-none">
      {/* NAVBAR */}
      <Navbar
        activeUser={currentUser}
        users={users}
        onUserChange={handleUserChange}
        onOpenScanner={() => setIsScannerOpen(true)}
        onOpenNewRequest={() => openNewRequest()}
        onSearch={handleGlobalSearch}
        onResetData={handleResetData}
        onLogout={handleLogout}
      />
      {/* MAIN LAYOUT */}
      <div className="flex flex-1 overflow-hidden">
        <Sidebar
          currentView={currentView}
          onSelectView={setCurrentView}
          pendingRequestsCount={pendingRequestsCount}
          onOpenScanner={() => setIsScannerOpen(true)}
          userRole={currentUser.role}
        />
        <main className="flex-1 flex flex-col overflow-hidden relative">
          {/* Dashboard */}
          {currentView === "dashboard" && (
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
          {/* Inventory */}
          {currentView === "inventory" && (
            <CatalogView
              catalogItems={catalogItems}
              stockLevels={stockLevels}
              locations={locations}
              assets={assets}
              userRole={currentUser.role}
              onOpenQRGenerator={handleOpenQRGenerator}
              onRefreshData={refreshAllData}
            />
          )}
          {/* Assets */}
          {currentView === "assets" && (
            <AssetsView
              assets={assets}
              catalogItems={catalogItems}
              locations={locations}
              users={users}
              onOpenQRGenerator={handleOpenQRGenerator}
              onRefreshData={refreshAllData}
            />
          )}
          {/* Requests */}
          {currentView === "requests" && (
            <RequestsView
              requests={requests}
              catalogItems={catalogItems}
              users={users}
              activeUser={currentUser}
              onOpenNewRequest={() => openNewRequest()}
              onOpenQRGenerator={handleOpenQRGenerator}
              onRefreshData={refreshAllData}
            />
          )}
          {/* Locations */}
          {currentView === "locations" && (
            <LocationsView
              locations={locations}
              catalogItems={catalogItems}
              assets={assets}
              stockLevels={stockLevels}
              onOpenQRGenerator={handleOpenQRGenerator}
              onRefreshData={refreshAllData}
            />
          )}
          {/* Activity */}
          {currentView === "activity" && (
            <ActivityView
              transactions={transactions}
              catalogItems={catalogItems}
              assets={assets}
              locations={locations}
              users={users}
              onOpenQRGenerator={handleOpenQRGenerator}
            />
          )}
          {/* QR Sheet */}
          {currentView === "qr-sheet" && (
            <BatchQRLabelsModal
              assets={assets}
              catalogItems={catalogItems}
              locations={locations}
            />
          )}
          {/* Users */}
          {currentView === "users" && (
            <UsersView
              users={users}
              assets={assets}
              catalogItems={catalogItems}
              activeUser={currentUser}
              onUpdateUserRole={handleUpdateUserRole}
              onDeleteUser={handleDeleteUser}
              onRefreshData={refreshAllData}
            />
          )}
        </main>
      </div>
      {/* GLOBAL MODALS */}
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
        initialItems={
          newRequestPrefillItems.length > 0 ? newRequestPrefillItems : undefined
        }
        onRefreshData={refreshAllData}
      />
    </div>
  );
}
