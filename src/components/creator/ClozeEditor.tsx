import React, { useRef, useMemo, useState } from 'react';
import type { ClozeMode } from '@/types/models';
import { Sparkles, Eye, HelpCircle } from 'lucide-react';

interface ClozeEditorProps {
  content: string;
  onChangeContent: (content: string) => void;
  clozeMode: ClozeMode;
  onChangeClozeMode: (mode: ClozeMode) => void;
  hint: string;
  onChangeHint: (hint: string) => void;
}

export const ClozeEditor: React.FC<ClozeEditorProps> = ({
  content,
  onChangeContent,
  clozeMode,
  onChangeClozeMode,
  hint,
  onChangeHint,
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [revealedPreviewIdx, setRevealedPreviewIdx] = useState<Record<number, boolean>>({});
  const [incrementMode, setIncrementMode] = useState<boolean>(true);

  const nextClozeNumber = useMemo(() => {
    const matches = Array.from(content.matchAll(/(?:\{\{|\[)c(\d+)::/g));
    if (matches.length === 0) return 1;
    const maxIndex = Math.max(...matches.map((m) => parseInt(m[1], 10)));
    return incrementMode ? maxIndex + 1 : maxIndex;
  }, [content, incrementMode]);

  const handleInsertCloze = () => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = content.substring(start, end);

    if (!selectedText.trim()) {
      textarea.focus();
      return;
    }

    const clozeTag = `{{c${nextClozeNumber}::${selectedText}}}`;
    const newContent = content.substring(0, start) + clozeTag + content.substring(end);
    onChangeContent(newContent);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + clozeTag.length, start + clozeTag.length);
    }, 10);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'C' || e.key === 'c')) {
      e.preventDefault();
      handleInsertCloze();
    }
  };

  const previewTokens = useMemo(() => {
    if (!content.trim()) return [];
    const regex = /(?:\{\{|\[)c(\d+)::(.*?)(?:(?:::([^}\]]+))?(?:\}\}|\]))/g;
    const tokens: Array<{ type: 'text' | 'cloze'; value: string; clozeNum?: number; hint?: string }> = [];
    let lastIndex = 0;
    let match;

    while ((match = regex.exec(content)) !== null) {
      if (match.index > lastIndex) {
        tokens.push({ type: 'text', value: content.substring(lastIndex, match.index) });
      }
      tokens.push({
        type: 'cloze',
        clozeNum: parseInt(match[1], 10),
        value: match[2],
        hint: match[3],
      });
      lastIndex = regex.lastIndex;
    }

    if (lastIndex < content.length) {
      tokens.push({ type: 'text', value: content.substring(lastIndex) });
    }
    return tokens;
  }, [content]);

  return (
    <div className="space-y-3.5">
      {/* Editor Controls */}
      <div className="flex flex-wrap items-center justify-between gap-2 bg-canvas p-2 rounded-xl border border-theme">
        <button
          type="button"
          onClick={handleInsertCloze}
          className="h-8 px-3 text-xs font-semibold gap-1.5 bg-forest hover:opacity-90 text-white rounded-lg shadow-sm flex items-center active:scale-95 transition-all"
        >
          <Sparkles className="h-3.5 w-3.5" />
          <span>Cloze (c{nextClozeNumber})</span>
        </button>

        <label className="flex items-center gap-1.5 text-theme-secondary cursor-pointer select-none text-xs">
          <input
            type="checkbox"
            checked={incrementMode}
            onChange={(e) => setIncrementMode(e.target.checked)}
            className="rounded border-theme text-forest accent-[#2D5340]"
          />
          <span className="text-[11px]">Auto +1</span>
        </label>
      </div>

      {/* Cloze Passage Input */}
      <div className="space-y-1">
        <label className="text-xs font-semibold text-theme-secondary flex items-center justify-between">
          <span>Passage *</span>
          <span className="text-[10px] text-theme-secondary font-normal">
            Select text & tap Cloze
          </span>
        </label>
        <textarea
          ref={textareaRef}
          rows={5}
          value={content}
          onChange={(e) => onChangeContent(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="e.g. Warfarin acts by inhibiting {{c1::VKOR}}, depleting factors {{c2::II, VII, IX, and X}}."
          className="w-full rounded-xl bg-canvas border border-theme p-3 text-xs text-theme-primary placeholder:text-theme-secondary focus:outline-none focus:border-forest leading-relaxed resize-none"
        />
      </div>

      {/* Cloze Mode Toggle */}
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => onChangeClozeMode('all')}
          className={`py-2 px-3 rounded-xl border text-xs font-semibold transition-all active:scale-95 ${
            clozeMode === 'all'
              ? 'bg-sage border-forest/30 text-forest shadow-sm'
              : 'bg-canvas border-theme text-theme-secondary hover:text-theme-primary'
          }`}
        >
          All Blanks
        </button>

        <button
          type="button"
          onClick={() => onChangeClozeMode('one_by_one')}
          className={`py-2 px-3 rounded-xl border text-xs font-semibold transition-all active:scale-95 ${
            clozeMode === 'one_by_one'
              ? 'bg-sage border-forest/30 text-forest shadow-sm'
              : 'bg-canvas border-theme text-theme-secondary hover:text-theme-primary'
          }`}
        >
          One by One
        </button>
      </div>

      {/* Optional Hint */}
      <div className="space-y-1">
        <label className="text-xs font-semibold text-theme-secondary flex items-center gap-1">
          <HelpCircle className="h-3.5 w-3.5" />
          <span>Hint</span>
        </label>
        <input
          type="text"
          value={hint}
          onChange={(e) => onChangeHint(e.target.value)}
          placeholder="Optional hint..."
          className="w-full rounded-xl bg-canvas border border-theme px-3 py-2 text-xs text-theme-primary placeholder:text-theme-secondary focus:outline-none focus:border-forest"
        />
      </div>

      {/* Live Card Preview */}
      <div className="rounded-xl border border-theme bg-canvas p-3 space-y-2">
        <div className="flex items-center justify-between text-[11px] font-semibold text-theme-secondary">
          <span className="flex items-center gap-1.5">
            <Eye className="h-3.5 w-3.5 text-forest" />
            Preview
          </span>
          <span className="text-[10px]">Tap to reveal</span>
        </div>

        <div className="min-h-[46px] p-2.5 rounded-lg bg-card-theme border border-theme text-xs text-theme-primary leading-relaxed font-sans">
          {previewTokens.length === 0 ? (
            <p className="text-theme-secondary italic">Type text and add cloze to preview...</p>
          ) : (
            previewTokens.map((token, i) => {
              if (token.type === 'text') {
                return <span key={i}>{token.value}</span>;
              }
              const isRevealed = revealedPreviewIdx[i];
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() =>
                    setRevealedPreviewIdx((prev) => ({ ...prev, [i]: !prev[i] }))
                  }
                  className={`inline-flex items-center px-1.5 py-0.5 mx-0.5 rounded font-mono text-[11px] font-bold transition-all ${
                    isRevealed
                      ? 'bg-sage text-forest'
                      : 'bg-forest text-white hover:opacity-90'
                  }`}
                >
                  {isRevealed ? token.value : `[c${token.clozeNum}]`}
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};