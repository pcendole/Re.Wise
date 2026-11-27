import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, ChevronRight, Folder, Plus, Layers } from 'lucide-react';
import { db } from '@/lib/database';
import type { Deck } from '@/types/models';

interface DeckPickerSheetProps {
  isOpen: boolean;
  onClose: () => void;
  decks: Deck[];
  selectedDeckId: string;
  onSelectDeck: (deckId: string) => void;
  onCreateNewDeck?: () => void;
  onDeckCreated?: (deck: Deck) => void;
  showAllDecksOption?: boolean;
}

export const DeckPickerSheet: React.FC<DeckPickerSheetProps> = ({
  isOpen,
  onClose,
  decks,
  selectedDeckId,
  onSelectDeck,
  onCreateNewDeck,
  onDeckCreated,
  showAllDecksOption = false,
}) => {
  const [search, setSearch] = useState('');

  const trimmedSearch = search.trim();
  const hasExactMatch = decks.some(
    (d) => d.title.toLowerCase() === trimmedSearch.toLowerCase()
  );

  const filteredDecks = decks.filter(
    (d) =>
      d.title.toLowerCase().includes(trimmedSearch.toLowerCase()) ||
      d.category.toLowerCase().includes(trimmedSearch.toLowerCase())
  );

  const handleCreateFromSearch = async () => {
    if (!trimmedSearch) return;
    const now = new Date().toISOString();
    const newDeck: Deck = {
      id: `deck_${Date.now()}`,
      title: trimmedSearch,
      category: 'General',
      color: '#2D5340',
      parent_id: null,
      created_at: now,
      updated_at: now,
    };
    await db.saveDeck(newDeck);
    onDeckCreated?.(newDeck);
    onSelectDeck(newDeck.id);
    setSearch('');
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm"
          />

          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 26, stiffness: 280 }}
            className="relative z-10 w-full max-w-md mx-auto bg-card-theme border-t border-theme rounded-t-3xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh] bottom-nav-safe"
          >
            <div className="w-10 h-1 bg-[var(--border-subtle)] rounded-full mx-auto mt-3 mb-2" />

            <div className="px-5 py-2">
              <h3 className="text-base font-bold text-theme-primary">Target Deck</h3>
            </div>

            <div className="px-5 py-2 space-y-2">
              <div className="relative">
                <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-theme-secondary" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search decks..."
                  className="w-full bg-canvas border border-theme rounded-xl pl-9 pr-3.5 py-2 text-xs text-theme-primary placeholder:text-theme-secondary focus:outline-none focus:border-forest transition-colors"
                />
              </div>

              {trimmedSearch && !hasExactMatch && (
                <button
                  type="button"
                  onClick={handleCreateFromSearch}
                  className="w-full flex items-center gap-2 p-2.5 rounded-xl bg-sage text-forest text-xs font-semibold active:scale-[0.99] transition-all"
                >
                  <Plus className="h-4 w-4 shrink-0" />
                  <span className="truncate">Create "{trimmedSearch}"</span>
                </button>
              )}
            </div>

            {onCreateNewDeck && (
              <div className="px-5 py-1">
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onCreateNewDeck();
                  }}
                  className="w-full flex items-center gap-2 py-1.5 text-xs font-semibold text-forest hover:opacity-80 transition-opacity"
                >
                  <Plus className="h-4 w-4" />
                  <span>+ New Deck</span>
                </button>
              </div>
            )}

            <div className="flex-1 overflow-y-auto px-4 py-2 space-y-1">
              {showAllDecksOption && (
                <button
                  type="button"
                  onClick={() => {
                    onSelectDeck('');
                    onClose();
                  }}
                  className={`w-full flex items-center justify-between p-3 rounded-xl transition-all active:scale-[0.99] ${
                    !selectedDeckId
                      ? 'bg-sage text-forest font-semibold'
                      : 'hover:bg-canvas text-theme-primary'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Layers className="h-4 w-4 text-theme-secondary shrink-0" />
                    <span className="text-xs">All Decks</span>
                  </div>
                  <ChevronRight className="h-4 w-4 text-theme-secondary shrink-0" />
                </button>
              )}

              {filteredDecks.length === 0 && (!showAllDecksOption || trimmedSearch) ? (
                <div className="py-8 text-center text-theme-secondary text-xs">
                  No decks found
                </div>
              ) : (
                filteredDecks.map((deck) => {
                  const isSelected = deck.id === selectedDeckId;
                  const isSubdeck = Boolean(deck.parent_id);

                  return (
                    <button
                      key={deck.id}
                      type="button"
                      onClick={() => {
                        onSelectDeck(deck.id);
                        onClose();
                      }}
                      className={`w-full flex items-center justify-between p-3 rounded-xl transition-all active:scale-[0.99] ${
                        isSubdeck ? 'ml-4 w-[calc(100%-1rem)]' : ''
                      } ${
                        isSelected
                          ? 'bg-sage text-forest font-semibold'
                          : 'hover:bg-canvas text-theme-primary'
                      }`}
                    >
                      <div className="flex items-center gap-3 truncate">
                        <Folder className="h-4 w-4 text-theme-secondary shrink-0" />
                        <span className="text-xs truncate">{deck.title}</span>
                      </div>
                      <ChevronRight className="h-4 w-4 text-theme-secondary shrink-0" />
                    </button>
                  );
                })
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};