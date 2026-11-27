import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { db } from '@/lib/database';
import type { Deck, Flashcard } from '@/types/models';
import { QuickEditModal } from '@/components/study/QuickEditModal';
import { ImportExportModal } from '@/components/importer/ImportExportModal';
import { NewDeckModal } from '@/components/dashboard/NewDeckModal';
import { ShareDeckModal } from '@/components/social/ShareDeckModal';
import { PanicModeModal } from '@/components/study/PanicModeModal';
import {
  Search, ChevronRight, ArrowUpDown, Plus, Layers, ArrowLeft,
  Folder, Play, Flame, Share2, ArrowUpFromLine, ArrowLeftRight, Flag,
} from 'lucide-react';

interface CardBrowserProps {
  onBack: () => void;
  onAddCards: (deckId?: string) => void;
  onStudy?: (deckId?: string) => void;
  onStartCram?: (queue: Flashcard[], isCramMode: boolean) => void;
}

type FilterChip = 'all' | 'due' | 'new' | 'flagged' | 'cloze' | 'image_occlusion';

export const CardBrowser: React.FC<CardBrowserProps> = ({ onBack, onAddCards, onStudy, onStartCram }) => {
  const [cards, setCards] = useState<Flashcard[]>([]), [decks, setDecks] = useState<Deck[]>([]);
  const [loading, setLoading] = useState(true), [searchQuery, setSearchQuery] = useState('');
  const [selectedDeckId, setSelectedDeckId] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<FilterChip>('all'), [sortAsc, setSortAsc] = useState(false);
  const [editingCard, setEditingCard] = useState<Flashcard | null>(null);
  const [modal, setModal] = useState<'newDeck' | 'share' | 'panic' | 'import' | 'export' | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      await db.init();
      const [allCards, allDecks] = await Promise.all([db.getCards(), db.getDecks()]);
      setCards(allCards); setDecks(allDecks);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const deckMap = useMemo(() => new Map(decks.map((d) => [d.id, d])), [decks]);

  const deckStats = useMemo(() => {
    const now = Date.now(), map = new Map<string, { total: number; due: number; mastered: number }>();
    for (const d of decks) map.set(d.id, { total: 0, due: 0, mastered: 0 });
    for (const c of cards) {
      const s = map.get(c.deck_id);
      if (s) {
        s.total++;
        if (c.state !== 0 && new Date(c.due).getTime() <= now) s.due++;
        if (c.state === 2) s.mastered++;
      }
    }
    return map;
  }, [decks, cards]);

  const filteredCards = useMemo(() => {
    const q = searchQuery.toLowerCase().trim(), now = Date.now();
    const list = cards.filter((c) => {
      if (selectedDeckId && c.deck_id !== selectedDeckId) return false;
      if (activeFilter === 'due' && (c.state === 0 || new Date(c.due).getTime() > now)) return false;
      if (activeFilter === 'new' && c.state !== 0) return false;
      if (activeFilter === 'flagged' && !c.isFlagged && !c.is_flagged) return false;
      if (activeFilter === 'cloze' && c.card_type !== 'cloze') return false;
      if (activeFilter === 'image_occlusion' && c.card_type !== 'image_occlusion') return false;
      return !q || `${c.front} ${c.back} ${c.extra_context || ''} ${(c.tags || []).join(' ')}`.toLowerCase().includes(q);
    });
    return list.sort((a, b) => (sortAsc ? a.front.localeCompare(b.front) : b.front.localeCompare(a.front)));
  }, [cards, selectedDeckId, searchQuery, activeFilter, sortAsc]);

  const selectedDeck = selectedDeckId ? (deckMap.get(selectedDeckId) || null) : null;
  const isListView = selectedDeckId !== null || searchQuery.trim() !== '';

  const handleCreateDeck = async (deckData: any) => {
    await db.saveDeck(deckData);
    await loadData();
    setSelectedDeckId(deckData.id);
    setModal(null);
  };

  const chips: { id: FilterChip; label: string }[] = [
    { id: 'all', label: 'All' }, { id: 'due', label: 'Due' }, { id: 'new', label: 'New' },
    { id: 'flagged', label: 'Flagged' }, { id: 'cloze', label: 'Cloze' }, { id: 'image_occlusion', label: 'Occlusion' },
  ];

  return (
    <div className="min-h-screen bg-canvas text-theme-primary pb-28 selection:bg-[#2D5340]/20">
      <header className="sticky top-0 z-40 bg-canvas/90 backdrop-blur-md border-b border-theme px-4 py-3">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button onClick={onBack} className="p-1 rounded-xl text-theme-secondary hover:text-theme-primary"><ArrowLeft className="h-4 w-4" /></button>
            <h2 className="font-extrabold text-lg tracking-tight text-theme-primary">Browse</h2>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setModal('newDeck')} className="px-2.5 py-1 rounded-xl bg-forest text-white text-xs font-semibold hover:opacity-90 active:scale-95 flex items-center gap-1 shadow-xs">
              <Plus className="h-3 w-3" /> <span>+ Deck</span>
            </button>
            <button onClick={() => setModal('import')} title="Import / Export" className="p-2 rounded-xl text-theme-secondary hover:text-theme-primary hover:bg-card-theme transition-all active:scale-95">
              <ArrowLeftRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 pt-3.5 space-y-3">
        <div className="relative">
          <Search className="absolute left-3.5 top-3 h-4 w-4 text-theme-secondary" />
          <input
            type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search cards..."
            className="w-full bg-card-theme border border-theme rounded-2xl pl-10 pr-10 py-2.5 text-xs text-theme-primary placeholder:text-theme-secondary focus:outline-none focus:border-forest transition-colors shadow-sm"
          />
          <button onClick={() => setSortAsc(!sortAsc)} className="absolute right-3.5 top-3 text-theme-secondary hover:text-theme-primary">
            <ArrowUpDown className="h-4 w-4" />
          </button>
        </div>

        {loading ? (
          <div className="py-12 text-center text-xs text-theme-secondary">Loading...</div>
        ) : decks.length === 0 ? (
          <div className="py-16 text-center space-y-3">
            <div className="w-10 h-10 rounded-2xl bg-sage flex items-center justify-center text-forest mx-auto"><Layers className="h-5 w-5" /></div>
            <div className="text-sm font-semibold text-theme-primary">No decks yet</div>
            <button onClick={() => setModal('newDeck')} className="py-2 px-4 rounded-xl bg-forest hover:opacity-90 text-white font-semibold text-xs shadow-sm active:scale-95 inline-flex items-center gap-1.5">
              <Plus className="h-3.5 w-3.5" /> <span>+ New Deck</span>
            </button>
          </div>
        ) : !isListView ? (
          <div className="grid grid-cols-2 gap-4 pt-3">
            {decks.map((deck) => {
              const s = deckStats.get(deck.id) || { total: 0, due: 0, mastered: 0 };
              const ratio = s.total > 0 ? Math.min(100, Math.round((s.mastered / s.total) * 100)) : 0;
              return (
                <div key={deck.id} onClick={() => setSelectedDeckId(deck.id)} className="relative cursor-pointer group active:scale-95 transition-all pt-2.5">
                  <div className="absolute -top-2 left-2 right-2 h-8 rounded-2xl bg-card-theme border border-theme shadow-xs scale-[0.92]" />
                  <div className="absolute -top-1 left-1 right-1 h-8 rounded-2xl bg-card-theme border border-theme shadow-xs scale-[0.96]" />
                  <div className="relative z-10 rounded-2xl border border-theme bg-card-theme p-3.5 shadow-sm space-y-2.5 hover:border-forest/40 transition-all flex flex-col justify-between h-36">
                    <div className="flex items-center justify-between">
                      <div className="h-7 w-7 rounded-xl bg-sage text-forest flex items-center justify-center"><Folder className="h-3.5 w-3.5" /></div>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${s.due > 0 ? 'bg-sage text-forest' : 'text-theme-secondary'}`}>{s.due} due</span>
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-theme-primary truncate leading-tight">{deck.title}</h4>
                      <span className="text-[10px] text-theme-secondary font-medium">{s.total} cards</span>
                    </div>
                    <div className="w-full bg-canvas border border-theme h-1.5 rounded-full overflow-hidden">
                      <div className="h-full bg-forest transition-all duration-300" style={{ width: `${ratio}%` }} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="space-y-3">
            {selectedDeck && (
              <div className="p-3 rounded-2xl bg-card-theme border border-theme space-y-2.5">
                <div className="flex items-center justify-between">
                  <button type="button" onClick={() => { setSelectedDeckId(null); setSearchQuery(''); }} className="flex items-center gap-1 text-xs font-semibold text-forest hover:opacity-80 active:scale-95">
                    <ArrowLeft className="h-3.5 w-3.5" /> <span>All Decks</span>
                  </button>
                  <h3 className="text-xs font-bold text-theme-primary truncate max-w-[180px]">{selectedDeck.title}</h3>
                </div>

                <div className="flex items-center justify-between gap-1.5 pt-1 border-t border-theme">
                  <div className="flex items-center gap-1.5 flex-1">
                    <button type="button" onClick={() => onAddCards(selectedDeck.id)} className="flex-1 py-1.5 px-2.5 rounded-xl bg-forest text-white text-xs font-semibold hover:opacity-90 active:scale-95 flex items-center justify-center gap-1 shadow-xs">
                      <Plus className="h-3.5 w-3.5" /> <span>+ Add Card</span>
                    </button>
                    <button type="button" onClick={() => onStudy?.(selectedDeck.id)} className="py-1.5 px-3 rounded-xl bg-sage text-forest text-xs font-semibold hover:opacity-90 active:scale-95 flex items-center justify-center gap-1">
                      <Play className="h-3 w-3 fill-current" /> <span>Study</span>
                    </button>
                  </div>
                  <div className="flex items-center gap-1">
                    <button type="button" title="Cram Deck" onClick={() => setModal('panic')} className="p-1.5 rounded-xl text-theme-secondary hover:text-theme-primary hover:bg-canvas active:scale-95 border border-theme">
                      <Flame className="h-3.5 w-3.5 text-amber-500" />
                    </button>
                    <button type="button" title="Share Deck" onClick={() => setModal('share')} className="p-1.5 rounded-xl text-theme-secondary hover:text-theme-primary hover:bg-canvas active:scale-95 border border-theme">
                      <Share2 className="h-3.5 w-3.5" />
                    </button>
                    <button type="button" title="Export Deck" onClick={() => setModal('export')} className="p-1.5 rounded-xl text-theme-secondary hover:text-theme-primary hover:bg-canvas active:scale-95 border border-theme">
                      <ArrowUpFromLine className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
              {chips.map((chip) => (
                <button
                  key={chip.id} onClick={() => setActiveFilter(chip.id)}
                  className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-all active:scale-95 ${
                    activeFilter === chip.id ? 'bg-sage text-forest' : 'bg-card-theme border border-theme text-theme-secondary hover:text-theme-primary'
                  }`}
                >
                  {chip.label}
                </button>
              ))}
            </div>

            {filteredCards.length === 0 ? (
              <div className="py-12 text-center text-xs text-theme-secondary">No matching cards</div>
            ) : (
              <div className="space-y-2">
                {filteredCards.map((c) => {
                  const cardTitle = c.front.replace(/\{\{c\d+::(.*?)\}\}/g, '[$1]');
                  const d = deckMap.get(c.deck_id);
                  const days = Math.round(c.scheduled_days || 0);
                  const interval = c.state === 0 ? 'New' : days > 0 ? `${days}d` : '1d';
                  return (
                    <div
                      key={c.id} onClick={() => setEditingCard(c)}
                      className="rounded-2xl border border-theme bg-card-theme p-3.5 shadow-sm space-y-2 cursor-pointer hover:border-forest/40 transition-all active:scale-[0.99]"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="text-xs font-semibold text-theme-primary line-clamp-2 leading-snug">{cardTitle}</h4>
                        <ChevronRight className="h-4 w-4 text-theme-secondary shrink-0 mt-0.5" />
                      </div>
                      <div className="flex items-center justify-between text-[10px]">
                        <div className="flex items-center gap-1">
                          <span className="px-2 py-0.5 rounded-full bg-sage text-forest font-semibold truncate max-w-[120px]">{d?.title || 'General'}</span>
                          {(c.isFlagged || c.is_flagged) && <Flag className="h-2.5 w-2.5 text-amber-500 fill-current" />}
                        </div>
                        <span className="text-theme-secondary font-mono font-medium">{interval}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </main>

      {editingCard && (
        <QuickEditModal
          card={editingCard} isOpen={Boolean(editingCard)} onClose={() => setEditingCard(null)}
          onSave={async (u) => { await db.saveCard(u); setCards(p => p.map(c => c.id === u.id ? u : c)); setEditingCard(null); }}
          onDelete={async (id: string) => { await db.deleteCard(id); setCards(p => p.filter(c => c.id !== id)); setEditingCard(null); }}
        />
      )}
      <NewDeckModal isOpen={modal === 'newDeck'} onClose={() => setModal(null)} topLevelDecks={decks} onCreateDeck={handleCreateDeck} />
      <ShareDeckModal deck={selectedDeck} isOpen={modal === 'share'} onClose={() => setModal(null)} />
      <PanicModeModal isOpen={modal === 'panic'} onClose={() => setModal(null)} decks={decks} cards={cards} initialDeckId={selectedDeckId} onStartCram={(q, m) => { setModal(null); onStartCram?.(q, m); }} />
      <ImportExportModal isOpen={modal === 'import' || modal === 'export'} onClose={() => setModal(null)} decks={decks} onImportSuccess={loadData} initialTab={modal === 'export' ? 'export' : 'import'} initialExportDeckId={selectedDeckId || undefined} />
    </div>
  );
};
