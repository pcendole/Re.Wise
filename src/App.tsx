import { useState, useEffect } from 'react';
import { App as CapApp } from '@capacitor/app';
import { Dashboard } from '@/pages/Dashboard';
import { CardCreator, type CreatorTab } from '@/pages/CardCreator';
import { StudyArena } from '@/pages/StudyArena';
import { CardBrowser } from '@/pages/CardBrowser';
import { SharedDeckPreview } from '@/pages/SharedDeckPreview';
import { FocusZone } from '@/pages/FocusZone';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { db } from '@/lib/database';
import type { Flashcard } from '@/types/models';
import { LayoutGrid, Timer, PlusCircle, Search, BookOpen } from 'lucide-react';

type ViewMode = 'dashboard' | 'focus_zone' | 'card_creator' | 'study_arena' | 'card_browser';

export default function App() {
  const [currentView, setCurrentView] = useState<ViewMode>('dashboard');
  const [selectedDeckId, setSelectedDeckId] = useState<string | null>(null);
  const [creatorTab, setCreatorTab] = useState<CreatorTab>('basic');
  const [cramQueue, setCramQueue] = useState<Flashcard[] | null>(null);
  const [isCramMode, setIsCramMode] = useState<boolean>(false);
  const [shareSlug, setShareSlug] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const slug = params.get('share');
    if (slug) {
      setShareSlug(slug);
    } else if (window.location.pathname.startsWith('/share/')) {
      const pathSlug = window.location.pathname.replace('/share/', '').trim();
      if (pathSlug) setShareSlug(pathSlug);
    }
  }, []);

  useEffect(() => {
    let handler: any;
    const registerBackHandler = async () => {
      try {
        handler = await CapApp.addListener('backButton', ({ canGoBack }) => {
          if (shareSlug) {
            setShareSlug(null);
            return;
          }
          const openModals = document.querySelectorAll('[role="dialog"], .fixed.inset-0');
          if (openModals.length > 0) {
            document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', bubbles: true }));
            return;
          }
          if (currentView !== 'dashboard') {
            handleBackToDashboard();
            return;
          }
          if (canGoBack) {
            window.history.back();
          } else {
            CapApp.minimizeApp().catch(() => CapApp.exitApp());
          }
        });
      } catch (err) {
        console.warn('Capacitor backButton inactive:', err);
      }
    };
    registerBackHandler();
    return () => {
      if (handler && typeof handler.remove === 'function') handler.remove();
    };
  }, [currentView, shareSlug]);

  const handleStudy = async (deckId?: string) => {
    setSelectedDeckId(deckId || null);
    setIsCramMode(false);
    if (!deckId) {
      try {
        await db.init();
        const due = await db.getDueCards();
        setCramQueue(due);
      } catch (err) {
        console.error('Failed to load due cards for study session:', err);
        setCramQueue([]);
      }
    } else {
      setCramQueue(null);
    }
    setCurrentView('study_arena');
  };

  const handleStartCram = (queue: Flashcard[], cramOnly: boolean) => {
    setCramQueue(queue);
    setIsCramMode(cramOnly);
    setCurrentView('study_arena');
  };

  const handleCramAll = async () => {
    try {
      await db.init();
      const all = await db.getCards(selectedDeckId || undefined);
      if (all.length > 0) {
        handleStartCram(all, true);
      }
    } catch (err) {
      console.error('Failed to start cram session:', err);
    }
  };

  const handleAddCards = (deckId?: string, tab: CreatorTab = 'basic') => {
    setSelectedDeckId(deckId || null);
    setCreatorTab(tab);
    setCurrentView('card_creator');
  };

  const handleBackToDashboard = () => {
    setSelectedDeckId(null);
    setCramQueue(null);
    setIsCramMode(false);
    setRefreshKey((prev) => prev + 1);
    setCurrentView('dashboard');
  };

  const handleCardSaved = () => {
    setRefreshKey((prev) => prev + 1);
  };

  if (shareSlug) {
    return (
      <SharedDeckPreview
        slug={shareSlug}
        onCloseOrHome={() => {
          setShareSlug(null);
          window.history.replaceState({}, '', window.location.pathname);
          handleBackToDashboard();
        }}
        onDeckCloned={(deckId) => {
          setShareSlug(null);
          window.history.replaceState({}, '', window.location.pathname);
          handleStudy(deckId);
        }}
      />
    );
  }

  const navTabs = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutGrid, onClick: () => { setRefreshKey(k => k + 1); setCurrentView('dashboard'); } },
    { id: 'focus_zone', label: 'Focus', icon: Timer, onClick: () => setCurrentView('focus_zone') },
    { id: 'card_creator', label: 'Create', icon: PlusCircle, onClick: () => handleAddCards(undefined, 'basic') },
    { id: 'card_browser', label: 'Browse', icon: Search, onClick: () => setCurrentView('card_browser') },
    { id: 'study_arena', label: 'Study', icon: BookOpen, onClick: () => handleStudy() },
  ] as const;

  return (
    <div className="min-h-screen bg-canvas text-theme-primary flex flex-col font-sans">
      <ErrorBoundary onReset={handleBackToDashboard}>
        {currentView === 'dashboard' && (
          <Dashboard
            key={refreshKey}
            onStudy={handleStudy}
            onAddCards={handleAddCards}
            onStartCram={handleStartCram}
            onOpenFocus={() => setCurrentView('focus_zone')}
          />
        )}

        {currentView === 'focus_zone' && (
          <FocusZone onStudy={handleStudy} />
        )}

        {currentView === 'card_creator' && (
          <CardCreator
            initialDeckId={selectedDeckId}
            initialTab={creatorTab}
            onBack={handleBackToDashboard}
            onCardSaved={handleCardSaved}
          />
        )}

        {currentView === 'study_arena' && (
          <StudyArena
            deckId={selectedDeckId}
            customQueue={cramQueue}
            isCramMode={isCramMode}
            onBack={handleBackToDashboard}
            onCram={handleCramAll}
          />
        )}

        {currentView === 'card_browser' && (
          <CardBrowser
            onBack={handleBackToDashboard}
            onAddCards={handleAddCards}
            onStudy={handleStudy}
            onStartCram={handleStartCram}
          />
        )}
      </ErrorBoundary>

      {/* Warm Paper & Forest 5-Tab Bottom Navigation Bar (Hidden in Study Arena) */}
      {currentView !== 'study_arena' && (
        <nav className="fixed bottom-0 left-0 right-0 z-40 bg-card-theme border-t border-theme px-2 pt-1.5 bottom-nav-safe shadow-sm">
          <div className="max-w-md mx-auto flex items-center justify-around">
            {navTabs.map((tab) => {
              const isActive = currentView === tab.id;
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={tab.onClick}
                  className="flex flex-col items-center gap-0.5 py-1 px-2 transition-all active:scale-95"
                >
                  <div className={`w-11 h-7 rounded-full flex items-center justify-center transition-colors ${
                    isActive ? 'bg-sage text-forest' : 'text-theme-secondary'
                  }`}>
                    <Icon className={`h-4 w-4 ${isActive ? 'stroke-[2.2]' : 'stroke-[1.8]'}`} />
                  </div>
                  <span className={`text-[10px] ${
                    isActive ? 'font-semibold text-forest' : 'font-medium text-theme-secondary'
                  }`}>
                    {tab.label}
                  </span>
                </button>
              );
            })}
          </div>
        </nav>
      )}
    </div>
  );
}
