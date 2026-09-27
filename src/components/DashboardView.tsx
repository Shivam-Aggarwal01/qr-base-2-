import React from 'react';
import {
  Package,
  Boxes,
  MapPin,
  ClipboardList,
  ArrowRight,
  CheckCircle2,
  Wrench,
  ScrollText,
  Users,
} from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts';

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
  STATUS_BADGE[status] ??
  'bg-[var(--color-idea-light-grey)] text-[var(--color-idea-muted)] border border-[var(--color-idea-border)]';

const formatStatus = (status: string) => status.replace(/_/g, ' ');

const getTimeAgo = (dateString: string) => {
  const diff = (Date.now() - new Date(dateString).getTime()) / 1000;

  if (diff < 60) return 'Just now';
  if (diff < 3600) return `${ Math.floor(diff / 60) }m ago`;
  if (diff < 86400) return `${ Math.floor(diff / 3600) }h ago`;

  return `${ Math.floor(diff / 86400) }d ago`;
};

const CHART_COLORS = {
  available: 'var(--color-idea-green)',
  issued: 'var(--color-idea-blue)',
  damaged: 'var(--color-idea-red)',
  repair: 'var(--color-idea-yellow)',
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
  onOpenQRGenerator: _onOpenQRGenerator,
  onRefreshData: _onRefreshData,
  onOpenNewRequest,
}) => {
  const studentMode = isStudent(currentUser?.role);

  /*
   * STUDENT DASHBOARD
   */
  if (studentMode && currentUser) {
    const myRequests = requests.filter((r) => r.user_id === currentUser.id);

    const pendingRequests = myRequests.filter((r) => r.status === 'PENDING');

    const approvedRequests = myRequests.filter((r) => r.status === 'APPROVED');

    const completedRequests = myRequests.filter(
      (r) => r.status === 'HANDED_OVER' || r.status === 'COMPLETED'
    );

    const visibleRequests = myRequests.filter((r) =>
      ['PENDING', 'APPROVED', 'HANDED_OVER', 'COMPLETED'].includes(r.status)
    );

    const issuedAssets = assets.filter(
      (a) => a.assigned_to_user_id === currentUser.id && a.status === 'ISSUED'
    );

    const reusableItems = myRequests
      .filter((r) => r.status === 'HANDED_OVER')
      .flatMap((r) =>
        (r.items ?? [])
          .filter((i) => !i.asset_id && i.usage === 'REUSABLE')
          .map((i) => ({
            id: `${ r.id } -${ i.id } `,
            catalogItemId: i.catalog_item_id || '',
            quantity: Number(i.requested_qty) || 0,
          }))
      )
      .filter((i) => i.catalogItemId && i.quantity > 0);

    const currentlyHeldCount =
      issuedAssets.length +
      reusableItems.reduce((total, item) => total + item.quantity, 0);

    return (
      <div className="flex-1 overflow-y-auto idea-bg">
        <div className="max-w-7xl mx-auto px-6 py-7 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-5 border-b border-idea-border">
            <div>
              <p className="text-[10px] font-semibold tracking-[0.2em] uppercase text-[var(--color-idea-blue)]">
                Student Portal
              </p>

              <h1 className="text-2xl font-bold tracking-tight text-[var(--color-idea-text)] mt-1">
                My Inventory Activity
              </h1>

              <p className="text-xs text-[var(--color-idea-muted)] mt-1">
                Track your requests and items currently issued to you.
              </p>
            </div>

            {onOpenNewRequest && (
              <button
                type="button"
                onClick={onOpenNewRequest}
                className="idea-button inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold cursor-pointer"
              >
                New Request
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              {
                label: 'Pending Requests',
                value: pendingRequests.length,
                sub: 'Waiting for approval',
                bar: 'bg-[var(--color-idea-yellow)]',
              },
              {
                label: 'Approved Requests',
                value: approvedRequests.length,
                sub: 'Awaiting handover',
                bar: 'bg-[var(--color-idea-blue)]',
              },
              {
                label: 'Currently Issued',
                value: currentlyHeldCount,
                sub: 'Items and assets with you',
                bar: 'bg-[var(--color-idea-green)]',
              },
              {
                label: 'Completed Requests',
                value: completedRequests.length,
                sub: 'Successfully handed over',
                bar: 'bg-[var(--color-idea-deep-blue)]',
              },
            ].map((metric) => (
              <div
                key={metric.label}
                className="idea-card p-5 relative overflow-hidden"
              >
                <div
                  className={`absolute top - 0 left - 0 w - full h - 1 ${ metric.bar } `}
                />

                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--color-idea-muted)]">
                  {metric.label}
                </p>

                <p className="text-4xl font-bold text-idea-text mt-2">
                  {metric.value}
                </p>

                <p className="text-[10px] text-idea-muted mt-2">
                  {metric.sub}
                </p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-8 idea-card overflow-hidden">
              <div className="px-5 py-4 border-b border-[var(--color-idea-border)] bg-[var(--color-idea-light-grey)] flex items-center justify-between">
                <div>
                  <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-[var(--color-idea-muted)]">
                    Requests
                  </p>

                  <h2 className="text-base font-bold text-[var(--color-idea-text)] mt-0.5">
                    Recent Requests
                  </h2>
                </div>

                <button
                  type="button"
                  onClick={() => onSelectView('requests')}
                  className="text-xs font-semibold text-[var(--color-idea-blue)] hover:opacity-80 flex items-center gap-1 cursor-pointer"
                >
                  View all
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {visibleRequests.length === 0 ? (
                <div className="p-8 text-center">
                  <ClipboardList className="w-7 h-7 mx-auto text-[var(--color-idea-blue)]" />

                  <p className="text-sm font-semibold text-[var(--color-idea-text)] mt-3">
                    No requests yet
                  </p>

                  <p className="text-xs text-[var(--color-idea-muted)] mt-1">
                    Create a request when you need an item or specific asset.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-[var(--color-idea-border)] max-h-96 overflow-y-auto">
                  {visibleRequests.map((request) => (
                    <div
                      key={request.id}
                      className="px-5 py-4 flex items-center justify-between gap-4 hover:bg-[var(--color-idea-light-grey)]/60 transition-colors"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-mono font-bold text-[var(--color-idea-blue)]">
                            {request.request_number}
                          </span>

                          <span
                            className={`text - [8px] px - 2 py - 0.5 rounded - full font - bold uppercase tracking - wider ${
  getStatusBadge(
    request.status
  )
} `}
                          >
                            {formatStatus(request.status)}
                          </span>
                        </div>

                        <p className="text-xs font-semibold text-[var(--color-idea-text)] mt-1 truncate">
                          {request.purpose}
                        </p>

                        <p className="text-[10px] text-[var(--color-idea-muted)] mt-1 truncate">
                          {(request.items ?? [])
                            .map((item) => {
                              if (item.asset_id) {
                                const asset = assets.find(
                                  (a) => a.id === item.asset_id
                                );

                                return asset?.asset_code || 'Asset';
                              }

                              const catalogItem = catalogItems.find(
                                (c) =>
                                  c.id === item.catalog_item_id ||
                                  c.item_code === item.catalog_item_id
                              );

                              return `${ item.requested_qty } × ${
  catalogItem?.name || 'Item'
} `;
                            })
                            .join(' · ') || 'No line items'}
                        </p>
                      </div>

                      <span className="text-[9px] font-mono text-[var(--color-idea-muted)] shrink-0">
                        {new Date(request.created_at).toLocaleDateString(
                          'en-IN'
                        )}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="lg:col-span-4 idea-card overflow-hidden">
              <div className="px-5 py-4 border-b border-[var(--color-idea-border)] bg-[var(--color-idea-light-grey)] flex items-center justify-between">
                <div>
                  <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-[var(--color-idea-muted)]">
                    Current State
                  </p>

                  <h2 className="text-base font-bold text-[var(--color-idea-text)] mt-0.5">
                    Items With Me
                  </h2>
                </div>

                <Package className="w-4 h-4 text-[var(--color-idea-blue)]" />
              </div>

              {currentlyHeldCount === 0 ? (
                <div className="p-6 text-center">
                  <CheckCircle2 className="w-6 h-6 mx-auto text-[var(--color-idea-green)]" />

                  <p className="text-xs font-semibold text-[var(--color-idea-text)] mt-2">
                    Nothing currently issued
                  </p>

                  <p className="text-[10px] text-[var(--color-idea-muted)] mt-1">
                    Your issued items and assets will appear here.
                  </p>
                </div>
              ) : (
                <div className="p-4 space-y-2.5 max-h-96 overflow-y-auto">
                  {issuedAssets.map((asset) => {
                    const catalogItem = catalogItems.find(
                      (item) =>
                        item.id === asset.catalog_item_id ||
                        item.item_code === asset.catalog_item_id
                    );

                    return (
                      <div
                        key={asset.id}
                        className="p-3 rounded-xl border border-[var(--color-idea-blue)]/20 bg-[var(--color-idea-light-grey)]"
                      >
                        <p className="text-xs font-semibold text-[var(--color-idea-text)]">
                          {catalogItem?.name || 'Asset'}
                        </p>

                        <p className="text-[9px] font-mono text-[var(--color-idea-blue)] mt-1">
                          {asset.asset_code}
                        </p>

                        <span className="inline-flex mt-2 text-[8px] px-2 py-0.5 rounded-full idea-info font-bold uppercase tracking-wide">
                          Issued
                        </span>
                      </div>
                    );
                  })}

                  {reusableItems.map((item) => {
                    const catalogItem = catalogItems.find(
                      (c) =>
                        c.id === item.catalogItemId ||
                        c.item_code === item.catalogItemId
                    );

                    return (
                      <div
                        key={item.id}
                        className="p-3 rounded-xl border border-[var(--color-idea-blue)]/20 bg-[var(--color-idea-light-grey)]"
                      >
                        <p className="text-xs font-semibold text-[var(--color-idea-text)]">
                          {catalogItem?.name || 'Item'}
                        </p>

                        <p className="text-[9px] font-mono text-[var(--color-idea-blue)] mt-1">
                          {item.quantity} {catalogItem?.unit || 'units'}
                        </p>

                        <span className="inline-flex mt-2 text-[8px] px-2 py-0.5 rounded-full idea-info font-bold uppercase tracking-wide">
                          Issued
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  /*
   * STAFF / ADMIN DASHBOARD
   */
  const totalStock = stockLevels.reduce(
    (total, stock) => total + Number(stock.quantity || 0),
    0
  );

  const issuedAssets = assets.filter((asset) => asset.status === 'ISSUED');
  const availableAssets = assets.filter(
    (asset) => asset.status === 'AVAILABLE'
  );
  const damagedAssets = assets.filter(
    (asset) => asset.status === 'DAMAGED'
  );
  const repairAssets = assets.filter(
    (asset) => asset.status === 'UNDER_REPAIR'
  );

  const pendingRequests = requests.filter(
    (request) => request.status === 'PENDING'
  );

  const lowStockItems = catalogItems
    .map((item) => {
      const quantity = stockLevels
        .filter(
          (stock) =>
            stock.catalog_item_id === item.id ||
            stock.catalog_item_id === item.item_code
        )
        .reduce((total, stock) => total + Number(stock.quantity || 0), 0);

      return {
        item,
        quantity,
        threshold: item.min_stock_alert,
      };
    })
    .filter(
      ({ threshold, quantity }) =>
        threshold !== undefined &&
        threshold !== null &&
        quantity <= threshold
    );

  const getTransactionLabel = (type: string) => {
    switch (type) {
      case 'RECEIVE':
        return 'Stock Added';
      case 'ISSUE':
        return 'Issued';
      case 'RETURN':
        return 'Returned';
      case 'MOVE':
        return 'Moved';
      case 'DAMAGE':
        return 'Damaged';
      case 'ADJUSTMENT':
        return 'Adjusted';
      case 'DISPOSAL':
        return 'Disposed';
      default:
        return formatStatus(type);
    }
  };

  const assetStatusData = [
    {
      name: 'Available',
      value: availableAssets.length,
      color: CHART_COLORS.available,
    },
    {
      name: 'Issued',
      value: issuedAssets.length,
      color: CHART_COLORS.issued,
    },
    {
      name: 'Damaged',
      value: damagedAssets.length,
      color: CHART_COLORS.damaged,
    },
    {
      name: 'Under Repair',
      value: repairAssets.length,
      color: CHART_COLORS.repair,
    },
  ].filter((data) => data.value > 0);

  const stockByLocation = locations
    .map((location) => {
      const quantity = stockLevels
        .filter((stock) => stock.location_id === location.id)
        .reduce((total, stock) => total + Number(stock.quantity || 0), 0);

      return {
        name: location.name,
        qty: quantity,
      };
    })
    .filter((location) => location.qty > 0)
    .sort((a, b) => b.qty - a.qty)
    .slice(0, 6);

  return (
    <div className="flex-1 overflow-y-auto idea-bg">
      <div className="max-w-7xl mx-auto px-6 py-7 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-5 border-b border-[var(--color-idea-border)]">
          <div>
            <p className="text-[10px] font-semibold tracking-[0.2em] uppercase text-[var(--color-idea-blue)]">
              AICTE IDEA Lab
            </p>

            <h1 className="text-2xl font-bold tracking-tight text-[var(--color-idea-text)] mt-1">
              Inventory Dashboard
            </h1>

            <p className="text-xs text-[var(--color-idea-muted)] mt-1">
              Current inventory, requests, assets, and activity at a glance.
            </p>
          </div>
        </div>

        {/* Main Metrics */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            {
              label: 'Members',
              value: users.length,
              sub: 'Registered lab members',
              icon: Users,
              color: 'var(--color-idea-blue)',
              view: 'users' as ViewMode,
            },
            {
              label: 'Total Stock',
              value: totalStock,
              sub: 'Across all storage locations',
              icon: Boxes,
              color: 'var(--color-idea-deep-blue)',
              view: 'inventory' as ViewMode,
            },
            {
              label: 'Assets',
              value: assets.length,
              sub: 'Individually tracked equipment',
              icon: Wrench,
              color: 'var(--color-idea-green)',
              view: 'assets' as ViewMode,
            },
            {
              label: 'Locations',
              value: locations.length,
              sub: 'QR-enabled storage units',
              icon: MapPin,
              color: 'var(--color-idea-yellow)',
              view: 'locations' as ViewMode,
            },
          ].map((metric) => {
            const Icon = metric.icon;

            return (
              <button
                key={metric.label}
                type="button"
                onClick={() => onSelectView(metric.view)}
                className="idea-card p-5 text-left relative overflow-hidden hover:border-[var(--color-idea-blue)]/40 transition-colors cursor-pointer"
              >
                <div
                  className="absolute top-0 left-0 w-full h-1"
                  style={{ background: metric.color }}
                />

                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--color-idea-muted)]">
                    {metric.label}
                  </p>

                  <Icon
                    className="w-4 h-4"
                    style={{ color: metric.color }}
                  />
                </div>

                <p className="text-4xl font-bold text-[var(--color-idea-text)] mt-3">
                  {metric.value}
                </p>

                <p className="text-[10px] text-[var(--color-idea-muted)] mt-2">
                  {metric.sub}
                </p>
              </button>
            );
          })}
        </div>

        {/* Asset Status + Stock Distribution */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-6 idea-card overflow-hidden">
            <div className="px-5 py-4 border-b border-[var(--color-idea-border)] bg-[var(--color-idea-light-grey)]">
              <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-[var(--color-idea-muted)]">
                Asset Status
              </p>

              <h2 className="text-base font-bold text-[var(--color-idea-text)] mt-0.5">
                Current Equipment State
              </h2>
            </div>

            <div className="p-5 min-h-[250px] flex flex-col">
              {assetStatusData.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center py-8">
                  <Wrench className="w-7 h-7 text-[var(--color-idea-muted)]" />

                  <p className="text-xs font-semibold text-[var(--color-idea-text)] mt-3">
                    No assets tracked yet
                  </p>

                  <p className="text-[10px] text-[var(--color-idea-muted)] mt-1">
                    Individually tracked equipment will appear here.
                  </p>
                </div>
              ) : (
                <div className="flex-1 flex items-center gap-6">
                  <div className="w-36 h-36 shrink-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={assetStatusData}
                          dataKey="value"
                          nameKey="name"
                          innerRadius={38}
                          outerRadius={62}
                          paddingAngle={2}
                        >
                          {assetStatusData.map((entry) => (
                            <Cell
                              key={entry.name}
                              fill={entry.color}
                            />
                          ))}
                        </Pie>

                        <Tooltip
                          contentStyle={{
                            fontSize: '11px',
                            borderRadius: '8px',
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="flex-1 space-y-2.5">
                    {assetStatusData.map((entry) => (
                      <div
                        key={entry.name}
                        className="flex items-center justify-between text-xs"
                      >
                        <span className="flex items-center gap-2 text-[var(--color-idea-muted)]">
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ background: entry.color }}
                          />
                          {entry.name}
                        </span>

                        <span className="font-bold text-[var(--color-idea-text)]">
                          {entry.value}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <button
                type="button"
                onClick={() => onSelectView('assets')}
                className="w-full mt-4 py-2.5 border border-[var(--color-idea-border)] rounded-xl text-xs font-semibold text-[var(--color-idea-text)] hover:bg-[var(--color-idea-light-grey)] transition-colors cursor-pointer"
              >
                View Assets
              </button>
            </div>
          </div>

          <div className="lg:col-span-6 idea-card overflow-hidden">
            <div className="px-5 py-4 border-b border-[var(--color-idea-border)] bg-[var(--color-idea-light-grey)] flex items-center justify-between">
              <div>
                <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-[var(--color-idea-muted)]">
                  Distribution
                </p>

                <h2 className="text-base font-bold text-[var(--color-idea-text)] mt-0.5">
                  Stock by Location
                </h2>
              </div>

              <button
                type="button"
                onClick={() => onSelectView('locations')}
                className="text-xs font-semibold text-[var(--color-idea-blue)] hover:opacity-80 flex items-center gap-1 cursor-pointer"
              >
                View all
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="p-5 min-h-[250px] flex items-center">
              {stockByLocation.length === 0 ? (
                <div className="w-full text-center">
                  <Boxes className="w-7 h-7 mx-auto text-[var(--color-idea-muted)]" />

                  <p className="text-xs font-semibold text-[var(--color-idea-text)] mt-3">
                    No stock recorded yet
                  </p>

                  <p className="text-[10px] text-[var(--color-idea-muted)] mt-1">
                    Stock distribution will appear here once inventory is added.
                  </p>
                </div>
              ) : (
                <div className="w-full h-52">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={stockByLocation}
                      layout="vertical"
                      margin={{ left: 8, right: 16 }}
                    >
                      <XAxis
                        type="number"
                        tick={{ fontSize: 10 }}
                        stroke="var(--color-idea-muted)"
                      />

                      <YAxis
                        type="category"
                        dataKey="name"
                        tick={{ fontSize: 10 }}
                        width={100}
                        stroke="var(--color-idea-muted)"
                      />

                      <Tooltip
                        contentStyle={{
                          fontSize: '11px',
                          borderRadius: '8px',
                        }}
                      />

                      <Bar
                        dataKey="qty"
                        fill="var(--color-idea-blue)"
                        radius={[0, 4, 4, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Pending Requests + Low Stock */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-6 idea-card overflow-hidden">
            <div className="px-5 py-4 border-b border-[var(--color-idea-border)] bg-[var(--color-idea-light-grey)] flex items-center justify-between">
              <div>
                <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-[var(--color-idea-muted)]">
                  Requires Attention
                </p>

                <h2 className="text-base font-bold text-[var(--color-idea-text)] mt-0.5">
                  Pending Requests

                  {pendingRequests.length > 0 && (
                    <span className="ml-2 text-[10px] font-bold px-2 py-0.5 rounded-full idea-warning align-middle">
                      {pendingRequests.length}
                    </span>
                  )}
                </h2>
              </div>

              <button
                type="button"
                onClick={() => onSelectView('requests')}
                className="text-xs font-semibold text-[var(--color-idea-blue)] hover:opacity-80 flex items-center gap-1 cursor-pointer"
              >
                View all
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {pendingRequests.length === 0 ? (
              <div className="min-h-[190px] flex flex-col items-center justify-center text-center px-6 py-8">
                <CheckCircle2 className="w-7 h-7 text-[var(--color-idea-green)]" />

                <p className="text-xs font-semibold text-[var(--color-idea-text)] mt-3">
                  No pending requests
                </p>

                <p className="text-[10px] text-[var(--color-idea-muted)] mt-1">
                  All current requests have been reviewed.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-[var(--color-idea-border)] max-h-80 overflow-y-auto">
                {pendingRequests.map((request) => {
                  const requester = users.find(
                    (user) => user.id === request.user_id
                  );

                  return (
                    <div
                      key={request.id}
                      className="px-5 py-4 flex items-center justify-between gap-4 hover:bg-[var(--color-idea-light-grey)]/60 transition-colors"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-mono font-bold text-[var(--color-idea-blue)]">
                            {request.request_number}
                          </span>

                          <span
                            className={`text - [8px] px - 2 py - 0.5 rounded - full font - bold uppercase tracking - wider ${
  getStatusBadge(
    request.status
  )
} `}
                          >
                            Pending
                          </span>
                        </div>

                        <p className="text-xs font-semibold text-[var(--color-idea-text)] mt-1 truncate">
                          {requester?.name || 'Unknown user'}
                        </p>

                        <p className="text-[10px] text-[var(--color-idea-muted)] mt-1 truncate">
                          {request.purpose}
                        </p>
                      </div>

                      <div className="text-right shrink-0">
                        <p className="text-[9px] font-mono text-[var(--color-idea-muted)]">
                          {new Date(request.created_at).toLocaleDateString(
                            'en-IN'
                          )}
                        </p>

                        <span className="text-[9px] text-[var(--color-idea-blue)] font-semibold">
                          Review
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="lg:col-span-6 idea-card overflow-hidden">
            <div className="px-5 py-4 border-b border-[var(--color-idea-border)] bg-[var(--color-idea-light-grey)] flex items-center justify-between">
              <div>
                <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-[var(--color-idea-muted)]">
                  Inventory Attention
                </p>

                <h2 className="text-base font-bold text-[var(--color-idea-text)] mt-0.5">
                  Low Stock Items

                  {lowStockItems.length > 0 && (
                    <span className="ml-2 text-[10px] font-bold px-2 py-0.5 rounded-full idea-error align-middle">
                      {lowStockItems.length}
                    </span>
                  )}
                </h2>
              </div>

              <button
                type="button"
                onClick={() => onSelectView('inventory')}
                className="text-xs font-semibold text-[var(--color-idea-blue)] hover:opacity-80 cursor-pointer"
              >
                View inventory
              </button>
            </div>

            {lowStockItems.length === 0 ? (
              <div className="min-h-[190px] flex flex-col items-center justify-center text-center px-6 py-8">
                <CheckCircle2 className="w-7 h-7 text-[var(--color-idea-green)]" />

                <p className="text-xs font-semibold text-[var(--color-idea-text)] mt-3">
                  Stock levels are healthy
                </p>

                <p className="text-[10px] text-[var(--color-idea-muted)] mt-1">
                  No items are currently below their alert threshold.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-[var(--color-idea-border)] max-h-80 overflow-y-auto">
                {lowStockItems.map(({ item, quantity, threshold }) => (
                  <div
                    key={item.id}
                    className="px-5 py-3.5 flex items-center justify-between gap-4"
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-[var(--color-idea-text)] truncate">
                        {item.name}
                      </p>

                      <p className="text-[9px] font-mono text-[var(--color-idea-muted)] mt-0.5">
                        {item.item_code}
                      </p>
                    </div>

                    <div className="text-right shrink-0">
                      <p className="text-xs font-bold text-[var(--color-idea-red)]">
                        {quantity} {item.unit}
                      </p>

                      <p className="text-[9px] text-[var(--color-idea-muted)]">
                        Alert at {threshold}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Recent Ledger */}
        <div className="idea-card overflow-hidden">
          <div className="px-5 py-4 border-b border-[var(--color-idea-border)] bg-[var(--color-idea-light-grey)] flex items-center justify-between">
            <div>
              <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-[var(--color-idea-muted)]">
                Historical Activity
              </p>

              <h2 className="text-base font-bold text-[var(--color-idea-text)] mt-0.5">
                Recent Ledger Entries
              </h2>
            </div>

            <button
              type="button"
              onClick={() => onSelectView('activity')}
              className="text-xs font-semibold text-[var(--color-idea-blue)] hover:opacity-80 flex items-center gap-1 cursor-pointer"
            >
              View ledger
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {transactions.length === 0 ? (
            <div className="min-h-[170px] flex flex-col items-center justify-center text-center px-6 py-8">
              <ScrollText className="w-7 h-7 text-[var(--color-idea-muted)]" />

              <p className="text-xs font-semibold text-[var(--color-idea-text)] mt-3">
                No ledger entries yet
              </p>

              <p className="text-[10px] text-[var(--color-idea-muted)] mt-1">
                Meaningful inventory events will appear here.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-[var(--color-idea-border)] max-h-80 overflow-y-auto">
              {transactions.map((transaction) => {
                const asset = assets.find(
                  (item) =>
                    item.id === transaction.asset_id ||
                    item.asset_code === transaction.asset_id
                );

                const catalogItem = catalogItems.find(
                  (item) =>
                    item.id ===
                      (transaction.catalog_item_id ||
                        asset?.catalog_item_id) ||
                    item.item_code ===
                      (transaction.catalog_item_id ||
                        asset?.catalog_item_id)
                );

                const performer = users.find(
                  (user) =>
                    user.id === transaction.processed_by_user_id
                );

                return (
                  <div
                    key={transaction.id}
                    className="px-5 py-3.5 flex items-center justify-between gap-4 hover:bg-[var(--color-idea-light-grey)]/60 transition-colors"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-[var(--color-idea-text)] truncate">
                          {catalogItem?.name ||
                            asset?.asset_code ||
                            'Unknown entity'}
                        </span>

                        <span className="text-[8px] px-2 py-0.5 rounded-full idea-info font-bold uppercase tracking-wide shrink-0">
                          {getTransactionLabel(
                            transaction.transaction_type
                          )}
                        </span>
                      </div>

                      <p className="text-[9px] text-[var(--color-idea-muted)] mt-1 truncate">
                        {performer?.name || 'System'}
                        {transaction.remarks
                          ? ` · ${ transaction.remarks } `
                          : ''}
                      </p>
                    </div>

                    <span className="text-[9px] font-mono text-[var(--color-idea-muted)] shrink-0">
                      {getTimeAgo(transaction.created_at)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

