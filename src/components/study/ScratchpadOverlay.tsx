import React, { useRef, useEffect, useState, useCallback } from 'react';
import { PenTool, RotateCcw, X } from 'lucide-react';
import { isDarkMode } from '@/lib/theme';

interface ScratchpadOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  cardId: string;
}

export const ScratchpadOverlay: React.FC<ScratchpadOverlayProps> = ({ isOpen, onClose, cardId }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawingRef = useRef(false);
  const [hasDrawn, setHasDrawn] = useState(false);

  const getInkColor = useCallback(() => {
    return isDarkMode() ? '#E8EFEA' : '#2D5340';
  }, []);

  const clearCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
  }, []);

  // Auto-clear when advancing to the next card
  useEffect(() => {
    clearCanvas();
  }, [cardId, clearCanvas]);

  // Adjust canvas resolution on mount / resize / open
  useEffect(() => {
    if (!isOpen) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.scale(dpr, dpr);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.lineWidth = 3;
      ctx.strokeStyle = getInkColor();
    }
  }, [isOpen, getInkColor]);

  if (!isOpen) return null;

  const getCoordinates = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    isDrawingRef.current = true;
    const { x, y } = getCoordinates(e);
    ctx.strokeStyle = getInkColor();
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x, y);
    setHasDrawn(true);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { x, y } = getCoordinates(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const handlePointerUp = () => {
    isDrawingRef.current = false;
  };

  return (
    <div className="absolute inset-0 z-30 pointer-events-auto flex flex-col">
      {/* Floating Toolbar */}
      <div className="absolute top-2 right-2 z-40 flex items-center gap-1.5 p-1 rounded-2xl bg-card-theme/90 backdrop-blur-md border border-theme shadow-lg">
        <div className="flex items-center gap-1 px-2 py-1 text-forest text-xs font-bold">
          <PenTool className="h-3.5 w-3.5" />
          <span>Scratchpad</span>
        </div>
        <button
          type="button"
          onClick={clearCanvas}
          disabled={!hasDrawn}
          title="Clear"
          className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-canvas text-theme-secondary hover:text-theme-primary disabled:opacity-40 text-xs font-semibold active:scale-95 transition-all border border-theme"
        >
          <RotateCcw className="h-3 w-3" />
          <span>Clear</span>
        </button>
        <button
          type="button"
          onClick={onClose}
          title="Close Draw"
          className="p-1 rounded-xl text-theme-secondary hover:text-theme-primary active:scale-95 transition-all"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* HTML5 Canvas */}
      <canvas
        ref={canvasRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onPointerLeave={handlePointerUp}
        className="w-full h-full cursor-crosshair touch-none bg-canvas/30"
      />
    </div>
  );
};
