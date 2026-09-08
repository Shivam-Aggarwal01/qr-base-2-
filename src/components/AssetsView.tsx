import React, { useEffect, useState } from "react";
import { Plus, Search } from "lucide-react";
import {
  Asset,
  CatalogItem,
  Location,
  User,
  AssetStatus,
} from "../types/inventory";
import {
  COLLECTIONS,
  createAssetInFirestore,
  updateFirestoreDocument,
} from "../services/firebaseInventory";
import { InventoryStorage } from "../services/storage";

interface AssetsViewProps {
  assets: Asset[];
  catalogItems: CatalogItem[];
  locations: Location[];
  users: User[];
  onRefreshData: () => void;
}

export const AssetsView: React.FC<AssetsViewProps> = ({
  assets,
  catalogItems,
  locations,
  users,
  onRefreshData,
}) => {
  const [statusFilter, setStatusFilter] =
    useState<AssetStatus | "ALL">("ALL");

  const [searchFilter, setSearchFilter] = useState("");

  // Add Asset Modal
  const [showAddModal, setShowAddModal] = useState(false);

  const [selectedCatalogId, setSelectedCatalogId] = useState("");

  const [newLocationId, setNewLocationId] = useState(
    locations[0]?.id || ""
  );

  const [newNotes, setNewNotes] = useState("");
  const [newStorageLocation, setNewStorageLocation] = useState("");
  const [editingLocationId, setEditingLocationId] = useState<string | null>(null);
  const [locationDraft, setLocationDraft] = useState("");
  const [storageLocationDraft, setStorageLocationDraft] = useState("");

  useEffect(() => {
    const availableCatalogItems = catalogItems;

    if (availableCatalogItems.length === 0) {
      setSelectedCatalogId("");
      return;
    }

    const currentSelectionExists = availableCatalogItems.some(
      (c) => c.id === selectedCatalogId
    );

    if (!currentSelectionExists) {
      setSelectedCatalogId(availableCatalogItems[0].id);
    }
  }, [catalogItems, selectedCatalogId]);

  useEffect(() => {
    if (!newLocationId && locations.length > 0) {
      setNewLocationId(locations[0].id);
    }
  }, [locations, newLocationId]);

  const availableCatalogItems = catalogItems;

  const filteredAssets = assets.filter((asset) => {
    if (statusFilter !== "ALL" && asset.status !== statusFilter) {
      return false;
    }

    if (searchFilter) {
      const q = searchFilter.toLowerCase();

      const cat = catalogItems.find(
        (c) =>
          c.id === asset.catalog_item_id ||
          c.item_code === asset.catalog_item_id
      );

      if (
        !asset.asset_code.toLowerCase().includes(q) &&
        !asset.storage_location?.toLowerCase().includes(q) &&
        !cat?.name.toLowerCase().includes(q)
      ) {
        return false;
      }
    }

    return true;
  });

  // SINGLE, UNIFIED SUBMIT HANDLER WITH NULL PROTECTION
  const handleAddAssetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedCatalogId || !newLocationId) {
      return alert("Item, asset name, and storage location are required");
    }

    try {
      await createAssetInFirestore({
        asset_code: `ASSET-${Date.now()}`,
        catalog_item_id: selectedCatalogId,
        status: "AVAILABLE",
        location_id: newLocationId,
        storage_location: newStorageLocation.trim() || null,
        assigned_to_user_id: null,
        tracking_mode: "INDIVIDUAL",
        is_box: false,
        notes: newNotes ? newNotes : "",
      });

      setShowAddModal(false);
      setNewNotes("");
      setNewStorageLocation("");

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
      default:
        return "";
    }
  };

  const getStatusLabel = (status: AssetStatus | "ALL") => {
    if (status === "ALL") return "All Assets";
    return status === "LOST" ? "Missing" : status.replace("_", " ");
  };

  const handleAssetStatusChange = async (asset: Asset, nextStatus: AssetStatus) => {
    if (nextStatus === asset.status) return;

    if (asset.status === "ISSUED") {
      alert("This asset is currently issued to a student. Use the return flow to mark it available again.");
      return;
    }

    try {
      const fallbackLocation = asset.location_id || locations[0]?.id || null;
      await updateFirestoreDocument(COLLECTIONS.ASSETS, asset.id, {
        status: nextStatus,
        location_id:
          nextStatus === "AVAILABLE"
            ? fallbackLocation
            : nextStatus === "LOST" || nextStatus === "RETIRED"
              ? null
              : asset.location_id ?? null,
        assigned_to_user_id:
          nextStatus === "AVAILABLE" ||
          nextStatus === "DAMAGED" ||
          nextStatus === "UNDER_REPAIR"
            ? null
            : asset.assigned_to_user_id ?? null,
      });

      try {
        InventoryStorage.updateAssetStatus(
          asset.id,
          nextStatus,
          nextStatus === "AVAILABLE" ? fallbackLocation : asset.location_id,
          `Status updated in asset register`,
        );
      } catch (localStorageError) {
        console.warn("Could not update the legacy local asset cache:", localStorageError);
      }

      onRefreshData();
    } catch (error) {
      console.error("Failed to update asset status:", error);
      alert(
        error instanceof Error
          ? error.message
          : "This asset cannot be marked in that status right now.",
      );
    }
  };

  const startLocationEdit = (asset: Asset) => {
    setEditingLocationId(asset.id);
    setLocationDraft(asset.location_id || locations[0]?.id || "");
    setStorageLocationDraft(asset.storage_location || "");
  };

  const saveLocation = async (asset: Asset) => {
    try {
      InventoryStorage.updateAssetLocation(
        asset.id,
        locationDraft,
        storageLocationDraft,
      );
      await updateFirestoreDocument(COLLECTIONS.ASSETS, asset.id, {
        location_id: locationDraft,
        storage_location: storageLocationDraft.trim() || null,
      });
      setEditingLocationId(null);
      onRefreshData();
    } catch (error) {
      console.error("Failed to update asset location:", error);
      alert(error instanceof Error ? error.message : "Could not update asset location.");
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
            Tracked Equipment
            <span className="text-[var(--color-idea-blue)]"> Register</span>
          </h2>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="idea-button flex items-center gap-2 px-5 py-2.5 text-xs font-semibold cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Register New Asset
        </button>
      </div>

      {/* Filter Toolbar */}
      <div className="idea-card p-4 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-1.5 bg-[var(--color-idea-light-grey)] p-1.5 rounded-2xl w-full md:w-auto overflow-x-auto">
          {(["ALL", "AVAILABLE", "ISSUED", "UNDER_REPAIR", "DAMAGED", "LOST"] as const).map((m) => (
            <button
              key={m}
              onClick={() => setStatusFilter(m)}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-xl transition-all cursor-pointer whitespace-nowrap ${
                statusFilter === m
                  ? "bg-white text-[var(--color-idea-blue)] shadow-sm"
                  : "text-[var(--color-idea-muted)] hover:text-[var(--color-idea-text)]"
              }`}
            >
              {getStatusLabel(m)}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative w-full md:w-72">
          <input
            type="text"
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            placeholder="Search asset name or storage..."
            className="idea-input pl-9 pr-4 py-2 text-xs"
          />
          <Search className="w-4 h-4 text-[var(--color-idea-muted)] absolute left-3 top-2.5" />
        </div>
      </div>

      {/* Asset Table */}
      <div className="idea-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="text-[10px] font-bold text-[var(--color-idea-muted)] uppercase tracking-[0.2em] border-b border-[var(--color-idea-border)] bg-[var(--color-idea-light-grey)]">
                <th className="px-6 py-3.5">Asset Name</th>
                <th className="px-6 py-3.5">Condition</th>
                <th className="px-6 py-3.5">Location</th>
                <th className="px-6 py-3.5">Assigned To</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-idea-border)]">
              {filteredAssets.map((asset) => {
                const cat = catalogItems.find(
                  (c) => c.id === asset.catalog_item_id
                );
                const loc = locations.find(
                  (l) => l.id === asset.location_id
                );
                const user = users.find(
                  (u) => u.id === asset.assigned_to_user_id
                );
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
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-2">
                        <span
                          className={`text-[9px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider ${getStatusBadge(
                            asset.status
                          )}`}
                        >
                          {getStatusLabel(asset.status)}
                        </span>
                        {asset.status === "ISSUED" ? (
                          <div className="w-full mt-1 rounded-lg border border-blue-200 bg-blue-50 px-2 py-1.5 text-[10px] font-semibold text-blue-700">
                            Auto: Issued to student
                          </div>
                        ) : (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {(["AVAILABLE", "UNDER_REPAIR", "DAMAGED", "LOST"] as const).map(
                              (status) => (
                                <button
                                  key={status}
                                  type="button"
                                  onClick={() => void handleAssetStatusChange(asset, status)}
                                  className={`rounded-lg border px-2 py-1 text-[9px] font-bold transition-colors ${
                                    asset.status === status
                                      ? "border-[var(--color-idea-blue)] bg-blue-50 text-[var(--color-idea-blue)]"
                                      : "border-[var(--color-idea-border)] bg-white text-[var(--color-idea-muted)] hover:text-[var(--color-idea-text)]"
                                  }`}
                                  aria-label={`Mark ${asset.asset_code} ${status.replace("_", " ").toLowerCase()}`}
                                >
                                  {status === "AVAILABLE"
                                    ? "Available"
                                    : status === "UNDER_REPAIR"
                                      ? "Repair"
                                      : status === "DAMAGED"
                                        ? "Damaged"
                                        : "Missing"}
                                </button>
                              ),
                            )}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-xs font-medium text-[var(--color-idea-text)]">
                      <div className="space-y-1">
                        {editingLocationId === asset.id ? (
                          <div className="space-y-1.5 min-w-56">
                            <select
                              value={locationDraft}
                              onChange={(e) => setLocationDraft(e.target.value)}
                              className="w-full rounded-lg border border-[var(--color-idea-border)] bg-white px-2 py-1 text-[10px]"
                            >
                              {locations.map((location) => (
                                <option key={location.id} value={location.id}>
                                  {location.name}
                                </option>
                              ))}
                            </select>
                            <input
                              value={storageLocationDraft}
                              onChange={(e) => setStorageLocationDraft(e.target.value)}
                              placeholder="Room / cupboard / row / container"
                              className="w-full rounded-lg border border-[var(--color-idea-border)] px-2 py-1 text-[10px]"
                            />
                            <div className="flex gap-1">
                              <button type="button" onClick={() => void saveLocation(asset)} className="rounded-lg bg-[var(--color-idea-blue)] px-2 py-1 text-[9px] font-bold text-white">Save</button>
                              <button type="button" onClick={() => setEditingLocationId(null)} className="rounded-lg border border-[var(--color-idea-border)] px-2 py-1 text-[9px] font-bold">Cancel</button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="font-mono text-[var(--color-idea-muted)]">
                              {loc?.name || "Location not set"}
                            </div>
                            <div className="text-[10px] text-[var(--color-idea-muted)]">
                              {asset.storage_location || "Detailed storage path not set"}
                            </div>
                            {!["ISSUED", "LOST", "RETIRED"].includes(asset.status) && (
                              <button type="button" onClick={() => startLocationEdit(asset)} className="text-[10px] font-bold text-[var(--color-idea-blue)] hover:underline">
                                Edit storage location
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-xs font-medium">
                      <div
                        className={
                          asset.assigned_to_user_id
                            ? "text-[var(--color-idea-blue)] font-bold"
                            : asset.status === "AVAILABLE"
                              ? "text-emerald-700 font-bold"
                              : "text-[var(--color-idea-muted)] font-semibold"
                        }
                      >
                        {asset.assigned_to_user_id
                          ? user?.name || "Student"
                          : asset.status === "AVAILABLE"
                            ? "Available for issue"
                            : `Status: ${getStatusLabel(asset.status)}`}
                      </div>
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
              Register Physical Asset
            </h3>

            <form onSubmit={handleAddAssetSubmit} className="space-y-3">
              <div>
                <label className="text-[11px] font-medium uppercase text-[var(--color-idea-muted)] tracking-wider">
                  Catalog Item
                </label>
                <select
                  value={selectedCatalogId}
                  onChange={(e) => setSelectedCatalogId(e.target.value)}
                  className="idea-input mt-1 p-2.5 text-xs w-full"
                  required
                >
                  <option value="" disabled>
                    {catalogItems.length === 0
                      ? "Loading catalog items..."
                      : availableCatalogItems.length === 0
                      ? "No catalog items available"
                      : "Select catalog item"}
                  </option>
                  {availableCatalogItems.map((c) => (
                    <option key={c.id} value={c.id}>
                                  {c.name} ({c.item_code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] font-medium uppercase text-[var(--color-idea-muted)] tracking-wider">
                  Asset Status
                </label>
                <div className="mt-1 rounded-xl border border-[var(--color-idea-border)] bg-[var(--color-idea-light-grey)] px-3 py-2 text-xs font-semibold text-[var(--color-idea-text)]">
                  Available
                </div>
              </div>

              <div>
                <label className="text-[11px] font-medium uppercase text-[var(--color-idea-muted)] tracking-wider">
                  Initial Storage Location
                </label>
                <select
                  value={newLocationId}
                  onChange={(e) => setNewLocationId(e.target.value)}
                  className="idea-input mt-1 p-2.5 text-xs w-full"
                  required
                >
                  <option value="" disabled>
                    {locations.length === 0
                      ? "Loading locations..."
                      : "Select storage location"}
                  </option>
                  {locations.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] font-medium uppercase text-[var(--color-idea-muted)] tracking-wider">
                  Detailed Storage Path (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Room 2 / Cupboard B / Row 3 / Container 4"
                  value={newStorageLocation}
                  onChange={(e) => setNewStorageLocation(e.target.value)}
                  className="idea-input mt-1 p-2.5 text-xs w-full"
                />
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
                  className="idea-input mt-1 p-2.5 text-xs w-full"
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
                  disabled={
                    !selectedCatalogId || availableCatalogItems.length === 0
                  }
                  className="flex-1 py-2.5 idea-button text-xs font-semibold rounded-xl cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
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