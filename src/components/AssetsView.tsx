import React, { useEffect, useState } from 'react';
import { Plus, Search, QrCode, Pencil, Trash2 } from 'lucide-react';
import { Asset, CatalogItem, Location, User, AssetStatus, UserRole } from '../types/inventory';
import {
  COLLECTIONS,
  createAssetInFirestore,
  updateFirestoreDocument,
  deleteFirestoreDocument,
} from '../services/firebaseInventory';
import { InventoryStorage } from '../services/storage';

// Mirrors Firestore rule: isStaff = ADMIN | STUDENT_LEAD | STUDENT_AMBASSADOR
const isStaff = (role?: UserRole) => role === 'ADMIN' || role === 'STUDENT_LEAD' || role === 'STUDENT_AMBASSADOR';

interface AssetsViewProps {
  assets: Asset[];
  locations: Location[];
  users: User[];
  userRole?: UserRole;
  onRefreshData: () => void;
  onOpenQRGenerator: (code: string, title: string, subtitle?: string) => void;
  onOpenBatchLabels?: () => void;
}

const EDITABLE_STATUSES: AssetStatus[] = ['AVAILABLE', 'UNDER_REPAIR', 'DAMAGED', 'LOST'];

export const AssetsView: React.FC<AssetsViewProps> = ({
  assets,
  locations,
  users,
  userRole,
  onRefreshData,
  onOpenQRGenerator,
  onOpenBatchLabels,
}) => {
  const [statusFilter, setStatusFilter] = useState<AssetStatus | 'ALL'>('ALL');
  const [searchFilter, setSearchFilter] = useState('');

  // Add Asset Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [newAssetName, setNewAssetName] = useState('');
  const [newLocationId, setNewLocationId] = useState(locations[0]?.id || '');
  const [newNotes, setNewNotes] = useState('');

  // Edit Asset Modal — now the single source of truth for name, status, location, notes
  const [showEditAssetModal, setShowEditAssetModal] = useState(false);
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
  const [editAssetName, setEditAssetName] = useState('');
  const [editAssetNotes, setEditAssetNotes] = useState('');
  const [editAssetStatus, setEditAssetStatus] = useState<AssetStatus>('AVAILABLE');
  const [editAssetLocationId, setEditAssetLocationId] = useState('');
  const [editAssetSaving, setEditAssetSaving] = useState(false);

  useEffect(() => {
    if (!newLocationId && locations.length > 0) {
      setNewLocationId(locations[0].id);
    }
  }, [locations, newLocationId]);

  const filteredAssets = assets.filter((asset) => {
    if (statusFilter !== 'ALL' && asset.status !== statusFilter) {
      return false;
    }

    if (searchFilter) {
      const q = searchFilter.toLowerCase();
      if (
        !asset.asset_code.toLowerCase().includes(q) &&
        !asset.storage_location?.toLowerCase().includes(q) &&
        !asset.name?.toLowerCase().includes(q)
      ) {
        return false;
      }
    }

    return true;
  });

  const handleAddAssetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newLocationId || !newAssetName.trim()) {
      return alert('Asset name and storage location are required.');
    }

    try {
      await createAssetInFirestore({
        name: newAssetName.trim(),
        status: 'AVAILABLE',
        location_id: newLocationId,
        storage_location: null,
        assigned_to_user_id: null,
        tracking_mode: 'INDIVIDUAL',
        is_box: false,
        notes: newNotes ? newNotes : '',
      });

      setShowAddModal(false);
      setNewAssetName('');
      setNewNotes('');

      onRefreshData();
    } catch (error) {
      console.error('Failed to create asset in Firestore:', error);
      alert('Failed to create asset. Check Firebase permissions.');
    }
  };

  const getStatusBadge = (status: AssetStatus) => {
    switch (status) {
      case 'AVAILABLE':
        return 'idea-success';
      case 'ISSUED':
        return 'idea-info';
      case 'UNDER_REPAIR':
        return 'idea-warning';
      case 'DAMAGED':
        return 'idea-error';
      case 'LOST':
      default:
        return '';
    }
  };

  const getStatusLabel = (status: AssetStatus | 'ALL') => {
    if (status === 'ALL') return 'All Assets';
    return status === 'LOST' ? 'MISSING' : status.replace('_', ' ');
  };

  const openEditAssetModal = (asset: Asset) => {
    setEditingAsset(asset);
    setEditAssetName(asset.name || '');
    setEditAssetNotes(asset.notes || '');
    setEditAssetStatus(asset.status);
    setEditAssetLocationId(asset.location_id || locations[0]?.id || '');
    setShowEditAssetModal(true);
  };

  const closeEditAssetModal = () => {
    setShowEditAssetModal(false);
    setEditingAsset(null);
  };

  const handleEditAssetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAsset || !editAssetName.trim()) return;

    if (!isStaff(userRole) && editAssetStatus !== editingAsset.status) {
      alert('Only staff can update asset status.');
      return;
    }

    if (editingAsset.status === 'ISSUED' && editAssetStatus !== editingAsset.status) {
      alert('This asset is currently issued to a student. Use the return flow to mark it available again.');
      return;
    }

    setEditAssetSaving(true);
    try {
      const statusChanged = editAssetStatus !== editingAsset.status;
      const fallbackLocation = editAssetLocationId || editingAsset.location_id || locations[0]?.id || null;

      const nextLocationId = statusChanged
        ? editAssetStatus === 'AVAILABLE'
          ? fallbackLocation
          : editAssetStatus === 'LOST' || editAssetStatus === 'RETIRED'
            ? null
            : editAssetLocationId || null
        : editAssetLocationId || null;

      const nextAssignedTo =
        statusChanged &&
        (editAssetStatus === 'AVAILABLE' || editAssetStatus === 'DAMAGED' || editAssetStatus === 'UNDER_REPAIR')
          ? null
          : (editingAsset.assigned_to_user_id ?? null);

      await updateFirestoreDocument(COLLECTIONS.ASSETS, editingAsset.id, {
        name: editAssetName.trim(),
        notes: editAssetNotes,
        status: editAssetStatus,
        location_id: nextLocationId,
        assigned_to_user_id: nextAssignedTo,
        storage_location: null,
        updated_at: new Date().toISOString(),
      });

      try {
        InventoryStorage.updateAssetStatus(
          editingAsset.id,
          editAssetStatus,
          nextLocationId,
          `Asset updated via edit modal`
        );
      } catch (localStorageError) {
        console.warn('Could not update the legacy local asset cache:', localStorageError);
      }

      closeEditAssetModal();
      onRefreshData();
    } catch (error: any) {
      console.error('Failed to update asset:', error);
      alert(error?.message || 'Failed to update asset.');
    } finally {
      setEditAssetSaving(false);
    }
  };

  const handleDeleteAsset = async (asset: Asset) => {
    if (asset.status === 'ISSUED') {
      alert('Cannot delete an asset that is currently issued. Return it first.');
      return;
    }
    if (!window.confirm(`Delete asset "${asset.name || asset.asset_code}"? This cannot be undone.`)) return;
    try {
      await deleteFirestoreDocument(COLLECTIONS.ASSETS, asset.id);
      onRefreshData();
    } catch (error: any) {
      console.error('Failed to delete asset:', error);
      alert(error?.message || 'Failed to delete asset.');
    }
  };

  return (
    <div className="flex-1 overflow-y-auto idea-bg">
      <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6 sm:space-y-8">
        {/* Unified Standard Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--color-idea-border)] pb-5 sm:pb-6">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--color-idea-blue)]">
                AICTE IDEA LAB · ASSET REGISTRY
              </span>
            </div>
            <h1 className="mt-1 text-2xl sm:text-3xl font-bold tracking-tight text-[var(--color-idea-text)]">
              Assets & Equipment Tracking
            </h1>
            <p className="mt-1.5 text-xs sm:text-sm text-[var(--color-idea-muted)] max-w-2xl leading-relaxed">
              Track individual machines, testing instruments, bench tools, operational statuses, and assignments.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {onOpenBatchLabels && (
              <button
                type="button"
                onClick={onOpenBatchLabels}
                className="flex items-center justify-center gap-1.5 px-3.5 py-2.5 text-xs sm:text-sm font-semibold rounded-xl border border-[var(--color-idea-border)] bg-white text-[var(--color-idea-text)] hover:bg-[var(--color-idea-light-grey)] shadow-2xs cursor-pointer shrink-0 transition-all min-h-[42px]"
                title="Print batch QR label stickers"
              >
                <QrCode className="w-4 h-4 text-[var(--color-idea-blue)]" />
                <span className="hidden sm:inline">QR Sticker Sheets</span>
              </button>
            )}

            <button
              onClick={() => setShowAddModal(true)}
              className="idea-button flex items-center justify-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-semibold rounded-xl shadow-sm cursor-pointer shrink-0 min-h-[42px]"
            >
              <Plus className="w-4 h-4" />
              <span>Add Asset</span>
            </button>
          </div>
        </div>

        {/* Filter Toolbar */}
        <div className="idea-card p-3 sm:p-4 flex flex-col md:flex-row items-center justify-between gap-3 sm:gap-4">
          <div className="flex items-center gap-1.5 bg-[var(--color-idea-light-grey)] p-1 rounded-xl w-full md:w-auto overflow-x-auto border border-[var(--color-idea-border)]">
            {(['ALL', 'AVAILABLE', 'ISSUED', 'UNDER_REPAIR', 'DAMAGED', 'LOST'] as const).map((m) => (
              <button
                key={m}
                onClick={() => setStatusFilter(m)}
                className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                  statusFilter === m
                    ? 'bg-white text-[var(--color-idea-deep-blue)] shadow-sm'
                    : 'text-[var(--color-idea-muted)] hover:text-[var(--color-idea-text)]'
                }`}
              >
                {getStatusLabel(m)}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 text-[var(--color-idea-muted)] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              placeholder="Search assets by code, name, serial..."
              className="idea-input pl-9 pr-4 py-2.5 text-xs sm:text-sm w-full"
            />
          </div>
        </div>

      {/* Asset Table */}
      <div className="idea-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="text-[10px] font-bold text-[var(--color-idea-muted)] uppercase tracking-[0.2em] border-b border-[var(--color-idea-border)] bg-[var(--color-idea-light-grey)]">
                <th className="px-6 py-3.5">Asset Name</th>
                <th className="px-6 py-3.5">Status</th>
                <th className="px-6 py-3.5">Location</th>
                <th className="px-6 py-3.5">Assigned To</th>
                <th className="px-6 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-idea-border)]">
              {filteredAssets.map((asset) => {
                const loc = locations.find((l) => l.id === asset.location_id);
                const user = users.find((u) => u.id === asset.assigned_to_user_id);
                return (
                  <tr key={asset.id} className="hover:bg-[var(--color-idea-light-grey)] transition-colors">
                    <td className="px-6 py-4">
                      <p className="text-sm font-bold text-[var(--color-idea-text)]">{asset.name || 'Asset'}</p>
                    </td>
                    <td className="px-6 py-4">
                      {asset.status === 'ISSUED' ? (
                        <div className="w-fit rounded-lg border border-blue-200 bg-blue-50 px-2 py-1.5 text-[10px] font-semibold text-blue-700">
                          Auto: Issued to student
                        </div>
                      ) : (
                        <span
                          className={`inline-block text-[9px] px-2.5 py-1.5 rounded-full font-bold uppercase tracking-wider ${getStatusBadge(
                            asset.status
                          )}`}
                        >
                          {getStatusLabel(asset.status)}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-xs font-medium text-[var(--color-idea-text)]">
                      <div className="space-y-1">
                        <div className="font-bold text-[var(--color-idea-text)]">{loc?.name || 'Location not set'}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-xs font-medium">
                      <div
                        className={
                          asset.assigned_to_user_id
                            ? 'text-[var(--color-idea-blue)] font-bold'
                            : asset.status === 'AVAILABLE'
                              ? 'text-emerald-700 font-bold'
                              : 'text-[var(--color-idea-muted)] font-semibold'
                        }
                      >
                        {asset.assigned_to_user_id
                          ? user?.name || 'Student'
                          : asset.status === 'AVAILABLE'
                            ? 'Available for issue'
                            : `Status: ${getStatusLabel(asset.status)}`}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => onOpenQRGenerator(asset.asset_code, asset.name || 'Asset', 'Individual Asset')}
                          className="p-2 idea-button rounded-lg hover:opacity-90 transition-opacity cursor-pointer inline-flex"
                          title="Generate QR tag"
                        >
                          <QrCode className="w-4 h-4" />
                        </button>
                        {isStaff(userRole) && (
                          <>
                            <button
                              type="button"
                              onClick={() => openEditAssetModal(asset)}
                              className="p-2 rounded-lg border border-[var(--color-idea-border)] hover:bg-[var(--color-idea-light-grey)] transition-colors cursor-pointer inline-flex"
                              title="Edit asset"
                            >
                              <Pencil className="w-4 h-4 text-[var(--color-idea-text)]" />
                            </button>
                            <button
                              type="button"
                              onClick={() => void handleDeleteAsset(asset)}
                              className="p-2 rounded-lg border border-red-200 text-red-500 hover:bg-red-50 transition-colors cursor-pointer inline-flex"
                              title="Delete asset"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Asset Modal */}
      {showEditAssetModal && editingAsset && (
        <div className="fixed inset-0 bg-[var(--color-idea-text)]/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-[var(--color-idea-border)] shadow-2xl rounded-2xl w-full max-w-md overflow-hidden p-6 space-y-4">
            <div className="border-b border-[var(--color-idea-border)] pb-2">
              <h3 className="font-bold text-[var(--color-idea-text)] text-lg">Edit Asset</h3>
              <p className="text-[10px] text-[var(--color-idea-muted)] mt-0.5 font-mono">{editingAsset.asset_code}</p>
            </div>
            <form onSubmit={handleEditAssetSubmit} className="space-y-3">
              <div>
                <label className="text-[11px] font-medium uppercase text-[var(--color-idea-muted)] tracking-wider">
                  Asset Name
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={editAssetName}
                  onChange={(e) => setEditAssetName(e.target.value)}
                  className="idea-input mt-1 p-2.5 text-xs w-full"
                />
              </div>

              <div>
                <label className="text-[11px] font-medium uppercase text-[var(--color-idea-muted)] tracking-wider">
                  Status
                </label>
                {editingAsset.status === 'ISSUED' ? (
                  <div className="mt-1 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700">
                    Issued to student
                  </div>
                ) : (
                  <select
                    value={editAssetStatus}
                    onChange={(e) => setEditAssetStatus(e.target.value as AssetStatus)}
                    className="idea-input mt-1 p-2.5 text-xs w-full"
                  >
                    {EDITABLE_STATUSES.map((status) => (
                      <option key={status} value={status}>
                        {getStatusLabel(status)}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <label className="text-[11px] font-medium uppercase text-[var(--color-idea-muted)] tracking-wider">
                  Location
                </label>
                <select
                  value={editAssetLocationId}
                  onChange={(e) => setEditAssetLocationId(e.target.value)}
                  className="idea-input mt-1 p-2.5 text-xs w-full"
                  disabled={editAssetStatus === 'LOST' || editAssetStatus === 'RETIRED'}
                >
                  <option value="" disabled>
                    {locations.length === 0 ? 'Loading locations...' : 'Select storage location'}
                  </option>
                  {locations.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name} {l.storage_path ? `(${l.storage_path.replace(/>|\//g, ' › ')})` : ''}
                    </option>
                  ))}
                </select>
                {(editAssetStatus === 'LOST' || editAssetStatus === 'RETIRED') && (
                  <p className="text-[10px] text-[var(--color-idea-muted)] mt-1">
                    Location is cleared automatically for this status.
                  </p>
                )}
              </div>

              <div>
                <label className="text-[11px] font-medium uppercase text-[var(--color-idea-muted)] tracking-wider">
                  Inspection Notes
                </label>
                <input
                  type="text"
                  value={editAssetNotes}
                  onChange={(e) => setEditAssetNotes(e.target.value)}
                  placeholder="e.g. Minor cosmetic scratch on body"
                  className="idea-input mt-1 p-2.5 text-xs w-full"
                />
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={closeEditAssetModal}
                  disabled={editAssetSaving}
                  className="flex-1 py-2.5 border border-[var(--color-idea-border)] text-[var(--color-idea-text)] text-xs font-semibold rounded-xl hover:bg-[var(--color-idea-light-grey)] transition-colors cursor-pointer disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editAssetSaving}
                  className="flex-1 py-2.5 idea-button text-xs font-semibold rounded-xl cursor-pointer disabled:opacity-50"
                >
                  {editAssetSaving ? 'Saving…' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Asset Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-[var(--color-idea-text)]/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-[var(--color-idea-border)] shadow-2xl rounded-2xl w-full max-w-md overflow-hidden p-6 space-y-4">
            <h3 className="font-bold text-[var(--color-idea-text)] text-lg border-b border-[var(--color-idea-border)] pb-2">
              Add Asset
            </h3>

            <form onSubmit={handleAddAssetSubmit} className="space-y-3">
              <div>
                <label className="text-[11px] font-medium uppercase text-[var(--color-idea-muted)] tracking-wider">
                  Asset Name
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="e.g. Soldering Station 01"
                  value={newAssetName}
                  onChange={(e) => setNewAssetName(e.target.value)}
                  className="idea-input mt-1 p-2.5 text-xs w-full"
                />
              </div>

              <div>
                <label className="text-[11px] font-medium uppercase text-[var(--color-idea-muted)] tracking-wider">
                  Asset Status
                </label>
                <div className="mt-1 rounded-xl border border-[var(--color-idea-border)] bg-[var(--color-idea-light-grey)] px-3 py-2 text-xs font-semibold text-[var(--color-idea-text)]">
                  Available
                </div>
              </div>

              <div>
                <label className="text-[11px] font-medium uppercase text-[var(--color-idea-muted)] tracking-wider">
                  Location
                </label>
                <select
                  value={newLocationId}
                  onChange={(e) => setNewLocationId(e.target.value)}
                  className="idea-input mt-1 p-2.5 text-xs w-full"
                  required
                >
                  <option value="" disabled>
                    {locations.length === 0 ? 'Loading locations...' : 'Select storage location'}
                  </option>
                  {locations.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name} {l.storage_path ? `(${l.storage_path.replace(/>|\//g, ' › ')})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] font-medium uppercase text-[var(--color-idea-muted)] tracking-wider">
                  Inspection Notes
                </label>
                <input
                  type="text"
                  placeholder="e.g. Fresh batch sealed in box"
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  className="idea-input mt-1 p-2.5 text-xs w-full"
                />
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-2.5 border border-[var(--color-idea-border)] text-[var(--color-idea-text)] text-xs font-semibold rounded-xl hover:bg-[var(--color-idea-light-grey)] transition-colors cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="flex-1 py-2.5 idea-button text-xs font-semibold rounded-xl cursor-pointer"
                >
                  Add Asset
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      </div>
    </div>
  );
};
