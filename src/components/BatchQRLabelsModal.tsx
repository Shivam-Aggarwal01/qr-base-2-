import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Printer, X, Search, CheckSquare, Square, QrCode } from 'lucide-react';
import QRCode from 'qrcode';
import { Asset, CatalogItem, Location } from '../types/inventory';

interface BatchQRLabelsModalProps {
  isOpen?: boolean;
  onClose?: () => void;
  assets: Asset[];
  catalogItems: CatalogItem[];
  locations: Location[];
}

type PrintType = 'ASSETS' | 'CATALOG' | 'LOCATIONS';
type LabelSize = 'small' | 'medium' | 'large';

interface PrintItem {
  id: string;
  code: string;
  title: string;
  subtitle?: string;
  tag?: string;
  status?: string;
}

const ORG_NAME = 'AICTE IDEA Lab';

const SIZES: Record<
  LabelSize,
  {
    name: string;
    hint: string;
    cols: number;
    rows: number;
    w: number;
    h: number;
    qr: number;
    title: number;
    code: number;
  }
> = {
  small: { name: 'Small', hint: '34 × 38 mm (30/page)', cols: 5, rows: 6, w: 34, h: 38, qr: 25, title: 6.5, code: 5.5 },
  medium: { name: 'Medium', hint: '44 × 52 mm (20/page)', cols: 4, rows: 5, w: 44, h: 52, qr: 32, title: 8, code: 6.5 },
  large: { name: 'Large', hint: '60 × 72 mm (9/page)', cols: 3, rows: 3, w: 60, h: 72, qr: 46, title: 10, code: 8 },
};
const GAP_MM = 4;

const TYPES: { id: PrintType; label: string }[] = [
  { id: 'ASSETS', label: 'Equipment' },
  { id: 'CATALOG', label: 'Instruments & Items' },
  { id: 'LOCATIONS', label: 'Storage Locations' },
];

const qrCache = new Map<string, string>();

const makeQr = (code: string) =>
  QRCode.toDataURL(code, {
    width: 600,
    margin: 4,
    errorCorrectionLevel: 'M',
    color: { dark: '#000000', light: '#ffffff' },
  });

const shortCode = (code: string) => (code.length > 16 ? `…${code.slice(-8)}` : code);

export const BatchQRLabelsModal: React.FC<BatchQRLabelsModalProps> = ({
  isOpen = true,
  onClose,
  assets,
  catalogItems,
  locations,
}) => {
  const [filterType, setFilterType] = useState<PrintType>('ASSETS');
  const [size, setSize] = useState<LabelSize>('medium');
  const [guides, setGuides] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [mobileTab, setMobileTab] = useState<'select' | 'preview'>('select');

  // Multi-group selection tracking
  const [selectedMap, setSelectedMap] = useState<Record<PrintType, Set<string>>>(() => ({
    ASSETS: new Set(assets.map((a) => a.asset_code || a.id)),
    CATALOG: new Set(catalogItems.map((c) => c.item_code || c.id)),
    LOCATIONS: new Set(locations.map((l) => l.id)),
  }));

  // Update selection sets if items change and haven't been touched
  useEffect(() => {
    setSelectedMap((prev) => ({
      ASSETS: prev.ASSETS.size === 0 ? new Set(assets.map((a) => a.asset_code || a.id)) : prev.ASSETS,
      CATALOG: prev.CATALOG.size === 0 ? new Set(catalogItems.map((c) => c.item_code || c.id)) : prev.CATALOG,
      LOCATIONS: prev.LOCATIONS.size === 0 ? new Set(locations.map((l) => l.id)) : prev.LOCATIONS,
    }));
  }, [assets, catalogItems, locations]);

  // Items per category
  const groupItems = useMemo<PrintItem[]>(() => {
    switch (filterType) {
      case 'ASSETS':
        return assets.map((asset) => {
          const catalogItem = catalogItems.find((item) => item.id === asset.catalog_item_id);
          const loc = locations.find((l) => l.id === asset.location_id);
          return {
            id: asset.id,
            code: asset.asset_code || asset.id,
            title: catalogItem?.name || asset.asset_code || 'Equipment Item',
            subtitle: asset.serial_number ? `SN: ${asset.serial_number}` : loc?.name,
            tag: loc?.name,
            status: asset.status,
          };
        });
      case 'CATALOG':
        return catalogItems.map((item) => ({
          id: item.id,
          code: item.item_code || item.id,
          title: item.name,
          subtitle: item.storage_place ? `Storage: ${item.storage_place}` : item.unit ? `Unit: ${item.unit}` : undefined,
          tag: item.storage_place || item.unit,
        }));
      case 'LOCATIONS':
        return locations.map((location) => ({
          id: location.id,
          code: location.code || location.id,
          title: location.name,
          subtitle: location.storage_path || 'Lab Location',
          tag: 'Location',
        }));
      default:
        return [];
    }
  }, [filterType, assets, catalogItems, locations]);

  // Filtered by search
  const filteredItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return groupItems;
    return groupItems.filter(
      (item) =>
        item.title.toLowerCase().includes(q) ||
        item.code.toLowerCase().includes(q) ||
        (item.subtitle && item.subtitle.toLowerCase().includes(q))
    );
  }, [groupItems, searchQuery]);

  const activeSelectedSet = selectedMap[filterType] || new Set();

  // Selected print items in current group
  const selectedPrintItems = useMemo(() => {
    return groupItems.filter((item) => activeSelectedSet.has(item.code));
  }, [groupItems, activeSelectedSet]);

  const [itemsToPrint, setItemsToPrint] = useState<PrintItem[]>([]);
  const [ready, setReady] = useState(false);

  // Sync itemsToPrint default to selectedPrintItems
  useEffect(() => {
    setItemsToPrint(selectedPrintItems.length > 0 ? selectedPrintItems : groupItems);
  }, [selectedPrintItems, groupItems]);

  // Handle Escape key
  useEffect(() => {
    if (!isOpen || !onClose) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Prevent background scrolling while open
  useEffect(() => {
    if (!isOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [isOpen]);

  // Pre-generate QR codes for active group
  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    setReady(false);

    (async () => {
      try {
        await Promise.all(
          groupItems.map(async (item) => {
            if (!qrCache.has(item.code)) {
              qrCache.set(item.code, await makeQr(item.code));
            }
          })
        );
        if (!cancelled) setReady(true);
      } catch (error) {
        console.error('Failed to generate QR codes:', error);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isOpen, groupItems]);

  // Toggle single item
  const toggleItem = (code: string) => {
    setSelectedMap((prev) => {
      const next = new Set(prev[filterType]);
      if (next.has(code)) {
        next.delete(code);
      } else {
        next.add(code);
      }
      return { ...prev, [filterType]: next };
    });
  };

  // Select all filtered items
  const handleSelectAll = () => {
    setSelectedMap((prev) => {
      const next = new Set(prev[filterType]);
      filteredItems.forEach((item) => next.add(item.code));
      return { ...prev, [filterType]: next };
    });
  };

  // Deselect all filtered items
  const handleDeselectAll = () => {
    setSelectedMap((prev) => {
      const next = new Set(prev[filterType]);
      filteredItems.forEach((item) => next.delete(item.code));
      return { ...prev, [filterType]: next };
    });
  };

  // Print selected
  const handlePrintSelected = () => {
    if (selectedPrintItems.length === 0) return;
    setItemsToPrint(selectedPrintItems);
    setTimeout(() => {
      window.print();
    }, 60);
  };

  // Print all
  const handlePrintAll = () => {
    if (groupItems.length === 0) return;
    setItemsToPrint(groupItems);
    setTimeout(() => {
      window.print();
    }, 60);
  };

  if (!isOpen) return null;

  const spec = SIZES[size];
  const perPage = spec.cols * spec.rows;
  const previewPages = Math.max(1, Math.ceil(selectedPrintItems.length / perPage));
  const counts: Record<PrintType, number> = {
    ASSETS: assets.length,
    CATALOG: catalogItems.length,
    LOCATIONS: locations.length,
  };

  const gridVars = {
    '--cols': spec.cols,
    '--w': `${spec.w}mm`,
    '--h': `${spec.h}mm`,
    '--qr': `${spec.qr}mm`,
    '--gap': `${GAP_MM}mm`,
    '--title': `${spec.title}pt`,
    '--code': `${spec.code}pt`,
  } as React.CSSProperties;

  const renderSelectedCards = () =>
    selectedPrintItems.map((item, i) => (
      <LabelCard
        key={`${item.code}-${i}`}
        item={item}
        src={ready ? qrCache.get(item.code) : undefined}
        showOrg={size === 'large'}
      />
    ));

  const renderPrintCards = () =>
    itemsToPrint.map((item, i) => (
      <LabelCard
        key={`print-${item.code}-${i}`}
        item={item}
        src={ready ? qrCache.get(item.code) : undefined}
        showOrg={size === 'large'}
      />
    ));

  return (
    <>
      <style>{labelCss}</style>

      {/* Screen Modal */}
      <div
        className="qr-screen-only fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-2 sm:p-4 lg:p-6"
        onMouseDown={(e) => e.target === e.currentTarget && onClose?.()}
      >
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="qr-modal-title"
          className="flex w-full max-w-5xl h-[92vh] h-[92dvh] max-h-[92dvh] flex-col overflow-hidden rounded-2xl sm:rounded-3xl bg-white shadow-2xl border border-slate-200"
        >
          {/* Top Header */}
          <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 sm:px-6 sm:py-4 shrink-0 bg-white">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-200/70 flex items-center justify-center text-[#0071e3] shrink-0">
                <QrCode className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 id="qr-modal-title" className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                    QR Sticker Studio
                  </h2>
                  <span className="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-blue-50 text-blue-700 border border-blue-200/50">
                    {selectedPrintItems.length} of {groupItems.length} Selected
                  </span>
                </div>
                <p className="text-xs text-slate-500">
                  Select lab items, customize sheet size, and print high-density QR stickers.
                </p>
              </div>
            </div>

            {onClose && (
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            )}
          </div>

          {/* Controls Bar: Group Selector, Size, Guides */}
          <div className="flex flex-col gap-3 border-b border-slate-100 bg-slate-50/70 px-4 py-2.5 sm:px-6 sm:py-3 shrink-0 lg:flex-row lg:items-center lg:justify-between">
            {/* Group Selection */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              <span className="text-xs font-semibold text-slate-500 mr-1 shrink-0">Group:</span>
              <div className="inline-flex rounded-xl bg-slate-200/80 p-0.5 shrink-0">
                {TYPES.map((t) => {
                  const active = filterType === t.id;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => {
                        setFilterType(t.id);
                        setSearchQuery('');
                      }}
                      className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                        active ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <span>{t.label}</span>
                      <span
                        className={`rounded-full px-1.5 py-0.2 text-[10px] font-mono ${
                          active ? 'bg-blue-50 text-[#0071e3]' : 'bg-slate-300/60 text-slate-600'
                        }`}
                      >
                        {counts[t.id]}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Sizing & Guides */}
            <div className="flex flex-wrap items-center gap-3 sm:gap-4 shrink-0">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-medium text-slate-500">Size:</span>
                <div className="inline-flex rounded-lg bg-slate-200/80 p-0.5">
                  {(Object.keys(SIZES) as LabelSize[]).map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setSize(s)}
                      className={`rounded-md px-2 py-1 text-xs font-medium transition-all cursor-pointer ${
                        size === s ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {SIZES[s].name}
                    </button>
                  ))}
                </div>
              </div>

              <label className="flex cursor-pointer items-center gap-2 text-xs font-medium text-slate-600 select-none">
                <span>Cut Guides</span>
                <input
                  type="checkbox"
                  checked={guides}
                  onChange={(e) => setGuides(e.target.checked)}
                  className="rounded text-[#0071e3] focus:ring-[#0071e3]"
                />
              </label>
            </div>
          </div>

          {/* Mobile Tab Switcher (< lg) */}
          <div className="flex border-b border-slate-200 bg-white lg:hidden shrink-0">
            <button
              type="button"
              onClick={() => setMobileTab('select')}
              className={`flex-1 py-2.5 text-center text-xs font-semibold border-b-2 cursor-pointer transition-colors ${
                mobileTab === 'select'
                  ? 'border-[#0071e3] text-[#0071e3]'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              1. Choose Stickers ({selectedPrintItems.length})
            </button>
            <button
              type="button"
              onClick={() => setMobileTab('preview')}
              className={`flex-1 py-2.5 text-center text-xs font-semibold border-b-2 cursor-pointer transition-colors ${
                mobileTab === 'preview'
                  ? 'border-[#0071e3] text-[#0071e3]'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              2. Sheet Preview ({selectedPrintItems.length})
            </button>
          </div>

          {/* Main Dual-Pane Body */}
          <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 overflow-hidden">
            {/* Left Column: Item Selection List */}
            <div
              className={`lg:col-span-5 border-r border-slate-200 bg-white flex flex-col min-h-0 overflow-hidden ${
                mobileTab === 'preview' ? 'hidden lg:flex' : 'flex'
              }`}
            >
              {/* Search & Bulk Selection Toolbar */}
              <div className="p-3 border-b border-slate-100 bg-slate-50/50 space-y-2.5 shrink-0">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by name, ID or code..."
                    className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-[#0071e3] focus:ring-1 focus:ring-[#0071e3]"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <div className="flex items-center justify-between text-xs text-slate-600 pt-0.5">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleSelectAll}
                      className="text-[11px] font-semibold text-[#0071e3] hover:underline cursor-pointer"
                    >
                      Select All
                    </button>
                    <span className="text-slate-300">•</span>
                    <button
                      type="button"
                      onClick={handleDeselectAll}
                      className="text-[11px] font-medium text-slate-500 hover:text-slate-800 cursor-pointer"
                    >
                      Deselect All
                    </button>
                  </div>
                  <span className="text-[11px] font-mono font-medium text-slate-500">
                    {selectedPrintItems.length} selected
                  </span>
                </div>
              </div>

              {/* Scrollable List of Items with Checkboxes */}
              <div className="flex-1 overflow-y-auto divide-y divide-slate-100 min-h-0 overscroll-contain">
                {groupItems.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-500">
                    No items found in {TYPES.find((t) => t.id === filterType)?.label}.
                  </div>
                ) : filteredItems.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-500">
                    No items match &quot;{searchQuery}&quot;.
                  </div>
                ) : (
                  filteredItems.map((item) => {
                    const isSelected = activeSelectedSet.has(item.code);
                    return (
                      <div
                        key={item.code}
                        onClick={() => toggleItem(item.code)}
                        className={`flex items-center gap-3 px-3.5 py-2.5 transition-colors cursor-pointer select-none ${
                          isSelected ? 'bg-blue-50/40 hover:bg-blue-50/70' : 'hover:bg-slate-50'
                        }`}
                      >
                        <button
                          type="button"
                          className="shrink-0 text-slate-400 focus:outline-none"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleItem(item.code);
                          }}
                        >
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-[#0071e3]" />
                          ) : (
                            <Square className="w-4 h-4 text-slate-300" />
                          )}
                        </button>

                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-semibold text-slate-900 truncate">{item.title}</p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-[10px] font-mono text-slate-500 bg-slate-100 rounded px-1 py-0.2">
                              {shortCode(item.code)}
                            </span>
                            {item.subtitle && (
                              <span className="text-[10px] text-slate-400 truncate">{item.subtitle}</span>
                            )}
                          </div>
                        </div>

                        {item.tag && (
                          <span className="shrink-0 text-[10px] font-medium text-slate-500 bg-slate-100 rounded-full px-2 py-0.5 truncate max-w-[100px]">
                            {item.tag}
                          </span>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Right Column: Live Printable Sheet Preview */}
            <div
              className={`lg:col-span-7 bg-[#f5f5f7] flex flex-col min-h-0 overflow-hidden ${
                mobileTab === 'select' ? 'hidden lg:flex' : 'flex'
              }`}
            >
              {/* Preview Status Bar */}
              <div className="px-4 py-2 border-b border-slate-200 bg-white/80 backdrop-blur-xs flex items-center justify-between text-xs text-slate-600 shrink-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-slate-800">Print Preview:</span>
                  <span className="text-[11px] text-slate-500">
                    {selectedPrintItems.length === 0
                      ? 'No items selected'
                      : `${selectedPrintItems.length} stickers · ${previewPages} ${
                          previewPages === 1 ? 'page' : 'pages'
                        } on A4`}
                  </span>
                </div>
                <span className="text-[11px] text-slate-400">{spec.hint}</span>
              </div>

              {/* Scrollable Sheet Canvas */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 min-h-0 overscroll-contain flex flex-col items-center">
                {selectedPrintItems.length === 0 ? (
                  <div className="my-auto py-12 text-center max-w-sm">
                    <QrCode className="mx-auto w-10 h-10 text-slate-300" />
                    <p className="mt-3 text-sm font-semibold text-slate-700">No stickers selected</p>
                    <p className="mt-1 text-xs text-slate-500 leading-relaxed">
                      Select specific items from the left list or click &quot;Select All&quot; to preview and print stickers.
                    </p>
                    <button
                      type="button"
                      onClick={handleSelectAll}
                      className="mt-4 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-blue-50 text-[#0071e3] border border-blue-200/60 hover:bg-blue-100 transition-colors cursor-pointer"
                    >
                      <span>Select All Items</span>
                    </button>
                  </div>
                ) : (
                  <div className="w-fit max-w-full rounded-2xl bg-white p-4 sm:p-6 shadow-md ring-1 ring-black/5 transition-all">
                    <div className="mb-2 text-center text-[10px] font-semibold text-slate-400 uppercase tracking-widest border-b border-dashed border-slate-200 pb-1.5">
                      Standard A4 Sheet Layout · Ready to Print
                    </div>
                    <div className={`qrl-grid ${guides ? 'qrl-guides' : ''}`} style={gridVars}>
                      {renderSelectedCards()}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Modal Footer */}
          <div className="border-t border-slate-200 bg-white px-4 py-3 sm:px-6 sm:py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
            <div className="text-[11px] text-slate-500 leading-snug">
              <span>Layout: {spec.name} ({spec.hint}) · Compatible with standard adhesive sticker sheets.</span>
            </div>

            <div className="flex items-center gap-2.5 shrink-0">
              {/* Print All in Group */}
              <button
                type="button"
                onClick={handlePrintAll}
                disabled={groupItems.length === 0 || !ready}
                className="flex-1 sm:flex-initial px-3.5 py-2 text-xs font-semibold rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer text-center"
                title={`Print all ${groupItems.length} stickers in this category`}
              >
                Print All ({groupItems.length})
              </button>

              {/* Print Selected */}
              <button
                type="button"
                onClick={handlePrintSelected}
                disabled={selectedPrintItems.length === 0 || !ready}
                className="flex-1 sm:flex-initial idea-button flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl text-white shadow-2xs hover:brightness-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                title={`Print only the ${selectedPrintItems.length} selected stickers`}
              >
                <Printer className="w-4 h-4" />
                <span>
                  {ready
                    ? selectedPrintItems.length > 0
                      ? `Print Selected (${selectedPrintItems.length})`
                      : 'Print Selected'
                    : 'Preparing…'}
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Print sheet: mounted via portal on document.body for pristine print output */}
      {typeof document !== 'undefined' &&
        createPortal(
          <div id="qr-print-root">
            <div className={`qrl-grid ${guides ? 'qrl-guides' : ''}`} style={gridVars}>
              {renderPrintCards()}
            </div>
          </div>,
          document.body
        )}
    </>
  );
};

/* ------------------------------------------------------------------ */

interface LabelCardProps {
  item: PrintItem;
  src?: string;
  showOrg: boolean;
}

const LabelCard: React.FC<LabelCardProps> = ({ item, src, showOrg }) => (
  <div className="qrl">
    {showOrg && <div className="qrl-org">{ORG_NAME}</div>}
    {src ? (
      <img className="qrl-qr" src={src} alt={`QR code for ${item.code}`} />
    ) : (
      <div className="qrl-qr qrl-pending" aria-hidden="true" />
    )}
    <div className="qrl-text">
      <p className="qrl-title">{item.title}</p>
      {item.subtitle && <p className="qrl-sub">{item.subtitle}</p>}
      <p className="qrl-code">{shortCode(item.code)}</p>
    </div>
  </div>
);

const labelCss = `
  .qrl-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, var(--w));
    gap: var(--gap);
    justify-content: center;
  }
  .qrl {
    box-sizing: border-box;
    width: var(--w);
    height: var(--h);
    padding: 2.5mm;
    display: flex;
    flex-direction: column;
    align-items: center;
    background: #fff;
    color: #000;
    border: 0.25mm solid transparent;
    border-radius: 2mm;
    text-align: center;
    break-inside: avoid;
    page-break-inside: avoid;
    font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Helvetica Neue', Arial, sans-serif;
  }
  .qrl-guides .qrl { border-color: #b8b8b8; }
  .qrl-org {
    font-size: 5.5pt;
    font-weight: 600;
    letter-spacing: 0.04em;
    color: #555;
    margin-bottom: 1mm;
  }
  .qrl-qr { width: var(--qr); height: var(--qr); flex: none; display: block; }
  .qrl-pending { background: #f2f2f4; border-radius: 1mm; }
  .qrl-text {
    flex: 1;
    min-height: 0;
    width: 100%;
    margin-top: 1.5mm;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: flex-start;
    gap: 0.6mm;
    overflow: hidden;
  }
  .qrl-title {
    margin: 0;
    width: 100%;
    font-size: var(--title);
    font-weight: 600;
    line-height: 1.2;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
    overflow-wrap: anywhere;
  }
  .qrl-sub {
    margin: 0;
    width: 100%;
    font-size: var(--code);
    color: #444;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .qrl-code {
    margin: 0;
    width: 100%;
    font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    font-size: var(--code);
    letter-spacing: 0.02em;
    color: #000;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  @media screen {
    #qr-print-root { display: none; }
  }

  @media print {
    @page { size: A4; margin: 10mm; }
    html, body { margin: 0 !important; padding: 0 !important; background: #fff !important; }
    body > *:not(#qr-print-root) { display: none !important; }
    #qr-print-root { display: block !important; }
    #qr-print-root .qrl-grid {
      grid-template-columns: repeat(var(--cols), var(--w));
      justify-content: start;
    }
    #qr-print-root .qrl, #qr-print-root img {
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
  }
`;
