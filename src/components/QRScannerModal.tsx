import React, { useEffect, useRef, useState } from 'react';
import { X, Camera, Upload, AlertCircle, RefreshCw, KeyRound, ArrowRight } from 'lucide-react';
import jsQR from 'jsqr';

interface QRScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanResult: (code: string) => void;
}

export const QRScannerModal: React.FC<QRScannerModalProps> = ({ isOpen, onClose, onScanResult }) => {
  const [activeTab, setActiveTab] = useState<'camera' | 'upload' | 'manual'>('camera');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [manualCode, setManualCode] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Start Camera Feed
  useEffect(() => {
    if (!isOpen || activeTab !== 'camera') {
      stopCamera();
      return;
    }

    let stream: MediaStream | null = null;

    async function initCamera() {
      try {
        setCameraError(null);
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.setAttribute('playsinline', 'true');
          videoRef.current.play();
          animationFrameRef.current = requestAnimationFrame(scanFrame);
        }
      } catch (err: any) {
        console.warn('Camera access error:', err);
        setCameraError(
          'Camera access denied or unavailable in this environment. You can enter a code manually or upload a picture.'
        );
      }
    }

    initCamera();

    return () => {
      stopCamera();
      if (stream) {
        stream.getTracks().forEach((t) => t.stop());
      }
    };
  }, [isOpen, activeTab]);

  const stopCamera = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }
  };

  const scanFrame = () => {
    if (videoRef.current && videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          canvas.height = videoRef.current.videoHeight;
          canvas.width = videoRef.current.videoWidth;
          ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: 'dontInvert',
          });
          if (code && code.data) {
            handleCodeFound(code.data);
            return;
          }
        }
      }
    }
    animationFrameRef.current = requestAnimationFrame(scanFrame);
  };

  const handleCodeFound = (code: string) => {
    stopCamera();
    onScanResult(code.trim());
    onClose();
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          setIsProcessing(false);
          return;
        }
        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: 'dontInvert',
        });
        setIsProcessing(false);
        if (code && code.data) {
          handleCodeFound(code.data);
        } else {
          alert('No valid QR code found in the uploaded image.');
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCode.trim()) return;
    handleCodeFound(manualCode.trim());
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-[var(--color-idea-border)] w-full max-w-md overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-5 sm:px-6 py-4 border-b border-[var(--color-idea-border)] flex items-center justify-between bg-[var(--color-idea-light-grey)]/60 shrink-0">
          <div>
            <span className="text-[9px] font-bold uppercase tracking-[0.18em] text-[var(--color-idea-blue)]">
              AICTE IDEA LAB · SCANNER
            </span>
            <h3 className="font-bold text-[var(--color-idea-text)] text-base sm:text-lg leading-tight">
              Lab QR Scanner
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-[var(--color-idea-light-grey)] text-[var(--color-idea-muted)] hover:text-[var(--color-idea-text)] transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer"
            aria-label="Close scanner"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Buttons */}
        <div className="flex border-b border-[var(--color-idea-border)] px-4 pt-3 gap-1.5 bg-[var(--color-idea-light-grey)]/40 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('camera')}
            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-t-xl transition-all cursor-pointer border-b-2 ${
              activeTab === 'camera'
                ? 'border-[var(--color-idea-blue)] text-[var(--color-idea-blue)] bg-white shadow-xs'
                : 'border-transparent text-[var(--color-idea-muted)] hover:text-[var(--color-idea-text)]'
            }`}
          >
            <Camera className="w-3.5 h-3.5" />
            <span>Camera</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('upload')}
            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-t-xl transition-all cursor-pointer border-b-2 ${
              activeTab === 'upload'
                ? 'border-[var(--color-idea-blue)] text-[var(--color-idea-blue)] bg-white shadow-xs'
                : 'border-transparent text-[var(--color-idea-muted)] hover:text-[var(--color-idea-text)]'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Upload</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('manual')}
            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-t-xl transition-all cursor-pointer border-b-2 ${
              activeTab === 'manual'
                ? 'border-[var(--color-idea-blue)] text-[var(--color-idea-blue)] bg-white shadow-xs'
                : 'border-transparent text-[var(--color-idea-muted)] hover:text-[var(--color-idea-text)]'
            }`}
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>Manual</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1">
          {activeTab === 'camera' && (
            <div className="space-y-4">
              <div className="relative aspect-square w-full max-w-[260px] mx-auto bg-slate-900 rounded-2xl overflow-hidden shadow-inner flex items-center justify-center border-2 border-[var(--color-idea-blue)]/40">
                <video ref={videoRef} className="w-full h-full object-cover" />
                <canvas ref={canvasRef} className="hidden" />

                {/* Target Frame Overlay */}
                <div className="absolute inset-8 border-2 border-dashed border-[var(--color-idea-blue)] rounded-xl pointer-events-none flex items-center justify-center">
                  <div className="w-full h-0.5 bg-[var(--color-idea-blue)] animate-pulse" />
                </div>

                {cameraError && (
                  <div className="absolute inset-0 bg-slate-950/90 p-4 flex flex-col items-center justify-center text-center text-white space-y-2">
                    <AlertCircle className="w-7 h-7 text-amber-400" />
                    <p className="text-xs text-slate-300 font-medium leading-relaxed">{cameraError}</p>
                    <button
                      type="button"
                      onClick={() => setActiveTab('manual')}
                      className="mt-2 text-xs text-[var(--color-idea-blue)] font-bold underline"
                    >
                      Switch to manual lookup
                    </button>
                  </div>
                )}
              </div>
              <p className="text-center text-[11px] text-[var(--color-idea-muted)]">
                Point your camera at any IDEA Lab asset, item, or location QR code.
              </p>
            </div>
          )}

          {activeTab === 'upload' && (
            <div className="space-y-4">
              <label className="border-2 border-dashed border-[var(--color-idea-border)] hover:border-[var(--color-idea-blue)] rounded-2xl p-6 sm:p-8 flex flex-col items-center justify-center cursor-pointer transition-colors bg-[var(--color-idea-light-grey)]/40 hover:bg-[var(--color-idea-light-grey)] text-center">
                <Upload className="w-8 h-8 text-[var(--color-idea-muted)] mb-2" />
                <span className="text-xs sm:text-sm font-bold text-[var(--color-idea-text)]">
                  Choose QR image or drag & drop
                </span>
                <span className="text-[11px] text-[var(--color-idea-muted)] mt-1">
                  Supports PNG, JPG, or WEBP photo
                </span>
                <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
              </label>
              {isProcessing && (
                <div className="flex items-center justify-center gap-2 text-xs font-semibold text-[var(--color-idea-blue)]">
                  <RefreshCw className="w-4 h-4 animate-spin" /> Decoding QR Image...
                </div>
              )}
            </div>
          )}

          {activeTab === 'manual' && (
            <form onSubmit={handleManualSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[var(--color-idea-text)] mb-1.5">
                  Code or Identifier
                </label>
                <input
                  type="text"
                  autoFocus
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value)}
                  placeholder="e.g. AST-001, CAT-004, LOC-BENCH-1, or ID"
                  className="idea-input w-full px-3.5 py-2.5 text-xs sm:text-sm font-mono"
                />
                <p className="text-[10px] text-[var(--color-idea-muted)] mt-1">
                  Enter the asset tag, catalog code, or location code printed on the item.
                </p>
              </div>

              <button
                type="submit"
                disabled={!manualCode.trim()}
                className="w-full py-2.5 px-4 idea-button flex items-center justify-center gap-2 text-xs font-semibold rounded-xl shadow-xs cursor-pointer disabled:opacity-50"
              >
                <span>Look Up Item</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
