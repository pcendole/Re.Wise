import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { db } from '@/lib/database';
import type { Flashcard, StudyStats } from '@/types/models';
import { Rating } from '@/lib/fsrsEngine';
import { Flashcard3D } from '@/components/study/Flashcard3D';
import { RatingControls } from '@/components/study/RatingControls';
import { QuickEditModal } from '@/components/study/QuickEditModal';
import { SessionComplete, type SessionStats } from '@/components/study/SessionComplete';
import { ScratchpadOverlay } from '@/components/study/ScratchpadOverlay';
import { X, Pencil, RefreshCw, Zap, RotateCcw, Flag, PenTool, CheckCircle } from 'lucide-react';

interface StudyArenaProps {
  deckId?: string | null; customQueue?: Flashcard[] | null; isCramMode?: boolean; onBack: () => void; onCram?: () => void;
}

interface ReviewHistoryItem {
  cardSnapshot: Flashcard; logId?: string; rating: Rating; previousQueue: Flashcard[]; previousIndex: number;
}

export const StudyArena: React.FC<StudyArenaProps> = ({ deckId, customQueue, isCramMode = false, onBack, onCram }) => {
  const [queue, setQueue] = useState<Flashcard[]>([]), [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false), [mode, setMode] = useState<'binary' | 'pro'>('binary');
  const [isQuickEditOpen, setIsQuickEditOpen] = useState(false), [isDrawOpen, setIsDrawOpen] = useState(false);
  const [loading, setLoading] = useState(true), [studyStats, setStudyStats] = useState<StudyStats | null>(null);
  const [sessionMetrics, setSessionMetrics] = useState({ again: 0, hard: 0, good: 0, easy: 0, reviewedCount: 0 });
  const [history, setHistory] = useState<ReviewHistoryItem[]>([]);

  const loadSession = useCallback(async () => {
    setLoading(true);
    try {
      await db.init();
      const stats = await db.getStudyStats();
      setStudyStats(stats);
      if (Array.isArray(customQueue) && customQueue.length > 0) {
        setQueue(customQueue);
      } else {
        let q = await db.getDueCards(deckId || undefined);
        if (q.length === 0 && deckId) q = await db.getDueCards();
        setQueue(q || []);
      }
      setCurrentIndex(0); setIsFlipped(false); setHistory([]);
    } catch (err) {
      console.error('Error loading study session:', err);
      setQueue([]);
    } finally { setLoading(false); }
  }, [deckId, customQueue]);

  useEffect(() => { loadSession(); }, [loadSession]);

  const currentCard = queue[currentIndex] || null;
  const isFinished = !loading && queue.length > 0 && currentIndex >= queue.length;
  const isCurrentFlagged = Boolean(currentCard?.isFlagged || currentCard?.is_flagged);

  const handleRate = useCallback(async (rating: Rating) => {
    if (!currentCard) return;
    const snapshot = { ...currentCard };
    const res = !isCramMode ? await db.recordReview(currentCard, rating) : null;
    setHistory((prev) => [...prev, { cardSnapshot: snapshot, logId: res?.log?.id, rating, previousQueue: queue, previousIndex: currentIndex }]);
    setSessionMetrics((p) => ({
      again: p.again + (rating === Rating.Again ? 1 : 0), hard: p.hard + (rating === Rating.Hard ? 1 : 0),
      good: p.good + (rating === Rating.Good ? 1 : 0), easy: p.easy + (rating === Rating.Easy ? 1 : 0),
      reviewedCount: p.reviewedCount + 1,
    }));
    if (rating === Rating.Again) setQueue((prev) => [...prev, currentCard]);
    setIsFlipped(false); setCurrentIndex((prev) => prev + 1);
  }, [currentCard, isCramMode, queue, currentIndex]);

  const handleUndo = async () => {
    if (history.length === 0) return;
    const last = history[history.length - 1];
    try {
      if (typeof (db as any).undoReview === 'function') {
        await (db as any).undoReview(last.cardSnapshot, last.logId);
      } else {
        await db.saveCard(last.cardSnapshot);
      }
    } catch (err) { console.error('Undo failed:', err); }
    setSessionMetrics((p) => ({
      again: p.again - (last.rating === Rating.Again ? 1 : 0), hard: p.hard - (last.rating === Rating.Hard ? 1 : 0),
      good: p.good - (last.rating === Rating.Good ? 1 : 0), easy: p.easy - (last.rating === Rating.Easy ? 1 : 0),
      reviewedCount: Math.max(0, p.reviewedCount - 1),
    }));
    setQueue(last.previousQueue); setCurrentIndex(last.previousIndex);
    setIsFlipped(false); setHistory((prev) => prev.slice(0, -1));
  };

  const handleToggleFlag = async () => {
    if (!currentCard) return;
    const flagged = !isCurrentFlagged;
    const updated = { ...currentCard, isFlagged: flagged, is_flagged: flagged };
    await db.saveCard(updated);
    setQueue((prev) => prev.map((c, idx) => (idx === currentIndex ? updated : c)));
  };

  const handleCram = async () => {
    if (onCram) { onCram(); return; }
    setLoading(true);
    try {
      await db.init();
      const all = await db.getCards(deckId || undefined);
      if (all.length > 0) {
        setQueue(all); setCurrentIndex(0); setIsFlipped(false); setHistory([]);
      } else { onBack(); }
    } finally { setLoading(false); }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isQuickEditOpen || !currentCard) return;
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;
      if (e.code === 'Space') { e.preventDefault(); setIsFlipped((p) => !p); }
      else if (e.key === 'e' || e.key === 'E') { e.preventDefault(); setIsQuickEditOpen(true); }
      else if (e.key === 'f' || e.key === 'F') { e.preventDefault(); handleToggleFlag(); }
      else if (e.key === 'd' || e.key === 'D') { e.preventDefault(); setIsDrawOpen((p) => !p); }
      else if ((e.key === 'z' || e.key === 'u') && history.length > 0) { e.preventDefault(); handleUndo(); }
      else if (isFlipped) {
        if (mode === 'binary') {
          if (e.key === '1' || e.key === 'ArrowLeft') handleRate(Rating.Again);
          if (e.key === '2' || e.key === 'ArrowRight') handleRate(Rating.Good);
        } else {
          if (e.key === '1') handleRate(Rating.Again); if (e.key === '2') handleRate(Rating.Hard);
          if (e.key === '3') handleRate(Rating.Good); if (e.key === '4') handleRate(Rating.Easy);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isQuickEditOpen, currentCard, isFlipped, mode, handleRate, history.length, isCurrentFlagged]);

  const finalStats: SessionStats = useMemo(() => ({
    totalReviewed: sessionMetrics.reviewedCount, againCount: sessionMetrics.again,
    hardCount: sessionMetrics.hard, goodCount: sessionMetrics.good, easyCount: sessionMetrics.easy,
    streakDays: Math.max(1, studyStats?.streak_days || 1),
  }), [sessionMetrics, studyStats]);

  if (loading) {
    return (
      <div className="min-h-screen bg-canvas flex flex-col items-center justify-center p-6 text-theme-secondary space-y-3">
        <RefreshCw className="h-6 w-6 text-forest animate-spin" /><p className="text-xs font-medium">Entering Study Arena...</p>
      </div>
    );
  }

  if (queue.length === 0) {
    return (
      <div className="min-h-screen bg-canvas text-theme-primary flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-sm p-6 rounded-3xl border border-theme bg-card-theme shadow-sm text-center space-y-5 animate-in zoom-in-95 duration-150">
          <div className="h-16 w-16 rounded-2xl bg-sage text-forest flex items-center justify-center mx-auto"><CheckCircle className="h-8 w-8 text-forest" /></div>
          <div className="space-y-1">
            <h2 className="text-xl font-bold text-theme-primary tracking-tight">All caught up</h2>
            <p className="text-xs text-theme-secondary">No cards due right now.</p>
          </div>
          <div className="space-y-2 pt-2">
            <button onClick={onBack} className="w-full py-3 rounded-2xl bg-forest hover:opacity-90 text-white font-semibold text-xs shadow-sm active:scale-95 transition-all">Dashboard</button>
            <button onClick={handleCram} className="w-full py-2.5 rounded-2xl bg-sage hover:opacity-90 text-forest font-semibold text-xs active:scale-95 transition-all flex items-center justify-center gap-1.5"><Zap className="h-3.5 w-3.5" /><span>Cram Mode</span></button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-canvas text-theme-primary flex flex-col justify-between pb-safe">
      <header className="sticky top-0 z-40 bg-canvas/90 backdrop-blur-md border-b border-theme px-4 pt-safe pb-3">
        <div className="max-w-md mx-auto flex items-center justify-between gap-2">
          <div className="flex items-center gap-1">
            <button onClick={onBack} aria-label="Exit" className="p-1.5 rounded-xl text-theme-secondary hover:text-theme-primary active:scale-95 transition-all"><X className="h-5 w-5" /></button>
            <button type="button" onClick={handleUndo} disabled={history.length === 0} title="Undo rating" className="p-1.5 rounded-xl text-theme-secondary hover:text-theme-primary disabled:opacity-25 active:scale-95 transition-all"><RotateCcw className="h-4 w-4" /></button>
          </div>

          {!isFinished && currentCard && (
            <div className="flex flex-col items-center gap-1 flex-1 px-2">
              <div className="w-24 h-1 bg-[var(--border-subtle)] rounded-full overflow-hidden">
                <div className="h-full bg-forest transition-all duration-300 rounded-full" style={{ width: `${Math.min(100, ((currentIndex + 1) / Math.max(1, queue.length)) * 100)}%` }} />
              </div>
              <span className="text-[11px] text-theme-secondary font-medium">{currentIndex + 1}/{queue.length}</span>
            </div>
          )}

          {!isFinished && currentCard && (
            <div className="flex items-center gap-1">
              <button type="button" onClick={() => setIsDrawOpen((p) => !p)} title="Draw" className={`p-1.5 rounded-xl transition-all active:scale-95 ${isDrawOpen ? 'bg-sage text-forest font-bold' : 'text-theme-secondary hover:text-theme-primary'}`}><PenTool className="h-4 w-4" /></button>
              <button type="button" onClick={handleToggleFlag} title={isCurrentFlagged ? 'Flagged' : 'Flag'} className={`p-1.5 rounded-xl transition-all active:scale-95 ${isCurrentFlagged ? 'text-amber-500 bg-amber-500/10' : 'text-theme-secondary hover:text-theme-primary'}`}><Flag className={`h-4 w-4 ${isCurrentFlagged ? 'fill-current' : ''}`} /></button>
              <button type="button" onClick={() => setMode(mode === 'binary' ? 'pro' : 'binary')} className="px-2 py-0.5 rounded-full bg-sage text-forest text-[10px] font-semibold active:scale-95 transition-all">{mode === 'binary' ? 'Swipe' : 'Pro'}</button>
              <button type="button" onClick={() => setIsQuickEditOpen(true)} title="Edit" className="p-1 rounded-xl text-theme-secondary hover:text-theme-primary transition-all active:scale-95"><Pencil className="h-4 w-4" /></button>
            </div>
          )}
        </div>
      </header>

      <main className="max-w-md w-full mx-auto px-4 py-4 flex-1 flex flex-col justify-center">
        {isFinished ? (
          <SessionComplete stats={finalStats} onReturnToDashboard={onBack} onRestartSession={loadSession} />
        ) : currentCard ? (
          <div className="space-y-4">
            <div className="relative rounded-3xl overflow-hidden">
              <Flashcard3D card={currentCard} isFlipped={isFlipped} onFlip={() => !isDrawOpen && setIsFlipped((p) => !p)} mode={mode} onSwipeRating={handleRate} />
              {isDrawOpen && <ScratchpadOverlay isOpen={isDrawOpen} onClose={() => setIsDrawOpen(false)} cardId={currentCard.id} />}
            </div>
            <RatingControls card={currentCard} isFlipped={isFlipped} onFlip={() => setIsFlipped((p) => !p)} onRate={handleRate} mode={mode} onChangeMode={setMode} />
          </div>
        ) : (
          <div className="w-full max-w-sm mx-auto p-6 rounded-3xl border border-theme bg-card-theme shadow-sm text-center space-y-5">
            <div className="h-16 w-16 rounded-2xl bg-sage text-forest flex items-center justify-center mx-auto"><CheckCircle className="h-8 w-8 text-forest" /></div>
            <div className="space-y-1"><h2 className="text-xl font-bold text-theme-primary tracking-tight">All caught up</h2><p className="text-xs text-theme-secondary">No cards due right now.</p></div>
            <div className="space-y-2 pt-2">
              <button onClick={onBack} className="w-full py-3 rounded-2xl bg-forest hover:opacity-90 text-white font-semibold text-xs shadow-sm active:scale-95 transition-all">Dashboard</button>
              <button onClick={handleCram} className="w-full py-2.5 rounded-2xl bg-sage hover:opacity-90 text-forest font-semibold text-xs active:scale-95 transition-all flex items-center justify-center gap-1.5"><Zap className="h-3.5 w-3.5" /><span>Cram Mode</span></button>
            </div>
          </div>
        )}
      </main>

      {currentCard && (
        <QuickEditModal
          card={currentCard} isOpen={isQuickEditOpen} onClose={() => setIsQuickEditOpen(false)}
          onSave={async (u) => { await db.saveCard(u); setQueue((p) => p.map((c, i) => i === currentIndex ? u : c)); }}
        />
      )}
    </div>
  );
};
