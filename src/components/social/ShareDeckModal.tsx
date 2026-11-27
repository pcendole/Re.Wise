import React, { useState, useEffect } from 'react';
import { X, Share2, Copy, Check, MessageCircle, BadgeCheck, Layers } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { db } from '@/lib/database';
import { supabase, isSupabaseConfigured, getCurrentUser } from '@/lib/supabase';
import type { Deck, Flashcard } from '@/types/models';

interface ShareDeckModalProps {
  deck: Deck | null;
  isOpen: boolean;
  onClose: () => void;
}

export const ShareDeckModal: React.FC<ShareDeckModalProps> = ({ deck, isOpen, onClose }) => {
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [copied, setCopied] = useState(false);
  const [isVerified, setIsVerified] = useState(true);
  const [creatorName, setCreatorName] = useState('Top Ranker / Re.Wise');
  const [shareSlug, setShareSlug] = useState('');

  useEffect(() => {
    if (!isOpen || !deck) return;

    const prepareShareData = async () => {
      try {
        const deckCards = await db.getCardsByDeck(deck.id);
        setCards(deckCards);

        const sanitizedTitle = deck.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 20);
        const slug = `${sanitizedTitle || 'deck'}-${deck.id.slice(-6)}`;
        setShareSlug(slug);

        const sharePayload = {
          deck,
          cards: deckCards,
          authorName: creatorName,
          isVerified,
          sharedAt: new Date().toISOString(),
        };

        localStorage.setItem(`rewise_shared_${slug}`, JSON.stringify(sharePayload));

        if (isSupabaseConfigured) {
          const user = await getCurrentUser();
          if (user) {
            await supabase.from('shared_decks').upsert(
              {
                author_id: user.id,
                deck_id: deck.id,
                slug,
                title: deck.title,
                description: deck.description || '',
                category: deck.category || 'General',
                card_count: deckCards.length,
                is_public: true,
                deck_snapshot: sharePayload,
                updated_at: new Date().toISOString(),
              },
              { onConflict: 'slug' }
            );
          }
        }
      } catch (err) {
        console.warn('Share deck preparation error:', err);
      }
    };

    prepareShareData();
  }, [isOpen, deck, creatorName, isVerified]);

  if (!isOpen || !deck) return null;

  const baseUrl = window.location.origin + window.location.pathname;
  const shareUrl = `${baseUrl}?share=${shareSlug}`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleWhatsAppShare = () => {
    const text = `🔥 Study "${deck.title}" with me on Re.Wise!\n\n${cards.length} atomic flashcards scheduled with FSRS active recall. Test 5 sample cards in your browser right now:\n${shareUrl}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative w-full max-w-md rounded-3xl border border-theme bg-card-theme p-5 shadow-2xl text-theme-primary space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-theme pb-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-sage text-forest">
              <Share2 className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-theme-primary tracking-tight">Share Deck</h3>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-theme-secondary hover:text-theme-primary hover:bg-canvas transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Deck Summary Pill */}
        <div className="p-3 rounded-2xl bg-canvas border border-theme flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="h-7 w-7 rounded-lg flex items-center justify-center text-forest bg-sage shrink-0">
              <Layers className="h-4 w-4" />
            </div>
            <div className="truncate">
              <h4 className="text-xs font-bold text-theme-primary truncate">{deck.title}</h4>
              <p className="text-[10px] text-theme-secondary">{cards.length} Cards</p>
            </div>
          </div>
        </div>

        {/* Creator Badge & Attribution Options */}
        <div className="space-y-2 p-3 rounded-2xl bg-canvas border border-theme text-xs">
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-1.5 font-semibold text-theme-primary cursor-pointer">
              <BadgeCheck className="h-4 w-4 text-forest" />
              <span>Creator Badge</span>
            </label>
            <input
              type="checkbox"
              checked={isVerified}
              onChange={(e) => setIsVerified(e.target.checked)}
              className="rounded border-theme text-forest focus:ring-0 cursor-pointer h-4 w-4"
            />
          </div>
          {isVerified && (
            <input
              type="text"
              value={creatorName}
              onChange={(e) => setCreatorName(e.target.value)}
              placeholder="Creator name"
              className="w-full bg-card-theme border border-theme rounded-xl px-3 py-1.5 text-xs text-theme-primary placeholder:text-theme-secondary focus:outline-none focus:border-forest"
            />
          )}
        </div>

        {/* Public Share Link Input */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-semibold text-theme-secondary uppercase tracking-wider">Link</label>
          <div className="flex items-center gap-1.5 bg-canvas border border-theme rounded-2xl p-1.5 pl-3">
            <input
              readOnly
              value={shareUrl}
              className="bg-transparent text-xs text-theme-primary flex-1 truncate focus:outline-none font-mono"
            />
            <Button
              size="sm"
              onClick={handleCopyLink}
              className={`h-8 px-3 text-xs font-semibold rounded-xl gap-1 shrink-0 ${copied ? 'bg-sage text-forest' : 'bg-forest hover:opacity-90 text-white'}`}
            >
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </Button>
          </div>
        </div>

        {/* WhatsApp & Social Action */}
        <div className="pt-1">
          <Button
            size="lg"
            onClick={handleWhatsAppShare}
            className="w-full rounded-2xl bg-forest hover:opacity-90 text-white font-bold gap-2 shadow-sm"
          >
            <MessageCircle className="h-4 w-4 fill-current" />
            <span>WhatsApp</span>
          </Button>
        </div>
      </div>
    </div>
  );
};
