import React, { useState, useEffect } from 'react';
import { X, AlertTriangle, QrCode } from 'lucide-react';
import { Modal } from './Modal';
import {
  Asset,
  CatalogItem,
  Location,
  User,
  AssetStatus,
  StockLevel,
  Request,
  RequestLineDraft,
} from '../types/inventory';
import { InventoryStorage } from '../services/storage';
import { canIssueInventory, canReturnOrRepairItems, isStudent } from '../services/authRoles';
import confetti from 'canvas-confetti';
import { getLocationFullPathString, inferLocationType } from '../utils/locationHierarchy';
import { LocationPathBreadcrumb } from './LocationsView';

interface QuickActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  qrData: {
    type: 'asset' | 'catalog' | 'location' | 'request' | 'user' | 'unknown';
    entity: any;
    rawCode: string;
  } | null;
  users: User[];
  locations: Location[];
  catalogItems: CatalogItem[];
  assets: Asset[];
  stockLevels: StockLevel[];
  activeUser: User;
  onOpenNewRequest: (items: RequestLineDraft[]) => void;
  onRefreshData: () => void;
  onOpenQRGenerator: (code: string, title: string, subtitle?: string) => void;
}

export const QuickActionModal: React.FC<QuickActionModalProps> = ({
  isOpen,
  onClose,
  qrData,
  users,
  locations,
  catalogItems,
  assets,
  stockLevels,
  activeUser,
  onOpenNewRequest,
  onRefreshData,
  onOpenQRGenerator,
}) => {
  const [subAction, setSubAction] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState('');
  const [selectedLoc, setSelectedLoc] = useState('');
  const [qtyInput, setQtyInput] = useState(1);
  const [remarksInput, setRemarksInput] = useState('');
  const [statusInput, setStatusInput] = useState<AssetStatus>('DAMAGED');
  const [activeLocationId, setActiveLocationId] = useState<string | null>(null);
  const [locActionTab, setLocActionTab] = useState<'VIEW' | 'ADD_STOCK' | 'MOVE_ASSET'>('VIEW');
  const [targetCatalogItemId, setTargetCatalogItemId] = useState('');
  const [targetStockQty, setTargetStockQty] = useState(1);
  const [targetMoveAssetId, setTargetMoveAssetId] = useState('');

  const role = activeUser?.role;
  const quickStatusOptions: AssetStatus[] = ['AVAILABLE', 'UNDER_REPAIR', 'DAMAGED', 'LOST', 'RETIRED'];

  const canIssue = canIssueInventory(role);
  const canReturnOrRepair = canReturnOrRepairItems(role);
  const studentMode = isStudent(role);

  /*
   * catalog_item_id must ALWAYS be the CatalogItem.id.
   * item_code is only a human-readable code and must not
   * be stored as a foreign key.
   *
   * The item_code fallback below is kept only so old records
   * that already contain item_code can still be displayed.
   */
  const findCatalogItem = (catalogItemId?: string) => {
    if (!catalogItemId) {
      return undefined;
    }

    return catalogItems.find((item) => item.id === catalogItemId || item.item_code === catalogItemId);
  };

  /*
   * Create a catalog request using the actual CatalogItem.id.
   */
  const openRequestForCatalogItem = (catalogItemId: string, requestedQty: number) => {
    const catalogItem = findCatalogItem(catalogItemId);

    if (!catalogItem) {
      alert('Catalog item not found.');
      return;
    }

    onOpenNewRequest([
      {
        kind: 'CATALOG',
        catalog_item_id: catalogItem.id,
        requested_qty: requestedQty,
      },
    ]);

    onClose();
  };

  /*
   * Create an asset request.
   *
   * The asset must already have a valid catalog_item_id.
   * We resolve it back to the CatalogItem and always send
   * the actual CatalogItem.id.
   */
  const openRequestForAsset = (asset: Asset) => {
    if (!asset.catalog_item_id) {
      alert('This asset is not linked to a catalog item.');
      return;
    }

    const catalogItem = findCatalogItem(asset.catalog_item_id);

    if (!catalogItem) {
      alert('The catalog item linked to this asset was not found.');
      return;
    }

    onOpenNewRequest([
      {
        kind: 'ASSET',
        asset_id: asset.id,
        catalog_item_id: catalogItem.id,
        requested_qty: 1,
      },
    ]);

    onClose();
  };

  if (!isOpen || !qrData) {
    return null;
  }

  const resetFormState = () => {
    setSubAction(null);
    setSelectedUser('');
    setSelectedLoc('');
    setQtyInput(1);
    setRemarksInput('');
    setStatusInput('DAMAGED');
    setActiveLocationId(null);
    setLocActionTab('VIEW');
    setTargetCatalogItemId('');
    setTargetStockQty(1);
    setTargetMoveAssetId('');
  };

  const handleClose = () => {
    resetFormState();
    onClose();
  };

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const triggerSuccess = () => {
    confetti({
      particleCount: 35,
      spread: 50,
      origin: { y: 0.7 },
    });

    onRefreshData();
    resetFormState();
    onClose();
  };

  const renderAssetActions = (asset: Asset) => {
    const catalogItem = findCatalogItem(asset.catalog_item_id);

    const assignedUser = users.find((user) => user.id === asset.assigned_to_user_id);

    const location = locations.find((item) => item.id === asset.location_id);

    if (studentMode) {
      const requestBlockedByAssetStatus = asset.status !== 'AVAILABLE';

      return (
        <div className="space-y-6">
          <div className="relative overflow-hidden rounded-2xl border border-[var(--color-idea-border)] bg-[var(--color-idea-light-grey)]/40 p-5">
            <div className="absolute left-0 top-0 h-1 w-full bg-[var(--color-idea-blue)]" />

            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-[var(--color-idea-muted)]">
                  ASSET
                </span>

                <h4 className="mt-1 truncate text-xl font-bold text-[var(--color-idea-text)]">
                  {asset.name || catalogItem?.name || 'Equipment'}
                </h4>

                <p className="mt-0.5 break-words text-xs font-mono font-semibold text-[var(--color-idea-blue)]">
                  {asset.asset_code}
                </p>

                {asset.serial_number && (
                  <p className="mt-1 text-[11px] font-mono text-[var(--color-idea-muted)]">
                    Serial: {asset.serial_number}
                  </p>
                )}
              </div>

              <div className="shrink-0 text-right">
                <span className="border border-[var(--color-idea-border)] bg-white px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-[var(--color-idea-text)]">
                  {asset.status.replace('_', ' ')}
                </span>

                <div className="mt-2 text-xs font-medium text-[var(--color-idea-muted)] flex flex-col items-end">
                  {asset.status === 'ISSUED' ? (
                    <span>Assigned to: {assignedUser?.name || 'User'}</span>
                  ) : (
                    <LocationPathBreadcrumb path={location ? getLocationFullPathString(location, locations) : null} />
                  )}
                </div>
              </div>
            </div>
          </div>

          {requestBlockedByAssetStatus ? (
            <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-800">
              This asset is not currently available for request.
            </div>
          ) : (
            <div className="rounded-xl border border-[var(--color-idea-border)] bg-white p-3 text-xs text-[var(--color-idea-muted)]">
              Request this specific asset. Assets are individually tracked, so no quantity is required.
            </div>
          )}

          <div className="flex gap-3">
            <button
              type="button"
              disabled={requestBlockedByAssetStatus}
              onClick={() => openRequestForAsset(asset)}
              className="flex-1 rounded-xl bg-[var(--color-idea-text)] py-2.5 text-xs font-semibold text-white transition-colors hover:bg-[var(--color-idea-blue)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              Request Asset
            </button>

            <button
              type="button"
              onClick={() =>
                onOpenQRGenerator(
                  asset.id,
                  asset.name || catalogItem?.name || 'Equipment',
                  `Serial: ${asset.serial_number || 'N/A'}`
                )
              }
              className="rounded-xl border border-[var(--color-idea-border)] px-4 py-2.5 text-xs font-semibold text-[var(--color-idea-text)] transition-colors hover:bg-[var(--color-idea-light-grey)]"
            >
              Print QR
            </button>
          </div>
        </div>
      );
    }

    const handleIssueSubmit = (event: React.FormEvent) => {
      event.preventDefault();

      if (!selectedUser) {
        return alert('Please select a user.');
      }

      InventoryStorage.issueAsset(asset.id, selectedUser, remarksInput);

      triggerSuccess();
    };

    const handleReturnSubmit = (event: React.FormEvent) => {
      event.preventDefault();

      const returnLocation = selectedLoc || location?.id || locations[0]?.id;

      if (!returnLocation) {
        return alert('Please select a storage location.');
      }

      InventoryStorage.returnAsset(asset.id, returnLocation, remarksInput);

      triggerSuccess();
    };

    const handleStatusSubmit = (event: React.FormEvent) => {
      event.preventDefault();

      InventoryStorage.updateAssetStatus(asset.id, statusInput, selectedLoc || asset.location_id, remarksInput);

      triggerSuccess();
    };

    return (
      <div className="space-y-6">
        <div className="relative overflow-hidden rounded-2xl border border-[var(--color-idea-border)] bg-[var(--color-idea-light-grey)]/40 p-5">
          <div className="absolute left-0 top-0 h-1 w-full bg-[var(--color-idea-blue)]" />

          <div className="flex items-start justify-between gap-4">
            <div>
              <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-[var(--color-idea-muted)]">
                ASSET
              </span>

              <h4 className="mt-1 text-xl font-bold text-[var(--color-idea-text)]">
                {asset.name || catalogItem?.name || 'Equipment'}
              </h4>

              <p className="mt-0.5 text-xs font-mono font-semibold text-[var(--color-idea-blue)]">{asset.asset_code}</p>

              {asset.serial_number && (
                <p className="mt-1 text-[11px] font-mono text-[var(--color-idea-muted)]">
                  Serial: {asset.serial_number}
                </p>
              )}
            </div>

            <div className="text-right">
              <span className="border border-[var(--color-idea-border)] bg-white px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-[var(--color-idea-text)]">
                {asset.status.replace('_', ' ')}
              </span>

              <div className="mt-2 text-xs font-medium text-[var(--color-idea-muted)] flex flex-col items-end">
                {asset.status === 'ISSUED' ? (
                  <span>Assigned to: {assignedUser?.name || 'User'}</span>
                ) : (
                  <LocationPathBreadcrumb path={location ? getLocationFullPathString(location, locations) : null} />
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-[var(--color-idea-border)] bg-white p-5">
          <div className="mb-3 flex items-center justify-between gap-2">
            <div>
              <h5 className="text-sm font-semibold text-[var(--color-idea-text)]">Asset Status</h5>

              <p className="mt-0.5 text-[10px] text-[var(--color-idea-muted)]">
                Update the current condition of this asset.
              </p>
            </div>

            <span className="text-[9px] font-semibold uppercase tracking-wider text-[var(--color-idea-muted)]">
              {asset.status.replace('_', ' ')}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {quickStatusOptions.map((status) => {
              const selected = asset.status === status;

              return (
                <button
                  key={status}
                  type="button"
                  onClick={() => {
                    setStatusInput(status);
                    setSubAction('status');
                  }}
                  className={`rounded-lg border px-2 py-2 text-[10px] font-bold uppercase tracking-wider transition-colors ${
                    selected
                      ? 'border-[var(--color-idea-blue)] bg-[var(--color-idea-blue)] text-white'
                      : 'border-[var(--color-idea-border)] bg-[var(--color-idea-light-grey)] text-[var(--color-idea-text)] hover:border-[var(--color-idea-blue)]'
                  }`}
                >
                  {status.replace('_', ' ')}
                </button>
              );
            })}
          </div>
        </div>

        {canIssue && asset.status === 'AVAILABLE' && (
          <button
            type="button"
            onClick={() => setSubAction('issue')}
            className="w-full rounded-xl bg-[var(--color-idea-text)] py-3 text-xs font-semibold text-white transition-colors hover:bg-[var(--color-idea-blue)]"
          >
            Issue Asset
          </button>
        )}

        {canReturnOrRepair && asset.status === 'ISSUED' && (
          <button
            type="button"
            onClick={() => setSubAction('return')}
            className="w-full rounded-xl border border-[var(--color-idea-border)] py-3 text-xs font-semibold text-[var(--color-idea-text)] transition-colors hover:bg-[var(--color-idea-light-grey)]"
          >
            Return Asset
          </button>
        )}

        {subAction === 'issue' && (
          <form
            onSubmit={handleIssueSubmit}
            className="space-y-4 rounded-2xl border border-[var(--color-idea-border)] bg-white p-5"
          >
            <div>
              <h5 className="text-sm font-semibold text-[var(--color-idea-text)]">Issue Asset</h5>

              <p className="mt-1 text-[10px] text-[var(--color-idea-muted)]">Assign this specific asset to a user.</p>
            </div>

            <div>
              <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-[var(--color-idea-muted)]">
                User
              </label>

              <select
                value={selectedUser}
                onChange={(event) => setSelectedUser(event.target.value)}
                className="idea-input w-full p-2.5 text-xs"
                required
              >
                <option value="">Select user</option>

                {users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name} ({user.user_code})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-[var(--color-idea-muted)]">
                Details
              </label>

              <input
                type="text"
                value={remarksInput}
                onChange={(event) => setRemarksInput(event.target.value)}
                placeholder="Optional issue details"
                className="idea-input w-full p-2.5 text-xs"
              />
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setSubAction(null)}
                className="flex-1 rounded-xl border border-[var(--color-idea-border)] py-2.5 text-xs font-semibold"
              >
                Cancel
              </button>

              <button type="submit" className="idea-button flex-1 rounded-xl py-2.5 text-xs font-semibold">
                Confirm Issue
              </button>
            </div>
          </form>
        )}

        {subAction === 'return' && (
          <form
            onSubmit={handleReturnSubmit}
            className="space-y-4 rounded-2xl border border-[var(--color-idea-border)] bg-white p-5"
          >
            <div>
              <h5 className="text-sm font-semibold text-[var(--color-idea-text)]">Return Asset</h5>

              <p className="mt-1 text-[10px] text-[var(--color-idea-muted)]">
                Return the asset to a physical storage location.
              </p>
            </div>

            <div>
              <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-[var(--color-idea-muted)]">
                Location
              </label>

              <select
                value={selectedLoc}
                onChange={(event) => setSelectedLoc(event.target.value)}
                className="idea-input w-full p-2.5 text-xs"
                required
              >
                <option value="">Select location</option>

                {locations.map((loc) => (
                  <option key={loc.id} value={loc.id}>
                    {getLocationFullPathString(loc, locations)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-[var(--color-idea-muted)]">
                Condition Details
              </label>

              <input
                type="text"
                value={remarksInput}
                onChange={(event) => setRemarksInput(event.target.value)}
                placeholder="Optional condition or inspection notes"
                className="idea-input w-full p-2.5 text-xs"
              />
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setSubAction(null)}
                className="flex-1 rounded-xl border border-[var(--color-idea-border)] py-2.5 text-xs font-semibold"
              >
                Cancel
              </button>

              <button type="submit" className="idea-button flex-1 rounded-xl py-2.5 text-xs font-semibold">
                Confirm Return
              </button>
            </div>
          </form>
        )}

        {subAction === 'status' && (
          <form
            onSubmit={handleStatusSubmit}
            className="space-y-4 rounded-2xl border border-[var(--color-idea-border)] bg-white p-5"
          >
            <div>
              <h5 className="text-sm font-semibold text-[var(--color-idea-text)]">Update Asset Status</h5>

              <p className="mt-1 text-[10px] text-[var(--color-idea-muted)]">Change the current state of this asset.</p>
            </div>

            <div>
              <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-[var(--color-idea-muted)]">
                Status
              </label>

              <select
                value={statusInput}
                onChange={(event) => setStatusInput(event.target.value as AssetStatus)}
                className="idea-input w-full p-2.5 text-xs"
              >
                {quickStatusOptions.map((status) => (
                  <option key={status} value={status}>
                    {status.replace('_', ' ')}
                  </option>
                ))}
              </select>
            </div>

            {statusInput === 'AVAILABLE' && (
              <div>
                <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-[var(--color-idea-muted)]">
                  Location
                </label>

                <select
                  value={selectedLoc}
                  onChange={(event) => setSelectedLoc(event.target.value)}
                  className="idea-input w-full p-2.5 text-xs"
                >
                  <option value="">Keep current location</option>

                  {locations.map((loc) => (
                    <option key={loc.id} value={loc.id}>
                      {getLocationFullPathString(loc, locations)}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-[var(--color-idea-muted)]">
                Details
              </label>

              <input
                type="text"
                value={remarksInput}
                onChange={(event) => setRemarksInput(event.target.value)}
                placeholder="Reason for status change"
                className="idea-input w-full p-2.5 text-xs"
              />
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setSubAction(null)}
                className="flex-1 rounded-xl border border-[var(--color-idea-border)] py-2.5 text-xs font-semibold"
              >
                Cancel
              </button>

              <button type="submit" className="idea-button flex-1 rounded-xl py-2.5 text-xs font-semibold">
                Update Status
              </button>
            </div>
          </form>
        )}
      </div>
    );
  };

  const renderCatalogActions = (item: CatalogItem) => {
    /*
     * IMPORTANT:
     * StockLevel.catalog_item_id must reference item.id.
     * Do not match item_code here for new data.
     */
    const itemStock = stockLevels.filter((stock) => stock.catalog_item_id === item.id);

    const totalQuantity = itemStock.reduce((total, stock) => total + (stock.quantity || 0), 0);

    if (studentMode) {
      return (
        <div className="space-y-6">
          <div className="relative overflow-hidden rounded-2xl border border-[var(--color-idea-border)] bg-[var(--color-idea-light-grey)]/40 p-5">
            <div className="absolute left-0 top-0 h-1 w-full bg-[var(--color-idea-blue)]" />

            <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-[var(--color-idea-muted)]">
              ITEM
            </span>

            <h4 className="mt-1 text-xl font-bold text-[var(--color-idea-text)]">{item.name}</h4>

            <p className="mt-0.5 text-xs font-mono font-semibold text-[var(--color-idea-blue)]">{item.item_code}</p>

            {item.description && <p className="mt-2 text-xs text-[var(--color-idea-muted)]">{item.description}</p>}

            <div className="mt-5 flex items-end gap-1">
              <span className="text-3xl font-bold text-[var(--color-idea-text)]">{totalQuantity}</span>

              <span className="mb-1 text-xs font-semibold text-[var(--color-idea-muted)]">{item.unit}</span>
            </div>

            <p className="mt-1 text-[10px] uppercase tracking-wider text-[var(--color-idea-muted)]">Available stock</p>
          </div>

          <div className="rounded-2xl border border-[var(--color-idea-border)] bg-white p-4">
            <h5 className="mb-3 text-sm font-semibold text-[var(--color-idea-text)]">Stock by Location</h5>

            {itemStock.length === 0 ? (
              <p className="text-xs italic text-[var(--color-idea-muted)]">
                No stock is currently assigned to a location.
              </p>
            ) : (
              <div className="space-y-2">
                {itemStock.map((stock) => {
                  const location = locations.find((item) => item.id === stock.location_id);

                  return (
                    <div
                      key={stock.id}
                      className="flex items-center justify-between border-b border-[var(--color-idea-border)] py-2 last:border-0"
                    >
                      <div className="min-w-0 pr-3">
                        <LocationPathBreadcrumb
                          path={location ? getLocationFullPathString(location, locations) : 'Storage place'}
                        />
                      </div>

                      <span className="font-mono text-xs font-bold text-[var(--color-idea-text)]">
                        {stock.quantity} {item.unit}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="rounded-xl border border-[var(--color-idea-border)] bg-white p-3 text-xs text-[var(--color-idea-muted)]">
            Create a request for this item. The quantity and Consumable/Reusable choice are selected in the request.
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => openRequestForCatalogItem(item.id, 1)}
              className="flex-1 rounded-xl bg-[var(--color-idea-text)] py-2.5 text-xs font-semibold text-white transition-colors hover:bg-[var(--color-idea-blue)]"
            >
              Request Item
            </button>

            <button
              type="button"
              onClick={() => onOpenQRGenerator(item.id, item.name, 'Inventory Item')}
              className="rounded-xl border border-[var(--color-idea-border)] px-4 py-2.5 text-xs font-semibold text-[var(--color-idea-text)] transition-colors hover:bg-[var(--color-idea-light-grey)]"
            >
              Print QR
            </button>
          </div>
        </div>
      );
    }

    const handleStockSubmit = (type: 'RECEIVE' | 'ISSUE') => {
      if (!selectedLoc) {
        return alert('Select a storage location.');
      }

      if (qtyInput < 1) {
        return alert('Quantity must be at least 1.');
      }

      const delta = type === 'RECEIVE' ? qtyInput : -qtyInput;

      InventoryStorage.adjustStock(
        item.id,
        selectedLoc,
        delta,
        type,
        remarksInput || `Manual ${type.toLowerCase()} via QR scan`
      );

      triggerSuccess();
    };

    return (
      <div className="space-y-6">
        <div className="relative overflow-hidden rounded-2xl border border-[var(--color-idea-border)] bg-[var(--color-idea-light-grey)]/40 p-5">
          <div className="absolute left-0 top-0 h-1 w-full bg-[var(--color-idea-blue)]" />

          <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-[var(--color-idea-muted)]">ITEM</span>

          <h4 className="mt-1 text-xl font-bold text-[var(--color-idea-text)]">{item.name}</h4>

          <p className="mt-0.5 text-xs font-mono font-semibold text-[var(--color-idea-blue)]">{item.item_code}</p>

          <div className="mt-5 flex items-end gap-1">
            <span className="text-3xl font-bold text-[var(--color-idea-text)]">{totalQuantity}</span>

            <span className="mb-1 text-xs font-semibold text-[var(--color-idea-muted)]">{item.unit}</span>
          </div>

          <p className="mt-1 text-[10px] uppercase tracking-wider text-[var(--color-idea-muted)]">Total stock</p>
        </div>

        <div className="rounded-2xl border border-[var(--color-idea-border)] bg-white p-4">
          <h5 className="mb-3 text-sm font-semibold text-[var(--color-idea-text)]">Stock by Location</h5>

          {itemStock.length === 0 ? (
            <p className="text-xs italic text-[var(--color-idea-muted)]">
              No stock is currently assigned to a location.
            </p>
          ) : (
            <div className="space-y-2">
              {itemStock.map((stock) => {
                const location = locations.find((item) => item.id === stock.location_id);

                return (
                  <div
                    key={stock.id}
                    className="flex items-center justify-between border-b border-[var(--color-idea-border)] py-2 last:border-0"
                  >
                    <span className="text-xs font-medium text-[var(--color-idea-text)]">
                      {location?.name || 'Unknown location'}
                    </span>

                    <span className="font-mono text-xs font-bold text-[var(--color-idea-text)]">
                      {stock.quantity} {item.unit}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-[var(--color-idea-border)] bg-white p-5">
          <h5 className="text-sm font-semibold text-[var(--color-idea-text)]">Update Stock</h5>

          <p className="mt-1 text-[10px] text-[var(--color-idea-muted)]">
            Add or remove quantity from a specific storage location.
          </p>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-[var(--color-idea-muted)]">
                Location
              </label>

              <select
                value={selectedLoc}
                onChange={(event) => setSelectedLoc(event.target.value)}
                className="idea-input w-full p-2.5 text-xs"
              >
                <option value="">Select location</option>

                {locations.map((location) => (
                  <option key={location.id} value={location.id}>
                    {location.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-[var(--color-idea-muted)]">
                Quantity ({item.unit})
              </label>

              <input
                type="number"
                min="1"
                value={qtyInput}
                onChange={(event) => setQtyInput(Math.max(1, Number(event.target.value)))}
                className="idea-input w-full p-2.5 text-xs font-mono"
              />
            </div>
          </div>

          <input
            type="text"
            value={remarksInput}
            onChange={(event) => setRemarksInput(event.target.value)}
            placeholder="Optional details"
            className="idea-input mt-3 w-full p-2.5 text-xs"
          />

          <div className="mt-4 flex gap-3">
            <button
              type="button"
              onClick={() => handleStockSubmit('RECEIVE')}
              className="flex-1 rounded-xl bg-[var(--color-idea-text)] py-2.5 text-xs font-semibold text-white transition-colors hover:bg-[var(--color-idea-blue)]"
            >
              Add Stock
            </button>

            <button
              type="button"
              onClick={() => handleStockSubmit('ISSUE')}
              className="flex-1 rounded-xl border border-[var(--color-idea-border)] py-2.5 text-xs font-semibold text-[var(--color-idea-text)] transition-colors hover:bg-[var(--color-idea-light-grey)]"
            >
              Remove Stock
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderLocationActions = (initialLocation: Location) => {
    const location = activeLocationId
      ? locations.find((l) => l.id === activeLocationId) || initialLocation
      : initialLocation;
    const assetsInLocation = assets.filter((asset) => asset.location_id === location.id);
    const stockInLocation = stockLevels.filter(
      (stock) => stock.location_id === location.id && (stock.quantity ?? 0) > 0
    );
    const childLocations = locations.filter((l) => l.parent_id === location.id);
    const fullPath = getLocationFullPathString(location, locations);
    const locTypeName = location.type || inferLocationType(location.name);

    const itemsInLocation = stockInLocation
      .map((stock) => ({
        stock,
        catalogItem: findCatalogItem(stock.catalog_item_id),
      }))
      .filter(
        (
          entry
        ): entry is {
          stock: StockLevel;
          catalogItem: CatalogItem;
        } => Boolean(entry.catalogItem)
      );

    const handleAddStockHere = (e: React.FormEvent) => {
      e.preventDefault();
      if (!targetCatalogItemId) return alert('Select an item to add.');
      if (targetStockQty <= 0) return alert('Quantity must be greater than 0.');
      InventoryStorage.adjustStock(
        targetCatalogItemId,
        location.id,
        targetStockQty,
        'RECEIVE',
        'Added via location QR scan'
      );
      triggerSuccess();
    };

    const handleMoveAssetHere = (e: React.FormEvent) => {
      e.preventDefault();
      if (!targetMoveAssetId) return alert('Select an asset to move.');
      const movingAsset = assets.find((a) => a.id === targetMoveAssetId);
      if (!movingAsset) return;
      InventoryStorage.updateAssetStatus(
        movingAsset.id,
        movingAsset.status,
        location.id,
        `Moved to ${location.name} via location QR scan`
      );
      triggerSuccess();
    };

    return (
      <div className="space-y-4">
        {/* Location Header Card */}
        <div className="relative overflow-hidden rounded-2xl border border-[var(--color-idea-border)] bg-[var(--color-idea-light-grey)]/40 p-4 sm:p-5">
          <div className="absolute left-0 top-0 h-1 w-full bg-[var(--color-idea-blue)]" />

          {activeLocationId && activeLocationId !== initialLocation.id && (
            <button
              type="button"
              onClick={() => setActiveLocationId(null)}
              className="text-[11px] text-[var(--color-idea-blue)] font-semibold mb-2 flex items-center gap-1 hover:underline cursor-pointer"
            >
              ← Back to scanned location ({initialLocation.name})
            </button>
          )}

          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-[var(--color-idea-muted)]">
                LOCATION
              </span>

              <div className="mt-1 flex items-center gap-2 flex-wrap">
                <h4 className="text-xl font-bold text-[var(--color-idea-text)]">{location.name}</h4>
                <span className="px-2 py-0.5 text-[10px] font-semibold rounded bg-slate-100 text-slate-700 border border-slate-200/60">
                  {locTypeName}
                </span>
              </div>

              <div className="mt-1">
                <LocationPathBreadcrumb path={fullPath} />
              </div>

              <p className="mt-1 text-xs font-mono font-semibold text-[var(--color-idea-blue)]">
                {location.code || location.id}
              </p>
            </div>

            <button
              type="button"
              onClick={() => onOpenQRGenerator(location.id, location.name, fullPath)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--color-idea-border)] px-3 py-2 text-xs font-semibold text-[var(--color-idea-text)] transition-colors hover:bg-white shrink-0 cursor-pointer"
            >
              <QrCode className="h-4 w-4" />
              <span>Print QR</span>
            </button>
          </div>
        </div>

        {/* Staff Action Tabs */}
        {!studentMode && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setLocActionTab(locActionTab === 'ADD_STOCK' ? 'VIEW' : 'ADD_STOCK')}
              className={`flex-1 py-2 px-3 rounded-xl text-xs font-semibold transition-colors cursor-pointer border ${
                locActionTab === 'ADD_STOCK'
                  ? 'bg-[var(--color-idea-blue)] text-white border-[var(--color-idea-blue)]'
                  : 'bg-white border-[var(--color-idea-border)] text-[var(--color-idea-text)] hover:bg-[var(--color-idea-light-grey)]'
              }`}
            >
              {locActionTab === 'ADD_STOCK' ? 'Cancel Add' : '+ Add Stock Here'}
            </button>
            <button
              type="button"
              onClick={() => setLocActionTab(locActionTab === 'MOVE_ASSET' ? 'VIEW' : 'MOVE_ASSET')}
              className={`flex-1 py-2 px-3 rounded-xl text-xs font-semibold transition-colors cursor-pointer border ${
                locActionTab === 'MOVE_ASSET'
                  ? 'bg-[var(--color-idea-blue)] text-white border-[var(--color-idea-blue)]'
                  : 'bg-white border-[var(--color-idea-border)] text-[var(--color-idea-text)] hover:bg-[var(--color-idea-light-grey)]'
              }`}
            >
              {locActionTab === 'MOVE_ASSET' ? 'Cancel Move' : 'Move Asset Here'}
            </button>
          </div>
        )}

        {/* Add Stock Form */}
        {locActionTab === 'ADD_STOCK' && (
          <form
            onSubmit={handleAddStockHere}
            className="rounded-2xl border border-[var(--color-idea-border)] bg-white p-4 space-y-3"
          >
            <h5 className="text-xs font-bold uppercase tracking-wider text-[var(--color-idea-text)]">
              Add Item Stock into {location.name}
            </h5>
            <div>
              <label className="text-[10px] font-semibold text-[var(--color-idea-muted)] uppercase block mb-1">
                Item
              </label>
              <select
                required
                value={targetCatalogItemId}
                onChange={(e) => setTargetCatalogItemId(e.target.value)}
                className="idea-input w-full p-2 text-xs"
              >
                <option value="">Select item…</option>
                {catalogItems.map((ci) => (
                  <option key={ci.id} value={ci.id}>
                    {ci.name} ({ci.item_code})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-semibold text-[var(--color-idea-muted)] uppercase block mb-1">
                Quantity
              </label>
              <input
                type="number"
                min={1}
                required
                value={targetStockQty}
                onChange={(e) => setTargetStockQty(Math.max(1, parseInt(e.target.value, 10) || 1))}
                className="idea-input w-full p-2 text-xs"
              />
            </div>
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => setLocActionTab('VIEW')}
                className="flex-1 py-2 rounded-xl text-xs font-semibold border border-[var(--color-idea-border)] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="idea-button flex-1 py-2 rounded-xl text-xs font-semibold text-white cursor-pointer"
              >
                Confirm Add
              </button>
            </div>
          </form>
        )}

        {/* Move Asset Form */}
        {locActionTab === 'MOVE_ASSET' && (
          <form
            onSubmit={handleMoveAssetHere}
            className="rounded-2xl border border-[var(--color-idea-border)] bg-white p-4 space-y-3"
          >
            <h5 className="text-xs font-bold uppercase tracking-wider text-[var(--color-idea-text)]">
              Move Asset into {location.name}
            </h5>
            <div>
              <label className="text-[10px] font-semibold text-[var(--color-idea-muted)] uppercase block mb-1">
                Asset
              </label>
              <select
                required
                value={targetMoveAssetId}
                onChange={(e) => setTargetMoveAssetId(e.target.value)}
                className="idea-input w-full p-2 text-xs"
              >
                <option value="">Select equipment asset to move…</option>
                {assets
                  .filter((a) => a.location_id !== location.id && a.status !== 'ISSUED')
                  .map((a) => {
                    const currentLoc = locations.find((l) => l.id === a.location_id);
                    return (
                      <option key={a.id} value={a.id}>
                        {a.name || 'Equipment'}{a.serial_number ? ` (SN: ${a.serial_number})` : ''} — Currently:{' '}
                        {currentLoc ? currentLoc.name : 'Unassigned'}
                      </option>
                    );
                  })}
              </select>
            </div>
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => setLocActionTab('VIEW')}
                className="flex-1 py-2 rounded-xl text-xs font-semibold border border-[var(--color-idea-border)] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="idea-button flex-1 py-2 rounded-xl text-xs font-semibold text-white cursor-pointer"
              >
                Confirm Move
              </button>
            </div>
          </form>
        )}

        {/* Child Containers / Sub-locations */}
        {childLocations.length > 0 && (
          <div className="rounded-2xl border border-[var(--color-idea-border)] bg-white p-4">
            <h5 className="mb-2 text-xs font-bold uppercase tracking-wider text-[var(--color-idea-muted)]">
              Containers & Sub-locations ({childLocations.length})
            </h5>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {childLocations.map((child) => {
                const childAssets = assets.filter((a) => a.location_id === child.id).length;
                const childStock = stockLevels
                  .filter((s) => s.location_id === child.id)
                  .reduce((sum, s) => sum + (s.quantity || 0), 0);
                const childType = child.type || inferLocationType(child.name);

                return (
                  <button
                    key={child.id}
                    type="button"
                    onClick={() => setActiveLocationId(child.id)}
                    className="flex flex-col text-left p-2.5 rounded-xl border border-[var(--color-idea-border)] bg-slate-50/60 hover:bg-white hover:border-[var(--color-idea-blue)] transition-all cursor-pointer"
                    title={`Inspect ${child.name}`}
                  >
                    <div className="flex items-center justify-between gap-1 w-full">
                      <span className="text-xs font-bold text-[var(--color-idea-text)] truncate">{child.name}</span>
                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-white text-slate-600 border border-slate-200/60 shrink-0">
                        {childType}
                      </span>
                    </div>
                    <span className="text-[10px] text-[var(--color-idea-muted)] mt-1">
                      {childAssets} assets · {childStock} items
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Consumable Items directly here */}
        <div>
          <h5 className="mb-2 text-xs font-bold uppercase tracking-wider text-[var(--color-idea-muted)]">
            Items in this Location ({itemsInLocation.length})
          </h5>

          <div className="max-h-48 space-y-2 overflow-y-auto">
            {itemsInLocation.length === 0 ? (
              <p className="text-xs italic text-[var(--color-idea-muted)] p-2">
                No inventory items are stored directly in this spot.
              </p>
            ) : (
              itemsInLocation.map(({ stock, catalogItem }) => (
                <div
                  key={stock.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-[var(--color-idea-border)] bg-white p-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-xs font-semibold text-[var(--color-idea-text)]">{catalogItem.name}</p>
                    <p className="mt-0.5 text-[10px] font-mono text-[var(--color-idea-muted)]">
                      {stock.quantity} {catalogItem.unit}
                    </p>
                  </div>

                  {studentMode && (
                    <button
                      type="button"
                      onClick={() => openRequestForCatalogItem(catalogItem.id, 1)}
                      className="shrink-0 rounded-lg border border-[var(--color-idea-border)] px-3 py-1.5 text-[10px] font-semibold text-[var(--color-idea-text)] transition-colors hover:bg-[var(--color-idea-light-grey)] cursor-pointer"
                    >
                      Request
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Tracked Assets directly here */}
        <div>
          <h5 className="mb-2 text-xs font-bold uppercase tracking-wider text-[var(--color-idea-muted)]">
            Assets in this Location ({assetsInLocation.length})
          </h5>

          <div className="max-h-48 space-y-2 overflow-y-auto">
            {assetsInLocation.length === 0 ? (
              <p className="text-xs italic text-[var(--color-idea-muted)] p-2">
                No equipment assets are stored directly in this spot.
              </p>
            ) : (
              assetsInLocation.map((asset) => {
                const catalogItem = findCatalogItem(asset.catalog_item_id);

                return (
                  <div
                    key={asset.id}
                    className="flex items-center justify-between gap-3 rounded-xl border border-[var(--color-idea-border)] bg-white p-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-xs font-semibold text-[var(--color-idea-text)]">
                        {asset.name || catalogItem?.name || 'Equipment'}
                      </p>
                      <p className="mt-0.5 text-[10px] font-mono text-[var(--color-idea-blue)]">{asset.asset_code}</p>
                    </div>

                    <span className="shrink-0 rounded-lg border border-[var(--color-idea-border)] bg-[var(--color-idea-light-grey)] px-2 py-1 text-[9px] font-semibold uppercase tracking-wide text-[var(--color-idea-muted)]">
                      {asset.status.replace('_', ' ')}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderRequestActions = (request: Request) => {
    const requester = users.find((user) => user.id === request.user_id);

    return (
      <div className="space-y-5">
        <div className="relative overflow-hidden rounded-2xl border border-[var(--color-idea-border)] bg-[var(--color-idea-light-grey)]/40 p-5">
          <div className="absolute left-0 top-0 h-1 w-full bg-[var(--color-idea-blue)]" />

          <div className="flex items-start justify-between gap-4">
            <div>
              <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-[var(--color-idea-muted)]">
                REQUEST
              </span>

              <h4 className="mt-1 text-xl font-bold text-[var(--color-idea-text)]">{request.request_number}</h4>

              <p className="mt-0.5 text-xs font-mono font-semibold text-[var(--color-idea-blue)]">
                {requester?.name || 'Unknown requester'}
              </p>
            </div>

            <span className="rounded-lg border border-[var(--color-idea-border)] bg-white px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.2em] text-[var(--color-idea-text)]">
              {request.status}
            </span>
          </div>
        </div>

        <div className="rounded-2xl border border-[var(--color-idea-border)] bg-white p-4">
          <h5 className="text-sm font-semibold text-[var(--color-idea-text)]">Request summary</h5>

          <div className="mt-3 space-y-2 text-xs text-[var(--color-idea-muted)]">
            <div className="flex items-center justify-between gap-3">
              <span>Purpose</span>

              <span className="max-w-[60%] text-right font-medium text-[var(--color-idea-text)]">
                {request.purpose || 'Not specified'}
              </span>
            </div>

            <div className="flex items-center justify-between gap-3">
              <span>Items</span>

              <span className="font-mono font-semibold text-[var(--color-idea-text)]">
                {request.items?.length ?? 0}
              </span>
            </div>

            {request.deadline_at && (
              <div className="flex items-center justify-between gap-3">
                <span>Deadline</span>

                <span className="font-mono font-semibold text-[var(--color-idea-text)]">
                  {new Date(request.deadline_at).toLocaleDateString()}
                </span>
              </div>
            )}
          </div>
        </div>

        {request.items && request.items.length > 0 && (
          <div className="rounded-2xl border border-[var(--color-idea-border)] bg-white p-4">
            <h5 className="mb-3 text-sm font-semibold text-[var(--color-idea-text)]">Requested items</h5>

            <div className="space-y-2">
              {request.items.map((item) => {
                const assetObj = item.asset_id ? assets.find((asset) => asset.id === item.asset_id) : undefined;
                const itemName = item.catalog_item_id
                  ? findCatalogItem(item.catalog_item_id)?.name || 'Catalog item'
                  : item.asset_id
                    ? assetObj?.name || assetObj?.asset_code || 'Asset'
                    : 'Inventory item';

                return (
                  <div
                    key={item.id}
                    className="flex items-center justify-between gap-3 rounded-xl border border-[var(--color-idea-border)] bg-[var(--color-idea-light-grey)] px-3 py-2"
                  >
                    <span className="text-xs font-medium text-[var(--color-idea-text)]">{itemName}</span>

                    <span className="font-mono text-[10px] font-semibold text-[var(--color-idea-muted)]">
                      Qty {item.requested_qty}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="QR Action"
      subtitle={qrData.rawCode}
      category="Quick Scan"
      icon={<QrCode className="h-4 w-4" />}
      closeOnOutsideClick={true}
      closeOnEscape={true}
      maxWidth="lg"
      bodyClassName="p-6 overflow-y-auto"
    >
      {qrData.type === 'asset' && renderAssetActions(qrData.entity)}

      {qrData.type === 'catalog' && renderCatalogActions(qrData.entity)}

      {qrData.type === 'location' && renderLocationActions(qrData.entity)}

      {qrData.type === 'request' && renderRequestActions(qrData.entity)}

      {qrData.type === 'unknown' && (
        <div className="space-y-4 py-10 text-center">
          <AlertTriangle className="mx-auto h-12 w-12 text-[var(--color-idea-blue)]" />

          <div>
            <h4 className="text-lg font-bold text-[var(--color-idea-text)]">Code Not Found</h4>

            <p className="mx-auto mt-1 max-w-sm text-xs leading-relaxed text-[var(--color-idea-muted)]">
              No matching item, equipment, or location was found for this code.
            </p>

            <p className="mt-3 break-all rounded-lg bg-[var(--color-idea-light-grey)] px-3 py-2 font-mono text-xs font-semibold text-[var(--color-idea-text)]">
              {qrData.rawCode}
            </p>
          </div>
        </div>
      )}
    </Modal>
  );
};
