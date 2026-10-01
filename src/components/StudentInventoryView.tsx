import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CalendarClock, Package, Search, Plus } from 'lucide-react';
import {
  Asset,
  CatalogItem,
  Location,
  Request,
  StockLevel,
  User,
} from '../types/inventory';

interface StudentInventoryViewProps {
  catalogItems: CatalogItem[];
  stockLevels: StockLevel[];
  assets: Asset[];
  locations: Location[];
  users: User[];
  requests: Request[];
  currentUser: User;
  onOpenNewRequest: () => void;
}

const formatDate = (value?: string | null) =>
  value
    ? new Intl.DateTimeFormat(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(value))
    : 'No deadline set';

export const StudentInventoryView: React.FC<StudentInventoryViewProps> = ({
  catalogItems,
  stockLevels,
  assets,
  locations,
  users,
  requests,
  currentUser,
  onOpenNewRequest,
}) => {
  const [search, setSearch] = useState('');
  const [now, setNow] = useState(() => Date.now());

  /*
   * catalog_item_id must always reference CatalogItem.id.
   *
   * This helper is only for reading existing data safely.
   * New data must always store item.id as catalog_item_id.
   */
  const findCatalogItem = (catalogItemId?: string) => {
    if (!catalogItemId) {
      return undefined;
    }

    return catalogItems.find(
      (item) => item.id === catalogItemId
    );
  };

  const myOpenDeadlines = useMemo(
    () =>
      requests.filter(
        (request) =>
          request.user_id === currentUser.id &&
          request.deadline_at &&
          (request.status === 'APPROVED' ||
            request.status === 'HANDED_OVER' ||
            request.status === 'RETURN_REQUESTED')
      ),
    [currentUser.id, requests]
  );

  const overdueRequests = myOpenDeadlines.filter(
    (request) =>
      new Date(request.deadline_at as string).getTime() <= now
  );

  useEffect(() => {
    const timer = window.setInterval(
      () => setNow(Date.now()),
      60_000
    );

    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (overdueRequests.length === 0) {
      return;
    }

    const key = `lablogic-overdue-${currentUser.id}-${overdueRequests
      .map((request) => request.id)
      .join('-')}`;

    if (window.sessionStorage.getItem(key)) {
      return;
    }

    window.sessionStorage.setItem(key, 'shown');

    window.alert(
      `Return deadline passed for ${overdueRequests
        .map((request) => request.request_number)
        .join(', ')}. Please return the borrowed items to the lab.`
    );
  }, [currentUser.id, overdueRequests]);

  const query = search.trim().toLowerCase();

  const visibleCatalog = catalogItems.filter((item) => {
    if (!query) {
      return true;
    }

    return `${item.name} ${item.item_code} ${item.description || ''}`
      .toLowerCase()
      .includes(query);
  });

  const visibleAssets = assets.filter((asset) => {
    const catalog = findCatalogItem(asset.catalog_item_id);

    if (!query) {
      return true;
    }

    return `${asset.name || ''} ${asset.asset_code} ${asset.serial_number || ''
      } ${catalog?.name || ''}`
      .toLowerCase()
      .includes(query);
  });

  /*
   * StockLevel.catalog_item_id must equal CatalogItem.id.
   */
  const stockFor = (catalogItemId: string) =>
    stockLevels
      .filter(
        (stock) => stock.catalog_item_id === catalogItemId
      )
      .reduce(
        (total, stock) => total + (Number(stock.quantity) || 0),
        0
      );

  const borrowerFor = (asset: Asset) =>
    users.find(
      (user) => user.id === asset.assigned_to_user_id
    )?.name || 'Borrower not recorded';

  return (
    <div className="flex-1 overflow-y-auto idea-bg">
      <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6 sm:space-y-8">
        {/* Unified Standard Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--color-idea-border)] pb-5 sm:pb-6">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--color-idea-blue)]">
                AICTE IDEA LAB · STUDENT INVENTORY DESK
              </span>
            </div>
            <h1 className="mt-1 text-2xl sm:text-3xl font-bold tracking-tight text-[var(--color-idea-text)]">
              Lab Inventory Availability
            </h1>
            <p className="mt-1.5 text-xs sm:text-sm text-[var(--color-idea-muted)] max-w-2xl leading-relaxed">
              Check real-time stock levels, available tracked assets, and active loans before submitting equipment requests.
            </p>
          </div>

          <button
            type="button"
            onClick={onOpenNewRequest}
            className="idea-button flex items-center justify-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-semibold rounded-xl shadow-sm cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>New Request</span>
          </button>
        </div>

        {/* Return Deadlines */}
        {myOpenDeadlines.length > 0 && (
          <section
            className={`idea-card p-4 ${overdueRequests.length > 0
              ? 'idea-error'
              : 'idea-warning'
              }`}
          >
            <div className="flex items-start gap-3">
              {overdueRequests.length > 0 ? (
                <AlertTriangle className="h-5 w-5 shrink-0" />
              ) : (
                <CalendarClock className="h-5 w-5 shrink-0" />
              )}

              <div className="min-w-0">
                <p className="text-xs font-bold">
                  {overdueRequests.length > 0
                    ? 'Return deadline passed'
                    : 'Your return deadlines'}
                </p>

                <div className="mt-2 grid gap-1 text-[11px]">
                  {myOpenDeadlines.map((request) => (
                    <p key={request.id}>
                      <span className="font-mono font-bold">
                        {request.request_number}
                      </span>{' '}
                      · {formatDate(request.deadline_at)}
                    </p>
                  ))}
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Search */}
        <div className="idea-card p-3 sm:p-4">
          <div className="relative w-full max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-idea-muted)]" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search inventory by item name, code..."
              className="idea-input w-full pl-9 pr-4 py-2.5 text-xs sm:text-sm"
            />
          </div>
        </div>

        {/* Consumable Inventory */}
        <section className="idea-card overflow-hidden">
          <div className="flex items-center gap-3 border-b border-[var(--color-idea-border)] px-4 py-4 sm:px-6">
            <Package className="h-5 w-5 text-[var(--color-idea-blue)]" />

            <div>
              <h3 className="text-sm font-bold">
                Complete consumable inventory
              </h3>

              <p className="text-[10px] text-[var(--color-idea-muted)]">
                Available quantity across all lab locations
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[620px] text-left">
              <thead className="bg-[var(--color-idea-light-grey)] text-[10px] uppercase tracking-[0.18em] text-[var(--color-idea-muted)]">
                <tr>
                  <th className="px-4 py-3 sm:px-6">Component</th>
                  <th className="px-4 py-3 sm:px-6">Code</th>
                  <th className="px-4 py-3 sm:px-6">Available</th>
                  <th className="px-4 py-3 sm:px-6">Storage</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-[var(--color-idea-border)]">
                {visibleCatalog.map((item) => {
                  /*
                   * IMPORTANT:
                   * item.id is the canonical catalog_item_id.
                   */
                  const catalogItemId = item.id;

                  const total = stockFor(catalogItemId);

                  const itemLocations = stockLevels
                    .filter(
                      (stock) =>
                        stock.catalog_item_id === catalogItemId &&
                        Number(stock.quantity) > 0
                    )
                    .map(
                      (stock) =>
                        locations.find(
                          (location) =>
                            location.id === stock.location_id
                        )?.name
                    )
                    .filter(
                      (name): name is string => Boolean(name)
                    );

                  return (
                    <tr key={item.id} className="text-xs">
                      <td className="px-4 py-3 font-semibold sm:px-6">
                        {item.name}
                      </td>

                      <td className="px-4 py-3 font-mono text-[var(--color-idea-muted)] sm:px-6">
                        {item.item_code}
                      </td>

                      <td className="px-4 py-3 sm:px-6">
                        <span
                          className={`font-bold ${total > 0
                            ? 'text-[#5e8a27]'
                            : 'text-[var(--color-idea-red)]'
                            }`}
                        >
                          {total} {item.unit}
                        </span>
                      </td>

                      <td className="px-4 py-3 text-[var(--color-idea-muted)] sm:px-6">
                        {item.storage_place ||
                          itemLocations.join(', ') ||
                          'Lab store'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {visibleCatalog.length === 0 && (
              <p className="p-8 text-center text-xs text-[var(--color-idea-muted)]">
                No inventory matches your search.
              </p>
            )}
          </div>
        </section>

        {/* Tracked Assets */}
        <section className="idea-card overflow-hidden">
          <div className="border-b border-[var(--color-idea-border)] px-4 py-4 sm:px-6">
            <h3 className="text-sm font-bold">
              Tracked assets
            </h3>

            <p className="mt-1 text-[10px] text-[var(--color-idea-muted)]">
              See whether each asset is available and who has it
              when issued.
            </p>
          </div>

          <div className="grid gap-4 p-4 sm:grid-cols-2 sm:p-6 xl:grid-cols-3">
            {visibleAssets.map((asset) => {
              /*
               * asset.catalog_item_id must reference CatalogItem.id.
               */
              const catalog = findCatalogItem(
                asset.catalog_item_id
              );

              const available = asset.status === 'AVAILABLE';

              const location = locations.find(
                (item) => item.id === asset.location_id
              )?.name;

              return (
                <article
                  key={asset.id}
                  className="flex min-h-[190px] flex-col rounded-xl border border-[var(--color-idea-border)] bg-white/70 p-4"
                >
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-[var(--color-idea-deep-blue)]">
                        {asset.name || catalog?.name || 'Unlisted asset'}
                      </p>

                      <p className="mt-1 truncate font-mono text-[10px] text-[var(--color-idea-muted)]">
                        {asset.asset_code}
                      </p>
                    </div>

                    <span
                      className={`shrink-0 whitespace-nowrap rounded-full px-2 py-1 text-[9px] font-bold uppercase ${available
                        ? 'idea-success'
                        : 'idea-error'
                        }`}
                    >
                      {available
                        ? 'Available'
                        : asset.status.replace(/_/g, ' ')}
                    </span>
                  </div>

                  {/* Card Details */}
                  <div className="mt-4 space-y-2 border-t border-[var(--color-idea-border)] pt-3 text-[11px] text-[var(--color-idea-muted)]">
                    <div className="flex justify-between gap-3">
                      <span>Serial</span>

                      <span className="break-all text-right font-medium text-[var(--color-idea-text)]">
                        {asset.serial_number || 'Not recorded'}
                      </span>
                    </div>

                    {available ? (
                      <div className="flex justify-between gap-3">
                        <span>Location</span>

                        <span className="text-right font-medium text-[var(--color-idea-text)]">
                          {asset.storage_location ||
                            location ||
                            'Lab store'}
                        </span>
                      </div>
                    ) : (
                      <div className="flex justify-between gap-3">
                        <span>Using it</span>

                        <span className="text-right font-semibold text-[var(--color-idea-red)]">
                          {borrowerFor(asset)}
                        </span>
                      </div>
                    )}
                  </div>
                </article>
              );
            })}
          </div>

          {visibleAssets.length === 0 && (
            <p className="p-8 text-center text-xs text-[var(--color-idea-muted)]">
              No assets match your search.
            </p>
          )}
        </section>
      </div>
    </div>
  );
};
