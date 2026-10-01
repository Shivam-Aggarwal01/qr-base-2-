import React, { useEffect, useRef, useState } from 'react';
import { Printer, X, Tag } from 'lucide-react';
import { Asset, CatalogItem, Location } from '../types/inventory';
import QRCode from 'qrcode';

interface BatchQRLabelsModalProps {
  isOpen?: boolean;
  onClose?: () => void;
  assets: Asset[];
  catalogItems: CatalogItem[];
  locations: Location[];
}

export const BatchQRLabelsModal: React.FC<BatchQRLabelsModalProps> = ({
  isOpen = true,
  onClose,
  assets,
  catalogItems,
  locations,
}) => {
  const [filterType, setFilterType] = useState<'ASSETS' | 'CATALOG' | 'LOCATIONS'>('ASSETS');

  if (!isOpen) return null;

  const getItemsToPrint = () => {
    if (filterType === 'ASSETS') {
      return assets.map((a) => {
        const cat = catalogItems.find((c) => c.id === a.catalog_item_id);
        return {
          code: a.id,
          title: cat?.name || a.asset_code,
          subtitle: a.serial_number ? `SN: ${a.serial_number}` : 'Tracked Asset',
        };
      });
    } else if (filterType === 'CATALOG') {
      return catalogItems.map((c) => ({
        code: c.id,
        title: c.name,
        subtitle: 'Inventory Item',
      }));
    } else {
      return locations.map((l) => ({
        code: l.id,
        title: l.name,
        subtitle: 'Storage Location',
      }));
    }
  };

  const printItems = getItemsToPrint();

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-[var(--color-idea-border)] w-full max-w-5xl max-h-[92vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-5 sm:px-6 py-4 border-b border-[var(--color-idea-border)] flex items-center justify-between bg-[var(--color-idea-light-grey)]/60 shrink-0">
          <div>
            <span className="text-[9px] font-bold uppercase tracking-[0.18em] text-[var(--color-idea-blue)]">
              AICTE IDEA LAB · BATCH PRINT
            </span>
            <h3 className="font-bold text-[var(--color-idea-text)] text-base sm:text-lg leading-tight">
              QR Sticker Sheets
            </h3>
            <p className="text-xs text-[var(--color-idea-muted)] mt-0.5 hidden sm:block">
              Batch generate printable QR sticker labels for lab equipment, boxes, and storage bins.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="idea-button flex items-center justify-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-xl shadow-xs cursor-pointer min-h-[40px]"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Sheet</span>
            </button>

            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="p-2 rounded-xl hover:bg-[var(--color-idea-light-grey)] text-[var(--color-idea-muted)] hover:text-[var(--color-idea-text)] transition-colors min-h-[40px] min-w-[40px] flex items-center justify-center cursor-pointer"
                aria-label="Close batch printer"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        {/* Filter Toolbar */}
        <div className="p-3 sm:p-4 border-b border-[var(--color-idea-border)] flex items-center gap-2 bg-white shrink-0 overflow-x-auto">
          {(['ASSETS', 'CATALOG', 'LOCATIONS'] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setFilterType(t)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                filterType === t
                  ? 'bg-[var(--color-idea-blue)] text-white shadow-xs'
                  : 'bg-[var(--color-idea-light-grey)] text-[var(--color-idea-muted)] hover:text-[var(--color-idea-text)]'
              }`}
            >
              {t === 'ASSETS' ? `Tracked Assets (${assets.length})` : t === 'CATALOG' ? `Catalog Items (${catalogItems.length})` : `Locations (${locations.length})`}
            </button>
          ))}
        </div>

        {/* Printable Sheet Grid */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 bg-[var(--color-idea-background)]">
          {printItems.length === 0 ? (
            <div className="p-12 text-center text-[var(--color-idea-muted)] text-xs">
              No items found in this category.
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4 print-sheet-area">
              {printItems.map((item, idx) => (
                <QRStickerCard key={idx} code={item.code} title={item.title} subtitle={item.subtitle} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const QRStickerCard: React.FC<{
  code: string;
  title: string;
  subtitle: string;
}> = ({ code, title, subtitle }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (code && canvasRef.current) {
      QRCode.toCanvas(
        canvasRef.current,
        code,
        {
          width: 105,
          margin: 1,
          color: { dark: '#172b3a', light: '#ffffff' },
        },
        () => {}
      );
    }
  }, [code]);

  return (
    <div className="bg-white p-3 rounded-xl border border-[var(--color-idea-border)] shadow-xs flex flex-col items-center text-center space-y-1.5 break-inside-avoid">
      <span className="text-[8px] font-bold uppercase tracking-widest text-[var(--color-idea-blue)]">
        AICTE IDEA LAB
      </span>
      <canvas ref={canvasRef} className="mx-auto" />
      <div className="w-full">
        <p className="text-[11px] font-bold text-[var(--color-idea-text)] leading-tight truncate">{title}</p>
        <p className="text-[9px] text-[var(--color-idea-muted)] truncate">{subtitle}</p>
        <p className="text-[9px] font-mono font-semibold text-[var(--color-idea-deep-blue)] bg-[var(--color-idea-light-grey)] px-1.5 py-0.5 rounded mt-1 inline-block truncate max-w-full">
          {code}
        </p>
      </div>
    </div>
  );
};
