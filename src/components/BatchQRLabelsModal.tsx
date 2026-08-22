import React, { useEffect, useRef } from "react";
import { Printer, Download, QrCode } from "lucide-react";
import { Asset, CatalogItem, Location } from "../types/inventory";
import QRCode from "qrcode";

interface BatchQRLabelsModalProps {
  assets: Asset[];
  catalogItems: CatalogItem[];
  locations: Location[];
}

export const BatchQRLabelsModal: React.FC<BatchQRLabelsModalProps> = ({
  assets,
  catalogItems,
  locations,
}) => {
  const [filterType, setFilterType] = React.useState<
    "ASSETS" | "CATALOG" | "LOCATIONS"
  >("ASSETS");

  const getItemsToPrint = () => {
    if (filterType === "ASSETS") {
      return assets.map((a) => {
        const cat = catalogItems.find((c) => c.id === a.catalog_item_id);
        return {
          code: a.asset_code,
          title: cat?.name || a.asset_code,
          subtitle: a.serial_number
            ? `SN: ${a.serial_number}`
            : "Tracked Asset",
        };
      });
    } else if (filterType === "CATALOG") {
      return catalogItems.map((c) => ({
        code: c.item_code,
        title: c.name,
        subtitle: `Type: ${c.type}`,
      }));
    } else {
      return locations.map((l) => ({
        code: l.code || l.name,
        title: l.name,
        subtitle: "Storage Location",
      }));
    }
  };

  const printItems = getItemsToPrint();

  return (
    <div className="flex-1 space-y-6 p-8 overflow-y-auto max-w-7xl mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
            Printable QR Sticker Sheets
          </h2>
          <p className="text-xs text-slate-500">
            Batch generate QR code stickers for lab equipment, boxes, and
            storage bins
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-2xl text-xs font-bold shadow-sm transition-all cursor-pointer"
          >
            <Printer className="w-4 h-4" /> Print Sticker Sheet
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-2">
        {(["ASSETS", "CATALOG", "LOCATIONS"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setFilterType(t)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              filterType === t
                ? "bg-blue-600 text-white shadow-sm"
                : "bg-slate-100 text-slate-600 hover:text-slate-900"
            }`}
          >
            {t === "ASSETS"
              ? "Tracked Assets"
              : t === "CATALOG"
                ? "Catalog Items"
                : "Locations"}
          </button>
        ))}
      </div>

      {/* Printable Sheet Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 p-6 bg-slate-100 rounded-3xl border border-slate-200 print-sheet-area">
        {printItems.map((item, idx) => (
          <QRStickerCard
            key={idx}
            code={item.code}
            title={item.title}
            subtitle={item.subtitle}
          />
        ))}
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
          width: 110,
          margin: 1,
          color: { dark: "#0f172a", light: "#ffffff" },
        },
        () => {},
      );
    }
  }, [code]);

  return (
    <div className="bg-white p-3 rounded-2xl border-2 border-slate-900 shadow-sm flex flex-col items-center text-center space-y-1.5 break-inside-avoid">
      <canvas ref={canvasRef} className="mx-auto" />
      <div>
        <p className="text-[11px] font-bold text-slate-900 leading-tight line-clamp-1">
          {title}
        </p>
        <p className="text-[9px] text-slate-500 line-clamp-1">{subtitle}</p>
        <p className="text-[10px] font-mono font-bold text-blue-600 bg-slate-100 px-2 py-0.5 rounded mt-1 inline-block border border-slate-200">
          {code}
        </p>
      </div>
    </div>
  );
};
