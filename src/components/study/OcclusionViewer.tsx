import React from 'react';
import type { OcclusionBox, OcclusionMode } from '@/types/models';

interface OcclusionViewerProps {
  imageUrl: string;
  boxes?: OcclusionBox[];
  targetBoxId?: string;
  isFlipped: boolean;
  occlusionMode?: OcclusionMode;
  targetLabel?: string;
}

export const OcclusionViewer: React.FC<OcclusionViewerProps> = ({
  imageUrl,
  boxes = [],
  targetBoxId,
  isFlipped,
  occlusionMode = 'hide_all_guess_one',
  targetLabel,
}) => {
  return (
    <div className="relative w-full rounded-2xl overflow-hidden border border-theme bg-card-theme flex items-center justify-center select-none max-h-[300px] sm:max-h-[340px]">
      <img
        src={imageUrl}
        alt="Occlusion diagram"
        className="w-full h-auto max-h-[300px] sm:max-h-[340px] object-contain pointer-events-none mx-auto block"
      />

      {/* Render Occlusion Masks */}
      {boxes.map((box, idx) => {
        const isTarget = box.id === targetBoxId;

        if (isTarget) {
          return (
            <div
              key={box.id}
              style={{
                left: `${box.x}%`,
                top: `${box.y}%`,
                width: `${box.width}%`,
                height: `${box.height}%`,
              }}
              className={`absolute rounded-[4px] flex items-center justify-center p-1 transition-all duration-300 z-30 ${
                isFlipped
                  ? 'bg-forest/95 border-2 border-sage text-white font-bold text-xs sm:text-sm shadow-md scale-105'
                  : 'bg-rose-600/90 border-2 border-rose-300 text-white font-black text-xs sm:text-sm shadow-md animate-pulse'
              }`}
            >
              <span className="truncate max-w-full drop-shadow">
                {isFlipped ? box.label || targetLabel || 'Revealed' : '[ ? ]'}
              </span>
            </div>
          );
        }

        if (occlusionMode === 'hide_one_guess_one') {
          return null;
        }

        return (
          <div
            key={box.id}
            style={{
              left: `${box.x}%`,
              top: `${box.y}%`,
              width: `${box.width}%`,
              height: `${box.height}%`,
            }}
            className="absolute rounded-[4px] bg-theme-primary/90 border border-theme flex items-center justify-center z-10 p-0.5"
          >
            <span className="text-[9px] text-canvas font-mono font-bold leading-none select-none">
              {idx + 1}
            </span>
          </div>
        );
      })}
    </div>
  );
};
