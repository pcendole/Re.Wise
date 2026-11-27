import React, { useState, useEffect, useMemo } from 'react';
import { db } from '@/lib/database';
import type { Deck, Flashcard, ExamSettings, StudyStats, ReviewLogEntry } from '@/types/models';
import { StreakHeatmap } from '@/components/dashboard/StreakHeatmap';
import { DeckTree } from '@/components/dashboard/DeckTree';
import { NewDeckModal } from '@/components/dashboard/NewDeckModal';
import { ImportExportModal } from '@/components/importer/ImportExportModal';
import { PanicModeModal } from '@/components/study/PanicModeModal';
import { ShareDeckModal } from '@/components/social/ShareDeckModal';
import { StudySquadsModal } from '@/components/social/StudySquadsModal';
import { MemoryFlexModal } from '@/components/social/MemoryFlexModal';
import { ProfileSheet } from '@/components/profile/ProfileSheet';
import { ExamCountdownPill } from '@/components/dashboard/ExamCountdownPill';
import { syncEngine, type SyncState } from '@/lib/syncEngine';
import { getCurrentUser } from '@/lib/supabase';
import { isDarkMode, toggleDarkMode } from '@/lib/theme';
import type { User } from '@supabase/supabase-js';
import { Moon, Sun, ArrowDownToLine, Layers, Plus, Users, User as UserIcon, RefreshCw, ChevronRight } from 'lucide-react';

interface DashboardProps {
  onStudy: (deckId?: string) => void;
  onAddCards: (deckId?: string, tab?: 'basic' | 'cloze' | 'image_occlusion' | 'ai_magic') => void;
  onStartCram: (queue: Flashcard[], isCramMode: boolean) => void;
  onOpenFocus?: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ onStudy, onAddCards, onStartCram }) => {
  const [decks, setDecks] = useState<Deck[]>([]);
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [settings, setSettings] = useState<ExamSettings | null>(null);
  const [stats, setStats] = useState<StudyStats | null>(null);
  const [reviewLogs, setReviewLogs] = useState<ReviewLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [dark, setDark] = useState(isDarkMode());
  const [showImportExport, setShowImportExport] = useState(false);
  const [showPanicModal, setShowPanicModal] = useState(false);
  const [showProfileSheet, setShowProfileSheet] = useState(false);
  const [showNewDeckModal, setShowNewDeckModal] = useState(false);
  const [sharingDeck, setSharingDeck] = useState<Deck | null>(null);
  const [showSquadsModal, setShowSquadsModal] = useState(false);
  const [showFlexModal, setShowFlexModal] = useState(false);
  const [panicDeckId, setPanicDeckId] = useState<string | null>(null);
  const [syncState, setSyncState] = useState<SyncState>('idle');
  const [user, setUser] = useState<User | null>(null);

  const loadDashboardData = async () => {
    try {
      await db.init();
      const [allDecks, allCards, examSettings, studyStats, logs, currentUser] = await Promise.all([
        db.getDecks(), db.getCards(), db.getExamSettings(), db.getStudyStats(), db.getReviewLogs(1000), getCurrentUser(),
      ]);
      setDecks(allDecks); setCards(allCards); setSettings(examSettings);
      setStats(studyStats); setReviewLogs(logs); setUser(currentUser);
    } finally { setLoading(false); }
  };

  useEffect(() => {
    loadDashboardData();
    syncEngine.startPeriodicSync();
    const unsub = syncEngine.subscribe((st) => setSyncState(st));
    return () => { syncEngine.stopPeriodicSync(); unsub(); };
  }, []);

  const totalDueCards = useMemo(() => (
    decks.length === 0 ? [] : cards.filter((c) => new Date(c.due).getTime() <= Date.now())
  ), [decks.length, cards]);

  const effectiveStats = useMemo(() => (
    decks.length === 0 || !stats ? { streak_days: 0, last_study_date: '', total_reviews: 0, review_heatmap: {} } : stats
  ), [decks.length, stats]);

  const handleCreateDeck = async (data: { title: string; description?: string; category: string; color?: string; parent_id?: string | null }) => {
    const now = new Date().toISOString();
    await db.saveDeck({
      id: `deck_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      ...data,
      color: data.color || '#2D5340',
      parent_id: data.parent_id || null,
      created_at: now,
      updated_at: now,
    });
    await loadDashboardData();
  };

  const handleDeleteDeck = async (deckId: string) => {
    await db.deleteDeck(deckId);
    await loadDashboardData();
  };

  if (loading || !settings || !stats) {
    return (
      <div className="min-h-screen bg-canvas flex flex-col items-center justify-center p-6 text-theme-secondary space-y-3">
        <RefreshCw className="h-6 w-6 text-forest animate-spin" />
        <p className="text-xs font-medium">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-canvas text-theme-primary pb-24 selection:bg-[#2D5340]/20">
      <header className="sticky top-0 z-40 bg-canvas/90 backdrop-blur-md border-b border-theme px-4 py-3">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-lg tracking-tight text-theme-primary">Re.Wise</span>
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-sage text-forest">FSRS</span>
          </div>

          <div className="flex items-center gap-2">
            <button onClick={() => setDark(toggleDarkMode())} title="Theme" className="p-2 rounded-xl text-theme-secondary hover:text-theme-primary active:scale-95">
              {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4 text-theme-secondary" />}
            </button>
            <button
              onClick={() => setShowProfileSheet(true)}
              title={user?.email || 'Profile'}
              className="relative p-0.5 rounded-full text-theme-secondary hover:text-theme-primary active:scale-95 transition-all"
            >
              <div className="w-8 h-8 rounded-full bg-sage text-forest flex items-center justify-center font-bold text-xs border border-theme">
                {user?.email ? user.email[0].toUpperCase() : <UserIcon className="h-4 w-4" />}
              </div>
              <span
                className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-canvas ${
                  syncState === 'syncing' ? 'bg-amber-400 animate-pulse' : syncState === 'offline' ? 'bg-zinc-400' : 'bg-emerald-500'
                }`}
              />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 pt-3.5 space-y-3.5">
        {/* 1. Always-Visible Exam / Goal Pill */}
        <ExamCountdownPill
          settings={settings}
          onUpdateSettings={async (s) => {
            await db.saveExamSettings(s);
            setSettings(s);
          }}
        />

        {/* 2. DAILY QUEUE Card */}
        <div className="rounded-2xl border border-theme bg-card-theme p-4 shadow-sm space-y-2">
          <div className="text-[10px] font-bold uppercase tracking-wider text-theme-secondary">DAILY QUEUE</div>
          <div className="flex items-center justify-between">
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl font-extrabold text-theme-primary">{totalDueCards.length}</span>
              <span className="text-sm font-medium text-theme-secondary">Due</span>
            </div>
            <div className="flex items-center gap-2">
              {totalDueCards.length > 0 && (
                <button onClick={() => onStudy()} className="px-3.5 py-1 text-xs rounded-full bg-forest text-white font-semibold hover:opacity-90 active:scale-95">Study</button>
              )}
              <button onClick={() => { setPanicDeckId(null); setShowPanicModal(true); }} className="px-3.5 py-1 text-xs rounded-full bg-sage text-forest font-semibold hover:opacity-90 active:scale-95">Cram</button>
            </div>
          </div>
        </div>

        {/* 3. Your decks Card */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-theme-primary">Your decks</h3>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowNewDeckModal(true)}
                className="px-2.5 py-0.5 rounded-full bg-forest text-white text-xs font-semibold hover:opacity-90 active:scale-95 shadow-xs"
              >
                + Deck
              </button>
              <button
                onClick={() => setShowImportExport(true)}
                className="flex items-center gap-1 text-xs text-theme-secondary hover:text-theme-primary transition-colors"
              >
                <ArrowDownToLine className="h-3 w-3" />
                <span>Import</span>
              </button>
            </div>
          </div>

          <div className="rounded-2xl border border-theme bg-card-theme p-4 shadow-sm">
            {decks.length === 0 ? (
              <div className="py-2 text-center space-y-3">
                <div className="w-10 h-10 rounded-2xl bg-sage flex items-center justify-center text-forest mx-auto">
                  <Layers className="h-5 w-5" />
                </div>
                <div className="text-sm font-semibold text-theme-primary">No decks yet</div>
                <button
                  onClick={() => setShowNewDeckModal(true)}
                  className="w-full py-2.5 rounded-xl bg-forest hover:opacity-90 text-white font-semibold text-xs shadow-sm active:scale-95 flex items-center justify-center gap-1.5"
                >
                  <Plus className="h-3.5 w-3.5" /> <span>+ New Deck</span>
                </button>
              </div>
            ) : (
              <DeckTree
                decks={decks} cards={cards}
                onStudyDeck={(dId) => onStudy(dId)} onAddCards={(dId) => onAddCards(dId)}
                onCramDeck={(dId) => { setPanicDeckId(dId); setShowPanicModal(true); }}
                onShareDeck={(deck) => setSharingDeck(deck)}
                onDeleteDeck={handleDeleteDeck}
                onCreateDeck={handleCreateDeck}
              />
            )}
          </div>
        </div>

        {/* 4. Your rhythm Card */}
        <StreakHeatmap stats={effectiveStats} reviewLogs={reviewLogs} onOpenFlex={() => setShowFlexModal(true)} />

        {/* 5. Study Squads Full-Card Button */}
        <button
          type="button"
          onClick={() => setShowSquadsModal(true)}
          className="w-full rounded-2xl border border-theme bg-card-theme p-3.5 shadow-sm flex items-center justify-between hover:border-forest/40 active:scale-[0.99] transition-all text-left"
        >
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-xl bg-sage text-forest flex items-center justify-center">
              <Users className="h-4 w-4" />
            </div>
            <span className="text-xs font-bold text-theme-primary">Study Squads</span>
          </div>
          <ChevronRight className="h-4 w-4 text-theme-secondary" />
        </button>
      </main>

      <NewDeckModal isOpen={showNewDeckModal} onClose={() => setShowNewDeckModal(false)} topLevelDecks={decks.filter((d) => !d.parent_id)} onCreateDeck={handleCreateDeck} />
      <ProfileSheet
        isOpen={showProfileSheet}
        onClose={() => setShowProfileSheet(false)}
        user={user}
        settings={settings}
        decksCount={decks.length}
        cardsCount={cards.length}
        syncState={syncState}
        onUpdateSettings={async (s) => { await db.saveExamSettings(s); setSettings(s); }}
        onTriggerSync={async () => { await syncEngine.sync(); await loadDashboardData(); }}
        onOpenExport={() => setShowImportExport(true)}
        onAuthChanged={loadDashboardData}
      />
      <ImportExportModal isOpen={showImportExport} onClose={() => setShowImportExport(false)} decks={decks} onImportSuccess={loadDashboardData} />
      <PanicModeModal isOpen={showPanicModal} onClose={() => setShowPanicModal(false)} decks={decks} cards={cards} initialDeckId={panicDeckId} onStartCram={onStartCram} />
      <ShareDeckModal deck={sharingDeck} isOpen={Boolean(sharingDeck)} onClose={() => setSharingDeck(null)} />
      <StudySquadsModal isOpen={showSquadsModal} onClose={() => setShowSquadsModal(false)} userStats={effectiveStats} />
      <MemoryFlexModal isOpen={showFlexModal} onClose={() => setShowFlexModal(false)} stats={effectiveStats} targetExam={settings.target_exam_name} />
    </div>
  );
};