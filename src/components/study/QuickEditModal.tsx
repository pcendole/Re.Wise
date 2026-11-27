import React, { useState } from 'react';
import type { Flashcard } from '@/types/models';
import { X, Check, Edit3, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface QuickEditModalProps {
  card: Flashcard;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedCard: Flashcard) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
}

export const QuickEditModal: React.FC<QuickEditModalProps> = ({
  card,
  isOpen,
  onClose,
  onSave,
  onDelete,
}) => {
  const [front, setFront] = useState(card.front);
  const [back, setBack] = useState(card.back);
  const [clozeContent, setClozeContent] = useState(card.cloze_content || card.front);
  const [extraContext, setExtraContext] = useState(card.extra_context || '');
  const [hint, setHint] = useState(card.hint || '');
  const [tags, setTags] = useState((card.tags || []).join(', '));
  const [saving, setSaving] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const parsedTags = tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);

      const isBasicOrOcclusion = card.card_type === 'basic' || card.card_type === 'image_occlusion' || card.card_type === 'occlusion';
      const updatedCard: Flashcard = {
        ...card,
        front: isBasicOrOcclusion ? front.trim() : clozeContent.trim(),
        back: isBasicOrOcclusion ? back.trim() : back.trim() || clozeContent.trim(),
        cloze_content: card.card_type === 'cloze' ? clozeContent.trim() : undefined,
        extra_context: extraContext.trim() || undefined,
        hint: hint.trim() || undefined,
        tags: parsedTags.length > 0 ? parsedTags : undefined,
        updated_at: new Date().toISOString(),
      };

      await onSave(updatedCard);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="w-full max-w-lg rounded-2xl border border-theme bg-card-theme p-5 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto text-theme-primary"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-2 border-b border-theme">
          <div className="flex items-center gap-2 font-bold text-sm text-theme-primary">
            <Edit3 className="h-4 w-4 text-forest" />
            <span>Quick Edit</span>
          </div>
          <button
            onClick={onClose}
            className="text-theme-secondary hover:text-theme-primary p-1 rounded-lg hover:bg-canvas transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3 text-xs">
          {card.card_type === 'basic' || card.card_type === 'image_occlusion' || card.card_type === 'occlusion' ? (
            <>
              <div className="space-y-1">
                <label className="font-semibold text-theme-primary">Front</label>
                <textarea
                  rows={2}
                  required
                  value={front}
                  onChange={(e) => setFront(e.target.value)}
                  className="w-full rounded-xl bg-canvas border border-theme p-2.5 text-theme-primary focus:outline-none focus:border-forest font-sans"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-theme-primary">Back</label>
                <textarea
                  rows={2}
                  required
                  value={back}
                  onChange={(e) => setBack(e.target.value)}
                  className="w-full rounded-xl bg-canvas border border-theme p-2.5 text-theme-primary focus:outline-none focus:border-forest font-sans"
                />
              </div>
            </>
          ) : (
            <div className="space-y-1">
              <label className="font-semibold text-theme-primary flex items-center gap-1">
                <Sparkles className="h-3 w-3 text-forest" />
                <span>Cloze</span>
              </label>
              <textarea
                rows={4}
                required
                value={clozeContent}
                onChange={(e) => setClozeContent(e.target.value)}
                className="w-full rounded-xl bg-canvas border border-theme p-2.5 text-theme-primary focus:outline-none focus:border-forest font-sans leading-relaxed"
              />
            </div>
          )}

          <div className="space-y-1">
            <label className="font-semibold text-theme-primary">Extra Context</label>
            <textarea
              rows={2}
              value={extraContext}
              onChange={(e) => setExtraContext(e.target.value)}
              placeholder="Notes or mnemonics..."
              className="w-full rounded-xl bg-canvas border border-theme p-2.5 text-theme-primary focus:outline-none focus:border-forest font-sans"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className="font-semibold text-theme-primary">Hint</label>
              <input
                type="text"
                value={hint}
                onChange={(e) => setHint(e.target.value)}
                className="w-full rounded-xl bg-canvas border border-theme px-2.5 py-2 text-theme-primary focus:outline-none focus:border-forest"
              />
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-theme-primary">Tags</label>
              <input
                type="text"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="tag1, tag2"
                className="w-full rounded-xl bg-canvas border border-theme px-2.5 py-2 text-theme-primary focus:outline-none focus:border-forest"
              />
            </div>
          </div>

          <div className="flex gap-2 pt-2 border-t border-theme">
            {onDelete && (
              <Button
                type="button"
                variant="outline"
                onClick={async () => {
                  if (window.confirm('Delete this card?')) {
                    await onDelete(card.id);
                    onClose();
                  }
                }}
                className="text-rose-500 hover:text-rose-600 border-rose-300 dark:border-rose-900/50"
              >
                Delete
              </Button>
            )}
            <Button type="button" variant="outline" onClick={onClose} className={onDelete ? 'flex-1' : 'w-1/2'}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={saving}
              className={`${onDelete ? 'flex-1' : 'w-1/2'} bg-forest hover:opacity-90 text-white gap-1`}
            >
              <Check className="h-3.5 w-3.5" />
              {saving ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
