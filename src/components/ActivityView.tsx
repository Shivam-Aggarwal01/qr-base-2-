import React, { useState } from 'react';
import {
  Search,
  ArrowDownToLine,
  ArrowUpFromLine,
  RotateCcw,
  AlertTriangle,
  Trash2,
  ArrowLeftRight,
  SlidersHorizontal,
  ScrollText,
} from 'lucide-react';
import {
  InventoryTransaction,
  CatalogItem,
  Asset,
  Location,
  User,
  TransactionType,
} from '../types/inventory';

interface ActivityViewProps {
  transactions: InventoryTransaction[];
  catalogItems: CatalogItem[];
  assets: Asset[];
  locations: Location[];
  users: User[];
  onOpenQRGenerator: (
    code: string,
    title: string,
    subtitle?: string
  ) => void;
}

type FilterType = TransactionType | 'ALL';

const TYPE_CONFIG: Record<
  string,
  { label: string; icon: React.ReactNode; badge: string }
> = {
  RECEIVE: {
    label: 'Stock In',
    icon: <ArrowDownToLine className="w-3.5 h-3.5" />,
    badge: 'bg-blue-50 text-[var(--color-idea-blue)] border-blue-100',
  },
  ISSUE: {
    label: 'Issued',
    icon: <ArrowUpFromLine className="w-3.5 h-3.5" />,
    badge: 'bg-indigo-50 text-[var(--color-idea-deep-blue)] border-indigo-100',
  },
  RETURN: {
    label: 'Returned',
    icon: <RotateCcw className="w-3.5 h-3.5" />,
    badge: 'bg-green-50 text-[var(--color-idea-green)] border-green-100',
  },
  MOVE: {
    label: 'Moved',
    icon: <ArrowLeftRight className="w-3.5 h-3.5" />,
    badge: 'bg-yellow-50 text-[#927500] border-yellow-100',
  },
  DAMAGE: {
    label: 'Damaged',
    icon: <AlertTriangle className="w-3.5 h-3.5" />,
    badge: 'bg-amber-50 text-amber-700 border-amber-100',
  },
  ADJUSTMENT: {
    label: 'Adjusted',
    icon: <SlidersHorizontal className="w-3.5 h-3.5" />,
    badge: 'bg-gray-50 text-[var(--color-idea-muted)] border-[var(--color-idea-border)]',
  },
  DISPOSAL: {
    label: 'Disposed',
    icon: <Trash2 className="w-3.5 h-3.5" />,
    badge: 'bg-red-50 text-[var(--color-idea-red)] border-red-100',
  },
};

const FILTER_TABS: FilterType[] = [
  'ALL',
  'RECEIVE',
  'ISSUE',
  'RETURN',
  'MOVE',
  'DAMAGE',
  'ADJUSTMENT',
];

const formatDateTime = (iso: string) => {
  const date = new Date(iso);
  return {
    date: date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
    time: date.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    }),
  };
};

export const ActivityView: React.FC<ActivityViewProps> = ({
  transactions,
  catalogItems,
  assets,
  locations,
  users,
}) => {
  const [typeFilter, setTypeFilter] = useState<FilterType>('ALL');
  const [searchFilter, setSearchFilter] = useState('');

  const findCatalogItem = (tx: InventoryTransaction) => {
    if (!tx.catalog_item_id) return undefined;
    return catalogItems.find(
      (item) => item.id === tx.catalog_item_id || item.item_code === tx.catalog_item_id
    );
  };

  const findAsset = (tx: InventoryTransaction) => {
    if (!tx.asset_id) return undefined;
    return assets.find((asset) => asset.id === tx.asset_id);
  };

  const findPerformer = (tx: InventoryTransaction) =>
    users.find(
      (user) => user.id === tx.processed_by_user_id || user.id === tx.issued_to_user_id
    );

  const filteredTxs = transactions.filter((tx) => {
    if (typeFilter !== 'ALL' && tx.transaction_type !== typeFilter) return false;
    if (!searchFilter.trim()) return true;

    const query = searchFilter.trim().toLowerCase();
    const asset = findAsset(tx);
    const catalogItem = findCatalogItem(tx);
    const performer = findPerformer(tx);

    return Boolean(
      asset?.name?.toLowerCase().includes(query) ||
      asset?.asset_code?.toLowerCase().includes(query) ||
      asset?.serial_number?.toLowerCase().includes(query) ||
      catalogItem?.name?.toLowerCase().includes(query) ||
      catalogItem?.item_code?.toLowerCase().includes(query) ||
      performer?.name?.toLowerCase().includes(query) ||
      tx.remarks?.toLowerCase().includes(query)
    );
  });

  const tabCount = (type: FilterType) =>
    type === 'ALL'
      ? transactions.length
      : transactions.filter((tx) => tx.transaction_type === type).length;

  // Single compact "movement" string instead of a dedicated Details column.
  const renderMovement = (
    tx: InventoryTransaction,
    fromLocation?: Location,
    toLocation?: Location,
    recipient?: User
  ) => {
    switch (tx.transaction_type) {
      case 'RECEIVE':
        return toLocation ? `Into ${toLocation.name}` : '—';
      case 'ISSUE':
        return recipient ? `To ${recipient.name}` : fromLocation ? `From ${fromLocation.name}` : '—';
      case 'RETURN':
        return recipient?.name
          ? `From ${recipient.name}`
          : fromLocation
            ? `From ${fromLocation.name}`
            : '—';
      case 'MOVE':
        return fromLocation && toLocation
          ? `${fromLocation.name} → ${toLocation.name}`
          : '—';
      case 'DAMAGE':
      case 'DISPOSAL':
        return fromLocation ? `at ${fromLocation.name}` : tx.remarks || '—';
      case 'ADJUSTMENT':
        return fromLocation ? `at ${fromLocation.name}` : 'Stock corrected';
      default:
        return '—';
    }
  };

  return (
    <div className="flex-1 overflow-y-auto idea-bg">
      <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6 sm:space-y-8">
        {/* Standard Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--color-idea-border)] pb-5 sm:pb-6">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-idea-blue)]">
                IDEA Lab · Activity
              </span>
            </div>
            <h1 className="mt-1 text-2xl sm:text-3xl font-bold tracking-tight text-[var(--color-idea-text)]">
              Activity
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-[var(--color-idea-muted)] max-w-2xl leading-relaxed">
              A clear history of equipment checkouts, returns, and inventory adjustments.
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="idea-card p-3 sm:p-4">
          <div className="flex flex-col lg:flex-row lg:items-center gap-3 sm:gap-4">
            <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 flex-1 min-w-0">
              {FILTER_TABS.map((type) => {
                const active = typeFilter === type;
                const count = tabCount(type);
                const config = TYPE_CONFIG[type];

                return (
                  <button
                    key={type}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setTypeFilter(type)}
                    className={`inline-flex items-center gap-1.5 shrink-0 px-3 py-2 rounded-lg border text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--color-idea-blue)] ${active
                        ? 'bg-[var(--color-idea-blue)] text-white border-[var(--color-idea-blue)]'
                        : 'bg-white text-[var(--color-idea-muted)] border-[var(--color-idea-border)] hover:text-[var(--color-idea-text)] hover:border-[var(--color-idea-blue)]/40'
                      }`}
                  >
                    {type !== 'ALL' && config?.icon}
                    <span>{type === 'ALL' ? 'All Activity' : config?.label ?? type}</span>
                    <span
                      className={`min-w-5 text-center text-[9px] font-bold px-1.5 py-0.5 rounded-full ${active
                          ? 'bg-white/20 text-white'
                          : 'bg-[var(--color-idea-light-grey)] text-[var(--color-idea-muted)]'
                        }`}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="relative w-full lg:w-72 shrink-0">
              <Search className="w-4 h-4 text-[var(--color-idea-muted)] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchFilter}
                onChange={(event) => setSearchFilter(event.target.value)}
                placeholder="Search activity by item, user, or note…"
                aria-label="Search activity"
                className="idea-input w-full pl-9 pr-3 py-2 text-xs sm:text-sm"
              />
            </div>
          </div>
        </div>

        {/* Empty State */}
        {filteredTxs.length === 0 ? (
          <div className="idea-card min-h-72 p-10 flex flex-col items-center justify-center text-center">
            <div className="w-14 h-14 rounded-2xl idea-gradient-soft flex items-center justify-center mb-4">
              <ScrollText className="w-6 h-6 text-[var(--color-idea-blue)]" />
            </div>
            <h2 className="text-sm font-semibold text-[var(--color-idea-text)]">No activity found</h2>
            <p className="max-w-sm text-xs text-[var(--color-idea-muted)] mt-1">
              {typeFilter !== 'ALL'
                ? `There are no ${TYPE_CONFIG[typeFilter]?.label.toLowerCase() ?? typeFilter.toLowerCase()} entries matching the current filters.`
                : searchFilter
                  ? 'Try a different item, asset, user, or remark.'
                  : 'Inventory activity will appear here as transactions are recorded.'}
            </p>
          </div>
        ) : (
          <div className="idea-card overflow-hidden flex flex-col">
            {/* Scroll container: header stays put, body scrolls */}
            <div className="overflow-y-auto max-h-[65vh]">
              {/* Table Header — sticky, 4 columns instead of 6 */}
              <div className="hidden md:grid grid-cols-[110px_90px_1fr_170px] gap-4 px-5 py-3 bg-[var(--color-idea-light-grey)] border-b border-[var(--color-idea-border)] sticky top-0 z-10">
                {['Activity', 'When', 'Item & Movement', 'Performed By'].map((label) => (
                  <span
                    key={label}
                    className="text-[9px] font-bold uppercase tracking-[0.16em] text-[var(--color-idea-muted)]"
                  >
                    {label}
                  </span>
                ))}
              </div>

              <div className="divide-y divide-[var(--color-idea-border)]">
                {filteredTxs.map((tx) => {
                  const asset = findAsset(tx);
                  const catalogItem = findCatalogItem(tx);

                  const fromLocation = locations.find((l) => l.id === tx.from_location_id);
                  const toLocation = locations.find((l) => l.id === tx.to_location_id);
                  const recipient = users.find((u) => u.id === tx.issued_to_user_id);
                  const performer = users.find((u) => u.id === tx.processed_by_user_id);

                  const isAssetTransaction = Boolean(tx.asset_id);
                  const displayName = isAssetTransaction
                    ? asset?.name || asset?.asset_code || 'Unknown asset'
                    : catalogItem?.name || 'Unknown item';
                  const config = TYPE_CONFIG[tx.transaction_type];
                  const { date, time } = formatDateTime(tx.created_at);
                  const movement = renderMovement(tx, fromLocation, toLocation, recipient);
                  const qty = tx.quantity ?? (isAssetTransaction ? null : '—');

                  return (
                    <div
                      key={tx.id}
                      className="px-5 py-3.5 hover:bg-[var(--color-idea-light-grey)]/50 transition-colors"
                    >
                      {/* Desktop / tablet row */}
                      <div className="hidden md:grid grid-cols-[110px_90px_1fr_170px] gap-4 items-center">
                        {/* Activity */}
                        <span
                          className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-lg border text-[9px] font-bold uppercase tracking-wide whitespace-nowrap w-fit ${config?.badge ?? 'bg-gray-50 text-gray-500 border-gray-100'
                            }`}
                        >
                          {config?.icon}
                          {config?.label ?? tx.transaction_type}
                        </span>

                        {/* When */}
                        <div className="leading-tight">
                          <p className="text-[11px] font-semibold text-[var(--color-idea-text)]">{date}</p>
                          <p className="text-[10px] text-[var(--color-idea-muted)] font-mono">{time}</p>
                        </div>

                        {/* Item & Movement combined */}
                        <div className="min-w-0 flex items-baseline gap-2">
                          <div className="min-w-0">
                            <span className="text-xs font-semibold text-[var(--color-idea-text)]">
                              {displayName}
                            </span>
                            {qty !== null && (
                              <span className="text-[9px] font-mono text-[var(--color-idea-muted)] ml-1.5">
                                ×{qty}
                                {!isAssetTransaction && catalogItem?.unit ? ` ${catalogItem.unit}` : ''}
                              </span>
                            )}
                            <p className="text-[10px] text-[var(--color-idea-muted)] truncate mt-0.5">
                              {movement}
                            </p>
                          </div>
                        </div>

                        {/* Performer + remark */}
                        <div className="min-w-0">
                          <span className="text-xs font-medium text-[var(--color-idea-text)] truncate">
                            {performer?.name || '—'}
                          </span>
                          {tx.remarks && (
                            <p className="text-[10px] text-[var(--color-idea-muted)] italic truncate mt-0.5">
                              {tx.remarks}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Mobile: compact stacked card */}
                      <div className="md:hidden space-y-2">
                        <div className="flex items-start justify-between gap-3">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-lg border text-[9px] font-bold uppercase tracking-wide whitespace-nowrap ${config?.badge ?? 'bg-gray-50 text-gray-500 border-gray-100'
                              }`}
                          >
                            {config?.icon}
                            {config?.label ?? tx.transaction_type}
                          </span>
                          <span className="text-[10px] text-[var(--color-idea-muted)] shrink-0">
                            {date} · {time}
                          </span>
                        </div>

                        <p className="text-sm font-semibold text-[var(--color-idea-text)]">
                          {displayName}
                        </p>

                        <div className="flex items-center justify-between text-xs text-[var(--color-idea-muted)]">
                          <span>{movement}</span>
                          {qty !== null && <span className="font-mono">×{qty}</span>}
                        </div>

                        <div className="text-[11px] text-[var(--color-idea-text)]">
                          {performer?.name || '—'}
                        </div>
                        {tx.remarks && (
                          <div className="text-[11px] text-[var(--color-idea-muted)] italic">{tx.remarks}</div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Footer */}
            <div className="px-5 py-3 border-t border-[var(--color-idea-border)] bg-[var(--color-idea-light-grey)]/50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5">
              <p className="text-[10px] text-[var(--color-idea-muted)]">
                Showing{' '}
                <span className="font-bold text-[var(--color-idea-text)]">{filteredTxs.length}</span> of{' '}
                <span className="font-bold text-[var(--color-idea-text)]">{transactions.length}</span> entries
              </p>
              <p className="text-[9px] text-[var(--color-idea-muted)]">Append-only ledger</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
