import React from 'react';
import { Layers, AlertCircle, ClipboardList, ArrowRight, QrCode, CheckCircle2, Package } from 'lucide-react';
import {
  Asset,
  CatalogItem,
  Location,
  Request,
  InventoryTransaction,
  User,
  StockLevel,
  ViewMode,
} from '../types/inventory';
import { isStudent } from '../services/authRoles';

interface DashboardViewProps {
  assets: Asset[];
  catalogItems: CatalogItem[];
  locations: Location[];
  requests: Request[];
  transactions: InventoryTransaction[];
  users: User[];
  stockLevels: StockLevel[];
  currentUser?: User | null;
  onSelectView: (view: ViewMode) => void;
  onOpenQRGenerator: (code: string, title: string, subtitle?: string) => void;
  onRefreshData: () => void;
  onOpenNewRequest?: () => void;
}

function getStatusBadge(status: string) {
  switch (status) {
    case 'PENDING':
      return 'idea-warning';
    case 'APPROVED':
      return 'idea-info';
    case 'HANDED_OVER':
    case 'COMPLETED':
      return 'idea-success';
    case 'REJECTED':
    case 'CANCELLED':
      return 'idea-error';
    default:
      return 'bg-[var(--color-idea-light-grey)] text-[var(--color-idea-muted)] border border-[var(--color-idea-border)]';
  }
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  assets,
  catalogItems,
  locations,
  requests,
  transactions,
  users,
  stockLevels,
  currentUser,
  onSelectView,
  onOpenQRGenerator,
  onRefreshData,
  onOpenNewRequest,
}) => {
  const studentMode = isStudent(currentUser?.role);

  if (studentMode && currentUser) {
    const myRequests = requests.filter((r) => r.user_id === currentUser.id);
    const myPending = myRequests.filter((r) => r.status === 'PENDING');
    const myApproved = myRequests.filter((r) => r.status === 'APPROVED');
    const myCompleted = myRequests.filter((r) => r.status === 'COMPLETED' || r.status === 'HANDED_OVER');
    const myVisible = myRequests.filter(
      (r) => r.status === 'PENDING' || r.status === 'APPROVED' || r.status === 'HANDED_OVER' || r.status === 'COMPLETED'
    );
    const myAssigned = assets.filter((a) => a.assigned_to_user_id === currentUser.id && a.status === 'ISSUED');
    const myReusableCatalogLoans = myRequests
      .filter((request) => request.status === 'HANDED_OVER')
      .flatMap((request) =>
        (request.items ?? [])
          .filter((item) => !item.asset_id && item.usage === 'REUSABLE')
          .map((item) => ({
            id: `${request.id}-${item.id}`,
            catalogItemId: item.catalog_item_id || '',
            quantity: Number(item.requested_qty) || 0,
          }))
      )
      .filter((loan) => loan.catalogItemId && loan.quantity > 0);
    const assignedCount = myAssigned.length + myReusableCatalogLoans.reduce((total, loan) => total + loan.quantity, 0);

    return (
      <div className="flex-1 space-y-8 p-8 overflow-y-auto max-w-7xl mx-auto w-full idea-bg">
        <div className="pb-4 border-b border-[var(--color-idea-border)] flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <span className="text-[10px] font-medium tracking-[0.25em] uppercase text-[var(--color-idea-muted)]">
              STUDENT PORTAL
            </span>
            <h1 className="text-3xl font-bold text-[var(--color-idea-text)] mt-1">
              My Lab <span className="text-[var(--color-idea-blue)]">Requests</span>
            </h1>
            <p className="text-xs text-[var(--color-idea-muted)] mt-1">
              Request items or a specific asset, then wait for approval and handover.
            </p>
          </div>
          {onOpenNewRequest && (
            <button
              onClick={onOpenNewRequest}
              className="idea-button flex items-center gap-2 px-5 py-2.5 text-xs font-semibold cursor-pointer"
            >
              Request Item
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Pending */}
          <div className="idea-card p-6 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-[var(--color-idea-yellow)]" />
            <span className="text-[10px] font-bold text-[var(--color-idea-muted)] uppercase tracking-[0.2em]">
              Pending Requests
            </span>
            <h2 className="text-5xl font-bold text-[var(--color-idea-text)] mt-3">{myPending.length}</h2>
            <p className="text-xs text-[var(--color-idea-muted)] mt-3">Awaiting staff review</p>
          </div>
          {/* Partial */}
          <div className="idea-card p-6 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-[var(--color-idea-blue)]" />
            <span className="text-[10px] font-bold text-[var(--color-idea-muted)] uppercase tracking-[0.2em]">
              Approved
            </span>
            <h2 className="text-5xl font-bold text-[var(--color-idea-text)] mt-3">{myApproved.length}</h2>
            <p className="text-xs text-[var(--color-idea-muted)] mt-3">Ready to collect at handover</p>
          </div>
          {/* Assigned */}
          <div className="idea-card p-6 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-[var(--color-idea-green)]" />
            <span className="text-[10px] font-bold text-[var(--color-idea-muted)] uppercase tracking-[0.2em]">
              Assigned To Me
            </span>
            <h2 className="text-5xl font-bold text-[var(--color-idea-text)] mt-3">{assignedCount}</h2>
            <p className="text-xs text-[var(--color-idea-muted)] mt-3">Reusable items currently issued to you</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-8 idea-card overflow-hidden flex flex-col">
            <div className="px-6 py-5 border-b border-[var(--color-idea-border)] flex items-center justify-between bg-[var(--color-idea-light-grey)]">
              <div>
                <span className="text-[9px] font-medium uppercase tracking-[0.2em] text-[var(--color-idea-muted)]">
                  MY SLIPS
                </span>
                <h3 className="font-bold text-[var(--color-idea-text)] text-lg">Request Status</h3>
              </div>
              <button
                onClick={() => onSelectView('requests')}
                className="text-xs font-semibold text-[var(--color-idea-blue)] hover:opacity-80 flex items-center gap-1 cursor-pointer"
              >
                View all <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
            {myVisible.length === 0 ? (
              <div className="p-8 text-center space-y-2">
                <ClipboardList className="w-8 h-8 text-[var(--color-idea-blue)] mx-auto" />
                <p className="text-sm font-semibold text-[var(--color-idea-text)]">
                  You have not requested any items yet.
                </p>
                <p className="text-xs text-[var(--color-idea-muted)]">
                  Scan a QR code or raise a requisition slip to get started.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-[var(--color-idea-border)]">
                {myVisible.slice(0, 8).map((req) => (
                  <div key={req.id} className="px-6 py-4 flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-xs font-mono font-bold text-[var(--color-idea-blue)]">
                          {req.request_number}
                        </p>
                        <span
                          className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-widest ${getStatusBadge(req.status)}`}
                        >
                          {req.status}
                        </span>
                      </div>
                      <p className="text-sm font-bold text-[var(--color-idea-text)] mt-1 truncate">"{req.purpose}"</p>
                      <p className="text-[11px] text-[var(--color-idea-muted)] mt-1">
                        {(req.items ?? [])
                          .map((item) => {
                            if (item.asset_id) {
                              const asset = assets.find((a) => a.id === item.asset_id);
                              return asset?.asset_code || 'Asset';
                            }
                            const cat = catalogItems.find((c) => c.id === item.catalog_item_id);
                            return `${item.requested_qty} × ${cat?.name || 'Item'}`;
                          })
                          .join(' · ') || 'No line items'}
                      </p>
                    </div>
                    <p className="text-[10px] font-mono text-[var(--color-idea-muted)] shrink-0">
                      {new Date(req.created_at).toLocaleDateString()}
                    </p>
                  </div>
                ))}
              </div>
            )}
            <p className="px-6 py-3 text-[10px] font-mono text-[var(--color-idea-muted)] border-t border-[var(--color-idea-border)]">
              {myCompleted.length} completed of {myVisible.length} visible requests
            </p>
          </div>

          <div className="lg:col-span-4 idea-card p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[var(--color-idea-border)] pb-3">
              <div>
                <span className="text-[9px] font-medium uppercase tracking-[0.2em] text-[var(--color-idea-muted)]">
                  LOANS
                </span>
                <h3 className="font-bold text-[var(--color-idea-text)] text-base">Items With Me</h3>
              </div>
              <Package className="w-4 h-4 text-[var(--color-idea-blue)]" />
            </div>
            {assignedCount === 0 ? (
              <p className="text-xs text-[var(--color-idea-muted)] italic">
                No reusable equipment is currently assigned to you.
              </p>
            ) : (
              <div className="space-y-2.5 max-h-80 overflow-y-auto">
                {myAssigned.map((asset) => {
                  const cat = catalogItems.find(
                    (c) => c.id === asset.catalog_item_id || c.item_code === asset.catalog_item_id
                  );
                  return (
                    <div
                      key={asset.id}
                      className="p-3 idea-gradient-soft border border-[var(--color-idea-blue)]/20 rounded-xl"
                    >
                      <p className="text-xs font-bold text-[var(--color-idea-text)]">{cat?.name || 'Asset'}</p>
                      <p className="text-[10px] font-mono text-[var(--color-idea-blue)]">{asset.asset_code}</p>
                      <p className="text-[10px] font-mono text-[var(--color-idea-muted)] mt-1">Status: ISSUED</p>
                    </div>
                  );
                })}
                {myReusableCatalogLoans.map((loan) => {
                  const cat = catalogItems.find(
                    (item) => item.id === loan.catalogItemId || item.item_code === loan.catalogItemId
                  );
                  return (
                    <div
                      key={loan.id}
                      className="p-3 idea-gradient-soft border border-[var(--color-idea-blue)]/20 rounded-xl"
                    >
                      <p className="text-xs font-bold text-[var(--color-idea-text)]">{cat?.name || 'Reusable item'}</p>
                      <p className="text-[10px] font-mono text-[var(--color-idea-blue)]">
                        Quantity: {loan.quantity} {cat?.unit || 'items'}
                      </p>
                      <p className="text-[10px] font-mono text-[var(--color-idea-muted)] mt-1">Status: ISSUED</p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Admin dashboard stats
  const activeLoans = assets.filter((a) => a.status === 'ISSUED');
  const pendingRequests = requests.filter((r) => r.status === 'PENDING');
  const boxAssets = assets.filter((a) => a.is_box || a.tracking_mode === 'BOX');
  const fixedAssets = assets.filter((a) => !a.is_box && a.tracking_mode !== 'BOX');

  const lowStockCatalogItems = catalogItems.filter((item) => {
    const itemStock = stockLevels
      .filter((s) => s.catalog_item_id === item.id || s.catalog_item_id === item.item_code)
      .reduce((sum, s) => sum + s.quantity, 0);
    return item.min_stock_alert ? itemStock <= item.min_stock_alert : itemStock < 10;
  });

  const getTransactionBadge = (type: string) => {
    switch (type) {
      case 'RETURN':
        return 'idea-success';
      case 'ISSUE':
        return 'idea-info';
      case 'DAMAGE':
        return 'idea-warning';
      case 'DISPOSAL':
        return 'idea-error';
      default:
        return 'bg-[var(--color-idea-light-grey)] text-[var(--color-idea-muted)] border border-[var(--color-idea-border)]';
    }
  };

  const getTimeAgo = (dateStr: string) => {
    const diff = (new Date().getTime() - new Date(dateStr).getTime()) / 1000;
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  return (
    <div className="flex-1 space-y-8 p-8 overflow-y-auto max-w-7xl mx-auto w-full idea-bg">
      {/* Header */}
      <div className="pb-4 border-b border-[var(--color-idea-border)] flex justify-between items-end">
        <div>
          <span className="text-[10px] font-medium tracking-[0.25em] uppercase text-[var(--color-idea-muted)]">
            SYSTEM OVERVIEW
          </span>
          <h1 className="text-3xl font-bold text-[var(--color-idea-text)] mt-1">
            Electronics Laboratory <span className="text-[var(--color-idea-blue)]">Ledger</span>
          </h1>
        </div>
        <div className="text-right text-xs text-[var(--color-idea-muted)]">
          <span>STORAGE BOXES: {boxAssets.length} BATCHES</span> • <span>FIXED TOOLS: {fixedAssets.length} UNITS</span>
        </div>
      </div>

      {/* Hero Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Active Loans */}
        <div className="idea-card p-6 relative overflow-hidden flex flex-col justify-between">
          <div className="absolute top-0 left-0 w-full h-1 bg-[var(--color-idea-blue)]" />
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-[var(--color-idea-muted)] uppercase tracking-[0.2em]">
                Active Student Loans
              </span>
              <div className="idea-logo-container">
                <Layers className="w-4 h-4 text-[var(--color-idea-blue)]" />
              </div>
            </div>
            <h2 className="text-5xl font-bold text-[var(--color-idea-text)] mt-3">{activeLoans.length}</h2>
          </div>
          <div className="flex items-center gap-2 text-[var(--color-idea-green)] text-xs font-medium mt-4">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Assigned student equipment records</span>
          </div>
        </div>

        {/* Low Stock Alert */}
        <div
          onClick={() => onSelectView('inventory')}
          className="idea-card p-6 relative overflow-hidden flex flex-col justify-between hover:border-[var(--color-idea-red)]/40 cursor-pointer group"
        >
          <div className="absolute top-0 left-0 w-full h-1 bg-[var(--color-idea-red)]" />
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-[var(--color-idea-muted)] uppercase tracking-[0.2em]">
                Restock Alerts
              </span>
              <div className="p-2 rounded-xl idea-error">
                <AlertCircle className="w-4 h-4" />
              </div>
            </div>
            <h2 className="text-5xl font-bold text-[var(--color-idea-red)] mt-3">
              {String(lowStockCatalogItems.length).padStart(2, '0')}
            </h2>
          </div>
          <div className="text-xs text-[var(--color-idea-muted)] flex justify-between items-center mt-4">
            <span>Capacitors, Resistors, LEDs</span>
            <ArrowRight className="w-3.5 h-3.5 text-[var(--color-idea-text)] group-hover:translate-x-1 transition-transform" />
          </div>
        </div>

        {/* Pending Requisitions */}
        <div
          onClick={() => onSelectView('requests')}
          className="idea-card p-6 relative overflow-hidden flex flex-col justify-between hover:border-[var(--color-idea-blue)]/40 cursor-pointer group"
        >
          <div className="absolute top-0 left-0 w-full h-1 bg-[var(--color-idea-deep-blue)]" />
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-[var(--color-idea-muted)] uppercase tracking-[0.2em]">
                Pending Requisitions
              </span>
              <div className="idea-logo-container">
                <ClipboardList className="w-4 h-4 text-[var(--color-idea-deep-blue)]" />
              </div>
            </div>
            <h2 className="text-5xl font-bold text-[var(--color-idea-text)] mt-3">{pendingRequests.length}</h2>
          </div>
          <div className="mt-4">
            <div className="bg-[var(--color-idea-light-grey)] h-1.5 w-full rounded-full overflow-hidden">
              <div
                className="bg-[var(--color-idea-blue)] h-full rounded-full transition-all duration-500"
                style={{
                  width: `${Math.min(100, (pendingRequests.length / Math.max(1, requests.length)) * 100)}%`,
                }}
              />
            </div>
            <p className="text-[10px] text-[var(--color-idea-muted)] mt-1.5 text-right">
              {pendingRequests.length} of {requests.length} total pending review
            </p>
          </div>
        </div>
      </div>

      {/* Main Content Split */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Recent Activity Table */}
        <div className="lg:col-span-8 idea-card overflow-hidden flex flex-col">
          <div className="px-6 py-5 border-b border-[var(--color-idea-border)] flex items-center justify-between bg-[var(--color-idea-light-grey)]">
            <div>
              <span className="text-[9px] font-medium uppercase tracking-[0.2em] text-[var(--color-idea-muted)]">
                AUDIT TRAIL
              </span>
              <h3 className="font-bold text-[var(--color-idea-text)] text-lg">Recent Inventory Movements</h3>
            </div>
            <button
              onClick={() => onSelectView('activity')}
              className="text-xs font-semibold text-[var(--color-idea-blue)] hover:opacity-80 flex items-center gap-1 cursor-pointer"
            >
              <span>Full Audit History</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="text-[10px] font-bold text-[var(--color-idea-muted)] uppercase tracking-[0.2em] border-b border-[var(--color-idea-border)] bg-[var(--color-idea-light-grey)]">
                  <th className="px-6 py-3.5">Item / Asset Tag</th>
                  <th className="px-6 py-3.5">Type</th>
                  <th className="px-6 py-3.5">Member / Tech</th>
                  <th className="px-6 py-3.5">Storage Bin</th>
                  <th className="px-6 py-3.5 text-right">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-idea-border)]">
                {transactions.slice(0, 6).map((tx) => {
                  const asset = assets.find((a) => a.id === tx.asset_id || a.asset_code === tx.asset_id);
                  const catalogItem = catalogItems.find(
                    (c) =>
                      c.id === (tx.catalog_item_id || asset?.catalog_item_id) ||
                      c.item_code === (tx.catalog_item_id || asset?.catalog_item_id)
                  );
                  const user = users.find((u) => u.id === tx.issued_to_user_id || u.id === tx.processed_by_user_id);
                  const loc = locations.find((l) => l.id === (tx.to_location_id || tx.from_location_id));

                  const displayCode = asset?.asset_code || catalogItem?.item_code || 'N/A';

                  return (
                    <tr key={tx.id} className="hover:bg-[var(--color-idea-light-grey)] transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() =>
                              onOpenQRGenerator(
                                asset?.id || catalogItem?.id || displayCode,
                                catalogItem?.name || displayCode,
                                'Inventory Tag'
                              )
                            }
                            className="w-7 h-7 idea-button rounded-lg flex items-center justify-center cursor-pointer"
                            title="Generate QR Label"
                          >
                            <QrCode className="w-3.5 h-3.5" />
                          </button>
                          <div>
                            <p className="text-xs font-bold text-[var(--color-idea-text)]">
                              {catalogItem?.name || 'Unknown Item'}
                            </p>
                            <p className="text-[10px] font-mono text-[var(--color-idea-blue)] font-semibold">
                              {displayCode}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-widest ${getTransactionBadge(tx.transaction_type)}`}
                        >
                          {tx.transaction_type}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs font-medium text-[var(--color-idea-text)]">
                        {user?.name || 'System Log'}
                      </td>
                      <td className="px-6 py-4 text-xs font-mono text-[var(--color-idea-muted)]">
                        {loc ? loc.name : tx.issued_to_user_id ? `Loan (${user?.user_code})` : 'Lab Bin'}
                      </td>
                      <td className="px-6 py-4 text-xs font-mono text-[var(--color-idea-muted)] text-right">
                        {getTimeAgo(tx.created_at)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Column */}
        <div className="lg:col-span-4 space-y-6">
          {/* Storage Box Batches */}
          <div className="idea-card p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[var(--color-idea-border)] pb-3">
              <div>
                <span className="text-[9px] font-medium uppercase tracking-[0.2em] text-[var(--color-idea-muted)]">
                  BATCH REUSABLES
                </span>
                <h3 className="font-bold text-[var(--color-idea-text)] text-base">Storage Boxes</h3>
              </div>
              <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-[var(--color-idea-blue)] text-white">
                {boxAssets.length} Boxes
              </span>
            </div>

            <div className="space-y-3 max-h-72 overflow-y-auto">
              {boxAssets.map((box) => {
                const cat = catalogItems.find(
                  (c) => c.id === box.catalog_item_id || c.item_code === box.catalog_item_id
                );
                const avail = box.available_in_box ?? box.box_capacity ?? 10;
                const cap = box.box_capacity ?? 15;

                return (
                  <div
                    key={box.id}
                    className="p-3.5 idea-gradient-soft border border-[var(--color-idea-blue)]/20 rounded-xl space-y-2"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-xs font-bold text-[var(--color-idea-text)]">{cat?.name}</p>
                        <p className="text-[10px] font-mono text-[var(--color-idea-blue)] font-semibold">
                          {box.asset_code}
                        </p>
                      </div>
                      <span className="text-xs font-mono font-bold text-[var(--color-idea-text)]">
                        {avail}/{cap} Available
                      </span>
                    </div>
                    <div className="w-full bg-[var(--color-idea-border)] h-1.5 rounded-full">
                      <div
                        className="bg-[var(--color-idea-blue)] h-full rounded-full transition-all"
                        style={{
                          width: `${Math.min(100, (avail / cap) * 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Fixed Equipment */}
          <div className="idea-card p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[var(--color-idea-border)] pb-3">
              <div>
                <span className="text-[9px] font-medium uppercase tracking-[0.2em] text-[var(--color-idea-muted)]">
                  INDIVIDUAL TOOLS
                </span>
                <h3 className="font-bold text-[var(--color-idea-text)] text-base">Fixed Equipment</h3>
              </div>
              <span className="text-[10px] font-bold px-2.5 py-1 rounded-full border border-[var(--color-idea-border)] text-[var(--color-idea-text)]">
                {fixedAssets.length} Units
              </span>
            </div>

            <div className="space-y-2.5 max-h-60 overflow-y-auto">
              {fixedAssets.map((asset) => {
                const cat = catalogItems.find(
                  (c) => c.id === asset.catalog_item_id || c.item_code === asset.catalog_item_id
                );
                return (
                  <div
                    key={asset.id}
                    className="p-3 bg-[var(--color-idea-light-grey)] border border-[var(--color-idea-border)] rounded-xl flex items-center justify-between"
                  >
                    <div>
                      <p className="text-xs font-bold text-[var(--color-idea-text)]">{cat?.name}</p>
                      <p className="text-[10px] font-mono text-[var(--color-idea-muted)]">{asset.asset_code}</p>
                    </div>
                    <span
                      className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                        asset.status === 'AVAILABLE'
                          ? 'idea-success'
                          : asset.status === 'UNDER_REPAIR'
                            ? 'idea-warning'
                            : 'idea-info'
                      }`}
                    >
                      {asset.status.replace('_', ' ')}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
