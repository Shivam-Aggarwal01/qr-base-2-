import React, { useEffect, useRef, useState } from 'react';
import { X, Download, Printer, AlertCircle } from 'lucide-react';
import QRCode from 'qrcode';

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

  const [generating, setGenerating] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !code || !canvasRef.current) {
      return;
    }

    let cancelled = false;

    const generateQRCode = async () => {
      setGenerating(true);
      setGenerationError(null);

      try {
        await QRCode.toCanvas(canvasRef.current, code, {
          width: 240,
          margin: 2,
          errorCorrectionLevel: 'M',
          color: {
            dark: '#0f172a',
            light: '#ffffff',
          },
        });
      } catch (error) {
        console.error('QR generation error:', error);

        if (!cancelled) {
          setGenerationError('Unable to generate the QR code.');
        }
      } finally {
        if (!cancelled) {
          setGenerating(false);
        }
      }
    };

    void generateQRCode();

    return () => {
      cancelled = true;
    };
  }, [isOpen, code]);

  useEffect(() => {
    if (!isOpen) {
      setGenerationError(null);
    }
  }, [isOpen]);

  const handleDownload = () => {
    if (!canvasRef.current || !code || generationError) {
      return;
    }

    const link = document.createElement('a');

    link.download = `QR_${code.replace(/[^a-zA-Z0-9_-]/g, '_')}.png`;
    link.href = canvasRef.current.toDataURL('image/png');
    link.click();
  };

  const handlePrint = () => {
    if (!canvasRef.current || generationError) {
      return;
    }

    const printWindow = window.open('', '_blank', 'width=500,height=600');

    if (!printWindow) {
      alert('Please allow pop-ups to print the QR label.');
      return;
    }

    const qrImage = canvasRef.current.toDataURL('image/png');

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${escapeHtml(title)}</title>
          <style>
            @page {
              margin: 0;
            }

            * {
              box-sizing: border-box;
            }

            body {
              margin: 0;
              padding: 20mm;
              background: white;
              font-family: Arial, sans-serif;
              color: #0f172a;
              text-align: center;
            }

            .label {
              width: 70mm;
              margin: 0 auto;
              padding: 6mm;
              border: 1px solid #e2e8f0;
              border-radius: 4mm;
            }

            .badge {
              display: inline-block;
              margin-bottom: 4mm;
              padding: 1.5mm 3mm;
              background: #eff6ff;
              color: #1d4ed8;
              border-radius: 10mm;
              font-size: 8pt;
              font-weight: 700;
              letter-spacing: 0.08em;
              text-transform: uppercase;
            }

            img {
              width: 55mm;
              height: 55mm;
              display: block;
              margin: 0 auto 4mm;
            }

            h1 {
              margin: 0;
              font-size: 14pt;
              line-height: 1.2;
            }

            p {
              margin: 2mm 0 0;
              font-size: 9pt;
              color: #64748b;
            }

            .code {
              margin-top: 3mm;
              font-family: monospace;
              font-size: 9pt;
              font-weight: 700;
              color: #0f172a;
              word-break: break-all;
            }
          </style>
        </head>

        <body>
          <div class="label">
            ${typeBadge ? `<div class="badge">${escapeHtml(typeBadge)}</div>` : ''}
            <img src="${qrImage}" alt="QR Code" />
            <h1>${escapeHtml(title)}</h1>
            ${subtitle ? `<p>${escapeHtml(subtitle)}</p>` : ''}
            <div class="code">${escapeHtml(code)}</div>
          </div>
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();

    printWindow.onload = () => {
      printWindow.print();
      printWindow.close();
    };
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-sm overflow-hidden flex flex-col"
        role="dialog"
        aria-modal="true"
        aria-labelledby="qr-generator-title"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div>
            <span className="text-xs font-bold uppercase tracking-widest text-slate-400">QR Code</span>

            <p className="text-[10px] text-slate-400 mt-0.5">Generate, download, or print a label</p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-slate-200 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
            aria-label="Close QR code dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Printable Label */}
        <div className="p-6 text-center flex flex-col items-center space-y-4">
          {typeBadge && (
            <span className="bg-blue-50 text-blue-700 text-[10px] px-3 py-1 rounded-full font-bold uppercase tracking-widest">
              {typeBadge}
            </span>
          )}

          <div className="p-3 bg-white rounded-2xl border-2 border-slate-900 shadow-md">
            {generationError ? (
              <div className="w-[240px] h-[240px] flex flex-col items-center justify-center gap-2 text-slate-400">
                <AlertCircle className="w-8 h-8" />

                <p className="text-xs font-medium">QR generation failed</p>
              </div>
            ) : (
              <canvas
                ref={canvasRef}
                className={`mx-auto transition-opacity ${generating ? 'opacity-40' : 'opacity-100'}`}
                aria-label={`QR code for ${code}`}
              />
            )}
          </div>

          <div className="max-w-full">
            <h3 id="qr-generator-title" className="text-lg font-bold text-slate-900 leading-tight">
              {title}
            </h3>

            {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
          </div>
        </div>

        {/* Action Toolbar */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center gap-2">
          <button
            type="button"
            onClick={handleDownload}
            disabled={generating || !!generationError}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition-all cursor-pointer shadow-sm disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            <span>Download</span>
          </button>

          <button
            type="button"
            onClick={handlePrint}
            disabled={generating || !!generationError}
            title="Print QR label"
            aria-label="Print QR label"
            className="p-2.5 bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition-all cursor-pointer disabled:opacity-50"
          >
            <Printer className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
