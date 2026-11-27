import React, { useMemo } from 'react';
import type { StudyStats, ReviewLogEntry } from '@/types/models';
import { Sparkles } from 'lucide-react';

interface StreakHeatmapProps {
  stats: StudyStats;
  reviewLogs: ReviewLogEntry[];
  onOpenFlex?: () => void;
}

export const StreakHeatmap: React.FC<StreakHeatmapProps> = ({
  stats,
  reviewLogs,
  onOpenFlex,
}) => {
  const { weeks } = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const countsMap: Record<string, number> = { ...stats.review_heatmap };
    for (const log of reviewLogs) {
      const day = log.review.split('T')[0];
      countsMap[day] = (countsMap[day] || 0) + 1;
    }

    const totalDays = 15 * 7;
    const days: { dateStr: string; count: number }[] = [];

    for (let i = totalDays - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const str = d.toISOString().split('T')[0];
      days.push({ dateStr: str, count: countsMap[str] || 0 });
    }

    const weekCols: { dateStr: string; count: number }[][] = [];
    for (let i = 0; i < days.length; i += 7) {
      weekCols.push(days.slice(i, i + 7));
    }

    return { weeks: weekCols };
  }, [stats.review_heatmap, reviewLogs]);

  const getDotClass = (count: number) => {
    if (count === 0) return 'bg-[var(--border-subtle)] opacity-70';
    if (count <= 5) return 'bg-[var(--accent-forest)] opacity-60';
    return 'bg-[var(--accent-forest)]';
  };

  return (
    <div className="space-y-2">
      {/* Header Row */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-theme-primary">Your rhythm</h3>
        <div className="flex items-center gap-2">
          {onOpenFlex && (
            <button
              type="button"
              onClick={onOpenFlex}
              className="text-[11px] font-semibold text-forest hover:opacity-85 flex items-center gap-1 active:scale-95 transition-all"
            >
              <Sparkles className="h-3 w-3" />
              <span>Share</span>
            </button>
          )}
          <span className="text-[11px] text-theme-secondary">15 weeks</span>
        </div>
      </div>

      {/* Card */}
      <div className="rounded-2xl border border-theme bg-card-theme p-4 shadow-sm flex items-center justify-between gap-4">
        {/* Left: Streak */}
        <div className="shrink-0 space-y-0.5">
          <div className="text-3xl font-extrabold text-theme-primary tracking-tight">
            {stats.streak_days}
          </div>
          <div className="text-xs text-theme-secondary font-medium">
            Day streak
          </div>
        </div>

        {/* Right: Dot Grid */}
        <div className="flex gap-1 overflow-x-auto py-1">
          {weeks.map((week, wIdx) => (
            <div key={wIdx} className="flex flex-col gap-1">
              {week.map((day) => (
                <div
                  key={day.dateStr}
                  title={`${day.count} reviews on ${day.dateStr}`}
                  className={`h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-full transition-all ${getDotClass(day.count)}`}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
