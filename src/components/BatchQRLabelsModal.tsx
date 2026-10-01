import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Printer, X } from 'lucide-react';
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
  code: string;
  title: string;
  /** Only shown when it adds information (e.g. a serial number). */
  subtitle?: string;
}

const ORG_NAME = 'AICTE IDEA Lab';

/**
 * Sizes are tuned to fill an A4 sheet (190 x 277 mm printable area, 10 mm margins).
 * QR image includes a 4-module quiet zone, so it scans reliably even when the
 * label sits next to text or the edge of a surface.
 *   small  : 5 columns x 6 rows = 30 labels per page
 *   medium : 4 columns x 5 rows = 20 labels per page
 *   large  : 3 columns x 3 rows =  9 labels per page
 */
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
  small: { name: 'Small', hint: '34 × 38 mm', cols: 5, rows: 6, w: 34, h: 38, qr: 25, title: 6.5, code: 5.5 },
  medium: { name: 'Medium', hint: '44 × 52 mm', cols: 4, rows: 5, w: 44, h: 52, qr: 32, title: 8, code: 6.5 },
  large: { name: 'Large', hint: '60 × 72 mm', cols: 3, rows: 3, w: 60, h: 72, qr: 46, title: 10, code: 8 },
};
const GAP_MM = 4;

const TYPES: { id: PrintType; label: string }[] = [
  { id: 'ASSETS', label: 'Assets' },
  { id: 'CATALOG', label: 'Catalog' },
  { id: 'LOCATIONS', label: 'Locations' },
];

// Generated once per code, shared by the preview and the print sheet.
const qrCache = new Map<string, string>();

const makeQr = (code: string) =>
  QRCode.toDataURL(code, {
    width: 600,
    margin: 4, // quiet zone, in modules
    errorCorrectionLevel: 'M',
    color: { dark: '#000000', light: '#ffffff' },
  });

// Long IDs (e.g. UUIDs) are unreadable at label size. The QR keeps the full value;
// the printed backup shows the tail, which is enough to match by eye.
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
  const [readyItems, setReadyItems] = useState<PrintItem[] | null>(null);

  const printItems = useMemo<PrintItem[]>(() => {
    switch (filterType) {
      case 'ASSETS':
        return assets.map((asset) => {
          const catalogItem = catalogItems.find((item) => item.id === asset.catalog_item_id);
          return {
            code: asset.asset_code || asset.id,
            title: catalogItem?.name || asset.asset_code || 'Unknown asset',
            subtitle: asset.serial_number ? `SN ${asset.serial_number}` : undefined,
          };
        });
      case 'CATALOG':
        return catalogItems.map((item) => ({ code: item.item_code || item.id, title: item.name }));
      case 'LOCATIONS':
        return locations.map((location) => ({ code: location.id, title: location.name }));
      default:
        return [];
    }
  }, [filterType, assets, catalogItems, locations]);

  // Build every QR image up front so printing never races the canvas/async work.
  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    (async () => {
      try {
        await Promise.all(
          printItems.map(async (item) => {
            if (!qrCache.has(item.code)) qrCache.set(item.code, await makeQr(item.code));
          })
        );
        if (!cancelled) setReadyItems(printItems);
      } catch (error) {
        console.error('Failed to generate QR codes:', error);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isOpen, printItems]);

  // Escape closes, and the page behind stops scrolling.
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose?.();
    window.addEventListener('keydown', onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = previous;
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const ready = readyItems === printItems;
  const spec = SIZES[size];
  const perPage = spec.cols * spec.rows;
  const pages = Math.max(1, Math.ceil(printItems.length / perPage));
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

  const renderGrid = () =>
    printItems.map((item, i) => (
      <LabelCard
        key={`${item.code}-${i}`}
        item={item}
        src={ready ? qrCache.get(item.code) : undefined}
        showOrg={size === 'large'}
      />
    ));

  const subtitle =
    printItems.length === 0
      ? 'Nothing to print in this category'
      : `${printItems.length} ${printItems.length === 1 ? 'label' : 'labels'} · ${pages} ${pages === 1 ? 'page' : 'pages'} on A4`;

  return (
    <>
      <style>{labelCss}</style>

      {/* Screen */}
      <div
        className="qr-screen-only fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/30 backdrop-blur-md p-0 sm:p-6"
        onMouseDown={(e) => e.target === e.currentTarget && onClose?.()}
      >
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="qr-modal-title"
          className="flex w-full max-w-4xl max-h-[94vh] max-h-[94dvh] flex-col overflow-hidden rounded-t-3xl sm:rounded-3xl bg-white shadow-[0_24px_80px_-12px_rgba(0,0,0,0.35)]"
        >
          <div className="mx-auto mt-2 h-1 w-9 shrink-0 rounded-full bg-black/15 sm:hidden" aria-hidden="true" />

          {/* Header */}
          <div className="flex items-start justify-between gap-4 px-4 pb-3 pt-3 sm:px-6 sm:pb-4 sm:pt-5">
            <div className="min-w-0">
              <h2
                id="qr-modal-title"
                className="text-[17px] font-semibold tracking-tight text-[var(--color-idea-text)]"
              >
                Print QR labels
              </h2>
              <p className="mt-0.5 text-[13px] text-[var(--color-idea-muted)]">{subtitle}</p>
            </div>
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-black/5 sm:h-8 sm:w-8 text-[var(--color-idea-muted)] transition-colors hover:bg-black/10 hover:text-[var(--color-idea-text)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--color-idea-blue)]"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Controls */}
          <div className="flex flex-col gap-3 px-4 pb-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-4 sm:px-6 sm:pb-4">
            <Segmented
              label="Label type"
              value={filterType}
              onChange={setFilterType}
              options={TYPES.map((t) => ({ id: t.id, label: t.label, badge: counts[t.id] }))}
            />
            <div className="flex flex-col gap-3 sm:ml-auto sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-4">
              <Segmented
                label="Label size"
                value={size}
                onChange={setSize}
                options={(Object.keys(SIZES) as LabelSize[]).map((s) => ({ id: s, label: SIZES[s].name }))}
              />
              <label className="flex cursor-pointer items-center justify-between gap-3 px-1 text-[14px] text-[var(--color-idea-text)] sm:justify-start sm:px-0 sm:text-[13px]">
                Cut guides
                <button
                  type="button"
                  role="switch"
                  aria-checked={guides}
                  onClick={() => setGuides((g) => !g)}
                  className={`relative h-[22px] w-[38px] rounded-full transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-idea-blue)] ${
                    guides ? 'bg-[var(--color-idea-blue)]' : 'bg-black/15'
                  }`}
                >
                  <span
                    className={`absolute left-[2px] top-[2px] h-[18px] w-[18px] rounded-full bg-white shadow transition-transform ${
                      guides ? 'translate-x-4' : 'translate-x-0'
                    }`}
                  />
                </button>
              </label>
            </div>
          </div>

          {/* Preview. Same markup and millimetre sizes as the printed sheet. */}
          <div className="flex-1 overflow-y-auto overscroll-contain bg-[#f5f5f7] px-3 py-4 sm:px-6 sm:py-5">
            {printItems.length === 0 ? (
              <div className="flex h-56 flex-col items-center justify-center text-center">
                <p className="text-[15px] font-medium text-[var(--color-idea-text)]">No labels yet</p>
                <p className="mt-1 text-[13px] text-[var(--color-idea-muted)]">
                  Add items to this category and they will show up here.
                </p>
              </div>
            ) : (
              <div className="mx-auto w-fit max-w-full rounded-xl bg-white p-3 shadow-sm ring-1 ring-black/5 sm:p-4">
                <div className={`qrl-grid ${guides ? 'qrl-guides' : ''}`} style={gridVars}>
                  {renderGrid()}
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex flex-col gap-3 border-t border-black/5 px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))] sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-6 sm:py-4">
            <p className="text-center text-[12px] leading-snug text-[var(--color-idea-muted)] sm:text-left">
              {spec.hint} per label. Print at 100% scale.
            </p>
            <button
              type="button"
              onClick={() => window.print()}
              disabled={printItems.length === 0 || !ready}
              className="inline-flex w-full shrink-0 items-center justify-center gap-2 rounded-full bg-[var(--color-idea-blue)] px-5 py-3 text-[15px] font-semibold sm:w-auto sm:py-2.5 sm:text-[13px] text-white transition active:scale-[0.98] hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-idea-blue)]"
            >
              <Printer className="h-4 w-4" />
              {ready ? 'Print' : 'Preparing…'}
            </button>
          </div>
        </div>
      </div>

      {/* Print sheet: lives on <body> so the rest of the app can be removed from print. */}
      {typeof document !== 'undefined' &&
        createPortal(
          <div id="qr-print-root">
            <div className={`qrl-grid ${guides ? 'qrl-guides' : ''}`} style={gridVars}>
              {renderGrid()}
            </div>
          </div>,
          document.body
        )}
    </>
  );
};

/* ------------------------------------------------------------------ */

interface SegmentedProps<T extends string> {
  label: string;
  value: T;
  onChange: (value: T) => void;
  options: { id: T; label: string; badge?: number }[];
}

function Segmented<T extends string>({ label, value, onChange, options }: SegmentedProps<T>) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className="flex w-full rounded-[10px] bg-black/[0.06] p-0.5 sm:inline-flex sm:w-auto"
    >
      {options.map((o) => {
        const active = o.id === value;
        return (
          <button
            key={o.id}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o.id)}
            className={`flex-1 whitespace-nowrap rounded-[8px] px-3 py-2 text-[13px] font-medium transition-all sm:flex-none sm:py-1.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--color-idea-blue)] ${
              active
                ? 'bg-white text-[var(--color-idea-text)] shadow-[0_1px_3px_rgba(0,0,0,0.12)]'
                : 'text-[var(--color-idea-muted)] hover:text-[var(--color-idea-text)]'
            }`}
          >
            {o.label}
            {o.badge !== undefined && (
              <span className="ml-1.5 tabular-nums text-[var(--color-idea-muted)] opacity-70">{o.badge}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}

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
