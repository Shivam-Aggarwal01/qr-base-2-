import React from 'react';
import {
  Layers,
  AlertCircle,
  ClipboardList,
  ArrowRight,
  QrCode,
  CheckCircle2,
  PackageCheck,
  Box,
  Wrench
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
import { InventoryStorage } from '../services/storage';

interface DashboardViewProps {
  assets: Asset[];
  catalogItems: CatalogItem[];
  locations: Location[];
  requests: Request[];
  transactions: InventoryTransaction[];
  users: User[];
  stockLevels: StockLevel[];
  onSelectView: (view: ViewMode) => void;
  onOpenQRGenerator: (code: string, title: string, subtitle?: string) => void;
  onRefreshData: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  assets,
  catalogItems,
  locations,
  requests,
  transactions,
  users,
  stockLevels,
  onSelectView,
  onOpenQRGenerator,
  onRefreshData
}) => {
  // Stats
  const activeLoans = assets.filter((a) => a.status === 'ISSUED');
  const pendingRequests = requests.filter((r) => r.status === 'PENDING');
  const boxAssets = assets.filter((a) => a.is_box || a.tracking_mode === 'BOX');
  const fixedAssets = assets.filter((a) => !a.is_box && a.tracking_mode !== 'BOX');

  // Low stock calculation
  const lowStockCatalogItems = catalogItems.filter((item) => {
    const itemStock = stockLevels
      .filter((s) => s.catalog_item_id === item.id)
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
                  const asset = assets.find((a) => a.id === tx.asset_id);
                  const catalogItem = catalogItems.find((c) => c.id === (tx.catalog_item_id || asset?.catalog_item_id));
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
                const cat = catalogItems.find((c) => c.id === box.catalog_item_id);
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
                const cat = catalogItems.find((c) => c.id === asset.catalog_item_id);
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
