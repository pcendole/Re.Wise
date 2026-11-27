import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { VoiceRecorder } from './VoiceRecorder';
import { SketchPad } from './SketchPad';

interface ExtraContextDrawerProps {
  extraContext: string;
  onChangeExtraContext: (value: string) => void;
  tagsString: string;
  onChangeTagsString: (value: string) => void;
  voiceNoteDataUrl?: string | null;
  onChangeVoiceNote?: (dataUrl: string | null) => void;
  sketchDataUrl?: string | null;
  onChangeSketch?: (dataUrl: string | null) => void;
}

export const ExtraContextDrawer: React.FC<ExtraContextDrawerProps> = ({
  extraContext,
  onChangeExtraContext,
  tagsString,
  onChangeTagsString,
  voiceNoteDataUrl,
  onChangeVoiceNote,
  sketchDataUrl,
  onChangeSketch,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="rounded-2xl border border-theme bg-card-theme p-3.5 shadow-sm space-y-3">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between text-xs font-semibold text-theme-secondary hover:text-theme-primary transition-colors"
      >
        <span>+ Extra Context</span>
        {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </button>

      {isOpen && (
        <div className="space-y-3 pt-1 animate-in fade-in duration-150">
          <textarea
            rows={3}
            value={extraContext}
            onChange={(e) => onChangeExtraContext(e.target.value)}
            placeholder="Textbook explanations, memory hooks, or mnemonics..."
            className="w-full rounded-xl bg-canvas border border-theme p-3 text-xs text-theme-primary placeholder:text-theme-secondary focus:outline-none focus:border-forest leading-relaxed font-sans"
          />

          {onChangeVoiceNote && (
            <VoiceRecorder
              initialAudioUrl={voiceNoteDataUrl}
              onSaveAudio={onChangeVoiceNote}
            />
          )}

          {onChangeSketch && (
            <SketchPad
              initialSketchUrl={sketchDataUrl}
              onSaveSketch={onChangeSketch}
            />
          )}

          <input
            type="text"
            value={tagsString}
            onChange={(e) => onChangeTagsString(e.target.value)}
            placeholder="Tags (comma separated)..."
            className="w-full rounded-xl bg-canvas border border-theme px-3 py-2 text-xs text-theme-primary placeholder:text-theme-secondary focus:outline-none focus:border-forest"
          />
        </div>
      )}
    </div>
  );
};
