import React, { useState, useMemo, useRef } from 'react';
import type { Deck, Flashcard } from '@/types/models';
import {
  Folder,
  ChevronRight,
  ChevronDown,
  Play,
  Flame,
  Share2,
  MoreHorizontal,
  Trash2,
  Plus,
} from 'lucide-react';

interface DeckTreeProps {
  decks: Deck[]; cards: Flashcard[];
  onStudyDeck: (deckId: string) => void; onAddCards: (deckId: string) => void;
  onCramDeck?: (deckId: string) => void; onShareDeck?: (deck: Deck) => void;
  onDeleteDeck?: (deckId: string) => void;
  onCreateDeck: (deck: { title: string; description?: string; category: string; color?: string; parent_id?: string | null }) => Promise<void>;
}

export const DeckTree: React.FC<DeckTreeProps> = ({ decks, cards, onStudyDeck, onAddCards, onCramDeck, onShareDeck, onDeleteDeck }) => {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [activeMenuDeckId, setActiveMenuDeckId] = useState<string | null>(null), [activeIndex, setActiveIndex] = useState(0);
  const carouselRef = useRef<HTMLDivElement>(null);

  const toggleExpand = (deckId: string) => {
    setExpanded((prev) => ({ ...prev, [deckId]: !prev[deckId] }));
  };

  const deckStats = useMemo(() => {
    const now = Date.now();
    const stats: Record<string, { dueCount: number }> = {};
    for (const deck of decks) {
      const deckCards = cards.filter((c) => c.deck_id === deck.id);
      let dueCount = 0;
      for (const card of deckCards) {
        if (card.state !== 0 && new Date(card.due).getTime() <= now) dueCount++;
      }
      stats[deck.id] = { dueCount };
    }
    return stats;
  }, [decks, cards]);

  const topLevelDecks = useMemo(() => decks.filter((d) => !d.parent_id), [decks]);

  const handleScroll = () => {
    if (!carouselRef.current) return;
    const { scrollLeft, clientWidth } = carouselRef.current;
    if (clientWidth > 0) {
      const idx = Math.round(scrollLeft / clientWidth);
      setActiveIndex(Math.max(0, Math.min(topLevelDecks.length - 1, idx)));
    }
  };

  const scrollToDeck = (idx: number) => {
    if (!carouselRef.current) return;
    const clientWidth = carouselRef.current.clientWidth;
    carouselRef.current.scrollTo({ left: idx * clientWidth, behavior: 'smooth' });
    setActiveIndex(idx);
  };

  if (topLevelDecks.length === 0) return null;

  return (
    <div className="space-y-2.5">
      {/* Horizontal 1-Deck Snap Carousel */}
      <div
        ref={carouselRef}
        onScroll={handleScroll}
        className="flex overflow-x-auto snap-x snap-mandatory gap-3 no-scrollbar scroll-smooth pb-0.5"
      >
        {topLevelDecks.map((deck) => {
          const subdecks = decks.filter((d) => d.parent_id === deck.id);
          const hasSubdecks = subdecks.length > 0;
          const isExpanded = expanded[deck.id] ?? false;
          const { dueCount = 0 } = deckStats[deck.id] || {};
          const isMenuOpen = activeMenuDeckId === deck.id;

          return (
            <div
              key={deck.id}
              className="min-w-full snap-center shrink-0 rounded-2xl border border-theme bg-canvas p-3.5 space-y-2.5 transition-all"
            >
              {/* Top Row: Folder + Title on Left, Due Badge + Study on Right */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-sage text-forest">
                    <Folder className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="text-xs font-bold text-theme-primary truncate">{deck.title}</h4>
                    {hasSubdecks && (
                      <button
                        type="button"
                        onClick={() => toggleExpand(deck.id)}
                        className="text-[10px] text-theme-secondary hover:text-forest flex items-center gap-0.5 font-medium mt-0.5"
                      >
                        <span>{subdecks.length} subdecks</span>
                        {isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      dueCount > 0 ? 'bg-sage text-forest' : 'text-theme-secondary'
                    }`}
                  >
                    {dueCount} due
                  </span>
                  <button
                    type="button"
                    onClick={() => onStudyDeck(deck.id)}
                    className="px-3 py-1 rounded-xl text-xs font-semibold bg-forest text-white hover:opacity-90 active:scale-95 flex items-center gap-1 shadow-xs"
                  >
                    <Play className="h-3 w-3 fill-current" />
                    <span>Study</span>
                  </button>
                </div>
              </div>

              {/* Bottom Row: Share on left, Add Card & ••• on right */}
              <div className="border-t border-theme pt-2 flex items-center justify-between text-xs">
                {onShareDeck ? (
                  <button
                    type="button"
                    onClick={() => onShareDeck(deck)}
                    className="text-[11px] font-semibold text-theme-secondary hover:text-theme-primary flex items-center gap-1 active:scale-95"
                  >
                    <Share2 className="h-3.5 w-3.5 text-forest" />
                    <span>Share</span>
                  </button>
                ) : <div />}

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onAddCards(deck.id)}
                    className="text-[11px] font-semibold text-forest hover:opacity-80 flex items-center gap-1 active:scale-95"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Add Card</span>
                  </button>

                  {/* ••• Action Menu */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveMenuDeckId(isMenuOpen ? null : deck.id);
                      }}
                      className="p-1 rounded-lg text-theme-secondary hover:text-theme-primary active:scale-95 transition-colors"
                      title="More options"
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </button>

                    {isMenuOpen && (
                      <>
                        <div
                          className="fixed inset-0 z-40"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveMenuDeckId(null);
                          }}
                        />
                        <div className="absolute right-0 bottom-7 z-50 w-32 py-1 bg-card-theme border border-theme rounded-xl shadow-xl space-y-0.5 text-xs animate-in fade-in zoom-in-95 duration-100">
                          {onCramDeck && (
                            <button
                              type="button"
                              onClick={() => {
                                setActiveMenuDeckId(null);
                                onCramDeck(deck.id);
                              }}
                              className="w-full px-3 py-1.5 text-left text-theme-primary hover:bg-canvas flex items-center gap-2 font-medium"
                            >
                              <Flame className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />
                              <span>Cram</span>
                            </button>
                          )}
                          {onDeleteDeck && (
                            <button
                              type="button"
                              onClick={() => {
                                setActiveMenuDeckId(null);
                                if (window.confirm(`Delete deck "${deck.title}"?`)) {
                                  onDeleteDeck(deck.id);
                                }
                              }}
                              className="w-full px-3 py-1.5 text-left text-rose-500 hover:bg-rose-500/10 flex items-center gap-2 font-medium border-t border-theme"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              <span>Delete</span>
                            </button>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Subdecks List (collapsible) */}
              {hasSubdecks && isExpanded && (
                <div className="border-t border-theme pt-2 space-y-1.5">
                  {subdecks.map((subdeck) => {
                    const subDue = deckStats[subdeck.id]?.dueCount || 0;
                    return (
                      <div
                        key={subdeck.id}
                        className="flex items-center justify-between p-2 rounded-xl bg-card-theme border border-theme text-xs"
                      >
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <Folder className="h-3.5 w-3.5 text-theme-secondary shrink-0" />
                          <span className="font-semibold text-theme-primary truncate">{subdeck.title}</span>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className="text-[10px] text-theme-secondary font-medium">{subDue} due</span>
                          <button type="button" onClick={() => onStudyDeck(subdeck.id)} className="px-2 py-0.5 rounded-lg bg-forest text-white text-[10px] font-semibold active:scale-95">Study</button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {topLevelDecks.length > 1 && (
        <div className="flex items-center justify-center gap-1.5 pt-0.5">
          {topLevelDecks.map((d, idx) => (
            <button
              key={d.id} type="button" onClick={() => scrollToDeck(idx)}
              className={`transition-all ${activeIndex === idx ? 'w-4 h-1.5 rounded-full bg-forest' : 'w-1.5 h-1.5 rounded-full bg-[var(--border-subtle)] hover:bg-theme-secondary'}`}
              title={d.title}
            />
          ))}
        </div>
      )}
    </div>
  );
};