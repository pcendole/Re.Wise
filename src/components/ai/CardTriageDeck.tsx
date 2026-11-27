import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { RawExtractedCard } from '@/lib/aiCardGenerator';
import { db } from '@/lib/database';
import { initNewFSRSCard } from '@/lib/fsrsEngine';
import type { Flashcard } from '@/types/models';
import { Check, X, Edit3, ArrowLeft, Tag, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface CardTriageDeckProps {
  cards: RawExtractedCard[];
  targetDeckId: string;
  targetDeckTitle?: string;
  onFinish: (savedCount: number) => void;
  onCancel: () => void;
}

export const CardTriageDeck: React.FC<CardTriageDeckProps> = ({
  cards: initialCards,
  targetDeckId,
  targetDeckTitle = 'Selected Deck',
  onFinish,
  onCancel,
}) => {
  const [candidates, setCandidates] = useState<RawExtractedCard[]>(initialCards);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [keptCards, setKeptCards] = useState<RawExtractedCard[]>([]);
  const [discardedCount, setDiscardedCount] = useState(0);
  const [editingCard, setEditingCard] = useState<RawExtractedCard | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [dragDirection, setDragDirection] = useState<'left' | 'right' | null>(null);

  const currentCard = candidates[currentIndex] || null;
  const isFinished = currentIndex >= candidates.length;

  const handleKeep = (cardToKeep = currentCard) => {
    if (!cardToKeep) return;
    setKeptCards((prev) => [...prev, cardToKeep]);
    setEditingCard(null);
    setCurrentIndex((prev) => prev + 1);
  };

  const handleDiscard = () => {
    setDiscardedCount((prev) => prev + 1);
    setEditingCard(null);
    setCurrentIndex((prev) => prev + 1);
  };

  const handleSaveEdit = () => {
    if (!editingCard) return;
    setCandidates((prev) => {
      const copy = [...prev];
      copy[currentIndex] = editingCard;
      return copy;
    });
    setEditingCard(null);
  };

  const handleSaveAllKept = async () => {
    if (keptCards.length === 0) { onFinish(0); return; }
    setIsSaving(true);
    try {
      const now = new Date();
      for (const card of keptCards) {
        const fsrsParams = initNewFSRSCard(now);
        const newCard: Flashcard = {
          id: `card_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          deck_id: targetDeckId,
          card_type: card.cardType,
          front: card.front,
          back: card.back,
          extra_context: card.extraContext,
          tags: card.tags,
          ...fsrsParams,
          created_at: now.toISOString(),
          updated_at: now.toISOString(),
        };
        await db.saveCard(newCard);
      }
      onFinish(keptCards.length);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto w-full px-4 py-3 space-y-4 text-theme-primary">
      {/* Top Bar with Live Counter */}
      <div className="flex items-center justify-between text-xs pb-2 border-b border-theme">
        <button onClick={onCancel} className="text-theme-secondary hover:text-theme-primary flex items-center gap-1 font-medium">
          <ArrowLeft className="h-4 w-4" /> Cancel
        </button>
        <div className="flex items-center gap-2 font-mono font-bold text-[11px]">
          <span className="text-forest">✓ {keptCards.length} Kept</span>
          <span className="text-theme-secondary">•</span>
          <span className="text-rose-500">✕ {discardedCount} Discarded</span>
          <span className="text-theme-secondary">•</span>
          <span className="text-theme-primary">{Math.max(0, candidates.length - currentIndex)} Left</span>
        </div>
      </div>

      {!isFinished && currentCard ? (
        <div className="space-y-4">
          {/* Card Stack Area */}
          <div className="relative h-[320px] flex items-center justify-center select-none">
            {candidates[currentIndex + 2] && (
              <div className="absolute inset-x-8 top-6 bottom-0 rounded-2xl bg-card-theme/40 border border-theme transform scale-90 translate-y-3 pointer-events-none" />
            )}
            {candidates[currentIndex + 1] && (
              <div className="absolute inset-x-4 top-3 bottom-0 rounded-2xl bg-card-theme/70 border border-theme transform scale-95 translate-y-1.5 pointer-events-none" />
            )}

            {/* Active Draggable Card */}
            <motion.div
              key={currentIndex}
              drag={editingCard ? false : 'x'}
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.7}
              onDrag={(_, info) => {
                if (info.offset.x > 50) setDragDirection('right');
                else if (info.offset.x < -50) setDragDirection('left');
                else setDragDirection(null);
              }}
              onDragEnd={(_, info) => {
                setDragDirection(null);
                if (info.offset.x > 90) handleKeep();
                else if (info.offset.x < -90) handleDiscard();
              }}
              className="absolute inset-0 rounded-2xl bg-card-theme border border-theme p-5 shadow-lg flex flex-col justify-between cursor-grab active:cursor-grabbing"
            >
              <AnimatePresence>
                {dragDirection === 'right' && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute top-4 right-4 z-20 px-3 py-1 rounded-xl bg-sage text-forest font-bold text-xs uppercase">
                    KEEP ✓
                  </motion.div>
                )}
                {dragDirection === 'left' && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute top-4 left-4 z-20 px-3 py-1 rounded-xl bg-rose-500/10 text-rose-500 border border-rose-500/30 font-bold text-xs uppercase">
                    DISCARD ✕
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="flex items-center justify-between text-xs pb-2 border-b border-theme">
                <div className="flex items-center gap-1.5">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-sage text-forest">
                    {currentCard.cardType}
                  </span>
                  <span className="text-[11px] text-theme-secondary truncate max-w-[160px]">Deck: {targetDeckTitle}</span>
                </div>
                <button type="button" onClick={() => setEditingCard(editingCard ? null : { ...currentCard })} className="flex items-center gap-1 text-[11px] text-forest hover:opacity-85 font-semibold">
                  <Edit3 className="h-3.5 w-3.5" />
                  <span>{editingCard ? 'Done' : 'Edit'}</span>
                </button>
              </div>

              {editingCard ? (
                <div className="space-y-2 py-1 flex-1 overflow-y-auto text-xs" onClick={(e) => e.stopPropagation()}>
                  <textarea value={editingCard.front} onChange={(e) => setEditingCard({ ...editingCard, front: e.target.value })} placeholder="Question..." className="w-full bg-canvas border border-theme rounded-lg p-2 text-xs text-theme-primary focus:outline-none focus:border-forest resize-none h-14" />
                  <textarea value={editingCard.back} onChange={(e) => setEditingCard({ ...editingCard, back: e.target.value })} placeholder="Answer..." className="w-full bg-canvas border border-theme rounded-lg p-2 text-xs text-theme-primary focus:outline-none focus:border-forest resize-none h-12" />
                  <Button size="sm" onClick={handleSaveEdit} className="w-full h-7 text-xs bg-forest hover:opacity-90 text-white">Apply Changes</Button>
                </div>
              ) : (
                <div className="my-auto space-y-2.5 text-center px-1">
                  <div className="p-2.5 rounded-xl bg-canvas border border-theme">
                    <span className="text-[9px] font-bold text-theme-secondary block mb-0.5">FRONT</span>
                    <p className="text-xs sm:text-sm font-semibold text-theme-primary leading-relaxed line-clamp-4">{currentCard.front}</p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-sage/30 border border-forest/20">
                    <span className="text-[9px] font-bold text-forest block mb-0.5">BACK</span>
                    <p className="text-xs sm:text-sm font-bold text-forest leading-relaxed line-clamp-3">{currentCard.back}</p>
                  </div>
                  {currentCard.extraContext && <p className="text-[10px] text-theme-secondary italic truncate">💡 {currentCard.extraContext}</p>}
                </div>
              )}

              <div className="flex items-center gap-1.5 flex-wrap pt-2 border-t border-theme text-[10px] text-theme-secondary font-mono">
                <Tag className="h-3 w-3 text-forest" />
                {currentCard.tags?.map((t) => <span key={t} className="px-1.5 py-0.2 rounded bg-canvas border border-theme text-theme-primary">#{t}</span>) || <span>No tags</span>}
              </div>
            </motion.div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-center gap-4 pt-1">
            <button onClick={handleDiscard} className="flex items-center justify-center h-12 w-12 rounded-full bg-card-theme border-2 border-rose-500/40 text-rose-500 hover:bg-rose-500/10 active:scale-95 transition-all shadow-sm" title="Discard">
              <X className="h-6 w-6 stroke-[2.5]" />
            </button>
            <button onClick={() => setEditingCard(editingCard ? null : { ...currentCard })} className="flex items-center justify-center h-10 w-10 rounded-full bg-card-theme border border-theme text-theme-secondary hover:text-theme-primary active:scale-95 transition-all" title="Edit">
              <Edit3 className="h-4 w-4" />
            </button>
            <button onClick={() => handleKeep()} className="flex items-center justify-center h-12 w-12 rounded-full bg-card-theme border-2 border-forest text-forest hover:bg-sage active:scale-95 transition-all shadow-sm" title="Keep">
              <Check className="h-6 w-6 stroke-[2.5]" />
            </button>
          </div>
        </div>
      ) : (
        /* Completion Summary */
        <div className="text-center py-6 px-4 rounded-2xl bg-card-theme border border-theme space-y-4 shadow-sm">
          <div className="h-12 w-12 rounded-2xl bg-sage text-forest flex items-center justify-center mx-auto">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-theme-primary">Triage Complete</h3>
            <p className="text-xs text-theme-secondary max-w-xs mx-auto mt-1">
              You selected <span className="text-forest font-bold">{keptCards.length} cards</span> for <span className="text-theme-primary font-bold">{targetDeckTitle}</span>.
            </p>
          </div>
          <Button size="lg" onClick={handleSaveAllKept} disabled={isSaving || keptCards.length === 0} className="w-full bg-forest hover:opacity-90 text-white font-bold text-xs shadow-sm">
            {isSaving ? 'Saving...' : `Save ${keptCards.length} Cards to Deck`}
          </Button>
        </div>
      )}
    </div>
  );
};
