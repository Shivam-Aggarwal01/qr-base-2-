import React, { useMemo } from 'react';
import {
  Boxes,
  MapPin,
  ClipboardList,
  ArrowRight,
  CheckCircle2,
  Wrench,
  ScrollText,
  Users,
  Plus,
} from 'lucide-react';

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

const STATUS_BADGE: Record<string, string> = {
  PENDING: 'idea-warning',
  APPROVED: 'idea-info',
  HANDED_OVER: 'idea-success',
  COMPLETED: 'idea-success',
  REJECTED: 'idea-error',
  CANCELLED: 'idea-error',
};

const getStatusBadge = (status: string) =>
  STATUS_BADGE[status] ?? 'bg-slate-100 text-slate-600 border border-slate-200';

const formatStatus = (status: string) => {
  switch (status) {
    case 'PENDING':
      return 'Pending';
    case 'APPROVED':
      return 'Approved';
    case 'HANDED_OVER':
      return 'Checked Out';
    case 'COMPLETED':
      return 'Completed';
    case 'REJECTED':
      return 'Declined';
    case 'CANCELLED':
      return 'Cancelled';
    default:
      return status.replace(/_/g, ' ');
  }
};

const getTimeAgo = (dateString: string) => {
  const diff = (Date.now() - new Date(dateString).getTime()) / 1000;
  if (diff < 60) return 'Just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
};

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
  onOpenNewRequest,
}) => {
  const studentMode = isStudent(currentUser?.role);

  // ---------------------------------------------------------------------------
  // STUDENT VIEW
  // ---------------------------------------------------------------------------
  if (studentMode && currentUser) {
    const myRequests = requests
      .filter((request) => request.user_id === currentUser.id)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    const pendingRequests = myRequests.filter((r) => r.status === 'PENDING');
    const approvedRequests = myRequests.filter((r) => r.status === 'APPROVED');
    const completedRequests = myRequests.filter((r) => r.status === 'HANDED_OVER' || r.status === 'COMPLETED');
    const visibleRequests = myRequests.filter((r) =>
      ['PENDING', 'APPROVED', 'HANDED_OVER', 'COMPLETED'].includes(r.status)
    );

    const issuedAssets = assets.filter(
      (asset) => asset.assigned_to_user_id === currentUser.id && asset.status === 'ISSUED'
    );

    const reusableItems = myRequests
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
      .filter((item) => item.catalogItemId && item.quantity > 0);

    const currentlyHeldCount = issuedAssets.length + reusableItems.reduce((total, item) => total + item.quantity, 0);

    return (
      <div className="flex-1 overflow-y-auto idea-bg">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6 sm:space-y-8">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-5">
            <div>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[#0071e3]">
                IDEA Lab · Student Desk
              </span>
              <h1 className="mt-1 text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">My Activity</h1>
              <p className="mt-1 text-xs sm:text-sm text-slate-500 max-w-2xl">
                Track your active requests, approvals, and borrowed equipment.
              </p>
            </div>

            {onOpenNewRequest && (
              <button
                type="button"
                onClick={onOpenNewRequest}
                className="idea-button flex items-center justify-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-semibold rounded-xl cursor-pointer shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>New Request</span>
              </button>
            )}
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            {[
              {
                label: 'Pending',
                value: pendingRequests.length,
                sub: 'Awaiting review',
                accent: '#ff9500',
              },
              {
                label: 'Approved',
                value: approvedRequests.length,
                sub: 'Ready for pickup',
                accent: '#0071e3',
              },
              {
                label: 'Checked Out',
                value: currentlyHeldCount,
                sub: 'In your custody',
                accent: '#34c759',
              },
              {
                label: 'Completed',
                value: completedRequests.length,
                sub: 'Returned or consumed',
                accent: '#0b3b60',
              },
            ].map((metric) => (
              <div key={metric.label} className="idea-card relative overflow-hidden p-4 sm:p-5">
                <div className="absolute left-0 top-0 h-1 w-full" style={{ backgroundColor: metric.accent }} />
                <p className="text-xs font-medium text-slate-500">{metric.label}</p>
                <p className="mt-2 text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">{metric.value}</p>
                <p className="mt-1 text-[11px] text-slate-400">{metric.sub}</p>
              </div>
            ))}
          </div>

          {/* Active Requests List */}
          <div className="idea-card overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-200/80 px-5 py-4">
              <div>
                <h2 className="text-sm sm:text-base font-bold text-slate-900">Recent Requests</h2>
                <p className="text-[11px] text-slate-500">Your recent checkout and reservation records</p>
              </div>
              <button
                type="button"
                onClick={() => onSelectView('requests')}
                className="flex items-center gap-1 text-xs font-semibold text-[#0071e3] hover:opacity-80"
              >
                <span>View all</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="divide-y divide-slate-100">
              {visibleRequests.length === 0 ? (
                <div className="py-12 text-center">
                  <ClipboardList className="mx-auto h-8 w-8 text-slate-300" />
                  <p className="mt-2 text-xs font-semibold text-slate-700">No requests yet</p>
                  <p className="mt-0.5 text-[11px] text-slate-400">
                    Submit a new request when you need lab tools or consumables.
                  </p>
                </div>
              ) : (
                visibleRequests.slice(0, 5).map((request) => (
                  <div
                    key={request.id}
                    onClick={() => onSelectView('requests')}
                    className="flex items-center justify-between gap-4 px-5 py-3.5 hover:bg-slate-50 transition-colors cursor-pointer"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-slate-900">{request.request_number}</span>
                        <span
                          className={`inline-flex rounded-md px-2 py-0.5 text-[10px] font-semibold border ${getStatusBadge(
                            request.status
                          )}`}
                        >
                          {formatStatus(request.status)}
                        </span>
                      </div>
                      <p className="mt-0.5 text-xs text-slate-600 truncate">{request.purpose}</p>
                    </div>
                    <span className="text-[11px] text-slate-400 shrink-0 font-medium">
                      {getTimeAgo(request.created_at)}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // STAFF / ADMIN DASHBOARD
  // ---------------------------------------------------------------------------
  const totalStock = useMemo(
    () => stockLevels.reduce((total, stock) => total + Number(stock.quantity || 0), 0),
    [stockLevels]
  );

  const issuedAssets = useMemo(() => assets.filter((asset) => asset.status === 'ISSUED'), [assets]);
  const availableAssets = useMemo(() => assets.filter((asset) => asset.status === 'AVAILABLE'), [assets]);
  const damagedAssets = useMemo(() => assets.filter((asset) => asset.status === 'DAMAGED'), [assets]);
  const repairAssets = useMemo(() => assets.filter((asset) => asset.status === 'UNDER_REPAIR'), [assets]);

  const lowStockItems = useMemo(
    () =>
      catalogItems
        .map((item) => {
          const quantity = stockLevels
            .filter((stock) => stock.catalog_item_id === item.id)
            .reduce((total, stock) => total + Number(stock.quantity || 0), 0);
          return { item, quantity, threshold: item.min_stock_alert ?? 10 };
        })
        .filter(({ threshold, quantity }) => quantity <= threshold),
    [catalogItems, stockLevels]
  );

  const stockByLocation = useMemo(
    () =>
      locations
        .map((location) => ({
          name: location.name,
          qty: stockLevels
            .filter((stock) => stock.location_id === location.id)
            .reduce((total, stock) => total + Number(stock.quantity || 0), 0),
        }))
        .filter((l) => l.qty > 0)
        .sort((a, b) => b.qty - a.qty)
        .slice(0, 5),
    [locations, stockLevels]
  );

  const maxLocationQty = useMemo(() => Math.max(1, ...stockByLocation.map((l) => l.qty)), [stockByLocation]);

  const totalTrackedAssets = assets.length;

  return (
    <div className="flex-1 overflow-y-auto idea-bg">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6 sm:space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-5">
          <div>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-[#0071e3]">
              IDEA Lab · Overview
            </span>
            <h1 className="mt-1 text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">Overview</h1>
            <p className="mt-1 text-xs sm:text-sm text-slate-500 max-w-2xl">
              A live look at equipment, stock, and current requests.
            </p>
          </div>
        </div>

        {/* 4 Main Metrics */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          {[
            {
              label: 'Members',
              value: users.length,
              sub: 'Registered accounts',
              icon: Users,
              accent: '#0071e3',
              view: 'users' as ViewMode,
            },
            {
              label: 'Total Stock',
              value: totalStock,
              sub: 'Units across lab',
              icon: Boxes,
              accent: '#0b3b60',
              view: 'inventory' as ViewMode,
            },
            {
              label: 'Equipment',
              value: assets.length,
              sub: 'Tracked tools & instruments',
              icon: Wrench,
              accent: '#34c759',
              view: 'assets' as ViewMode,
            },
            {
              label: 'Locations',
              value: locations.length,
              sub: 'Workbenches & racks',
              icon: MapPin,
              accent: '#ff9500',
              view: 'locations' as ViewMode,
            },
          ].map((metric) => {
            const Icon = metric.icon;
            return (
              <button
                key={metric.label}
                type="button"
                onClick={() => onSelectView(metric.view)}
                className="idea-card relative cursor-pointer overflow-hidden p-4 sm:p-5 text-left transition-colors hover:border-slate-300"
              >
                <div className="absolute left-0 top-0 h-1 w-full" style={{ backgroundColor: metric.accent }} />
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-500">{metric.label}</span>
                  <Icon className="h-4 w-4 text-slate-400" />
                </div>
                <p className="mt-2 text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">{metric.value}</p>
                <p className="mt-1 text-[11px] text-slate-400 truncate">{metric.sub}</p>
              </button>
            );
          })}
        </div>

        {/* Equipment Status Donut & Location Distribution */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Lightweight Native Donut Chart */}
          <div className="idea-card overflow-hidden lg:col-span-6 flex flex-col justify-between">
            <div className="border-b border-slate-200/80 px-5 py-4">
              <h2 className="text-sm sm:text-base font-bold text-slate-900">Equipment Status</h2>
              <p className="text-[11px] text-slate-500">Live operational condition of tracked tools</p>
            </div>

            <div className="p-5 flex-1 flex flex-col justify-center">
              {totalTrackedAssets === 0 ? (
                <div className="py-8 text-center text-slate-400 text-xs">No equipment tracked yet.</div>
              ) : (
                <div className="flex flex-col sm:flex-row items-center gap-6">
                  {/* Clean Vector Donut */}
                  <div className="relative w-32 h-32 shrink-0 flex items-center justify-center">
                    <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                      <circle cx="50" cy="50" r="40" fill="transparent" stroke="#f1f5f9" strokeWidth="12" />
                      {/* Available segment */}
                      <circle
                        cx="50"
                        cy="50"
                        r="40"
                        fill="transparent"
                        stroke="#34c759"
                        strokeWidth="12"
                        strokeDasharray={`${(availableAssets.length / totalTrackedAssets) * 251.2} 251.2`}
                        strokeDashoffset="0"
                      />
                      {/* Issued segment */}
                      <circle
                        cx="50"
                        cy="50"
                        r="40"
                        fill="transparent"
                        stroke="#0071e3"
                        strokeWidth="12"
                        strokeDasharray={`${(issuedAssets.length / totalTrackedAssets) * 251.2} 251.2`}
                        strokeDashoffset={`-${(availableAssets.length / totalTrackedAssets) * 251.2}`}
                      />
                      {/* Under Repair segment */}
                      <circle
                        cx="50"
                        cy="50"
                        r="40"
                        fill="transparent"
                        stroke="#ff9500"
                        strokeWidth="12"
                        strokeDasharray={`${(repairAssets.length / totalTrackedAssets) * 251.2} 251.2`}
                        strokeDashoffset={`-${((availableAssets.length + issuedAssets.length) / totalTrackedAssets) * 251.2}`}
                      />
                      {/* Damaged segment */}
                      <circle
                        cx="50"
                        cy="50"
                        r="40"
                        fill="transparent"
                        stroke="#ff3b30"
                        strokeWidth="12"
                        strokeDasharray={`${(damagedAssets.length / totalTrackedAssets) * 251.2} 251.2`}
                        strokeDashoffset={`-${((availableAssets.length + issuedAssets.length + repairAssets.length) / totalTrackedAssets) * 251.2}`}
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      <span className="text-xl font-bold text-slate-900">{totalTrackedAssets}</span>
                      <span className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider">Total</span>
                    </div>
                  </div>

                  {/* Legend */}
                  <div className="flex-1 w-full space-y-2">
                    {[
                      { label: 'Available', count: availableAssets.length, color: '#34c759' },
                      { label: 'Checked Out', count: issuedAssets.length, color: '#0071e3' },
                      { label: 'Under Repair', count: repairAssets.length, color: '#ff9500' },
                      { label: 'Damaged / Missing', count: damagedAssets.length, color: '#ff3b30' },
                    ].map((entry) => (
                      <div key={entry.label} className="flex items-center justify-between text-xs">
                        <span className="flex items-center gap-2 text-slate-600">
                          <span
                            className="h-2.5 w-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: entry.color }}
                          />
                          <span>{entry.label}</span>
                        </span>
                        <span className="font-bold text-slate-900">{entry.count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 pt-0">
              <button
                type="button"
                onClick={() => onSelectView('assets')}
                className="w-full py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
              >
                View Equipment
              </button>
            </div>
          </div>

          {/* Stock by Location Breakdown */}
          <div className="idea-card overflow-hidden lg:col-span-6 flex flex-col justify-between">
            <div className="flex items-center justify-between border-b border-slate-200/80 px-5 py-4">
              <div>
                <h2 className="text-sm sm:text-base font-bold text-slate-900">Stock by Location</h2>
                <p className="text-[11px] text-slate-500">Distribution across active storage areas</p>
              </div>
              <button
                type="button"
                onClick={() => onSelectView('locations')}
                className="flex items-center gap-1 text-xs font-semibold text-[#0071e3] hover:opacity-80"
              >
                <span>View all</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="p-5 flex-1 flex flex-col justify-center space-y-3.5">
              {stockByLocation.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-xs">No inventory locations recorded yet.</div>
              ) : (
                stockByLocation.map((loc) => {
                  const pct = Math.round((loc.qty / maxLocationQty) * 100);
                  return (
                    <div key={loc.name} className="space-y-1">
                      <div className="flex items-center justify-between text-xs font-medium">
                        <span className="text-slate-700 truncate">{loc.name}</span>
                        <span className="text-slate-900 font-semibold">{loc.qty} units</span>
                      </div>
                      <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[#0071e3] rounded-full transition-all duration-300"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="p-4 pt-0">
              <button
                type="button"
                onClick={() => onSelectView('inventory')}
                className="w-full py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
              >
                Manage Inventory
              </button>
            </div>
          </div>
        </div>

        {/* Low Stock Alerts + Recent Transactions */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Low Stock Alert */}
          <div className="idea-card overflow-hidden lg:col-span-6">
            <div className="flex items-center justify-between border-b border-slate-200/80 px-5 py-4">
              <div>
                <h2 className="text-sm sm:text-base font-bold text-slate-900">Low Stock Alerts</h2>
                <p className="text-[11px] text-slate-500">Items at or below reorder threshold</p>
              </div>
              <button
                type="button"
                onClick={() => onSelectView('inventory')}
                className="flex items-center gap-1 text-xs font-semibold text-[#0071e3] hover:opacity-80"
              >
                <span>Inventory</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="divide-y divide-slate-100">
              {lowStockItems.length === 0 ? (
                <div className="py-10 text-center">
                  <CheckCircle2 className="mx-auto h-7 w-7 text-emerald-500" />
                  <p className="mt-2 text-xs font-semibold text-slate-700">Healthy stock levels</p>
                  <p className="mt-0.5 text-[11px] text-slate-400">All catalog items are adequately stocked.</p>
                </div>
              ) : (
                lowStockItems.slice(0, 5).map(({ item, quantity, threshold }) => (
                  <div key={item.id} className="flex items-center justify-between px-5 py-3 text-xs">
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-900 truncate">{item.name}</p>
                      <p className="text-[11px] text-slate-400 font-mono">Code: {item.item_code}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="font-bold text-red-600">{quantity}</span>
                      <span className="text-slate-400">
                        {' '}
                        / {threshold} {item.unit}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Recent Activity */}
          <div className="idea-card overflow-hidden lg:col-span-6">
            <div className="flex items-center justify-between border-b border-slate-200/80 px-5 py-4">
              <div>
                <h2 className="text-sm sm:text-base font-bold text-slate-900">Recent Activity</h2>
                <p className="text-[11px] text-slate-500">Latest recorded transactions</p>
              </div>
              <button
                type="button"
                onClick={() => onSelectView('activity')}
                className="flex items-center gap-1 text-xs font-semibold text-[#0071e3] hover:opacity-80"
              >
                <span>Ledger</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="divide-y divide-slate-100">
              {transactions.length === 0 ? (
                <div className="py-10 text-center">
                  <ScrollText className="mx-auto h-7 w-7 text-slate-300" />
                  <p className="mt-2 text-xs font-semibold text-slate-700">No activity yet</p>
                  <p className="mt-0.5 text-[11px] text-slate-400">Inventory transactions will appear here.</p>
                </div>
              ) : (
                transactions.slice(0, 5).map((tx) => (
                  <div key={tx.id} className="flex items-center justify-between gap-3 px-5 py-3 text-xs">
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-900 truncate">
                        {tx.transaction_type} · {tx.quantity} units
                      </p>
                      <p className="text-[11px] text-slate-400 truncate">{tx.remarks || 'Standard update'}</p>
                    </div>
                    <span className="text-[11px] text-slate-400 shrink-0 font-medium">{getTimeAgo(tx.created_at)}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
