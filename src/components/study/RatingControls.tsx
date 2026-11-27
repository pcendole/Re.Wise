import React, { useMemo } from 'react';
import type { Flashcard } from '@/types/models';
import { Rating, getNextReviewIntervals } from '@/lib/fsrsEngine';
import { RotateCw, Check, X } from 'lucide-react';

interface RatingControlsProps {
  card: Flashcard;
  isFlipped: boolean;
  onFlip: () => void;
  onRate: (rating: Rating) => void;
  mode: 'binary' | 'pro';
  onChangeMode: (mode: 'binary' | 'pro') => void;
}

export const RatingControls: React.FC<RatingControlsProps> = ({
  card,
  isFlipped,
  onFlip,
  onRate,
  mode,
}) => {
  const intervals = useMemo(() => {
    return getNextReviewIntervals(card);
  }, [card]);

  if (mode === 'pro' && isFlipped) {
    const proButtons = [
      { rating: Rating.Again, label: 'Again', interval: intervals[Rating.Again]?.label || '< 1d', color: 'text-rose-500 border-rose-200 bg-rose-50 dark:bg-rose-950/30 dark:border-rose-900' },
      { rating: Rating.Hard, label: 'Hard', interval: intervals[Rating.Hard]?.label || '1d', color: 'text-amber-500 border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-900' },
      { rating: Rating.Good, label: 'Good', interval: intervals[Rating.Good]?.label || '3d', color: 'text-emerald-600 border-emerald-200 bg-emerald-50 dark:bg-emerald-950/30 dark:border-emerald-900' },
      { rating: Rating.Easy, label: 'Easy', interval: intervals[Rating.Easy]?.label || '7d', color: 'text-blue-600 border-blue-200 bg-blue-50 dark:bg-blue-950/30 dark:border-blue-900' },
    ];

    return (
      <div className="grid grid-cols-4 gap-2 w-full pt-2">
        {proButtons.map((btn) => (
          <button
            key={btn.rating}
            type="button"
            onClick={() => onRate(btn.rating)}
            className={`flex flex-col items-center justify-center py-2.5 px-2 rounded-2xl border ${btn.color} font-semibold text-xs active:scale-95 transition-all shadow-sm`}
          >
            <span>{btn.label}</span>
            <span className="text-[10px] opacity-75 font-mono">{btn.interval}</span>
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className="w-full flex items-center justify-center gap-6 pt-3">
      {/* Forgot Button */}
      <div className="flex flex-col items-center gap-1">
        <button
          type="button"
          onClick={() => onRate(Rating.Again)}
          className="w-12 h-12 rounded-full bg-rose-50 border border-rose-200 text-rose-600 dark:bg-rose-950/40 dark:border-rose-900/60 dark:text-rose-400 flex items-center justify-center active:scale-95 transition-all shadow-sm hover:opacity-90"
        >
          <X className="h-5 w-5 stroke-[2.5]" />
        </button>
        <span className="text-[10px] text-theme-secondary font-medium">Forgot</span>
      </div>

      {/* Center Flip Pill Button */}
      <div className="flex flex-col items-center gap-1">
        <button
          type="button"
          onClick={onFlip}
          className="px-6 py-3 rounded-full bg-card-theme border border-theme text-theme-primary font-semibold text-xs active:scale-95 transition-all shadow-sm hover:bg-canvas flex items-center gap-1.5"
        >
          <RotateCw className="h-3.5 w-3.5" />
          <span>Flip</span>
        </button>
      </div>

      {/* Got It Button */}
      <div className="flex flex-col items-center gap-1">
        <button
          type="button"
          onClick={() => onRate(Rating.Good)}
          className="w-12 h-12 rounded-full bg-sage border border-[#2D5340]/20 text-forest flex items-center justify-center active:scale-95 transition-all shadow-sm hover:opacity-90"
        >
          <Check className="h-5 w-5 stroke-[2.5]" />
        </button>
        <span className="text-[10px] text-theme-secondary font-medium">Got It</span>
      </div>
    </div>
  );
};
