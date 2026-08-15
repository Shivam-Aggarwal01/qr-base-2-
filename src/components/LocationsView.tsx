import React, { useState } from 'react';
import { Plus, MapPin, QrCode, Box, Layers, ArrowRight } from 'lucide-react';
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

export const LocationsView: React.FC<LocationsViewProps> = ({
  locations,
  catalogItems,
  assets,
  stockLevels,
  onOpenQRGenerator,
  onRefreshData
}) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [locName, setLocName] = useState('');
  const [locCode, setLocCode] = useState('');

  const handleAddLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!locName.trim()) return alert('Name required');

    try {
      await createLocationInFirestore({
        name: locName.trim(),
        code: locCode.trim().toUpperCase() || `LOC-${locName.trim().replace(/\s+/g, '-').slice(0, 12).toUpperCase()}`
      });

      setShowAddModal(false);
      setLocName('');
      setLocCode('');
      onRefreshData();
    } catch (error) {
      console.error('Failed to create location in Firestore:', error);
      alert('Failed to create location. Check Firebase permissions.');
    }
  };

  return (
    <div className="flex-1 space-y-6 p-8 overflow-y-auto max-w-7xl mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Physical Storage Locations</h2>
          <p className="text-xs text-slate-500">
            Cabinet bins, storage drawers, tool racks, and repair benches with scannable QR tags
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-2xl text-xs font-bold shadow-sm transition-all cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" /> Add Storage Bin / Location
        </button>
      </div>

      {/* Grid of Storage Locations */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {locations.map((loc) => {
          const assetsInLoc = assets.filter((a) => a.location_id === loc.id);
          const stockInLoc = stockLevels.filter((s) => s.location_id === loc.id);

          return (
            <div
              key={loc.id}
              className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 flex flex-col justify-between hover:border-blue-300 transition-all group"
            >
              <div className="space-y-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-blue-50 text-blue-600 rounded-2xl">
                      <MapPin className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 text-base">{loc.name}</h3>
                      <p className="text-xs font-mono font-bold text-blue-600">{loc.code || loc.id}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => onOpenQRGenerator(loc.code || loc.name, loc.name, 'Storage Location')}
                    className="p-2 bg-slate-100 hover:bg-blue-600 text-slate-500 hover:text-white rounded-xl transition-all cursor-pointer"
                    title="Generate QR Tag"
                  >
                    <QrCode className="w-4 h-4" />
                  </button>
                </div>

                {/* Contents Preview */}
                <div className="space-y-2 bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                    <span className="flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-blue-600" /> Physical Assets
                    </span>
                    <span className="font-mono text-slate-900">{assetsInLoc.length} units</span>
                  </div>

                  <div className="flex items-center justify-between text-xs font-bold text-slate-700 pt-1.5 border-t border-slate-200/60">
                    <span className="flex items-center gap-1.5">
                      <Box className="w-3.5 h-3.5 text-purple-600" /> Bulk Consumables
                    </span>
                    <span className="font-mono text-slate-900">{stockInLoc.length} types</span>
                  </div>
                </div>

                {/* Sample items inside */}
                <div className="space-y-1">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Stored Items</p>
                  {assetsInLoc.slice(0, 3).map((a) => {
                    const cat = catalogItems.find((c) => c.id === a.catalog_item_id);
                    return (
                      <p key={a.id} className="text-xs text-slate-600 font-medium truncate">
                        • {cat?.name} <span className="font-mono text-[10px] text-slate-400">({a.asset_code})</span>
                      </p>
                    );
                  })}
                  {assetsInLoc.length === 0 && stockInLoc.length === 0 && (
                    <p className="text-xs text-slate-400 italic">Empty storage location.</p>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Location Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden p-6 space-y-4">
            <h3 className="font-bold text-slate-900 text-lg">Add Physical Location</h3>

            <form onSubmit={handleAddLocation} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-700">Location / Bin Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Cabinet B, Bin 05"
                  value={locName}
                  onChange={(e) => setLocName(e.target.value)}
                  className="w-full mt-1 p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700">Location QR Code (Optional)</label>
                <input
                  type="text"
                  placeholder="LOC-CAB-B05"
                  value={locCode}
                  onChange={(e) => setLocCode(e.target.value)}
                  className="w-full mt-1 p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono uppercase outline-none"
                />
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-2.5 bg-slate-100 text-slate-700 text-xs font-bold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-blue-600 text-white text-xs font-bold rounded-xl hover:bg-blue-700 shadow-sm"
                >
                  Create Location
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
