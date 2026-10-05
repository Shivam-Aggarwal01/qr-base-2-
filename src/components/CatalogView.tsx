import React, { useState } from 'react';
import { Plus, Search, QrCode, AlertTriangle, Pencil, Trash2 } from 'lucide-react';
import { Modal } from './Modal';
import { CatalogItem, Location, StockLevel, UserRole } from '../types/inventory';
import {
  createCatalogItemInFirestore,
  deleteFirestoreDocument,
  updateFirestoreDocument,
  COLLECTIONS,
} from '../services/firebaseInventory';
import { receiveCatalogStock } from '../services/firebaseCollections';
import { InventoryStorage } from '../services/storage';

// Mirrors Firestore rule: isStaff = ADMIN | STUDENT_LEAD | STUDENT_AMBASSADOR
const isStaff = (role?: UserRole) => role === 'ADMIN' || role === 'STUDENT_LEAD' || role === 'STUDENT_AMBASSADOR';

interface CatalogViewProps {
  catalogItems: CatalogItem[];
  stockLevels: StockLevel[];
  locations: Location[];
  userRole?: UserRole;
  onOpenQRGenerator: (code: string, title: string, subtitle?: string) => void;
  onRefreshData: () => void;
}

export const CatalogView: React.FC<CatalogViewProps> = ({
  catalogItems,
  stockLevels,
  locations,
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

  // ------------------------------------------------------------
  // Stock helpers
  // ------------------------------------------------------------

  const getItemStock = (item: CatalogItem) => {
    return stockLevels
      .filter((stock) => stock.catalog_item_id === item.id)
      .reduce((sum, stock) => sum + (stock.quantity || 0), 0);
  };

  const lowStockCount = catalogItems.filter((item) => {
    const totalStock = getItemStock(item);
    const minStock = item.min_stock_alert ?? 10;

    return totalStock <= minStock;
  }).length;

  const filteredItems = catalogItems.filter((item) => {
    if (searchFilter.trim()) {
      const query = searchFilter.trim().toLowerCase();

      const matchesName = (item.name || '').toLowerCase().includes(query);
      const matchesCode = (item.item_code || '').toLowerCase().includes(query);

      if (!matchesName && !matchesCode) {
        return false;
      }
    }

    if (stockFilterMode === 'low') {
      const totalStock = getItemStock(item);
      const minStock = item.min_stock_alert ?? 10;

      if (totalStock > minStock) {
        return false;
      }
    }

    return true;
  });

  // ------------------------------------------------------------
  // Create catalog item
  // ------------------------------------------------------------

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
      const selectedLoc = locations.find((location) => location.id === newLocationId) || locations[0];

      await createCatalogItemInFirestore({
        name: newItemName.trim(),
        description: newItemDesc.trim(),
        category: 'Uncategorized',
        is_consumable: false,
        unit: newItemUnit.trim() || 'pcs',
        min_stock_alert: newItemMinStock,
        storage_place: selectedLoc ? selectedLoc.name : null,
      });

      setShowAddModal(false);
      setNewItemName('');
      setNewItemDesc('');
      setNewItemUnit('pcs');
      setNewItemMinStock(10);
      setNewLocationId('');

      onRefreshData();
    } catch (error: any) {
      console.error('Failed to create catalog item:', error?.message || error);

      alert(`Failed to create item. ${error?.message || 'Check Firebase permissions.'}`);
    }
  };

  // ------------------------------------------------------------
  // Edit catalog item
  // ------------------------------------------------------------

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

    if (!editingItem || !editName.trim()) {
      return;
    }

    if (!isStaff(userRole)) {
      alert('You do not have permission to edit items.');
      return;
    }

    setEditSaving(true);

    try {
      await updateFirestoreDocument(COLLECTIONS.CATALOG_ITEMS, editingItem.id, {
        name: editName.trim(),
        description: editDesc.trim(),
        unit: editUnit.trim() || 'pcs',
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

  // ------------------------------------------------------------
  // Restock
  // ------------------------------------------------------------

  const handleRestockSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedCatalogItem) {
      alert('No item selected.');
      return;
    }

    if (!targetLocId) {
      alert('Please select a target location.');
      return;
    }

    if (!Number.isFinite(restockQty) || restockQty <= 0) {
      alert('Quantity must be greater than zero.');
      return;
    }

    try {
      await receiveCatalogStock(
        selectedCatalogItem.id,
        targetLocId,
        restockQty,
        `Restocked ${restockQty} ${selectedCatalogItem.unit}`
      );

      alert(`✓ Added ${restockQty} ${selectedCatalogItem.unit} to stock`);

      setShowRestockModal(false);
      setSelectedCatalogItem(null);
      setTargetLocId('');
      setRestockQty(10);

      onRefreshData();
    } catch (error: any) {
      console.error('Restock failed:', error);

      alert(`Error: ${error?.message || 'Failed to restock'}`);
    }
  };

  // ------------------------------------------------------------
  // Delete stock records
  // ------------------------------------------------------------

  const handleDeleteStock = async (item: CatalogItem) => {
    if (!window.confirm(`Delete all stock records for ${item.name}? The catalog item itself will remain.`)) {
      return;
    }

    try {
      const { getCollection } = await import('../services/firebaseCollections');

      const allStocks = await getCollection<StockLevel>('stock_levels');

      const matchingStocks = allStocks.filter((stock) => stock.catalog_item_id === item.id);

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

  // ------------------------------------------------------------
  // Delete catalog item
  //
  // Catalog items and assets are completely independent.
  // There is NO asset relationship check here.
  // ------------------------------------------------------------

  const handleDeleteItem = async (item: CatalogItem) => {
    if (
      !window.confirm(`Delete the catalog item ${item.name}? This also removes its stock records and cannot be undone.`)
    ) {
      return;
    }

    try {
      const { getCollection } = await import('../services/firebaseCollections');

      const allStocks = await getCollection<StockLevel>('stock_levels');

      const matchingStocks = allStocks.filter((stock) => stock.catalog_item_id === item.id);

      await Promise.all(
        matchingStocks.filter((stock) => stock.id).map((stock) => deleteFirestoreDocument('stock_levels', stock.id))
      );

      await deleteFirestoreDocument(COLLECTIONS.CATALOG_ITEMS, item.id);

      InventoryStorage.deleteStockForItem(item.id, item.item_code);

      alert(`Deleted catalog item ${item.name}.`);

      onRefreshData();
    } catch (error: any) {
      console.error('Failed to delete catalog item:', error);

      alert(error?.message || 'Failed to delete catalog item.');
    }
  };

  // ------------------------------------------------------------
  // UI
  // ------------------------------------------------------------

  return (
    <div className="flex-1 min-h-0 overflow-y-auto idea-bg">
      <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6 sm:space-y-8">
        {/* Standard Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--color-idea-border)] pb-5 sm:pb-6">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-idea-blue)]">
                IDEA Lab · Inventory
              </span>
            </div>
            <h1 className="mt-1 text-2xl sm:text-3xl font-bold tracking-tight text-[var(--color-idea-text)]">
              Inventory
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-[var(--color-idea-muted)] max-w-2xl leading-relaxed">
              Track stock levels, storage locations, and reorder thresholds.
            </p>
          </div>

          {isStaff(userRole) && (
            <button
              onClick={() => setShowAddModal(true)}
              className="idea-button flex items-center justify-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-semibold rounded-xl cursor-pointer shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Add Item</span>
            </button>
          )}
        </div>

        {/* Toolbar */}
        <div className="idea-card p-3 sm:p-4 flex flex-col lg:flex-row items-center justify-between gap-3 sm:gap-4">
          {/* Search */}
          <div className="relative w-full lg:w-96">
            <Search className="w-4 h-4 text-[var(--color-idea-muted)] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              placeholder="Search inventory by name, code, or tag…"
              className="idea-input pl-9 pr-4 py-2 text-xs sm:text-sm w-full"
            />
          </div>

          {/* Stock Filters */}
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
              <span>Low Stock</span>
              <span
                className={`ml-1 px-1.5 py-0.5 text-[10px] rounded-md font-mono ${
                  stockFilterMode === 'low' ? 'bg-red-600 text-white' : 'bg-red-50 text-red-600'
                }`}
              >
                {lowStockCount}
              </span>
            </button>
          </div>
        </div>

        {/* Catalog Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredItems.map((item) => {
            const totalStock = getItemStock(item);

            const minStock = item.min_stock_alert ?? 10;

            const isLowStock = totalStock <= minStock;

            return (
              <div key={item.id} className="idea-card p-5 flex flex-col gap-4 relative group">
                {/* Item Header */}
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
                      onClick={() => onOpenQRGenerator(item.item_code, item.name, 'Inventory Item')}
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

                {/* Item Code */}
                <div className="text-[9px] font-mono text-[var(--color-idea-blue)] truncate">{item.item_code}</div>

                {/* Stock */}
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
                        setRestockQty(10);
                        setShowRestockModal(true);
                      }}
                      className="idea-button flex-1 h-9 rounded-xl text-xs font-semibold cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Add Stock
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

        {/* Empty State */}
        {filteredItems.length === 0 && (
          <div className="idea-card p-10 text-center">
            <p className="text-sm font-semibold text-[var(--color-idea-text)]">No items found</p>

            <p className="text-xs text-[var(--color-idea-muted)] mt-1">Try changing your search or stock filter.</p>
          </div>
        )}

        {/* ============================================================
          EDIT ITEM MODAL
          ============================================================ */}
        <Modal
          isOpen={showEditModal && !!editingItem}
          onClose={() => {
            setShowEditModal(false);
            setEditingItem(null);
          }}
          title="Edit Item"
          subtitle={editingItem ? `Code: ${editingItem.item_code}` : undefined}
          category="Catalog Specification"
          preventClose={editSaving}
          closeOnOutsideClick={true}
          closeOnEscape={true}
          maxWidth="md"
          bodyClassName="p-6"
        >
          {editingItem && (
            <form onSubmit={handleEditSubmit} className="space-y-4">
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

              <div className="pt-2 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingItem(null);
                  }}
                  disabled={editSaving}
                  className="flex-1 py-2.5 border border-[var(--color-idea-border)] text-[var(--color-idea-text)] text-xs font-semibold rounded-xl hover:bg-[var(--color-idea-light-grey)] transition-colors cursor-pointer disabled:opacity-50 flex items-center justify-center"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={editSaving}
                  className="flex-1 py-2.5 idea-button text-xs font-semibold rounded-xl cursor-pointer disabled:opacity-50 flex items-center justify-center"
                >
                  {editSaving ? 'Saving…' : 'Save Changes'}
                </button>
              </div>
            </form>
          )}
        </Modal>

        {/* ============================================================
          ADD ITEM MODAL
          ============================================================ */}
        <Modal
          isOpen={showAddModal}
          onClose={() => setShowAddModal(false)}
          title="Add Item"
          subtitle="A unique item code will be generated automatically."
          category="Catalog Specification"
          closeOnOutsideClick={true}
          closeOnEscape={true}
          maxWidth="md"
          bodyClassName="p-6"
        >
          <form onSubmit={handleCreateCatalogItem} className="space-y-4">
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

                {locations.map((location) => (
                  <option key={location.id} value={location.id}>
                    {location.name}
                  </option>
                ))}
              </select>
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
                Add Item
              </button>
            </div>
          </form>
        </Modal>

        {/* ============================================================
          RESTOCK MODAL
          ============================================================ */}
        <Modal
          isOpen={showRestockModal && !!selectedCatalogItem}
          onClose={() => {
            setShowRestockModal(false);
            setSelectedCatalogItem(null);
          }}
          title="Receive Shipment / Add Stock"
          subtitle={selectedCatalogItem ? `Item: ${selectedCatalogItem.name}` : undefined}
          category="Inventory Restock"
          closeOnOutsideClick={true}
          closeOnEscape={true}
          maxWidth="sm"
          bodyClassName="p-6"
        >
          {selectedCatalogItem && (
            <form onSubmit={handleRestockSubmit} className="space-y-4">
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

                  {locations.map((location) => (
                    <option key={location.id} value={location.id}>
                      {location.name}
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

              <div className="pt-2 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowRestockModal(false);
                    setSelectedCatalogItem(null);
                  }}
                  className="flex-1 py-2.5 border border-[var(--color-idea-border)] text-[var(--color-idea-text)] text-xs font-semibold rounded-xl hover:bg-[var(--color-idea-light-grey)] transition-colors cursor-pointer flex items-center justify-center"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="flex-1 py-2.5 idea-button text-xs font-semibold rounded-xl cursor-pointer flex items-center justify-center"
                >
                  Confirm Restock
                </button>
              </div>
            </form>
          )}
        </Modal>
      </div>
    </div>
  );
};
