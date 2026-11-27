import React, { useState } from 'react';
import { extractCardsWithAi, type RawExtractedCard } from '@/lib/aiCardGenerator';
import { compressImageToWebP } from '@/lib/imageUtils';
import { CardTriageDeck } from '@/components/ai/CardTriageDeck';
import { AiSettingsModal } from '@/components/ai/AiSettingsModal';
import { Sparkles, FileText, Image as ImageIcon, Settings, Zap, CheckCircle2, RefreshCw, Upload } from 'lucide-react';

interface AiMagicEditorProps {
  targetDeckId: string;
  targetDeckTitle?: string;
  onCardSaved?: () => void;
}

export const AiMagicEditor: React.FC<AiMagicEditorProps> = ({
  targetDeckId,
  targetDeckTitle = 'Selected Deck',
  onCardSaved,
}) => {
  const [inputMode, setInputMode] = useState<'text' | 'image'>('text');
  const [inputText, setInputText] = useState('');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [cardStyle, setCardStyle] = useState<'mixed' | 'basic' | 'cloze'>('mixed');
  const [loading, setLoading] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [triageCards, setTriageCards] = useState<RawExtractedCard[] | null>(null);
  const [cacheNotice, setCacheNotice] = useState(false);
  const [savedCount, setSavedCount] = useState<number | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleImageFile = async (file: File) => {
    try {
      const res = await compressImageToWebP(file, 1000, 0.75);
      setImagePreview(res.dataUrl);
    } catch { setErrorMsg('Failed to process image'); }
  };

  const handleGenerate = async () => {
    if (!targetDeckId) { setErrorMsg('Select target deck first'); return; }
    if (inputMode === 'text' && !inputText.trim()) { setErrorMsg('Enter notes to extract'); return; }
    if (inputMode === 'image' && !imagePreview) { setErrorMsg('Upload photo first'); return; }

    setLoading(true);
    setErrorMsg(null);
    setCacheNotice(false);
    try {
      const res = await extractCardsWithAi({
        text: inputMode === 'text' ? inputText : undefined,
        imageBase64: inputMode === 'image' ? imagePreview || undefined : undefined,
        cardStyle,
        targetSubject: targetDeckTitle,
      });
      if (res.fromCache) setCacheNotice(true);
      setTriageCards(res.cards);
    } catch (err: any) {
      setErrorMsg(err.message || 'Extraction failed');
    } finally {
      setLoading(false);
    }
  };

  if (triageCards) {
    return (
      <div className="space-y-3">
        {cacheNotice && (
          <div className="px-3 py-1.5 rounded-xl bg-sage text-forest border border-forest/20 text-xs flex items-center gap-1.5 font-medium">
            <Zap className="h-3.5 w-3.5 fill-current" />
            <span>Cache Hit: Reused extracted cards</span>
          </div>
        )}
        <CardTriageDeck
          cards={triageCards}
          targetDeckId={targetDeckId}
          targetDeckTitle={targetDeckTitle}
          onFinish={(count) => { setSavedCount(count); setTriageCards(null); if (count > 0) onCardSaved?.(); }}
          onCancel={() => setTriageCards(null)}
        />
      </div>
    );
  }

  if (savedCount !== null) {
    return (
      <div className="p-6 rounded-2xl bg-card-theme border border-theme text-center space-y-3">
        <div className="h-10 w-10 rounded-2xl bg-sage text-forest flex items-center justify-center mx-auto">
          <CheckCircle2 className="h-5 w-5" />
        </div>
        <h3 className="text-sm font-bold text-theme-primary">{savedCount} Cards Added</h3>
        <button
          type="button"
          onClick={() => { setSavedCount(null); setInputText(''); setImagePreview(null); }}
          className="px-4 py-2 rounded-xl bg-forest text-white text-xs font-semibold hover:opacity-90 active:scale-95 transition-all"
        >
          Create More
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3.5">
      {/* Header Bar */}
      <div className="flex items-center justify-between pb-2 border-b border-theme">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-forest" />
          <span className="text-xs font-bold text-theme-primary">AI Magic</span>
        </div>
        <button
          type="button"
          onClick={() => setIsSettingsOpen(true)}
          className="text-theme-secondary hover:text-theme-primary p-1 rounded-lg hover:bg-canvas transition-colors"
          title="Config"
        >
          <Settings className="h-4 w-4" />
        </button>
      </div>

      {/* Mode & Style Controls */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setInputMode('text')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              inputMode === 'text' ? 'bg-sage text-forest' : 'bg-canvas border border-theme text-theme-secondary hover:text-theme-primary'
            }`}
          >
            <FileText className="h-3.5 w-3.5" /> Notes
          </button>
          <button
            type="button"
            onClick={() => setInputMode('image')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              inputMode === 'image' ? 'bg-sage text-forest' : 'bg-canvas border border-theme text-theme-secondary hover:text-theme-primary'
            }`}
          >
            <ImageIcon className="h-3.5 w-3.5" /> Photo
          </button>
        </div>

        <div className="flex items-center gap-1 bg-canvas p-1 rounded-xl border border-theme text-xs">
          {(['mixed', 'cloze', 'basic'] as const).map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setCardStyle(st)}
              className={`py-0.5 px-2 rounded-lg text-[11px] capitalize font-medium transition-all ${
                cardStyle === st ? 'bg-forest text-white font-semibold' : 'text-theme-secondary hover:text-theme-primary'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Input Area */}
      {inputMode === 'text' ? (
        <textarea
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Paste lecture notes or textbook excerpt..."
          className="w-full h-32 bg-canvas border border-theme rounded-xl p-3 text-xs text-theme-primary placeholder:text-theme-secondary focus:outline-none focus:border-forest resize-none leading-relaxed"
        />
      ) : (
        <div className="border border-dashed border-theme rounded-xl p-4 bg-canvas text-center space-y-2">
          {imagePreview ? (
            <div className="space-y-2">
              <img src={imagePreview} alt="Preview" className="max-h-32 rounded-lg mx-auto object-contain border border-theme" />
              <button type="button" onClick={() => setImagePreview(null)} className="text-xs text-rose-500 hover:underline">Remove</button>
            </div>
          ) : (
            <div>
              <Upload className="h-5 w-5 text-forest mx-auto mb-1" />
              <p className="text-xs font-semibold text-theme-primary">Upload Photo</p>
              <input type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && handleImageFile(e.target.files[0])} className="hidden" id="ai-tab-photo-upload" />
              <label htmlFor="ai-tab-photo-upload" className="inline-block mt-2 px-3 py-1 rounded-xl bg-sage text-forest text-xs font-semibold cursor-pointer hover:opacity-90 active:scale-95 transition-all">
                Browse
              </label>
            </div>
          )}
        </div>
      )}

      {errorMsg && <p className="text-xs text-rose-500 bg-rose-500/10 border border-rose-500/20 p-2 rounded-xl font-medium">{errorMsg}</p>}

      <button
        type="button"
        onClick={handleGenerate}
        disabled={loading}
        className="w-full py-3 rounded-2xl bg-forest hover:opacity-95 text-white font-semibold text-xs shadow-sm active:scale-95 transition-all flex items-center justify-center gap-2"
      >
        {loading ? (
          <span className="flex items-center gap-2"><RefreshCw className="h-4 w-4 animate-spin" /> Extracting...</span>
        ) : (
          <span className="flex items-center gap-2"><Sparkles className="h-4 w-4" /> Generate Cards</span>
        )}
      </button>

      <AiSettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
    </div>
  );
};