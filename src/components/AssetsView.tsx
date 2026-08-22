import React, { useState } from "react";
import { Plus, Search, QrCode, Box, Layers, ShieldCheck } from "lucide-react";
import {
  Asset,
  CatalogItem,
  Location,
  User,
  AssetStatus,
  AssetTrackingMode,
} from "../types/inventory";
import { createAssetInFirestore } from "../services/firebaseInventory";

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
  onRefreshData,
}) => {
  const [statusFilter, setStatusFilter] = useState<AssetStatus | "ALL">("ALL");
  const [modeFilter, setModeFilter] = useState<"ALL" | "BOX" | "INDIVIDUAL">(
    "ALL",
  );
  const [searchFilter, setSearchFilter] = useState("");

  // Add Asset Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedCatalogId, setSelectedCatalogId] = useState(
    catalogItems.find((c) => c.type !== "CONSUMABLE")?.id || "",
  );
  const [newAssetCode, setNewAssetCode] = useState("");
  const [newTrackingMode, setNewTrackingMode] =
    useState<AssetTrackingMode>("BOX");
  const [newBoxCapacity, setNewBoxCapacity] = useState(15);
  const [newSerialNum, setNewSerialNum] = useState("");
  const [newLocationId, setNewLocationId] = useState(locations[0]?.id || "");
  const [newNotes, setNewNotes] = useState("");

  const filteredAssets = assets.filter((asset) => {
    if (statusFilter !== "ALL" && asset.status !== statusFilter) return false;
    if (
      modeFilter === "BOX" &&
      !(asset.is_box || asset.tracking_mode === "BOX")
    )
      return false;
    if (
      modeFilter === "INDIVIDUAL" &&
      (asset.is_box || asset.tracking_mode === "BOX")
    )
      return false;

    if (searchFilter) {
      const q = searchFilter.toLowerCase();
      const cat = catalogItems.find(
        (c) =>
          c.id === asset.catalog_item_id ||
          c.item_code === asset.catalog_item_id,
      );
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
      return alert("Item, Asset Code, and Storage Location are required");
    }

    try {
      await createAssetInFirestore({
        asset_code: newAssetCode.trim().toUpperCase(),
        catalog_item_id: selectedCatalogId,
        serial_number: newSerialNum.trim() ? newSerialNum.trim() : undefined,
        status: "AVAILABLE",
        location_id: newLocationId,
        assigned_to_user_id: null,
        tracking_mode: newTrackingMode,
        is_box: newTrackingMode === "BOX",
        box_capacity: newTrackingMode === "BOX" ? newBoxCapacity : 1,
        available_in_box: newTrackingMode === "BOX" ? newBoxCapacity : 1,
        notes: newNotes || "",
      });

      setShowAddModal(false);
      setNewAssetCode("");
      setNewSerialNum("");
      setNewNotes("");
      onRefreshData();
    } catch (error) {
      console.error("Failed to create asset in Firestore:", error);
      alert("Failed to create asset. Check Firebase permissions.");
    }
  };

  const getStatusBadge = (status: AssetStatus) => {
    switch (status) {
      case "AVAILABLE":
        return "idea-success";
      case "ISSUED":
        return "idea-info";
      case "UNDER_REPAIR":
        return "idea-warning";
      case "DAMAGED":
        return "idea-error";
      case "LOST":
      case "DISPOSED":
        return "bg-[var(--color-idea-light-grey)] text-[var(--color-idea-muted)] border border-[var(--color-idea-border)]";
    }
  };

  return (
    <div className="flex-1 space-y-8 p-8 overflow-y-auto max-w-7xl mx-auto w-full idea-bg">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <span className="text-[10px] font-medium tracking-[0.25em] uppercase text-[var(--color-idea-muted)]">
            PHYSICAL ASSET REGISTER
          </span>
          <h2 className="text-2xl font-bold text-[var(--color-idea-text)] tracking-tight mt-1">
            Tracked Equipment &amp;{" "}
            <span className="text-[var(--color-idea-blue)]">Box Batches</span>
          </h2>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="idea-button flex items-center gap-2 px-5 py-2.5 text-xs font-semibold cursor-pointer"
        >
          <Plus className="w-4 h-4" /> Register New Asset
        </button>
      </div>

      {/* Filter Toolbar */}
      <div className="idea-card p-4 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-1.5 bg-[var(--color-idea-light-grey)] p-1.5 rounded-2xl w-full md:w-auto overflow-x-auto">
          {(["ALL", "BOX", "INDIVIDUAL"] as const).map((m) => (
            <button
              key={m}
              onClick={() => setModeFilter(m)}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-xl transition-all cursor-pointer whitespace-nowrap ${
                modeFilter === m
                  ? "bg-white text-[var(--color-idea-blue)] shadow-sm"
                  : "text-[var(--color-idea-muted)] hover:text-[var(--color-idea-text)]"
              }`}
            >
              {m === "ALL"
                ? "All Modes"
                : m === "BOX"
                  ? "Box Batches"
                  : "Fixed Tools"}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative w-full md:w-72">
          <input
            type="text"
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            placeholder="Search code, serial, product..."
            className="idea-input pl-9 pr-4 py-2 text-xs"
          />
          <Search className="w-4 h-4 text-[var(--color-idea-muted)] absolute left-3 top-2.5" />
        </div>
      </div>

      {/* Asset Table Card */}
      <div className="idea-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="text-[10px] font-bold text-[var(--color-idea-muted)] uppercase tracking-[0.2em] border-b border-[var(--color-idea-border)] bg-[var(--color-idea-light-grey)]">
                <th className="px-6 py-3.5">Asset Code / Item Name</th>
                <th className="px-6 py-3.5">Tracking Mode</th>
                <th className="px-6 py-3.5">Box Stock / Serial</th>
                <th className="px-6 py-3.5">Condition</th>
                <th className="px-6 py-3.5">Current Storage / Assignee</th>
                <th className="px-6 py-3.5 text-right">QR Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-idea-border)]">
              {filteredAssets.map((asset) => {
                const cat = catalogItems.find(
                  (c) => c.id === asset.catalog_item_id,
                );
                const loc = locations.find((l) => l.id === asset.location_id);
                const user = users.find(
                  (u) => u.id === asset.assigned_to_user_id,
                );
                const isBox = asset.is_box || asset.tracking_mode === "BOX";

                return (
                  <tr
                    key={asset.id}
                    className="hover:bg-[var(--color-idea-light-grey)] transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div>
                        <p className="text-sm font-bold text-[var(--color-idea-text)]">
                          {cat?.name || "Asset"}
                        </p>
                        <p className="text-xs font-mono font-bold text-[var(--color-idea-blue)] mt-0.5">
                          {asset.asset_code}
                        </p>
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      {isBox ? (
                        <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-[var(--color-idea-blue)] text-white uppercase tracking-wider">
                          BOX BATCH
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold px-2.5 py-1 rounded-full border border-[var(--color-idea-border)] text-[var(--color-idea-text)] uppercase tracking-wider">
                          INDIVIDUAL
                        </span>
                      )}
                    </td>

                    <td className="px-6 py-4 text-xs font-mono font-semibold text-[var(--color-idea-text)]">
                      {isBox ? (
                        <span className="font-bold text-[var(--color-idea-text)]">
                          {asset.available_in_box ?? asset.box_capacity ?? 10} /{" "}
                          {asset.box_capacity ?? 15} Available
                        </span>
                      ) : (
                        <span>{asset.serial_number || "N/A"}</span>
                      )}
                    </td>

                    <td className="px-6 py-4">
                      <span
                        className={`text-[9px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider ${getStatusBadge(asset.status)}`}
                      >
                        {asset.status.replace("_", " ")}
                      </span>
                    </td>

                    <td className="px-6 py-4 text-xs font-medium text-[var(--color-idea-text)]">
                      {asset.status === "ISSUED" && !isBox ? (
                        <span className="text-[var(--color-idea-blue)] font-bold">
                          Issued to: {user?.name || "Student"}
                        </span>
                      ) : (
                        <span className="font-mono text-[var(--color-idea-muted)]">
                          {loc?.name || "Unassigned"}
                        </span>
                      )}
                    </td>

                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() =>
                          onOpenQRGenerator(
                            asset.asset_code,
                            cat?.name || asset.asset_code,
                            isBox
                              ? `Box Capacity: ${asset.box_capacity} Units`
                              : `SN: ${asset.serial_number || "N/A"}`,
                          )
                        }
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 idea-button rounded-lg text-xs font-semibold cursor-pointer"
                      >
                        <QrCode className="w-3.5 h-3.5" /> Label
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
        <div className="fixed inset-0 bg-[var(--color-idea-text)]/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-[var(--color-idea-border)] shadow-2xl rounded-2xl w-full max-w-md overflow-hidden p-6 space-y-4">
            <h3 className="font-bold text-[var(--color-idea-text)] text-lg border-b border-[var(--color-idea-border)] pb-2">
              Register Physical Asset / Box
            </h3>

            <form onSubmit={handleAddAssetSubmit} className="space-y-3">
              <div>
                <label className="text-[11px] font-medium uppercase text-[var(--color-idea-muted)] tracking-wider">
                  Catalog Item
                </label>
                <select
                  value={selectedCatalogId}
                  onChange={(e) => setSelectedCatalogId(e.target.value)}
                  className="idea-input mt-1 p-2.5 text-xs"
                  required
                >
                  {catalogItems
                    .filter((c) => c.type !== "CONSUMABLE")
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.type})
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] font-medium uppercase text-[var(--color-idea-muted)] tracking-wider">
                  Tracking Mode
                </label>
                <select
                  value={newTrackingMode}
                  onChange={(e) =>
                    setNewTrackingMode(e.target.value as AssetTrackingMode)
                  }
                  className="idea-input mt-1 p-2.5 text-xs"
                >
                  <option value="BOX">
                    BOX BATCH (Quantity taken/returned from box)
                  </option>
                  <option value="INDIVIDUAL">
                    INDIVIDUAL (Single asset assigned to 1 student)
                  </option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-medium uppercase text-[var(--color-idea-muted)] tracking-wider">
                  Unique Asset QR Code Identifier
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. BOX-ESP32-A1 or TOOL-SOLD-01"
                  value={newAssetCode}
                  onChange={(e) => setNewAssetCode(e.target.value)}
                  className="idea-input mt-1 p-2.5 text-xs font-mono uppercase"
                />
              </div>

              {newTrackingMode === "BOX" ? (
                <div>
                  <label className="text-[11px] font-medium uppercase text-[var(--color-idea-muted)] tracking-wider">
                    Total Box Capacity (Units)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={newBoxCapacity}
                    onChange={(e) => setNewBoxCapacity(Number(e.target.value))}
                    className="idea-input mt-1 p-2.5 text-xs font-mono"
                  />
                </div>
              ) : (
                <div>
                  <label className="text-[11px] font-medium uppercase text-[var(--color-idea-muted)] tracking-wider">
                    Serial Number (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="SN-XXXX-YYYY"
                    value={newSerialNum}
                    onChange={(e) => setNewSerialNum(e.target.value)}
                    className="idea-input mt-1 p-2.5 text-xs font-mono"
                  />
                </div>
              )}

              <div>
                <label className="text-[11px] font-medium uppercase text-[var(--color-idea-muted)] tracking-wider">
                  Initial Storage Location
                </label>
                <select
                  value={newLocationId}
                  onChange={(e) => setNewLocationId(e.target.value)}
                  className="idea-input mt-1 p-2.5 text-xs"
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
                <label className="text-[11px] font-medium uppercase text-[var(--color-idea-muted)] tracking-wider">
                  Inspection Notes
                </label>
                <input
                  type="text"
                  placeholder="e.g. Fresh batch sealed in box"
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
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
