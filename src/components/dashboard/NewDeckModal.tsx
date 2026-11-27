import React, { useState } from 'react';
import type { Deck } from '@/types/models';
import { Folder, X } from 'lucide-react';

interface NewDeckModalProps {
  isOpen: boolean;
  onClose: () => void;
  topLevelDecks: Deck[];
  onCreateDeck: (deck: {
    title: string;
    description?: string;
    category: string;
    color?: string;
    parent_id?: string | null;
  }) => Promise<void>;
}

export const NewDeckModal: React.FC<NewDeckModalProps> = ({
  isOpen,
  onClose,
  topLevelDecks,
  onCreateDeck,
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('General');
  const [color, setColor] = useState('#2D5340');
  const [parentId, setParentId] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setSubmitting(true);
    try {
      await onCreateDeck({
        title: title.trim(),
        description: description.trim() || undefined,
        category,
        color,
        parent_id: parentId || null,
      });
      setTitle('');
      setDescription('');
      setParentId('');
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-sm rounded-2xl border border-theme bg-card-theme p-5 shadow-2xl space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-theme">
          <div className="flex items-center gap-2 text-theme-primary font-bold">
            <Folder className="h-4 w-4 text-forest" />
            <span>New Deck</span>
          </div>
          <button
            onClick={onClose}
            className="text-theme-secondary hover:text-theme-primary p-1 rounded-lg hover:bg-canvas transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
          <div className="space-y-1">
            <label className="font-semibold text-theme-primary">Title</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Biology"
              className="w-full rounded-xl bg-canvas border border-theme px-3 py-2 text-theme-primary placeholder:text-theme-secondary focus:outline-none focus:border-forest"
            />
          </div>

          <div className="space-y-1">
            <label className="font-semibold text-theme-primary">Description</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description"
              className="w-full rounded-xl bg-canvas border border-theme px-3 py-2 text-theme-primary placeholder:text-theme-secondary focus:outline-none focus:border-forest"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className="font-semibold text-theme-primary">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded-xl bg-canvas border border-theme px-3 py-2 text-theme-primary focus:outline-none focus:border-forest"
              >
                <option value="General">General</option>
                <option value="NEET PG">NEET PG</option>
                <option value="UPSC">UPSC</option>
                <option value="Science">Science</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-theme-primary">Parent Deck</label>
              <select
                value={parentId}
                onChange={(e) => setParentId(e.target.value)}
                className="w-full rounded-xl bg-canvas border border-theme px-3 py-2 text-theme-primary focus:outline-none focus:border-forest"
              >
                <option value="">None</option>
                {topLevelDecks.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.title}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-1">
            <label className="font-semibold text-theme-primary">Accent</label>
            <div className="flex items-center gap-2 pt-1">
              {['#2D5340', '#3B82F6', '#EC4899', '#10B981', '#F59E0B', '#8B5CF6'].map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  style={{ backgroundColor: c }}
                  className={`h-6 w-6 rounded-full transition-transform ${
                    color === c ? 'scale-125 ring-2 ring-forest ring-offset-2' : 'opacity-70 hover:opacity-100'
                  }`}
                />
              ))}
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="w-1/2 py-2 rounded-xl border border-theme text-theme-secondary hover:text-theme-primary font-semibold text-xs active:scale-95 transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="w-1/2 py-2 rounded-xl bg-forest hover:opacity-90 text-white font-semibold text-xs shadow-sm active:scale-95 transition-all"
            >
              {submitting ? 'Creating...' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
