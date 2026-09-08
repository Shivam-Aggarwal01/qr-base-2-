import React, { useState } from "react";
import {
  X,
  Check,
  AlertTriangle,
  QrCode,
  UserCheck,
  Package,
  Layers,
  ArrowUpRight,
  ShieldCheck,
  CornerDownLeft,
} from "lucide-react";
import {
  Asset,
  CatalogItem,
  Location,
  Request,
  User,
  AssetStatus,
  StockLevel,
  InventoryTransaction,
  RequestLineDraft,
} from "../types/inventory";
import { InventoryStorage } from "../services/storage";
import {
  canApproveRequests,
  canIssueInventory,
  canReturnOrRepairItems,
  isStudent,
} from "../services/authRoles";
import {
  completeLabRequest,
  handoverLabRequest,
  reviewLabRequest,
} from "../services/requestWorkflow";
import confetti from "canvas-confetti";

interface QuickActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  qrData: {
    type: "asset" | "catalog" | "location" | "request" | "user" | "unknown";
    entity: any;
    rawCode: string;
  } | null;
  users: User[];
  locations: Location[];
  catalogItems: CatalogItem[];
  assets: Asset[];
  stockLevels: StockLevel[];
  requests: Request[];
  activeUser: User;
  onOpenNewRequest: (items: RequestLineDraft[]) => void;
  onRefreshData: () => void;
  onOpenQRGenerator: (code: string, title: string, subtitle?: string) => void;
}

export const QuickActionModal: React.FC<QuickActionModalProps> = ({
  isOpen,
  onClose,
  qrData,
  users,
  locations,
  catalogItems,
  assets,
  stockLevels,
  requests,
  activeUser,
  onOpenNewRequest,
  onRefreshData,
  onOpenQRGenerator,
}) => {
  const [subAction, setSubAction] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<string>("");
  const [selectedLoc, setSelectedLoc] = useState<string>("");
  const [qtyInput, setQtyInput] = useState<number>(1);
  const [remarksInput, setRemarksInput] = useState<string>("");
  const [statusInput, setStatusInput] = useState<AssetStatus>("DAMAGED");

  const role = activeUser?.role;
  const quickStatusOptions: AssetStatus[] = [
    "AVAILABLE",
    "UNDER_REPAIR",
    "DAMAGED",
    "LOST",
    "RETIRED",
  ];
  const canApprove = canApproveRequests(role);
  const canIssue = canIssueInventory(role);
  const canReturnOrRepair = canReturnOrRepairItems(role);
  const studentMode = isStudent(role);

  const myPendingRequestForAsset = (assetId: string): Request | null => {
      if (!activeUser || !isStudent(activeUser.role)) return null;
      return (
        requests.find(
          (r) =>
            r.user_id === activeUser.id &&
            (r.status === "PENDING" || r.status === "APPROVED") &&
            r.items?.some((it) => it.asset_id === assetId),
        ) ?? null
      );
    };

  const myPendingRequestForCatalogItem = (
    catalogItemId: string,
  ): Request | null => {
    if (!activeUser || !isStudent(activeUser.role)) return null;
    return (
      requests.find(
        (r) =>
          r.user_id === activeUser.id &&
          (r.status === "PENDING" || r.status === "APPROVED") &&
          r.items?.some((it) => it.catalog_item_id === catalogItemId),
      ) ?? null
    );
  };

  const openRequestForCatalogItem = (
    catalogItemId: string,
    requested_qty: number,
  ) => {
    onOpenNewRequest([
      { kind: "CATALOG", catalog_item_id: catalogItemId, requested_qty },
    ]);
    onClose();
  };

  const openRequestForAsset = (asset: Asset) => {
    onOpenNewRequest([
      {
        kind: "ASSET",
        asset_id: asset.id,
        catalog_item_id: asset.catalog_item_id,
        requested_qty: 1,
      },
    ]);
    onClose();
  };

  if (!isOpen || !qrData) return null;

  const triggerSuccess = () => {
    confetti({ particleCount: 35, spread: 50, origin: { y: 0.7 } });
    onRefreshData();
    setSubAction(null);
    onClose();
  };

  // 1. ASSET QUICK ACTIONS (Supports Box-based Reusables + Individual Standalone Tools)
  const renderAssetActions = (asset: Asset) => {
    const catalogItem = catalogItems.find(
      (c) =>
        c.id === asset.catalog_item_id || c.item_code === asset.catalog_item_id,
    );
    const assignedUser = users.find((u) => u.id === asset.assigned_to_user_id);
    const location = locations.find((l) => l.id === asset.location_id);

    // Student QR action: they can request the catalog item, but they cannot issue/return or change status.
    if (studentMode) {
      const existingRequest = myPendingRequestForAsset(asset.id);
      const requestBlockedByAssetStatus =
        asset.status === "LOST" ||
        asset.status === "RETIRED" ||
        asset.status === "ISSUED" ||
        asset.status === "DAMAGED" ||
        asset.status === "UNDER_REPAIR";

      return (
        <div className="space-y-6">
          <div className="border border-[#1A1A1A]/20 bg-[#F9F8F6] p-5 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-[#D4AF37]" />
            <div className="flex justify-between items-start gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono tracking-[0.2em] uppercase text-[#6C6863]">
                    INDIVIDUAL TRACKED ASSET
                  </span>
                </div>
                <h4 className="font-serif text-xl font-bold text-[#1A1A1A] mt-1 truncate">
                  {catalogItem?.name || asset.asset_code}
                </h4>
                <p className="text-xs font-mono text-[#D4AF37] font-semibold mt-0.5 break-words">
                  {asset.asset_code}
                </p>
                {asset.serial_number && (
                  <p className="text-[11px] text-[#6C6863] font-mono mt-0.5">
                    SERIAL: {asset.serial_number}
                  </p>
                )}
              </div>

              <div className="text-right shrink-0">
                <span
                  className={`text-[10px] px-3 py-1 font-bold uppercase tracking-widest border ${
                    asset.status === "AVAILABLE"
                      ? "border-emerald-700 bg-emerald-50 text-emerald-800"
                      : asset.status === "ISSUED"
                        ? "border-blue-700 bg-blue-50 text-blue-800"
                        : asset.status === "UNDER_REPAIR"
                          ? "border-amber-700 bg-amber-50 text-amber-800"
                          : "border-red-700 bg-red-50 text-red-800"
                  }`}
                >
                  {asset.status.replace("_", " ")}
                </span>
                <p className="text-xs text-[#6C6863] mt-2 font-medium">
                  {asset.assigned_to_user_id
                    ? `Assigned to: ${assignedUser?.name || "Student"}`
                    : `Location: ${location?.name || "Location not set"}`}
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            {existingRequest ? (
              <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 text-xs rounded-xl font-mono">
                Already requested in {existingRequest.request_number} (
                {existingRequest.status})
              </div>
            ) : requestBlockedByAssetStatus ? (
              <div className="p-3 bg-red-50 border border-red-200 text-red-800 text-xs rounded-xl font-mono">
                This asset cannot be issued right now ({asset.status}).
              </div>
            ) : (
              <div className="p-3 bg-white border border-[#1A1A1A]/10 text-xs rounded-xl">
                Request this specific asset and track approval in{" "}
                <span className="font-bold">Requests</span>. Quantity is not required.
              </div>
            )}

            <div className="flex gap-3 pt-1">
              <button
                type="button"
                disabled={!!existingRequest || requestBlockedByAssetStatus}
                onClick={() => openRequestForAsset(asset)}
                className="flex-1 py-2.5 bg-[#1A1A1A] hover:bg-[#D4AF37] text-white text-xs font-mono font-bold uppercase tracking-wider transition-colors cursor-pointer disabled:opacity-50 disabled:hover:bg-[#1A1A1A]"
              >
                {existingRequest ? "Request Submitted" : "Request This Asset"}
              </button>

              <button
                type="button"
                onClick={() =>
                  onOpenQRGenerator(
                    asset.asset_code,
                    catalogItem?.name || asset.asset_code,
                    `SN: ${asset.serial_number || "N/A"}`,
                  )
                }
                className="px-4 py-2.5 border border-[#1A1A1A] text-[#1A1A1A] hover:bg-[#D4AF37] hover:text-[#1A1A1A] text-xs font-mono font-bold uppercase tracking-wider transition-colors cursor-pointer"
              >
                Print Label
              </button>
            </div>
          </div>
        </div>
      );
    }

    const handleIssueSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (!selectedUser) return alert("Please select a student");
      InventoryStorage.issueAsset(
        asset.id,
        selectedUser,
        remarksInput,
      );
      triggerSuccess();
    };

    const handleReturnSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (!selectedLoc && !location?.id) {
        return alert("Please select a storage location");
      }
      InventoryStorage.returnAsset(
        asset.id,
        selectedLoc || location?.id || locations[0]?.id,
        remarksInput,
      );
      triggerSuccess();
    };

    const handleStatusSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      InventoryStorage.updateAssetStatus(
        asset.id,
        statusInput,
        selectedLoc || asset.location_id,
        remarksInput,
      );
      triggerSuccess();
    };

    return (
      <div className="space-y-6">
        {/* Editorial Asset Card */}
        <div className="border border-[#1A1A1A]/20 bg-[#F9F8F6] p-5 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-[#D4AF37]" />
          <div className="flex justify-between items-start">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono tracking-[0.2em] uppercase text-[#6C6863]">
                  INDIVIDUAL TRACKED ASSET
                </span>
              </div>
              <h4 className="font-serif text-xl font-bold text-[#1A1A1A] mt-1">
                {catalogItem?.name || asset.asset_code}
              </h4>
              <p className="text-xs font-mono text-[#D4AF37] font-semibold mt-0.5">
                {asset.asset_code}
              </p>
              {asset.serial_number && (
                <p className="text-[11px] text-[#6C6863] font-mono mt-0.5">
                  SERIAL: {asset.serial_number}
                </p>
              )}
            </div>
            <div className="text-right">
              <span
                className={`text-[10px] px-3 py-1 font-bold uppercase tracking-widest border ${
                  asset.status === "AVAILABLE"
                    ? "border-emerald-700 bg-emerald-50 text-emerald-800"
                    : asset.status === "ISSUED"
                      ? "border-blue-700 bg-blue-50 text-blue-800"
                      : asset.status === "UNDER_REPAIR"
                        ? "border-amber-700 bg-amber-50 text-amber-800"
                        : "border-red-700 bg-red-50 text-red-800"
                }`}
              >
                {asset.status.replace("_", " ")}
              </span>
              <p className="text-xs text-[#6C6863] mt-2 font-medium">
                {asset.status === "ISSUED"
                  ? `Assigned to: ${assignedUser?.name || "Student"}`
                  : `Location: ${location?.name || "Location not set"}`}
              </p>
            </div>
          </div>
        </div>

        <div className="border border-[#1A1A1A]/10 bg-white p-4 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#6C6863]">
              Quick Status
            </p>
            <span className="text-[9px] text-[#6C6863]">
              {asset.status.replace("_", " ")}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {quickStatusOptions.map((status) => {
              const selected = asset.status === status;
              const label = status.replace("_", " ");
              const isDanger = status === "DAMAGED" || status === "LOST" || status === "RETIRED";
              const isRepair = status === "UNDER_REPAIR";
              const isAvailable = status === "AVAILABLE";

              return (
                <button
                  key={status}
                  type="button"
                  onClick={() => {
                    setStatusInput(status);
                    setSubAction("status");
                  }}
                  className={`py-2 px-2 text-[10px] font-bold uppercase tracking-wider border rounded-lg transition-colors cursor-pointer ${
                    selected
                      ? isAvailable
                        ? "bg-emerald-600 text-white border-emerald-600"
                        : isRepair
                          ? "bg-amber-500 text-white border-amber-500"
                          : isDanger
                            ? "bg-red-600 text-white border-red-600"
                            : "bg-slate-900 text-white border-slate-900"
                      : "bg-[#F9F8F6] text-[#1A1A1A] border-[#1A1A1A]/10 hover:border-[#1A1A1A]"
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Sub Action Forms */}
        {subAction === "issue" && (
          <form
            onSubmit={handleIssueSubmit}
            className="space-y-4 bg-white p-5 border border-[#1A1A1A]"
          >
            <h5 className="font-serif text-sm font-bold text-[#1A1A1A] uppercase tracking-wider border-b border-[#1A1A1A]/10 pb-2">
              Issue Individual Asset to Student
            </h5>

            <div>
              <label className="text-[11px] font-mono uppercase text-[#6C6863] tracking-wider block mb-1">
                Select Student / Member
              </label>
              <select
                value={selectedUser}
                onChange={(e) => setSelectedUser(e.target.value)}
                className="w-full p-2.5 bg-[#F9F8F6] border border-[#1A1A1A] text-xs font-medium outline-none focus:border-[#D4AF37]"
                required
              >
                <option value="">-- Select Registered Student --</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.user_code} — {u.role})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[11px] font-mono uppercase text-[#6C6863] tracking-wider block mb-1">
                Project / Remarks
              </label>
              <input
                type="text"
                value={remarksInput}
                onChange={(e) => setRemarksInput(e.target.value)}
                placeholder="e.g. Embedded Systems Capstone Node"
                className="w-full p-2.5 bg-[#F9F8F6] border border-[#1A1A1A]/30 text-xs font-medium outline-none focus:border-[#D4AF37]"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setSubAction(null)}
                className="flex-1 py-2.5 border border-[#1A1A1A] text-[#1A1A1A] text-xs font-bold uppercase tracking-wider"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 py-2.5 bg-[#1A1A1A] text-white text-xs font-bold uppercase tracking-wider hover:bg-[#D4AF37] transition-colors"
              >
                Confirm Issue
              </button>
            </div>
          </form>
        )}

        {subAction === "return" && (
          <form
            onSubmit={handleReturnSubmit}
            className="space-y-4 bg-white p-5 border border-[#1A1A1A]"
          >
            <h5 className="font-serif text-sm font-bold text-[#1A1A1A] uppercase tracking-wider border-b border-[#1A1A1A]/10 pb-2">
              Return Asset to Lab Storage
            </h5>

            <div>
              <label className="text-[11px] font-mono uppercase text-[#6C6863] tracking-wider block mb-1">
                Storage Location / Cabinet Bin
              </label>
              <select
                value={selectedLoc}
                onChange={(e) => setSelectedLoc(e.target.value)}
                className="w-full p-2.5 bg-[#F9F8F6] border border-[#1A1A1A] text-xs font-medium outline-none focus:border-[#D4AF37]"
                required
              >
                <option value="">-- Select Return Storage --</option>
                {locations.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name} ({l.code})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[11px] font-mono uppercase text-[#6C6863] tracking-wider block mb-1">
                Inspection & Condition Remarks
              </label>
              <input
                type="text"
                value={remarksInput}
                onChange={(e) => setRemarksInput(e.target.value)}
                placeholder="e.g. Header pins straight, tested working"
                className="w-full p-2.5 bg-[#F9F8F6] border border-[#1A1A1A]/30 text-xs font-medium outline-none focus:border-[#D4AF37]"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setSubAction(null)}
                className="flex-1 py-2.5 border border-[#1A1A1A] text-[#1A1A1A] text-xs font-bold uppercase tracking-wider"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 py-2.5 bg-[#1A1A1A] text-white text-xs font-bold uppercase tracking-wider hover:bg-[#D4AF37] transition-colors"
              >
                Confirm Return
              </button>
            </div>
          </form>
        )}

        {subAction === "status" && (
          <form
            onSubmit={handleStatusSubmit}
            className="space-y-4 bg-white p-5 border border-[#1A1A1A]"
          >
            <h5 className="font-serif text-sm font-bold text-[#1A1A1A] uppercase tracking-wider border-b border-[#1A1A1A]/10 pb-2">
              Update Asset Condition / Status
            </h5>
            <div>
              <label className="text-[11px] font-mono uppercase text-[#6C6863] tracking-wider block mb-1">
                Condition Status
              </label>
              <select
                value={statusInput}
                onChange={(e) => setStatusInput(e.target.value as AssetStatus)}
                className="w-full p-2.5 bg-[#F9F8F6] border border-[#1A1A1A] text-xs font-medium outline-none"
              >
                <option value="AVAILABLE">AVAILABLE (Storage Ready)</option>
                <option value="UNDER_REPAIR">
                  UNDER REPAIR (Repair Bench)
                </option>
                <option value="DAMAGED">DAMAGED (Faulty)</option>
                <option value="LOST">LOST (Missing from Lab)</option>
                <option value="RETIRED">RETIRED (Retired from Service)</option>
              </select>
            </div>
            <div>
              <label className="text-[11px] font-mono uppercase text-[#6C6863] tracking-wider block mb-1">
                Location
              </label>
              <select
                value={selectedLoc}
                onChange={(e) => setSelectedLoc(e.target.value)}
                className="w-full p-2.5 bg-[#F9F8F6] border border-[#1A1A1A] text-xs font-medium outline-none"
              >
                <option value="">Keep Existing Location</option>
                {locations.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[11px] font-mono uppercase text-[#6C6863] tracking-wider block mb-1">
                Audit Notes / Repair Details
              </label>
              <input
                type="text"
                value={remarksInput}
                onChange={(e) => setRemarksInput(e.target.value)}
                placeholder="Describe fault or maintenance notes..."
                className="w-full p-2.5 bg-[#F9F8F6] border border-[#1A1A1A]/30 text-xs font-medium outline-none"
              />
            </div>
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setSubAction(null)}
                className="flex-1 py-2.5 border border-[#1A1A1A] text-[#1A1A1A] text-xs font-bold uppercase tracking-wider"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 py-2.5 bg-[#1A1A1A] text-white text-xs font-bold uppercase tracking-wider hover:bg-[#D4AF37] transition-colors"
              >
                Save Condition
              </button>
            </div>
          </form>
        )}

        {/* Primary Action Button Bar */}
        {!subAction && (
          <div className="grid grid-cols-2 gap-3">
            {asset.status === "AVAILABLE" && (
              <button
                onClick={() => {
                  setSubAction("issue");
                }}
                className="p-4 bg-[#1A1A1A] text-white flex items-center gap-3 font-bold text-xs uppercase tracking-wider hover:bg-[#D4AF37] transition-colors cursor-pointer"
              >
                <UserCheck className="w-5 h-5 text-[#D4AF37] shrink-0" />
                <div className="text-left">
                  <p>Issue to Student</p>
                  <p className="text-[10px] font-normal opacity-70 capitalize">
                    Assign loan record
                  </p>
                </div>
              </button>
            )}

            {asset.status === "ISSUED" && (
              <button
                onClick={() => {
                  setSubAction("return");
                }}
                className="p-4 bg-emerald-950 text-white flex items-center gap-3 font-bold text-xs uppercase tracking-wider hover:bg-emerald-900 transition-colors cursor-pointer"
              >
                <Check className="w-5 h-5 text-emerald-400 shrink-0" />
                <div className="text-left">
                  <p>Return Asset</p>
                  <p className="text-[10px] font-normal opacity-70 capitalize">
                    Return to storage bin
                  </p>
                </div>
              </button>
            )}

            <button
              onClick={() => setSubAction("status")}
              className="p-4 bg-[#EBE5DE] text-[#1A1A1A] flex items-center gap-3 font-bold text-xs uppercase tracking-wider hover:bg-[#1A1A1A] hover:text-white transition-colors cursor-pointer"
            >
              <AlertTriangle className="w-5 h-5 text-[#D4AF37] shrink-0" />
              <div className="text-left">
                <p>Update Condition</p>
                <p className="text-[10px] font-normal opacity-70 capitalize">
                  Repair / Damaged / Move
                </p>
              </div>
            </button>

            <button
              onClick={() =>
                onOpenQRGenerator(
                  asset.asset_code,
                  catalogItem?.name || asset.asset_code,
                  `SN: ${asset.serial_number || "N/A"}`,
                )
              }
              className="p-4 border border-[#1A1A1A] text-[#1A1A1A] flex items-center gap-3 font-bold text-xs uppercase tracking-wider hover:bg-[#D4AF37] hover:border-[#D4AF37] hover:text-white transition-colors cursor-pointer"
            >
              <QrCode className="w-5 h-5 shrink-0" />
              <div className="text-left">
                <p>Print Label</p>
                <p className="text-[10px] font-normal opacity-70 capitalize">
                  Generate QR sticker
                </p>
              </div>
            </button>
          </div>
        )}
      </div>
    );
  };

  // 2. CATALOG ITEM ACTIONS
  const renderCatalogActions = (cat: CatalogItem) => {
    const catStockLevels = stockLevels.filter(
      (s) =>
        s.catalog_item_id === cat.id || s.catalog_item_id === cat.item_code,
    );
    const totalQty = catStockLevels.reduce(
      (acc, curr) => acc + (curr.quantity || 0),
      0,
    );

    // Student QR action: request the catalog item, don't mutate stock.
    if (studentMode) {
      const existingRequest = myPendingRequestForCatalogItem(cat.id);
      const alreadyRequested = !!existingRequest;

      return (
        <div className="space-y-6">
          <div className="border border-[#1A1A1A]/20 bg-[#F9F8F6] p-5 flex justify-between items-start relative">
            <div className="absolute top-0 left-0 w-full h-1 bg-[#D4AF37]" />
            <div>
              <span className="text-[10px] font-mono tracking-[0.2em] uppercase text-[#6C6863]">
                CATALOG ITEM
              </span>
              <h4 className="font-serif text-xl font-bold text-[#1A1A1A] mt-1">
                {cat.name}
              </h4>
              <p className="text-xs font-mono text-[#D4AF37] font-semibold mt-0.5">
                {cat.item_code}
              </p>
              <p className="text-xs text-[#6C6863] mt-1.5">{cat.description}</p>
            </div>
            <div className="text-right">
              <span className="font-serif text-3xl font-bold text-[#1A1A1A]">
                {totalQty}
              </span>
              <span className="text-xs text-[#6C6863] font-mono font-bold ml-1">
                {cat.unit}
              </span>
              <p className="text-[10px] font-mono uppercase text-[#6C6863] tracking-widest mt-1">
                Available (by storage bins)
              </p>
            </div>
          </div>

          <div className="border border-[#1A1A1A]/10 p-4 bg-white space-y-2">
            <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#6C6863]">
              Storage Location Breakdown
            </p>
            {catStockLevels.length === 0 ? (
              <p className="text-xs text-[#6C6863] italic">
                No active stock assigned to bins.
              </p>
            ) : (
              catStockLevels.map((sl) => {
                const loc = locations.find((l) => l.id === sl.location_id);
                return (
                  <div
                    key={sl.id}
                    className="flex justify-between items-center text-xs py-1.5 border-b border-[#1A1A1A]/5 last:border-0"
                  >
                    <span className="font-medium text-[#1A1A1A]">
                      {loc?.name || "Storage Bin"}
                    </span>
                    <span className="font-mono font-bold text-[#1A1A1A]">
                      {sl.quantity} {cat.unit}
                    </span>
                  </div>
                );
              })
            )}
          </div>

          <div className="space-y-3">
            {alreadyRequested ? (
              <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 text-xs rounded-xl font-mono">
                Already requested in {existingRequest?.request_number} (
                {existingRequest?.status})
              </div>
            ) : (
              <div className="p-3 bg-white border border-[#1A1A1A]/10 text-xs rounded-xl">
                Request this item and track approval in{" "}
                <span className="font-bold">Requests</span>.
              </div>
            )}

            <div className="flex gap-3 pt-1">
              <button
                type="button"
                disabled={alreadyRequested}
                onClick={() => openRequestForCatalogItem(cat.id, 1)}
                className="flex-1 py-2.5 bg-[#1A1A1A] hover:bg-[#D4AF37] text-white text-xs font-mono font-bold uppercase tracking-wider transition-colors cursor-pointer disabled:opacity-50"
              >
                {alreadyRequested ? "Request Submitted" : "Request This Item"}
              </button>
              <button
                type="button"
                onClick={() =>
                  onOpenQRGenerator(
                    cat.item_code,
                    cat.name,
                    "Inventory Item",
                  )
                }
                className="px-4 py-2.5 border border-[#1A1A1A] text-[#1A1A1A] hover:bg-[#D4AF37] hover:text-[#1A1A1A] text-xs font-mono font-bold uppercase tracking-wider transition-colors cursor-pointer"
              >
                Print Label
              </button>
            </div>
          </div>
        </div>
      );
    }

    const handleStockSubmit = (type: "RECEIVE" | "ISSUE") => {
      if (!selectedLoc) return alert("Select storage bin");
      const delta = type === "RECEIVE" ? qtyInput : -qtyInput;
      InventoryStorage.adjustStock(
        cat.id,
        selectedLoc,
        delta,
        type,
        remarksInput || `Manual ${type} via scan`,
      );
      triggerSuccess();
    };

    return (
      <div className="space-y-6">
        <div className="border border-[#1A1A1A]/20 bg-[#F9F8F6] p-5 flex justify-between items-start relative">
          <div className="absolute top-0 left-0 w-full h-1 bg-[#D4AF37]" />
          <div>
            <span className="text-[10px] font-mono tracking-[0.2em] uppercase text-[#6C6863]">
              CATALOG ITEM
            </span>
            <h4 className="font-serif text-xl font-bold text-[#1A1A1A] mt-1">
              {cat.name}
            </h4>
            <p className="text-xs font-mono text-[#D4AF37] font-semibold mt-0.5">
              {cat.item_code}
            </p>
            <p className="text-xs text-[#6C6863] mt-1.5">{cat.description}</p>
          </div>
          <div className="text-right">
            <span className="font-serif text-3xl font-bold text-[#1A1A1A]">
              {totalQty}
            </span>
            <span className="text-xs text-[#6C6863] font-mono font-bold ml-1">
              {cat.unit}
            </span>
            <p className="text-[10px] font-mono uppercase text-[#6C6863] tracking-widest mt-1">
              Total Stock
            </p>
          </div>
        </div>

        {/* Stock Breakdown */}
        <div className="border border-[#1A1A1A]/10 p-4 bg-white space-y-2">
          <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#6C6863]">
            Storage Location Breakdown
          </p>
          {catStockLevels.length === 0 ? (
            <p className="text-xs text-[#6C6863] italic">
              No active stock assigned to bins.
            </p>
          ) : (
            catStockLevels.map((sl) => {
              const loc = locations.find((l) => l.id === sl.location_id);
              return (
                <div
                  key={sl.id}
                  className="flex justify-between items-center text-xs py-1.5 border-b border-[#1A1A1A]/5 last:border-0"
                >
                  <span className="font-medium text-[#1A1A1A]">
                    {loc?.name || "Storage Bin"}
                  </span>
                  <span className="font-mono font-bold text-[#1A1A1A]">
                    {sl.quantity} {cat.unit}
                  </span>
                </div>
              );
            })
          )}
        </div>

        {/* Quick Stock Adjustment */}
        <div className="border border-[#1A1A1A] p-5 bg-white space-y-3">
          <h5 className="font-serif text-sm font-bold text-[#1A1A1A] uppercase tracking-wider border-b border-[#1A1A1A]/10 pb-2">
            Quick Stock Update
          </h5>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-mono uppercase text-[#6C6863]">
                Storage Bin
              </label>
              <select
                value={selectedLoc}
                onChange={(e) => setSelectedLoc(e.target.value)}
                className="w-full mt-1 p-2.5 bg-[#F9F8F6] border border-[#1A1A1A] text-xs font-medium outline-none focus:border-[#D4AF37]"
              >
                <option value="">-- Choose Bin --</option>
                {locations.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[11px] font-mono uppercase text-[#6C6863]">
                Quantity ({cat.unit})
              </label>
              <input
                type="number"
                min="1"
                value={qtyInput}
                onChange={(e) => setQtyInput(Number(e.target.value))}
                className="w-full mt-1 p-2.5 bg-[#F9F8F6] border border-[#1A1A1A] font-mono text-xs font-bold outline-none"
              />
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button
              onClick={() => handleStockSubmit("RECEIVE")}
              className="flex-1 py-3 bg-[#1A1A1A] hover:bg-[#D4AF37] text-white font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer"
            >
              + Receive / Add
            </button>
            <button
              onClick={() => handleStockSubmit("ISSUE")}
              className="flex-1 py-3 border border-[#1A1A1A] hover:bg-[#1A1A1A] hover:text-white text-[#1A1A1A] font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer"
            >
              - Consume / Issue
            </button>
          </div>
        </div>
      </div>
    );
  };

  // 3. LOCATION ACTIONS
  const renderLocationActions = (loc: Location) => {
    const assetsInLoc = assets.filter((a) => a.location_id === loc.id);
    const stockInLoc = stockLevels.filter((s) => s.location_id === loc.id);

    // Student QR action: show item stock + request buttons. Students cannot mutate inventory.
    if (studentMode) {
      const itemsInLoc = stockInLoc
        .map((s) => {
          const cat = catalogItems.find(
            (c) =>
              c.id === s.catalog_item_id || c.item_code === s.catalog_item_id,
          );
          return { stock: s, catalogItem: cat };
        })
        .filter((x) => x.catalogItem) as { stock: StockLevel; catalogItem: CatalogItem }[];

      return (
        <div className="space-y-5">
          <div className="border border-[#1A1A1A]/20 bg-[#F9F8F6] p-5 flex justify-between items-start relative">
            <div className="absolute top-0 left-0 w-full h-1 bg-[#D4AF37]" />
            <div>
              <span className="text-[10px] font-mono tracking-[0.2em] uppercase text-[#6C6863]">
                STORAGE LOCATION
              </span>
              <h4 className="font-serif text-xl font-bold text-[#1A1A1A] mt-1">
                {loc.name}
              </h4>
              <p className="text-xs font-mono text-[#D4AF37] font-semibold mt-0.5">
                {loc.code || loc.id}
              </p>
            </div>
            <button
              onClick={() =>
                onOpenQRGenerator(
                  loc.code || loc.name,
                  loc.name,
                  "Storage Location",
                )
              }
              className="p-2.5 bg-[#1A1A1A] text-white text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-2 hover:bg-[#D4AF37] transition-colors cursor-pointer"
              type="button"
            >
              <QrCode className="w-4 h-4 text-[#D4AF37]" /> Print QR
            </button>
          </div>

          <div>
            <h5 className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#6C6863] mb-2">
              Items in Location ({itemsInLoc.length})
            </h5>
            <div className="max-h-52 overflow-y-auto space-y-2">
              {itemsInLoc.length === 0 ? (
                <p className="text-xs text-[#6C6863] italic">
                  No bulk stock in this location.
                </p>
              ) : (
                itemsInLoc.map(({ stock, catalogItem }) => {
                  const existing = myPendingRequestForCatalogItem(
                    catalogItem.id,
                  );
                  const alreadyRequested = !!existing;
                  return (
                    <div
                      key={stock.id}
                      className="p-3 bg-white border border-[#1A1A1A]/10 flex items-center justify-between text-xs gap-3"
                    >
                      <div className="min-w-0">
                        <p className="font-bold text-[#1A1A1A] truncate">
                          {catalogItem.name}
                        </p>
                        <p className="text-[10px] font-mono text-[#6C6863]">
                          {stock.quantity} {catalogItem.unit}
                        </p>
                      </div>
                      <button
                        type="button"
                        disabled={alreadyRequested}
                        onClick={() =>
                          openRequestForCatalogItem(catalogItem.id, 1)
                        }
                        className="shrink-0 px-3 py-2 bg-[#1A1A1A] text-white text-[10px] font-mono font-bold uppercase tracking-wider hover:bg-[#D4AF37] transition-colors cursor-pointer disabled:opacity-50"
                      >
                        {alreadyRequested ? "Requested" : "Request"}
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-5">
        <div className="border border-[#1A1A1A]/20 bg-[#F9F8F6] p-5 flex justify-between items-start relative">
          <div className="absolute top-0 left-0 w-full h-1 bg-[#D4AF37]" />
          <div>
            <span className="text-[10px] font-mono tracking-[0.2em] uppercase text-[#6C6863]">
              STORAGE LOCATION
            </span>
            <h4 className="font-serif text-xl font-bold text-[#1A1A1A] mt-1">
              {loc.name}
            </h4>
            <p className="text-xs font-mono text-[#D4AF37] font-semibold mt-0.5">
              {loc.code || loc.id}
            </p>
          </div>
          <button
            onClick={() =>
              onOpenQRGenerator(
                loc.code || loc.name,
                loc.name,
                "Storage Location",
              )
            }
            className="p-2.5 bg-[#1A1A1A] text-white text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-2 hover:bg-[#D4AF37] transition-colors"
            type="button"
          >
            <QrCode className="w-4 h-4 text-[#D4AF37]" /> Print QR
          </button>
        </div>

        <div>
          <h5 className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#6C6863] mb-2">
            Tracked Assets in Location ({assetsInLoc.length})
          </h5>
          <div className="max-h-40 overflow-y-auto space-y-2">
            {assetsInLoc.length === 0 ? (
              <p className="text-xs text-[#6C6863] italic">
                No assets stored in this location.
              </p>
            ) : (
              assetsInLoc.map((a) => {
                const cat = catalogItems.find(
                  (c) =>
                    c.id === a.catalog_item_id ||
                    c.item_code === a.catalog_item_id,
                );
                return (
                  <div
                    key={a.id}
                    className="p-3 bg-white border border-[#1A1A1A]/10 flex items-center justify-between text-xs"
                  >
                    <div>
                      <span className="font-bold text-[#1A1A1A]">
                        {cat?.name}
                      </span>
                      <span className="text-[#6C6863] font-mono ml-2">
                        ({a.asset_code})
                      </span>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 border border-emerald-700 bg-emerald-50 text-emerald-800 font-mono uppercase font-bold">
                      {a.status}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div>
          <h5 className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#6C6863] mb-2">
            Items in Stock
          </h5>
          <div className="max-h-40 overflow-y-auto space-y-2">
            {stockInLoc.length === 0 ? (
              <p className="text-xs text-[#6C6863] italic">
                No bulk stock in this location.
              </p>
            ) : (
              stockInLoc.map((s) => {
                const cat = catalogItems.find(
                  (c) =>
                    c.id === s.catalog_item_id ||
                    c.item_code === s.catalog_item_id,
                );
                return (
                  <div
                    key={s.id}
                    className="p-3 bg-white border border-[#1A1A1A]/10 flex items-center justify-between text-xs"
                  >
                    <span className="font-bold text-[#1A1A1A]">
                      {cat?.name}
                    </span>
                    <span className="font-mono font-bold text-[#D4AF37]">
                      {s.quantity} {cat?.unit}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    );
  };

  // 4. REQUEST ACTIONS
  const renderRequestActions = (req: Request) => {
    const student = users.find((u) => u.id === req.user_id);

    const handleReview = async (status: "APPROVED" | "REJECTED") => {
      const finalRemark =
        remarksInput.trim() ||
        (status === "APPROVED"
          ? "Approved. Inventory will change at handover."
          : "Request rejected.");
      await reviewLabRequest(req, status, activeUser, finalRemark);
      triggerSuccess();
    };

    const handleHandover = async () => {
      await handoverLabRequest(
        req,
        activeUser,
        remarksInput.trim() || `Handed over via scan for ${req.request_number}`,
      );
      triggerSuccess();
    };

    const handleComplete = async () => {
      await completeLabRequest(
        req,
        activeUser,
        remarksInput.trim() || `Completed ${req.request_number}`,
      );
      triggerSuccess();
    };

    return (
      <div className="space-y-5">
        <div className="border border-[#1A1A1A]/20 bg-[#F9F8F6] p-5 flex justify-between items-start relative">
          <div className="absolute top-0 left-0 w-full h-1 bg-[#D4AF37]" />
          <div>
            <span className="text-[10px] font-mono tracking-[0.2em] uppercase text-[#6C6863]">
              MATERIAL REQUISITION
            </span>
            <h4 className="font-serif text-xl font-bold text-[#1A1A1A] mt-1">
              {req.request_number}
            </h4>
            <p className="text-xs text-[#1A1A1A] font-bold mt-1">
              Requested by: {student?.name || "Student"}
            </p>
            <p className="text-xs text-[#6C6863] italic mt-0.5 font-serif">
              "{req.purpose}"
            </p>
          </div>
          <span
            className={`text-[10px] px-3 py-1 font-mono uppercase tracking-widest border ${
              req.status === "PENDING"
                ? "border-amber-700 bg-amber-50 text-amber-800 animate-pulse"
                : req.status === "APPROVED"
                  ? "border-blue-700 bg-blue-50 text-blue-800"
                  : req.status === "HANDED_OVER" || req.status === "COMPLETED"
                    ? "border-emerald-700 bg-emerald-50 text-emerald-800"
                    : "border-red-700 bg-red-50 text-red-800"
            }`}
          >
            {req.status}
          </span>
        </div>

        <div>
          <h5 className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#6C6863] mb-2">
            Requested Component Items
          </h5>
          <div className="space-y-2">
            {req.items?.map((item) => {
              const cat = catalogItems.find(
                (c) =>
                  c.id === item.catalog_item_id ||
                  c.item_code === item.catalog_item_id,
              );
              return (
                <div
                  key={item.id}
                  className="p-3 bg-white border border-[#1A1A1A]/10 flex items-center justify-between text-xs font-semibold"
                >
                  <span>{cat?.name || "Item"}</span>
                  <span className="font-mono text-[#D4AF37] font-bold">
                    {item.requested_qty} {cat?.unit}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {req.status === "PENDING" && canApprove && (
          <div className="space-y-3 pt-3 border-t border-[#1A1A1A]/10">
            <input
              type="text"
              value={remarksInput}
              onChange={(e) => setRemarksInput(e.target.value)}
              placeholder="Approval notes..."
              className="w-full p-2.5 bg-[#F9F8F6] border border-[#1A1A1A]/30 text-xs outline-none focus:border-[#D4AF37]"
            />
            <div className="flex gap-3">
              <button
                onClick={() => void handleReview("REJECTED")}
                className="flex-1 py-3 border border-red-800 text-red-800 hover:bg-red-800 hover:text-white text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer"
              >
                Reject
              </button>
              <button
                onClick={() => void handleReview("APPROVED")}
                className="flex-1 py-3 bg-[#1A1A1A] hover:bg-[#D4AF37] text-white text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer"
              >
                Approve
              </button>
            </div>
          </div>
        )}

        {req.status === "APPROVED" && canApprove && (
          <div className="space-y-3 pt-3 border-t border-[#1A1A1A]/10">
            <input
              type="text"
              value={remarksInput}
              onChange={(e) => setRemarksInput(e.target.value)}
              placeholder="Handover notes..."
              className="w-full p-2.5 bg-[#F9F8F6] border border-[#1A1A1A]/30 text-xs outline-none focus:border-[#D4AF37]"
            />
            <button
              onClick={() => void handleHandover()}
              className="w-full py-3 bg-[#1A1A1A] hover:bg-[#D4AF37] text-white text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer"
            >
              Hand Over
            </button>
          </div>
        )}

        {req.status === "HANDED_OVER" && canApprove && (
          <div className="space-y-3 pt-3 border-t border-[#1A1A1A]/10">
            <button
              onClick={() => void handleComplete()}
              className="w-full py-3 bg-[#1A1A1A] hover:bg-[#D4AF37] text-white text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer"
            >
              Complete
            </button>
          </div>
        )}

        {req.status === "PENDING" && !canApprove && (
          <div className="space-y-3 pt-3 border-t border-[#1A1A1A]/10">
            <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 text-xs rounded-xl font-mono">
              Waiting for staff to approve this request. Inventory will not change until handover.
            </div>
          </div>
        )}
      </div>
    );
  };

  // 5. USER ACTIONS
  const renderUserActions = (user: User) => {
    const userAssignments = InventoryStorage.getAssignments().filter(
      (a) => a.assigned_to_user_id === user.id && !a.returned_at,
    );

    if (studentMode) {
      return (
        <div className="space-y-5">
          <div className="border border-[#1A1A1A]/20 bg-[#F9F8F6] p-5 flex justify-between items-start relative">
            <div className="absolute top-0 left-0 w-full h-1 bg-[#D4AF37]" />
            <div>
              <span className="text-[10px] font-mono tracking-[0.2em] uppercase text-[#6C6863]">
                LAB MEMBER PROFILE
              </span>
              <h4 className="font-serif text-xl font-bold text-[#1A1A1A] mt-1">
                {user.name}
              </h4>
              <p className="text-xs font-mono text-[#6C6863] mt-0.5">
                {user.user_code} • {user.email}
              </p>
            </div>
            <span className="text-[10px] px-3 py-1 font-mono uppercase tracking-widest border border-[#1A1A1A] bg-[#1A1A1A] text-white">
              {user.role}
            </span>
          </div>

          <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 text-xs rounded-xl font-mono">
            Students cannot issue/return assets from a member QR code.
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-5">
        <div className="border border-[#1A1A1A]/20 bg-[#F9F8F6] p-5 flex justify-between items-start relative">
          <div className="absolute top-0 left-0 w-full h-1 bg-[#D4AF37]" />
          <div>
            <span className="text-[10px] font-mono tracking-[0.2em] uppercase text-[#6C6863]">
              LAB MEMBER PROFILE
            </span>
            <h4 className="font-serif text-xl font-bold text-[#1A1A1A] mt-1">
              {user.name}
            </h4>
            <p className="text-xs font-mono text-[#6C6863] mt-0.5">
              {user.user_code} • {user.email}
            </p>
          </div>
          <span className="text-[10px] px-3 py-1 font-mono uppercase tracking-widest border border-[#1A1A1A] bg-[#1A1A1A] text-white">
            {user.role}
          </span>
        </div>

        <div>
          <h5 className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#6C6863] mb-2">
            Active Loans Held ({userAssignments.length})
          </h5>
          <div className="space-y-2">
            {userAssignments.length === 0 ? (
              <p className="text-xs text-[#6C6863] italic">
                No active assets currently loaned to this member.
              </p>
            ) : (
              userAssignments.map((asg) => {
                const asset = InventoryStorage.getAssets().find(
                  (a) => a.id === asg.asset_id,
                );
                const cat = catalogItems.find(
                  (c) =>
                    c.id === asset?.catalog_item_id ||
                    c.item_code === asset?.catalog_item_id,
                );
                return (
                  <div
                    key={asg.id}
                    className="p-3 bg-white border border-[#1A1A1A]/10 flex items-center justify-between"
                  >
                    <div>
                      <p className="text-xs font-bold text-[#1A1A1A]">
                        {cat?.name}
                      </p>
                      <p className="text-[10px] font-mono text-[#D4AF37] font-semibold">
                        {asset?.asset_code}
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        const defaultLoc = locations[0]?.id;
                        if (asset && defaultLoc) {
                          InventoryStorage.returnAsset(
                            asset.id,
                            defaultLoc,
                            "Returned via student profile",
                          );
                          triggerSuccess();
                        }
                      }}
                      className="px-3 py-1 bg-[#1A1A1A] hover:bg-[#D4AF37] text-white text-[11px] font-mono font-bold uppercase tracking-wider transition-colors cursor-pointer"
                    >
                      Return
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-[#1A1A1A]/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-[#F9F8F6] border border-[#1A1A1A] shadow-2xl w-full max-w-lg overflow-hidden flex flex-col relative">
        {/* Editorial Top Border Accent */}
        <div className="h-1 bg-[#D4AF37] w-full" />

        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-[#1A1A1A]/10 flex items-center justify-between bg-white">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#1A1A1A] text-white">
              <QrCode className="w-4 h-4 text-[#D4AF37]" />
            </div>
            <div>
              <h3 className="font-serif font-bold text-[#1A1A1A] text-lg">
                QR Intelligence Inspect
              </h3>
              <p className="text-[10px] font-mono text-[#6C6863] tracking-widest uppercase">
                CODE: {qrData.rawCode}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-[#1A1A1A]/50 hover:text-[#1A1A1A] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6">
          {qrData.type === "asset" && renderAssetActions(qrData.entity)}
          {qrData.type === "catalog" && renderCatalogActions(qrData.entity)}
          {qrData.type === "location" && renderLocationActions(qrData.entity)}
          {qrData.type === "request" && renderRequestActions(qrData.entity)}
          {qrData.type === "user" && renderUserActions(qrData.entity)}
          {qrData.type === "unknown" && (
            <div className="text-center py-10 space-y-4">
              <AlertTriangle className="w-12 h-12 text-[#D4AF37] mx-auto" />
              <h4 className="font-serif font-bold text-xl text-[#1A1A1A]">
                Unrecognized QR Identifier
              </h4>
              <p className="text-xs text-[#6C6863] max-w-xs mx-auto">
                No matching asset, catalog item, location, request, or user
                record found for QR payload{" "}
                <span className="font-mono text-[#1A1A1A] font-bold">
                  {qrData.rawCode}
                </span>
                .
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
