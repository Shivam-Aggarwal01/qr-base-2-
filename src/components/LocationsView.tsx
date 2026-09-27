import React, { useMemo, useState } from 'react';
import { Plus, MapPin, QrCode, Box, Layers, Search, X, ChevronRight, Pencil, Trash2 } from 'lucide-react';
import { Location, CatalogItem, Asset, StockLevel, UserRole } from '../types/inventory';
import {
  createLocationInFirestore,
  deleteFirestoreDocument,
  updateFirestoreDocument,
  COLLECTIONS,
} from '../services/firebaseInventory';

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

function refsLocation(loc: Location, value?: string | null): boolean {
  if (!value) {
    return false;
  }
  const reference = value.trim().toLowerCase();
  if (!reference) {
    return false;
  }
  return (
    loc.id.toLowerCase() === reference ||
    (loc.code ?? '').toLowerCase() === reference ||
    loc.name.toLowerCase() === reference
  );
}

// Helper to render path steps like a physical lab route map
const LocationPathBreadcrumb: React.FC<{ path?: string | null }> = ({ path }) => {
  if (!path) {
    return <span className="text-[var(--color-idea-muted)] italic">Position not set</span>;
  }
  const steps = path
    .split(/>|\//)
    .map((p) => p.trim())
    .filter(Boolean);
  if (steps.length === 0) {
    return <span className="text-[var(--color-idea-muted)] italic">Position not set</span>;
  }
  return (
    <div className="flex items-center flex-wrap gap-1 text-xs">
      {steps.map((step, index) => (
        <React.Fragment key={index}>
          {index > 0 && <ChevronRight className="w-3 h-3 text-[var(--color-idea-muted)] shrink-0" />}
          <span
            className={
              index === steps.length - 1
                ? 'font-semibold text-[var(--color-idea-text)] truncate'
                : 'text-[var(--color-idea-muted)] truncate'
            }
          >
            {step}
          </span>
        </React.Fragment>
      ))}
    </div>
  );
};

export const LocationsView: React.FC<LocationsViewProps> = ({
  locations,
  catalogItems,
  assets,
  stockLevels,
  userRole,
  onOpenQRGenerator,
  onRefreshData,
}) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchFilter, setSearchFilter] = useState('');
  const [locName, setLocName] = useState('');
  const [storagePath, setStoragePath] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Edit Location Modal
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingLoc, setEditingLoc] = useState<Location | null>(null);
  const [editLocName, setEditLocName] = useState('');
  const [editStoragePath, setEditStoragePath] = useState('');
  const [editFormError, setEditFormError] = useState<string | null>(null);
  const [editSaving, setEditSaving] = useState(false);

  const catalogById = useMemo(() => {
    const map = new Map<string, CatalogItem>();
    catalogItems.forEach((item) => {
      map.set(item.id, item);
      if (item.item_code) {
        map.set(item.item_code, item);
      }
    });
    return map;
  }, [catalogItems]);

  const contentsByLocation = useMemo(() => {
    return locations.map((location) => {
      const assetsInLocation = assets.filter(
        (asset) => asset.status !== 'ISSUED' && refsLocation(location, asset.location_id)
      );
      const stockInLocation = stockLevels.filter(
        (stock) => refsLocation(location, stock.location_id) && (stock.quantity ?? 0) > 0
      );
      const catalogByPlace = catalogItems.filter(
        (item) =>
          refsLocation(location, item.storage_place) &&
          !stockInLocation.some(
            (stock) => stock.catalog_item_id === item.id || stock.catalog_item_id === item.item_code
          )
      );
      const consumableQuantity = stockInLocation.reduce((total, stock) => total + (stock.quantity ?? 0), 0);
      return {
        loc: location,
        assetsInLocation,
        stockInLocation,
        catalogByPlace,
        consumableQuantity,
      };
    });
  }, [locations, assets, stockLevels, catalogItems]);

  const filteredLocations = useMemo(() => {
    const query = searchFilter.trim().toLowerCase();
    if (!query) {
      return contentsByLocation;
    }
    return contentsByLocation.filter(({ loc }) => {
      return (
        loc.name.toLowerCase().includes(query) ||
        (loc.code ?? '').toLowerCase().includes(query) ||
        (loc.storage_path ?? '').toLowerCase().includes(query)
      );
    });
  }, [contentsByLocation, searchFilter]);

  const storedAssetCount = useMemo(() => {
    return assets.filter((asset) => asset.status !== 'ISSUED' && Boolean(asset.location_id)).length;
  }, [assets]);

  const totalStockQuantity = useMemo(() => {
    return stockLevels.reduce((total, stock) => total + (stock.quantity ?? 0), 0);
  }, [stockLevels]);

  const resetLocationForm = () => {
    setLocName('');
    setStoragePath('');
    setFormError(null);
  };

  const closeAddModal = () => {
    if (saving) {
      return;
    }
    setShowAddModal(false);
    resetLocationForm();
  };

  const handleAddLocation = async (event: React.FormEvent) => {
    event.preventDefault();
    setFormError(null);
    let name = locName.trim();
    if (!name) {
      setFormError('Location name is required.');
      return;
    }

    // Capitalize first letter of each word
    name = name
      .split(/\s+/)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(' ');

    const duplicate = locations.some((location) => location.name.trim().toLowerCase() === name.toLowerCase());
    if (duplicate) {
      setFormError('A location with this name already exists.');
      return;
    }
    setSaving(true);
    try {
      await createLocationInFirestore({
        name,
        storage_path: storagePath.trim() || null,
      });
      await onRefreshData();
      closeAddModal();
    } catch (error) {
      console.error('Failed to create location:', error);
      setFormError('Failed to create location. Check Firebase permissions and try again.');
    } finally {
      setSaving(false);
    }
  };

  const openEditModal = (loc: Location) => {
    setEditingLoc(loc);
    setEditLocName(loc.name);
    setEditStoragePath(loc.storage_path || '');
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
    const duplicate = locations.some(
      (l) => l.id !== editingLoc.id && l.name.trim().toLowerCase() === name.toLowerCase()
    );
    if (duplicate) {
      setEditFormError('A location with this name already exists.');
      return;
    }
    setEditSaving(true);
    try {
      await updateFirestoreDocument(COLLECTIONS.LOCATIONS, editingLoc.id, {
        name,
        storage_path: editStoragePath.trim() || null,
        updated_at: new Date().toISOString(),
      });
      await onRefreshData();
      setShowEditModal(false);
      setEditingLoc(null);
    } catch (error) {
      console.error('Failed to update location:', error);
      setEditFormError('Failed to update location. Check permissions and try again.');
    } finally {
      setEditSaving(false);
    }
  };

  const handleDeleteLocation = async (loc: Location) => {
    if (
      !window.confirm(
        `Delete location "${loc.name}"? This will NOT remove inventory assigned here, but the location record will be gone.`
      )
    )
      return;
    try {
      await deleteFirestoreDocument(COLLECTIONS.LOCATIONS, loc.id);
      await onRefreshData();
    } catch (error: any) {
      console.error('Failed to delete location:', error);
      alert(error?.message || 'Failed to delete location.');
    }
  };

  return (
    <div className="flex-1 overflow-y-auto idea-bg">
      <div className="max-w-7xl mx-auto w-full p-8 space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--color-idea-border)] pb-6">
          <div>
            <span className="text-[10px] font-medium tracking-[0.25em] uppercase text-[var(--color-idea-muted)]">
              LAB LOCATIONS
            </span>
            <h2 className="text-2xl font-bold text-[var(--color-idea-text)] tracking-tight mt-1">
              Locations
              <span className="text-[var(--color-idea-blue)]"> List</span>
            </h2>
          </div>
          {isStaff(userRole) && (
            <button
              type="button"
              onClick={() => {
                resetLocationForm();
                setShowAddModal(true);
              }}
              className="idea-button flex items-center justify-center gap-2 px-5 py-2.5 text-xs font-semibold cursor-pointer shadow-sm"
            >
              <Plus className="w-4 h-4" />
              Add Location
            </button>
          )}
        </div>

        {/* Search */}
        <div className="idea-card p-3">
          <div className="relative w-full">
            <Search className="w-4 h-4 text-[var(--color-idea-muted)] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchFilter}
              onChange={(event) => setSearchFilter(event.target.value)}
              placeholder="Search by name, code, or storage path (e.g. Lab > Bench 1)..."
              className="idea-input w-full pl-9 pr-4 py-2.5 text-xs"
            />
          </div>
        </div>

        {/* Locations Grid */}
        {filteredLocations.length === 0 ? (
          <div className="idea-card p-12 text-center">
            <MapPin className="w-9 h-9 text-[var(--color-idea-blue)] mx-auto mb-3" />
            <p className="font-semibold text-[var(--color-idea-text)]">
              {searchFilter.trim() ? 'No matching locations found.' : 'No storage locations found.'}
            </p>
            <p className="text-xs text-[var(--color-idea-muted)] mt-1">
              {searchFilter.trim()
                ? 'Try a different location name, code, or path query.'
                : 'Add a bench, rack, or component drawer to start mapping your inventory.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredLocations.map(({ loc, assetsInLocation, stockInLocation, catalogByPlace, consumableQuantity }) => {
              const previewAssets = assetsInLocation.slice(0, 3);
              const previewStock = stockInLocation.slice(0, 3);
              const locationCode = loc.code || loc.id;

              return (
                <div
                  key={loc.id}
                  className="idea-card p-5 flex flex-col justify-between hover:border-[var(--color-idea-blue)]/40 transition-all shadow-sm"
                >
                  <div>
                    {/* Location Header */}
                    <div className="flex items-start justify-between gap-3 pb-3 border-b border-[var(--color-idea-border)]">
                      <div className="flex items-start gap-3 min-w-0 text-left">
                        <div className="min-w-0">
                          <h3 className="font-bold text-[var(--color-idea-text)] text-sm truncate">{loc.name}</h3>
                          <div className="mt-1">
                            <LocationPathBreadcrumb path={loc.storage_path} />
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => onOpenQRGenerator(locationCode, loc.name, 'Storage Location')}
                          className="p-2 idea-button rounded-lg hover:opacity-90 transition-opacity cursor-pointer"
                          title="Generate QR tag"
                          aria-label={`Generate QR tag for ${loc.name}`}
                        >
                          <QrCode className="w-4 h-4" />
                        </button>
                        {isStaff(userRole) && (
                          <>
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

                    {/* Inventory summary metrics */}
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
                      </div>
                    </div>

                    {/* Stored items list */}
                    <div className="mt-4 text-left">
                      <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--color-idea-muted)] mb-2">
                        Stored Contents Preview
                      </p>
                      <div className="space-y-1.5 bg-[var(--color-idea-light-grey)]/40 p-2.5 rounded-xl border border-[var(--color-idea-border)]/60">
                        {previewAssets.map((asset) => {
                          const catalogItem = catalogById.get(asset.catalog_item_id);
                          return (
                            <div key={asset.id} className="flex items-center justify-between text-xs py-0.5">
                              <span className="text-[var(--color-idea-text)] font-medium truncate pr-2">
                                • {catalogItem?.name}
                              </span>
                            </div>
                          );
                        })}
                        {previewStock.map((stock) => {
                          const catalogItem = catalogById.get(stock.catalog_item_id);
                          return (
                            <div key={stock.id} className="flex items-center justify-between text-xs py-0.5">
                              <span className="text-[var(--color-idea-text)] font-medium truncate pr-2">
                                • {catalogItem?.name}
                              </span>
                              <span className="font-mono text-[10px] text-[var(--color-idea-blue)] font-semibold shrink-0">
                                {stock.quantity} {'pcs'}
                              </span>
                            </div>
                          );
                        })}
                        {catalogByPlace.slice(0, 2).map((item) => (
                          <div key={item.id} className="flex items-center justify-between text-xs py-0.5">
                            <span className="text-[var(--color-idea-muted)] font-medium truncate pr-2">
                              • {item.name}
                            </span>
                            <span className="font-mono text-[9px] text-[var(--color-idea-muted)] italic shrink-0">
                              configured
                            </span>
                          </div>
                        ))}
                        {assetsInLocation.length === 0 &&
                          stockInLocation.length === 0 &&
                          catalogByPlace.length === 0 && (
                            <p className="text-xs text-[var(--color-idea-muted)] italic py-1 text-center">
                              This location is empty.
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

      {/* Edit Location Modal */}
      {showEditModal && editingLoc && (
        <div className="fixed inset-0 bg-[var(--color-idea-text)]/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-[var(--color-idea-border)] shadow-2xl rounded-2xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-5 border-b border-[var(--color-idea-border)] flex items-center justify-between">
              <div>
                <p className="text-[10px] font-medium tracking-[0.2em] uppercase text-[var(--color-idea-muted)]">
                  Lab Setup
                </p>
                <h3 className="font-bold text-[var(--color-idea-text)] text-lg mt-1">Edit Location</h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowEditModal(false);
                  setEditingLoc(null);
                }}
                disabled={editSaving}
                className="p-2 text-[var(--color-idea-muted)] hover:text-[var(--color-idea-text)] disabled:opacity-50 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleEditLocation} className="p-6 space-y-4">
              {editFormError && <div className="idea-error rounded-xl px-3 py-2.5 text-xs">{editFormError}</div>}
              <div>
                <label className="text-[11px] font-medium uppercase text-[var(--color-idea-muted)] tracking-wider">
                  Location Name
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={editLocName}
                  onChange={(e) => setEditLocName(e.target.value)}
                  className="idea-input mt-1.5 p-2.5 text-xs"
                />
              </div>
              <div>
                <label className="text-[11px] font-medium uppercase text-[var(--color-idea-muted)] tracking-wider">
                  Lab Hierarchy / Placement Route
                </label>
                <input
                  type="text"
                  placeholder="e.g. Main Lab &gt; Wall Almirah &gt; Shelf 2 &gt; Bin B"
                  value={editStoragePath}
                  onChange={(e) => setEditStoragePath(e.target.value)}
                  className="idea-input mt-1.5 p-2.5 text-xs font-mono w-full"
                />
                <div className="mt-2 p-2.5 rounded-lg bg-[var(--color-idea-light-grey)]/60 border border-[var(--color-idea-border)] w-full">
                  <span className="text-[10px] text-[var(--color-idea-muted)] block mb-1">Live Route Preview:</span>
                  <LocationPathBreadcrumb path={editStoragePath} />
                </div>
              </div>
              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingLoc(null);
                  }}
                  disabled={editSaving}
                  className="flex-1 py-2.5 border border-[var(--color-idea-border)] text-[var(--color-idea-text)] text-xs font-semibold rounded-xl hover:bg-[var(--color-idea-light-grey)] transition-colors disabled:opacity-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editSaving}
                  className="flex-1 py-2.5 idea-button text-xs font-semibold rounded-xl disabled:opacity-50 cursor-pointer"
                >
                  {editSaving ? 'Saving…' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Location Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-[var(--color-idea-text)]/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-[var(--color-idea-border)] shadow-2xl rounded-2xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-5 border-b border-[var(--color-idea-border)] flex items-center justify-between">
              <div>
                <p className="text-[10px] font-medium tracking-[0.2em] uppercase text-[var(--color-idea-muted)]">
                  Lab Setup
                </p>
                <h3 className="font-bold text-[var(--color-idea-text)] text-lg mt-1">Add Physical Location</h3>
              </div>
              <button
                type="button"
                onClick={closeAddModal}
                disabled={saving}
                className="p-2 text-[var(--color-idea-muted)] hover:text-[var(--color-idea-text)] disabled:opacity-50 cursor-pointer"
                aria-label="Close add location dialog"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddLocation} className="p-6 space-y-4">
              {formError && <div className="idea-error rounded-xl px-3 py-2.5 text-xs">{formError}</div>}

              <div>
                <label className="text-[11px] font-medium uppercase text-[var(--color-idea-muted)] tracking-wider">
                  Location Name
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="e.g. Electronics Workbench A"
                  value={locName}
                  onChange={(event) => setLocName(event.target.value)}
                  className="idea-input mt-1.5 p-2.5 text-xs"
                />
              </div>

              <div>
                <label className="text-[11px] font-medium uppercase text-[var(--color-idea-muted)] tracking-wider">
                  Lab Hierarchy / Placement Route
                </label>
                <input
                  type="text"
                  placeholder="e.g. Main Lab > Wall Almirah > Shelf 2 > Bin B"
                  value={storagePath}
                  onChange={(event) => setStoragePath(event.target.value)}
                  className="idea-input mt-1.5 p-2.5 text-xs font-mono w-full"
                />
                <div className="mt-2 p-2.5 rounded-lg bg-[var(--color-idea-light-grey)]/60 border border-[var(--color-idea-border)] w-full">
                  <span className="text-[10px] text-[var(--color-idea-muted)] block mb-1">Live Route Preview:</span>
                  <LocationPathBreadcrumb path={storagePath} />
                </div>
                <p className="text-[10px] text-[var(--color-idea-muted)] mt-1.5">
                  Use <span className="font-mono">&gt;</span> or <span className="font-mono">/</span> to specify nested
                  lab zones (Room &gt; Rack &gt; Shelf).
                </p>
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={closeAddModal}
                  disabled={saving}
                  className="flex-1 py-2.5 border border-[var(--color-idea-border)] text-[var(--color-idea-text)] text-xs font-semibold rounded-xl hover:bg-[var(--color-idea-light-grey)] transition-colors disabled:opacity-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-2.5 idea-button text-xs font-semibold rounded-xl disabled:opacity-50 cursor-pointer"
                >
                  {saving ? 'Creating...' : 'Create Location'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
