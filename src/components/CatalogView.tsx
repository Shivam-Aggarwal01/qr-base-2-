import React, { useState } from "react";
import {
  Plus,
  Search,
  QrCode,
  AlertTriangle,
  Box,
  Wrench,
  Package,
} from "lucide-react";
import {
  CatalogItem,
  Location,
  StockLevel,
  Asset,
  UserRole,
} from "../types/inventory";
import { InventoryStorage } from "../services/storage";
import {
  createCatalogItemInFirestore,
  deleteFirestoreDocument,
} from "../services/firebaseInventory";

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
  const [searchFilter, setSearchFilter] = useState("");
  const [onlyLowStock, setOnlyLowStock] = useState(false);

  // New Item Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [newItemCode, setNewItemCode] = useState("");
  const [newItemName, setNewItemName] = useState("");
  const [newItemDesc, setNewItemDesc] = useState("");
  const [newItemUnit, setNewItemUnit] = useState("pcs");
  const [newItemMinStock, setNewItemMinStock] = useState(10);
  const [newItemStoragePlace, setNewItemStoragePlace] = useState("");

  // Restock Modal
  const [showRestockModal, setShowRestockModal] = useState(false);
  const [selectedCatalogItem, setSelectedCatalogItem] =
    useState<CatalogItem | null>(null);
  const [targetLocId, setTargetLocId] = useState("");
  const [restockQty, setRestockQty] = useState(10);

  const filteredItems = catalogItems.filter((item) => {
    if (searchFilter) {
      const q = searchFilter.toLowerCase();
      if (
        !(item.name || "").toLowerCase().includes(q) &&
        !(item.item_code || "").toLowerCase().includes(q)
      )
        return false;
    }
    if (onlyLowStock) {
      const totalStock = stockLevels
        .filter(
          (s) =>
            s.catalog_item_id === item.id ||
            s.catalog_item_id === item.item_code,
        )
        .reduce((sum, s) => sum + s.quantity, 0);
      const minStock = item.min_stock_alert ?? 10;
      if (totalStock > minStock) return false;
    }
    return true;
  });

  const handleCreateCatalogItem = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log("🔍 Form submitted. userRole:", userRole);

    if (!newItemCode.trim() || !newItemName.trim()) {
      alert("Code and Name are required");
      return;
    }

    if (
      !userRole ||
      (userRole !== "ADMIN" && userRole !== "STUDENT_AMBASSADOR")
    ) {
      alert(
        `Only admins and student ambassadors can add items. Your role: ${userRole || "NOT SET"}`,
      );
      return;
    }

    try {
      const payload = {
        item_code: newItemCode.trim().toUpperCase(),
        name: newItemName.trim(),
        description: newItemDesc,
        unit: newItemUnit,
        min_stock_alert: newItemMinStock,
        storage_place: newItemStoragePlace.trim() || locations[0]?.name || null,
      };

      console.log("📤 Sending to Firebase:", payload);
      await createCatalogItemInFirestore(payload);
      console.log("✅ Firebase write succeeded");

      try {
        const { createFirestoreDocument } =
          await import("../services/firebaseCollections");
        await createFirestoreDocument("stock_levels", {
          catalog_item_id: payload.item_code,
          location_id: "default-location-1",
          quantity: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
        console.log("✅ Created stock level entry");
      } catch (stockError) {
        console.warn("⚠️ Stock level creation skipped:", stockError);
      }

      alert(`✓ Successfully created ${newItemCode} in Firebase catalog.`);

      setShowAddModal(false);
      setNewItemCode("");
      setNewItemName("");
      setNewItemDesc("");
      setNewItemStoragePlace("");
      onRefreshData();
    } catch (error: any) {
      console.error("❌ Firebase write failed:", error?.message || error);
      try {
        console.log("💾 Falling back to local storage...");
        InventoryStorage.saveCatalogItem({
          item_code: newItemCode.trim().toUpperCase(),
          name: newItemName.trim(),
          description: newItemDesc,
          unit: newItemUnit,
          min_stock_alert: newItemMinStock,
          storage_place:
            newItemStoragePlace.trim() || locations[0]?.name || null,
        });

        InventoryStorage.adjustStock(
          newItemCode.trim().toUpperCase(),
          "default-location-1",
          0,
          "RECEIVE",
          "Initial stock entry",
        );

        setShowAddModal(false);
        setNewItemCode("");
        setNewItemName("");
        setNewItemDesc("");
        setNewItemStoragePlace("");
        onRefreshData();
        alert(
          `✓ Saved locally (Firebase blocked: ${error?.message || "permission denied"})`,
        );
      } catch (localError: any) {
        console.error("❌ Local save also failed:", localError?.message);
        alert(
          `✗ Failed to save. Error: ${localError?.message || "unknown error"}`,
        );
      }
    }
  };

  const handleRestockSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCatalogItem || !targetLocId) {
      alert("Please select a target location");
      return;
    }

    try {
      console.log(`📈 Restocking: +${restockQty} to ${selectedCatalogItem.id}`);

      InventoryStorage.adjustStock(
        selectedCatalogItem.id,
        targetLocId,
        restockQty,
        "RECEIVE",
        `Restocked ${restockQty} ${selectedCatalogItem.unit}`,
      );

      const { createFirestoreDocument, updateDocument } =
        await import("../services/firebaseCollections");

      try {
        const { getCollection } =
          await import("../services/firebaseCollections");
        const allStocks = await getCollection<{
          id: string;
          catalog_item_id: string;
          location_id: string;
          quantity: number;
        }>("stock_levels");
        const existingStock = allStocks.find(
          (s: any) =>
            s.catalog_item_id === selectedCatalogItem.id &&
            s.location_id === targetLocId,
        );

        if (existingStock) {
          await updateDocument("stock_levels", existingStock.id, {
            quantity: existingStock.quantity + restockQty,
            updated_at: new Date().toISOString(),
          });
        } else {
          await createFirestoreDocument("stock_levels", {
            catalog_item_id: selectedCatalogItem.id,
            location_id: targetLocId,
            quantity: restockQty,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });
        }
      } catch (fbError) {
        console.warn("⚠️ Firestore update skipped:", fbError);
      }

      alert(`✓ Added ${restockQty} ${selectedCatalogItem.unit} to stock`);
      setShowRestockModal(false);
      setSelectedCatalogItem(null);
      onRefreshData();
    } catch (error: any) {
      console.error("❌ Restock failed:", error);
      alert(`Error: ${error?.message || "Failed to restock"}`);
    }
  };

  const handleDeleteStock = async (item: CatalogItem) => {
    if (
      !window.confirm(
        `Delete all stock records for ${item.name}? The catalog item and assets will remain.`,
      )
    ) {
      return;
    }

    try {
      const { getCollection } = await import("../services/firebaseCollections");
      const allStocks = await getCollection<StockLevel>("stock_levels");
      const matchingStocks = allStocks.filter(
        (stock) =>
          stock.catalog_item_id === item.id ||
          stock.catalog_item_id === item.item_code,
      );

      await Promise.all(
        matchingStocks
          .filter((stock) => stock.id)
          .map((stock) => deleteFirestoreDocument("stock_levels", stock.id)),
      );
      InventoryStorage.deleteStockForItem(item.id, item.item_code);
      alert(`Deleted stock records for ${item.name}.`);
      onRefreshData();
    } catch (error: any) {
      console.error("Failed to delete stock:", error);
      alert(error?.message || "Failed to delete stock records.");
    }
  };

  return (
    <div className="flex-1 space-y-8 p-8 overflow-y-auto max-w-7xl mx-auto w-full idea-bg">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <span className="text-[10px] font-medium tracking-[0.25em] uppercase text-[var(--color-idea-muted)]">
            CATALOG INDEX
          </span>
          <h2 className="text-2xl font-bold text-[var(--color-idea-text)] tracking-tight mt-1">
            Master Component{" "}
            <span className="text-[var(--color-idea-blue)]">Directory</span>
          </h2>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="idea-button flex items-center gap-2 px-5 py-2.5 text-xs font-semibold cursor-pointer"
        >
          <Plus className="w-4 h-4" /> Add New Item
        </button>
      </div>

      {/* Filter Tabs & Search Toolbar */}
      <div className="idea-card p-4 flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Search & Checkbox */}
        <div className="flex items-center gap-4 w-full md:w-auto">
          <div className="relative flex-1 md:w-72">
            <input
              type="text"
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              placeholder="Search catalog directory..."
              className="idea-input pl-9 pr-4 py-2 text-xs"
            />
            <Search className="w-4 h-4 text-[var(--color-idea-muted)] absolute left-3 top-2.5" />
          </div>

          <label className="flex items-center gap-2 text-xs font-semibold text-[var(--color-idea-text)] cursor-pointer select-none shrink-0 bg-[var(--color-idea-light-grey)] px-3 py-2 rounded-xl border border-[var(--color-idea-border)]">
            <input
              type="checkbox"
              checked={onlyLowStock}
              onChange={(e) => setOnlyLowStock(e.target.checked)}
              className="accent-[var(--color-idea-blue)]"
            />
            <span>Low Stock Alerts</span>
          </label>
        </div>
      </div>

      {/* Catalog Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredItems.map((item) => {
          const itemStocks = stockLevels.filter(
            (s) =>
              s.catalog_item_id === item.id ||
              s.catalog_item_id === item.item_code,
          );
          const totalStock = itemStocks.reduce(
            (a, b) => a + (b.quantity || 0),
            0,
          );
          const minStock = item.min_stock_alert ?? 10;
          const isLowStock = totalStock <= minStock;

          const itemAssets = assets.filter(
            (a) => a.catalog_item_id === item.id,
          );
          const availableAssetsCount = itemAssets.filter(
            (a) => a.status === "AVAILABLE",
          ).length;

          return (
            <div
              key={item.id}
              className="idea-card p-6 flex flex-col justify-between relative overflow-hidden group"
            >
              <div className="space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-base font-bold text-[var(--color-idea-text)] mt-2 group-hover:text-[var(--color-idea-blue)] transition-colors">
                      {item.name}
                    </h3>
                    <p className="text-xs font-mono font-bold text-[var(--color-idea-blue)] mt-0.5">
                      {item.item_code}
                    </p>
                  </div>
                  <button
                    onClick={() =>
                      onOpenQRGenerator(
                        item.item_code,
                        item.name,
                        "Inventory Item",
                      )
                    }
                    className="p-2 idea-button rounded-xl cursor-pointer"
                    title="Generate QR Label"
                  >
                    <QrCode className="w-4 h-4" />
                  </button>
                </div>

                <p className="text-xs text-[var(--color-idea-muted)] line-clamp-2 leading-relaxed">
                  {item.description}
                </p>

                {/* Stock Level Display */}
                <div className="pt-3 border-t border-[var(--color-idea-border)]">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-medium uppercase tracking-widest text-[var(--color-idea-muted)]">
                      Items in stock
                    </span>
                    <span
                      className={`text-base font-mono font-bold ${isLowStock ? "text-[var(--color-idea-red)]" : "text-[var(--color-idea-text)]"}`}
                    >
                      {totalStock} {item.unit}
                    </span>
                  </div>

                  {isLowStock && (
                    <div className="flex items-center gap-1.5 idea-error text-[10px] font-bold mt-2 px-2.5 py-1 rounded-xl">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span>
                        Below minimum threshold ({minStock} {item.unit})
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Card Footer Actions */}
              <div className="pt-4 mt-4 border-t border-[var(--color-idea-border)]">
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setSelectedCatalogItem(item);
                      setTargetLocId(locations[0]?.id || "");
                      setShowRestockModal(true);
                    }}
                    className="flex-1 py-2.5 idea-button rounded-xl text-xs font-semibold cursor-pointer"
                  >
                    + Add Stock / Restock
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleDeleteStock(item)}
                    className="px-3 py-2.5 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 text-xs font-semibold cursor-pointer"
                  >
                    Delete Stock
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Catalog Item Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-[var(--color-idea-text)]/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-[var(--color-idea-border)] shadow-2xl rounded-2xl w-full max-w-md overflow-hidden p-6 space-y-4">
            <h3 className="font-bold text-[var(--color-idea-text)] text-lg border-b border-[var(--color-idea-border)] pb-2">
              Create New Catalog Entry
            </h3>
            <form onSubmit={handleCreateCatalogItem} className="space-y-3">
              <div>
                <label className="text-[11px] font-medium uppercase text-[var(--color-idea-muted)] tracking-wider">
                  Item Code (Unique)
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. CON-100K-X or ARD-DUE-01"
                  value={newItemCode}
                  onChange={(e) => setNewItemCode(e.target.value)}
                  className="idea-input mt-1 p-2.5 text-xs font-mono uppercase"
                />
              </div>

              <div>
                <label className="text-[11px] font-medium uppercase text-[var(--color-idea-muted)] tracking-wider">
                  Item Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 100k Ohm 1/4W Metal Film Resistors"
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  className="idea-input mt-1 p-2.5 text-xs"
                />
              </div>

              <div className="grid grid-cols-1 gap-3">
                <div>
                  <label className="text-[11px] font-medium uppercase text-[var(--color-idea-muted)] tracking-wider">
                    Unit
                  </label>
                  <input
                    type="text"
                    value={newItemUnit}
                    onChange={(e) => setNewItemUnit(e.target.value)}
                    placeholder="pcs, packs, meters"
                    className="idea-input mt-1 p-2.5 text-xs"
                  />
                </div>
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
                <input
                  type="text"
                  value={newItemStoragePlace}
                  onChange={(e) => setNewItemStoragePlace(e.target.value)}
                  placeholder="e.g. Shelf A / Cabinet B / Room 204"
                  className="idea-input mt-1 p-2.5 text-xs"
                />
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
                  Create Record
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
              Adding stock to catalog item:{" "}
              <span className="font-bold text-[var(--color-idea-text)]">
                {selectedCatalogItem.name}
              </span>
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
