import React, { useEffect, useState } from 'react';
import { X, Plus, Trash2, Send, Package } from 'lucide-react';
import { Asset, CatalogItem, RequestLineDraft, RequestUsage, User } from '../types/inventory';
import { createRequestFirestore } from '../services/firebaseCollections';
import confetti from 'canvas-confetti';

interface NewRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeUser: User;
  catalogItems: CatalogItem[];
  assets: Asset[];
  onRefreshData: () => void;
  initialItems?: RequestLineDraft[];
}

export const NewRequestModal: React.FC<NewRequestModalProps> = ({
  isOpen,
  onClose,
  activeUser,
  catalogItems,
  assets,
  onRefreshData,
  initialItems,
}) => {
  const [purpose, setPurpose] = useState('');
  const [remarks, setRemarks] = useState('');
  const [deadlineAt, setDeadlineAt] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const availableAssets = assets.filter((asset) => asset.status === 'AVAILABLE');

  const getInitialItems = (): RequestLineDraft[] => {
    if (initialItems && initialItems.length > 0) {
      return initialItems.map((item) =>
        item.kind === 'CATALOG'
          ? {
            ...item,
            usage: item.usage || 'CONSUMABLE',
          }
          : {
            kind: 'ASSET',
            asset_id: item.asset_id || '',
            requested_qty: 1,
          }
      );
    }

    return [
      {
        kind: 'CATALOG',
        catalog_item_id: catalogItems[0]?.id || '',
        requested_qty: 1,
        usage: 'CONSUMABLE',
      },
    ];
  };

  const [requestItems, setRequestItems] = useState<RequestLineDraft[]>(getInitialItems());

  useEffect(() => {
    if (!isOpen) return;

    setPurpose('');
    setRemarks('');
    setDeadlineAt('');
    setIsSubmitting(false);
    setRequestItems(getInitialItems());
  }, [isOpen, initialItems, catalogItems]);

  if (!isOpen) return null;

  const handleAddItem = () => {
    setRequestItems([
      ...requestItems,
      {
        kind: 'CATALOG',
        catalog_item_id: catalogItems[0]?.id || '',
        requested_qty: 1,
        usage: 'CONSUMABLE',
      },
    ]);
  };

  const handleRemoveItem = (index: number) => {
    if (requestItems.length === 1) return;

    setRequestItems(requestItems.filter((_, idx) => idx !== index));
  };

  const handleKindChange = (index: number, kind: RequestLineDraft['kind']) => {
    const updated = [...requestItems];

    if (kind === 'ASSET') {
      updated[index] = {
        kind: 'ASSET',
        asset_id: availableAssets[0]?.id || '',
        requested_qty: 1,
      };
    } else {
      updated[index] = {
        kind: 'CATALOG',
        catalog_item_id: catalogItems[0]?.id || '',
        requested_qty: 1,
        usage: 'CONSUMABLE',
      };
    }

    setRequestItems(updated);
  };

  const handleItemChange = (
    index: number,
    field: 'catalog_item_id' | 'asset_id' | 'requested_qty' | 'usage',
    value: string | number
  ) => {
    const updated = [...requestItems];
    const current = { ...updated[index] };

    if (field === 'requested_qty') {
      current.requested_qty = Number(value) || 1;
    } else if (field === 'usage') {
      current.usage = value as RequestUsage;
    } else if (field === 'asset_id') {
      current.asset_id = String(value);
      current.requested_qty = 1;

      // Asset and CatalogItem are completely independent.
      // Do NOT set catalog_item_id here.
    } else if (field === 'catalog_item_id') {
      current.catalog_item_id = String(value);
    }

    updated[index] = current;
    setRequestItems(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!purpose.trim()) {
      return alert('Please enter project purpose');
    }

    if (!deadlineAt) {
      return alert('Please choose when you will return the items.');
    }

    if (new Date(deadlineAt).getTime() <= Date.now()) {
      return alert('Return deadline must be in the future.');
    }

    const invalidCatalog = requestItems.some(
      (item) =>
        item.kind === 'CATALOG' &&
        (!item.catalog_item_id || item.requested_qty <= 0)
    );

    const invalidAsset = requestItems.some(
      (item) =>
        item.kind === 'ASSET' &&
        !item.asset_id
    );

    if (invalidCatalog || invalidAsset) {
      return alert('Please select valid items or available assets.');
    }

    const requestNumber = `REQ-${new Date()
      .toISOString()
      .slice(0, 10)
      .replace(/-/g, '')}-${Math.floor(100 + Math.random() * 900)}`;

    setIsSubmitting(true);

    try {
      await createRequestFirestore({
        request_number: requestNumber,
        user_id: activeUser.id,
        purpose,
        status: 'PENDING',
        deadline_at: new Date(deadlineAt).toISOString(),
        remarks: remarks || '',

        items: requestItems.map((item, idx) => {
          const line: Record<string, unknown> = {
            id: `reqi-${Date.now()}-${idx}`,
            request_id: requestNumber,
            kind: item.kind,
            requested_qty: item.kind === 'ASSET' ? 1 : item.requested_qty,
          };

          if (item.kind === 'CATALOG') {
            if (item.catalog_item_id) {
              line.catalog_item_id = item.catalog_item_id;
            }

            if (item.usage) {
              line.usage = item.usage;
            }
          }

          if (item.kind === 'ASSET' && item.asset_id) {
            line.asset_id = item.asset_id;
          }

          return line;
        }),
      });

      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.6 },
      });

      onRefreshData();
      onClose();
    } catch (error: any) {
      alert(
        error?.message ||
        'Request could not be created. Please check your Firebase permissions.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const assetLabel = (asset: Asset) => {
    const parts = [];

    if (asset.name) {
      parts.push(asset.name);
    }

    if (asset.serial_number) {
      parts.push(`SN: ${asset.serial_number}`);
    }

    return parts.join(' · ');
  };

  return (
    <div className="fixed inset-0 bg-[var(--color-idea-text)]/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-[var(--color-idea-border)] w-full max-w-lg overflow-hidden flex flex-col">

        {/* Header */}
        <div className="px-6 py-5 border-b border-[var(--color-idea-border)] flex items-center justify-between bg-[var(--color-idea-light-grey)]/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[var(--color-idea-blue)] text-white rounded-xl flex items-center justify-center shadow-md">
              <Package className="w-5 h-5" />
            </div>

            <div>
              <h3 className="font-bold text-[var(--color-idea-text)] text-lg leading-tight">
                New Request
              </h3>

              <p className="text-[10px] text-[var(--color-idea-muted)] mt-0.5">
                Ask for items or assets
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-[var(--color-idea-light-grey)] text-[var(--color-idea-muted)] hover:text-[var(--color-idea-text)] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">

          {/* Requested By */}
          <div>
            <label className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-idea-muted)] mb-1.5 block">
              Requester
            </label>

            <div className="p-3 bg-[var(--color-idea-light-grey)]/60 border border-[var(--color-idea-border)] rounded-xl text-xs font-semibold text-[var(--color-idea-text)] flex justify-between items-center">
              <span>{activeUser.name}</span>

              <span className="text-[9px] bg-[var(--color-idea-blue)]/10 text-[var(--color-idea-blue)] font-bold px-2 py-0.5 rounded-lg uppercase tracking-wider">
                {activeUser.role}
              </span>
            </div>
          </div>

          {/* Purpose */}
          <div>
            <label className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-idea-muted)] mb-1.5 block">
              Purpose <span className="text-[var(--color-idea-red)]">*</span>
            </label>

            <input
              type="text"
              required
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              placeholder="e.g. Capstone IoT Wireless Sensor Mesh"
              className="idea-input w-full px-3 py-2.5 text-xs"
            />
          </div>

          {/* Deadline */}
          <div>
            <label className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-idea-muted)] mb-1.5 block">
              Return By <span className="text-[var(--color-idea-red)]">*</span>
            </label>

            <input
              type="datetime-local"
              required
              min={new Date(Date.now() + 60_000).toISOString().slice(0, 16)}
              value={deadlineAt}
              onChange={(e) => setDeadlineAt(e.target.value)}
              className="idea-input w-full px-3 py-2.5 text-xs"
            />
          </div>

          {/* Items */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-idea-muted)]">
                Items
              </label>

              <button
                type="button"
                onClick={handleAddItem}
                className="text-[10px] text-[var(--color-idea-blue)] font-bold hover:text-[var(--color-idea-deep-blue)] flex items-center gap-1 cursor-pointer bg-[var(--color-idea-blue)]/10 px-2 py-1 rounded-lg"
              >
                <Plus className="w-3 h-3" />
                Add Line
              </button>
            </div>

            <div className="space-y-2.5 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
              {requestItems.map((item, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-xl border border-[var(--color-idea-border)] bg-[var(--color-idea-light-grey)]/30 space-y-2.5 hover:border-[var(--color-idea-blue)]/30 transition-colors"
                >
                  <div className="flex gap-2 w-full">

                    {/* Type */}
                    <div className="w-1/3 shrink-0">
                      <select
                        value={item.kind}
                        onChange={(event) =>
                          handleKindChange(
                            idx,
                            event.target.value as RequestLineDraft['kind']
                          )
                        }
                        className="idea-input w-full px-2 py-2 text-xs font-medium"
                      >
                        <option value="CATALOG">Item</option>
                        <option value="ASSET">Asset</option>
                      </select>
                    </div>

                    {/* Selection */}
                    <div className="flex-1 min-w-0">
                      {item.kind === 'ASSET' ? (
                        <select
                          value={
                            availableAssets.some(
                              (asset) => asset.id === item.asset_id
                            )
                              ? item.asset_id
                              : ''
                          }
                          onChange={(event) =>
                            handleItemChange(
                              idx,
                              'asset_id',
                              event.target.value
                            )
                          }
                          className="idea-input w-full px-3 py-2 text-xs truncate"
                        >
                          <option value="" disabled>
                            Select asset…
                          </option>

                          {availableAssets.map((asset) => (
                            <option key={asset.id} value={asset.id}>
                              {assetLabel(asset)}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <select
                          value={
                            catalogItems.some(
                              (catalog) =>
                                catalog.id === item.catalog_item_id
                            )
                              ? item.catalog_item_id
                              : ''
                          }
                          onChange={(event) =>
                            handleItemChange(
                              idx,
                              'catalog_item_id',
                              event.target.value
                            )
                          }
                          className="idea-input w-full px-3 py-2 text-xs truncate"
                        >
                          <option value="" disabled>
                            Select item…
                          </option>

                          {catalogItems.map((catalog) => (
                            <option key={catalog.id} value={catalog.id}>
                              {catalog.name}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>

                    {/* Remove */}
                    {requestItems.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(idx)}
                        className="p-2 text-[var(--color-idea-muted)] hover:bg-[var(--color-idea-red)]/10 hover:text-[var(--color-idea-red)] rounded-lg transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {/* Catalog item options */}
                  {item.kind === 'CATALOG' && (
                    <div className="flex gap-2 w-full">

                      {/* Quantity */}
                      <div className="relative w-1/3 shrink-0">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-medium text-[var(--color-idea-muted)]">
                          Qty
                        </span>

                        <input
                          type="number"
                          min="1"
                          value={item.requested_qty}
                          onChange={(event) =>
                            handleItemChange(
                              idx,
                              'requested_qty',
                              Number(event.target.value)
                            )
                          }
                          className="idea-input w-full pl-9 pr-2 py-2 text-xs font-medium text-center"
                        />
                      </div>

                      {/* Usage */}
                      <div className="flex-1 min-w-0">
                        <select
                          value={item.usage || 'CONSUMABLE'}
                          onChange={(event) =>
                            handleItemChange(
                              idx,
                              'usage',
                              event.target.value
                            )
                          }
                          className="idea-input w-full px-3 py-2 text-xs font-medium truncate"
                        >
                          <option value="CONSUMABLE">
                            Consumable
                          </option>

                          <option value="REUSABLE">
                            Reusable
                          </option>
                        </select>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Remarks */}
          <div>
            <label className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-idea-muted)] mb-1.5 block">
              Notes
            </label>

            <input
              type="text"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="e.g. Needed for Friday lab demonstration"
              className="idea-input w-full px-3 py-2.5 text-xs"
            />
          </div>

          {/* Footer Actions */}
          <div className="pt-3 border-t border-[var(--color-idea-border)] flex gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 py-3 bg-[var(--color-idea-light-grey)] border border-[var(--color-idea-border)] text-[var(--color-idea-text)] text-xs font-bold rounded-xl hover:brightness-95 transition-all cursor-pointer disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 py-3 idea-button text-xs font-bold rounded-xl shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70"
            >
              {isSubmitting ? (
                <span>Submitting…</span>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Submit Request
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
