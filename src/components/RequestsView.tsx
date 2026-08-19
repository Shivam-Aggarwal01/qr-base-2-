import React, { useState } from 'react';
import { Plus, ClipboardList, Check, X, QrCode, AlertTriangle } from 'lucide-react';
import { Request, CatalogItem, User, RequestStatus } from '../types/inventory';
import { canApproveRequests } from '../services/authRoles';
import { updateDocument } from '../services/firebaseCollections';
import { InventoryStorage } from '../services/storage';
import confetti from 'canvas-confetti';

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
  onRefreshData
}) => {
  const [statusFilter, setStatusFilter] = useState<RequestStatus | 'ALL'>('ALL');
  const [selectedRequest, setSelectedRequest] = useState<Request | null>(null);
  const [fulfillmentRemarks, setFulfillmentRemarks] = useState('');
  const [processingError, setProcessingError] = useState<string | null>(null);
  const canProcessRequests = canApproveRequests(activeUser?.role);
  const visibleRequests = activeUser?.role === 'STUDENT'
    ? requests.filter((r) => r.user_id === activeUser.id)
    : requests;

  const getDefaultApprovalRemarks = (req: Request) => {
    const totalItems = req.items?.reduce((sum, item) => sum + (item.requested_qty || 0), 0) ?? 0;
    return `Issued ${totalItems} item${totalItems === 1 ? '' : 's'} from stock and approved for ${req.request_number}.`;
  };

  const openProcessRequest = (req: Request) => {
    setSelectedRequest(req);
    setFulfillmentRemarks(getDefaultApprovalRemarks(req));
  };

  const filteredRequests = visibleRequests.filter((r) => {
    if (statusFilter !== 'ALL' && r.status !== statusFilter) return false;
    return true;
  });

  const handleFulfill = async (req: Request, newStatus: RequestStatus) => {
    setProcessingError(null);
    try {
      const finalRemark = fulfillmentRemarks.trim() || getDefaultApprovalRemarks(req);

      console.log(`🔄 Approving request ${req.request_number} -> ${newStatus}`);

      await updateDocument('requests', req.id, {
        status: newStatus,
        approved_by_user_id: activeUser.id,
        remarks: finalRemark,
        updated_at: new Date().toISOString()
      });

      // Handle stock adjustments AFTER request is updated
      if (req.items && req.items.length > 0) {
        for (const item of req.items) {
          if (item.catalog_item_id && item.requested_qty) {
            if (newStatus === 'COMPLETED') {
              // Deduct stock when approved
              console.log(`📉 Deducting ${item.requested_qty} units from ${item.catalog_item_id}`);
              InventoryStorage.adjustStock(
                item.catalog_item_id,
                'default-location-1',
                -Math.abs(item.requested_qty),
                'ISSUE',
                `Issued to requisition ${req.request_number}`
              );
            } else if (newStatus === 'CANCELLED' && req.status === 'COMPLETED') {
              // Add stock back if returning a previously approved request
              console.log(`📈 Returning ${item.requested_qty} units to ${item.catalog_item_id}`);
              InventoryStorage.adjustStock(
                item.catalog_item_id,
                'default-location-1',
                Math.abs(item.requested_qty),
                'RETURN',
                `Returned from requisition ${req.request_number}`
              );
            }
          }
        }
      }

      if (newStatus === 'COMPLETED') {
        confetti({ particleCount: 30, spread: 50 });
        console.log('✅ Request approved and stock adjusted');
      }

      // Close modal first
      setSelectedRequest(null);
      setFulfillmentRemarks('');

      // Then refresh data immediately (no timeout - synchronous)
      console.log('🔄 Refreshing inventory...');
      onRefreshData();

    } catch (error: any) {
      console.error('Failed to process request:', error);
      setProcessingError(
        error?.message || 'Failed to process requisition. Check your Firebase rules and permissions.'
      );
    }
  };

  const getStatusBadge = (status: RequestStatus) => {
    switch (status) {
      case 'PENDING':
        return 'border-amber-700 bg-amber-50 text-amber-800 animate-pulse';
      case 'COMPLETED':
        return 'border-emerald-700 bg-emerald-50 text-emerald-800';
      case 'CANCELLED':
        return 'border-red-700 bg-red-50 text-red-800';
      default:
        return 'border-[#1A1A1A]/30 bg-[#EBE5DE] text-[#1A1A1A]';
    }
  };

  return (
    <div className="flex-1 space-y-8 p-8 overflow-y-auto max-w-7xl mx-auto w-full paper-texture">
      {/* Header */}
      <div className="border-b border-[#1A1A1A]/15 pb-4 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <span className="text-[10px] font-mono tracking-[0.25em] uppercase text-[#6C6863]">REQUISITION DESK</span>
          <h2 className="font-serif text-3xl font-bold text-[#1A1A1A] mt-0.5">
            Material & Component <span className="font-serif italic font-normal text-[#D4AF37]">Requisitions</span>
          </h2>
        </div>
        <button
          onClick={onOpenNewRequest}
          className="flex items-center gap-2 bg-[#1A1A1A] hover:bg-[#D4AF37] text-white px-5 py-2.5 text-xs font-mono font-bold uppercase tracking-widest transition-colors cursor-pointer border border-[#1A1A1A]"
        >
          <Plus className="w-4 h-4 text-[#D4AF37]" /> Raise Requisition Slip
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="bg-white p-5 border border-[#1A1A1A]/20 shadow-sm flex items-center gap-2 overflow-x-auto">
        {(['ALL', 'PENDING', 'COMPLETED', 'CANCELLED'] as const).map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-4 py-2 text-xs font-mono font-bold uppercase tracking-wider transition-all cursor-pointer ${
              statusFilter === s ? 'bg-[#1A1A1A] text-white' : 'text-[#6C6863] hover:text-[#1A1A1A]'
            }`}
          >
            {s === 'ALL' ? 'All Slips' : s}
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
              className="bg-white border border-[#1A1A1A]/20 shadow-sm p-6 space-y-4 hover:border-[#D4AF37] transition-all relative"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#1A1A1A]/10">
                <div className="flex items-center gap-4">
                  <div className="p-2.5 bg-[#1A1A1A] text-[#D4AF37]">
                    <ClipboardList className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-3">
                      <span className="font-mono font-bold text-[#D4AF37] text-sm">{req.request_number}</span>
                      <span
                        className={`text-[9px] px-2.5 py-0.5 border font-mono font-bold uppercase tracking-widest ${getStatusBadge(
                          req.status
                        )}`}
                      >
                        {req.status}
                      </span>
                    </div>
                    <p className="text-xs font-serif font-bold text-[#1A1A1A] mt-0.5">
                      Requested by {student?.name || 'Student'} ({student?.user_code})
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={() =>
                      onOpenQRGenerator(
                        req.request_number,
                        `Requisition Slip ${req.request_number}`,
                        `Student: ${student?.name}`
                      )
                    }
                    className="p-2 bg-[#1A1A1A] text-white text-xs font-mono uppercase tracking-wider flex items-center gap-1.5 hover:bg-[#D4AF37] transition-colors cursor-pointer"
                  >
                    <QrCode className="w-4 h-4 text-[#D4AF37]" /> QR Slip
                  </button>
                  {req.status === 'PENDING' && canProcessRequests && (
                    <button
                      onClick={() => openProcessRequest(req)}
                      className="px-4 py-2 bg-[#1A1A1A] text-[#D4AF37] border border-[#D4AF37] hover:bg-[#D4AF37] hover:text-[#1A1A1A] text-xs font-mono font-bold uppercase tracking-wider transition-colors cursor-pointer"
                    >
                      Process Slip
                    </button>
                  )}
                </div>
              </div>

              {/* Purpose & Items */}
              <div>
                <div className="mb-3">
                  <span className="text-[9px] font-mono uppercase tracking-[0.2em] text-[#6C6863] block">Project Purpose</span>
                  <p className="text-xs font-serif italic text-[#1A1A1A] mt-0.5">"{req.purpose}"</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 mt-3">
                  {req.items?.map((item) => {
                    const cat = catalogItems.find((c) => c.id === item.catalog_item_id);
                    return (
                      <div
                        key={item.id}
                        className="p-3 bg-[#F9F8F6] border border-[#1A1A1A]/10 flex items-center justify-between text-xs"
                      >
                        <span className="font-bold font-serif text-[#1A1A1A]">{cat?.name || 'Item'}</span>
                        <span className="font-mono font-bold text-[#D4AF37]">
                          {item.requested_qty} {cat?.unit}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {req.remarks && (
                <p className="text-xs text-[#6C6863] bg-[#F9F8F6] p-3 border border-[#1A1A1A]/10 font-serif italic">
                  Note: {req.remarks}
                </p>
              )}
            </div>
          );
        })}
      </div>

      {/* Process Request Modal */}
      {selectedRequest && (
        <div className="fixed inset-0 bg-[#1A1A1A]/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#F9F8F6] border border-[#1A1A1A] shadow-2xl w-full max-w-md overflow-hidden p-6 space-y-4">
            <h3 className="font-serif font-bold text-[#1A1A1A] text-lg border-b border-[#1A1A1A]/15 pb-2">
              Process Requisition Slip {selectedRequest.request_number}
            </h3>
            {processingError && (
              <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 text-red-800 text-xs">
                <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{processingError}</span>
              </div>
            )}
            <p className="text-xs text-[#6C6863]">
              Requisitioner: <span className="font-bold text-[#1A1A1A] font-serif">{users.find((u) => u.id === selectedRequest.user_id)?.name}</span>
            </p>

            <div className="space-y-2 max-h-40 overflow-y-auto">
              {selectedRequest.items?.map((item) => {
                const cat = catalogItems.find((c) => c.id === item.catalog_item_id);
                return (
                  <div key={item.id} className="p-2.5 bg-white border border-[#1A1A1A]/10 flex justify-between text-xs font-semibold">
                    <span>{cat?.name}</span>
                    <span className="text-[#D4AF37] font-mono">{item.requested_qty} {cat?.unit}</span>
                  </div>
                );
              })}
            </div>

            <div>
              <label className="text-[11px] font-mono uppercase text-[#6C6863]">Issuance / Approval Remarks</label>
              <input
                type="text"
                value={fulfillmentRemarks}
                onChange={(e) => setFulfillmentRemarks(e.target.value)}
                placeholder="e.g. Issued 2 boxes from Cabinet A Bin 12"
                className="w-full mt-1 p-2.5 bg-white border border-[#1A1A1A]/30 text-xs outline-none"
              />
            </div>

            <div className="pt-2 flex gap-2">
              <button
                onClick={() => {
                  setSelectedRequest(null);
                  setFulfillmentRemarks('');
                  setProcessingError(null);
                }}
                className="py-2.5 px-4 border border-[#1A1A1A] text-[#1A1A1A] text-xs font-mono font-bold uppercase"
              >
                Close
              </button>
              <button
                onClick={() => handleFulfill(selectedRequest, 'CANCELLED')}
                disabled={!!processingError}
                className="flex-1 py-2.5 border border-red-800 text-red-800 hover:bg-red-800 hover:text-white text-xs font-mono font-bold uppercase transition-colors disabled:opacity-50"
              >
                Reject
              </button>
              <button
                onClick={() => handleFulfill(selectedRequest, 'COMPLETED')}
                disabled={!!processingError}
                className="flex-1 py-2.5 bg-[#1A1A1A] hover:bg-[#D4AF37] text-white text-xs font-mono font-bold uppercase transition-colors disabled:opacity-50"
              >
                Approve & Issue
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
