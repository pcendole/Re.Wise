import React, { useState } from 'react';
import type { ExamSettings } from '@/types/models';
import { Target, Edit3, X, Check } from 'lucide-react';

interface ExamCountdownPillProps {
  settings: ExamSettings;
  onUpdateSettings: (settings: ExamSettings) => Promise<void>;
}

export const ExamCountdownPill: React.FC<ExamCountdownPillProps> = ({
  settings,
  onUpdateSettings,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [examName, setExamName] = useState(settings.target_exam_name || '');
  const [examDate, setExamDate] = useState(settings.target_exam_date || '');
  const [dailyGoal, setDailyGoal] = useState(settings.daily_review_goal || 50);
  const [saving, setSaving] = useState(false);

  const calculateDaysLeft = (): { daysLeft: number; isUrgent: boolean } => {
    if (!settings.target_exam_date) return { daysLeft: 0, isUrgent: false };
    const target = new Date(settings.target_exam_date);
    const today = new Date();
    target.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    const diffDays = Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return { daysLeft: Math.max(0, diffDays), isUrgent: diffDays < 30 };
  };

  const { daysLeft, isUrgent } = calculateDaysLeft();
  const hasGoal = Boolean(settings.target_exam_name?.trim());

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onUpdateSettings({
        ...settings,
        target_exam_name: examName.trim() || 'My Target Exam',
        target_exam_date: examDate,
        daily_review_goal: Number(dailyGoal) || 50,
      });
      setIsEditing(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      {!hasGoal ? (
        <div
          onClick={() => setIsEditing(true)}
          className="group flex items-center justify-between px-3.5 py-2 rounded-2xl bg-card-theme border border-dashed border-theme hover:border-forest/50 text-xs cursor-pointer transition-all active:scale-[0.99] shadow-sm"
        >
          <div className="flex items-center gap-2">
            <span className="text-sm">🎯</span>
            <span className="font-semibold text-theme-primary">Set Exam Goal</span>
          </div>
          <span className="text-[11px] text-forest font-semibold bg-sage px-2.5 py-0.5 rounded-full group-hover:opacity-90">
            + Target
          </span>
        </div>
      ) : (
        <div
          onClick={() => setIsEditing(true)}
          className="group flex items-center justify-between px-3.5 py-2 rounded-2xl bg-card-theme border border-theme hover:border-forest/40 text-xs cursor-pointer transition-all active:scale-[0.99] shadow-sm"
        >
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-sm shrink-0">🎯</span>
            <span className="font-bold text-theme-primary truncate">{settings.target_exam_name}</span>
            <span className="text-theme-secondary font-medium shrink-0">•</span>
            <span
              className={`shrink-0 font-semibold px-2 py-0.5 rounded-full text-[11px] ${
                isUrgent ? 'bg-amber-500/20 text-amber-700 dark:text-amber-400' : 'bg-sage text-forest'
              }`}
            >
              {daysLeft}d left
            </span>
          </div>
          <Edit3 className="h-3.5 w-3.5 text-theme-secondary group-hover:text-theme-primary shrink-0 transition-colors" />
        </div>
      )}

      {isEditing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-150">
          <div
            className="w-full max-w-sm rounded-2xl border border-theme bg-card-theme p-5 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 border-b border-theme">
              <div className="flex items-center gap-2 text-theme-primary font-bold">
                <Target className="h-4 w-4 text-forest" />
                <span>Target Exam</span>
              </div>
              <button
                onClick={() => setIsEditing(false)}
                className="text-theme-secondary hover:text-theme-primary p-1 rounded-lg hover:bg-canvas transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="font-semibold text-theme-secondary">Exam Title</label>
                <input
                  type="text"
                  required
                  value={examName}
                  onChange={(e) => setExamName(e.target.value)}
                  placeholder="e.g. USMLE Step 1, NEET PG"
                  className="w-full rounded-xl bg-canvas border border-theme px-3 py-2 text-theme-primary placeholder:text-theme-secondary focus:outline-none focus:border-forest"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-theme-secondary">Exam Date</label>
                <input
                  type="date"
                  required
                  value={examDate}
                  onChange={(e) => setExamDate(e.target.value)}
                  className="w-full rounded-xl bg-canvas border border-theme px-3 py-2 text-theme-primary focus:outline-none focus:border-forest"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-theme-secondary">Daily Target (cards)</label>
                <input
                  type="number"
                  min="5"
                  max="1000"
                  required
                  value={dailyGoal}
                  onChange={(e) => setDailyGoal(Number(e.target.value))}
                  className="w-full rounded-xl bg-canvas border border-theme px-3 py-2 text-theme-primary focus:outline-none focus:border-forest"
                />
              </div>

              <div className="flex gap-2 pt-2 border-t border-theme">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="w-1/2 py-2 rounded-xl border border-theme text-theme-secondary hover:text-theme-primary font-semibold text-xs active:scale-95 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="w-1/2 py-2 rounded-xl bg-forest hover:opacity-90 text-white font-semibold text-xs shadow-sm active:scale-95 transition-all flex items-center justify-center gap-1"
                >
                  <Check className="h-3.5 w-3.5" />
                  <span>{saving ? 'Saving...' : 'Save'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};