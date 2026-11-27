import React, { useState, useRef, useEffect } from 'react';
import type { OcclusionBox, OcclusionMode } from '@/types/models';
import { compressImageToWebP, extractClipboardImage, detectTextLabels } from '@/lib/imageUtils';
import { Upload, Sparkles, Trash2, RefreshCw } from 'lucide-react';

interface OcclusionEditorProps {
  imageUrl: string;
  onChangeImageUrl: (url: string) => void;
  boxes: OcclusionBox[];
  onChangeBoxes: (boxes: OcclusionBox[]) => void;
  occlusionMode: OcclusionMode;
  onChangeOcclusionMode: (mode: OcclusionMode) => void;
  title: string;
  onChangeTitle: (title: string) => void;
}

export const OcclusionEditor: React.FC<OcclusionEditorProps> = ({
  imageUrl, onChangeImageUrl, boxes, onChangeBoxes, occlusionMode, onChangeOcclusionMode, title, onChangeTitle,
}) => {
  const containerRef = useRef<HTMLDivElement>(null), imgRef = useRef<HTMLImageElement>(null), fileInputRef = useRef<HTMLInputElement>(null);
  const [isDrawing, setIsDrawing] = useState(false), [startPos, setStartPos] = useState<{ x: number; y: number } | null>(null);
  const [currentBox, setCurrentBox] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const [selectedBoxId, setSelectedBoxId] = useState<string | null>(null), [isScanning, setIsScanning] = useState(false), [imageSizeStr, setImageSizeStr] = useState<string>('');

  const processImageFile = async (file: File) => {
    try {
      const result = await compressImageToWebP(file);
      onChangeImageUrl(result.dataUrl);
      setImageSizeStr(`${Math.round(result.sizeBytes / 1024)} KB`);
    } catch (err) {
      console.error('Image compression failed:', err);
    }
  };

  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const file = extractClipboardImage(e);
      if (file) processImageFile(file);
    };
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, []);

  const getRelativeCoords = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return { x: 0, y: 0 };
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
    const y = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));
    return { x, y };
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!imageUrl) return;
    const { x, y } = getRelativeCoords(e);
    setIsDrawing(true);
    setStartPos({ x, y });
    setCurrentBox({ x, y, width: 0, height: 0 });
    setSelectedBoxId(null);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDrawing || !startPos) return;
    const { x, y } = getRelativeCoords(e);
    const boxX = Math.min(startPos.x, x);
    const boxY = Math.min(startPos.y, y);
    const width = Math.abs(x - startPos.x);
    const height = Math.abs(y - startPos.y);
    setCurrentBox({ x: boxX, y: boxY, width, height });
  };

  const handleMouseUp = () => {
    if (isDrawing && currentBox && currentBox.width > 2 && currentBox.height > 2) {
      const newBox: OcclusionBox = {
        id: `box_${Date.now()}_${boxes.length + 1}`,
        x: Math.round(currentBox.x * 10) / 10,
        y: Math.round(currentBox.y * 10) / 10,
        width: Math.round(currentBox.width * 10) / 10,
        height: Math.round(currentBox.height * 10) / 10,
        label: `Label ${boxes.length + 1}`,
      };
      onChangeBoxes([...boxes, newBox]);
      setSelectedBoxId(newBox.id);
    }
    setIsDrawing(false);
    setStartPos(null);
    setCurrentBox(null);
  };

  const handleDeleteBox = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onChangeBoxes(boxes.filter((b) => b.id !== id));
    if (selectedBoxId === id) setSelectedBoxId(null);
  };

  const handleAutoDetect = async () => {
    if (!imgRef.current) return;
    setIsScanning(true);
    try {
      const detected = await detectTextLabels(imgRef.current);
      onChangeBoxes(detected);
    } finally {
      setIsScanning(false);
    }
  };

  return (
    <div className="space-y-3.5">
      {/* Title & Mode Switcher */}
      <div className="space-y-2">
        <label className="text-xs font-semibold text-theme-secondary">Title *</label>
        <input
          type="text"
          value={title}
          onChange={(e) => onChangeTitle(e.target.value)}
          placeholder="e.g. Heart Anatomy"
          className="w-full rounded-xl bg-canvas border border-theme px-3 py-2 text-xs text-theme-primary placeholder:text-theme-secondary focus:outline-none focus:border-forest"
        />

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => onChangeOcclusionMode('hide_all_guess_one')}
            className={`py-2 px-3 rounded-xl border text-xs font-semibold transition-all active:scale-95 ${
              occlusionMode === 'hide_all_guess_one'
                ? 'bg-sage border-forest/30 text-forest shadow-sm'
                : 'bg-canvas border-theme text-theme-secondary hover:text-theme-primary'
            }`}
          >
            Hide All
          </button>

          <button
            type="button"
            onClick={() => onChangeOcclusionMode('hide_one_guess_one')}
            className={`py-2 px-3 rounded-xl border text-xs font-semibold transition-all active:scale-95 ${
              occlusionMode === 'hide_one_guess_one'
                ? 'bg-sage border-forest/30 text-forest shadow-sm'
                : 'bg-canvas border-theme text-theme-secondary hover:text-theme-primary'
            }`}
          >
            Hide One
          </button>
        </div>
      </div>

      {/* Upload Zone / Canvas Container */}
      {!imageUrl ? (
        <div
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-theme hover:border-forest/50 rounded-2xl p-6 text-center cursor-pointer bg-canvas hover:bg-card-theme transition-all space-y-2.5"
        >
          <div className="h-10 w-10 rounded-2xl bg-sage text-forest flex items-center justify-center mx-auto">
            <Upload className="h-5 w-5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-theme-primary">Upload Diagram</h4>
            <p className="text-[11px] text-theme-secondary mt-0.5">Tap to select, or Ctrl+V to paste</p>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && processImageFile(e.target.files[0])}
          />
        </div>
      ) : (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs bg-canvas p-2 rounded-xl border border-theme">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleAutoDetect}
                disabled={isScanning}
                className="h-7 px-2.5 text-xs bg-forest hover:opacity-90 text-white gap-1 rounded-lg shadow-sm flex items-center font-semibold active:scale-95 transition-all"
              >
                {isScanning ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                <span>Auto-Detect</span>
              </button>
              {imageSizeStr && <span className="text-[10px] text-theme-secondary font-mono">{imageSizeStr}</span>}
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-forest font-bold">{boxes.length} Masks</span>
              <button
                type="button"
                onClick={() => { onChangeImageUrl(''); onChangeBoxes([]); }}
                className="text-theme-secondary hover:text-rose-500 p-1"
                title="Remove"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          <div
            ref={containerRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            className="relative w-full rounded-2xl overflow-hidden border border-theme bg-canvas cursor-crosshair select-none"
          >
            <img
              ref={imgRef}
              src={imageUrl}
              alt="Diagram"
              className="w-full h-auto block max-h-[400px] object-contain pointer-events-none mx-auto"
            />

            {boxes.map((box, idx) => (
              <div
                key={box.id}
                onClick={(e) => { e.stopPropagation(); setSelectedBoxId(box.id); }}
                style={{
                  left: `${box.x}%`,
                  top: `${box.y}%`,
                  width: `${box.width}%`,
                  height: `${box.height}%`,
                }}
                className={`absolute rounded-[4px] border-2 transition-all flex items-center justify-between p-0.5 cursor-pointer ${
                  selectedBoxId === box.id ? 'border-forest bg-[#2D5340]/45 z-20 shadow-md' : 'border-forest/80 bg-[#2D5340]/30 z-10 hover:bg-[#2D5340]/40'
                }`}
              >
                <span className="text-[9px] font-bold text-theme-primary bg-card-theme px-1 py-0.5 rounded leading-none border border-theme">{idx + 1}</span>
                <button type="button" onClick={(e) => handleDeleteBox(box.id, e)} className="h-3.5 w-3.5 rounded-full bg-rose-500 text-white flex items-center justify-center text-[9px] font-bold hover:bg-rose-600">×</button>
              </div>
            ))}

            {isDrawing && currentBox && (
              <div
                style={{ left: `${currentBox.x}%`, top: `${currentBox.y}%`, width: `${currentBox.width}%`, height: `${currentBox.height}%` }}
                className="absolute rounded-[4px] border-2 border-forest bg-[#2D5340]/25 z-30 pointer-events-none"
              />
            )}
          </div>
          <p className="text-[10px] text-theme-secondary text-center">Drag to draw masks over diagram labels</p>
        </div>
      )}
    </div>
  );
};