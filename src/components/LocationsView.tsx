import React, { useMemo, useState } from 'react';
import { Plus, MapPin, QrCode, Box, Layers, Search, X } from 'lucide-react';
import { Location, CatalogItem, Asset, StockLevel } from '../types/inventory';
import { createLocationInFirestore } from '../services/firebaseInventory';

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
    (loc.code || '').toLowerCase() === ref ||
    loc.name.toLowerCase() === ref
  );
}

export const LocationsView: React.FC<LocationsViewProps> = ({
  locations,
  catalogItems,
  assets,
  stockLevels,
  onOpenQRGenerator,
  onRefreshData
}) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
  const [searchFilter, setSearchFilter] = useState('');
  const [locName, setLocName] = useState('');
  const [locCode, setLocCode] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const findCatalog = (idOrCode?: string | null) =>
    catalogItems.find((c) => c.id === idOrCode || c.item_code === idOrCode);

  const contentsByLocation = useMemo(() => {
    return locations.map((loc) => {
      const assetsInLoc = assets.filter(
        (a) => a.status !== 'ISSUED' && refsLocation(loc, a.location_id)
      );
      const stockInLoc = stockLevels.filter((s) => refsLocation(loc, s.location_id) && (s.quantity || 0) >= 0);
      const catalogByPlace = catalogItems.filter(
        (c) => refsLocation(loc, c.storage_place) && !stockInLoc.some((s) => s.catalog_item_id === c.id || s.catalog_item_id === c.item_code)
      );
      const consumableQty = stockInLoc.reduce((sum, s) => sum + (s.quantity || 0), 0);
      return { loc, assetsInLoc, stockInLoc, catalogByPlace, consumableQty };
    });
  }, [locations, assets, stockLevels, catalogItems]);

  const filtered = contentsByLocation.filter(({ loc }) => {
    if (!searchFilter.trim()) return true;
    const q = searchFilter.toLowerCase();
    return loc.name.toLowerCase().includes(q) || (loc.code || '').toLowerCase().includes(q);
  });

  const selectedContents = selectedLocation
    ? contentsByLocation.find(({ loc }) => loc.id === selectedLocation.id)
    : null;

  const handleAddLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!locName.trim()) {
      setFormError('Name is required');
      return;
    }

    const code = locCode.trim().toUpperCase() || `LOC-${locName.trim().replace(/\s+/g, '-').slice(0, 12).toUpperCase()}`;
    const duplicate = locations.some(
      (l) => l.code?.toLowerCase() === code.toLowerCase() || l.name.toLowerCase() === locName.trim().toLowerCase()
    );
    if (duplicate) {
      setFormError('A location with this name or QR code already exists.');
      return;
    }

    setSaving(true);
    try {
      await createLocationInFirestore({
        name: locName.trim(),
        code
      });
      setShowAddModal(false);
      setLocName('');
      setLocCode('');
      onRefreshData();
    } catch (error) {
      console.error('Failed to create location in Firestore:', error);
      setFormError('Failed to create location. Check Firebase permissions.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex-1 space-y-8 p-8 overflow-y-auto max-w-7xl mx-auto w-full paper-texture">
      <div className="border-b border-[#1A1A1A]/15 pb-4 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <span className="text-[10px] font-mono tracking-[0.25em] uppercase text-[#6C6863]">STORAGE MAP</span>
          <h2 className="font-serif text-3xl font-bold text-[#1A1A1A] mt-0.5">
            Physical <span className="font-serif italic font-normal text-[#D4AF37]">Locations</span>
          </h2>
          <p className="text-xs text-[#6C6863] mt-1">
            Shelves, drawers, and bins with stored consumables and tracked assets.
          </p>
        </div>
        <button
          onClick={() => {
            setFormError(null);
            setShowAddModal(true);
          }}
          className="flex items-center gap-2 bg-[#1A1A1A] hover:bg-[#D4AF37] text-white px-5 py-2.5 text-xs font-mono font-bold uppercase tracking-widest transition-colors cursor-pointer border border-[#1A1A1A]"
        >
          <Plus className="w-4 h-4 text-[#D4AF37]" /> Add Location
        </button>
      </div>

      <div className="bg-white p-5 border border-[#1A1A1A]/20 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <p className="text-xs font-mono text-[#6C6863]">
          {locations.length} locations • {assets.filter((a) => a.location_id).length} stored assets • {stockLevels.length} stock records
        </p>
        <div className="relative w-full md:w-72">
          <input
            type="text"
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            placeholder="Search location name or QR code..."
            className="input-underline pl-8 pr-4 py-1.5 text-xs font-serif italic text-[#1A1A1A] w-full outline-none"
          />
          <Search className="w-4 h-4 text-[#6C6863] absolute left-1 top-2" />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white border border-[#1A1A1A]/20 p-12 text-center space-y-2">
          <MapPin className="w-8 h-8 text-[#D4AF37] mx-auto" />
          <p className="font-serif text-[#1A1A1A]">No storage locations found.</p>
          <p className="text-xs text-[#6C6863]">Add a shelf, drawer, or component box to start mapping inventory.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map(({ loc, assetsInLoc, stockInLoc, catalogByPlace, consumableQty }) => {
            const previewAssets = assetsInLoc.slice(0, 3);
            const previewStock = stockInLoc.slice(0, 3);

            return (
              <button
                key={loc.id}
                type="button"
                onClick={() => setSelectedLocation(loc)}
                className="text-left bg-white border border-[#1A1A1A]/20 shadow-sm p-6 flex flex-col justify-between hover:border-[#D4AF37] transition-all"
              >
                <div className="space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="p-2.5 bg-[#1A1A1A] text-[#D4AF37] shrink-0">
                        <MapPin className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-serif font-bold text-[#1A1A1A] text-base truncate">{loc.name}</h3>
                        <p className="text-xs font-mono font-bold text-[#D4AF37]">{loc.code || loc.id}</p>
                      </div>
                    </div>
                    <span
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenQRGenerator(loc.code || loc.name, loc.name, 'Storage Location');
                      }}
                      className="p-2 bg-[#1A1A1A] text-[#D4AF37] hover:bg-[#D4AF37] hover:text-[#1A1A1A] transition-colors cursor-pointer"
                      title="Generate QR Tag"
                    >
                      <QrCode className="w-4 h-4" />
                    </span>
                  </div>

                  <div className="space-y-2 bg-[#F9F8F6] p-3.5 border border-[#1A1A1A]/10">
                    <div className="flex items-center justify-between text-xs font-bold text-[#1A1A1A]">
                      <span className="flex items-center gap-1.5 font-mono uppercase tracking-wider text-[10px] text-[#6C6863]">
                        <Layers className="w-3.5 h-3.5 text-[#D4AF37]" /> Tracked assets
                      </span>
                      <span className="font-mono">{assetsInLoc.length} units</span>
                    </div>
                    <div className="flex items-center justify-between text-xs font-bold text-[#1A1A1A] pt-1.5 border-t border-[#1A1A1A]/10">
                      <span className="flex items-center gap-1.5 font-mono uppercase tracking-wider text-[10px] text-[#6C6863]">
                        <Box className="w-3.5 h-3.5 text-[#D4AF37]" /> Consumable stock
                      </span>
                      <span className="font-mono">
                        {stockInLoc.length} types / {consumableQty} pcs
                      </span>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <p className="text-[10px] font-mono font-bold uppercase tracking-widest text-[#6C6863]">Stored items</p>
                    {previewAssets.map((a) => {
                      const cat = findCatalog(a.catalog_item_id);
                      return (
                        <p key={a.id} className="text-xs text-[#1A1A1A] font-medium truncate">
                          • {cat?.name || 'Asset'}{' '}
                          <span className="font-mono text-[10px] text-[#6C6863]">({a.asset_code})</span>
                        </p>
                      );
                    })}
                    {previewStock.map((s) => {
                      const cat = findCatalog(s.catalog_item_id);
                      return (
                        <p key={s.id} className="text-xs text-[#1A1A1A] font-medium truncate">
                          • {cat?.name || s.catalog_item_id}{' '}
                          <span className="font-mono text-[10px] text-[#D4AF37]">
                            {s.quantity} {cat?.unit || 'pcs'}
                          </span>
                        </p>
                      );
                    })}
                    {catalogByPlace.slice(0, 2).map((c) => (
                      <p key={c.id} className="text-xs text-[#6C6863] font-medium truncate">
                        • {c.name} <span className="font-mono text-[10px]">(listed storage)</span>
                      </p>
                    ))}
                    {assetsInLoc.length === 0 && stockInLoc.length === 0 && catalogByPlace.length === 0 && (
                      <p className="text-xs text-[#6C6863] italic">Empty storage location.</p>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {selectedContents && selectedLocation && (
        <div className="fixed inset-0 bg-[#1A1A1A]/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#F9F8F6] border border-[#1A1A1A] shadow-2xl w-full max-w-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="px-6 py-4 border-b border-[#1A1A1A]/15 bg-white flex items-start justify-between gap-3">
              <div>
                <span className="text-[10px] font-mono tracking-[0.2em] uppercase text-[#6C6863]">LOCATION DETAIL</span>
                <h3 className="font-serif font-bold text-[#1A1A1A] text-xl">{selectedLocation.name}</h3>
                <p className="text-xs font-mono text-[#D4AF37]">{selectedLocation.code || selectedLocation.id}</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => onOpenQRGenerator(selectedLocation.code || selectedLocation.name, selectedLocation.name, 'Storage Location')}
                  className="px-3 py-2 bg-[#1A1A1A] text-white text-[10px] font-mono font-bold uppercase tracking-wider flex items-center gap-1.5 hover:bg-[#D4AF37]"
                >
                  <QrCode className="w-3.5 h-3.5 text-[#D4AF37]" /> Print QR
                </button>
                <button type="button" onClick={() => setSelectedLocation(null)} className="p-2 text-[#6C6863] hover:text-[#1A1A1A]">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto space-y-6">
              <div>
                <h4 className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#6C6863] mb-2">
                  Consumables ({selectedContents.stockInLoc.length})
                </h4>
                {selectedContents.stockInLoc.length === 0 ? (
                  <p className="text-xs text-[#6C6863] italic">No bulk stock recorded at this location.</p>
                ) : (
                  <div className="space-y-2">
                    {selectedContents.stockInLoc.map((s) => {
                      const cat = findCatalog(s.catalog_item_id);
                      return (
                        <div key={s.id} className="p-3 bg-white border border-[#1A1A1A]/10 flex items-center justify-between text-xs">
                          <div>
                            <p className="font-serif font-bold text-[#1A1A1A]">{cat?.name || s.catalog_item_id}</p>
                            <p className="font-mono text-[10px] text-[#6C6863]">{cat?.item_code} • {cat?.type || 'CONSUMABLE'}</p>
                          </div>
                          <span className="font-mono font-bold text-[#D4AF37]">
                            {s.quantity} {cat?.unit || 'pcs'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div>
                <h4 className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#6C6863] mb-2">
                  Tracked assets / tools ({selectedContents.assetsInLoc.length})
                </h4>
                {selectedContents.assetsInLoc.length === 0 ? (
                  <p className="text-xs text-[#6C6863] italic">No reusable assets currently stored here.</p>
                ) : (
                  <div className="space-y-2">
                    {selectedContents.assetsInLoc.map((a) => {
                      const cat = findCatalog(a.catalog_item_id);
                      return (
                        <div key={a.id} className="p-3 bg-white border border-[#1A1A1A]/10 flex items-center justify-between text-xs">
                          <div>
                            <p className="font-serif font-bold text-[#1A1A1A]">{cat?.name || 'Asset'}</p>
                            <p className="font-mono text-[10px] text-[#D4AF37]">{a.asset_code}</p>
                          </div>
                          <span className="text-[9px] px-2 py-0.5 border font-mono font-bold uppercase tracking-wider border-emerald-700 bg-emerald-50 text-emerald-800">
                            {a.status.replace('_', ' ')}
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

      {showAddModal && (
        <div className="fixed inset-0 bg-[#1A1A1A]/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#F9F8F6] border border-[#1A1A1A] shadow-2xl w-full max-w-md overflow-hidden p-6 space-y-4">
            <h3 className="font-serif font-bold text-[#1A1A1A] text-lg border-b border-[#1A1A1A]/15 pb-2">
              Add Physical Location
            </h3>
            {formError && (
              <p className="text-xs text-red-800 bg-red-50 border border-red-200 p-2">{formError}</p>
            )}
            <form onSubmit={handleAddLocation} className="space-y-3">
              <div>
                <label className="text-[11px] font-mono uppercase text-[#6C6863]">Location / Bin Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Drawer B3"
                  value={locName}
                  onChange={(e) => setLocName(e.target.value)}
                  className="w-full mt-1 p-2.5 bg-white border border-[#1A1A1A] text-xs outline-none"
                />
              </div>
              <div>
                <label className="text-[11px] font-mono uppercase text-[#6C6863]">Location QR Code (Optional)</label>
                <input
                  type="text"
                  placeholder="LOC-CAB-B05"
                  value={locCode}
                  onChange={(e) => setLocCode(e.target.value)}
                  className="w-full mt-1 p-2.5 bg-white border border-[#1A1A1A] text-xs font-mono uppercase outline-none"
                />
              </div>
              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-2.5 border border-[#1A1A1A] text-[#1A1A1A] text-xs font-mono font-bold uppercase"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-2.5 bg-[#1A1A1A] text-white text-xs font-mono font-bold uppercase hover:bg-[#D4AF37] disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Create Location'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
