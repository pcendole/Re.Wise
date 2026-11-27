import React, { useState, useEffect } from 'react';
import { ArrowLeft, Download, CheckCircle2, BadgeCheck, Sparkles, Layers, RotateCw, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { db } from '@/lib/database';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import type { Deck, Flashcard } from '@/types/models';

interface SharedDeckPreviewProps {
  slug: string;
  onCloseOrHome: () => void;
  onDeckCloned?: (deckId: string) => void;
}

export const SharedDeckPreview: React.FC<SharedDeckPreviewProps> = ({ slug, onCloseOrHome, onDeckCloned }) => {
  const [deck, setDeck] = useState<Deck | null>(null), [cards, setCards] = useState<Flashcard[]>([]);
  const [authorName, setAuthorName] = useState('Re.Wise Creator'), [isVerified, setIsVerified] = useState(true);
  const [loading, setLoading] = useState(true), [cloning, setCloning] = useState(false);
  const [clonedDeckId, setClonedDeckId] = useState<string | null>(null), [sampleIndex, setSampleIndex] = useState(0), [isFlipped, setIsFlipped] = useState(false);

  useEffect(() => {
    const loadSharedDeck = async () => {
      setLoading(true);
      try {
        await db.init();
        let payload: any = null;

        const local = localStorage.getItem(`rewise_shared_${slug}`);
        if (local) {
          payload = JSON.parse(local);
        } else if (isSupabaseConfigured) {
          const { data } = await supabase.from('shared_decks').select('*').eq('slug', slug).maybeSingle();
          if (data?.deck_snapshot) payload = data.deck_snapshot;
        }

        if (!payload) payload = getDemoSharedDeck(slug);

        setDeck(payload.deck);
        setCards(payload.cards || []);
        if (payload.authorName) setAuthorName(payload.authorName);
        if (payload.isVerified !== undefined) setIsVerified(payload.isVerified);
      } catch (err) {
        console.warn('Error loading shared deck:', err);
      } finally {
        setLoading(false);
      }
    };

    loadSharedDeck();
  }, [slug]);

  const handleCloneDeck = async () => {
    if (!deck || cards.length === 0) return;
    setCloning(true);
    try {
      const now = new Date().toISOString();
      const newDeckId = `deck_shared_${Date.now()}`;
      await db.saveDeck({
        ...deck,
        id: newDeckId,
        title: `${deck.title} (Shared)`,
        parent_id: null,
        created_at: now,
        updated_at: now,
      });

      for (let i = 0; i < cards.length; i++) {
        const c = cards[i];
        await db.saveCard({
          ...c,
          id: `card_shared_${Date.now()}_${i}`,
          deck_id: newDeckId,
          state: 0,
          due: now,
          stability: 0,
          difficulty: 0,
          reps: 0,
          lapses: 0,
          created_at: now,
          updated_at: now,
        });
      }

      setClonedDeckId(newDeckId);
      if (onDeckCloned) onDeckCloned(newDeckId);
    } catch (err) {
      console.error('Error cloning deck:', err);
    } finally {
      setCloning(false);
    }
  };

  if (loading || !deck) {
    return (
      <div className="min-h-screen bg-canvas flex flex-col items-center justify-center p-6 text-theme-secondary space-y-3">
        <RotateCw className="h-7 w-7 text-forest animate-spin" />
        <p className="text-sm">Loading deck preview...</p>
      </div>
    );
  }

  const sampleCards = cards.slice(0, 5);
  const currentCard = sampleCards[sampleIndex] || sampleCards[0];

  return (
    <div className="min-h-screen bg-canvas text-theme-primary p-4 pb-20 flex flex-col">
      <div className="max-w-xl w-full mx-auto space-y-4">
        {/* Navigation & Back */}
        <div className="flex items-center justify-between">
          <Button size="sm" variant="ghost" onClick={onCloseOrHome} className="gap-1 pl-1">
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Dashboard</span>
          </Button>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-sage text-forest text-[11px] font-bold">
            <Sparkles className="h-3 w-3" />
            <span>Deck Preview</span>
          </div>
        </div>

        {/* Deck Header */}
        <div className="p-5 rounded-3xl border border-theme bg-card-theme shadow-sm space-y-3">
          <div className="flex items-center gap-2.5">
            <div className="h-10 w-10 rounded-2xl bg-sage flex items-center justify-center text-forest">
              <Layers className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-theme-primary tracking-tight">{deck.title}</h1>
              <div className="flex items-center gap-1.5 text-xs text-theme-secondary">
                <span>{deck.category || 'General'}</span>
                <span>•</span>
                <span>{cards.length} Cards</span>
              </div>
            </div>
          </div>

          {isVerified && (
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-sage text-forest text-xs font-semibold">
              <BadgeCheck className="h-4 w-4" />
              <span>Created by {authorName}</span>
            </div>
          )}

          {deck.description && <p className="text-xs text-theme-secondary">{deck.description}</p>}
        </div>

        {/* Interactive Sample Card */}
        {sampleCards.length > 0 && !clonedDeckId && (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs text-theme-secondary font-medium px-1">
              <span>Sample {sampleIndex + 1} of {sampleCards.length}</span>
              <span className="text-[11px] text-forest font-semibold">Tap to flip</span>
            </div>

            <div
              onClick={() => setIsFlipped((p) => !p)}
              className="min-h-[200px] p-5 rounded-3xl border border-theme bg-card-theme shadow-sm cursor-pointer transition-all flex flex-col justify-between"
            >
              <div className="text-[10px] font-mono uppercase tracking-wider text-theme-secondary">
                {isFlipped ? 'ANSWER (REVEALED)' : 'QUESTION (FRONT)'}
              </div>
              <div className="text-base sm:text-lg font-bold text-center text-theme-primary py-3">
                {isFlipped ? currentCard.back : currentCard.front.replace(/\{\{c\d+::(.*?)\}\}/g, '[$1]')}
              </div>
              {isFlipped && currentCard.extra_context && (
                <div className="p-2.5 rounded-xl bg-canvas border border-theme text-xs text-theme-secondary">
                  💡 {currentCard.extra_context}
                </div>
              )}
              <div className="text-[10px] text-center text-theme-secondary">Tap anywhere to flip</div>
            </div>

            <div className="flex items-center justify-between gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={sampleIndex === 0}
                onClick={() => { setIsFlipped(false); setSampleIndex((i) => Math.max(0, i - 1)); }}
                className="h-8 px-3 text-xs"
              >
                <ChevronLeft className="h-4 w-4 mr-1" /> Previous
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={sampleIndex >= sampleCards.length - 1}
                onClick={() => { setIsFlipped(false); setSampleIndex((i) => Math.min(sampleCards.length - 1, i + 1)); }}
                className="h-8 px-3 text-xs"
              >
                Next <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        )}

        {/* Clone Deck CTA */}
        {clonedDeckId ? (
          <div className="p-6 rounded-3xl border border-theme bg-card-theme text-center space-y-3 shadow-sm">
            <CheckCircle2 className="h-10 w-10 text-forest mx-auto" />
            <h3 className="text-lg font-bold text-theme-primary">Deck Added to Your Library</h3>
            <p className="text-xs text-theme-secondary">All {cards.length} cards are ready in your daily FSRS active recall queue.</p>
            <Button size="lg" onClick={onCloseOrHome} className="w-full rounded-2xl bg-forest hover:opacity-90 font-bold text-white">
              Open Dashboard
            </Button>
          </div>
        ) : (
          <div className="pt-2">
            <Button
              size="lg"
              disabled={cloning}
              onClick={handleCloneDeck}
              className="w-full h-12 rounded-2xl bg-forest hover:opacity-90 text-white font-bold gap-2 shadow-sm text-sm"
            >
              <Download className="h-4 w-4" />
              <span>Clone Full Deck ({cards.length} Cards)</span>
            </Button>
            <p className="text-[11px] text-center text-theme-secondary mt-2">
              Free • Zero sign-up required • 100% offline-ready
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

function getDemoSharedDeck(slug: string) {
  const now = new Date().toISOString();
  const demoCard = (id: string, card_type: 'basic' | 'cloze', front: string, back: string, extra: string, tag: string): Flashcard => ({
    id, deck_id: `deck_demo_${slug}`, card_type, front, back, extra_context: extra, tags: [tag],
    due: now, stability: 0, difficulty: 0, elapsed_days: 0, scheduled_days: 0, reps: 0, lapses: 0, state: 0, created_at: now, updated_at: now,
  });

  return {
    deck: { id: `deck_demo_${slug}`, title: 'High-Yield Medicine & Science Concepts', description: 'Active recall spotters adhering to the Minimum Information Principle.', category: 'Medical / STEM', color: '#2D5340', created_at: now, updated_at: now },
    authorName: 'Dr. Re.Wise',
    isVerified: true,
    cards: [
      demoCard('c1', 'basic', 'What is the drug of choice for anaphylactic shock?', 'Intramuscular Epinephrine (Adrenaline 1:1000)', 'Dose: 0.5 mg IM in anterolateral thigh.', 'Pharmacology'),
      demoCard('c2', 'cloze', 'In cardiac cycle, the S1 heart sound corresponds to closure of the {{c1::mitral and tricuspid}} valves.', 'mitral and tricuspid', 'Isovolumetric ventricular contraction onset.', 'Cardiology'),
      demoCard('c3', 'basic', 'Which vitamin deficiency presents with Wernicke-Korsakoff syndrome?', 'Vitamin B1 (Thiamine)', 'Triad: Confusion, Ophthalmoplegia, Ataxia.', 'Biochemistry'),
    ],
  };
}
