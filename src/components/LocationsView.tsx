import React, { useMemo, useState } from 'react';
import { Plus, MapPin, QrCode, Box, Layers, Search, ChevronRight, Pencil, Trash2, FolderPlus } from 'lucide-react';
import { Modal } from './Modal';
import { Location, CatalogItem, Asset, StockLevel, UserRole, LocationType } from '../types/inventory';
import {
  createLocationInFirestore,
  deleteFirestoreDocument,
  updateFirestoreDocument,
  COLLECTIONS,
} from '../services/firebaseInventory';
import {
  getLocationFullPathString,
  buildLocationMap,
  inferLocationType,
  getDescendantLocationIds,
} from '../utils/locationHierarchy';

// Mirrors Firestore rule: isStaff = ADMIN | STUDENT_LEAD | STUDENT_AMBASSADOR
const isStaff = (role?: UserRole) => role === 'ADMIN' || role === 'STUDENT_LEAD' || role === 'STUDENT_AMBASSADOR';

interface LocationsViewProps {
  locations: Location[];
  catalogItems: CatalogItem[];
  assets: Asset[];
  stockLevels: StockLevel[];
  userRole?: UserRole;
  onOpenQRGenerator: (code: string, title: string, subtitle?: string) => void;
  onRefreshData: () => Promise<void>;
}

// Clean breadcrumb to show physical storage path
export const LocationPathBreadcrumb: React.FC<{ path?: string | null }> = ({ path }) => {
  if (!path) {
    return <span className="text-[var(--color-idea-muted)] italic text-xs">Position not set</span>;
  }
  const steps = path
    .split(/>|\/|›/)
    .map((p) => p.trim())
    .filter(Boolean);
  if (steps.length === 0) {
    return <span className="text-[var(--color-idea-muted)] italic text-xs">Position not set</span>;
  }
  return (
    <div className="flex items-center gap-1 text-xs overflow-x-auto whitespace-nowrap scrollbar-none">
      {steps.map((step, index) => (
        <React.Fragment key={index}>
          {index > 0 && <ChevronRight className="w-3 h-3 text-[var(--color-idea-muted)] shrink-0" />}
          <span
            className={
              index === steps.length - 1
                ? 'font-semibold text-[var(--color-idea-text)]'
                : 'text-[var(--color-idea-muted)]'
            }
          >
            {step}
          </span>
        </React.Fragment>
      ))}
    </div>
  );
};

const STORAGE_TYPES: { id: LocationType; label: string }[] = [
  { id: 'ROOM', label: 'Room' },
  { id: 'ALMIRAH', label: 'Almirah' },
  { id: 'RACK', label: 'Rack' },
  { id: 'SHELF', label: 'Shelf' },
  { id: 'DRAWER', label: 'Drawer' },
  { id: 'BOX', label: 'Box' },
  { id: 'TABLE', label: 'Table' },
  { id: 'CABINET', label: 'Cabinet' },
  { id: 'CUSTOM', label: 'Custom' },
];

export const LocationsView: React.FC<LocationsViewProps> = ({
  locations,
  catalogItems,
  assets,
  stockLevels,
  userRole,
  onOpenQRGenerator,
  onRefreshData,
}) => {
  const [searchFilter, setSearchFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState<'ALL' | LocationType>('ALL');

  // Add Location Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [locName, setLocName] = useState('');
  const [locType, setLocType] = useState<LocationType>('ROOM');
  const [customType, setCustomType] = useState('');
  const [parentId, setParentId] = useState('');
  const [room, setRoom] = useState('');
  const [notes, setNotes] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Edit Location Modal
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingLoc, setEditingLoc] = useState<Location | null>(null);
  const [editLocName, setEditLocName] = useState('');
  const [editLocType, setEditLocType] = useState<LocationType>('ROOM');
  const [editCustomType, setEditCustomType] = useState('');
  const [editParentId, setEditParentId] = useState('');
  const [editRoom, setEditRoom] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editFormError, setEditFormError] = useState<string | null>(null);
  const [editSaving, setEditSaving] = useState(false);

  const locationMap = useMemo(() => buildLocationMap(locations), [locations]);

  const catalogById = useMemo(() => {
    const map = new Map<string, CatalogItem>();
    catalogItems.forEach((item) => {
      map.set(item.id, item);
      if (item.item_code) map.set(item.item_code, item);
    });
    return map;
  }, [catalogItems]);

  const contentsByLocation = useMemo(() => {
    return locations.map((location) => {
      const assetsInLocation = assets.filter(
        (asset) => asset.status !== 'ISSUED' && asset.location_id === location.id
      );
      const stockInLocation = stockLevels.filter(
        (stock) => stock.location_id === location.id && (stock.quantity ?? 0) > 0
      );
      const childLocations = locations.filter((l) => l.parent_id === location.id);
      const consumableQuantity = stockInLocation.reduce((total, stock) => total + (stock.quantity ?? 0), 0);
      const fullPath = getLocationFullPathString(location, locations);

      return {
        loc: location,
        fullPath,
        assetsInLocation,
        stockInLocation,
        childLocations,
        consumableQuantity,
      };
    });
  }, [locations, assets, stockLevels]);

  const filteredLocations = useMemo(() => {
    let result = contentsByLocation;

    if (typeFilter !== 'ALL') {
      result = result.filter(({ loc }) => (loc.type || inferLocationType(loc.name)) === typeFilter);
    }

    const query = searchFilter.trim().toLowerCase();
    if (!query) return result;

    return result.filter(({ loc, fullPath, assetsInLocation, stockInLocation, childLocations }) => {
      if (
        loc.name.toLowerCase().includes(query) ||
        (loc.code ?? '').toLowerCase().includes(query) ||
        fullPath.toLowerCase().includes(query) ||
        (loc.room ?? '').toLowerCase().includes(query) ||
        (loc.type ?? '').toLowerCase().includes(query) ||
        (loc.custom_type ?? '').toLowerCase().includes(query)
      ) {
        return true;
      }

      // Match any child location name
      if (childLocations.some((c) => c.name.toLowerCase().includes(query) || (c.code ?? '').toLowerCase().includes(query))) {
        return true;
      }

      // Match item stored here
      const hasAsset = assetsInLocation.some(
        (a) => a.name.toLowerCase().includes(query) || a.asset_code.toLowerCase().includes(query)
      );
      if (hasAsset) return true;

      const hasStock = stockInLocation.some((s) => {
        const item = catalogById.get(s.catalog_item_id);
        return item && (item.name.toLowerCase().includes(query) || item.item_code.toLowerCase().includes(query));
      });
      return hasStock;
    });
  }, [contentsByLocation, searchFilter, typeFilter, catalogById]);

  const resetAddForm = () => {
    setLocName('');
    setLocType('ROOM');
    setCustomType('');
    setParentId('');
    setRoom('');
    setNotes('');
    setFormError(null);
  };

  const openAddModalWithParent = (parentLoc: Location) => {
    resetAddForm();
    setParentId(parentLoc.id);
    // Suggest an intuitive sub-type based on parent
    const parentT = parentLoc.type || inferLocationType(parentLoc.name);
    if (parentT === 'ROOM') setLocType('ALMIRAH');
    else if (parentT === 'ALMIRAH' || parentT === 'RACK') setLocType('SHELF');
    else if (parentT === 'SHELF' || parentT === 'TABLE') setLocType('BOX');
    else setLocType('DRAWER');
    setShowAddModal(true);
  };

  const handleAddLocation = async (event: React.FormEvent) => {
    event.preventDefault();
    setFormError(null);
    let name = locName.trim();
    if (!name) {
      setFormError('Location name is required.');
      return;
    }

    name = name
      .split(/\s+/)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(' ');

    const duplicate = locations.some(
      (l) => l.name.trim().toLowerCase() === name.toLowerCase() && (l.parent_id || null) === (parentId || null)
    );
    if (duplicate) {
      setFormError('A location with this name already exists under the selected parent.');
      return;
    }

    setSaving(true);
    try {
      // Build full path
      const parentObj = parentId ? locationMap.get(parentId) : null;
      const parentPath = parentObj ? getLocationFullPathString(parentObj, locations) : '';
      const storage_path = parentPath ? `${parentPath} › ${name}` : name;

      await createLocationInFirestore({
        name,
        type: locType,
        custom_type: locType === 'CUSTOM' ? customType.trim() || null : null,
        parent_id: parentId.trim() || null,
        storage_path,
        room: room.trim() || null,
        notes: notes.trim() || null,
      });

      await onRefreshData();
      setShowAddModal(false);
      resetAddForm();
    } catch (error) {
      console.error('Failed to create location:', error);
      setFormError('Failed to create location. Check permissions and try again.');
    } finally {
      setSaving(false);
    }
  };

  const openEditModal = (loc: Location) => {
    setEditingLoc(loc);
    setEditLocName(loc.name);
    setEditLocType(loc.type || inferLocationType(loc.name));
    setEditCustomType(loc.custom_type || '');
    setEditParentId(loc.parent_id || '');
    setEditRoom(loc.room || '');
    setEditNotes(loc.notes || '');
    setEditFormError(null);
    setShowEditModal(true);
  };

  const handleEditLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLoc) return;
    setEditFormError(null);

    let name = editLocName.trim();
    if (!name) {
      setEditFormError('Location name is required.');
      return;
    }

    name = name
      .split(/\s+/)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(' ');

    if (editParentId) {
      if (editParentId === editingLoc.id) {
        setEditFormError('A location cannot be its own parent.');
        return;
      }
      const descendantIds = getDescendantLocationIds(editingLoc.id, locations);
      if (descendantIds.has(editParentId)) {
        setEditFormError('A location cannot have one of its sub-locations as its parent.');
        return;
      }
    }

    setEditSaving(true);
    try {
      const parentObj = editParentId ? locationMap.get(editParentId) : null;
      const parentPath = parentObj ? getLocationFullPathString(parentObj, locations) : '';
      const storage_path = parentPath ? `${parentPath} › ${name}` : name;

      await updateFirestoreDocument(COLLECTIONS.LOCATIONS, editingLoc.id, {
        name,
        type: editLocType,
        custom_type: editLocType === 'CUSTOM' ? editCustomType.trim() || null : null,
        parent_id: editParentId.trim() || null,
        storage_path,
        room: editRoom.trim() || null,
        notes: editNotes.trim() || null,
        updated_at: new Date().toISOString(),
      });

      await onRefreshData();
      setShowEditModal(false);
      setEditingLoc(null);
    } catch (error) {
      console.error('Failed to update location:', error);
      setEditFormError('Failed to update location.');
    } finally {
      setEditSaving(false);
    }
  };

  const handleDeleteLocation = async (loc: Location) => {
    const hasChildren = locations.some((l) => l.parent_id === loc.id);
    const msg = hasChildren
      ? `Delete "${loc.name}"? It contains sub-locations inside it.`
      : `Delete location "${loc.name}"?`;
    if (!window.confirm(msg)) return;

    try {
      await deleteFirestoreDocument(COLLECTIONS.LOCATIONS, loc.id);
      await onRefreshData();
    } catch (error: any) {
      console.error('Failed to delete location:', error);
      alert(error?.message || 'Failed to delete location.');
    }
  };

  return (
    <div className="flex-1 min-h-0 overflow-y-auto idea-bg">
      <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6 sm:space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--color-idea-border)] pb-5 sm:pb-6">
          <div>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-idea-blue)]">
              IDEA Lab · Storage
            </span>
            <h1 className="mt-1 text-2xl sm:text-3xl font-bold tracking-tight text-[var(--color-idea-text)]">
              Locations
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-[var(--color-idea-muted)] max-w-2xl leading-relaxed">
              Organize storage rooms, almirahs, racks, shelves, drawers, boxes, and tables.
            </p>
          </div>
          {isStaff(userRole) && (
            <button
              type="button"
              onClick={() => {
                resetAddForm();
                setShowAddModal(true);
              }}
              className="idea-button flex items-center justify-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-semibold rounded-xl cursor-pointer shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Add Location</span>
            </button>
          )}
        </div>

        {/* Search & Type Filter Toolbar */}
        <div className="idea-card p-3 sm:p-4 space-y-3">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="relative w-full md:w-96">
              <Search className="w-4 h-4 text-[var(--color-idea-muted)] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                placeholder="Search by name, path, code, or stored item…"
                className="idea-input w-full pl-9 pr-4 py-2 text-xs sm:text-sm"
              />
            </div>
            <span className="text-xs text-[var(--color-idea-muted)] shrink-0">
              Showing {filteredLocations.length} of {locations.length} locations
            </span>
          </div>

          {/* Type Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
            <button
              type="button"
              onClick={() => setTypeFilter('ALL')}
              className={`px-3 py-1 rounded-lg font-semibold transition-all cursor-pointer whitespace-nowrap ${
                typeFilter === 'ALL'
                  ? 'bg-[var(--color-idea-blue)] text-white'
                  : 'bg-[var(--color-idea-light-grey)] text-[var(--color-idea-muted)] hover:text-[var(--color-idea-text)]'
              }`}
            >
              All Types
            </button>
            {STORAGE_TYPES.map((t) => {
              const count = locations.filter((l) => (l.type || inferLocationType(l.name)) === t.id).length;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTypeFilter(t.id)}
                  className={`px-2.5 py-1 rounded-lg font-medium transition-all cursor-pointer whitespace-nowrap flex items-center gap-1 ${
                    typeFilter === t.id
                      ? 'bg-[var(--color-idea-blue)] text-white'
                      : 'bg-[var(--color-idea-light-grey)] text-[var(--color-idea-muted)] hover:text-[var(--color-idea-text)]'
                  }`}
                >
                  <span>{t.label}</span>
                  {count > 0 && <span className="opacity-70 text-[10px]">({count})</span>}
                </button>
              );
            })}
          </div>
        </div>

        {/* Locations Grid */}
        {filteredLocations.length === 0 ? (
          <div className="idea-card p-12 text-center">
            <MapPin className="w-9 h-9 text-[var(--color-idea-blue)] mx-auto mb-3" />
            <p className="font-semibold text-[var(--color-idea-text)]">
              {searchFilter.trim() || typeFilter !== 'ALL' ? 'No matching locations found.' : 'No storage locations found.'}
            </p>
            <p className="text-xs text-[var(--color-idea-muted)] mt-1">
              {searchFilter.trim() || typeFilter !== 'ALL'
                ? 'Try clearing the search or filter.'
                : 'Add a room, almirah, rack, or storage box to begin.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredLocations.map(({ loc, fullPath, assetsInLocation, stockInLocation, childLocations, consumableQuantity }) => {
              const locationCode = loc.code || loc.id;
              const typeName = STORAGE_TYPES.find((t) => t.id === (loc.type || inferLocationType(loc.name)))?.label || 'Spot';

              return (
                <div
                  key={loc.id}
                  className="idea-card p-5 flex flex-col justify-between hover:border-[var(--color-idea-blue)]/40 transition-all shadow-xs"
                >
                  <div>
                    {/* Location Card Header */}
                    <div className="flex items-start justify-between gap-3 pb-3 border-b border-[var(--color-idea-border)]">
                      <div className="min-w-0 text-left">
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-[var(--color-idea-text)] text-sm truncate">{loc.name}</h3>
                          <span className="px-1.5 py-0.5 text-[9px] font-medium rounded bg-slate-100 text-slate-700 border border-slate-200/60">
                            {typeName}
                          </span>
                        </div>
                        <div className="mt-1">
                          <LocationPathBreadcrumb path={fullPath} />
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => onOpenQRGenerator(locationCode, loc.name, fullPath)}
                          className="p-2 idea-button rounded-lg hover:opacity-90 transition-opacity cursor-pointer"
                          title="Generate QR code"
                          aria-label={`Generate QR code for ${loc.name}`}
                        >
                          <QrCode className="w-4 h-4" />
                        </button>
                        {isStaff(userRole) && (
                          <>
                            <button
                              type="button"
                              onClick={() => openAddModalWithParent(loc)}
                              className="p-2 rounded-lg border border-[var(--color-idea-border)] hover:bg-[var(--color-idea-light-grey)] transition-colors cursor-pointer text-slate-600"
                              title={`Add sub-location inside ${loc.name}`}
                            >
                              <FolderPlus className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => openEditModal(loc)}
                              className="p-2 rounded-lg border border-[var(--color-idea-border)] hover:bg-[var(--color-idea-light-grey)] transition-colors cursor-pointer"
                              title="Edit location"
                            >
                              <Pencil className="w-4 h-4 text-[var(--color-idea-text)]" />
                            </button>
                            <button
                              type="button"
                              onClick={() => void handleDeleteLocation(loc)}
                              className="p-2 rounded-lg border border-red-200 text-red-500 hover:bg-red-50 transition-colors cursor-pointer"
                              title="Delete location"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Summary metrics */}
                    <div className="mt-4 text-left">
                      <div className="idea-gradient-soft border border-[var(--color-idea-blue)]/20 rounded-xl p-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="flex items-center gap-2 text-[10px] font-medium uppercase tracking-wider text-[var(--color-idea-muted)]">
                            <Layers className="w-3.5 h-3.5 text-[var(--color-idea-blue)]" />
                            Assets
                          </span>
                          <span className="font-mono text-xs font-bold text-[var(--color-idea-text)]">
                            {assetsInLocation.length}
                          </span>
                        </div>
                        <div className="border-t border-[var(--color-idea-border)]/60 pt-2 flex items-center justify-between">
                          <span className="flex items-center gap-2 text-[10px] font-medium uppercase tracking-wider text-[var(--color-idea-muted)]">
                            <Box className="w-3.5 h-3.5 text-[var(--color-idea-green)]" />
                            Items
                          </span>
                          <span className="font-mono text-xs font-bold text-[var(--color-idea-text)]">
                            {consumableQuantity} pcs
                          </span>
                        </div>
                        {childLocations.length > 0 && (
                          <div className="border-t border-[var(--color-idea-border)]/60 pt-2 flex items-center justify-between">
                            <span className="flex items-center gap-2 text-[10px] font-medium uppercase tracking-wider text-[var(--color-idea-muted)]">
                              <MapPin className="w-3.5 h-3.5 text-amber-500" />
                              Sub-locations
                            </span>
                            <span className="font-mono text-xs font-bold text-[var(--color-idea-text)]">
                              {childLocations.length}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Sub-locations list */}
                    {childLocations.length > 0 && (
                      <div className="mt-3 text-left">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-idea-muted)] mb-1.5">
                          Inside this {typeName.toLowerCase()} ({childLocations.length})
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {childLocations.map((child) => (
                            <button
                              key={child.id}
                              type="button"
                              onClick={() => setSearchFilter(child.name)}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200/50 transition-colors cursor-pointer"
                              title={`Filter to ${child.name}`}
                            >
                              <span>{child.name}</span>
                              <span className="text-[9px] text-slate-400">
                                ({STORAGE_TYPES.find((t) => t.id === (child.type || inferLocationType(child.name)))?.label || 'Spot'})
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Contents Preview */}
                    <div className="mt-3 text-left">
                      <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--color-idea-muted)] mb-1.5">
                        Stored Contents
                      </p>
                      <div className="space-y-1.5 bg-[var(--color-idea-light-grey)]/40 p-2.5 rounded-xl border border-[var(--color-idea-border)]/60">
                        {assetsInLocation.slice(0, 3).map((asset) => (
                          <div key={asset.id} className="flex items-center justify-between text-xs py-0.5">
                            <span className="text-[var(--color-idea-text)] font-medium truncate pr-2">
                              • {asset.name}
                            </span>
                            <span className="font-mono text-[9px] text-[var(--color-idea-muted)] shrink-0">
                              {asset.asset_code}
                            </span>
                          </div>
                        ))}
                        {stockInLocation.slice(0, 3).map((stock) => {
                          const item = catalogById.get(stock.catalog_item_id);
                          return (
                            <div key={stock.id} className="flex items-center justify-between text-xs py-0.5">
                              <span className="text-[var(--color-idea-text)] font-medium truncate pr-2">
                                • {item?.name || 'Item'}
                              </span>
                              <span className="font-mono text-[10px] text-[var(--color-idea-blue)] font-semibold shrink-0">
                                {stock.quantity} {item?.unit || 'pcs'}
                              </span>
                            </div>
                          );
                        })}
                        {assetsInLocation.length === 0 && stockInLocation.length === 0 && (
                          <p className="text-xs text-[var(--color-idea-muted)] italic py-1 text-center">
                            No items stored directly here.
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add Location Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Add Location"
        category="Lab Storage"
        icon={<MapPin className="w-4 h-4" />}
        preventClose={saving}
        closeOnOutsideClick={true}
        closeOnEscape={true}
        maxWidth="md"
        bodyClassName="p-6"
      >
        <form onSubmit={handleAddLocation} className="space-y-4">
          {formError && <div className="idea-error rounded-xl px-3 py-2.5 text-xs">{formError}</div>}

          <div>
            <label className="text-[11px] font-medium uppercase text-[var(--color-idea-muted)] tracking-wider">
              Location Name
            </label>
            <input
              type="text"
              required
              autoFocus
              placeholder="e.g. Almirah A, Shelf 2, Box B04, Testing Table…"
              value={locName}
              onChange={(e) => setLocName(e.target.value)}
              className="idea-input mt-1.5 p-2.5 text-xs w-full"
            />
          </div>

          <div>
            <label className="text-[11px] font-medium uppercase text-[var(--color-idea-muted)] tracking-wider">
              Storage Type
            </label>
            <select
              value={locType}
              onChange={(e) => setLocType(e.target.value as LocationType)}
              className="idea-input mt-1.5 p-2.5 text-xs w-full"
            >
              {STORAGE_TYPES.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          {locType === 'CUSTOM' && (
            <div>
              <label className="text-[11px] font-medium uppercase text-[var(--color-idea-muted)] tracking-wider">
                Custom Type Label
              </label>
              <input
                type="text"
                placeholder="e.g. Fume Hood, Nitrogen Tank, Pallet…"
                value={customType}
                onChange={(e) => setCustomType(e.target.value)}
                className="idea-input mt-1.5 p-2.5 text-xs w-full"
              />
            </div>
          )}

          <div>
            <label className="text-[11px] font-medium uppercase text-[var(--color-idea-muted)] tracking-wider">
              Parent Location (Optional)
            </label>
            <select
              value={parentId}
              onChange={(e) => setParentId(e.target.value)}
              className="idea-input mt-1.5 p-2.5 text-xs w-full"
            >
              <option value="">None (Top-Level Area / Room)</option>
              {locations.map((l) => (
                <option key={l.id} value={l.id}>
                  {getLocationFullPathString(l, locations)}
                </option>
              ))}
            </select>
            <p className="text-[11px] text-[var(--color-idea-muted)] mt-1">
              Select the container or room this spot sits inside.
            </p>
          </div>

          <div>
            <label className="text-[11px] font-medium uppercase text-[var(--color-idea-muted)] tracking-wider">
              Room / Department (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Room 204, Electronics Wing"
              value={room}
              onChange={(e) => setRoom(e.target.value)}
              className="idea-input mt-1.5 p-2.5 text-xs w-full"
            />
          </div>

          <div>
            <label className="text-[11px] font-medium uppercase text-[var(--color-idea-muted)] tracking-wider">
              Notes (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Dry storage, for robotics kits only…"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="idea-input mt-1.5 p-2.5 text-xs w-full"
            />
          </div>

          {/* Path Preview */}
          <div className="p-3 bg-[var(--color-idea-light-grey)]/60 rounded-xl border border-[var(--color-idea-border)]">
            <span className="text-[10px] text-[var(--color-idea-muted)] block mb-1">Storage Path:</span>
            <LocationPathBreadcrumb
              path={
                parentId
                  ? `${getLocationFullPathString(locationMap.get(parentId), locations)} › ${locName.trim() || 'New Spot'}`
                  : locName.trim() || 'New Spot'
              }
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowAddModal(false)}
              className="px-4 py-2 rounded-xl border border-[var(--color-idea-border)] text-[var(--color-idea-text)] text-xs font-semibold cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="idea-button px-5 py-2 rounded-xl text-xs font-semibold text-white cursor-pointer"
            >
              {saving ? 'Creating…' : 'Create Location'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit Location Modal */}
      <Modal
        isOpen={showEditModal && !!editingLoc}
        onClose={() => {
          setShowEditModal(false);
          setEditingLoc(null);
        }}
        title="Edit Location"
        category="Lab Storage"
        icon={<Pencil className="w-4 h-4" />}
        preventClose={editSaving}
        closeOnOutsideClick={true}
        closeOnEscape={true}
        maxWidth="md"
        bodyClassName="p-6"
      >
        <form onSubmit={handleEditLocation} className="space-y-4">
          {editFormError && <div className="idea-error rounded-xl px-3 py-2.5 text-xs">{editFormError}</div>}

          <div>
            <label className="text-[11px] font-medium uppercase text-[var(--color-idea-muted)] tracking-wider">
              Location Name
            </label>
            <input
              type="text"
              required
              value={editLocName}
              onChange={(e) => setEditLocName(e.target.value)}
              className="idea-input mt-1.5 p-2.5 text-xs w-full"
            />
          </div>

          <div>
            <label className="text-[11px] font-medium uppercase text-[var(--color-idea-muted)] tracking-wider">
              Storage Type
            </label>
            <select
              value={editLocType}
              onChange={(e) => setEditLocType(e.target.value as LocationType)}
              className="idea-input mt-1.5 p-2.5 text-xs w-full"
            >
              {STORAGE_TYPES.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[11px] font-medium uppercase text-[var(--color-idea-muted)] tracking-wider">
              Parent Location
            </label>
            <select
              value={editParentId}
              onChange={(e) => setEditParentId(e.target.value)}
              className="idea-input mt-1.5 p-2.5 text-xs w-full"
            >
              <option value="">None (Top-Level Area / Room)</option>
              {locations
                .filter((l) => l.id !== editingLoc?.id)
                .map((l) => (
                  <option key={l.id} value={l.id}>
                    {getLocationFullPathString(l, locations)}
                  </option>
                ))}
            </select>
          </div>

          <div>
            <label className="text-[11px] font-medium uppercase text-[var(--color-idea-muted)] tracking-wider">
              Room / Department (Optional)
            </label>
            <input
              type="text"
              value={editRoom}
              onChange={(e) => setEditRoom(e.target.value)}
              className="idea-input mt-1.5 p-2.5 text-xs w-full"
            />
          </div>

          <div>
            <label className="text-[11px] font-medium uppercase text-[var(--color-idea-muted)] tracking-wider">
              Notes (Optional)
            </label>
            <input
              type="text"
              value={editNotes}
              onChange={(e) => setEditNotes(e.target.value)}
              className="idea-input mt-1.5 p-2.5 text-xs w-full"
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowEditModal(false)}
              className="px-4 py-2 rounded-xl border border-[var(--color-idea-border)] text-[var(--color-idea-text)] text-xs font-semibold cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={editSaving}
              className="idea-button px-5 py-2 rounded-xl text-xs font-semibold text-white cursor-pointer"
            >
              {editSaving ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
