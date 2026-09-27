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
  onOpenQRGenerator: (
    code: string,
    title: string,
    subtitle?: string
  ) => void;
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
  const diff =
    (Date.now() - new Date(dateString).getTime()) / 1000;

  if (diff < 60) return 'Just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;

  return `${Math.floor(diff / 86400)}d ago`;
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
   * catalog_item_id must always reference CatalogItem.id.
   *
   * item_code is only a human-readable/searchable code.
   * It must not be used as a foreign key.
   */
  const findCatalogItem = (catalogItemId?: string) => {
    if (!catalogItemId) {
      return undefined;
    }

    return catalogItems.find(
      (item) => item.id === catalogItemId
    );
  };

  /*
   * STUDENT DASHBOARD
   */
  if (studentMode && currentUser) {
    const myRequests = requests.filter(
      (request) => request.user_id === currentUser.id
    );

    const pendingRequests = myRequests.filter(
      (request) => request.status === 'PENDING'
    );

    const approvedRequests = myRequests.filter(
      (request) => request.status === 'APPROVED'
    );

    const completedRequests = myRequests.filter(
      (request) =>
        request.status === 'HANDED_OVER' ||
        request.status === 'COMPLETED'
    );

    const visibleRequests = myRequests.filter((request) =>
      [
        'PENDING',
        'APPROVED',
        'HANDED_OVER',
        'COMPLETED',
      ].includes(request.status)
    );

    const issuedAssets = assets.filter(
      (asset) =>
        asset.assigned_to_user_id === currentUser.id &&
        asset.status === 'ISSUED'
    );

    const reusableItems = myRequests
      .filter((request) => request.status === 'HANDED_OVER')
      .flatMap((request) =>
        (request.items ?? [])
          .filter(
            (item) =>
              !item.asset_id &&
              item.usage === 'REUSABLE'
          )
          .map((item) => ({
            id: `${request.id}-${item.id}`,
            catalogItemId: item.catalog_item_id || '',
            quantity: Number(item.requested_qty) || 0,
          }))
      )
      .filter(
        (item) =>
          item.catalogItemId &&
          item.quantity > 0
      );

    const currentlyHeldCount =
      issuedAssets.length +
      reusableItems.reduce(
        (total, item) => total + item.quantity,
        0
      );

    return (
      <div className="flex-1 overflow-y-auto idea-bg">
        <div className="mx-auto max-w-7xl space-y-6 px-6 py-7">
          <div className="flex flex-col justify-between gap-4 border-b border-[var(--color-idea-border)] pb-5 sm:flex-row sm:items-end">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--color-idea-blue)]">
                Student Portal
              </p>

              <h1 className="mt-1 text-2xl font-bold tracking-tight text-[var(--color-idea-text)]">
                My Inventory Activity
              </h1>

              <p className="mt-1 text-xs text-[var(--color-idea-muted)]">
                Track your requests and items currently issued
                to you.
              </p>
            </div>

            {onOpenNewRequest && (
              <button
                type="button"
                onClick={onOpenNewRequest}
                className="idea-button inline-flex cursor-pointer items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold"
              >
                New Request
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
                className="idea-card relative overflow-hidden p-5"
              >
                <div
                  className={`absolute left-0 top-0 h-1 w-full ${metric.bar}`}
                />

                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--color-idea-muted)]">
                  {metric.label}
                </p>

                <p className="mt-2 text-4xl font-bold text-[var(--color-idea-text)]">
                  {metric.value}
                </p>

                <p className="mt-2 text-[10px] text-[var(--color-idea-muted)]">
                  {metric.sub}
                </p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            <div className="idea-card overflow-hidden lg:col-span-8">
              <div className="flex items-center justify-between border-b border-[var(--color-idea-border)] bg-[var(--color-idea-light-grey)] px-5 py-4">
                <div>
                  <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-[var(--color-idea-muted)]">
                    Requests
                  </p>

                  <h2 className="mt-0.5 text-base font-bold text-[var(--color-idea-text)]">
                    Recent Requests
                  </h2>
                </div>

                <button
                  type="button"
                  onClick={() => onSelectView('requests')}
                  className="flex cursor-pointer items-center gap-1 text-xs font-semibold text-[var(--color-idea-blue)] hover:opacity-80"
                >
                  View all
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>

              {visibleRequests.length === 0 ? (
                <div className="p-8 text-center">
                  <ClipboardList className="mx-auto h-7 w-7 text-[var(--color-idea-blue)]" />

                  <p className="mt-3 text-sm font-semibold text-[var(--color-idea-text)]">
                    No requests yet
                  </p>

                  <p className="mt-1 text-xs text-[var(--color-idea-muted)]">
                    Create a request when you need an item or
                    specific asset.
                  </p>
                </div>
              ) : (
                <div className="max-h-96 divide-y divide-[var(--color-idea-border)] overflow-y-auto">
                  {visibleRequests.map((request) => (
                    <div
                      key={request.id}
                      className="flex items-center justify-between gap-4 px-5 py-4 transition-colors hover:bg-[var(--color-idea-light-grey)]/60"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[10px] font-bold text-[var(--color-idea-blue)]">
                            {request.request_number}
                          </span>

                          <span
                            className={`rounded-full px-2 py-0.5 text-[8px] font-bold uppercase tracking-wider ${getStatusBadge(
                              request.status
                            )}`}
                          >
                            {formatStatus(request.status)}
                          </span>
                        </div>

                        <p className="mt-1 truncate text-xs font-semibold text-[var(--color-idea-text)]">
                          {request.purpose}
                        </p>

                        <p className="mt-1 truncate text-[10px] text-[var(--color-idea-muted)]">
                          {(request.items ?? [])
                            .map((item) => {
                              if (item.asset_id) {
                                const asset = assets.find(
                                  (assetItem) =>
                                    assetItem.id ===
                                    item.asset_id
                                );

                                return (
                                  asset?.asset_code ||
                                  'Asset'
                                );
                              }

                              /*
                               * RequestLine.catalog_item_id
                               * references CatalogItem.id.
                               */
                              const catalogItem =
                                findCatalogItem(
                                  item.catalog_item_id
                                );

                              return `${item.requested_qty} × ${catalogItem?.name || 'Item'
                                }`;
                            })
                            .join(' · ') || 'No line items'}
                        </p>
                      </div>

                      <span className="shrink-0 font-mono text-[9px] text-[var(--color-idea-muted)]">
                        {new Date(
                          request.created_at
                        ).toLocaleDateString('en-IN')}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="idea-card overflow-hidden lg:col-span-4">
              <div className="flex items-center justify-between border-b border-[var(--color-idea-border)] bg-[var(--color-idea-light-grey)] px-5 py-4">
                <div>
                  <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-[var(--color-idea-muted)]">
                    Current State
                  </p>

                  <h2 className="mt-0.5 text-base font-bold text-[var(--color-idea-text)]">
                    Items With Me
                  </h2>
                </div>

                <Package className="h-4 w-4 text-[var(--color-idea-blue)]" />
              </div>

              {currentlyHeldCount === 0 ? (
                <div className="p-6 text-center">
                  <CheckCircle2 className="mx-auto h-6 w-6 text-[var(--color-idea-green)]" />

                  <p className="mt-2 text-xs font-semibold text-[var(--color-idea-text)]">
                    Nothing currently issued
                  </p>

                  <p className="mt-1 text-[10px] text-[var(--color-idea-muted)]">
                    Your issued items and assets will appear
                    here.
                  </p>
                </div>
              ) : (
                <div className="max-h-96 space-y-2.5 overflow-y-auto p-4">
                  {issuedAssets.map((asset) => {
                    /*
                     * Asset.catalog_item_id
                     * references CatalogItem.id.
                     */
                    const catalogItem =
                      findCatalogItem(
                        asset.catalog_item_id
                      );

                    return (
                      <div
                        key={asset.id}
                        className="rounded-xl border border-[var(--color-idea-blue)]/20 bg-[var(--color-idea-light-grey)] p-3"
                      >
                        <p className="text-xs font-semibold text-[var(--color-idea-text)]">
                          {catalogItem?.name || 'Asset'}
                        </p>

                        <p className="mt-1 font-mono text-[9px] text-[var(--color-idea-blue)]">
                          {asset.asset_code}
                        </p>

                        <span className="idea-info mt-2 inline-flex rounded-full px-2 py-0.5 text-[8px] font-bold uppercase tracking-wide">
                          Issued
                        </span>
                      </div>
                    );
                  })}

                  {reusableItems.map((item) => {
                    /*
                     * Reusable request items also use
                     * CatalogItem.id.
                     */
                    const catalogItem =
                      findCatalogItem(
                        item.catalogItemId
                      );

                    return (
                      <div
                        key={item.id}
                        className="rounded-xl border border-[var(--color-idea-blue)]/20 bg-[var(--color-idea-light-grey)] p-3"
                      >
                        <p className="text-xs font-semibold text-[var(--color-idea-text)]">
                          {catalogItem?.name || 'Item'}
                        </p>

                        <p className="mt-1 font-mono text-[9px] text-[var(--color-idea-blue)]">
                          {item.quantity}{' '}
                          {catalogItem?.unit || 'units'}
                        </p>

                        <span className="idea-info mt-2 inline-flex rounded-full px-2 py-0.5 text-[8px] font-bold uppercase tracking-wide">
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
    (total, stock) =>
      total + Number(stock.quantity || 0),
    0
  );

  const issuedAssets = assets.filter(
    (asset) => asset.status === 'ISSUED'
  );

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

  /*
   * StockLevel.catalog_item_id must equal CatalogItem.id.
   *
   * Do NOT compare it with item.item_code here.
   */
  const lowStockItems = catalogItems
    .map((item) => {
      const quantity = stockLevels
        .filter(
          (stock) =>
            stock.catalog_item_id === item.id
        )
        .reduce(
          (total, stock) =>
            total + Number(stock.quantity || 0),
          0
        );

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
        .filter(
          (stock) =>
            stock.location_id === location.id
        )
        .reduce(
          (total, stock) =>
            total + Number(stock.quantity || 0),
          0
        );

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
      <div className="mx-auto max-w-7xl space-y-6 px-6 py-7">
        {/* Header */}
        <div className="flex flex-col justify-between gap-4 border-b border-[var(--color-idea-border)] pb-5 sm:flex-row sm:items-end">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--color-idea-blue)]">
              AICTE IDEA Lab
            </p>

            <h1 className="mt-1 text-2xl font-bold tracking-tight text-[var(--color-idea-text)]">
              Inventory Dashboard
            </h1>

            <p className="mt-1 text-xs text-[var(--color-idea-muted)]">
              Current inventory, requests, assets, and activity
              at a glance.
            </p>
          </div>
        </div>

        {/* Main Metrics */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
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
                onClick={() =>
                  onSelectView(metric.view)
                }
                className="idea-card relative cursor-pointer overflow-hidden p-5 text-left transition-colors hover:border-[var(--color-idea-blue)]/40"
              >
                <div
                  className="absolute left-0 top-0 h-1 w-full"
                  style={{ background: metric.color }}
                />

                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--color-idea-muted)]">
                    {metric.label}
                  </p>

                  <Icon
                    className="h-4 w-4"
                    style={{ color: metric.color }}
                  />
                </div>

                <p className="mt-3 text-4xl font-bold text-[var(--color-idea-text)]">
                  {metric.value}
                </p>

                <p className="mt-2 text-[10px] text-[var(--color-idea-muted)]">
                  {metric.sub}
                </p>
              </button>
            );
          })}
        </div>

        {/* Asset Status + Stock Distribution */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <div className="idea-card overflow-hidden lg:col-span-6">
            <div className="border-b border-[var(--color-idea-border)] bg-[var(--color-idea-light-grey)] px-5 py-4">
              <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-[var(--color-idea-muted)]">
                Asset Status
              </p>

              <h2 className="mt-0.5 text-base font-bold text-[var(--color-idea-text)]">
                Current Equipment State
              </h2>
            </div>

            <div className="flex min-h-[250px] flex-col p-5">
              {assetStatusData.length === 0 ? (
                <div className="flex flex-1 flex-col items-center justify-center py-8 text-center">
                  <Wrench className="h-7 w-7 text-[var(--color-idea-muted)]" />

                  <p className="mt-3 text-xs font-semibold text-[var(--color-idea-text)]">
                    No assets tracked yet
                  </p>

                  <p className="mt-1 text-[10px] text-[var(--color-idea-muted)]">
                    Individually tracked equipment will appear
                    here.
                  </p>
                </div>
              ) : (
                <div className="flex flex-1 items-center gap-6">
                  <div className="h-36 w-36 shrink-0">
                    <ResponsiveContainer
                      width="100%"
                      height="100%"
                    >
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
                            className="h-2.5 w-2.5 shrink-0 rounded-full"
                            style={{
                              background: entry.color,
                            }}
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
                className="mt-4 w-full cursor-pointer rounded-xl border border-[var(--color-idea-border)] py-2.5 text-xs font-semibold text-[var(--color-idea-text)] transition-colors hover:bg-[var(--color-idea-light-grey)]"
              >
                View Assets
              </button>
            </div>
          </div>

          <div className="idea-card overflow-hidden lg:col-span-6">
            <div className="flex items-center justify-between border-b border-[var(--color-idea-border)] bg-[var(--color-idea-light-grey)] px-5 py-4">
              <div>
                <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-[var(--color-idea-muted)]">
                  Distribution
                </p>

                <h2 className="mt-0.5 text-base font-bold text-[var(--color-idea-text)]">
                  Stock by Location
                </h2>
              </div>

              <button
                type="button"
                onClick={() => onSelectView('locations')}
                className="flex cursor-pointer items-center gap-1 text-xs font-semibold text-[var(--color-idea-blue)] hover:opacity-80"
              >
                View all
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="flex min-h-[250px] items-center p-5">
              {stockByLocation.length === 0 ? (
                <div className="w-full text-center">
                  <Boxes className="mx-auto h-7 w-7 text-[var(--color-idea-muted)]" />

                  <p className="mt-3 text-xs font-semibold text-[var(--color-idea-text)]">
                    No stock recorded yet
                  </p>

                  <p className="mt-1 text-[10px] text-[var(--color-idea-muted)]">
                    Stock distribution will appear here once
                    inventory is added.
                  </p>
                </div>
              ) : (
                <div className="h-52 w-full">
                  <ResponsiveContainer
                    width="100%"
                    height="100%"
                  >
                    <BarChart
                      data={stockByLocation}
                      layout="vertical"
                      margin={{
                        left: 8,
                        right: 16,
                      }}
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
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <div className="idea-card overflow-hidden lg:col-span-6">
            <div className="flex items-center justify-between border-b border-[var(--color-idea-border)] bg-[var(--color-idea-light-grey)] px-5 py-4">
              <div>
                <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-[var(--color-idea-muted)]">
                  Requires Attention
                </p>

                <h2 className="mt-0.5 text-base font-bold text-[var(--color-idea-text)]">
                  Pending Requests

                  {pendingRequests.length > 0 && (
                    <span className="idea-warning ml-2 rounded-full px-2 py-0.5 align-middle text-[10px] font-bold">
                      {pendingRequests.length}
                    </span>
                  )}
                </h2>
              </div>

              <button
                type="button"
                onClick={() => onSelectView('requests')}
                className="flex cursor-pointer items-center gap-1 text-xs font-semibold text-[var(--color-idea-blue)] hover:opacity-80"
              >
                View all
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>

            {pendingRequests.length === 0 ? (
              <div className="flex min-h-[190px] flex-col items-center justify-center px-6 py-8 text-center">
                <CheckCircle2 className="h-7 w-7 text-[var(--color-idea-green)]" />

                <p className="mt-3 text-xs font-semibold text-[var(--color-idea-text)]">
                  No pending requests
                </p>

                <p className="mt-1 text-[10px] text-[var(--color-idea-muted)]">
                  All current requests have been reviewed.
                </p>
              </div>
            ) : (
              <div className="max-h-80 divide-y divide-[var(--color-idea-border)] overflow-y-auto">
                {pendingRequests.map((request) => {
                  const requester = users.find(
                    (user) => user.id === request.user_id
                  );

                  return (
                    <div
                      key={request.id}
                      className="flex items-center justify-between gap-4 px-5 py-4 transition-colors hover:bg-[var(--color-idea-light-grey)]/60"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[10px] font-bold text-[var(--color-idea-blue)]">
                            {request.request_number}
                          </span>

                          <span
                            className={`rounded-full px-2 py-0.5 text-[8px] font-bold uppercase tracking-wider ${getStatusBadge(
                              request.status
                            )}`}
                          >
                            Pending
                          </span>
                        </div>

                        <p className="mt-1 truncate text-xs font-semibold text-[var(--color-idea-text)]">
                          {requester?.name ||
                            'Unknown user'}
                        </p>

                        <p className="mt-1 truncate text-[10px] text-[var(--color-idea-muted)]">
                          {request.purpose}
                        </p>
                      </div>

                      <div className="shrink-0 text-right">
                        <p className="font-mono text-[9px] text-[var(--color-idea-muted)]">
                          {new Date(
                            request.created_at
                          ).toLocaleDateString('en-IN')}
                        </p>

                        <span className="text-[9px] font-semibold text-[var(--color-idea-blue)]">
                          Review
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="idea-card overflow-hidden lg:col-span-6">
            <div className="flex items-center justify-between border-b border-[var(--color-idea-border)] bg-[var(--color-idea-light-grey)] px-5 py-4">
              <div>
                <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-[var(--color-idea-muted)]">
                  Inventory Attention
                </p>

                <h2 className="mt-0.5 text-base font-bold text-[var(--color-idea-text)]">
                  Low Stock Items

                  {lowStockItems.length > 0 && (
                    <span className="idea-error ml-2 rounded-full px-2 py-0.5 align-middle text-[10px] font-bold">
                      {lowStockItems.length}
                    </span>
                  )}
                </h2>
              </div>

              <button
                type="button"
                onClick={() => onSelectView('inventory')}
                className="cursor-pointer text-xs font-semibold text-[var(--color-idea-blue)] hover:opacity-80"
              >
                View inventory
              </button>
            </div>

            {lowStockItems.length === 0 ? (
              <div className="flex min-h-[190px] flex-col items-center justify-center px-6 py-8 text-center">
                <CheckCircle2 className="h-7 w-7 text-[var(--color-idea-green)]" />

                <p className="mt-3 text-xs font-semibold text-[var(--color-idea-text)]">
                  Stock levels are healthy
                </p>

                <p className="mt-1 text-[10px] text-[var(--color-idea-muted)]">
                  No items are currently below their alert
                  threshold.
                </p>
              </div>
            ) : (
              <div className="max-h-80 divide-y divide-[var(--color-idea-border)] overflow-y-auto">
                {lowStockItems.map(
                  ({ item, quantity, threshold }) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between gap-4 px-5 py-3.5"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-xs font-semibold text-[var(--color-idea-text)]">
                          {item.name}
                        </p>

                        <p className="mt-0.5 font-mono text-[9px] text-[var(--color-idea-muted)]">
                          {item.item_code}
                        </p>
                      </div>

                      <div className="shrink-0 text-right">
                        <p className="text-xs font-bold text-[var(--color-idea-red)]">
                          {quantity} {item.unit}
                        </p>

                        <p className="text-[9px] text-[var(--color-idea-muted)]">
                          Alert at {threshold}
                        </p>
                      </div>
                    </div>
                  )
                )}
              </div>
            )}
          </div>
        </div>

        {/* Recent Ledger */}
        <div className="idea-card overflow-hidden">
          <div className="flex items-center justify-between border-b border-[var(--color-idea-border)] bg-[var(--color-idea-light-grey)] px-5 py-4">
            <div>
              <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-[var(--color-idea-muted)]">
                Historical Activity
              </p>

              <h2 className="mt-0.5 text-base font-bold text-[var(--color-idea-text)]">
                Recent Ledger Entries
              </h2>
            </div>

            <button
              type="button"
              onClick={() => onSelectView('activity')}
              className="flex cursor-pointer items-center gap-1 text-xs font-semibold text-[var(--color-idea-blue)] hover:opacity-80"
            >
              View ledger
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>

          {transactions.length === 0 ? (
            <div className="flex min-h-[170px] flex-col items-center justify-center px-6 py-8 text-center">
              <ScrollText className="h-7 w-7 text-[var(--color-idea-muted)]" />

              <p className="mt-3 text-xs font-semibold text-[var(--color-idea-text)]">
                No ledger entries yet
              </p>

              <p className="mt-1 text-[10px] text-[var(--color-idea-muted)]">
                Meaningful inventory events will appear here.
              </p>
            </div>
          ) : (
            <div className="max-h-80 divide-y divide-[var(--color-idea-border)] overflow-y-auto">
              {transactions.map((transaction) => {
                const asset = assets.find(
                  (assetItem) =>
                    assetItem.id ===
                    transaction.asset_id
                );

                /*
                 * InventoryTransaction.catalog_item_id
                 * references CatalogItem.id.
                 *
                 * If the transaction is asset-based, the
                 * asset's catalog_item_id is used as fallback.
                 */
                const catalogItemId =
                  transaction.catalog_item_id ||
                  asset?.catalog_item_id;

                const catalogItem =
                  findCatalogItem(catalogItemId);

                const performer = users.find(
                  (user) =>
                    user.id ===
                    transaction.processed_by_user_id
                );

                return (
                  <div
                    key={transaction.id}
                    className="flex items-center justify-between gap-4 px-5 py-3.5 transition-colors hover:bg-[var(--color-idea-light-grey)]/60"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-xs font-semibold text-[var(--color-idea-text)]">
                          {catalogItem?.name ||
                            asset?.asset_code ||
                            'Unknown entity'}
                        </span>

                        <span className="idea-info shrink-0 rounded-full px-2 py-0.5 text-[8px] font-bold uppercase tracking-wide">
                          {getTransactionLabel(
                            transaction.transaction_type
                          )}
                        </span>
                      </div>

                      <p className="mt-1 truncate text-[9px] text-[var(--color-idea-muted)]">
                        {performer?.name || 'System'}

                        {transaction.remarks
                          ? ` · ${transaction.remarks}`
                          : ''}
                      </p>
                    </div>

                    <span className="shrink-0 font-mono text-[9px] text-[var(--color-idea-muted)]">
                      {getTimeAgo(
                        transaction.created_at
                      )}
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
