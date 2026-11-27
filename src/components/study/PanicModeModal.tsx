import React, { useState, useMemo } from 'react';
import type { Deck, Flashcard } from '@/types/models';
import { Flame, X, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PanicModeModalProps {
  isOpen: boolean;
  onClose: () => void;
  decks: Deck[];
  cards: Flashcard[];
  onStartCram: (queue: Flashcard[], isCramMode: boolean) => void;
  initialDeckId?: string | null;
}

export const PanicModeModal: React.FC<PanicModeModalProps> = ({
  isOpen,
  onClose,
  decks,
  cards,
  onStartCram,
  initialDeckId,
}) => {
  const [selectedDeckId, setSelectedDeckId] = useState<string>(initialDeckId || 'all');
  const [cardFilter, setCardFilter] = useState<'all' | 'weak' | 'new' | 'due'>('all');
  const [selectedTag, setSelectedTag] = useState<string>('all');
  const [batchSize, setBatchSize] = useState<number | 'all'>(25);
  const [cramOnly, setCramOnly] = useState(true);

  const allTags = useMemo(() => {
    const tagsSet = new Set<string>();
    cards.forEach((c) => c.tags?.forEach((t) => tagsSet.add(t)));
    return Array.from(tagsSet).sort();
  }, [cards]);

  const matchingCards = useMemo(() => {
    const now = Date.now();
    return cards.filter((c) => {
      if (selectedDeckId !== 'all') {
        const isSelfOrSub = c.deck_id === selectedDeckId;
        if (!isSelfOrSub) return false;
      }

      if (selectedTag !== 'all') {
        if (!c.tags?.includes(selectedTag)) return false;
      }

      if (cardFilter === 'weak') {
        return c.lapses > 0 || c.difficulty >= 6 || (c.state !== 0 && c.stability < 3);
      }
      if (cardFilter === 'new') {
        return c.state === 0;
      }
      if (cardFilter === 'due') {
        return new Date(c.due).getTime() <= now;
      }

      return true;
    });
  }, [cards, selectedDeckId, selectedTag, cardFilter]);

  if (!isOpen) return null;

  const handleLaunch = () => {
    if (matchingCards.length === 0) return;
    const shuffled = [...matchingCards].sort(() => Math.random() - 0.5);
    const finalQueue = batchSize === 'all' ? shuffled : shuffled.slice(0, batchSize);
    onStartCram(finalQueue, cramOnly);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="w-full max-w-md rounded-2xl border border-theme bg-card-theme p-5 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto text-theme-primary"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-2 border-b border-theme">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-sage text-forest">
              <Flame className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-theme-primary tracking-tight">Cram</h3>
            </div>
          </div>
          <button onClick={onClose} className="text-theme-secondary hover:text-theme-primary p-1 rounded-lg hover:bg-canvas transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Form Controls */}
        <div className="space-y-3.5 text-xs">
          {/* Deck Scope */}
          <div className="space-y-1">
            <label className="text-theme-primary font-semibold">Deck</label>
            <select
              value={selectedDeckId}
              onChange={(e) => setSelectedDeckId(e.target.value)}
              className="w-full rounded-xl bg-canvas border border-theme px-3 py-2 text-theme-primary focus:outline-none focus:border-forest"
            >
              <option value="all">All Decks</option>
              {decks.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.parent_id ? `↳ ${d.title}` : d.title}
                </option>
              ))}
            </select>
          </div>

          {/* Card Criteria Filter */}
          <div className="space-y-1">
            <label className="text-theme-primary font-semibold">Category</label>
            <div className="grid grid-cols-2 gap-1.5">
              {[
                { id: 'all', label: 'All Cards' },
                { id: 'weak', label: 'Weak' },
                { id: 'new', label: 'New' },
                { id: 'due', label: 'Due' },
              ].map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setCardFilter(f.id as any)}
                  className={`p-2 rounded-xl border text-center font-medium transition-all ${
                    cardFilter === f.id
                      ? 'bg-sage border-forest text-forest font-semibold'
                      : 'bg-canvas border-theme text-theme-secondary hover:text-theme-primary'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Optional Tag Filter */}
          {allTags.length > 0 && (
            <div className="space-y-1">
              <label className="text-theme-primary font-semibold flex items-center gap-1">
                <Filter className="h-3 w-3 text-forest" />
                <span>Tag</span>
              </label>
              <select
                value={selectedTag}
                onChange={(e) => setSelectedTag(e.target.value)}
                className="w-full rounded-xl bg-canvas border border-theme px-3 py-2 text-theme-primary focus:outline-none focus:border-forest"
              >
                <option value="all">All Tags</option>
                {allTags.map((tag) => (
                  <option key={tag} value={tag}>#{tag}</option>
                ))}
              </select>
            </div>
          )}

          {/* Batch Size Selector */}
          <div className="space-y-1">
            <label className="text-theme-primary font-semibold">Batch Size</label>
            <div className="grid grid-cols-4 gap-1.5 font-bold">
              {[10, 25, 50, 'all'].map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setBatchSize(val as any)}
                  className={`py-1.5 rounded-xl border text-center transition-all ${
                    batchSize === val
                      ? 'bg-forest text-white border-forest font-black shadow-xs'
                      : 'bg-canvas border-theme text-theme-secondary hover:text-theme-primary'
                  }`}
                >
                  {val === 'all' ? 'All' : `${val}`}
                </button>
              ))}
            </div>
          </div>

          {/* Cram Only Toggle */}
          <div
            onClick={() => setCramOnly(!cramOnly)}
            className="flex items-center gap-2.5 p-3 rounded-xl bg-sage/40 border border-theme cursor-pointer select-none"
          >
            <input
              type="checkbox"
              checked={cramOnly}
              onChange={() => {}}
              className="rounded bg-canvas border-theme text-forest focus:ring-0"
            />
            <span className="font-semibold text-theme-primary">Cram only (schedules unchanged)</span>
          </div>

          {/* Launch Action */}
          <div className="pt-2">
            <Button
              onClick={handleLaunch}
              disabled={matchingCards.length === 0}
              className="w-full h-11 rounded-xl bg-forest hover:opacity-90 text-white font-bold text-xs gap-2 shadow-sm"
            >
              <Flame className="h-4 w-4 fill-current" />
              <span>
                {matchingCards.length > 0
                  ? `Start (${batchSize === 'all' ? matchingCards.length : Math.min(Number(batchSize), matchingCards.length)})`
                  : 'No Cards Found'}
              </span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
