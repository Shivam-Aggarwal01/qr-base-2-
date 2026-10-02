import React, { useEffect, useState } from 'react';
import { Asset, CatalogItem, RequestLineDraft, RequestUsage, User } from '../types/inventory';
import { createRequestFirestore } from '../services/firebaseCollections';
import { useFocusTrap } from '../shared/lib/focusTrap';

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
          ? { ...item, usage: item.usage || 'CONSUMABLE' }
          : { kind: 'ASSET', asset_id: item.asset_id || '', requested_qty: 1 }
      );
    }
    return [{ kind: 'CATALOG', catalog_item_id: catalogItems[0]?.id || '', requested_qty: 1, usage: 'CONSUMABLE' }];
  };

  const [requestItems, setRequestItems] = useState<RequestLineDraft[]>(getInitialItems());
  const modalRef = useFocusTrap(isOpen);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

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
      { kind: 'CATALOG', catalog_item_id: catalogItems[0]?.id || '', requested_qty: 1, usage: 'CONSUMABLE' },
    ]);
  };

  const handleRemoveItem = (index: number) => {
    if (requestItems.length === 1) return;
    setRequestItems(requestItems.filter((_, idx) => idx !== index));
  };

  const handleKindChange = (index: number, kind: RequestLineDraft['kind']) => {
    const updated = [...requestItems];
    if (kind === 'ASSET') {
      updated[index] = { kind: 'ASSET', asset_id: availableAssets[0]?.id || '', requested_qty: 1 };
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
    } else if (field === 'catalog_item_id') {
      current.catalog_item_id = String(value);
    }
    updated[index] = current;
    setRequestItems(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!purpose.trim()) return alert('Please enter project purpose.');
    if (!deadlineAt) return alert('Please choose a return deadline.');
    if (new Date(deadlineAt).getTime() <= Date.now()) return alert('Deadline must be in the future.');

    const invalidCatalog = requestItems.some(
      (item) => item.kind === 'CATALOG' && (!item.catalog_item_id || item.requested_qty <= 0)
    );
    const invalidAsset = requestItems.some((item) => item.kind === 'ASSET' && !item.asset_id);
    if (invalidCatalog || invalidAsset) return alert('Please select valid items.');

    const requestNumber = `REQ-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(100 + Math.random() * 900)}`;
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
            if (item.catalog_item_id) line.catalog_item_id = item.catalog_item_id;
            if (item.usage) line.usage = item.usage;
          }
          if (item.kind === 'ASSET' && item.asset_id) {
            line.asset_id = item.asset_id;
          }
          return line;
        }),
      });
      onRefreshData();
      onClose();
    } catch (error: any) {
      alert(error?.message || 'Failed to create request.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const assetLabel = (asset: Asset) =>
    [asset.name, asset.serial_number ? `SN: ${asset.serial_number}` : ''].filter(Boolean).join(' · ');

  return (
    <div
      className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="new-request-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        ref={modalRef}
        tabIndex={-1}
        className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col border border-[var(--color-idea-border)] focus:outline-none"
      >
        <div className="px-6 py-5 border-b border-[var(--color-idea-border)] flex items-center justify-between">
          <h3 id="new-request-title" className="font-semibold text-[var(--color-idea-text)] text-lg tracking-tight">
            New Request
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close new request modal"
            className="text-[var(--color-idea-muted)] hover:text-[var(--color-idea-text)] transition-colors text-2xl font-light leading-none cursor-pointer focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none p-1 rounded-lg"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6 overflow-y-auto max-h-[80vh]">
          <div>
            <label className="text-[10px] font-medium text-[var(--color-idea-muted)] uppercase tracking-widest mb-2 block">
              Requester
            </label>
            <div className="px-4 py-3 bg-[var(--color-idea-light-grey)]/60 rounded-2xl text-sm text-[var(--color-idea-text)] flex justify-between items-center border border-[var(--color-idea-border)]">
              <span className="font-medium">{activeUser.name}</span>
              <span className="text-[10px] font-medium text-[var(--color-idea-muted)] tracking-wider uppercase">
                {activeUser.role}
              </span>
            </div>
          </div>

          <div>
            <label className="text-[10px] font-medium text-[var(--color-idea-muted)] uppercase tracking-widest mb-2 block">
              Purpose
            </label>
            <input
              type="text"
              required
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              placeholder="Enter project or usage purpose"
              className="w-full px-4 py-3 bg-[var(--color-idea-light-grey)]/30 border border-[var(--color-idea-border)] rounded-2xl text-sm outline-none focus:border-[var(--color-idea-blue)] transition-colors placeholder:text-gray-400"
            />
          </div>

          <div>
            <label className="text-[10px] font-medium text-[var(--color-idea-muted)] uppercase tracking-widest mb-2 block">
              Return Date
            </label>
            <input
              type="datetime-local"
              required
              min={new Date(Date.now() + 60_000).toISOString().slice(0, 16)}
              value={deadlineAt}
              onChange={(e) => setDeadlineAt(e.target.value)}
              className="w-full px-4 py-3 bg-[var(--color-idea-light-grey)]/30 border border-[var(--color-idea-border)] rounded-2xl text-sm outline-none focus:border-[var(--color-idea-blue)] transition-colors"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-[10px] font-medium text-[var(--color-idea-muted)] uppercase tracking-widest">
                Items
              </label>
              <button
                type="button"
                onClick={handleAddItem}
                className="text-xs text-[var(--color-idea-blue)] font-medium hover:opacity-80 transition-opacity"
              >
                + Add Item
              </button>
            </div>

            <div className="space-y-3">
              {requestItems.map((item, idx) => (
                <div key={idx} className="p-4 rounded-2xl border border-[var(--color-idea-border)] bg-white space-y-3">
                  <div className="flex gap-3">
                    <select
                      value={item.kind}
                      onChange={(e) => handleKindChange(idx, e.target.value as RequestLineDraft['kind'])}
                      className="w-1/3 px-3 py-2 bg-[var(--color-idea-light-grey)]/30 border border-[var(--color-idea-border)] rounded-xl text-sm outline-none"
                    >
                      <option value="CATALOG">Catalog</option>
                      <option value="ASSET">Asset</option>
                    </select>

                    <div className="flex-1">
                      {item.kind === 'ASSET' ? (
                        <select
                          value={availableAssets.some((a) => a.id === item.asset_id) ? item.asset_id : ''}
                          onChange={(e) => handleItemChange(idx, 'asset_id', e.target.value)}
                          className="w-full px-3 py-2 bg-[var(--color-idea-light-grey)]/30 border border-[var(--color-idea-border)] rounded-xl text-sm outline-none"
                        >
                          <option value="" disabled>
                            Select asset...
                          </option>
                          {availableAssets.map((asset) => (
                            <option key={asset.id} value={asset.id}>
                              {assetLabel(asset)}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <select
                          value={catalogItems.some((c) => c.id === item.catalog_item_id) ? item.catalog_item_id : ''}
                          onChange={(e) => handleItemChange(idx, 'catalog_item_id', e.target.value)}
                          className="w-full px-3 py-2 bg-[var(--color-idea-light-grey)]/30 border border-[var(--color-idea-border)] rounded-xl text-sm outline-none"
                        >
                          <option value="" disabled>
                            Select item...
                          </option>
                          {catalogItems.map((catalog) => (
                            <option key={catalog.id} value={catalog.id}>
                              {catalog.name}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                  </div>

                  {item.kind === 'CATALOG' && (
                    <div className="flex gap-3">
                      <input
                        type="number"
                        min="1"
                        value={item.requested_qty}
                        onChange={(e) => handleItemChange(idx, 'requested_qty', Number(e.target.value))}
                        className="w-1/3 px-3 py-2 bg-[var(--color-idea-light-grey)]/30 border border-[var(--color-idea-border)] rounded-xl text-sm outline-none placeholder:text-gray-400"
                        placeholder="Qty"
                      />
                      <select
                        value={item.usage || 'CONSUMABLE'}
                        onChange={(e) => handleItemChange(idx, 'usage', e.target.value)}
                        className="flex-1 px-3 py-2 bg-[var(--color-idea-light-grey)]/30 border border-[var(--color-idea-border)] rounded-xl text-sm outline-none"
                      >
                        <option value="CONSUMABLE">Consumable</option>
                        <option value="REUSABLE">Reusable</option>
                      </select>
                    </div>
                  )}

                  {requestItems.length > 1 && (
                    <div className="pt-2 flex justify-end">
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(idx)}
                        className="text-[11px] text-[var(--color-idea-red)] hover:opacity-80 font-medium transition-opacity"
                      >
                        Remove
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div>
            <label className="text-[10px] font-medium text-[var(--color-idea-muted)] uppercase tracking-widest mb-2 block">
              Notes
            </label>
            <input
              type="text"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="Optional remarks or details"
              className="w-full px-4 py-3 bg-[var(--color-idea-light-grey)]/30 border border-[var(--color-idea-border)] rounded-2xl text-sm outline-none focus:border-[var(--color-idea-blue)] transition-colors placeholder:text-gray-400"
            />
          </div>

          <div className="pt-4 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 py-3 bg-[var(--color-idea-light-grey)] text-[var(--color-idea-text)] text-sm font-semibold rounded-2xl hover:bg-gray-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 py-3 bg-[var(--color-idea-deep-blue)] text-white text-sm font-semibold rounded-2xl hover:bg-[var(--color-idea-blue)] transition-colors disabled:opacity-50"
            >
              {isSubmitting ? 'Submitting...' : 'Submit'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
