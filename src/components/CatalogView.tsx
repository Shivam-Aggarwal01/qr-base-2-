import React, { useState } from 'react';
import { Plus, Search, QrCode, AlertTriangle, Pencil, Trash2 } from 'lucide-react';
import { CatalogItem, Location, StockLevel, Asset, UserRole } from '../types/inventory';
import {
  createCatalogItemInFirestore,
  deleteFirestoreDocument,
  updateFirestoreDocument,
  COLLECTIONS,
} from '../services/firebaseInventory';
import { InventoryStorage } from '../services/storage';

// Mirrors Firestore rule: isStaff = ADMIN | STUDENT_LEAD | STUDENT_AMBASSADOR
const isStaff = (role?: UserRole) => role === 'ADMIN' || role === 'STUDENT_LEAD' || role === 'STUDENT_AMBASSADOR';

interface CatalogViewProps {
  catalogItems: CatalogItem[];
  stockLevels: StockLevel[];
  locations: Location[];
  assets: Asset[];
  userRole?: UserRole;
  onOpenQRGenerator: (code: string, title: string, subtitle?: string) => void;
  onRefreshData: () => void;
}

export const CatalogView: React.FC<CatalogViewProps> = ({
  catalogItems,
  stockLevels,
  locations,
  assets,
  userRole,
  onOpenQRGenerator,
  onRefreshData,
}) => {
  const [searchFilter, setSearchFilter] = useState('');
  const [stockFilterMode, setStockFilterMode] = useState<'all' | 'low'>('all');

  // New Item Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [newItemDesc, setNewItemDesc] = useState('');
  const [newItemUnit, setNewItemUnit] = useState('pcs');
  const [newItemMinStock, setNewItemMinStock] = useState(10);
  const [newLocationId, setNewLocationId] = useState('');

  // Edit Item Modal
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingItem, setEditingItem] = useState<CatalogItem | null>(null);
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editUnit, setEditUnit] = useState('pcs');
  const [editMinStock, setEditMinStock] = useState(10);
  const [editSaving, setEditSaving] = useState(false);

  // Restock Modal
  const [showRestockModal, setShowRestockModal] = useState(false);
  const [selectedCatalogItem, setSelectedCatalogItem] = useState<CatalogItem | null>(null);
  const [targetLocId, setTargetLocId] = useState('');
  const [restockQty, setRestockQty] = useState(10);

  // Calculate low stock items count for the badge
  const lowStockCount = catalogItems.filter((item) => {
    const totalStock = stockLevels
      .filter((s) => s.catalog_item_id === item.id || s.catalog_item_id === item.item_code)
      .reduce((sum, s) => sum + s.quantity, 0);
    const minStock = item.min_stock_alert ?? 10;
    return totalStock <= minStock;
  }).length;

  const filteredItems = catalogItems.filter((item) => {
    if (searchFilter) {
      const q = searchFilter.toLowerCase();
      if (!(item.name || '').toLowerCase().includes(q) && !(item.item_code || '').toLowerCase().includes(q))
        return false;
    }
    if (stockFilterMode === 'low') {
      const totalStock = stockLevels
        .filter((s) => s.catalog_item_id === item.id || s.catalog_item_id === item.item_code)
        .reduce((sum, s) => sum + s.quantity, 0);
      const minStock = item.min_stock_alert ?? 10;
      if (totalStock > minStock) return false;
    }
    return true;
  });

  const handleCreateCatalogItem = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newItemName.trim()) {
      alert('Item name is required');
      return;
    }

    if (!isStaff(userRole)) {
      alert(`Only staff (Admin, Student Lead, Ambassador) can add items. Your role: ${userRole || 'NOT SET'}`);
      return;
    }

    try {
      const selectedLoc = locations.find((l) => l.id === newLocationId) || locations[0];
      await createCatalogItemInFirestore({
        name: newItemName.trim(),
        description: newItemDesc,
        category: 'Uncategorized',
        is_consumable: false,
        unit: newItemUnit,
        min_stock_alert: newItemMinStock,
        storage_place: selectedLoc ? selectedLoc.name : null,
      });

      setShowAddModal(false);
      setNewItemName('');
      setNewItemDesc('');
      setNewLocationId('');
      onRefreshData();
    } catch (error: any) {
      console.error('Failed to create catalog item:', error?.message || error);
      alert(`Failed to create item. ${error?.message || 'Check Firebase permissions.'}`);
    }
  };

  const openEditModal = (item: CatalogItem) => {
    setEditingItem(item);
    setEditName(item.name || '');
    setEditDesc(item.description || '');
    setEditUnit(item.unit || 'pcs');
    setEditMinStock(item.min_stock_alert ?? 10);
    setShowEditModal(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem || !editName.trim()) return;
    setEditSaving(true);
    try {
      await updateFirestoreDocument(COLLECTIONS.CATALOG_ITEMS, editingItem.id, {
        name: editName.trim(),
        description: editDesc,
        unit: editUnit,
        min_stock_alert: editMinStock,
        updated_at: new Date().toISOString(),
      });
      setShowEditModal(false);
      setEditingItem(null);
      onRefreshData();
    } catch (error: any) {
      console.error('Failed to update catalog item:', error);
      alert(error?.message || 'Failed to update item.');
    } finally {
      setEditSaving(false);
    }
  };

  const handleRestockSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCatalogItem || !targetLocId) {
      alert('Please select a target location');
      return;
    }

    try {
      InventoryStorage.adjustStock(
        selectedCatalogItem.id,
        targetLocId,
        restockQty,
        'RECEIVE',
        `Restocked ${restockQty} ${selectedCatalogItem.unit}`
      );

      const { createFirestoreDocument, updateDocument } = await import('../services/firebaseCollections');

      try {
        const { getCollection } = await import('../services/firebaseCollections');
        const allStocks = await getCollection<{
          id: string;
          catalog_item_id: string;
          location_id: string;
          quantity: number;
        }>('stock_levels');
        const existingStock = allStocks.find(
          (s: any) => s.catalog_item_id === selectedCatalogItem.id && s.location_id === targetLocId
        );

        if (existingStock) {
          await updateDocument('stock_levels', existingStock.id, {
            quantity: existingStock.quantity + restockQty,
            updated_at: new Date().toISOString(),
          });
        } else {
          await createFirestoreDocument('stock_levels', {
            catalog_item_id: selectedCatalogItem.id,
            location_id: targetLocId,
            quantity: restockQty,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });
        }
      } catch (fbError) {
        console.warn('⚠️ Firestore update skipped:', fbError);
      }

      alert(`✓ Added ${restockQty} ${selectedCatalogItem.unit} to stock`);
      setShowRestockModal(false);
      setSelectedCatalogItem(null);
      onRefreshData();
    } catch (error: any) {
      console.error('❌ Restock failed:', error);
      alert(`Error: ${error?.message || 'Failed to restock'}`);
    }
  };

  const handleDeleteStock = async (item: CatalogItem) => {
    if (!window.confirm(`Delete all stock records for ${item.name}? The catalog item and assets will remain.`)) {
      return;
    }

    try {
      const { getCollection } = await import('../services/firebaseCollections');
      const allStocks = await getCollection<StockLevel>('stock_levels');
      const matchingStocks = allStocks.filter(
        (stock) => stock.catalog_item_id === item.id || stock.catalog_item_id === item.item_code
      );

      await Promise.all(
        matchingStocks.filter((stock) => stock.id).map((stock) => deleteFirestoreDocument('stock_levels', stock.id))
      );
      InventoryStorage.deleteStockForItem(item.id, item.item_code);
      alert(`Deleted stock records for ${item.name}.`);
      onRefreshData();
    } catch (error: any) {
      console.error('Failed to delete stock:', error);
      alert(error?.message || 'Failed to delete stock records.');
    }
  };

  const handleDeleteItem = async (item: CatalogItem) => {
    const linkedAssets = assets.filter(
      (asset) => asset.catalog_item_id === item.id || asset.catalog_item_id === item.item_code
    );

    if (linkedAssets.length > 0) {
      alert(
        `Cannot delete ${item.name} because ${linkedAssets.length} asset(s) still use this catalog item. Remove or reassign those assets first.`
      );
      return;
    }

    if (
      !window.confirm(`Delete the catalog item ${item.name}? This also removes its stock records and cannot be undone.`)
    ) {
      return;
    }

    try {
      const { getCollection } = await import('../services/firebaseCollections');
      const allStocks = await getCollection<StockLevel>('stock_levels');
      const matchingStocks = allStocks.filter(
        (stock) => stock.catalog_item_id === item.id || stock.catalog_item_id === item.item_code
      );

      await Promise.all(
        matchingStocks.filter((stock) => stock.id).map((stock) => deleteFirestoreDocument('stock_levels', stock.id))
      );
      await deleteFirestoreDocument('catalog_items', item.id);
      InventoryStorage.deleteStockForItem(item.id, item.item_code);
      alert(`Deleted catalog item ${item.name}.`);
      onRefreshData();
    } catch (error: any) {
      console.error('Failed to delete catalog item:', error);
      alert(error?.message || 'Failed to delete catalog item.');
    }
  };

  return (
    <div className="flex-1 space-y-6 p-8 overflow-y-auto max-w-7xl mx-auto w-full idea-bg">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <span className="text-[10px] font-medium tracking-[0.25em] uppercase text-[var(--color-idea-muted)]">
            LAB ITEMS
          </span>
          <h2 className="text-2xl font-bold text-[var(--color-idea-text)] tracking-tight mt-1">
            Items <span className="text-[var(--color-idea-blue)]">List</span>
          </h2>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="idea-button flex items-center gap-2 px-5 py-2.5 text-xs font-semibold cursor-pointer"
        >
          <Plus className="w-4 h-4" /> Add New Item
        </button>
      </div>

      {/* Structured Toolbar & Filter Tabs */}
      <div className="idea-card p-4 flex flex-col lg:flex-row items-center justify-between gap-4">
        {/* Search Input */}
        <div className="relative w-full lg:w-80">
          <input
            type="text"
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            placeholder="Search items directory..."
            className="idea-input pl-9 pr-4 py-2 text-xs w-full"
          />
          <Search className="w-4 h-4 text-[var(--color-idea-muted)] absolute left-3 top-2.5" />
        </div>

        {/* Clean Segmented Filter Pills */}
        <div className="flex items-center gap-1 bg-[var(--color-idea-light-grey)] p-1 rounded-xl border border-[var(--color-idea-border)] w-full lg:w-auto">
          <button
            onClick={() => setStockFilterMode('all')}
            className={`flex-1 lg:flex-none px-4 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              stockFilterMode === 'all'
                ? 'bg-white text-[var(--color-idea-text)] shadow-sm'
                : 'text-[var(--color-idea-muted)] hover:text-[var(--color-idea-text)]'
            }`}
          >
            All Items
            <span className="ml-1.5 px-1.5 py-0.5 text-[10px] rounded-md bg-[var(--color-idea-light-grey)] font-mono">
              {catalogItems.length}
            </span>
          </button>

          <button
            onClick={() => setStockFilterMode('low')}
            className={`flex-1 lg:flex-none flex items-center justify-center gap-1.5 px-4 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              stockFilterMode === 'low'
                ? 'bg-red-500 text-white shadow-sm'
                : 'text-[var(--color-idea-muted)] hover:text-red-600'
            }`}
          >
            <AlertTriangle className={`w-3.5 h-3.5 ${stockFilterMode === 'low' ? 'text-white' : 'text-red-500'}`} />
            <span>Low Stock</span>
            <span
              className={`ml-1 px-1.5 py-0.5 text-[10px] rounded-md font-mono ${stockFilterMode === 'low' ? 'bg-red-600 text-white' : 'bg-red-50 text-red-600'}`}
            >
              {lowStockCount}
            </span>
          </button>
        </div>
      </div>

      {/* Catalog Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredItems.map((item) => {
          const itemStocks = stockLevels.filter(
            (s) => s.catalog_item_id === item.id || s.catalog_item_id === item.item_code
          );
          const totalStock = itemStocks.reduce((a, b) => a + (b.quantity || 0), 0);
          const minStock = item.min_stock_alert ?? 10;
          const isLowStock = totalStock <= minStock;

          return (
            <div key={item.id} className="idea-card p-5 flex flex-col gap-4 relative group">
              {/* Top: name/desc + icon actions */}
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <h3 className="text-base font-bold text-[var(--color-idea-text)] leading-snug truncate group-hover:text-[var(--color-idea-blue)] transition-colors">
                    {item.name}
                  </h3>
                  {item.description && (
                    <p className="text-xs text-[var(--color-idea-muted)] mt-1 line-clamp-2 leading-relaxed">
                      {item.description}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => onOpenQRGenerator(item.id, item.name, 'Inventory Item')}
                    title="Generate QR label"
                    className="w-8 h-8 grid place-items-center rounded-full idea-button cursor-pointer"
                  >
                    <QrCode className="w-3.5 h-3.5" />
                  </button>
                  {isStaff(userRole) && (
                    <>
                      <button
                        type="button"
                        onClick={() => openEditModal(item)}
                        title="Edit item"
                        className="w-8 h-8 grid place-items-center rounded-full border border-[var(--color-idea-border)] text-[var(--color-idea-muted)] hover:text-[var(--color-idea-text)] hover:bg-[var(--color-idea-light-grey)] transition-colors cursor-pointer"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleDeleteItem(item)}
                        title="Delete item"
                        className="h-8 w-8 grid place-items-center rounded-full text-[var(--color-idea-muted)] hover:text-red-600 text-red-300 bg-red-50 hover:bg-red-200 cursor-pointer transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Stock readout */}
              <div className="rounded-xl bg-[var(--color-idea-light-grey)] px-4 py-3">
                <div className="flex items-baseline justify-between">
                  <span className="text-[10px] font-semibold uppercase tracking-widest text-[var(--color-idea-muted)]">
                    In stock
                  </span>
                  <span className="flex items-baseline gap-1">
                    <span
                      className={`text-xl font-mono font-bold leading-none ${
                        isLowStock ? 'text-[var(--color-idea-red)]' : 'text-[var(--color-idea-text)]'
                      }`}
                    >
                      {totalStock}
                    </span>
                    <span className="text-[10px] font-medium text-[var(--color-idea-muted)] uppercase">
                      {item.unit}
                    </span>
                  </span>
                </div>

                {isLowStock && (
                  <div className="flex items-center gap-1.5 text-[var(--color-idea-red)] text-[10px] font-semibold mt-2">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                    <span>
                      Below minimum threshold ({minStock} {item.unit})
                    </span>
                  </div>
                )}
              </div>

              {/* Actions */}
              {isStaff(userRole) ? (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedCatalogItem(item);
                      setTargetLocId(locations[0]?.id || '');
                      setShowRestockModal(true);
                    }}
                    className="idea-button flex-1 h-9 rounded-xl text-xs font-semibold cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Stock
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleDeleteStock(item)}
                    title="Clear stock records"
                    className="h-9 px-3 flex-1 rounded-xl border border-[var(--color-idea-border)] text-[var(--color-idea-muted)] hover:border-red-300 hover:text-red-600 hover:bg-red-50 text-xs font-semibold cursor-pointer transition-colors"
                  >
                    Clear
                  </button>
                </div>
              ) : (
                <p className="text-[10px] text-center text-[var(--color-idea-muted)] italic">
                  You do not have necessary permissions
                </p>
              )}
            </div>
          );
        })}
      </div>

      {/* Edit Catalog Item Modal */}
      {showEditModal && editingItem && (
        <div className="fixed inset-0 bg-[var(--color-idea-text)]/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-[var(--color-idea-border)] shadow-2xl rounded-2xl w-full max-w-md overflow-hidden p-6 space-y-4">
            <div className="border-b border-[var(--color-idea-border)] pb-2">
              <h3 className="font-bold text-[var(--color-idea-text)] text-lg">Edit Item</h3>
              <p className="text-[10px] text-[var(--color-idea-muted)] mt-0.5 font-mono">{editingItem.item_code}</p>
            </div>
            <form onSubmit={handleEditSubmit} className="space-y-3">
              <div>
                <label className="text-[11px] font-medium uppercase text-[var(--color-idea-muted)] tracking-wider">
                  Item Name
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="idea-input mt-1 p-2.5 text-xs"
                />
              </div>
              <div>
                <label className="text-[11px] font-medium uppercase text-[var(--color-idea-muted)] tracking-wider">
                  Unit
                </label>
                <input
                  type="text"
                  value={editUnit}
                  onChange={(e) => setEditUnit(e.target.value)}
                  placeholder="pcs, packs, meters"
                  className="idea-input mt-1 p-2.5 text-xs w-full"
                />
              </div>
              <div>
                <label className="text-[11px] font-medium uppercase text-[var(--color-idea-muted)] tracking-wider">
                  Description
                </label>
                <textarea
                  rows={2}
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  placeholder="Detailed technical specifications..."
                  className="idea-input mt-1 p-2.5 text-xs resize-none"
                />
              </div>
              <div>
                <label className="text-[11px] font-medium uppercase text-[var(--color-idea-muted)] tracking-wider">
                  Min Stock Threshold
                </label>
                <input
                  type="number"
                  min="1"
                  value={editMinStock}
                  onChange={(e) => setEditMinStock(Number(e.target.value))}
                  className="idea-input mt-1 p-2.5 text-xs font-mono"
                />
              </div>
              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingItem(null);
                  }}
                  disabled={editSaving}
                  className="flex-1 py-2.5 border border-[var(--color-idea-border)] text-[var(--color-idea-text)] text-xs font-semibold rounded-xl hover:bg-[var(--color-idea-light-grey)] transition-colors cursor-pointer disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editSaving}
                  className="flex-1 py-2.5 idea-button text-xs font-semibold rounded-xl cursor-pointer disabled:opacity-50"
                >
                  {editSaving ? 'Saving…' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Catalog Item Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-[var(--color-idea-text)]/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-[var(--color-idea-border)] shadow-2xl rounded-2xl w-full max-w-md overflow-hidden p-6 space-y-4">
            <div className="border-b border-[var(--color-idea-border)] pb-2">
              <h3 className="font-bold text-[var(--color-idea-text)] text-lg">Add Item</h3>
              <p className="text-[10px] text-[var(--color-idea-muted)] mt-0.5">
                A unique item code will be generated automatically.
              </p>
            </div>
            <form onSubmit={handleCreateCatalogItem} className="space-y-3">
              <div>
                <label className="text-[11px] font-medium uppercase text-[var(--color-idea-muted)] tracking-wider">
                  Item Name
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="e.g. 100k Ohm 1/4W Metal Film Resistors"
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  className="idea-input mt-1 p-2.5 text-xs"
                />
              </div>

              <div>
                <label className="text-[11px] font-medium uppercase text-[var(--color-idea-muted)] tracking-wider">
                  Unit
                </label>
                <input
                  type="text"
                  value={newItemUnit}
                  onChange={(e) => setNewItemUnit(e.target.value)}
                  placeholder="pcs, packs, meters"
                  className="idea-input mt-1 p-2.5 text-xs w-full"
                />
              </div>

              <div>
                <label className="text-[11px] font-medium uppercase text-[var(--color-idea-muted)] tracking-wider">
                  Description
                </label>
                <textarea
                  rows={2}
                  value={newItemDesc}
                  onChange={(e) => setNewItemDesc(e.target.value)}
                  placeholder="Detailed technical specifications..."
                  className="idea-input mt-1 p-2.5 text-xs resize-none"
                />
              </div>

              <div>
                <label className="text-[11px] font-medium uppercase text-[var(--color-idea-muted)] tracking-wider">
                  Min Stock Threshold
                </label>
                <input
                  type="number"
                  min="1"
                  value={newItemMinStock}
                  onChange={(e) => setNewItemMinStock(Number(e.target.value))}
                  className="idea-input mt-1 p-2.5 text-xs font-mono"
                />
              </div>

              <div>
                <label className="text-[11px] font-medium uppercase text-[var(--color-idea-muted)] tracking-wider">
                  Storage Place
                </label>
                <select
                  value={newLocationId}
                  onChange={(e) => setNewLocationId(e.target.value)}
                  className="idea-input mt-1 p-2.5 text-xs w-full"
                  required
                >
                  <option value="" disabled>
                    Select Storage Location
                  </option>
                  {locations.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name}
                    </option>
                  ))}
                </select>
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
                  Add Item
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Restock Modal */}
      {showRestockModal && selectedCatalogItem && (
        <div className="fixed inset-0 bg-[var(--color-idea-text)]/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-[var(--color-idea-border)] shadow-2xl rounded-2xl w-full max-w-sm overflow-hidden p-6 space-y-4">
            <h3 className="font-bold text-[var(--color-idea-text)] text-base border-b border-[var(--color-idea-border)] pb-2">
              Receive Shipment / Add Stock
            </h3>
            <p className="text-xs text-[var(--color-idea-muted)]">
              Adding stock to catalog item:{' '}
              <span className="font-bold text-[var(--color-idea-text)]">{selectedCatalogItem.name}</span>
            </p>

            <form onSubmit={handleRestockSubmit} className="space-y-3">
              <div>
                <label className="text-[11px] font-medium uppercase text-[var(--color-idea-muted)] tracking-wider">
                  Storage Bin
                </label>
                <select
                  value={targetLocId}
                  onChange={(e) => setTargetLocId(e.target.value)}
                  className="idea-input mt-1 p-2.5 text-xs"
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
                <label className="text-[11px] font-medium uppercase text-[var(--color-idea-muted)] tracking-wider">
                  Quantity ({selectedCatalogItem.unit})
                </label>
                <input
                  type="number"
                  min="1"
                  value={restockQty}
                  onChange={(e) => setRestockQty(Number(e.target.value))}
                  className="idea-input mt-1 p-2.5 text-xs font-mono"
                />
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowRestockModal(false)}
                  className="flex-1 py-2.5 border border-[var(--color-idea-border)] text-[var(--color-idea-text)] text-xs font-semibold rounded-xl hover:bg-[var(--color-idea-light-grey)] transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 idea-button text-xs font-semibold rounded-xl cursor-pointer"
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
