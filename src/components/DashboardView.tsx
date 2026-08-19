import React from 'react';
import {
  Layers,
  AlertCircle,
  ClipboardList,
  ArrowRight,
  QrCode,
  CheckCircle2,
  Package
} from 'lucide-react';
import {
  Asset,
  CatalogItem,
  Location,
  Request,
  InventoryTransaction,
  User,
  StockLevel,
  ViewMode
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
      return 'border-amber-700 bg-amber-50 text-amber-800';
    case 'PARTIAL':
      return 'border-blue-700 bg-blue-50 text-blue-800';
    case 'COMPLETED':
      return 'border-emerald-700 bg-emerald-50 text-emerald-800';
    case 'CANCELLED':
      return 'border-red-700 bg-red-50 text-red-800';
    default:
      return 'border-[#1A1A1A]/30 bg-[#EBE5DE] text-[#1A1A1A]';
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
  onOpenNewRequest
}) => {
  const studentMode = isStudent(currentUser?.role);

  if (studentMode && currentUser) {
    const myRequests = requests.filter((r) => r.user_id === currentUser.id);
    const myPending = myRequests.filter((r) => r.status === 'PENDING');
    const myPartial = myRequests.filter((r) => r.status === 'PARTIAL');
    const myCompleted = myRequests.filter((r) => r.status === 'COMPLETED');
    const myAssigned = assets.filter(
      (a) => a.assigned_to_user_id === currentUser.id && a.status === 'ISSUED'
    );

    return (
      <div className="flex-1 space-y-8 p-8 overflow-y-auto max-w-7xl mx-auto w-full paper-texture">
        <div className="border-b border-[#1A1A1A]/15 pb-4 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <span className="text-[10px] font-mono tracking-[0.25em] uppercase text-[#6C6863]">
              STUDENT PORTAL
            </span>
            <h1 className="font-serif text-3xl font-bold text-[#1A1A1A] mt-1">
              My Lab <span className="font-serif italic font-normal text-[#D4AF37]">Requests</span>
            </h1>
            <p className="text-xs text-[#6C6863] mt-1 font-serif">
              Request items and check whether they are pending, issued, or completed.
            </p>
          </div>
          {onOpenNewRequest && (
            <button
              onClick={onOpenNewRequest}
              className="flex items-center gap-2 bg-[#1A1A1A] hover:bg-[#D4AF37] text-white px-5 py-2.5 text-xs font-mono font-bold uppercase tracking-widest transition-colors cursor-pointer border border-[#1A1A1A]"
            >
              Request Item
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 border border-[#1A1A1A]/20 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-amber-600" />
            <span className="text-[10px] font-mono font-bold text-[#6C6863] uppercase tracking-[0.2em]">
              Pending Requests
            </span>
            <h2 className="font-serif text-5xl font-bold text-[#1A1A1A] mt-3">{myPending.length}</h2>
            <p className="text-xs font-mono text-[#6C6863] mt-3">Awaiting staff review</p>
          </div>
          <div className="bg-white p-6 border border-[#1A1A1A]/20 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-blue-700" />
            <span className="text-[10px] font-mono font-bold text-[#6C6863] uppercase tracking-[0.2em]">
              Partial / In Progress
            </span>
            <h2 className="font-serif text-5xl font-bold text-[#1A1A1A] mt-3">{myPartial.length}</h2>
            <p className="text-xs font-mono text-[#6C6863] mt-3">Some items still outstanding</p>
          </div>
          <div className="bg-white p-6 border border-[#1A1A1A]/20 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-emerald-700" />
            <span className="text-[10px] font-mono font-bold text-[#6C6863] uppercase tracking-[0.2em]">
              Assigned To Me
            </span>
            <h2 className="font-serif text-5xl font-bold text-[#1A1A1A] mt-3">{myAssigned.length}</h2>
            <p className="text-xs font-mono text-[#6C6863] mt-3">Reusable items currently issued to you</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-8 bg-white border border-[#1A1A1A]/20 shadow-sm overflow-hidden">
            <div className="px-6 py-5 border-b border-[#1A1A1A]/15 flex items-center justify-between bg-[#F9F8F6]">
              <div>
                <span className="text-[9px] font-mono uppercase tracking-[0.2em] text-[#6C6863]">MY SLIPS</span>
                <h3 className="font-serif font-bold text-[#1A1A1A] text-lg">Request Status</h3>
              </div>
              <button
                onClick={() => onSelectView('requests')}
                className="text-xs font-mono font-bold uppercase text-[#1A1A1A] hover:text-[#D4AF37] flex items-center gap-1 cursor-pointer"
              >
                View all <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
            {myRequests.length === 0 ? (
              <div className="p-8 text-center space-y-2">
                <ClipboardList className="w-8 h-8 text-[#D4AF37] mx-auto" />
                <p className="text-sm font-serif text-[#1A1A1A]">You have not requested any items yet.</p>
                <p className="text-xs text-[#6C6863]">Scan a QR code or raise a requisition slip to get started.</p>
              </div>
            ) : (
              <div className="divide-y divide-[#1A1A1A]/10">
                {myRequests.slice(0, 8).map((req) => (
                  <div key={req.id} className="px-6 py-4 flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-xs font-mono font-bold text-[#D4AF37]">{req.request_number}</p>
                        <span className={`text-[9px] px-2 py-0.5 border font-mono font-bold uppercase tracking-widest ${getStatusBadge(req.status)}`}>
                          {req.status}
                        </span>
                      </div>
                      <p className="text-sm font-serif font-bold text-[#1A1A1A] mt-1 truncate">"{req.purpose}"</p>
                      <p className="text-[11px] text-[#6C6863] mt-1">
                        {(req.items ?? []).map((item) => {
                          const cat = catalogItems.find((c) => c.id === item.catalog_item_id);
                          return `${item.requested_qty} × ${cat?.name || 'Item'}`;
                        }).join(' · ') || 'No line items'}
                      </p>
                    </div>
                    <p className="text-[10px] font-mono text-[#6C6863] shrink-0">
                      {new Date(req.created_at).toLocaleDateString()}
                    </p>
                  </div>
                ))}
              </div>
            )}
            <p className="px-6 py-3 text-[10px] font-mono text-[#6C6863] border-t border-[#1A1A1A]/10">
              {myCompleted.length} completed of {myRequests.length} total requests
            </p>
          </div>

          <div className="lg:col-span-4 bg-white border border-[#1A1A1A]/20 shadow-sm p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[#1A1A1A]/10 pb-3">
              <div>
                <span className="text-[9px] font-mono uppercase tracking-[0.2em] text-[#6C6863]">LOANS</span>
                <h3 className="font-serif font-bold text-[#1A1A1A] text-base">Items With Me</h3>
              </div>
              <Package className="w-4 h-4 text-[#D4AF37]" />
            </div>
            {myAssigned.length === 0 ? (
              <p className="text-xs text-[#6C6863] italic">No reusable equipment is currently assigned to you.</p>
            ) : (
              <div className="space-y-2.5 max-h-80 overflow-y-auto">
                {myAssigned.map((asset) => {
                  const cat = catalogItems.find((c) => c.id === asset.catalog_item_id || c.item_code === asset.catalog_item_id);
                  return (
                    <div key={asset.id} className="p-3 bg-[#F9F8F6] border border-[#1A1A1A]/10">
                      <p className="text-xs font-serif font-bold text-[#1A1A1A]">{cat?.name || 'Asset'}</p>
                      <p className="text-[10px] font-mono text-[#D4AF37]">{asset.asset_code}</p>
                      <p className="text-[10px] font-mono text-[#6C6863] mt-1">Status: ISSUED</p>
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

  // Stats
  const activeLoans = assets.filter((a) => a.status === 'ISSUED');
  const pendingRequests = requests.filter((r) => r.status === 'PENDING');
  const boxAssets = assets.filter((a) => a.is_box || a.tracking_mode === 'BOX');
  const fixedAssets = assets.filter((a) => !a.is_box && a.tracking_mode !== 'BOX');

  // Low stock calculation
  const lowStockCatalogItems = catalogItems.filter((item) => {
    const itemStock = stockLevels
      .filter((s) => s.catalog_item_id === item.id || s.catalog_item_id === item.item_code)
      .reduce((sum, s) => sum + s.quantity, 0);
    return item.min_stock_alert ? itemStock <= item.min_stock_alert : itemStock < 10;
  });

  const getTransactionBadge = (type: string) => {
    switch (type) {
      case 'RETURN':
        return 'border-emerald-700 bg-emerald-50 text-emerald-800';
      case 'ISSUE':
        return 'border-blue-700 bg-blue-50 text-blue-800';
      case 'DAMAGE':
        return 'border-amber-700 bg-amber-50 text-amber-800';
      case 'DISPOSAL':
        return 'border-red-700 bg-red-50 text-red-800';
      default:
        return 'border-[#1A1A1A]/30 bg-[#EBE5DE] text-[#1A1A1A]';
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
    <div className="flex-1 space-y-8 p-8 overflow-y-auto max-w-7xl mx-auto w-full paper-texture">
      {/* Editorial Header */}
      <div className="border-b border-[#1A1A1A]/15 pb-4 flex justify-between items-end">
        <div>
          <span className="text-[10px] font-mono tracking-[0.25em] uppercase text-[#6C6863]">SYSTEM OVERVIEW • SUMMARY</span>
          <h1 className="font-serif text-3xl font-bold text-[#1A1A1A] mt-1">
            Electronics Laboratory <span className="font-serif italic font-normal text-[#D4AF37]">Ledger</span>
          </h1>
        </div>
        <div className="text-right font-mono text-xs text-[#6C6863]">
          <span>STORAGE BOXES: {boxAssets.length} BATCHES</span> • <span>FIXED TOOLS: {fixedAssets.length} UNITS</span>
        </div>
      </div>

      {/* Hero Metric Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Active Loans */}
        <div className="bg-white p-6 border border-[#1A1A1A]/20 shadow-sm relative overflow-hidden flex flex-col justify-between">
          <div className="absolute top-0 left-0 w-full h-1 bg-[#D4AF37]" />
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono font-bold text-[#6C6863] uppercase tracking-[0.2em]">Active Student Loans</span>
              <div className="p-2 bg-[#1A1A1A] text-[#D4AF37]">
                <Layers className="w-4 h-4" />
              </div>
            </div>
            <h2 className="font-serif text-5xl font-bold text-[#1A1A1A] mt-3">{activeLoans.length}</h2>
          </div>
          <div className="flex items-center gap-2 text-emerald-800 text-xs font-mono font-medium mt-4">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>Assigned student equipment records</span>
          </div>
        </div>

        {/* Low Stock Alert */}
        <div
          onClick={() => onSelectView('inventory')}
          className="bg-white p-6 border border-[#1A1A1A]/20 shadow-sm relative overflow-hidden flex flex-col justify-between hover:border-[#D4AF37] transition-all cursor-pointer group"
        >
          <div className="absolute top-0 left-0 w-full h-1 bg-red-700" />
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono font-bold text-[#6C6863] uppercase tracking-[0.2em]">Restock Alerts</span>
              <div className="p-2 bg-red-50 text-red-700 border border-red-200">
                <AlertCircle className="w-4 h-4" />
              </div>
            </div>
            <h2 className="font-serif text-5xl font-bold text-red-800 mt-3">
              {String(lowStockCatalogItems.length).padStart(2, '0')}
            </h2>
          </div>
          <div className="text-xs text-[#6C6863] font-mono flex justify-between items-center mt-4">
            <span>Capacitors, Resistors, LEDs</span>
            <ArrowRight className="w-3.5 h-3.5 text-[#1A1A1A] group-hover:translate-x-1 transition-transform" />
          </div>
        </div>

        {/* Pending Requisitions */}
        <div
          onClick={() => onSelectView('requests')}
          className="bg-white p-6 border border-[#1A1A1A]/20 shadow-sm relative overflow-hidden flex flex-col justify-between hover:border-[#D4AF37] transition-all cursor-pointer group"
        >
          <div className="absolute top-0 left-0 w-full h-1 bg-[#1A1A1A]" />
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono font-bold text-[#6C6863] uppercase tracking-[0.2em]">Pending Requisitions</span>
              <div className="p-2 bg-[#1A1A1A] text-white">
                <ClipboardList className="w-4 h-4" />
              </div>
            </div>
            <h2 className="font-serif text-5xl font-bold text-[#1A1A1A] mt-3">{pendingRequests.length}</h2>
          </div>
          <div className="mt-4">
            <div className="bg-[#EBE5DE] h-1.5 w-full overflow-hidden">
              <div
                className="bg-[#D4AF37] h-full transition-all duration-500"
                style={{
                  width: `${Math.min(100, (pendingRequests.length / Math.max(1, requests.length)) * 100)}%`
                }}
              />
            </div>
            <p className="text-[10px] font-mono text-[#6C6863] mt-1.5 text-right">
              {pendingRequests.length} of {requests.length} total pending review
            </p>
          </div>
        </div>
      </div>

      {/* Main Content Split */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Recent Ledger Activity Table */}
        <div className="lg:col-span-8 bg-white border border-[#1A1A1A]/20 shadow-sm overflow-hidden flex flex-col">
          <div className="px-6 py-5 border-b border-[#1A1A1A]/15 flex items-center justify-between bg-[#F9F8F6]">
            <div>
              <span className="text-[9px] font-mono uppercase tracking-[0.2em] text-[#6C6863]">AUDIT TRAIL</span>
              <h3 className="font-serif font-bold text-[#1A1A1A] text-lg">Recent Inventory Movements</h3>
            </div>
            <button
              onClick={() => onSelectView('activity')}
              className="text-xs font-mono font-bold uppercase text-[#1A1A1A] hover:text-[#D4AF37] flex items-center gap-1 cursor-pointer"
            >
              <span>Full Audit History</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="text-[10px] font-mono font-bold text-[#6C6863] uppercase tracking-[0.2em] border-b border-[#1A1A1A]/10 bg-[#F9F8F6]">
                  <th className="px-6 py-3.5">Item / Asset Tag</th>
                  <th className="px-6 py-3.5">Type</th>
                  <th className="px-6 py-3.5">Member / Tech</th>
                  <th className="px-6 py-3.5">Storage Bin</th>
                  <th className="px-6 py-3.5 text-right">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1A1A1A]/10">
                {transactions.slice(0, 6).map((tx) => {
                  const asset = assets.find((a) => a.id === tx.asset_id || a.asset_code === tx.asset_id);
                  const catalogItem = catalogItems.find((c) => 
                    c.id === (tx.catalog_item_id || asset?.catalog_item_id) ||
                    c.item_code === (tx.catalog_item_id || asset?.catalog_item_id)
                  );
                  const user = users.find((u) => u.id === tx.issued_to_user_id || u.id === tx.processed_by_user_id);
                  const loc = locations.find((l) => l.id === (tx.to_location_id || tx.from_location_id));

                  const displayCode = asset?.asset_code || catalogItem?.item_code || 'N/A';

                  return (
                    <tr key={tx.id} className="hover:bg-[#F9F8F6] transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => onOpenQRGenerator(displayCode, catalogItem?.name || displayCode, 'Inventory Tag')}
                            className="w-7 h-7 bg-[#1A1A1A] text-[#D4AF37] hover:bg-[#D4AF37] hover:text-[#1A1A1A] flex items-center justify-center transition-colors cursor-pointer"
                            title="Generate QR Label"
                          >
                            <QrCode className="w-3.5 h-3.5" />
                          </button>
                          <div>
                            <p className="text-xs font-serif font-bold text-[#1A1A1A]">{catalogItem?.name || 'Unknown Item'}</p>
                            <p className="text-[10px] font-mono text-[#D4AF37] font-semibold">{displayCode}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`px-2.5 py-0.5 border text-[9px] font-mono font-bold uppercase tracking-widest ${getTransactionBadge(
                            tx.transaction_type
                          )}`}
                        >
                          {tx.transaction_type}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs font-medium text-[#1A1A1A]">{user?.name || 'System Log'}</td>
                      <td className="px-6 py-4 text-xs font-mono text-[#6C6863]">
                        {loc ? loc.name : tx.issued_to_user_id ? `Loan (${user?.user_code})` : 'Lab Bin'}
                      </td>
                      <td className="px-6 py-4 text-xs font-mono text-[#6C6863] text-right">{getTimeAgo(tx.created_at)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Column: Storage Boxes & Fixed Tools Status */}
        <div className="lg:col-span-4 space-y-6">
          {/* Storage Box Batches Overview */}
          <div className="bg-white border border-[#1A1A1A]/20 shadow-sm p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[#1A1A1A]/10 pb-3">
              <div>
                <span className="text-[9px] font-mono uppercase tracking-[0.2em] text-[#6C6863]">BATCH REUSABLES</span>
                <h3 className="font-serif font-bold text-[#1A1A1A] text-base">Storage Boxes</h3>
              </div>
              <span className="text-[10px] font-mono bg-[#1A1A1A] text-[#D4AF37] font-bold px-2.5 py-1">
                {boxAssets.length} Boxes
              </span>
            </div>

            <div className="space-y-3 max-h-72 overflow-y-auto">
              {boxAssets.map((box) => {
                const cat = catalogItems.find((c) => c.id === box.catalog_item_id || c.item_code === box.catalog_item_id);
                const avail = box.available_in_box ?? box.box_capacity ?? 10;
                const cap = box.box_capacity ?? 15;

                return (
                  <div key={box.id} className="p-3.5 bg-[#F9F8F6] border border-[#1A1A1A]/10 space-y-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-xs font-serif font-bold text-[#1A1A1A]">{cat?.name}</p>
                        <p className="text-[10px] font-mono text-[#D4AF37] font-semibold">{box.asset_code}</p>
                      </div>
                      <span className="text-xs font-mono font-bold text-[#1A1A1A]">
                        {avail}/{cap} Available
                      </span>
                    </div>
                    <div className="w-full bg-[#EBE5DE] h-1.5">
                      <div
                        className="bg-[#D4AF37] h-full transition-all"
                        style={{ width: `${Math.min(100, (avail / cap) * 100)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Standalone Tools Status */}
          <div className="bg-white border border-[#1A1A1A]/20 shadow-sm p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[#1A1A1A]/10 pb-3">
              <div>
                <span className="text-[9px] font-mono uppercase tracking-[0.2em] text-[#6C6863]">INDIVIDUAL TOOLS</span>
                <h3 className="font-serif font-bold text-[#1A1A1A] text-base">Fixed Equipment</h3>
              </div>
              <span className="text-[10px] font-mono border border-[#1A1A1A] text-[#1A1A1A] font-bold px-2.5 py-1">
                {fixedAssets.length} Units
              </span>
            </div>

            <div className="space-y-2.5 max-h-60 overflow-y-auto">
              {fixedAssets.map((asset) => {
                const cat = catalogItems.find((c) => c.id === asset.catalog_item_id || c.item_code === asset.catalog_item_id);
                return (
                  <div key={asset.id} className="p-3 bg-[#F9F8F6] border border-[#1A1A1A]/10 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-serif font-bold text-[#1A1A1A]">{cat?.name}</p>
                      <p className="text-[10px] font-mono text-[#6C6863]">{asset.asset_code}</p>
                    </div>
                    <span
                      className={`text-[9px] px-2 py-0.5 border font-mono font-bold uppercase tracking-wider ${
                        asset.status === 'AVAILABLE'
                          ? 'border-emerald-700 bg-emerald-50 text-emerald-800'
                          : asset.status === 'UNDER_REPAIR'
                          ? 'border-amber-700 bg-amber-50 text-amber-800'
                          : 'border-blue-700 bg-blue-50 text-blue-800'
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
