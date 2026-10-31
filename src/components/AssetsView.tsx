import React, { useEffect, useState } from 'react';
import { Plus, Search, QrCode, Pencil, Trash2 } from 'lucide-react';
import { Modal } from './Modal';
import { Asset, Location, User, AssetStatus, UserRole } from '../types/inventory';
import {
  COLLECTIONS,
  createAssetInFirestore,
  updateFirestoreDocument,
  deleteFirestoreDocument,
} from '../services/firebaseInventory';
import { InventoryStorage } from '../services/storage';
import { getLocationFullPathString } from '../utils/locationHierarchy';
import { LocationPathBreadcrumb } from './LocationsView';
import { uploadResourceImage } from '../services/resourceUploads';

// Mirrors Firestore rule for users who can change operational asset status.
const isStaff = (role?: UserRole) =>
  role === 'ADMIN' ||
  role === 'INSTITUTION_MANAGER' ||
  role === 'STUDENT_LEAD' ||
  role === 'STUDENT_AMBASSADOR';

interface AssetsViewProps {
  assets: Asset[];
  locations: Location[];
  users: User[];
  userRole?: UserRole;
  activeUser: User;
  onRefreshData: () => void;
  onOpenQRGenerator: (code: string, title: string, subtitle?: string) => void;
}

const EDITABLE_STATUSES: AssetStatus[] = ['AVAILABLE', 'UNDER_REVIEW', 'UNDER_REPAIR', 'DAMAGED', 'LOST'];

export const AssetsView: React.FC<AssetsViewProps> = ({
  assets,
  locations,
  users,
  userRole,
  activeUser,
  onRefreshData,
  onOpenQRGenerator,
}) => {
  const [statusFilter, setStatusFilter] = useState<AssetStatus | 'ALL'>('ALL');
  const [searchFilter, setSearchFilter] = useState('');

  // Add Asset Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [newAssetName, setNewAssetName] = useState('');
  const [newLocationId, setNewLocationId] = useState(locations[0]?.id || '');
  const [newNotes, setNewNotes] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newCategory, setNewCategory] = useState('Equipment');
  const [newEligibility, setNewEligibility] = useState('');
  const [newTraining, setNewTraining] = useState('');
  const [newSafety, setNewSafety] = useState('');
  const [newRestrictions, setNewRestrictions] = useState('');
  const [newInstitution, setNewInstitution] = useState('AICTE IDEA Lab');
  const [newImageUrl, setNewImageUrl] = useState('');
  const [newImageFile, setNewImageFile] = useState<File | null>(null);
  const [newApprovalRequired, setNewApprovalRequired] = useState(true);

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
      const loc = locations.find((l) => l.id === asset.location_id);
      const locPath = loc ? getLocationFullPathString(loc, locations).toLowerCase() : '';
      const locName = loc ? loc.name.toLowerCase() : '';
      const locCode = loc?.code ? loc.code.toLowerCase() : '';

      const matches =
        asset.asset_code.toLowerCase().includes(q) ||
        (asset.name || '').toLowerCase().includes(q) ||
        (asset.serial_number || '').toLowerCase().includes(q) ||
        (asset.storage_location || '').toLowerCase().includes(q) ||
        locName.includes(q) ||
        locCode.includes(q) ||
        locPath.includes(q);

      if (!matches) {
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
      const createdAsset = await createAssetInFirestore({
        name: newAssetName.trim(),
        description: newDescription.trim(),
        category: newCategory,
        institution: newInstitution.trim(),
        owner_id: activeUser.id,
        image_urls: newImageUrl.trim() ? [newImageUrl.trim()] : [],
        eligibility_requirements: newEligibility.trim(),
        training_requirements: newTraining.trim(),
        safety_instructions: newSafety.trim(),
        usage_restrictions: newRestrictions.trim(),
        approval_required: newApprovalRequired,
        booking_slot_minutes: 60,
        max_consecutive_bookings: 4,
        status: 'AVAILABLE',
        location_id: newLocationId,
        storage_location: null,
        assigned_to_user_id: null,
        tracking_mode: 'INDIVIDUAL',
        is_box: false,
        notes: newNotes ? newNotes : '',
      });
      const imageUrls = newImageUrl.trim() ? [newImageUrl.trim()] : [];
      if (newImageFile) {
        try {
          imageUrls.push(await uploadResourceImage(createdAsset.id, newImageFile));
          await updateFirestoreDocument(COLLECTIONS.ASSETS, createdAsset.id, { image_urls: imageUrls });
        } catch (error) {
          onRefreshData();
          throw new Error(
            `Resource created, but its image could not be uploaded: ${error instanceof Error ? error.message : 'upload failed'}`
          );
        }
      }

      setShowAddModal(false);
      setNewAssetName('');
      setNewNotes('');
      setNewDescription('');
      setNewCategory('Equipment');
      setNewEligibility('');
      setNewTraining('');
      setNewSafety('');
      setNewRestrictions('');
      setNewImageUrl('');
      setNewImageFile(null);

      onRefreshData();
      onOpenQRGenerator(createdAsset.asset_code, newAssetName.trim(), `Resource QR · ${createdAsset.asset_code}`);
    } catch (error) {
      console.error('Failed to create asset in Firestore:', error);
      alert(error instanceof Error ? error.message : 'Failed to create resource. Check Firebase permissions.');
    }
  };

  const getStatusBadge = (status: AssetStatus) => {
    switch (status) {
      case 'AVAILABLE':
        return 'idea-success';
      case 'ISSUED':
        return 'idea-info';
      case 'UNDER_REVIEW':
        return 'idea-warning';
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
    switch (status) {
      case 'ALL':
        return 'All Equipment';
      case 'AVAILABLE':
        return 'Available';
      case 'ISSUED':
        return 'Checked Out';
      case 'UNDER_REVIEW':
        return 'Return Under Review';
      case 'UNDER_REPAIR':
        return 'In Repair';
      case 'DAMAGED':
        return 'Damaged';
      case 'LOST':
        return 'Missing';
      default:
        return String(status).replace('_', ' ');
    }
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
    <div className="flex-1 min-h-0 overflow-y-auto idea-bg">
      <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6 sm:space-y-8">
        {/* Standard Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--color-idea-border)] pb-5 sm:pb-6">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-idea-blue)]">
                IDEA Lab · Equipment
              </span>
            </div>
            <h1 className="mt-1 text-2xl sm:text-3xl font-bold tracking-tight text-[var(--color-idea-text)]">
              Equipment
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-[var(--color-idea-muted)] max-w-2xl leading-relaxed">
              Manage individual tools, machines, instruments, and assignments.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowAddModal(true)}
              className="idea-button flex items-center justify-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-semibold rounded-xl cursor-pointer shrink-0 min-h-[42px]"
            >
              <Plus className="w-4 h-4" />
              <span>Add Equipment</span>
            </button>
          </div>
        </div>

        {/* Filter Toolbar */}
        <div className="idea-card p-3 sm:p-4 flex flex-col md:flex-row items-center justify-between gap-3 sm:gap-4">
          <div className="flex items-center gap-1.5 bg-[var(--color-idea-light-grey)] p-1 rounded-xl w-full md:w-auto overflow-x-auto border border-[var(--color-idea-border)]">
            {(['ALL', 'AVAILABLE', 'ISSUED', 'UNDER_REVIEW', 'UNDER_REPAIR', 'DAMAGED', 'LOST'] as const).map((m) => (
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
              placeholder="Search equipment by code, name, or serial…"
              className="idea-input pl-9 pr-4 py-2 text-xs sm:text-sm w-full"
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
                        <LocationPathBreadcrumb path={loc ? getLocationFullPathString(loc, locations) : null} />
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
                            onClick={() => onOpenQRGenerator(asset.asset_code, asset.name, 'Individual Asset')}
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
        <Modal
          isOpen={showEditAssetModal && !!editingAsset}
          onClose={closeEditAssetModal}
          title="Edit Equipment / Asset"
          subtitle={editingAsset ? editingAsset.name : undefined}
          category="Equipment Management"
          preventClose={editAssetSaving}
          closeOnOutsideClick={true}
          closeOnEscape={true}
          maxWidth="md"
          bodyClassName="max-h-[80vh] overflow-y-auto p-6"
        >
          {editingAsset && (
            <form onSubmit={handleEditAssetSubmit} className="space-y-4">
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
                      {getLocationFullPathString(l, locations)}
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

              <div className="pt-2 flex items-center gap-3">
                <button
                  type="button"
                  onClick={closeEditAssetModal}
                  disabled={editAssetSaving}
                  className="flex-1 py-2.5 border border-[var(--color-idea-border)] text-[var(--color-idea-text)] text-xs font-semibold rounded-xl hover:bg-[var(--color-idea-light-grey)] transition-colors cursor-pointer disabled:opacity-50 flex items-center justify-center"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editAssetSaving}
                  className="flex-1 py-2.5 idea-button text-xs font-semibold rounded-xl cursor-pointer disabled:opacity-50 flex items-center justify-center"
                >
                  {editAssetSaving ? 'Saving…' : 'Save Changes'}
                </button>
              </div>
            </form>
          )}
        </Modal>

        {/* Add Asset Modal */}
        <Modal
          isOpen={showAddModal}
          onClose={() => setShowAddModal(false)}
          title="Add Equipment / Asset"
          category="Equipment Management"
          closeOnOutsideClick={true}
          closeOnEscape={true}
          maxWidth="md"
          bodyClassName="p-6"
        >
          <form onSubmit={handleAddAssetSubmit} className="space-y-4">
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

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-[11px] font-medium uppercase text-[var(--color-idea-muted)] tracking-wider">
                Category
                <select
                  value={newCategory}
                  onChange={(event) => setNewCategory(event.target.value)}
                  className="idea-input mt-1 w-full p-2.5 text-xs normal-case"
                >
                  {['Laboratory', 'Classroom', 'Computer', 'Camera', 'Projector', 'Electronics', 'Testing instrument', 'Workshop tool', 'Space', 'Other'].map((category) => (
                    <option key={category}>{category}</option>
                  ))}
                </select>
              </label>
              <label className="text-[11px] font-medium uppercase text-[var(--color-idea-muted)] tracking-wider">
                Institution
                <input
                  value={newInstitution}
                  onChange={(event) => setNewInstitution(event.target.value)}
                  className="idea-input mt-1 w-full p-2.5 text-xs normal-case"
                />
              </label>
            </div>

            <label className="block text-[11px] font-medium uppercase text-[var(--color-idea-muted)] tracking-wider">
              Description
              <textarea
                value={newDescription}
                onChange={(event) => setNewDescription(event.target.value)}
                rows={2}
                className="idea-input mt-1 w-full resize-y p-2.5 text-xs normal-case"
                placeholder="What can people use this resource for?"
              />
            </label>

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
                    {getLocationFullPathString(l, locations)}
                  </option>
                ))}
              </select>
            </div>

            <label className="block text-[11px] font-medium uppercase text-[var(--color-idea-muted)] tracking-wider">
              Image URL (optional)
              <input
                type="url"
                value={newImageUrl}
                onChange={(event) => setNewImageUrl(event.target.value)}
                className="idea-input mt-1 w-full p-2.5 text-xs normal-case"
                placeholder="https://…"
              />
            </label>
            <label className="block text-[11px] font-medium uppercase text-[var(--color-idea-muted)] tracking-wider">
              Or upload an image (5 MB max)
              <input
                type="file"
                accept="image/*"
                onChange={(event) => setNewImageFile(event.target.files?.[0] ?? null)}
                className="mt-1 block w-full text-xs normal-case"
              />
            </label>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-[11px] font-medium uppercase text-[var(--color-idea-muted)] tracking-wider">
                Eligibility
                <input
                  value={newEligibility}
                  onChange={(event) => setNewEligibility(event.target.value)}
                  className="idea-input mt-1 w-full p-2.5 text-xs normal-case"
                  placeholder="Leave blank if open to all"
                />
              </label>
              <label className="text-[11px] font-medium uppercase text-[var(--color-idea-muted)] tracking-wider">
                Training required
                <input
                  value={newTraining}
                  onChange={(event) => setNewTraining(event.target.value)}
                  className="idea-input mt-1 w-full p-2.5 text-xs normal-case"
                />
              </label>
            </div>
            <label className="block text-[11px] font-medium uppercase text-[var(--color-idea-muted)] tracking-wider">
              Safety instructions
              <textarea
                value={newSafety}
                onChange={(event) => setNewSafety(event.target.value)}
                rows={2}
                className="idea-input mt-1 w-full resize-y p-2.5 text-xs normal-case"
              />
            </label>
            <label className="block text-[11px] font-medium uppercase text-[var(--color-idea-muted)] tracking-wider">
              Usage restrictions
              <input
                value={newRestrictions}
                onChange={(event) => setNewRestrictions(event.target.value)}
                className="idea-input mt-1 w-full p-2.5 text-xs normal-case"
              />
            </label>
            <label className="flex items-center gap-2 text-xs text-[var(--color-idea-text)]">
              <input
                type="checkbox"
                checked={newApprovalRequired}
                onChange={(event) => setNewApprovalRequired(event.target.checked)}
              />
              Owner approval required before booking
            </label>

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

            <div className="pt-2 flex items-center gap-3">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="flex-1 py-2.5 border border-[var(--color-idea-border)] text-[var(--color-idea-text)] text-xs font-semibold rounded-xl hover:bg-[var(--color-idea-light-grey)] transition-colors cursor-pointer flex items-center justify-center"
              >
                Cancel
              </button>

              <button
                type="submit"
                className="flex-1 py-2.5 idea-button text-xs font-semibold rounded-xl cursor-pointer flex items-center justify-center"
              >
                Add Asset
              </button>
            </div>
          </form>
        </Modal>
      </div>
    </div>
  );
};
