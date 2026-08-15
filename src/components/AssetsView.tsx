import React, { useState } from 'react';
import { Plus, Search, QrCode, Box, Layers, ShieldCheck } from 'lucide-react';
import { Asset, CatalogItem, Location, User, AssetStatus, AssetTrackingMode } from '../types/inventory';
import { createAssetInFirestore } from '../services/firebaseInventory';

interface AssetsViewProps {
  assets: Asset[];
  catalogItems: CatalogItem[];
  locations: Location[];
  users: User[];
  onOpenQRGenerator: (code: string, title: string, subtitle?: string) => void;
  onRefreshData: () => void;
}

export const AssetsView: React.FC<AssetsViewProps> = ({
  assets,
  catalogItems,
  locations,
  users,
  onOpenQRGenerator,
  onRefreshData
}) => {
  const [statusFilter, setStatusFilter] = useState<AssetStatus | 'ALL'>('ALL');
  const [modeFilter, setModeFilter] = useState<'ALL' | 'BOX' | 'INDIVIDUAL'>('ALL');
  const [searchFilter, setSearchFilter] = useState('');

  // Add Asset Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedCatalogId, setSelectedCatalogId] = useState(catalogItems.find((c) => c.type !== 'CONSUMABLE')?.id || '');
  const [newAssetCode, setNewAssetCode] = useState('');
  const [newTrackingMode, setNewTrackingMode] = useState<AssetTrackingMode>('BOX');
  const [newBoxCapacity, setNewBoxCapacity] = useState(15);
  const [newSerialNum, setNewSerialNum] = useState('');
  const [newLocationId, setNewLocationId] = useState(locations[0]?.id || '');
  const [newNotes, setNewNotes] = useState('');

  const filteredAssets = assets.filter((asset) => {
    if (statusFilter !== 'ALL' && asset.status !== statusFilter) return false;
    if (modeFilter === 'BOX' && !(asset.is_box || asset.tracking_mode === 'BOX')) return false;
    if (modeFilter === 'INDIVIDUAL' && (asset.is_box || asset.tracking_mode === 'BOX')) return false;

    if (searchFilter) {
      const q = searchFilter.toLowerCase();
      const cat = catalogItems.find((c) => c.id === asset.catalog_item_id);
      if (
        !asset.asset_code.toLowerCase().includes(q) &&
        !asset.serial_number?.toLowerCase().includes(q) &&
        !cat?.name.toLowerCase().includes(q)
      ) {
        return false;
      }
    }
    return true;
  });

  const handleAddAssetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCatalogId || !newAssetCode.trim() || !newLocationId) {
      return alert('Item, Asset Code, and Storage Location are required');
    }

    try {
      await createAssetInFirestore({
        asset_code: newAssetCode.trim().toUpperCase(),
        catalog_item_id: selectedCatalogId,
        serial_number: newSerialNum || null,
        status: 'AVAILABLE',
        location_id: newLocationId,
        assigned_to_user_id: null,
        tracking_mode: newTrackingMode,
        is_box: newTrackingMode === 'BOX',
        box_capacity: newTrackingMode === 'BOX' ? newBoxCapacity : 1,
        available_in_box: newTrackingMode === 'BOX' ? newBoxCapacity : 1,
        notes: newNotes || ''
      });

      setShowAddModal(false);
      setNewAssetCode('');
      setNewSerialNum('');
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
        return 'border-emerald-700 bg-emerald-50 text-emerald-800';
      case 'ISSUED':
        return 'border-blue-700 bg-blue-50 text-blue-800';
      case 'UNDER_REPAIR':
        return 'border-amber-700 bg-amber-50 text-amber-800';
      case 'DAMAGED':
        return 'border-red-700 bg-red-50 text-red-800';
      case 'LOST':
      case 'DISPOSED':
        return 'border-[#1A1A1A]/30 bg-[#EBE5DE] text-[#1A1A1A]';
    }
  };

  return (
    <div className="flex-1 space-y-8 p-8 overflow-y-auto max-w-7xl mx-auto w-full paper-texture">
      {/* Header */}
      <div className="border-b border-[#1A1A1A]/15 pb-4 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <span className="text-[10px] font-mono tracking-[0.25em] uppercase text-[#6C6863]">PHYSICAL ASSET REGISTER</span>
          <h2 className="font-serif text-3xl font-bold text-[#1A1A1A] mt-0.5">
            Tracked Equipment & <span className="font-serif italic font-normal text-[#D4AF37]">Box Batches</span>
          </h2>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 bg-[#1A1A1A] hover:bg-[#D4AF37] text-white px-5 py-2.5 text-xs font-mono font-bold uppercase tracking-widest transition-colors cursor-pointer border border-[#1A1A1A]"
        >
          <Plus className="w-4 h-4 text-[#D4AF37]" /> Register New Asset
        </button>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white p-5 border border-[#1A1A1A]/20 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2 bg-[#F9F8F6] p-1.5 border border-[#1A1A1A]/10 w-full md:w-auto overflow-x-auto">
          {/* Tracking Mode Toggle */}
          <button
            onClick={() => setModeFilter('ALL')}
            className={`px-3.5 py-1.5 text-xs font-mono font-bold uppercase tracking-wider transition-all cursor-pointer ${
              modeFilter === 'ALL' ? 'bg-[#1A1A1A] text-white' : 'text-[#6C6863]'
            }`}
          >
            All Modes
          </button>
          <button
            onClick={() => setModeFilter('BOX')}
            className={`px-3.5 py-1.5 text-xs font-mono font-bold uppercase tracking-wider transition-all cursor-pointer ${
              modeFilter === 'BOX' ? 'bg-[#D4AF37] text-[#1A1A1A]' : 'text-[#6C6863]'
            }`}
          >
            Box Batches
          </button>
          <button
            onClick={() => setModeFilter('INDIVIDUAL')}
            className={`px-3.5 py-1.5 text-xs font-mono font-bold uppercase tracking-wider transition-all cursor-pointer ${
              modeFilter === 'INDIVIDUAL' ? 'bg-[#1A1A1A] text-white' : 'text-[#6C6863]'
            }`}
          >
            Fixed Tools
          </button>
        </div>

        {/* Search */}
        <div className="relative w-full md:w-72">
          <input
            type="text"
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            placeholder="Search code, serial, product..."
            className="input-underline pl-8 pr-4 py-1.5 text-xs font-serif italic text-[#1A1A1A] w-full outline-none"
          />
          <Search className="w-4 h-4 text-[#6C6863] absolute left-1 top-2" />
        </div>
      </div>

      {/* Asset Table Card */}
      <div className="bg-white border border-[#1A1A1A]/20 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="text-[10px] font-mono font-bold text-[#6C6863] uppercase tracking-[0.2em] border-b border-[#1A1A1A]/10 bg-[#F9F8F6]">
                <th className="px-6 py-3.5">Asset Code / Item Name</th>
                <th className="px-6 py-3.5">Tracking Mode</th>
                <th className="px-6 py-3.5">Box Stock / Serial</th>
                <th className="px-6 py-3.5">Condition</th>
                <th className="px-6 py-3.5">Current Storage / Assignee</th>
                <th className="px-6 py-3.5 text-right">QR Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1A1A1A]/10">
              {filteredAssets.map((asset) => {
                const cat = catalogItems.find((c) => c.id === asset.catalog_item_id);
                const loc = locations.find((l) => l.id === asset.location_id);
                const user = users.find((u) => u.id === asset.assigned_to_user_id);
                const isBox = asset.is_box || asset.tracking_mode === 'BOX';

                return (
                  <tr key={asset.id} className="hover:bg-[#F9F8F6] transition-colors">
                    <td className="px-6 py-4">
                      <div>
                        <p className="text-sm font-serif font-bold text-[#1A1A1A]">{cat?.name || 'Asset'}</p>
                        <p className="text-xs font-mono font-bold text-[#D4AF37] mt-0.5">{asset.asset_code}</p>
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      {isBox ? (
                        <span className="text-[10px] font-mono font-bold px-2 py-0.5 bg-[#D4AF37] text-[#1A1A1A] uppercase tracking-wider">
                          BOX BATCH
                        </span>
                      ) : (
                        <span className="text-[10px] font-mono font-bold px-2 py-0.5 border border-[#1A1A1A] text-[#1A1A1A] uppercase tracking-wider">
                          INDIVIDUAL
                        </span>
                      )}
                    </td>

                    <td className="px-6 py-4 text-xs font-mono font-semibold text-[#1A1A1A]">
                      {isBox ? (
                        <span className="font-bold text-[#1A1A1A]">
                          {asset.available_in_box ?? asset.box_capacity ?? 10} / {asset.box_capacity ?? 15} Available
                        </span>
                      ) : (
                        <span>{asset.serial_number || 'N/A'}</span>
                      )}
                    </td>

                    <td className="px-6 py-4">
                      <span
                        className={`text-[9px] px-2.5 py-0.5 border font-mono font-bold uppercase tracking-wider ${getStatusBadge(
                          asset.status
                        )}`}
                      >
                        {asset.status.replace('_', ' ')}
                      </span>
                    </td>

                    <td className="px-6 py-4 text-xs font-medium text-[#1A1A1A]">
                      {asset.status === 'ISSUED' && !isBox ? (
                        <span className="text-blue-800 font-bold">Issued to: {user?.name || 'Student'}</span>
                      ) : (
                        <span className="font-mono">Location: {loc?.name || 'Unassigned'}</span>
                      )}
                    </td>

                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() =>
                          onOpenQRGenerator(
                            asset.asset_code,
                            cat?.name || asset.asset_code,
                            isBox ? `Box Capacity: ${asset.box_capacity} Units` : `SN: ${asset.serial_number || 'N/A'}`
                          )
                        }
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#1A1A1A] text-white hover:bg-[#D4AF37] transition-colors text-xs font-mono font-bold uppercase cursor-pointer"
                      >
                        <QrCode className="w-3.5 h-3.5 text-[#D4AF37]" /> Label
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Asset Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-[#1A1A1A]/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#F9F8F6] border border-[#1A1A1A] shadow-2xl w-full max-w-md overflow-hidden p-6 space-y-4">
            <h3 className="font-serif font-bold text-[#1A1A1A] text-lg border-b border-[#1A1A1A]/15 pb-2">
              Register Physical Asset / Box
            </h3>

            <form onSubmit={handleAddAssetSubmit} className="space-y-3">
              <div>
                <label className="text-[11px] font-mono uppercase text-[#6C6863]">Catalog Item</label>
                <select
                  value={selectedCatalogId}
                  onChange={(e) => setSelectedCatalogId(e.target.value)}
                  className="w-full mt-1 p-2.5 bg-white border border-[#1A1A1A] text-xs font-medium outline-none"
                  required
                >
                  {catalogItems
                    .filter((c) => c.type !== 'CONSUMABLE')
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.type})
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] font-mono uppercase text-[#6C6863]">Tracking Mode</label>
                <select
                  value={newTrackingMode}
                  onChange={(e) => setNewTrackingMode(e.target.value as AssetTrackingMode)}
                  className="w-full mt-1 p-2.5 bg-white border border-[#1A1A1A] text-xs font-mono font-bold outline-none"
                >
                  <option value="BOX">BOX BATCH (Quantity taken/returned from box)</option>
                  <option value="INDIVIDUAL">INDIVIDUAL (Single asset assigned to 1 student)</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-mono uppercase text-[#6C6863]">Unique Asset QR Code Identifier</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. BOX-ESP32-A1 or TOOL-SOLD-01"
                  value={newAssetCode}
                  onChange={(e) => setNewAssetCode(e.target.value)}
                  className="w-full mt-1 p-2.5 bg-white border border-[#1A1A1A] text-xs font-mono uppercase font-bold outline-none"
                />
              </div>

              {newTrackingMode === 'BOX' ? (
                <div>
                  <label className="text-[11px] font-mono uppercase text-[#6C6863]">Total Box Capacity (Units)</label>
                  <input
                    type="number"
                    min="1"
                    value={newBoxCapacity}
                    onChange={(e) => setNewBoxCapacity(Number(e.target.value))}
                    className="w-full mt-1 p-2.5 bg-white border border-[#1A1A1A] text-xs font-mono font-bold outline-none"
                  />
                </div>
              ) : (
                <div>
                  <label className="text-[11px] font-mono uppercase text-[#6C6863]">Serial Number (Optional)</label>
                  <input
                    type="text"
                    placeholder="SN-XXXX-YYYY"
                    value={newSerialNum}
                    onChange={(e) => setNewSerialNum(e.target.value)}
                    className="w-full mt-1 p-2.5 bg-white border border-[#1A1A1A] text-xs font-mono outline-none"
                  />
                </div>
              )}

              <div>
                <label className="text-[11px] font-mono uppercase text-[#6C6863]">Initial Storage Location</label>
                <select
                  value={newLocationId}
                  onChange={(e) => setNewLocationId(e.target.value)}
                  className="w-full mt-1 p-2.5 bg-white border border-[#1A1A1A] text-xs font-medium outline-none"
                  required
                >
                  {locations.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] font-mono uppercase text-[#6C6863]">Inspection Notes</label>
                <input
                  type="text"
                  placeholder="e.g. Fresh batch sealed in box"
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  className="w-full mt-1 p-2.5 bg-white border border-[#1A1A1A]/30 text-xs outline-none"
                />
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-2.5 border border-[#1A1A1A] text-[#1A1A1A] text-xs font-mono font-bold uppercase"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-[#1A1A1A] text-white text-xs font-mono font-bold uppercase hover:bg-[#D4AF37] transition-colors"
                >
                  Register Asset
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
