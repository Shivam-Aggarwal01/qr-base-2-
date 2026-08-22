import React, { useEffect, useRef, useState } from "react";
import { X, Download, Printer, Copy, Check } from "lucide-react";
import QRCode from "qrcode";

interface QRGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  code: string;
  title: string;
  subtitle?: string;
  typeBadge?: string;
}

export const QRGeneratorModal: React.FC<QRGeneratorModalProps> = ({
  isOpen,
  onClose,
  code,
  title,
  subtitle,
  typeBadge,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isOpen && code && canvasRef.current) {
      QRCode.toCanvas(
        canvasRef.current,
        code,
        {
          width: 240,
          margin: 2,
          color: {
            dark: "#0f172a",
            light: "#ffffff",
          },
        },
        (error) => {
          if (error) console.error("QR generation error:", error);
        },
      );
    }
  }, [isOpen, code]);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    if (!canvasRef.current) return;
    const link = document.createElement("a");
    link.download = `QR_${code}.png`;
    link.href = canvasRef.current.toDataURL("image/png");
    link.click();
  };

  const handlePrint = () => {
    window.print();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-sm overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <span className="text-xs font-bold uppercase tracking-widest text-slate-400">
            QR Code Label
          </span>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-slate-200 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Label Card Body (Printable Area) */}
        <div className="p-6 text-center flex flex-col items-center space-y-4 printable-label">
          {typeBadge && (
            <span className="bg-blue-50 text-blue-700 text-[10px] px-3 py-1 rounded-full font-bold uppercase tracking-widest">
              {typeBadge}
            </span>
          )}

          <div className="p-3 bg-white rounded-2xl border-2 border-slate-900 shadow-md inline-block">
            <canvas ref={canvasRef} className="mx-auto" />
          </div>

          <div>
            <h3 className="text-lg font-bold text-slate-900 leading-tight">
              {title}
            </h3>
            {subtitle && (
              <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>
            )}
            <p className="text-sm font-mono font-bold text-blue-600 mt-2 bg-slate-100 px-3 py-1 rounded-lg inline-block border border-slate-200">
              {code}
            </p>
          </div>
        </div>

        {/* Action Toolbar */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center gap-2">
          <button
            onClick={handleCopy}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-100 transition-all cursor-pointer"
          >
            {copied ? (
              <Check className="w-4 h-4 text-emerald-600" />
            ) : (
              <Copy className="w-4 h-4" />
            )}
            <span>{copied ? "Copied" : "Copy Code"}</span>
          </button>
          <button
            onClick={handleDownload}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition-all cursor-pointer shadow-sm"
          >
            <Download className="w-4 h-4" />
            <span>Download</span>
          </button>
          <button
            onClick={handlePrint}
            title="Print Sticker Label"
            className="p-2.5 bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition-all cursor-pointer"
          >
            <Printer className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
