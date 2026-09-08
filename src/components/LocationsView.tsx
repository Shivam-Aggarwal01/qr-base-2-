import React, { useMemo, useState } from "react";
import { Plus, MapPin, QrCode, Box, Layers, Search, X } from "lucide-react";
import { Location, CatalogItem, Asset, StockLevel } from "../types/inventory";
import { createLocationInFirestore } from "../services/firebaseInventory";

interface LocationsViewProps {
  locations: Location[];
  catalogItems: CatalogItem[];
  assets: Asset[];
  stockLevels: StockLevel[];
  onOpenQRGenerator: (code: string, title: string, subtitle?: string) => void;
  onRefreshData: () => void;
}

function refsLocation(loc: Location, value?: string | null): boolean {
  if (!value) return false;
  const ref = value.trim().toLowerCase();
  if (!ref) return false;
  return (
    loc.id.toLowerCase() === ref ||
    (loc.code || "").toLowerCase() === ref ||
    loc.name.toLowerCase() === ref
  );
}

export const LocationsView: React.FC<LocationsViewProps> = ({
  locations,
  catalogItems,
  assets,
  stockLevels,
  onOpenQRGenerator,
  onRefreshData,
}) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(
    null,
  );
  const [searchFilter, setSearchFilter] = useState("");
  const [locName, setLocName] = useState("");
  const [locCode, setLocCode] = useState("");
  const [storagePath, setStoragePath] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const findCatalog = (idOrCode?: string | null) =>
    catalogItems.find((c) => c.id === idOrCode || c.item_code === idOrCode);

  const contentsByLocation = useMemo(() => {
    return locations.map((loc) => {
      const assetsInLoc = assets.filter(
        (a) => a.status !== "ISSUED" && refsLocation(loc, a.location_id),
      );
      const stockInLoc = stockLevels.filter(
        (s) => refsLocation(loc, s.location_id) && (s.quantity || 0) >= 0,
      );
      const catalogByPlace = catalogItems.filter(
        (c) =>
          refsLocation(loc, c.storage_place) &&
          !stockInLoc.some(
            (s) =>
              s.catalog_item_id === c.id || s.catalog_item_id === c.item_code,
          ),
      );
      const consumableQty = stockInLoc.reduce(
        (sum, s) => sum + (s.quantity || 0),
        0,
      );
      return { loc, assetsInLoc, stockInLoc, catalogByPlace, consumableQty };
    });
  }, [locations, assets, stockLevels, catalogItems]);

  const filtered = contentsByLocation.filter(({ loc }) => {
    if (!searchFilter.trim()) return true;
    const q = searchFilter.toLowerCase();
    return (
      loc.name.toLowerCase().includes(q) ||
      (loc.code || "").toLowerCase().includes(q) ||
      (loc.storage_path || "").toLowerCase().includes(q)
    );
  });

  const selectedContents = selectedLocation
    ? contentsByLocation.find(({ loc }) => loc.id === selectedLocation.id)
    : null;

  const handleAddLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!locName.trim()) {
      setFormError("Name is required");
      return;
    }

    const code =
      locCode.trim().toUpperCase() ||
      `LOC-${locName.trim().replace(/\s+/g, "-").slice(0, 12).toUpperCase()}`;
    const duplicate = locations.some(
      (l) =>
        l.code?.toLowerCase() === code.toLowerCase() ||
        l.name.toLowerCase() === locName.trim().toLowerCase(),
    );
    if (duplicate) {
      setFormError("A location with this name or QR code already exists.");
      return;
    }

    setSaving(true);
    try {
      await createLocationInFirestore({
        name: locName.trim(),
        code,
        storage_path: storagePath.trim() || null,
      });
      setShowAddModal(false);
      setLocName("");
      setLocCode("");
      setStoragePath("");
      onRefreshData();
    } catch (error) {
      console.error("Failed to create location in Firestore:", error);
      setFormError("Failed to create location. Check Firebase permissions.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex-1 space-y-8 p-8 overflow-y-auto max-w-7xl mx-auto w-full idea-bg">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <span className="text-[10px] font-medium tracking-[0.25em] uppercase text-[var(--color-idea-muted)]">
            STORAGE MAP
          </span>
          <h2 className="text-2xl font-bold text-[var(--color-idea-text)] tracking-tight mt-1">
            Physical{" "}
            <span className="text-[var(--color-idea-blue)]">Locations</span>
          </h2>
          <p className="text-xs text-[var(--color-idea-muted)] mt-1">
            Shelves, drawers, and bins with stored consumables and tracked
            assets.
          </p>
        </div>
        <button
          onClick={() => {
            setFormError(null);
            setShowAddModal(true);
          }}
          className="idea-button flex items-center gap-2 px-5 py-2.5 text-xs font-semibold cursor-pointer"
        >
          <Plus className="w-4 h-4" /> Add Location
        </button>
      </div>

      <div className="idea-card p-4 flex flex-col md:flex-row items-center justify-between gap-4">
        <p className="text-xs text-[var(--color-idea-muted)]">
          {locations.length} locations •{" "}
          {assets.filter((a) => a.location_id).length} stored assets •{" "}
          {stockLevels.length} stock records
        </p>
        <div className="relative w-full md:w-72">
          <input
            type="text"
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            placeholder="Search location name or QR code..."
            className="idea-input pl-9 pr-4 py-2 text-xs"
          />
          <Search className="w-4 h-4 text-[var(--color-idea-muted)] absolute left-3 top-2.5" />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="idea-card p-12 text-center space-y-2">
          <MapPin className="w-8 h-8 text-[var(--color-idea-blue)] mx-auto" />
          <p className="font-semibold text-[var(--color-idea-text)]">
            No storage locations found.
          </p>
          <p className="text-xs text-[var(--color-idea-muted)]">
            Add a shelf, drawer, or component box to start mapping inventory.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map(
            ({
              loc,
              assetsInLoc,
              stockInLoc,
              catalogByPlace,
              consumableQty,
            }) => {
              const previewAssets = assetsInLoc.slice(0, 3);
              const previewStock = stockInLoc.slice(0, 3);

              return (
                <button
                  key={loc.id}
                  type="button"
                  onClick={() => setSelectedLocation(loc)}
                  className="text-left idea-card p-6 flex flex-col justify-between hover:border-[var(--color-idea-blue)]/40"
                >
                  <div className="space-y-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="idea-logo-container shrink-0">
                          <MapPin className="w-5 h-5 text-[var(--color-idea-blue)]" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-[10px] font-medium uppercase tracking-wider text-[var(--color-idea-muted)]">
                            Location Name
                          </p>
                          <h3 className="font-bold text-[var(--color-idea-text)] text-base truncate">
                            {loc.name}
                          </h3>
                          <p className="text-[10px] font-medium uppercase tracking-wider text-[var(--color-idea-muted)] mt-2">
                            Location Position
                          </p>
                          <p className="text-xs text-[var(--color-idea-blue)] truncate">
                            {loc.storage_path || "Position not set"}
                          </p>
                          <p className="text-[10px] font-mono font-bold text-[var(--color-idea-muted)] mt-1">
                            {loc.code || loc.id}
                          </p>
                        </div>
                      </div>
                      <span
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenQRGenerator(
                            loc.id,
                            loc.name,
                            "Storage Location",
                          );
                        }}
                        className="p-2 idea-button rounded-lg hover:opacity-90 transition-opacity cursor-pointer"
                        title="Generate QR Tag"
                      >
                        <QrCode className="w-4 h-4" />
                      </span>
                    </div>

                    <div className="space-y-2 idea-gradient-soft border border-[var(--color-idea-blue)]/20 rounded-xl p-3.5">
                      <div className="flex items-center justify-between text-xs font-bold text-[var(--color-idea-text)]">
                        <span className="flex items-center gap-1.5 font-medium uppercase tracking-wider text-[10px] text-[var(--color-idea-muted)]">
                          <Layers className="w-3.5 h-3.5 text-[var(--color-idea-blue)]" />{" "}
                          Tracked assets
                        </span>
                        <span className="font-mono text-[var(--color-idea-text)]">
                          {assetsInLoc.length} units
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs font-bold text-[var(--color-idea-text)] pt-1.5 border-t border-[var(--color-idea-border)]">
                        <span className="flex items-center gap-1.5 font-medium uppercase tracking-wider text-[10px] text-[var(--color-idea-muted)]">
                          <Box className="w-3.5 h-3.5 text-[var(--color-idea-green)]" />{" "}
                          Items
                        </span>
                        <span className="font-mono text-[var(--color-idea-text)]">
                          {stockInLoc.length} types / {consumableQty} pcs
                        </span>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <p className="text-[10px] font-medium uppercase tracking-widest text-[var(--color-idea-muted)]">
                        Stored items
                      </p>
                      {previewAssets.map((a) => {
                        const cat = findCatalog(a.catalog_item_id);
                        return (
                          <p
                            key={a.id}
                            className="text-xs text-[var(--color-idea-text)] font-medium truncate"
                          >
                            • {cat?.name || "Asset"}{" "}
                            <span className="font-mono text-[10px] text-[var(--color-idea-muted)]">
                              ({a.asset_code})
                            </span>
                          </p>
                        );
                      })}
                      {previewStock.map((s) => {
                        const cat = findCatalog(s.catalog_item_id);
                        return (
                          <p
                            key={s.id}
                            className="text-xs text-[var(--color-idea-text)] font-medium truncate"
                          >
                            • {cat?.name || s.catalog_item_id}{" "}
                            <span className="font-mono text-[10px] text-[var(--color-idea-blue)]">
                              {s.quantity} {cat?.unit || "pcs"}
                            </span>
                          </p>
                        );
                      })}
                      {catalogByPlace.slice(0, 2).map((c) => (
                        <p
                          key={c.id}
                          className="text-xs text-[var(--color-idea-muted)] font-medium truncate"
                        >
                          • {c.name}{" "}
                          <span className="font-mono text-[10px]">
                            (listed storage)
                          </span>
                        </p>
                      ))}
                      {assetsInLoc.length === 0 &&
                        stockInLoc.length === 0 &&
                        catalogByPlace.length === 0 && (
                          <p className="text-xs text-[var(--color-idea-muted)] italic">
                            Empty storage location.
                          </p>
                        )}
                    </div>
                  </div>
                </button>
              );
            },
          )}
        </div>
      )}

      {/* Location Detail Modal */}
      {selectedContents && selectedLocation && (
        <div className="fixed inset-0 bg-[var(--color-idea-text)]/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-[var(--color-idea-border)] shadow-2xl rounded-2xl w-full max-w-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="px-6 py-4 border-b border-[var(--color-idea-border)] flex items-start justify-between gap-3">
              <div>
                <span className="text-[10px] font-medium tracking-[0.2em] uppercase text-[var(--color-idea-muted)]">
                  LOCATION DETAIL
                </span>
                <h3 className="font-bold text-[var(--color-idea-text)] text-xl mt-0.5">
                  {selectedLocation.name}
                </h3>
                <p className="text-[10px] font-medium uppercase tracking-wider text-[var(--color-idea-muted)] mt-2">
                  Location Position
                </p>
                <p className="text-xs text-[var(--color-idea-blue)]">
                  {selectedLocation.storage_path || "Position not set"}
                </p>
                <p className="text-xs font-mono text-[var(--color-idea-muted)] mt-1">
                  {selectedLocation.code || selectedLocation.id}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    onOpenQRGenerator(
                      selectedLocation.id,
                      selectedLocation.name,
                      "Storage Location",
                    )
                  }
                  className="px-3 py-2 idea-button text-[10px] font-semibold rounded-xl flex items-center gap-1.5 cursor-pointer"
                >
                  <QrCode className="w-3.5 h-3.5" /> Print QR
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedLocation(null)}
                  className="p-2 text-[var(--color-idea-muted)] hover:text-[var(--color-idea-text)] cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto space-y-6">
              <div>
                <h4 className="text-[10px] font-medium uppercase tracking-[0.2em] text-[var(--color-idea-muted)] mb-2">
                  Items ({selectedContents.stockInLoc.length})
                </h4>
                {selectedContents.stockInLoc.length === 0 ? (
                  <p className="text-xs text-[var(--color-idea-muted)] italic">
                    No bulk stock recorded at this location.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {selectedContents.stockInLoc.map((s) => {
                      const cat = findCatalog(s.catalog_item_id);
                      return (
                        <div
                          key={s.id}
                          className="p-3 idea-gradient-soft border border-[var(--color-idea-blue)]/20 rounded-xl flex items-center justify-between text-xs"
                        >
                          <div>
                            <p className="font-bold text-[var(--color-idea-text)]">
                              {cat?.name || s.catalog_item_id}
                            </p>
                            <p className="font-mono text-[10px] text-[var(--color-idea-muted)]">
                              {cat?.item_code} • Item
                            </p>
                          </div>
                          <span className="font-mono font-bold text-[var(--color-idea-blue)]">
                            {s.quantity} {cat?.unit || "pcs"}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div>
                <h4 className="text-[10px] font-medium uppercase tracking-[0.2em] text-[var(--color-idea-muted)] mb-2">
                  Tracked assets / tools ({selectedContents.assetsInLoc.length})
                </h4>
                {selectedContents.assetsInLoc.length === 0 ? (
                  <p className="text-xs text-[var(--color-idea-muted)] italic">
                    No reusable assets currently stored here.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {selectedContents.assetsInLoc.map((a) => {
                      const cat = findCatalog(a.catalog_item_id);
                      return (
                        <div
                          key={a.id}
                          className="p-3 bg-[var(--color-idea-light-grey)] border border-[var(--color-idea-border)] rounded-xl flex items-center justify-between text-xs"
                        >
                          <div>
                            <p className="font-bold text-[var(--color-idea-text)]">
                              {cat?.name || "Asset"}
                            </p>
                            <p className="font-mono text-[10px] text-[var(--color-idea-blue)]">
                              {a.asset_code}
                            </p>
                          </div>
                          <span className="text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider idea-success">
                            {a.status.replace("_", " ")}
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
      )}

      {/* Add Location Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-[var(--color-idea-text)]/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-[var(--color-idea-border)] shadow-2xl rounded-2xl w-full max-w-md overflow-hidden p-6 space-y-4">
            <h3 className="font-bold text-[var(--color-idea-text)] text-lg border-b border-[var(--color-idea-border)] pb-2">
              Add Physical Location
            </h3>
            {formError && (
              <p className="text-xs idea-error rounded-xl p-2">{formError}</p>
            )}
            <form onSubmit={handleAddLocation} className="space-y-3">
              <div>
                <label className="text-[11px] font-medium uppercase text-[var(--color-idea-muted)] tracking-wider">
                  Location Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Electronics Lab"
                  value={locName}
                  onChange={(e) => setLocName(e.target.value)}
                  className="idea-input mt-1 p-2.5 text-xs"
                />
              </div>
              <div>
                <label className="text-[11px] font-medium uppercase text-[var(--color-idea-muted)] tracking-wider">
                  Location Position
                </label>
                <input
                  type="text"
                  placeholder="e.g. Almirah > Row 3 > Bin 2"
                  value={storagePath}
                  onChange={(e) => setStoragePath(e.target.value)}
                  className="idea-input mt-1 p-2.5 text-xs"
                />
                <p className="text-[10px] text-[var(--color-idea-muted)] mt-1">
                  Add as many levels as needed using <span className="font-mono">&gt;</span> between them.
                </p>
              </div>
              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-2.5 border border-[var(--color-idea-border)] text-[var(--color-idea-text)] text-xs font-semibold rounded-xl hover:bg-[var(--color-idea-light-grey)] transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-2.5 idea-button text-xs font-semibold rounded-xl disabled:opacity-50 cursor-pointer"
                >
                  {saving ? "Saving..." : "Create Location"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
