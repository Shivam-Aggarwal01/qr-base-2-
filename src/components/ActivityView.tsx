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
import { InventoryTransaction, CatalogItem, Asset, Location, User, TransactionType } from '../types/inventory';

interface ActivityViewProps {
  transactions: InventoryTransaction[];
  catalogItems: CatalogItem[];
  assets: Asset[];
  locations: Location[];
  users: User[];
  onOpenQRGenerator: (code: string, title: string, subtitle?: string) => void;
}

type FilterType = TransactionType | 'ALL';

const TYPE_CONFIG: Record<string, { label: string; icon: React.ReactNode; badge: string }> = {
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

const FILTER_TABS: FilterType[] = ['ALL', 'RECEIVE', 'ISSUE', 'RETURN', 'MOVE', 'DAMAGE', 'ADJUSTMENT'];

const formatDateTime = (iso: string) => {
  const date = new Date(iso);

  return {
    date: date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }),
    time: date.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    }),
  };
};

export const ActivityView: React.FC<ActivityViewProps> = ({ transactions, catalogItems, assets, locations, users }) => {
  const [typeFilter, setTypeFilter] = useState<FilterType>('ALL');
  const [searchFilter, setSearchFilter] = useState('');

  const findCatalogItem = (tx: InventoryTransaction, asset?: Asset) => {
    const catalogId = tx.catalog_item_id || asset?.catalog_item_id;

    return catalogItems.find((item) => item.id === catalogId || item.item_code === catalogId);
  };

  const findPerformer = (tx: InventoryTransaction) => {
    return users.find((user) => user.id === tx.processed_by_user_id || user.id === tx.issued_to_user_id);
  };

  const filteredTxs = transactions.filter((tx) => {
    if (typeFilter !== 'ALL' && tx.transaction_type !== typeFilter) {
      return false;
    }

    if (!searchFilter.trim()) {
      return true;
    }

    const query = searchFilter.trim().toLowerCase();
    const asset = assets.find((item) => item.id === tx.asset_id);
    const catalogItem = findCatalogItem(tx, asset);
    const performer = findPerformer(tx);

    return Boolean(
      catalogItem?.name.toLowerCase().includes(query) ||
      catalogItem?.item_code.toLowerCase().includes(query) ||
      asset?.asset_code.toLowerCase().includes(query) ||
      performer?.name.toLowerCase().includes(query) ||
      tx.remarks?.toLowerCase().includes(query)
    );
  });

  const tabCount = (type: FilterType) => {
    if (type === 'ALL') {
      return transactions.length;
    }

    return transactions.filter((tx) => tx.transaction_type === type).length;
  };

  // Builds a short human-readable description of the movement/context
  // for a transaction, tailored to its activity type rather than a
  // generic from/to fallback that doesn't fit every case.
  const renderDetail = (tx: InventoryTransaction, fromLocation?: Location, toLocation?: Location, recipient?: User) => {
    switch (tx.transaction_type) {
      case 'RECEIVE':
        return toLocation ? (
          <span className="truncate">
            <span className="text-[var(--color-idea-muted)]">Into</span>{' '}
            <span className="font-medium text-[var(--color-idea-text)]">{toLocation.name}</span>
          </span>
        ) : (
          <span className="text-[var(--color-idea-muted)]">—</span>
        );

      case 'ISSUE':
        return recipient ? (
          <span className="truncate">
            <span className="text-[var(--color-idea-muted)]">To</span>{' '}
            <span className="font-semibold text-[var(--color-idea-blue)]">{recipient.name}</span>
          </span>
        ) : fromLocation ? (
          <span className="truncate">
            <span className="text-[var(--color-idea-muted)]">From</span>{' '}
            <span className="font-medium text-[var(--color-idea-text)]">{fromLocation.name}</span>
          </span>
        ) : (
          <span className="text-[var(--color-idea-muted)]">—</span>
        );

      case 'RETURN':
        return fromLocation || recipient ? (
          <span className="truncate">
            <span className="text-[var(--color-idea-muted)]">From</span>{' '}
            <span className="font-medium text-[var(--color-idea-text)]">{recipient?.name || fromLocation?.name}</span>
          </span>
        ) : (
          <span className="text-[var(--color-idea-muted)]">—</span>
        );

      case 'MOVE':
        return fromLocation && toLocation ? (
          <div className="flex items-center gap-2 min-w-0">
            <span className="truncate text-[var(--color-idea-muted)]">{fromLocation.name}</span>
            <ArrowLeftRight className="w-3 h-3 shrink-0 text-[var(--color-idea-muted)]" />
            <span className="truncate font-medium text-[var(--color-idea-text)]">{toLocation.name}</span>
          </div>
        ) : (
          <span className="text-[var(--color-idea-muted)]">—</span>
        );

      case 'DAMAGE':
      case 'DISPOSAL':
        return (
          <span className="truncate text-[var(--color-idea-muted)]">
            {fromLocation ? `at ${fromLocation.name}` : tx.remarks ? tx.remarks : '—'}
          </span>
        );

      case 'ADJUSTMENT':
        return (
          <span className="truncate text-[var(--color-idea-muted)]">
            {fromLocation ? `at ${fromLocation.name}` : 'Stock corrected'}
          </span>
        );

      default:
        return <span className="text-[var(--color-idea-muted)]">—</span>;
    }
  };

  return (
    <div className="flex-1 overflow-y-auto idea-bg">
      <div className="max-w-6xl mx-auto px-6 py-7 space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <span className="text-[10px] font-medium tracking-[0.25em] uppercase text-[var(--color-idea-muted)]">
              Activity Ledger
            </span>
            <h2 className="text-2xl font-bold text-[var(--color-idea-text)] tracking-tight mt-1">
              Transaction <span className="text-[var(--color-idea-blue)]">Records</span>
            </h2>
          </div>
        </div>

        {/* Filters */}
        <div className="idea-card p-3">
          <div className="flex flex-col lg:flex-row lg:items-center gap-3">
            {/* Activity Filters */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 flex-1 min-w-0">
              {FILTER_TABS.map((type) => {
                const active = typeFilter === type;
                const count = tabCount(type);
                const config = TYPE_CONFIG[type];

                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setTypeFilter(type)}
                    className={`inline-flex items-center gap-1.5 shrink-0 px-3 py-2 rounded-lg border text-[10px] font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                      active
                        ? 'bg-[var(--color-idea-blue)] text-white border-[var(--color-idea-blue)]'
                        : 'bg-white text-[var(--color-idea-muted)] border-[var(--color-idea-border)] hover:text-[var(--color-idea-text)] hover:border-[var(--color-idea-blue)]/40'
                    }`}
                  >
                    {type !== 'ALL' && config?.icon}

                    <span>{type === 'ALL' ? 'All Activity' : (config?.label ?? type)}</span>

                    <span
                      className={`min-w-5 text-center text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                        active
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

            {/* Search */}
            <div className="relative w-full lg:w-64 shrink-0">
              <Search className="w-4 h-4 text-[var(--color-idea-muted)] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />

              <input
                type="text"
                value={searchFilter}
                onChange={(event) => setSearchFilter(event.target.value)}
                placeholder="Search activity..."
                aria-label="Search activity"
                className="idea-input w-full pl-9 pr-3 py-2.5 text-xs"
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
          <div className="idea-card overflow-hidden">
            {/* Table Header */}
            <div className="hidden xl:grid grid-cols-[130px_130px_minmax(180px,1.2fr)_70px_minmax(200px,1.1fr)_minmax(150px,1fr)] gap-5 px-5 py-3 bg-[var(--color-idea-light-grey)] border-b border-[var(--color-idea-border)]">
              {['Activity', 'Date & Time', 'Item / Asset', 'Qty', 'Details', 'Performed By'].map((label) => (
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
                const asset = assets.find((item) => item.id === tx.asset_id);
                const catalogItem = findCatalogItem(tx, asset);

                const fromLocation = locations.find((location) => location.id === tx.from_location_id);

                const toLocation = locations.find((location) => location.id === tx.to_location_id);

                const recipient = users.find((user) => user.id === tx.issued_to_user_id);

                const performer = users.find((user) => user.id === tx.processed_by_user_id);

                const code = asset?.asset_code || catalogItem?.item_code;

                const config = TYPE_CONFIG[tx.transaction_type];

                const { date, time } = formatDateTime(tx.created_at);
                const detail = renderDetail(tx, fromLocation, toLocation, recipient);

                return (
                  <div key={tx.id} className="px-5 py-4 hover:bg-[var(--color-idea-light-grey)]/50 transition-colors">
                    {/* Desktop */}
                    <div className="hidden xl:grid grid-cols-[130px_130px_minmax(180px,1.2fr)_70px_minmax(200px,1.1fr)_minmax(150px,1fr)] gap-5 items-center">
                      {/* Activity */}
                      <div>
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[9px] font-bold uppercase tracking-wide whitespace-nowrap ${
                            config?.badge ?? 'bg-gray-50 text-gray-500 border-gray-100'
                          }`}
                        >
                          {config?.icon}
                          {config?.label ?? tx.transaction_type}
                        </span>
                      </div>

                      {/* Date */}
                      <div className="leading-tight">
                        <p className="text-[11px] font-semibold text-[var(--color-idea-text)]">{date}</p>

                        <p className="text-[10px] text-[var(--color-idea-muted)] font-mono mt-0.5">{time}</p>
                      </div>

                      {/* Item */}
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-[var(--color-idea-text)] truncate">
                          {catalogItem?.name || 'Unknown item'}
                        </p>

                        {code && (
                          <p className="text-[9px] font-mono text-[var(--color-idea-blue)] mt-1 truncate">{code}</p>
                        )}

                        {asset && (
                          <span className="inline-block mt-1 text-[8px] uppercase tracking-wide font-semibold text-[var(--color-idea-muted)]">
                            Asset
                          </span>
                        )}
                      </div>

                      {/* Quantity */}
                      <div>
                        <span className="text-xs font-bold font-mono text-[var(--color-idea-text)]">
                          {tx.quantity ?? '—'}
                        </span>

                        {catalogItem?.unit && (
                          <span className="text-[9px] text-[var(--color-idea-muted)] ml-1">{catalogItem.unit}</span>
                        )}
                      </div>

                      {/* Details */}
                      <div className="min-w-0 text-xs">{detail}</div>

                      {/* Performer */}
                      <div className="min-w-0">
                        {performer ? (
                          <p className="text-xs font-semibold text-[var(--color-idea-text)] truncate">
                            {performer.name}
                          </p>
                        ) : (
                          <span className="text-[var(--color-idea-muted)]">—</span>
                        )}

                        {tx.remarks && (
                          <p className="text-[10px] text-[var(--color-idea-muted)] truncate mt-1" title={tx.remarks}>
                            {tx.remarks}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Compact / Mobile */}
                    <div className="xl:hidden space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[9px] font-bold uppercase tracking-wide whitespace-nowrap ${
                            config?.badge ?? 'bg-gray-50 text-gray-500 border-gray-100'
                          }`}
                        >
                          {config?.icon}
                          {config?.label ?? tx.transaction_type}
                        </span>

                        <div className="text-right shrink-0">
                          <p className="text-[10px] font-semibold text-[var(--color-idea-text)]">{date}</p>

                          <p className="text-[9px] text-[var(--color-idea-muted)] font-mono">{time}</p>
                        </div>
                      </div>

                      <div>
                        <p className="text-sm font-semibold text-[var(--color-idea-text)]">
                          {catalogItem?.name || 'Unknown item'}
                        </p>

                        {code && <p className="text-[9px] font-mono text-[var(--color-idea-blue)] mt-1">{code}</p>}
                      </div>

                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div className="rounded-xl bg-[var(--color-idea-light-grey)] px-3 py-2.5">
                          <p className="text-[9px] uppercase tracking-wide text-[var(--color-idea-muted)]">Quantity</p>

                          <p className="font-semibold text-[var(--color-idea-text)] mt-0.5">
                            {tx.quantity ?? '—'}
                            {catalogItem?.unit && (
                              <span className="text-[9px] text-[var(--color-idea-muted)] ml-1">{catalogItem.unit}</span>
                            )}
                          </p>
                        </div>

                        <div className="rounded-xl bg-[var(--color-idea-light-grey)] px-3 py-2.5">
                          <p className="text-[9px] uppercase tracking-wide text-[var(--color-idea-muted)]">
                            Performed By
                          </p>

                          <p className="font-semibold text-[var(--color-idea-text)] mt-0.5 truncate">
                            {performer?.name || '—'}
                          </p>
                        </div>
                      </div>

                      <div className="text-xs">
                        <p className="text-[9px] uppercase tracking-wide text-[var(--color-idea-muted)] mb-1">
                          Details
                        </p>
                        {detail}
                      </div>

                      {tx.remarks && (
                        <div className="text-[10px] text-[var(--color-idea-muted)] bg-[var(--color-idea-light-grey)] rounded-xl px-3 py-2.5">
                          {tx.remarks}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Footer */}
            <div className="px-5 py-3 border-t border-[var(--color-idea-border)] bg-[var(--color-idea-light-grey)]/50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5">
              <p className="text-[10px] text-[var(--color-idea-muted)]">
                Showing <span className="font-bold text-[var(--color-idea-text)]">{filteredTxs.length}</span> of{' '}
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
