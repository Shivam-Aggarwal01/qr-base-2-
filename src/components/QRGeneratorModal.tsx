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
          width: 220,
          margin: 2,
          errorCorrectionLevel: 'M',
          color: {
            dark: '#172b3a',
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
    link.download = `IDEA_LAB_QR_${code.replace(/[^a-zA-Z0-9_-]/g, '_')}.png`;
    link.href = canvasRef.current.toDataURL('image/png');
    link.click();
  };

  const handlePrint = () => {
    if (!canvasRef.current || generationError) {
      return;
    }

    const qrImage = canvasRef.current.toDataURL('image/png');
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (!doc) {
      window.print();
      return;
    }

    doc.open();
    doc.write(`
      <!doctype html>
      <html>
        <head>
          <title>${title} - QR Label</title>
          <style>
            @page { size: auto; margin: 10mm; }
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
              display: flex;
              align-items: center;
              justify-content: center;
              padding: 20px;
              margin: 0;
            }
            .label-card {
              border: 2px solid #172b3a;
              border-radius: 12px;
              padding: 16px;
              width: 240px;
              text-align: center;
              background: #fff;
            }
            .brand {
              font-size: 9px;
              font-weight: 800;
              letter-spacing: 0.15em;
              color: #0b4ca3;
              text-transform: uppercase;
              margin-bottom: 6px;
            }
            .title {
              font-size: 13px;
              font-weight: 700;
              color: #172b3a;
              margin-bottom: 8px;
              word-break: break-word;
            }
            img {
              width: 160px;
              height: 160px;
              display: block;
              margin: 0 auto 8px auto;
            }
            .code {
              font-family: monospace;
              font-size: 10px;
              font-weight: 600;
              color: #687782;
              word-break: break-all;
            }
          </style>
        </head>
        <body>
          <div class="label-card">
            <div class="brand">AICTE IDEA LAB</div>
            <div class="title">${title}</div>
            <img src="${qrImage}" alt="QR Code" />
            <div class="code">${code}</div>
          </div>
        </body>
      </html>
    `);
    doc.close();

    iframe.contentWindow?.focus();
    setTimeout(() => {
      iframe.contentWindow?.print();
      setTimeout(() => {
        document.body.removeChild(iframe);
      }, 1000);
    }, 250);
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl border border-[var(--color-idea-border)] w-full max-w-sm overflow-hidden flex flex-col max-h-[92vh]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="qr-generator-title"
      >
        {/* Header */}
        <div className="px-5 sm:px-6 py-4 border-b border-[var(--color-idea-border)] flex items-center justify-between bg-[var(--color-idea-light-grey)]/60 shrink-0">
          <div>
            <span className="text-[9px] font-bold uppercase tracking-[0.18em] text-[var(--color-idea-blue)]">
              AICTE IDEA LAB · QR TAG
            </span>
            <p id="qr-generator-title" className="font-bold text-[var(--color-idea-text)] text-base leading-tight mt-0.5">
              Equipment Label
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-[var(--color-idea-light-grey)] text-[var(--color-idea-muted)] hover:text-[var(--color-idea-text)] transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer"
            aria-label="Close QR label modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Printable Label View */}
        <div className="p-6 text-center flex flex-col items-center space-y-4 overflow-y-auto flex-1">
          {typeBadge && (
            <span className="bg-[var(--color-idea-blue)]/10 text-[var(--color-idea-deep-blue)] text-[10px] px-3 py-1 rounded-full font-bold uppercase tracking-wider">
              {typeBadge}
            </span>
          )}

          <div className="p-3 bg-white rounded-2xl border-2 border-[var(--color-idea-border)] shadow-xs">
            {generationError ? (
              <div className="w-[220px] h-[220px] flex flex-col items-center justify-center gap-2 text-[var(--color-idea-muted)]">
                <AlertCircle className="w-8 h-8 text-[var(--color-idea-red)]" />
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
            <h3 className="text-base font-bold text-[var(--color-idea-text)] leading-snug">
              {title}
            </h3>
            {subtitle && <p className="text-xs text-[var(--color-idea-muted)] mt-1">{subtitle}</p>}
            <p className="mt-2 font-mono text-[10px] text-[var(--color-idea-muted)] bg-[var(--color-idea-light-grey)] px-2.5 py-1 rounded-md inline-block break-all">
              {code}
            </p>
          </div>
        </div>

        {/* Action Toolbar */}
        <div className="p-4 bg-[var(--color-idea-light-grey)]/60 border-t border-[var(--color-idea-border)] flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleDownload}
            disabled={generating || !!generationError}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-white border border-[var(--color-idea-border)] text-[var(--color-idea-text)] hover:bg-[var(--color-idea-light-grey)] rounded-xl text-xs font-bold transition-all cursor-pointer shadow-2xs disabled:opacity-50 min-h-[44px]"
          >
            <Download className="w-4 h-4" />
            <span>Download</span>
          </button>

          <button
            type="button"
            onClick={handlePrint}
            disabled={generating || !!generationError}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 idea-button text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer disabled:opacity-50 min-h-[44px]"
          >
            <Printer className="w-4 h-4" />
            <span>Print Label</span>
          </button>
        </div>
      </div>
    </div>
  );
};
