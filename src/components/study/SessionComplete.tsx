import React, { useState } from 'react';
import { Trophy, Flame, CheckCircle, ArrowLeft, RotateCcw, Sparkles } from 'lucide-react';
import { MemoryFlexModal } from '@/components/social/MemoryFlexModal';

export interface SessionStats {
  totalReviewed: number;
  againCount: number;
  hardCount: number;
  goodCount: number;
  easyCount: number;
  streakDays: number;
}

interface SessionCompleteProps {
  stats: SessionStats;
  onReturnToDashboard: () => void;
  onRestartSession: () => void;
}

export const SessionComplete: React.FC<SessionCompleteProps> = ({
  stats,
  onReturnToDashboard,
  onRestartSession,
}) => {
  const [showFlex, setShowFlex] = useState(false);
  const successfulReviews = stats.goodCount + stats.easyCount;
  const accuracy =
    stats.totalReviewed > 0 ? Math.round((successfulReviews / stats.totalReviewed) * 100) : 100;

  return (
    <div className="w-full max-w-sm mx-auto p-6 rounded-3xl border border-theme bg-card-theme shadow-lg text-center space-y-5 animate-in zoom-in-95 duration-200">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-sage text-forest">
        <Trophy className="h-8 w-8 text-forest" />
      </div>

      <div className="space-y-1">
        <h2 className="text-xl font-bold text-theme-primary tracking-tight">Session Done</h2>
        <p className="text-xs text-theme-secondary">
          Cards reviewed and scheduled with FSRS.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-2 pt-1 text-xs">
        <div className="p-3 rounded-2xl bg-canvas border border-theme">
          <span className="text-[10px] text-theme-secondary block">Reviewed</span>
          <span className="text-lg font-bold text-theme-primary">{stats.totalReviewed}</span>
        </div>

        <div className="p-3 rounded-2xl bg-canvas border border-theme">
          <span className="text-[10px] text-theme-secondary block">Accuracy</span>
          <span className="text-lg font-bold text-forest">{accuracy}%</span>
        </div>

        <div className="p-3 rounded-2xl bg-canvas border border-theme">
          <span className="text-[10px] text-theme-secondary block">Streak</span>
          <div className="flex items-center justify-center gap-1">
            <Flame className="h-3.5 w-3.5 text-amber-500 fill-current" />
            <span className="text-lg font-bold text-theme-primary">{stats.streakDays}</span>
          </div>
        </div>
      </div>

      <div className="rounded-2xl bg-canvas border border-theme p-3 space-y-2 text-xs">
        <div className="flex items-center justify-between text-theme-secondary font-medium">
          <span className="flex items-center gap-1.5 text-theme-primary">
            <CheckCircle className="h-3.5 w-3.5 text-forest" />
            <span>Ratings</span>
          </span>
          <span className="text-[10px]">FSRS Breakdown</span>
        </div>

        <div className="grid grid-cols-4 gap-1.5 font-mono text-[10px] font-bold">
          <div className="py-1 px-1.5 rounded-lg bg-rose-500/10 text-rose-500">
            Again: {stats.againCount}
          </div>
          <div className="py-1 px-1.5 rounded-lg bg-amber-500/10 text-amber-500">
            Hard: {stats.hardCount}
          </div>
          <div className="py-1 px-1.5 rounded-lg bg-sage text-forest">
            Good: {stats.goodCount}
          </div>
          <div className="py-1 px-1.5 rounded-lg bg-sage text-forest">
            Easy: {stats.easyCount}
          </div>
        </div>
      </div>

      <div className="space-y-2 pt-2">
        <button
          onClick={onReturnToDashboard}
          className="w-full py-3 rounded-2xl bg-forest hover:opacity-90 text-white font-semibold text-xs shadow-sm active:scale-95 transition-all flex items-center justify-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Dashboard</span>
        </button>

        <button
          onClick={() => setShowFlex(true)}
          className="w-full py-2.5 rounded-2xl border border-theme bg-card-theme hover:bg-canvas text-theme-primary font-semibold text-xs active:scale-95 transition-all flex items-center justify-center gap-1.5"
        >
          <Sparkles className="h-3.5 w-3.5 text-forest" />
          <span>Flex Story</span>
        </button>

        <button
          onClick={onRestartSession}
          className="w-full py-1 text-xs text-theme-secondary hover:text-theme-primary flex items-center justify-center gap-1"
        >
          <RotateCcw className="h-3 w-3" />
          <span>Review Again</span>
        </button>
      </div>

      <MemoryFlexModal
        isOpen={showFlex}
        onClose={() => setShowFlex(false)}
        stats={{
          total_reviews: stats.totalReviewed,
          streak_days: stats.streakDays,
          last_study_date: new Date().toISOString().split('T')[0],
          review_heatmap: {},
        }}
      />
    </div>
  );
};
