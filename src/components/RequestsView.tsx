import React, { useState } from "react";
import {
  Plus,
  ClipboardList,
  QrCode,
  AlertTriangle,
} from "lucide-react";
import {
  Request,
  RequestItem,
  CatalogItem,
  User,
  RequestStatus,
  Asset,
  Location,
} from "../types/inventory";
import { canApproveRequests, isStudent } from "../services/authRoles";
import {
  completeLabRequest,
  getRequestLineKind,
  handoverLabRequest,
  reviewLabRequest,
} from "../services/requestWorkflow";
import confetti from "canvas-confetti";

interface RequestsViewProps {
  requests: Request[];
  catalogItems: CatalogItem[];
  assets: Asset[];
  locations: Location[];
  users: User[];
  activeUser: User;
  onOpenNewRequest: () => void;
  onOpenQRGenerator: (code: string, title: string, subtitle?: string) => void;
  onRefreshData: () => void;
}

const FILTERS: Array<RequestStatus | "ALL"> = [
  "ALL",
  "PENDING",
  "APPROVED",
  "REJECTED",
  "HANDED_OVER",
  "COMPLETED",
];

export const RequestsView: React.FC<RequestsViewProps> = ({
  requests,
  catalogItems,
  assets,
  locations,
  users,
  activeUser,
  onOpenNewRequest,
  onOpenQRGenerator,
  onRefreshData,
}) => {
  const [statusFilter, setStatusFilter] = useState<RequestStatus | "ALL">(
    "ALL",
  );
  const [selectedRequest, setSelectedRequest] = useState<Request | null>(null);
  const [modalMode, setModalMode] = useState<"review" | "handover" | "complete">(
    "review",
  );
  const [remarks, setRemarks] = useState("");
  const [returnLocationId, setReturnLocationId] = useState("");
  const [processingError, setProcessingError] = useState<string | null>(null);
  const canProcessRequests = canApproveRequests(activeUser?.role);
  const visibleRequests = isStudent(activeUser?.role)
    ? requests.filter((r) => r.user_id === activeUser.id)
    : requests;

  const openModal = (
    req: Request,
    mode: "review" | "handover" | "complete",
  ) => {
    setSelectedRequest(req);
    setModalMode(mode);
    setProcessingError(null);
    setReturnLocationId(locations[0]?.id || "");
    setRemarks(
      mode === "review"
        ? `Approved for ${req.request_number}. Inventory will change only after handover.`
        : mode === "handover"
          ? `Handed over items/assets for ${req.request_number}.`
          : `Completed ${req.request_number}.`,
    );
  };

  const filteredRequests = visibleRequests.filter((r) => {
    if (statusFilter === "ALL") return true;
    if (statusFilter === "REJECTED") {
      return r.status === "REJECTED" || r.status === "CANCELLED";
    }
    if (statusFilter === "COMPLETED") {
      return r.status === "COMPLETED";
    }
    return r.status === statusFilter;
  });

  const lineLabel = (item: RequestItem) => {
    const kind = getRequestLineKind(item);
    if (kind === "ASSET") {
      const asset = assets.find((entry) => entry.id === item.asset_id);
      const catalog = catalogItems.find(
        (entry) =>
          entry.id === item.catalog_item_id ||
          entry.id === asset?.catalog_item_id,
      );
      return {
        name: asset?.asset_code || catalog?.name || "Asset",
        detail: catalog?.name ? `Asset · ${catalog.name}` : "Asset",
      };
    }
    const catalog = catalogItems.find((entry) => entry.id === item.catalog_item_id);
    return {
      name: catalog?.name || "Item",
      detail: `${item.requested_qty} ${catalog?.unit || "pcs"} · ${item.usage === "REUSABLE" ? "Reusable" : "Consumable"}`,
    };
  };

  const closeModal = () => {
    setSelectedRequest(null);
    setRemarks("");
    setReturnLocationId("");
    setProcessingError(null);
  };

  const handleAction = async () => {
    if (!selectedRequest) return;
    setProcessingError(null);
    try {
      if (modalMode === "review") {
        await reviewLabRequest(
          selectedRequest,
          "APPROVED",
          activeUser,
          remarks.trim(),
        );
      } else if (modalMode === "handover") {
        await handoverLabRequest(selectedRequest, activeUser, remarks.trim());
        confetti({ particleCount: 30, spread: 50 });
      } else {
        await completeLabRequest(
          selectedRequest,
          activeUser,
          remarks.trim(),
          returnLocationId,
        );
      }
      closeModal();
      onRefreshData();
    } catch (error: any) {
      console.error("Failed to process request:", error);
      setProcessingError(
        error?.message ||
          "Failed to process requisition. Check your Firebase rules and permissions.",
      );
    }
  };

  const handleReject = async () => {
    if (!selectedRequest) return;
    setProcessingError(null);
    try {
      await reviewLabRequest(
        selectedRequest,
        "REJECTED",
        activeUser,
        remarks.trim() || "Request rejected.",
      );
      closeModal();
      onRefreshData();
    } catch (error: any) {
      setProcessingError(error?.message || "Failed to reject request.");
    }
  };

  const getStatusBadge = (status: RequestStatus) => {
    switch (status) {
      case "PENDING":
        return "idea-warning animate-pulse";
      case "APPROVED":
        return "idea-info";
      case "HANDED_OVER":
      case "COMPLETED":
        return "idea-success";
      case "REJECTED":
      case "CANCELLED":
        return "idea-error";
      default:
        return "bg-[var(--color-idea-light-grey)] text-[var(--color-idea-muted)] border border-[var(--color-idea-border)]";
    }
  };

  const statusLabel = (status: RequestStatus) => {
    if (status === "CANCELLED") return "REJECTED";
    if (status === "HANDED_OVER") return "HANDED OVER";
    return status.replace("_", " ");
  };

  return (
    <div className="flex-1 space-y-8 p-8 overflow-y-auto max-w-7xl mx-auto w-full idea-bg">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <span className="text-[10px] font-medium tracking-[0.25em] uppercase text-[var(--color-idea-muted)]">
            REQUISITION DESK
          </span>
          <h2 className="text-2xl font-bold text-[var(--color-idea-text)] tracking-tight mt-1">
            Material &amp; Asset{" "}
            <span className="text-[var(--color-idea-blue)]">Requests</span>
          </h2>
          <p className="text-xs text-[var(--color-idea-muted)] mt-1">
            Approve gives permission. Hand over is when inventory actually moves.
          </p>
        </div>
        <button
          onClick={onOpenNewRequest}
          className="idea-button flex items-center gap-2 px-5 py-2.5 text-xs font-semibold cursor-pointer"
        >
          <Plus className="w-4 h-4" /> Raise Requisition Slip
        </button>
      </div>

      <div className="idea-card p-4 flex items-center gap-2 overflow-x-auto">
        {FILTERS.map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-4 py-2 text-xs font-semibold rounded-xl transition-all cursor-pointer whitespace-nowrap ${
              statusFilter === s
                ? "bg-[var(--color-idea-blue)] text-white shadow-sm"
                : "text-[var(--color-idea-muted)] hover:text-[var(--color-idea-text)] hover:bg-[var(--color-idea-light-grey)]"
            }`}
          >
            {s === "ALL" ? "All Slips" : s.replace("_", " ")}
          </button>
        ))}
      </div>

      <div className="space-y-4">
        {filteredRequests.map((req) => {
          const student = users.find((u) => u.id === req.user_id);

          return (
            <div
              key={req.id}
              className="idea-card p-6 space-y-4 hover:border-[var(--color-idea-blue)]/40"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[var(--color-idea-border)]">
                <div className="flex items-center gap-4">
                  <div className="idea-logo-container">
                    <ClipboardList className="w-5 h-5 text-[var(--color-idea-blue)]" />
                  </div>
                  <div>
                    <div className="flex items-center gap-3">
                      <span className="font-mono font-bold text-[var(--color-idea-blue)] text-sm">
                        {req.request_number}
                      </span>
                      <span
                        className={`text-[9px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-widest ${getStatusBadge(req.status)}`}
                      >
                        {statusLabel(req.status)}
                      </span>
                    </div>
                    <p className="text-xs font-medium text-[var(--color-idea-muted)] mt-0.5">
                      Requested by {student?.name || "Student"} (
                      {student?.user_code})
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 flex-wrap">
                  <button
                    onClick={() =>
                      onOpenQRGenerator(
                        req.request_number,
                        `Requisition Slip ${req.request_number}`,
                        `Student: ${student?.name}`,
                      )
                    }
                    className="p-2 idea-button rounded-lg text-xs font-mono flex items-center gap-1.5 cursor-pointer"
                  >
                    <QrCode className="w-4 h-4" /> QR Slip
                  </button>
                  {req.status === "PENDING" && canProcessRequests && (
                    <button
                      onClick={() => openModal(req, "review")}
                      className="px-4 py-2 border border-[var(--color-idea-blue)] text-[var(--color-idea-blue)] hover:bg-[var(--color-idea-blue)] hover:text-white text-xs font-semibold rounded-xl transition-colors cursor-pointer"
                    >
                      Review
                    </button>
                  )}
                  {req.status === "APPROVED" && canProcessRequests && (
                    <button
                      onClick={() => openModal(req, "handover")}
                      className="px-4 py-2 idea-button text-xs font-semibold rounded-xl cursor-pointer"
                    >
                      Hand Over
                    </button>
                  )}
                  {req.status === "HANDED_OVER" && canProcessRequests && (
                    <button
                      onClick={() => openModal(req, "complete")}
                      className="px-4 py-2 border border-[var(--color-idea-green)] text-[#3d6b10] text-xs font-semibold rounded-xl cursor-pointer"
                    >
                      Accept Return
                    </button>
                  )}
                </div>
              </div>

              <div>
                <div className="mb-3">
                  <span className="text-[9px] font-medium uppercase tracking-[0.2em] text-[var(--color-idea-muted)] block">
                    Project Purpose
                  </span>
                  <p className="text-xs italic text-[var(--color-idea-text)] mt-0.5">
                    "{req.purpose}"
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 mt-3">
                  {req.items?.map((item) => {
                    const label = lineLabel(item);
                    const kind = getRequestLineKind(item);
                    return (
                      <div
                        key={item.id}
                        className="p-3 idea-gradient-soft border border-[var(--color-idea-blue)]/20 rounded-xl flex items-center justify-between text-xs"
                      >
                        <span className="font-bold text-[var(--color-idea-text)]">
                          {label.name}
                        </span>
                        <span className="font-mono font-bold text-[var(--color-idea-blue)]">
                          {kind === "ASSET" ? "1 asset" : label.detail}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {req.remarks && (
                <p className="text-xs text-[var(--color-idea-muted)] idea-info p-3 rounded-xl italic">
                  Note: {req.remarks}
                </p>
              )}
            </div>
          );
        })}
      </div>

      {selectedRequest && (
        <div className="fixed inset-0 bg-[var(--color-idea-text)]/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-[var(--color-idea-border)] shadow-2xl rounded-2xl w-full max-w-md overflow-hidden p-6 space-y-4">
            <h3 className="font-bold text-[var(--color-idea-text)] text-lg border-b border-[var(--color-idea-border)] pb-2">
              {modalMode === "review"
                ? "Approve or reject"
                : modalMode === "handover"
                  ? "Hand over"
                    : "Accept return"} {" "}
              {selectedRequest.request_number}
            </h3>
            {processingError && (
              <div className="flex items-start gap-2 p-3 idea-error rounded-xl text-xs">
                <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{processingError}</span>
              </div>
            )}
            <p className="text-xs text-[var(--color-idea-muted)]">
              {modalMode === "review"
                ? "Approval only gives permission. Inventory does not change yet."
                : modalMode === "handover"
                  ? "This records the physical handover and updates stock, asset status, and the ledger."
                    : "Confirm the student returned these items. Inventory will be restored and the request will be closed."}
            </p>

            <div className="space-y-2 max-h-40 overflow-y-auto">
              {selectedRequest.items?.map((item) => {
                const label = lineLabel(item);
                return (
                  <div
                    key={item.id}
                    className="p-2.5 idea-gradient-soft border border-[var(--color-idea-blue)]/20 rounded-xl flex justify-between text-xs font-semibold"
                  >
                    <span>{label.name}</span>
                    <span className="text-[var(--color-idea-blue)] font-mono">
                      {label.detail}
                    </span>
                  </div>
                );
              })}
            </div>

            <div>
              <label className="text-[11px] font-medium uppercase text-[var(--color-idea-muted)] tracking-wider">
                Remarks
              </label>
              <input
                type="text"
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                className="idea-input mt-1 p-2.5 text-xs"
              />
            </div>

            {modalMode === "complete" && (
              <div>
                <label className="text-[11px] font-medium uppercase text-[var(--color-idea-muted)] tracking-wider">
                  Return location
                </label>
                <select
                  value={returnLocationId}
                  onChange={(event) => setReturnLocationId(event.target.value)}
                  className="idea-input mt-1 p-2.5 text-xs"
                >
                  <option value="">Choose storage location</option>
                  {locations.map((location) => (
                    <option key={location.id} value={location.id}>
                      {location.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="pt-2 flex gap-2">
              <button
                onClick={closeModal}
                className="py-2.5 px-4 border border-[var(--color-idea-border)] text-[var(--color-idea-text)] text-xs font-semibold rounded-xl hover:bg-[var(--color-idea-light-grey)] transition-colors cursor-pointer"
              >
                Close
              </button>
              {modalMode === "review" && (
                <button
                  onClick={handleReject}
                  className="flex-1 py-2.5 idea-error rounded-xl text-xs font-bold uppercase cursor-pointer"
                >
                  Reject
                </button>
              )}
              <button
                onClick={handleAction}
                className="flex-1 py-2.5 idea-button rounded-xl text-xs font-bold uppercase cursor-pointer"
              >
                {modalMode === "review"
                  ? "Approve"
                  : modalMode === "handover"
                    ? "Hand Over"
                    : "Accept Return"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
