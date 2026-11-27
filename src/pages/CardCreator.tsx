import React, { useState, useEffect } from 'react';
import { db } from '@/lib/database';
import { initNewFSRSCard } from '@/lib/fsrsEngine';
import type { Deck, ClozeMode, OcclusionBox, OcclusionMode } from '@/types/models';
import { BasicEditor } from '@/components/creator/BasicEditor';
import { ClozeEditor } from '@/components/creator/ClozeEditor';
import { OcclusionEditor } from '@/components/creator/OcclusionEditor';
import { AiMagicEditor } from '@/components/creator/AiMagicEditor';
import { ExtraContextDrawer } from '@/components/creator/ExtraContextDrawer';
import { DeckPickerSheet } from '@/components/creator/DeckPickerSheet';
import { ChevronDown, Check } from 'lucide-react';

export type CreatorTab = 'basic' | 'cloze' | 'image_occlusion' | 'ai_magic';

interface CardCreatorProps {
  initialDeckId?: string | null;
  initialTab?: CreatorTab;
  onBack: () => void;
  onCardSaved?: () => void;
}

export const CardCreator: React.FC<CardCreatorProps> = ({
  initialDeckId,
  initialTab = 'basic',
  onCardSaved,
}) => {
  const [decks, setDecks] = useState<Deck[]>([]);
  const [selectedDeckId, setSelectedDeckId] = useState<string>('');
  const [isDeckPickerOpen, setIsDeckPickerOpen] = useState(false);
  const [cardType, setCardType] = useState<CreatorTab>(initialTab);

  const [front, setFront] = useState('');
  const [back, setBack] = useState('');
  const [clozeContent, setClozeContent] = useState('');
  const [clozeMode, setClozeMode] = useState<ClozeMode>('all');
  const [hint, setHint] = useState('');

  const [occlusionImageUrl, setOcclusionImageUrl] = useState('');
  const [occlusionBoxes, setOcclusionBoxes] = useState<OcclusionBox[]>([]);
  const [occlusionMode, setOcclusionMode] = useState<OcclusionMode>('hide_all_guess_one');
  const [occlusionTitle, setOcclusionTitle] = useState('');

  const [extraContext, setExtraContext] = useState('');
  const [tagsString, setTagsString] = useState('');
  const [voiceNoteDataUrl, setVoiceNoteDataUrl] = useState<string | null>(null);
  const [sketchDataUrl, setSketchDataUrl] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function loadDecks() {
      const allDecks = await db.getDecks();
      setDecks(allDecks);
      if (initialDeckId && allDecks.some((d) => d.id === initialDeckId)) {
        setSelectedDeckId(initialDeckId);
      } else if (allDecks.length > 0) {
        setSelectedDeckId(allDecks[0].id);
      }
    }
    loadDecks();
  }, [initialDeckId]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleSaveCard = async () => {
    if (!selectedDeckId) { showToast('Select a deck'); return; }
    setSaving(true);
    try {
      const now = new Date().toISOString();
      const tags = tagsString.split(',').map((t) => t.trim()).filter(Boolean);
      const baseMeta = {
        deck_id: selectedDeckId,
        extra_context: extraContext.trim() || undefined,
        voiceNoteDataUrl: voiceNoteDataUrl || undefined,
        sketchDataUrl: sketchDataUrl || undefined,
        hint: hint.trim() || undefined,
        tags: tags.length > 0 ? tags : undefined,
        ...initNewFSRSCard(),
        created_at: now,
        updated_at: now,
      };

      if (cardType === 'image_occlusion') {
        if (!occlusionImageUrl || occlusionBoxes.length === 0) {
          showToast('Add masks'); setSaving(false); return;
        }
        for (let i = 0; i < occlusionBoxes.length; i++) {
          const box = occlusionBoxes[i];
          await db.saveCard({
            id: `card_occ_${Date.now()}_${i}`,
            card_type: 'image_occlusion',
            front: occlusionTitle.trim() || `Label #${i + 1}`,
            back: box.label || `Label ${i + 1}`,
            image_url: occlusionImageUrl,
            occlusion_boxes: occlusionBoxes,
            occlusion_mode: occlusionMode,
            target_box_id: box.id,
            ...baseMeta,
          });
        }
        setOcclusionBoxes([]);
        setOcclusionTitle('');
      } else if (cardType === 'cloze') {
        if (!clozeContent.trim()) { showToast('Enter content'); setSaving(false); return; }
        await db.saveCard({
          id: `card_cloze_${Date.now()}`,
          card_type: 'cloze',
          front: clozeContent.trim(),
          back: clozeContent.trim(),
          cloze_content: clozeContent.trim(),
          cloze_mode: clozeMode,
          ...baseMeta,
        });
        setClozeContent('');
      } else {
        if (!front.trim() || !back.trim()) { showToast('Enter front and back'); setSaving(false); return; }
        await db.saveCard({
          id: `card_basic_${Date.now()}`,
          card_type: 'basic',
          front: front.trim(),
          back: back.trim(),
          ...baseMeta,
        });
        setFront('');
        setBack('');
      }
      setExtraContext('');
      setVoiceNoteDataUrl(null);
      setSketchDataUrl(null);
      showToast('Card saved');
      onCardSaved?.();
    } finally {
      setSaving(false);
    }
  };

  const selectedDeck = decks.find((d) => d.id === selectedDeckId);
  const tabs = [
    { id: 'basic', label: 'Basic' },
    { id: 'cloze', label: 'Cloze' },
    { id: 'image_occlusion', label: 'Occlusion' },
    { id: 'ai_magic', label: 'AI Magic' },
  ] as const;

  return (
    <div className="min-h-screen bg-canvas text-theme-primary pb-28 selection:bg-[#2D5340]/20">
      <header className="sticky top-0 z-40 bg-canvas/90 backdrop-blur-md border-b border-theme px-4 py-3">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <h2 className="font-extrabold text-lg tracking-tight text-theme-primary">Create</h2>
          <button
            type="button"
            onClick={() => setIsDeckPickerOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-card-theme border border-theme text-xs font-semibold text-theme-secondary hover:text-theme-primary active:scale-95 transition-all shadow-sm"
          >
            <span className="truncate max-w-[120px]">{selectedDeck ? selectedDeck.title : 'Select Deck'}</span>
            <ChevronDown className="h-3.5 w-3.5" />
          </button>
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 pt-3 space-y-3.5">
        {toastMessage && (
          <div className="fixed top-14 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-xl bg-forest text-white text-xs font-semibold shadow-lg">
            {toastMessage}
          </div>
        )}

        {/* Quick Recent Deck Chips */}
        {decks.length > 0 && (
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
            {decks.slice(0, 4).map((d) => (
              <button
                key={d.id}
                type="button"
                onClick={() => setSelectedDeckId(d.id)}
                className={`shrink-0 px-3 py-1 rounded-full text-xs font-semibold transition-all active:scale-95 ${
                  selectedDeckId === d.id
                    ? 'bg-sage text-forest'
                    : 'bg-card-theme border border-theme text-theme-secondary hover:text-theme-primary'
                }`}
              >
                {d.title}
              </button>
            ))}
          </div>
        )}

        {/* 4-Segment Mode Switcher */}
        <div className="flex items-center justify-between p-1 bg-card-theme border border-theme rounded-full shadow-sm">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setCardType(tab.id)}
              className={`flex-1 py-1.5 px-2 rounded-full text-xs font-semibold transition-all active:scale-95 ${
                cardType === tab.id ? 'bg-forest text-white shadow-sm' : 'text-theme-secondary hover:text-theme-primary'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Card Body */}
        <div className="rounded-2xl border border-theme bg-card-theme p-4 shadow-sm">
          {cardType === 'basic' && <BasicEditor front={front} onChangeFront={setFront} back={back} onChangeBack={setBack} />}
          {cardType === 'cloze' && <ClozeEditor content={clozeContent} onChangeContent={setClozeContent} clozeMode={clozeMode} onChangeClozeMode={setClozeMode} hint={hint} onChangeHint={setHint} />}
          {cardType === 'image_occlusion' && (
            <OcclusionEditor imageUrl={occlusionImageUrl} onChangeImageUrl={setOcclusionImageUrl} boxes={occlusionBoxes} onChangeBoxes={setOcclusionBoxes} occlusionMode={occlusionMode} onChangeOcclusionMode={setOcclusionMode} title={occlusionTitle} onChangeTitle={setOcclusionTitle} />
          )}
          {cardType === 'ai_magic' && (
            <AiMagicEditor targetDeckId={selectedDeckId} targetDeckTitle={selectedDeck?.title} onCardSaved={onCardSaved} />
          )}
        </div>

        {/* Extra Context Accordion & Save */}
        {cardType !== 'ai_magic' && (
          <>
            <ExtraContextDrawer
              extraContext={extraContext} onChangeExtraContext={setExtraContext}
              tagsString={tagsString} onChangeTagsString={setTagsString}
              voiceNoteDataUrl={voiceNoteDataUrl} onChangeVoiceNote={setVoiceNoteDataUrl}
              sketchDataUrl={sketchDataUrl} onChangeSketch={setSketchDataUrl}
            />

            <button
              type="button"
              disabled={saving}
              onClick={handleSaveCard}
              className="w-full py-3.5 rounded-2xl bg-forest hover:opacity-95 text-white font-semibold text-xs shadow-sm active:scale-95 transition-all flex items-center justify-center gap-2"
            >
              <Check className="h-4 w-4" />
              <span>{saving ? 'Saving...' : 'Save Card'}</span>
            </button>
          </>
        )}
      </main>

      <DeckPickerSheet
        isOpen={isDeckPickerOpen} onClose={() => setIsDeckPickerOpen(false)}
        decks={decks} selectedDeckId={selectedDeckId} onSelectDeck={(deckId) => setSelectedDeckId(deckId)}
        onDeckCreated={(newDeck) => { setDecks((prev) => [newDeck, ...prev]); setSelectedDeckId(newDeck.id); }}
      />
    </div>
  );
};