import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CalendarClock, Package, Search } from 'lucide-react';
import { Asset, CatalogItem, Location, Request, StockLevel, User } from '../types/inventory';

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

  const myOpenDeadlines = useMemo(
    () =>
      requests.filter(
        (request) =>
          request.user_id === currentUser.id &&
          request.deadline_at &&
          (request.status === 'APPROVED' || request.status === 'HANDED_OVER')
      ),
    [currentUser.id, requests]
  );

  const overdueRequests = myOpenDeadlines.filter((request) => new Date(request.deadline_at as string).getTime() <= now);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 60_000);

    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (overdueRequests.length === 0) return;

    const key = `lablogic-overdue-${currentUser.id}-${overdueRequests.map((request) => request.id).join('-')}`;

    if (window.sessionStorage.getItem(key)) return;

    window.sessionStorage.setItem(key, 'shown');

    window.alert(
      `Return deadline passed for ${overdueRequests
        .map((request) => request.request_number)
        .join(', ')}. Please return the borrowed items to the lab.`
    );
  }, [currentUser.id, overdueRequests]);

  const query = search.trim().toLowerCase();

  const visibleCatalog = catalogItems.filter((item) => {
    if (!query) return true;

    return `${item.name} ${item.item_code} ${item.description}`.toLowerCase().includes(query);
  });

  const visibleAssets = assets.filter((asset) => {
    const catalog = catalogItems.find((item) => item.id === asset.catalog_item_id);

    if (!query) return true;

    return `${asset.asset_code} ${asset.serial_number || ''} ${catalog?.name || ''}`.toLowerCase().includes(query);
  });

  const stockFor = (catalogId: string) =>
    stockLevels
      .filter((stock) => stock.catalog_item_id === catalogId)
      .reduce((total, stock) => total + (Number(stock.quantity) || 0), 0);

  const borrowerFor = (asset: Asset) =>
    users.find((user) => user.id === asset.assigned_to_user_id)?.name || 'Borrower not recorded';

  return (
    <div className="flex-1 overflow-y-auto idea-bg">
      <div className="max-w-7xl mx-auto w-full p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Header */}
        <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <span className="text-[10px] font-medium tracking-[0.25em] uppercase text-[var(--color-idea-muted)]">
              STUDENT INVENTORY DESK
            </span>

            <h2 className="text-2xl font-bold text-[var(--color-idea-text)] tracking-tight mt-1">
              Lab inventory <span className="text-[var(--color-idea-blue)]">availability</span>
            </h2>

            <p className="text-xs text-[var(--color-idea-muted)] mt-1">
              Check stock, tracked assets, and current borrowers before requesting equipment.
            </p>
          </div>

          <button
            type="button"
            onClick={onOpenNewRequest}
            className="idea-button px-4 py-2.5 text-xs font-semibold cursor-pointer shrink-0"
          >
            Request an item
          </button>
        </header>

        {/* Return Deadlines */}
        {myOpenDeadlines.length > 0 && (
          <section className={`idea-card p-4 ${overdueRequests.length > 0 ? 'idea-error' : 'idea-warning'}`}>
            <div className="flex items-start gap-3">
              {overdueRequests.length > 0 ? (
                <AlertTriangle className="w-5 h-5 shrink-0" />
              ) : (
                <CalendarClock className="w-5 h-5 shrink-0" />
              )}

              <div className="min-w-0">
                <p className="text-xs font-bold">
                  {overdueRequests.length > 0 ? 'Return deadline passed' : 'Your return deadlines'}
                </p>

                <div className="mt-2 grid gap-1 text-[11px]">
                  {myOpenDeadlines.map((request) => (
                    <p key={request.id}>
                      <span className="font-mono font-bold">{request.request_number}</span> ·{' '}
                      {formatDate(request.deadline_at)}
                    </p>
                  ))}
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="w-4 h-4 text-[var(--color-idea-muted)] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />

          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search inventory or asset code..."
            className="idea-input pl-9 pr-4 py-2.5 text-xs w-full"
          />
        </div>

        {/* Consumable Inventory */}
        <section className="idea-card overflow-hidden">
          <div className="px-4 sm:px-6 py-4 border-b border-[var(--color-idea-border)] flex items-center gap-3">
            <Package className="w-5 h-5 text-[var(--color-idea-blue)]" />

            <div>
              <h3 className="font-bold text-sm">Complete consumable inventory</h3>

              <p className="text-[10px] text-[var(--color-idea-muted)]">Available quantity across all lab locations</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left min-w-[620px]">
              <thead className="bg-[var(--color-idea-light-grey)] text-[10px] uppercase tracking-[0.18em] text-[var(--color-idea-muted)]">
                <tr>
                  <th className="px-4 sm:px-6 py-3">Component</th>
                  <th className="px-4 sm:px-6 py-3">Code</th>
                  <th className="px-4 sm:px-6 py-3">Available</th>
                  <th className="px-4 sm:px-6 py-3">Storage</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-[var(--color-idea-border)]">
                {visibleCatalog.map((item) => {
                  const total = stockFor(item.id);

                  const itemLocations = stockLevels
                    .filter((stock) => stock.catalog_item_id === item.id && stock.quantity > 0)
                    .map((stock) => locations.find((location) => location.id === stock.location_id)?.name)
                    .filter(Boolean);

                  return (
                    <tr key={item.id} className="text-xs">
                      <td className="px-4 sm:px-6 py-3 font-semibold">{item.name}</td>

                      <td className="px-4 sm:px-6 py-3 font-mono text-[var(--color-idea-muted)]">{item.item_code}</td>

                      <td className="px-4 sm:px-6 py-3">
                        <span className={`font-bold ${total > 0 ? 'text-[#5e8a27]' : 'text-[var(--color-idea-red)]'}`}>
                          {total} {item.unit}
                        </span>
                      </td>

                      <td className="px-4 sm:px-6 py-3 text-[var(--color-idea-muted)]">
                        {item.storage_place || itemLocations.join(', ') || 'Lab store'}
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
          <div className="px-4 sm:px-6 py-4 border-b border-[var(--color-idea-border)]">
            <h3 className="font-bold text-sm">Tracked assets</h3>

            <p className="text-[10px] text-[var(--color-idea-muted)] mt-1">
              See whether each asset is available and who has it when issued.
            </p>
          </div>

          <div className="grid gap-4 p-4 sm:p-6 sm:grid-cols-2 xl:grid-cols-3">
            {visibleAssets.map((asset) => {
              const catalog = catalogItems.find((item) => item.id === asset.catalog_item_id);

              const available = asset.status === 'AVAILABLE';

              const location = locations.find((item) => item.id === asset.location_id)?.name;

              return (
                <article
                  key={asset.id}
                  className="border border-[var(--color-idea-border)] rounded-xl p-4 bg-white/70 flex flex-col min-h-[190px]"
                >
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-mono text-sm font-bold text-[var(--color-idea-deep-blue)] truncate">
                        {asset.asset_code}
                      </p>

                      <p className="text-xs font-semibold mt-1 line-clamp-2">{catalog?.name || 'Unlisted asset'}</p>
                    </div>

                    <span
                      className={`shrink-0 text-[9px] px-2 py-1 rounded-full font-bold uppercase whitespace-nowrap ${
                        available ? 'idea-success' : 'idea-error'
                      }`}
                    >
                      {available ? 'Available' : asset.status.replace(/_/g, ' ')}
                    </span>
                  </div>

                  {/* Card Details */}
                  <div className="mt-4 pt-3 border-t border-[var(--color-idea-border)] text-[11px] text-[var(--color-idea-muted)] space-y-2">
                    <div className="flex justify-between gap-3">
                      <span>Serial</span>
                      <span className="text-right font-medium text-[var(--color-idea-text)] break-all">
                        {asset.serial_number || 'Not recorded'}
                      </span>
                    </div>

                    {available ? (
                      <div className="flex justify-between gap-3">
                        <span>Location</span>
                        <span className="text-right font-medium text-[var(--color-idea-text)]">
                          {asset.storage_location || location || 'Lab store'}
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
            <p className="p-8 text-center text-xs text-[var(--color-idea-muted)]">No assets match your search.</p>
          )}
        </section>
      </div>
    </div>
  );
};
