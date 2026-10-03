import React, { useEffect, useRef, useState } from 'react';
import { X, Download, Printer, AlertCircle } from 'lucide-react';
import { Modal, KeyboardBadge } from './Modal';
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
          margin: 1,
          errorCorrectionLevel: 'M',
          color: { dark: '#172b3a', light: '#ffffff' },
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
  const escapeHtml = (value: string) =>
    value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  const handlePrint = () => {
    if (!canvasRef.current || !code || generationError) {
      return;
    }
    const qrImage = canvasRef.current.toDataURL('image/png');
    const safeTitle = escapeHtml(title);
    const safeSubtitle = subtitle ? escapeHtml(subtitle) : '';
    const safeCode = escapeHtml(code);
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    iframe.style.opacity = '0';
    iframe.style.pointerEvents = 'none';
    document.body.appendChild(iframe);
    const printDocument = iframe.contentWindow?.document;
    if (!printDocument) {
      document.body.removeChild(iframe);
      return;
    }
    printDocument.open();
    printDocument.write(
      ` <!doctype html> <html> <head> <title>${safeTitle} - QR Label</title> <style> @page { size: 70mm 70mm; margin: 0; } * { box-sizing: border-box; } html, body { width: 70mm; height: 70mm; margin: 0; padding: 0; background: #ffffff; } body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; display: flex; align-items: center; justify-content: center; } .label { width: 64mm; height: 64mm; padding: 4mm; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; border: 0.3mm solid #d9dee5; border-radius: 2.5mm; background: #ffffff; } .brand { font-size: 7px; font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase; color: #0b4ca3; margin-bottom: 2mm; } .type { font-size: 7px; font-weight: 600; color: #687782; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 2mm; } .title { width: 100%; font-size: 10px; font-weight: 700; line-height: 1.2; color: #172b3a; margin-bottom: 2.5mm; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; } .qr { width: 34mm; height: 34mm; display: block; margin: 0 auto 2.5mm; } .subtitle { max-width: 100%; font-size: 7px; line-height: 1.2; color: #687782; margin-bottom: 1.5mm; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; } .code { max-width: 100%; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: 7px; font-weight: 600; color: #172b3a; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; } </style> </head> <body> <div class="label"> <div class="brand"> AICTE IDEA LAB </div> ${typeBadge ? ` <div class="type"> ${escapeHtml(typeBadge)} </div> ` : ''} <div class="title"> ${safeTitle} </div> <img class="qr" src="${qrImage}" alt="QR Code" /> ${safeSubtitle ? ` <div class="subtitle"> ${safeSubtitle} </div> ` : ''} <div class="code"> ${safeCode} </div> </div> </body> </html> `
    );
    printDocument.close();
    const printWindow = iframe.contentWindow;
    if (!printWindow) {
      document.body.removeChild(iframe);
      return;
    }
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      setTimeout(() => {
        if (document.body.contains(iframe)) {
          document.body.removeChild(iframe);
        }
      }, 1000);
    }, 300);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="QR Label"
      subtitle="Generate or print this label."
      category="Label Generator"
      closeOnOutsideClick={true}
      closeOnEscape={true}
      maxWidth="sm"
      bodyClassName="p-5"
      footer={
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleDownload}
            disabled={generating || !!generationError}
            className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl border border-[var(--color-idea-border)] bg-white text-[var(--color-idea-text)] text-xs font-semibold hover:bg-[var(--color-idea-light-grey)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Download</span>
          </button>
          <button
            type="button"
            onClick={handlePrint}
            disabled={generating || !!generationError}
            className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-[var(--color-idea-blue)] text-white text-xs font-semibold hover:brightness-95 transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Print Label</span>
            <KeyboardBadge>↵ Enter</KeyboardBadge>
          </button>
        </div>
      }
    >
      <div className="bg-white border border-[var(--color-idea-border)] rounded-xl p-5 flex flex-col items-center text-center">
        <p className="text-[8px] font-semibold uppercase tracking-[0.15em] text-[var(--color-idea-deep-blue)]">
          AICTE IDEA LAB
        </p>
        {typeBadge && (
          <p className="mt-1 text-[9px] font-medium uppercase tracking-wider text-[var(--color-idea-muted)]">
            {typeBadge}
          </p>
        )}
        <h3
          className="w-full mt-2 text-sm font-semibold text-[var(--color-idea-text)] leading-tight truncate"
          title={title}
        >
          {title}
        </h3>
        <div className="mt-4 w-[220px] h-[220px] flex items-center justify-center">
          {generationError ? (
            <div className="flex flex-col items-center gap-2">
              <AlertCircle className="w-7 h-7 text-[var(--color-idea-red)]" />
              <p className="text-xs text-[var(--color-idea-muted)]">QR generation failed</p>
            </div>
          ) : (
            <canvas
              ref={canvasRef}
              className={`w-[220px] h-[220px] transition-opacity ${generating ? 'opacity-40' : 'opacity-100'}`}
              aria-label={`QR code for ${code}`}
            />
          )}
        </div>
        {subtitle && (
          <p className="w-full mt-3 text-xs text-[var(--color-idea-muted)] truncate" title={subtitle}>
            {subtitle}
          </p>
        )}
        <p
          className="max-w-full mt-1.5 px-2 text-[10px] font-mono font-medium text-[var(--color-idea-deep-blue)] truncate"
          title={code}
        >
          {code}
        </p>
      </div>
    </Modal>
  );
};
