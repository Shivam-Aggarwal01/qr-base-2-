import React, { useState } from "react";
import {
  Plus,
  ClipboardList,
  Check,
  X,
  QrCode,
  AlertTriangle,
} from "lucide-react";
import { Request, CatalogItem, User, RequestStatus } from "../types/inventory";
import { canApproveRequests } from "../services/authRoles";
import { updateDocument } from "../services/firebaseCollections";
import { InventoryStorage } from "../services/storage";
import confetti from "canvas-confetti";

interface RequestsViewProps {
  requests: Request[];
  catalogItems: CatalogItem[];
  users: User[];
  activeUser: User;
  onOpenNewRequest: () => void;
  onOpenQRGenerator: (code: string, title: string, subtitle?: string) => void;
  onRefreshData: () => void;
}

export const RequestsView: React.FC<RequestsViewProps> = ({
  requests,
  catalogItems,
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
  const [fulfillmentRemarks, setFulfillmentRemarks] = useState("");
  const [processingError, setProcessingError] = useState<string | null>(null);
  const canProcessRequests = canApproveRequests(activeUser?.role);
  const visibleRequests =
    activeUser?.role === "STUDENT"
      ? requests.filter((r) => r.user_id === activeUser.id)
      : requests;

  const getDefaultApprovalRemarks = (req: Request) => {
    const totalItems =
      req.items?.reduce((sum, item) => sum + (item.requested_qty || 0), 0) ?? 0;
    return `Issued ${totalItems} item${totalItems === 1 ? "" : "s"} from stock and approved for ${req.request_number}.`;
  };

  const openProcessRequest = (req: Request) => {
    setSelectedRequest(req);
    setFulfillmentRemarks(getDefaultApprovalRemarks(req));
  };

  const filteredRequests = visibleRequests.filter((r) => {
    if (statusFilter !== "ALL" && r.status !== statusFilter) return false;
    return true;
  });

  const handleFulfill = async (req: Request, newStatus: RequestStatus) => {
    setProcessingError(null);
    try {
      const finalRemark =
        fulfillmentRemarks.trim() || getDefaultApprovalRemarks(req);

      await updateDocument("requests", req.id, {
        status: newStatus,
        approved_by_user_id: activeUser.id,
        remarks: finalRemark,
        updated_at: new Date().toISOString(),
      });

      if (req.items && req.items.length > 0) {
        for (const item of req.items) {
          if (item.catalog_item_id && item.requested_qty) {
            if (newStatus === "COMPLETED") {
              InventoryStorage.adjustStock(
                item.catalog_item_id,
                "default-location-1",
                -Math.abs(item.requested_qty),
                "ISSUE",
                `Issued to requisition ${req.request_number}`,
              );
            } else if (
              newStatus === "CANCELLED" &&
              req.status === "COMPLETED"
            ) {
              InventoryStorage.adjustStock(
                item.catalog_item_id,
                "default-location-1",
                Math.abs(item.requested_qty),
                "RETURN",
                `Returned from requisition ${req.request_number}`,
              );
            }
          }
        }
      }

      if (newStatus === "COMPLETED") {
        confetti({ particleCount: 30, spread: 50 });
      }

      setSelectedRequest(null);
      setFulfillmentRemarks("");
      onRefreshData();
    } catch (error: any) {
      console.error("Failed to process request:", error);
      setProcessingError(
        error?.message ||
          "Failed to process requisition. Check your Firebase rules and permissions.",
      );
    }
  };

  const getStatusBadge = (status: RequestStatus) => {
    switch (status) {
      case "PENDING":
        return "idea-warning animate-pulse";
      case "COMPLETED":
        return "idea-success";
      case "CANCELLED":
        return "idea-error";
      default:
        return "bg-[var(--color-idea-light-grey)] text-[var(--color-idea-muted)] border border-[var(--color-idea-border)]";
    }
  };

  return (
    <div className="flex-1 space-y-8 p-8 overflow-y-auto max-w-7xl mx-auto w-full idea-bg">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <span className="text-[10px] font-medium tracking-[0.25em] uppercase text-[var(--color-idea-muted)]">
            REQUISITION DESK
          </span>
          <h2 className="text-2xl font-bold text-[var(--color-idea-text)] tracking-tight mt-1">
            Material &amp; Component{" "}
            <span className="text-[var(--color-idea-blue)]">Requisitions</span>
          </h2>
        </div>
        <button
          onClick={onOpenNewRequest}
          className="idea-button flex items-center gap-2 px-5 py-2.5 text-xs font-semibold cursor-pointer"
        >
          <Plus className="w-4 h-4" /> Raise Requisition Slip
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="idea-card p-4 flex items-center gap-2 overflow-x-auto">
        {(["ALL", "PENDING", "COMPLETED", "CANCELLED"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-4 py-2 text-xs font-semibold rounded-xl transition-all cursor-pointer ${
              statusFilter === s
                ? "bg-[var(--color-idea-blue)] text-white shadow-sm"
                : "text-[var(--color-idea-muted)] hover:text-[var(--color-idea-text)] hover:bg-[var(--color-idea-light-grey)]"
            }`}
          >
            {s === "ALL" ? "All Slips" : s}
          </button>
        ))}
      </div>

      {/* Requests List */}
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
                        {req.status}
                      </span>
                    </div>
                    <p className="text-xs font-medium text-[var(--color-idea-muted)] mt-0.5">
                      Requested by {student?.name || "Student"} (
                      {student?.user_code})
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
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
                      onClick={() => openProcessRequest(req)}
                      className="px-4 py-2 border border-[var(--color-idea-blue)] text-[var(--color-idea-blue)] hover:bg-[var(--color-idea-blue)] hover:text-white text-xs font-semibold rounded-xl transition-colors cursor-pointer"
                    >
                      Process Slip
                    </button>
                  )}
                </div>
              </div>

              {/* Purpose & Items */}
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
                    const cat = catalogItems.find(
                      (c) => c.id === item.catalog_item_id,
                    );
                    return (
                      <div
                        key={item.id}
                        className="p-3 idea-gradient-soft border border-[var(--color-idea-blue)]/20 rounded-xl flex items-center justify-between text-xs"
                      >
                        <span className="font-bold text-[var(--color-idea-text)]">
                          {cat?.name || "Item"}
                        </span>
                        <span className="font-mono font-bold text-[var(--color-idea-blue)]">
                          {item.requested_qty} {cat?.unit}
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

      {/* Process Request Modal */}
      {selectedRequest && (
        <div className="fixed inset-0 bg-[var(--color-idea-text)]/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-[var(--color-idea-border)] shadow-2xl rounded-2xl w-full max-w-md overflow-hidden p-6 space-y-4">
            <h3 className="font-bold text-[var(--color-idea-text)] text-lg border-b border-[var(--color-idea-border)] pb-2">
              Process Requisition Slip {selectedRequest.request_number}
            </h3>
            {processingError && (
              <div className="flex items-start gap-2 p-3 idea-error rounded-xl text-xs">
                <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{processingError}</span>
              </div>
            )}
            <p className="text-xs text-[var(--color-idea-muted)]">
              Requisitioner:{" "}
              <span className="font-bold text-[var(--color-idea-text)]">
                {users.find((u) => u.id === selectedRequest.user_id)?.name}
              </span>
            </p>

            <div className="space-y-2 max-h-40 overflow-y-auto">
              {selectedRequest.items?.map((item) => {
                const cat = catalogItems.find(
                  (c) => c.id === item.catalog_item_id,
                );
                return (
                  <div
                    key={item.id}
                    className="p-2.5 idea-gradient-soft border border-[var(--color-idea-blue)]/20 rounded-xl flex justify-between text-xs font-semibold"
                  >
                    <span>{cat?.name}</span>
                    <span className="text-[var(--color-idea-blue)] font-mono">
                      {item.requested_qty} {cat?.unit}
                    </span>
                  </div>
                );
              })}
            </div>

            <div>
              <label className="text-[11px] font-medium uppercase text-[var(--color-idea-muted)] tracking-wider">
                Issuance / Approval Remarks
              </label>
              <input
                type="text"
                value={fulfillmentRemarks}
                onChange={(e) => setFulfillmentRemarks(e.target.value)}
                placeholder="e.g. Issued 2 boxes from Cabinet A Bin 12"
                className="idea-input mt-1 p-2.5 text-xs"
              />
            </div>

            <div className="pt-2 flex gap-2">
              <button
                onClick={() => {
                  setSelectedRequest(null);
                  setFulfillmentRemarks("");
                  setProcessingError(null);
                }}
                className="py-2.5 px-4 border border-[var(--color-idea-border)] text-[var(--color-idea-text)] text-xs font-semibold rounded-xl hover:bg-[var(--color-idea-light-grey)] transition-colors cursor-pointer"
              >
                Close
              </button>
              <button
                onClick={() => handleFulfill(selectedRequest, "CANCELLED")}
                disabled={!!processingError}
                className="flex-1 py-2.5 idea-error rounded-xl text-xs font-bold uppercase transition-colors disabled:opacity-50 hover:opacity-80 cursor-pointer"
              >
                Reject
              </button>
              <button
                onClick={() => handleFulfill(selectedRequest, "COMPLETED")}
                disabled={!!processingError}
                className="flex-1 py-2.5 idea-button rounded-xl text-xs font-bold uppercase transition-colors disabled:opacity-50 cursor-pointer"
              >
                Approve &amp; Issue
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
