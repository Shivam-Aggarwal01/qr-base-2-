import React, { useEffect, useRef, useState } from "react";
import {
  X,
  Camera,
  Upload,
  AlertCircle,
  RefreshCw,
  CheckCircle2,
} from "lucide-react";
import jsQR from "jsqr";

interface QRScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanResult: (code: string) => void;
}

export const QRScannerModal: React.FC<QRScannerModalProps> = ({
  isOpen,
  onClose,
  onScanResult,
}) => {
  const [activeTab, setActiveTab] = useState<"camera" | "upload" | "manual">(
    "camera",
  );
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [manualCode, setManualCode] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Sample simulation codes for quick testing
  const presetCodes = [
    { code: "ARD-0092-B", label: "Arduino Uno (Asset)" },
    { code: "ESP-0421-C", label: "ESP32 DevKit (Asset)" },
    { code: "CON-9912-X", label: "10k Resistors (Consumable)" },
    { code: "LOC-CAB-A12", label: "Cabinet A, Bin 12 (Location)" },
    { code: "REQ-2026-0811", label: "Req REQ-2026-0811 (Request)" },
    { code: "STU-3041", label: "Marcus Chen (User)" },
  ];

  // Start Camera Feed
  useEffect(() => {
    if (!isOpen || activeTab !== "camera") {
      stopCamera();
      return;
    }

    let stream: MediaStream | null = null;

    async function initCamera() {
      try {
        setCameraError(null);
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.setAttribute("playsinline", "true");
          videoRef.current.play();
          animationFrameRef.current = requestAnimationFrame(scanFrame);
        }
      } catch (err: any) {
        console.warn("Camera access error:", err);
        setCameraError(
          "Camera access denied or unavailable in iframe. Try Preset Scan or Upload below.",
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
    if (
      videoRef.current &&
      videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA
    ) {
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext("2d");
        if (ctx) {
          canvas.height = videoRef.current.videoHeight;
          canvas.width = videoRef.current.videoWidth;
          ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: "dontInvert",
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
    onScanResult(code);
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
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(imageData.data, imageData.width, imageData.height);
          setIsProcessing(false);
          if (code && code.data) {
            handleCodeFound(code.data);
          } else {
            alert(
              "No valid QR code found in this image. Please try another image or code.",
            );
          }
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden flex flex-col">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-blue-600 animate-pulse" />
            <h3 className="font-bold text-slate-800 text-lg">Lab QR Scanner</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-slate-200 text-slate-400 hover:text-slate-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Buttons */}
        <div className="flex border-b border-slate-100 px-6 pt-3 gap-2 bg-slate-50">
          <button
            onClick={() => setActiveTab("camera")}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-t-xl transition-all border-b-2 ${
              activeTab === "camera"
                ? "border-blue-600 text-blue-600 bg-white shadow-sm"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <Camera className="w-4 h-4" /> Live Camera
          </button>
          <button
            onClick={() => setActiveTab("upload")}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-t-xl transition-all border-b-2 ${
              activeTab === "upload"
                ? "border-blue-600 text-blue-600 bg-white shadow-sm"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <Upload className="w-4 h-4" /> Upload Image
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5">
          {activeTab === "camera" && (
            <div className="space-y-4">
              <div className="relative aspect-square w-full max-w-xs mx-auto bg-slate-900 rounded-2xl overflow-hidden shadow-inner flex items-center justify-center border-2 border-blue-500/30">
                <video ref={videoRef} className="w-full h-full object-cover" />
                <canvas ref={canvasRef} className="hidden" />

                {/* Target Frame Overlay */}
                <div className="absolute inset-12 border-2 border-dashed border-blue-400 rounded-2xl pointer-events-none flex items-center justify-center">
                  <div className="w-full h-0.5 bg-blue-500/80 animate-ping" />
                </div>

                {cameraError && (
                  <div className="absolute inset-0 bg-slate-900/90 p-6 flex flex-col items-center justify-center text-center text-white space-y-2">
                    <AlertCircle className="w-8 h-8 text-amber-400" />
                    <p className="text-xs text-slate-300 font-medium">
                      {cameraError}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === "upload" && (
            <div className="space-y-4">
              <label className="border-2 border-dashed border-slate-300 hover:border-blue-500 rounded-2xl p-8 flex flex-col items-center justify-center cursor-pointer transition-colors bg-slate-50 hover:bg-blue-50/40 text-center">
                <Upload className="w-10 h-10 text-slate-400 mb-2" />
                <span className="text-sm font-bold text-slate-700">
                  Choose QR image or drag & drop
                </span>
                <span className="text-xs text-slate-400 mt-1">
                  PNG, JPG, WEBP formats
                </span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
              {isProcessing && (
                <div className="flex items-center justify-center gap-2 text-xs font-semibold text-blue-600">
                  <RefreshCw className="w-4 h-4 animate-spin" /> Decoding QR
                  Image...
                </div>
              )}
            </div>
          )}

          {/* Quick Simulation / Manual Bar */}
          <div className="pt-3 border-t border-slate-100">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">
              Quick Test Presets (Instant Simulation)
            </p>
            <div className="grid grid-cols-2 gap-2">
              {presetCodes.map((p) => (
                <button
                  key={p.code}
                  onClick={() => handleCodeFound(p.code)}
                  className="flex items-center justify-between p-2.5 bg-slate-50 hover:bg-blue-50 hover:border-blue-200 border border-slate-200 rounded-xl text-left transition-all cursor-pointer group"
                >
                  <div>
                    <p className="text-xs font-bold text-slate-800 font-mono group-hover:text-blue-700">
                      {p.code}
                    </p>
                    <p className="text-[10px] text-slate-500">{p.label}</p>
                  </div>
                  <CheckCircle2 className="w-4 h-4 text-slate-300 group-hover:text-blue-600" />
                </button>
              ))}
            </div>
          </div>

          {/* Manual Input Fallback */}
          <div className="pt-2">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
              Or Type Code Manually
            </p>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (manualCode.trim()) {
                  handleCodeFound(manualCode.trim());
                }
              }}
              className="flex gap-2"
            >
              <input
                type="text"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                placeholder="Enter Asset or Item Code..."
                className="flex-1 px-3.5 py-2 bg-slate-100 border border-slate-200 rounded-xl text-xs font-mono outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="submit"
                disabled={!manualCode.trim()}
                className="bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white text-xs font-bold px-4 py-2 rounded-xl transition-all cursor-pointer"
              >
                Scan Code
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
