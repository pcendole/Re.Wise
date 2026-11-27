import React, { useState, useRef, useEffect, useCallback } from 'react';
import { compressImageToWebP } from '@/lib/imageUtils';
import { PenTool, Eraser, Undo2, Trash2, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface SketchPadProps {
  initialSketchUrl?: string | null;
  onSaveSketch: (dataUrl: string | null) => void;
}

const PEN_COLORS = [
  { name: 'Forest', color: '#2D5340' },
  { name: 'Amber', color: '#F59E0B' },
  { name: 'Dark', color: '#1D2923' },
  { name: 'Rose', color: '#E11D48' },
];

export const SketchPad: React.FC<SketchPadProps> = ({ initialSketchUrl, onSaveSketch }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedColor, setSelectedColor] = useState('#2D5340');
  const [isEraser, setIsEraser] = useState(false);
  const [history, setHistory] = useState<ImageData[]>([]);
  const [sketchUrl, setSketchUrl] = useState<string | null>(initialSketchUrl || null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawingRef = useRef(false);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (initialSketchUrl !== undefined) setSketchUrl(initialSketchUrl);
  }, [initialSketchUrl]);

  const setupCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (sketchUrl) {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      img.src = sketchUrl;
    }
    setHistory([ctx.getImageData(0, 0, canvas.width, canvas.height)]);
  }, [sketchUrl]);

  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(setupCanvas, 50);
      return () => clearTimeout(timer);
    }
  }, [isOpen, setupCanvas]);

  const saveCanvasState = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    setHistory((prev) => [...prev.slice(-12), ctx.getImageData(0, 0, canvas.width, canvas.height)]);
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.setPointerCapture(e.pointerId);
    isDrawingRef.current = true;
    const rect = canvas.getBoundingClientRect();
    lastPointRef.current = {
      x: (e.clientX - rect.left) * (canvas.width / rect.width),
      y: (e.clientY - rect.top) * (canvas.height / rect.height),
    };
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current || !lastPointRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const rect = canvas.getBoundingClientRect();
    const cx = (e.clientX - rect.left) * (canvas.width / rect.width);
    const cy = (e.clientY - rect.top) * (canvas.height / rect.height);

    ctx.beginPath();
    ctx.moveTo(lastPointRef.current.x, lastPointRef.current.y);
    ctx.lineTo(cx, cy);
    ctx.strokeStyle = isEraser ? '#FFFFFF' : selectedColor;
    ctx.lineWidth = isEraser ? 24 : 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();

    lastPointRef.current = { x: cx, y: cy };
  };

  const handlePointerUp = () => {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;
    lastPointRef.current = null;
    saveCanvasState();
  };

  const handleUndo = () => {
    if (history.length <= 1) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const newHistory = [...history];
    newHistory.pop();
    ctx.putImageData(newHistory[newHistory.length - 1], 0, 0);
    setHistory(newHistory);
  };

  const handleClear = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    saveCanvasState();
  };

  const handleDone = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    try {
      const compressed = await compressImageToWebP(canvas.toDataURL('image/png'), 800, 0.75);
      setSketchUrl(compressed.dataUrl);
      onSaveSketch(compressed.dataUrl);
    } catch {
      const fallback = canvas.toDataURL('image/webp', 0.75);
      setSketchUrl(fallback);
      onSaveSketch(fallback);
    }
    setIsOpen(false);
  };

  return (
    <div className="rounded-xl bg-canvas border border-theme p-3 space-y-2.5">
      <div className="flex items-center justify-between text-xs">
        <span className="font-semibold text-theme-primary flex items-center gap-1.5">
          <PenTool className="h-3.5 w-3.5 text-forest" />
          <span>Quick Sketch Mnemonic</span>
        </span>
        <span className="text-[10px] text-theme-secondary font-mono">&lt;80 KB</span>
      </div>

      {sketchUrl ? (
        <div className="rounded-xl overflow-hidden border border-theme bg-card-theme p-2 text-center space-y-2">
          <img src={sketchUrl} alt="Sketch" className="max-h-28 mx-auto rounded-lg object-contain bg-white" />
          <div className="flex items-center justify-center gap-2">
            <Button size="sm" variant="outline" onClick={() => setIsOpen(true)} className="h-7 text-xs">
              <PenTool className="h-3 w-3 mr-1 text-forest" /> Edit
            </Button>
            <Button size="sm" variant="ghost" onClick={() => { setSketchUrl(null); onSaveSketch(null); }} className="h-7 text-xs text-rose-500 hover:text-rose-600">
              <Trash2 className="h-3 w-3 mr-1" /> Delete
            </Button>
          </div>
        </div>
      ) : (
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => setIsOpen(true)}
          className="w-full h-8 text-xs border-dashed gap-1.5 rounded-lg"
        >
          <PenTool className="h-3.5 w-3.5 text-forest" />
          <span>Draw Diagram or Sketch</span>
        </Button>
      )}

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-lg rounded-2xl border border-theme bg-card-theme p-4 shadow-2xl space-y-3" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between pb-2 border-b border-theme">
              <div className="flex items-center gap-1.5">
                {PEN_COLORS.map((p) => (
                  <button
                    key={p.name}
                    type="button"
                    onClick={() => { setSelectedColor(p.color); setIsEraser(false); }}
                    className={`h-6 w-6 rounded-full border-2 transition-all ${!isEraser && selectedColor === p.color ? 'scale-110 border-forest' : 'border-transparent opacity-75'}`}
                    style={{ backgroundColor: p.color }}
                  />
                ))}
                <button
                  type="button"
                  onClick={() => setIsEraser(true)}
                  className={`p-1.5 rounded-lg border text-xs transition-colors ${isEraser ? 'bg-forest text-white border-forest' : 'text-theme-secondary border-theme hover:bg-canvas'}`}
                >
                  <Eraser className="h-3.5 w-3.5" />
                </button>
              </div>

              <div className="flex items-center gap-1">
                <button type="button" onClick={handleUndo} disabled={history.length <= 1} className="p-1.5 rounded-lg text-theme-secondary hover:text-theme-primary disabled:opacity-30"><Undo2 className="h-3.5 w-3.5" /></button>
                <button type="button" onClick={handleClear} className="p-1.5 rounded-lg text-theme-secondary hover:text-rose-500"><Trash2 className="h-3.5 w-3.5" /></button>
                <button type="button" onClick={() => setIsOpen(false)} className="p-1.5 rounded-lg text-theme-secondary hover:text-theme-primary ml-1"><X className="h-4 w-4" /></button>
              </div>
            </div>

            <div className="rounded-xl overflow-hidden border border-theme bg-white touch-none">
              <canvas
                ref={canvasRef}
                width={700}
                height={400}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerUp}
                className="w-full h-64 sm:h-72 cursor-crosshair touch-none"
              />
            </div>

            <div className="flex items-center justify-between text-xs pt-1">
              <span className="text-[10px] text-theme-secondary font-mono">Touch / stylus ready</span>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="ghost" onClick={() => setIsOpen(false)} className="h-8 text-xs">Cancel</Button>
                <Button size="sm" onClick={handleDone} className="h-8 text-xs bg-forest hover:opacity-90 text-white font-bold gap-1">
                  <Check className="h-3.5 w-3.5" /> Done
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
