import React, { useMemo, useState } from 'react';
import {
  Plus,
  ClipboardList,
  AlertTriangle,
  CheckCircle2,
  RotateCcw,
  XCircle,
  Clock,
  ChevronUp,
  ChevronDown,
} from 'lucide-react';
import {
  Request,
  RequestItem,
  CatalogItem,
  User,
  RequestStatus,
  Asset,
  Location,
} from '../types/inventory';
import { canApproveRequests, isStudent } from '../services/authRoles';
import {
  completeLabRequest,
  getRequestLineKind,
  approveAndHandoverLabRequest,
  requestLabReturn,
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

// "HANDED_OVER" is still the underlying Firestore status.
// The UI treats it as the same state as APPROVED / Issued.
type FilterKey = RequestStatus | 'ALL';

const FILTERS: FilterKey[] = [
  'ALL',
  'PENDING',
  'APPROVED',
  'RETURN_REQUESTED',
  'COMPLETED',
  'REJECTED',
];

const STATUS_CFG: Record<
  string,
  {
    label: string;
    badge: string;
    icon: React.ReactNode;
  }
> = {
  PENDING: {
    label: 'Pending',
    badge: 'idea-warning',
    icon: <Clock className="w-3 h-3" />,
  },
  APPROVED: {
    label: 'Issued',
    badge: 'idea-success',
    icon: <CheckCircle2 className="w-3 h-3" />,
  },
  HANDED_OVER: {
    label: 'Issued',
    badge: 'idea-success',
    icon: <CheckCircle2 className="w-3 h-3" />,
  },
  RETURN_REQUESTED: {
    label: 'Return requested',
    badge: 'idea-warning',
    icon: <RotateCcw className="w-3 h-3" />,
  },
  COMPLETED: {
    label: 'Returned',
    badge: 'idea-info',
    icon: <RotateCcw className="w-3 h-3" />,
  },
  REJECTED: {
    label: 'Rejected',
    badge: 'idea-error',
    icon: <XCircle className="w-3 h-3" />,
  },
  CANCELLED: {
    label: 'Rejected',
    badge: 'idea-error',
    icon: <XCircle className="w-3 h-3" />,
  },
};

type SortKey =
  | 'request_number'
  | 'student'
  | 'status'
  | 'deadline_at';

type ModalMode = 'review' | 'complete';

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
  const [statusFilter, setStatusFilter] =
    useState<FilterKey>('ALL');

  const [sortKey, setSortKey] =
    useState<SortKey>('deadline_at');

  const [sortDir, setSortDir] =
    useState<'asc' | 'desc'>('asc');

  const [selectedRequest, setSelectedRequest] =
    useState<Request | null>(null);

  const [modalMode, setModalMode] =
    useState<ModalMode>('review');

  const [remarks, setRemarks] = useState('');

  const [returnLocationId, setReturnLocationId] =
    useState('');

  const [processingError, setProcessingError] =
    useState<string | null>(null);

  const [isProcessing, setIsProcessing] =
    useState(false);

  const [processingReturnId, setProcessingReturnId] =
    useState<string | null>(null);

  const canProcessRequests =
    canApproveRequests(activeUser?.role);

  const visibleRequests = isStudent(activeUser?.role)
    ? requests.filter((r) => r.user_id === activeUser.id)
    : requests;

  const displayStatus = (status: RequestStatus) =>
    status === 'HANDED_OVER' ? 'APPROVED' : status;

  const filterCount = (filter: FilterKey) => {
    if (filter === 'ALL') {
      return visibleRequests.length;
    }

    if (filter === 'REJECTED') {
      return visibleRequests.filter(
        (r) =>
          r.status === 'REJECTED' ||
          r.status === 'CANCELLED'
      ).length;
    }

    if (filter === 'APPROVED') {
      return visibleRequests.filter(
        (r) =>
          r.status === 'APPROVED' ||
          r.status === 'HANDED_OVER'
      ).length;
    }

    return visibleRequests.filter(
      (r) => r.status === filter
    ).length;
  };

  const filteredRequests = visibleRequests.filter((r) => {
    if (statusFilter === 'ALL') {
      return true;
    }

    if (statusFilter === 'REJECTED') {
      return (
        r.status === 'REJECTED' ||
        r.status === 'CANCELLED'
      );
    }

    if (statusFilter === 'APPROVED') {
      return (
        r.status === 'APPROVED' ||
        r.status === 'HANDED_OVER'
      );
    }

    return r.status === statusFilter;
  });

  const studentName = (req: Request) =>
    users.find((u) => u.id === req.user_id)?.name ||
    'Student';

  const sortedRequests = useMemo(() => {
    const dir = sortDir === 'asc' ? 1 : -1;

    return [...filteredRequests].sort((a, b) => {
      switch (sortKey) {
        case 'request_number':
          return (
            a.request_number.localeCompare(
              b.request_number
            ) * dir
          );

        case 'student':
          return (
            studentName(a).localeCompare(studentName(b)) *
            dir
          );

        case 'status':
          return (
            displayStatus(a.status).localeCompare(
              displayStatus(b.status)
            ) * dir
          );

        case 'deadline_at':
        default: {
          const av = a.deadline_at
            ? new Date(a.deadline_at).getTime()
            : Infinity;

          const bv = b.deadline_at
            ? new Date(b.deadline_at).getTime()
            : Infinity;

          return (av - bv) * dir;
        }
      }
    });

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredRequests, sortKey, sortDir, users]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((direction) =>
        direction === 'asc' ? 'desc' : 'asc'
      );
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  /*
   * IMPORTANT:
   *
   * ASSET request:
   *   RequestItem.asset_id -> Asset
   *
   * CATALOG request:
   *   RequestItem.catalog_item_id -> CatalogItem
   *
   * There is NO Asset -> CatalogItem lookup here.
   */
  const lineLabel = (item: RequestItem) => {
    const kind = getRequestLineKind(item);

    if (kind === 'ASSET') {
      const asset = assets.find(
        (asset) => asset.id === item.asset_id
      );

      return {
        name:
          asset?.name ||
          asset?.asset_code ||
          'Asset',
        qty: '1',
        isAsset: true,
        isReuse: false,
      };
    }

    const catalog = catalogItems.find(
      (catalogItem) =>
        catalogItem.id === item.catalog_item_id
    );

    return {
      name: catalog?.name || 'Item',
      qty: `${item.requested_qty} ${catalog?.unit || 'pcs'
        }`,
      isAsset: false,
      isReuse: item.usage === 'REUSABLE',
    };
  };

  const openModal = (
    req: Request,
    mode: ModalMode
  ) => {
    setSelectedRequest(req);
    setModalMode(mode);
    setProcessingError(null);
    setIsProcessing(false);

    setReturnLocationId(
      locations[0]?.id || ''
    );

    const hasReturnables = req.items?.some(
      (item) =>
        getRequestLineKind(item) === 'ASSET' ||
        item.usage === 'REUSABLE'
    );

    setRemarks(
      mode === 'review'
        ? `Approved and issued for ${req.request_number}.`
        : hasReturnables
          ? `Return accepted for ${req.request_number}.`
          : `Request completed for ${req.request_number}.`
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
    if (!selectedRequest) {
      return;
    }

    setProcessingError(null);
    setIsProcessing(true);

    try {
      if (modalMode === 'review') {
        await approveAndHandoverLabRequest(
          selectedRequest,
          activeUser,
          remarks.trim()
        );

        confetti({
          particleCount: 40,
          spread: 60,
          origin: { y: 0.6 },
        });
      } else {
        await completeLabRequest(
          selectedRequest,
          activeUser,
          remarks.trim(),
          returnLocationId
        );
      }

      closeModal();
      onRefreshData();
    } catch (error: any) {
      setProcessingError(
        error?.message ||
        'Failed to process request.'
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!selectedRequest) {
      return;
    }

    setProcessingError(null);
    setIsProcessing(true);

    try {
      await reviewLabRequest(
        selectedRequest,
        'REJECTED',
        activeUser,
        remarks.trim() || 'Request rejected.'
      );

      closeModal();
      onRefreshData();
    } catch (error: any) {
      setProcessingError(
        error?.message ||
        'Failed to reject request.'
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const handleStudentReturnRequest = async (request: Request) => {
    setProcessingReturnId(request.id);

    try {
      await requestLabReturn(request);
      onRefreshData();
    } catch (error: any) {
      window.alert(error?.message || 'Failed to request a return.');
    } finally {
      setProcessingReturnId(null);
    }
  };

  const formatDate = (
    iso?: string | null
  ) =>
    iso
      ? new Date(iso).toLocaleDateString(
        'en-IN',
        {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        }
      )
      : '—';

  const SortHeader: React.FC<{
    label: string;
    sortKeyName: SortKey;
    className?: string;
  }> = ({
    label,
    sortKeyName,
    className,
  }) => (
      <th
        onClick={() => toggleSort(sortKeyName)}
        className={`px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-widest text-[var(--color-idea-muted)] cursor-pointer select-none whitespace-nowrap ${className || ''
          }`}
      >
        <span className="inline-flex items-center gap-1">
          {label}

          {sortKey === sortKeyName &&
            (sortDir === 'asc' ? (
              <ChevronUp className="w-3 h-3" />
            ) : (
              <ChevronDown className="w-3 h-3" />
            ))}
        </span>
      </th>
    );

  return (
    <div className="flex-1 overflow-y-auto idea-bg">
      <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6 sm:space-y-8">
        {/* Unified Standard Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--color-idea-border)] pb-5 sm:pb-6">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--color-idea-blue)]">
                AICTE IDEA LAB · MATERIAL REQUESTS
              </span>
            </div>
            <h1 className="mt-1 text-2xl sm:text-3xl font-bold tracking-tight text-[var(--color-idea-text)]">
              Material Requests & Approvals
            </h1>
            <p className="mt-1.5 text-xs sm:text-sm text-[var(--color-idea-muted)] max-w-2xl leading-relaxed">
              Create, review, approve, handover, and track inventory checkout requests and returns.
            </p>
          </div>

          <button
            onClick={onOpenNewRequest}
            className="idea-button flex items-center justify-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-semibold rounded-xl shadow-sm cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>New Request</span>
          </button>
        </div>

        {/* FILTER BAR */}
        <div className="idea-card p-3 sm:p-4">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
            {FILTERS.map((filter) => {
              const count = filterCount(filter);
              const active = statusFilter === filter;
              const label = filter === 'ALL' ? 'All Requests' : STATUS_CFG[filter]?.label ?? filter;

              return (
                <button
                  key={filter}
                  onClick={() => setStatusFilter(filter)}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg border transition-all cursor-pointer whitespace-nowrap ${active
                    ? 'bg-[var(--color-idea-blue)] text-white border-[var(--color-idea-blue)] shadow-sm'
                    : 'bg-white text-[var(--color-idea-muted)] border-[var(--color-idea-border)] hover:border-[var(--color-idea-blue)]/40 hover:text-[var(--color-idea-text)]'
                    }`}
                >
                  <span>{label}</span>
                  {count > 0 && (
                    <span
                      className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${active
                        ? 'bg-white/20 text-white'
                        : 'bg-[var(--color-idea-light-grey)] text-[var(--color-idea-muted)]'
                        }`}
                    >
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* TABLE */}
        <div className="idea-card overflow-hidden">
          {sortedRequests.length === 0 ? (
            <div className="p-12 flex flex-col items-center gap-3 text-center">
              <div className="w-12 h-12 rounded-2xl idea-gradient-soft flex items-center justify-center">
                <ClipboardList className="w-6 h-6 text-[var(--color-idea-blue)]" />
              </div>

              <div>
                <p className="font-semibold text-[var(--color-idea-text)] text-sm">
                  No requests found
                </p>

                <p className="text-xs text-[var(--color-idea-muted)] mt-0.5">
                  {statusFilter === 'ALL'
                    ? 'Submit a new request to get started.'
                    : `No ${STATUS_CFG[
                      statusFilter
                    ]?.label ??
                    statusFilter
                      .toLowerCase()} requests.`}
                </p>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead className="bg-[var(--color-idea-light-grey)]/60 border-b border-[var(--color-idea-border)]">
                  <tr>
                    <SortHeader
                      label="Request"
                      sortKeyName="request_number"
                    />

                    <SortHeader
                      label="Student"
                      sortKeyName="student"
                    />

                    <th className="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-widest text-[var(--color-idea-muted)]">
                      Items
                    </th>

                    <SortHeader
                      label="Status"
                      sortKeyName="status"
                    />

                    <SortHeader
                      label="Return by"
                      sortKeyName="deadline_at"
                    />

                    <th className="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-widest text-[var(--color-idea-muted)]">
                      Note
                    </th>

                    <th className="px-4 py-2.5 text-right text-[10px] font-bold uppercase tracking-widest text-[var(--color-idea-muted)]">
                      Action
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-[var(--color-idea-border)]">
                  {sortedRequests.map((req) => {
                    const cfg =
                      STATUS_CFG[req.status] ??
                      STATUS_CFG.PENDING;

                    return (
                      <tr
                        key={req.id}
                        className="hover:bg-[var(--color-idea-light-grey)]/40 transition-colors align-top"
                      >
                        <td className="px-4 py-3">
                          <span className="font-mono font-bold text-[var(--color-idea-blue)] text-xs tracking-wide">
                            {req.request_number}
                          </span>
                        </td>

                        <td className="px-4 py-3">
                          <span className="text-xs font-semibold text-[var(--color-idea-text)]">
                            {studentName(req)}
                          </span>
                        </td>

                        <td className="px-4 py-3 max-w-[260px]">
                          <div className="flex flex-wrap gap-1">
                            {(req.items ?? []).map(
                              (item) => {
                                const label =
                                  lineLabel(item);

                                return (
                                  <span
                                    key={item.id}
                                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[10px] font-semibold bg-[var(--color-idea-light-grey)] border-[var(--color-idea-border)] whitespace-nowrap"
                                    title={
                                      label.isAsset
                                        ? 'Asset'
                                        : label.isReuse
                                          ? 'Reusable'
                                          : 'Consumable'
                                    }
                                  >
                                    <span className="text-[var(--color-idea-text)]">
                                      {label.name}
                                    </span>

                                    <span className="text-[var(--color-idea-blue)] font-mono">
                                      {label.isAsset
                                        ? '×1'
                                        : label.qty}
                                    </span>
                                  </span>
                                );
                              }
                            )}
                          </div>
                        </td>

                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center gap-1 text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-widest whitespace-nowrap ${cfg.badge}`}
                          >
                            {cfg.icon}
                            {cfg.label}
                          </span>
                        </td>

                        <td className="px-4 py-3">
                          <span className="text-xs text-[var(--color-idea-muted)] whitespace-nowrap">
                            {formatDate(
                              req.deadline_at
                            )}
                          </span>
                        </td>

                        <td className="px-4 py-3 max-w-[220px]">
                          {req.purpose && (
                            <p className="text-[11px] text-[var(--color-idea-text)] leading-snug">
                              {req.purpose}
                            </p>
                          )}

                          {req.remarks && (
                            <p className="text-[10px] text-[var(--color-idea-muted)] mt-1 leading-snug">
                              <span className="font-semibold">
                                Note:
                              </span>{' '}
                              {req.remarks}
                            </p>
                          )}
                        </td>

                        <td className="px-4 py-3 text-right">
                          {req.status ===
                            'PENDING' &&
                            canProcessRequests && (
                              <button
                                onClick={() =>
                                  openModal(
                                    req,
                                    'review'
                                  )
                                }
                                className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-[var(--color-idea-blue)] text-[var(--color-idea-blue)] hover:bg-[var(--color-idea-blue)] hover:text-white transition-colors cursor-pointer whitespace-nowrap"
                              >
                                Review
                              </button>
                            )}

                          {(req.status ===
                            'APPROVED' ||
                            req.status ===
                            'HANDED_OVER' ||
                            req.status ===
                            'RETURN_REQUESTED') &&
                            canProcessRequests && (
                              <button
                                onClick={() =>
                                  openModal(
                                    req,
                                    'complete'
                                  )
                                }
                                className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-[var(--color-idea-green)] text-[#3d6b10] hover:bg-[var(--color-idea-green)] hover:text-white transition-colors cursor-pointer whitespace-nowrap"
                              >
                                {req.items?.some(
                                  (item) =>
                                    getRequestLineKind(
                                      item
                                    ) ===
                                    'ASSET' ||
                                    item.usage ===
                                    'REUSABLE'
                                )
                                  ? 'Accept Return'
                                  : 'Complete'}
                              </button>
                            )}

                          {(req.status === 'HANDED_OVER' ||
                            req.status === 'APPROVED') &&
                            activeUser.role === 'STUDENT' &&
                            req.items?.some(
                              (item) =>
                                getRequestLineKind(item) === 'ASSET' ||
                                item.usage === 'REUSABLE'
                            ) && (
                              <button
                                onClick={() => handleStudentReturnRequest(req)}
                                disabled={processingReturnId === req.id}
                                className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-[var(--color-idea-blue)] text-[var(--color-idea-blue)] hover:bg-[var(--color-idea-blue)] hover:text-white transition-colors cursor-pointer whitespace-nowrap disabled:cursor-wait disabled:opacity-60"
                              >
                                {processingReturnId === req.id
                                  ? 'Requesting…'
                                  : 'Request Return'}
                              </button>
                            )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
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
                ) : selectedRequest.items?.some(
                  (item) =>
                    getRequestLineKind(
                      item
                    ) === 'ASSET' ||
                    item.usage ===
                    'REUSABLE'
                ) ? (
                  <RotateCcw className="w-4 h-4 text-[var(--color-idea-blue)]" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 text-[var(--color-idea-blue)]" />
                )}
              </div>

              <div>
                <p className="font-bold text-[var(--color-idea-text)] text-sm">
                  {modalMode === 'review'
                    ? 'Approve & Issue Request'
                    : selectedRequest.items?.some(
                      (item) =>
                        getRequestLineKind(
                          item
                        ) === 'ASSET' ||
                        item.usage ===
                        'REUSABLE'
                    )
                      ? 'Accept Return'
                      : 'Complete Request'}
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
                  <span>
                    {processingError}
                  </span>
                </div>
              )}

              <p className="text-xs text-[var(--color-idea-muted)] leading-relaxed">
                {modalMode === 'review'
                  ? 'Approving deducts stock and marks any assets issued immediately — there is no separate handover step.'
                  : selectedRequest.items?.some(
                    (item) =>
                      getRequestLineKind(
                        item
                      ) === 'ASSET' ||
                      item.usage ===
                      'REUSABLE'
                  )
                    ? 'Confirm the items have physically come back. Stock and asset status will be restored and the request closed.'
                    : 'Mark this request as completed. Consumables are already deducted.'}
              </p>

              <div className="space-y-1.5">
                <p className="text-[9px] font-bold uppercase tracking-widest text-[var(--color-idea-muted)]">
                  Items in this request
                </p>

                {selectedRequest.items?.map(
                  (item) => {
                    const label =
                      lineLabel(item);

                    return (
                      <div
                        key={item.id}
                        className="flex justify-between items-center px-3 py-2 rounded-xl border border-[var(--color-idea-border)] bg-[var(--color-idea-light-grey)]/60 text-xs"
                      >
                        <span className="font-semibold text-[var(--color-idea-text)]">
                          {label.name}
                        </span>

                        <span className="text-[var(--color-idea-blue)] font-mono text-[10px]">
                          {label.isAsset
                            ? 'Asset · 1 unit'
                            : label.qty}
                        </span>
                      </div>
                    );
                  }
                )}
              </div>

              <div>
                <label className="text-[9px] font-bold uppercase tracking-widest text-[var(--color-idea-muted)] block mb-1.5">
                  Note
                </label>

                <input
                  type="text"
                  value={remarks}
                  onChange={(event) =>
                    setRemarks(
                      event.target.value
                    )
                  }
                  placeholder="Add a note for this request…"
                  className="idea-input px-3 py-2.5 text-xs"
                />
              </div>

              {modalMode ===
                'complete' &&
                selectedRequest.items?.some(
                  (item) =>
                    getRequestLineKind(
                      item
                    ) === 'ASSET'
                ) && (
                  <div>
                    <label className="text-[9px] font-bold uppercase tracking-widest text-[var(--color-idea-muted)] block mb-1.5">
                      Return Location
                    </label>

                    <select
                      value={
                        returnLocationId
                      }
                      onChange={(event) =>
                        setReturnLocationId(
                          event.target.value
                        )
                      }
                      className="idea-input px-3 py-2.5 text-xs"
                    >
                      <option value="">
                        Choose storage location
                      </option>

                      {locations.map(
                        (location) => (
                          <option
                            key={location.id}
                            value={location.id}
                          >
                            {location.name}
                          </option>
                        )
                      )}
                    </select>
                  </div>
                )}
            </div>

            <div className="px-6 py-4 border-t border-[var(--color-idea-border)] flex gap-2">

              <button
                onClick={closeModal}
                disabled={isProcessing}
                className="flex-1 px-4 py-2.5 text-xs font-semibold rounded-xl border border-[var(--color-idea-border)] text-[var(--color-idea-text)] hover:bg-[var(--color-idea-light-grey)] transition-colors cursor-pointer disabled:opacity-50"
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
                className="py-2.5 flex-1 px-4 idea-button rounded-xl text-xs font-bold cursor-pointer disabled:opacity-60"
              >
                {isProcessing
                  ? 'Processing…'
                  : modalMode ===
                    'review'
                    ? 'Approve & Issue'
                    : selectedRequest.items?.some(
                      (item) =>
                        getRequestLineKind(
                          item
                        ) === 'ASSET' ||
                        item.usage ===
                        'REUSABLE'
                    )
                      ? 'Accept Return'
                      : 'Complete Request'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
