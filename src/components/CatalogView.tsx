import React, { useState } from 'react';
import { Plus, Search, QrCode, AlertTriangle, Box, Wrench, Package } from 'lucide-react';
import { CatalogItem, Location, StockLevel, Asset, ItemType } from '../types/inventory';
import { InventoryStorage } from '../services/storage';

interface CatalogViewProps {
  catalogItems: CatalogItem[];
  stockLevels: StockLevel[];
  locations: Location[];
  assets: Asset[];
  onOpenQRGenerator: (code: string, title: string, subtitle?: string) => void;
  onRefreshData: () => void;
}

export const CatalogView: React.FC<CatalogViewProps> = ({
  catalogItems,
  stockLevels,
  locations,
  assets,
  onOpenQRGenerator,
  onRefreshData
}) => {
  const [selectedType, setSelectedType] = useState<ItemType | 'ALL'>('ALL');
  const [searchFilter, setSearchFilter] = useState('');
  const [onlyLowStock, setOnlyLowStock] = useState(false);

  // New Item Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [newItemCode, setNewItemCode] = useState('');
  const [newItemName, setNewItemName] = useState('');
  const [newItemType, setNewItemType] = useState<ItemType>('CONSUMABLE');
  const [newItemDesc, setNewItemDesc] = useState('');
  const [newItemUnit, setNewItemUnit] = useState('pcs');
  const [newItemMinStock, setNewItemMinStock] = useState(10);

  // Restock Modal
  const [showRestockModal, setShowRestockModal] = useState(false);
  const [selectedCatalogItem, setSelectedCatalogItem] = useState<CatalogItem | null>(null);
  const [targetLocId, setTargetLocId] = useState('');
  const [restockQty, setRestockQty] = useState(10);

  const filteredItems = catalogItems.filter((item) => {
    if (selectedType !== 'ALL' && item.type !== selectedType) return false;
    if (searchFilter) {
      const q = searchFilter.toLowerCase();
      if (!item.name.toLowerCase().includes(q) && !item.item_code.toLowerCase().includes(q)) return false;
    }
    if (onlyLowStock) {
      const totalStock = stockLevels
        .filter((s) => s.catalog_item_id === item.id)
        .reduce((sum, s) => sum + s.quantity, 0);
      const minStock = item.min_stock_alert ?? 10;
      if (totalStock > minStock) return false;
    }
    return true;
  });

  const handleCreateCatalogItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemCode.trim() || !newItemName.trim()) return alert('Code and Name are required');

    InventoryStorage.saveCatalogItem({
      item_code: newItemCode.trim().toUpperCase(),
      name: newItemName.trim(),
      type: newItemType,
      description: newItemDesc,
      unit: newItemUnit,
      min_stock_alert: newItemMinStock
    });

    setShowAddModal(false);
    setNewItemCode('');
    setNewItemName('');
    onRefreshData();
  };

  const handleRestockSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCatalogItem || !targetLocId) return alert('Please select a target location');

    InventoryStorage.adjustStock(
      selectedCatalogItem.id,
      targetLocId,
      restockQty,
      'RECEIVE',
      `Restocked ${restockQty} ${selectedCatalogItem.unit}`
    );

    setShowRestockModal(false);
    setSelectedCatalogItem(null);
    onRefreshData();
  };

  const getItemTypeBadge = (type: ItemType) => {
    switch (type) {
      case 'CONSUMABLE':
        return 'border-purple-800 bg-purple-50 text-purple-900';
      case 'REUSABLE':
        return 'border-[#D4AF37] bg-amber-50 text-amber-900';
      case 'TOOL':
        return 'border-[#1A1A1A] bg-[#1A1A1A] text-white';
    }
  };

  return (
    <div className="flex-1 space-y-8 p-8 overflow-y-auto max-w-7xl mx-auto w-full paper-texture">
      {/* Header Bar */}
      <div className="border-b border-[#1A1A1A]/15 pb-4 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <span className="text-[10px] font-mono tracking-[0.25em] uppercase text-[#6C6863]">CATALOG INDEX</span>
          <h2 className="font-serif text-3xl font-bold text-[#1A1A1A] mt-0.5">
            Master Component <span className="font-serif italic font-normal text-[#D4AF37]">Directory</span>
          </h2>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 bg-[#1A1A1A] hover:bg-[#D4AF37] text-white px-5 py-2.5 text-xs font-mono font-bold uppercase tracking-widest transition-colors cursor-pointer border border-[#1A1A1A]"
        >
          <Plus className="w-4 h-4 text-[#D4AF37]" /> Add New Item
        </button>
      </div>

      {/* Filter Tabs & Search Toolbar */}
      <div className="bg-white p-5 border border-[#1A1A1A]/20 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Type Tabs */}
        <div className="flex items-center gap-2 bg-[#F9F8F6] p-1.5 border border-[#1A1A1A]/10 w-full md:w-auto">
          {(['ALL', 'CONSUMABLE', 'REUSABLE', 'TOOL'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setSelectedType(t)}
              className={`px-4 py-2 text-xs font-mono font-bold uppercase tracking-wider transition-all cursor-pointer ${
                selectedType === t
                  ? 'bg-[#1A1A1A] text-white'
                  : 'text-[#6C6863] hover:text-[#1A1A1A]'
              }`}
            >
              {t === 'ALL' ? 'All Items' : t}
            </button>
          ))}
        </div>

        {/* Search & Checkbox */}
        <div className="flex items-center gap-4 w-full md:w-auto">
          <div className="relative flex-1 md:w-72">
            <input
              type="text"
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              placeholder="Search catalog directory..."
              className="input-underline pl-8 pr-4 py-1.5 text-xs font-serif italic text-[#1A1A1A] w-full outline-none"
            />
            <Search className="w-4 h-4 text-[#6C6863] absolute left-1 top-2" />
          </div>

          <label className="flex items-center gap-2 text-xs font-mono uppercase font-bold text-[#1A1A1A] cursor-pointer select-none shrink-0 bg-[#F9F8F6] px-3 py-2 border border-[#1A1A1A]/20">
            <input
              type="checkbox"
              checked={onlyLowStock}
              onChange={(e) => setOnlyLowStock(e.target.checked)}
              className="accent-[#D4AF37]"
            />
            <span>Low Stock Alerts</span>
          </label>
        </div>
      </div>

      {/* Catalog Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredItems.map((item) => {
          const itemStocks = stockLevels.filter((s) => s.catalog_item_id === item.id);
          const totalStock = itemStocks.reduce((a, b) => a + b.quantity, 0);
          const minStock = item.min_stock_alert ?? 10;
          const isLowStock = totalStock <= minStock;

          // For Reusables and Tools, count physical assets
          const itemAssets = assets.filter((a) => a.catalog_item_id === item.id);
          const availableAssetsCount = itemAssets.filter((a) => a.status === 'AVAILABLE').length;

          return (
            <div
              key={item.id}
              className="bg-white border border-[#1A1A1A]/20 shadow-sm p-6 flex flex-col justify-between relative overflow-hidden group hover:border-[#D4AF37] transition-all"
            >
              <div className="space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <span className={`text-[9px] px-2.5 py-0.5 border font-mono font-bold uppercase tracking-widest ${getItemTypeBadge(item.type)}`}>
                      {item.type}
                    </span>
                    <h3 className="font-serif text-lg font-bold text-[#1A1A1A] mt-2 group-hover:text-[#D4AF37] transition-colors">
                      {item.name}
                    </h3>
                    <p className="text-xs font-mono font-bold text-[#D4AF37] mt-0.5">{item.item_code}</p>
                  </div>
                  <button
                    onClick={() => onOpenQRGenerator(item.item_code, item.name, `Type: ${item.type}`)}
                    className="p-2 bg-[#1A1A1A] text-[#D4AF37] hover:bg-[#D4AF37] hover:text-[#1A1A1A] transition-colors cursor-pointer"
                    title="Generate QR Label"
                  >
                    <QrCode className="w-4 h-4" />
                  </button>
                </div>

                <p className="text-xs text-[#6C6863] line-clamp-2 leading-relaxed">{item.description}</p>

                {/* Stock Level Display */}
                <div className="pt-3 border-t border-[#1A1A1A]/10">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono uppercase tracking-widest text-[#6C6863]">
                      {item.type === 'CONSUMABLE' ? 'Bulk Inventory Stock' : 'Tracked Physical Assets'}
                    </span>
                    <span className={`text-base font-mono font-bold ${isLowStock ? 'text-red-700' : 'text-[#1A1A1A]'}`}>
                      {item.type === 'CONSUMABLE' ? `${totalStock} ${item.unit}` : `${availableAssetsCount} / ${itemAssets.length} Avail`}
                    </span>
                  </div>

                  {isLowStock && (
                    <div className="flex items-center gap-1.5 text-red-800 text-[10px] font-mono font-bold mt-2 bg-red-50 border border-red-200 px-2.5 py-1">
                      <AlertTriangle className="w-3.5 h-3.5 text-red-700" />
                      <span>Below minimum threshold ({minStock} {item.unit})</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Card Footer Actions */}
              <div className="pt-4 mt-4 border-t border-[#1A1A1A]/10 flex items-center gap-2">
                <button
                  onClick={() => {
                    setSelectedCatalogItem(item);
                    setTargetLocId(locations[0]?.id || '');
                    setShowRestockModal(true);
                  }}
                  className="flex-1 py-2.5 bg-[#1A1A1A] hover:bg-[#D4AF37] text-white font-mono text-xs uppercase font-bold tracking-wider transition-colors cursor-pointer"
                >
                  + Add Stock / Restock
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Catalog Item Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-[#1A1A1A]/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#F9F8F6] border border-[#1A1A1A] shadow-2xl w-full max-w-md overflow-hidden p-6 space-y-4">
            <h3 className="font-serif font-bold text-[#1A1A1A] text-lg border-b border-[#1A1A1A]/15 pb-2">
              Create New Catalog Entry
            </h3>
            <form onSubmit={handleCreateCatalogItem} className="space-y-3">
              <div>
                <label className="text-[11px] font-mono uppercase text-[#6C6863]">Item Code (Unique)</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. CON-100K-X or ARD-DUE-01"
                  value={newItemCode}
                  onChange={(e) => setNewItemCode(e.target.value)}
                  className="w-full mt-1 p-2.5 bg-white border border-[#1A1A1A] text-xs font-mono uppercase font-bold outline-none"
                />
              </div>

              <div>
                <label className="text-[11px] font-mono uppercase text-[#6C6863]">Item Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 100k Ohm 1/4W Metal Film Resistors"
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  className="w-full mt-1 p-2.5 bg-white border border-[#1A1A1A] text-xs font-serif outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-mono uppercase text-[#6C6863]">Category Type</label>
                  <select
                    value={newItemType}
                    onChange={(e) => setNewItemType(e.target.value as ItemType)}
                    className="w-full mt-1 p-2.5 bg-white border border-[#1A1A1A] text-xs font-mono outline-none"
                  >
                    <option value="CONSUMABLE">CONSUMABLE</option>
                    <option value="REUSABLE">REUSABLE</option>
                    <option value="TOOL">TOOL</option>
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-mono uppercase text-[#6C6863]">Unit</label>
                  <input
                    type="text"
                    value={newItemUnit}
                    onChange={(e) => setNewItemUnit(e.target.value)}
                    placeholder="pcs, packs, meters"
                    className="w-full mt-1 p-2.5 bg-white border border-[#1A1A1A] text-xs outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-mono uppercase text-[#6C6863]">Description</label>
                <textarea
                  rows={2}
                  value={newItemDesc}
                  onChange={(e) => setNewItemDesc(e.target.value)}
                  placeholder="Detailed technical specifications..."
                  className="w-full mt-1 p-2.5 bg-white border border-[#1A1A1A]/30 text-xs outline-none"
                />
              </div>

              <div>
                <label className="text-[11px] font-mono uppercase text-[#6C6863]">Min Stock Threshold</label>
                <input
                  type="number"
                  min="1"
                  value={newItemMinStock}
                  onChange={(e) => setNewItemMinStock(Number(e.target.value))}
                  className="w-full mt-1 p-2.5 bg-white border border-[#1A1A1A] text-xs font-mono font-bold outline-none"
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
                  Create Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Restock Modal */}
      {showRestockModal && selectedCatalogItem && (
        <div className="fixed inset-0 bg-[#1A1A1A]/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#F9F8F6] border border-[#1A1A1A] shadow-2xl w-full max-w-sm overflow-hidden p-6 space-y-4">
            <h3 className="font-serif font-bold text-[#1A1A1A] text-base border-b border-[#1A1A1A]/15 pb-2">
              Receive Shipment / Add Stock
            </h3>
            <p className="text-xs text-[#6C6863]">
              Adding stock to catalog item: <span className="font-bold text-[#1A1A1A] font-serif">{selectedCatalogItem.name}</span>
            </p>

            <form onSubmit={handleRestockSubmit} className="space-y-3">
              <div>
                <label className="text-[11px] font-mono uppercase text-[#6C6863]">Storage Bin</label>
                <select
                  value={targetLocId}
                  onChange={(e) => setTargetLocId(e.target.value)}
                  className="w-full mt-1 p-2.5 bg-white border border-[#1A1A1A] text-xs outline-none"
                  required
                >
                  <option value="">-- Choose Storage Location --</option>
                  {locations.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] font-mono uppercase text-[#6C6863]">Quantity ({selectedCatalogItem.unit})</label>
                <input
                  type="number"
                  min="1"
                  value={restockQty}
                  onChange={(e) => setRestockQty(Number(e.target.value))}
                  className="w-full mt-1 p-2.5 bg-white border border-[#1A1A1A] text-xs font-mono font-bold outline-none"
                />
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowRestockModal(false)}
                  className="flex-1 py-2.5 border border-[#1A1A1A] text-[#1A1A1A] text-xs font-mono font-bold uppercase"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-[#1A1A1A] text-white text-xs font-mono font-bold uppercase hover:bg-[#D4AF37] transition-colors"
                >
                  Confirm Restock
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
