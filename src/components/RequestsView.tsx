import React, { useState } from 'react';
import { Plus, ClipboardList, AlertTriangle, CheckCircle2, Truck, RotateCcw, XCircle, Clock } from 'lucide-react';
import { Request, RequestItem, CatalogItem, User, RequestStatus, Asset, Location } from '../types/inventory';
import { canApproveRequests, isStudent } from '../services/authRoles';
import {
  completeLabRequest,
  getRequestLineKind,
  handoverLabRequest,
  reviewLabRequest,
} from '../services/requestWorkflow';
import confetti from 'canvas-confetti';

interface RequestsViewProps {
  requests: Request[];
  catalogItems: CatalogItem[];
  assets: Asset[];
  locations: Location[];
  users: User[];
  activeUser: User;
  onOpenNewRequest: () => void;
  onRefreshData: () => void;
}

type FilterKey = RequestStatus | 'ALL';
const FILTERS: FilterKey[] = ['ALL', 'PENDING', 'APPROVED', 'HANDED_OVER', 'COMPLETED', 'REJECTED'];

const STATUS_CFG: Record<string, { label: string; badge: string; stripe: string; icon: React.ReactNode }> = {
  PENDING: {
    label: 'Pending',
    badge: 'idea-warning',
    stripe: 'bg-[var(--color-idea-yellow)]',
    icon: <Clock className="w-3 h-3" />,
  },
  APPROVED: {
    label: 'Approved',
    badge: 'idea-info',
    stripe: 'bg-[var(--color-idea-blue)]',
    icon: <CheckCircle2 className="w-3 h-3" />,
  },
  HANDED_OVER: {
    label: 'Handed Over',
    badge: 'idea-success',
    stripe: 'bg-[var(--color-idea-green)]',
    icon: <Truck className="w-3 h-3" />,
  },
  COMPLETED: {
    label: 'Completed',
    badge: 'idea-success',
    stripe: 'bg-[var(--color-idea-green)]',
    icon: <RotateCcw className="w-3 h-3" />,
  },
  REJECTED: {
    label: 'Rejected',
    badge: 'idea-error',
    stripe: 'bg-[var(--color-idea-red)]',
    icon: <XCircle className="w-3 h-3" />,
  },
  CANCELLED: {
    label: 'Rejected',
    badge: 'idea-error',
    stripe: 'bg-[var(--color-idea-red)]',
    icon: <XCircle className="w-3 h-3" />,
  },
};

export const RequestsView: React.FC<RequestsViewProps> = ({
  requests,
  catalogItems,
  assets,
  locations,
  users,
  activeUser,
  onOpenNewRequest,
  onRefreshData,
}) => {
  const [statusFilter, setStatusFilter] = useState<FilterKey>('ALL');
  const [selectedRequest, setSelectedRequest] = useState<Request | null>(null);
  const [modalMode, setModalMode] = useState<'review' | 'handover' | 'complete'>('review');
  const [remarks, setRemarks] = useState('');
  const [returnLocationId, setReturnLocationId] = useState('');
  const [processingError, setProcessingError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const canProcessRequests = canApproveRequests(activeUser?.role);
  const visibleRequests = isStudent(activeUser?.role) ? requests.filter((r) => r.user_id === activeUser.id) : requests;

  const filterCount = (f: FilterKey) => {
    if (f === 'ALL') return visibleRequests.length;
    if (f === 'REJECTED')
      return visibleRequests.filter((r) => r.status === 'REJECTED' || r.status === 'CANCELLED').length;
    return visibleRequests.filter((r) => r.status === f).length;
  };

  const filteredRequests = visibleRequests.filter((r) => {
    if (statusFilter === 'ALL') return true;
    if (statusFilter === 'REJECTED') return r.status === 'REJECTED' || r.status === 'CANCELLED';
    return r.status === statusFilter;
  });

  const lineLabel = (item: RequestItem) => {
    const kind = getRequestLineKind(item);
    if (kind === 'ASSET') {
      const asset = assets.find((e) => e.id === item.asset_id);
      const catalog = catalogItems.find((e) => e.id === item.catalog_item_id || e.id === asset?.catalog_item_id);
      return { name: asset?.asset_code || catalog?.name || 'Asset', qty: '1', isAsset: true, isReuse: false };
    }
    const catalog = catalogItems.find((e) => e.id === item.catalog_item_id);
    return {
      name: catalog?.name || 'Item',
      qty: `${item.requested_qty} ${catalog?.unit || 'pcs'}`,
      isAsset: false,
      isReuse: item.usage === 'REUSABLE',
    };
  };

  const openModal = (req: Request, mode: 'review' | 'handover' | 'complete') => {
    setSelectedRequest(req);
    setModalMode(mode);
    setProcessingError(null);
    setIsProcessing(false);
    setReturnLocationId(locations[0]?.id || '');
    setRemarks(
      mode === 'review'
        ? 'Approved. Inventory changes only after handover.'
        : mode === 'handover'
          ? `Items/assets handed over for ${req.request_number}.`
          : `Return accepted for ${req.request_number}.`
    );
  };

  const closeModal = () => {
    setSelectedRequest(null);
    setRemarks('');
    setReturnLocationId('');
    setProcessingError(null);
    setIsProcessing(false);
  };

  const handleAction = async () => {
    if (!selectedRequest) return;
    setProcessingError(null);
    setIsProcessing(true);
    try {
      if (modalMode === 'review') await reviewLabRequest(selectedRequest, 'APPROVED', activeUser, remarks.trim());
      else if (modalMode === 'handover') {
        await handoverLabRequest(selectedRequest, activeUser, remarks.trim());
        confetti({ particleCount: 40, spread: 60, origin: { y: 0.6 } });
      } else await completeLabRequest(selectedRequest, activeUser, remarks.trim(), returnLocationId);
      closeModal();
      onRefreshData();
    } catch (error: any) {
      setProcessingError(error?.message || 'Failed to process request.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!selectedRequest) return;
    setProcessingError(null);
    setIsProcessing(true);
    try {
      await reviewLabRequest(selectedRequest, 'REJECTED', activeUser, remarks.trim() || 'Request rejected.');
      closeModal();
      onRefreshData();
    } catch (error: any) {
      setProcessingError(error?.message || 'Failed to reject request.');
    } finally {
      setIsProcessing(false);
    }
  };

  const formatDate = (iso?: string) =>
    iso ? new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '';

  return (
    <div className="flex-1 overflow-y-auto idea-bg">
      <div className="max-w-5xl mx-auto px-6 py-8 space-y-6">
        {/* HEADER */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="text-[10px] font-medium tracking-[0.25em] uppercase text-[var(--color-idea-muted)]">
              Material Requests
            </span>
            <h2 className="text-2xl font-bold text-[var(--color-idea-text)] tracking-tight mt-1">
              Requests <span className="text-[var(--color-idea-blue)]">Lists</span>
            </h2>
          </div>
          <button
            onClick={onOpenNewRequest}
            className="idea-button flex items-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-xl cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" /> New Request
          </button>
        </div>

        {/* FILTER PILLS */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
          {FILTERS.map((f) => {
            const count = filterCount(f);
            const active = statusFilter === f;
            const label = f === 'ALL' ? 'All' : (STATUS_CFG[f]?.label ?? f);
            return (
              <button
                key={f}
                onClick={() => setStatusFilter(f)}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg border transition-all cursor-pointer whitespace-nowrap ${active ? 'bg-[var(--color-idea-blue)] text-white border-[var(--color-idea-blue)] shadow-sm' : 'bg-white text-[var(--color-idea-muted)] border-[var(--color-idea-border)] hover:border-[var(--color-idea-blue)]/40 hover:text-[var(--color-idea-text)]'}`}
              >
                {label}
                {count > 0 && (
                  <span
                    className={`text-[9px] font-bold px-1.5 py-px rounded-full ${active ? 'bg-white/20' : 'bg-[var(--color-idea-light-grey)] text-[var(--color-idea-muted)]'}`}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* REQUEST CARDS */}
        <div className="space-y-3">
          {filteredRequests.length === 0 && (
            <div className="idea-card p-12 flex flex-col items-center gap-3 text-center">
              <div className="w-12 h-12 rounded-2xl idea-gradient-soft flex items-center justify-center">
                <ClipboardList className="w-6 h-6 text-[var(--color-idea-blue)]" />
              </div>
              <div>
                <p className="font-semibold text-[var(--color-idea-text)] text-sm">No requests found</p>
                <p className="text-xs text-[var(--color-idea-muted)] mt-0.5">
                  {statusFilter === 'ALL'
                    ? 'Submit a new request to get started.'
                    : `No ${STATUS_CFG[statusFilter]?.label.toLowerCase() ?? statusFilter} requests.`}
                </p>
              </div>
            </div>
          )}
          {filteredRequests.map((req) => {
            const student = users.find((u) => u.id === req.user_id);
            const cfg = STATUS_CFG[req.status] ?? STATUS_CFG['PENDING'];
            return (
              <div key={req.id} className="idea-card overflow-hidden flex">
                <div className={`w-1 shrink-0 ${cfg.stripe}`} />
                <div className="flex-1 p-5">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-xl idea-gradient-soft flex items-center justify-center shrink-0 mt-0.5">
                        <ClipboardList className="w-4 h-4 text-[var(--color-idea-blue)]" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono font-bold text-[var(--color-idea-blue)] text-sm tracking-wide">
                            {req.request_number}
                          </span>
                          <span
                            className={`inline-flex items-center gap-1 text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-widest ${cfg.badge}`}
                          >
                            {cfg.icon}
                            {cfg.label}
                          </span>
                        </div>
                        <p className="text-[11px] text-[var(--color-idea-muted)] mt-0.5">
                          {student?.name || 'Student'}
                          {req.deadline_at ? ` · Return by ${formatDate(req.deadline_at)}` : ''}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {req.status === 'PENDING' && canProcessRequests && (
                        <button
                          onClick={() => openModal(req, 'review')}
                          className="px-3.5 py-1.5 text-xs font-semibold rounded-lg border border-[var(--color-idea-blue)] text-[var(--color-idea-blue)] hover:bg-[var(--color-idea-blue)] hover:text-white transition-colors cursor-pointer"
                        >
                          Review
                        </button>
                      )}
                      {req.status === 'APPROVED' && canProcessRequests && (
                        <button
                          onClick={() => openModal(req, 'handover')}
                          className="px-3.5 py-1.5 idea-button text-xs font-semibold rounded-lg cursor-pointer"
                        >
                          Hand Over
                        </button>
                      )}
                      {req.status === 'HANDED_OVER' && canProcessRequests && (
                        <button
                          onClick={() => openModal(req, 'complete')}
                          className="px-3.5 py-1.5 text-xs font-semibold rounded-lg border border-[var(--color-idea-green)] text-[#3d6b10] hover:bg-[var(--color-idea-green)] hover:text-white transition-colors cursor-pointer"
                        >
                          Accept Return
                        </button>
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-[var(--color-idea-text)] mt-3 italic opacity-70">"{req.purpose}"</p>
                  {req.items && req.items.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {req.items.map((item) => {
                        const ll = lineLabel(item);
                        return (
                          <div
                            key={item.id}
                            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[10px] font-semibold bg-[var(--color-idea-light-grey)] border-[var(--color-idea-border)]"
                          >
                            <span className="text-[var(--color-idea-text)]">{ll.name}</span>
                            <span className="text-[var(--color-idea-muted)]">·</span>
                            <span className="text-[var(--color-idea-blue)] font-mono">
                              {ll.isAsset ? 'Asset' : ll.qty}
                            </span>
                            {!ll.isAsset && (
                              <span
                                className={`px-1 py-px rounded text-[8px] uppercase font-bold ${ll.isReuse ? 'bg-[var(--color-idea-blue)]/10 text-[var(--color-idea-deep-blue)]' : 'bg-[var(--color-idea-green)]/10 text-[#3d6b10]'}`}
                              >
                                {ll.isReuse ? 'Reuse' : 'Consume'}
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                  {req.remarks && (
                    <p className="text-[10px] text-[var(--color-idea-muted)] mt-2.5 italic">
                      <span className="font-semibold not-italic">Note: </span>
                      {req.remarks}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ACTION MODAL */}
      {selectedRequest && (
        <div className="fixed inset-0 bg-[var(--color-idea-text)]/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-[var(--color-idea-border)] shadow-2xl rounded-2xl w-full max-w-md overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-[var(--color-idea-border)] bg-[var(--color-idea-light-grey)]/60 flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl idea-gradient-soft flex items-center justify-center shrink-0">
                {modalMode === 'review' ? (
                  <CheckCircle2 className="w-4 h-4 text-[var(--color-idea-blue)]" />
                ) : modalMode === 'handover' ? (
                  <Truck className="w-4 h-4 text-[var(--color-idea-blue)]" />
                ) : (
                  <RotateCcw className="w-4 h-4 text-[var(--color-idea-blue)]" />
                )}
              </div>
              <div>
                <p className="font-bold text-[var(--color-idea-text)] text-sm">
                  {modalMode === 'review'
                    ? 'Review Request'
                    : modalMode === 'handover'
                      ? 'Hand Over Items'
                      : 'Accept Return'}
                </p>
                <p className="text-[10px] font-mono text-[var(--color-idea-blue)] mt-0.5">
                  {selectedRequest.request_number}
                </p>
              </div>
            </div>
            <div className="p-6 space-y-4 overflow-y-auto max-h-[55vh]">
              {processingError && (
                <div className="flex items-start gap-2 p-3 idea-error rounded-xl text-xs">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{processingError}</span>
                </div>
              )}
              <p className="text-xs text-[var(--color-idea-muted)] leading-relaxed">
                {modalMode === 'review'
                  ? 'Approval gives permission only. Inventory does not change until handover.'
                  : modalMode === 'handover'
                    ? 'Records the physical handover. Updates stock levels, asset status, and the ledger.'
                    : 'Confirm items have been returned. Inventory will be restored and the request closed.'}
              </p>
              <div className="space-y-1.5">
                <p className="text-[9px] font-bold uppercase tracking-widest text-[var(--color-idea-muted)]">
                  Items in this request
                </p>
                {selectedRequest.items?.map((item) => {
                  const ll = lineLabel(item);
                  return (
                    <div
                      key={item.id}
                      className="flex justify-between items-center px-3 py-2 rounded-xl border border-[var(--color-idea-border)] bg-[var(--color-idea-light-grey)]/60 text-xs"
                    >
                      <span className="font-semibold text-[var(--color-idea-text)]">{ll.name}</span>
                      <span className="text-[var(--color-idea-blue)] font-mono text-[10px]">
                        {ll.isAsset ? 'Asset · 1 unit' : ll.qty}
                      </span>
                    </div>
                  );
                })}
              </div>
              <div>
                <label className="text-[9px] font-bold uppercase tracking-widest text-[var(--color-idea-muted)] block mb-1.5">
                  Remarks
                </label>
                <input
                  type="text"
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="Add a note…"
                  className="idea-input px-3 py-2.5 text-xs"
                />
              </div>
              {modalMode === 'complete' && (
                <div>
                  <label className="text-[9px] font-bold uppercase tracking-widest text-[var(--color-idea-muted)] block mb-1.5">
                    Return Location
                  </label>
                  <select
                    value={returnLocationId}
                    onChange={(e) => setReturnLocationId(e.target.value)}
                    className="idea-input px-3 py-2.5 text-xs"
                  >
                    <option value="">Choose storage location</option>
                    {locations.map((loc) => (
                      <option key={loc.id} value={loc.id}>
                        {loc.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
            <div className="px-6 py-4 border-t border-[var(--color-idea-border)] flex gap-2">
              <button
                onClick={closeModal}
                disabled={isProcessing}
                className="px-4 py-2.5 text-xs font-semibold rounded-xl border border-[var(--color-idea-border)] text-[var(--color-idea-text)] hover:bg-[var(--color-idea-light-grey)] transition-colors cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              {modalMode === 'review' && (
                <button
                  onClick={handleReject}
                  disabled={isProcessing}
                  className="flex-1 py-2.5 idea-error rounded-xl text-xs font-bold cursor-pointer disabled:opacity-50"
                >
                  Reject
                </button>
              )}
              <button
                onClick={handleAction}
                disabled={isProcessing}
                className="flex-1 py-2.5 idea-button rounded-xl text-xs font-bold cursor-pointer disabled:opacity-60"
              >
                {isProcessing
                  ? 'Processing…'
                  : modalMode === 'review'
                    ? 'Approve'
                    : modalMode === 'handover'
                      ? 'Confirm Handover'
                      : 'Accept Return'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
