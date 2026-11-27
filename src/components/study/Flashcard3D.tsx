import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, useMotionValue, useTransform, type PanInfo } from 'framer-motion';
import type { Flashcard } from '@/types/models';
import { Rating } from '@/lib/fsrsEngine';
import { Lightbulb, ChevronDown, ChevronUp, Sparkles, Play, Pause, Volume2, Flag } from 'lucide-react';
import { OcclusionViewer } from './OcclusionViewer';

interface Flashcard3DProps {
  card: Flashcard; isFlipped: boolean; onFlip: () => void; mode: 'binary' | 'pro'; onSwipeRating?: (rating: Rating) => void;
}

export const Flashcard3D: React.FC<Flashcard3DProps> = ({ card, isFlipped, onFlip, mode, onSwipeRating }) => {
  const [showHint, setShowHint] = useState(false);
  const [showExtra, setShowExtra] = useState(true);
  const [isPlayingVoice, setIsPlayingVoice] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-12, 12]);
  const greenOpacity = useTransform(x, [15, 70], [0, 1]), redOpacity = useTransform(x, [-15, -70], [0, 1]);
  const greenScale = useTransform(x, [15, 70], [0.85, 1]), redScale = useTransform(x, [-15, -70], [0.85, 1]);

  const frontText = card?.front || '';
  const backText = card?.back || '';
  const clozeText = card?.cloze_content || '';
  const occlusionBoxes = Array.isArray(card?.occlusion_boxes) ? card.occlusion_boxes : [];
  const voiceAudio = card?.voiceNoteDataUrl || card?.voice_note_url || '';
  const sketchImg = card?.sketchDataUrl || card?.sketch_url || '';
  const isOcclusion = card?.card_type === 'image_occlusion' || card?.card_type === 'occlusion';

  const speakCurrentText = useCallback((text: string) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const clean = text
      .replace(/(?:\{\{|\[)c\d+::(.*?)(?:(?:::([^}\]]+))?(?:\}\}|\]))/g, '$1')
      .replace(/<[^>]*>/g, '')
      .trim();
    if (!clean) return;
    const utterance = new SpeechSynthesisUtterance(clean);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    window.speechSynthesis.speak(utterance);
  }, []);

  const handleTTS = (e: React.MouseEvent) => {
    e.stopPropagation();
    const textToSpeak = isFlipped ? backText : (clozeText || frontText);
    speakCurrentText(textToSpeak);
  };

  useEffect(() => {
    x.set(0);
    if (typeof window !== 'undefined' && window.speechSynthesis) window.speechSynthesis.cancel();
    return () => {
      if (typeof window !== 'undefined' && window.speechSynthesis) window.speechSynthesis.cancel();
      if (audioRef.current) audioRef.current.pause();
    };
  }, [card?.id, isFlipped, x]);

  const handleToggleVoice = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!voiceAudio) return;
    if (!audioRef.current) {
      const a = new Audio(voiceAudio);
      a.onended = () => setIsPlayingVoice(false);
      audioRef.current = a;
    }
    if (isPlayingVoice) { audioRef.current.pause(); setIsPlayingVoice(false); }
    else { audioRef.current.play(); setIsPlayingVoice(true); }
  };

  const handleDragEnd = (_: any, info: PanInfo) => {
    if (mode !== 'binary' || !isFlipped || !onSwipeRating) return;
    const isSwipedRight = info.offset.x > 70 || info.velocity.x > 300;
    const isSwipedLeft = info.offset.x < -70 || info.velocity.x < -300;
    x.set(0);
    if (isSwipedRight) onSwipeRating(Rating.Good);
    else if (isSwipedLeft) onSwipeRating(Rating.Again);
  };

  const renderClozeText = (content: string, reveal: boolean) => {
    if (!content) return null;
    const regex = /(?:\{\{|\[)c(\d+)::(.*?)(?:(?:::([^}\]]+))?(?:\}\}|\]))/g;
    const parts = [];
    let last = 0, match, i = 0;
    while ((match = regex.exec(content)) !== null) {
      if (match.index > last) parts.push(<span key={i++}>{content.slice(last, match.index)}</span>);
      parts.push(
        reveal ? (
          <span key={i++} className="inline-flex px-2 py-0.5 mx-0.5 rounded-lg bg-sage text-forest font-semibold shadow-sm">{match[2]}</span>
        ) : (
          <span key={i++} className="inline-flex px-2 py-0.5 mx-0.5 rounded-lg bg-sage text-forest font-mono text-xs font-bold shadow-sm">{match[3] ? `[... ${match[3]}]` : '[ ... ]'}</span>
        )
      );
      last = regex.lastIndex;
    }
    if (last < content.length) parts.push(<span key={i++}>{content.slice(last)}</span>);
    return <div className="text-lg sm:text-xl font-bold leading-relaxed text-theme-primary">{parts}</div>;
  };

  return (
    <div className="w-full relative perspective-1000 select-none">
      <motion.div
        drag={mode === 'binary' && isFlipped ? 'x' : false}
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.7}
        onDragEnd={handleDragEnd}
        style={{ x, rotate, touchAction: 'pan-y' }}
        animate={{ rotateY: isFlipped ? 180 : 0 }}
        transition={{ duration: 0.45, ease: [0.23, 1, 0.32, 1] }}
        onClick={onFlip}
        className="w-full relative min-h-[380px] sm:min-h-[420px] rounded-3xl cursor-pointer transform-style-3d shadow-md touch-pan-y"
      >
        {/* Swipe Stamp Badges */}
        {mode === 'binary' && isFlipped && (
          <>
            <motion.div style={{ opacity: greenOpacity }} className="absolute inset-0 z-50 p-6 flex items-start justify-start pointer-events-none">
              <motion.div style={{ scale: greenScale }} className="border-2 border-forest text-forest bg-card-theme font-black text-sm px-3.5 py-1.5 rounded-xl -rotate-12 shadow-lg tracking-wider">GOT IT</motion.div>
            </motion.div>
            <motion.div style={{ opacity: redOpacity }} className="absolute inset-0 z-50 p-6 flex items-start justify-end pointer-events-none">
              <motion.div style={{ scale: redScale }} className="border-2 border-rose-500 text-rose-500 bg-card-theme font-black text-sm px-3.5 py-1.5 rounded-xl rotate-12 shadow-lg tracking-wider">FORGOT</motion.div>
            </motion.div>
          </>
        )}

        {/* FRONT */}
        <div className={`absolute inset-0 backface-hidden rounded-3xl border border-theme bg-card-theme p-6 sm:p-8 flex flex-col justify-between shadow-sm overflow-y-auto transition-opacity duration-150 ${isFlipped ? 'pointer-events-none invisible opacity-0' : 'pointer-events-auto visible opacity-100'}`}>
          <div className="flex items-center justify-between text-xs text-theme-secondary font-medium shrink-0">
            <div className="flex items-center gap-1.5">
              <span className="px-2 py-0.5 rounded-full bg-sage text-forest text-[10px] font-semibold">
                {isOcclusion ? 'Occlusion' : card?.card_type === 'cloze' ? 'Cloze' : 'Question'}
              </span>
              {(card?.isFlagged || card?.is_flagged) && (
                <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-600 text-[10px] font-bold">
                  <Flag className="h-2.5 w-2.5 fill-current" />
                  <span>Flagged</span>
                </span>
              )}
              <button
                type="button"
                onClick={handleTTS}
                title="Speak text"
                className="p-1 rounded-lg text-theme-secondary hover:text-forest active:scale-95 transition-all"
              >
                <Volume2 className="h-3.5 w-3.5" />
              </button>
            </div>
            <span>Tap to flip</span>
          </div>

          <div className="py-4 my-auto text-center">
            {isOcclusion && card?.image_url ? (
              <div className="space-y-3">
                {frontText && <p className="text-sm font-semibold text-theme-primary">{frontText}</p>}
                <OcclusionViewer imageUrl={card.image_url} boxes={occlusionBoxes} targetBoxId={card?.target_box_id} isFlipped={false} occlusionMode={card?.occlusion_mode} />
              </div>
            ) : card?.card_type === 'cloze' && clozeText ? (
              renderClozeText(clozeText, false)
            ) : (
              <h3 className="text-xl sm:text-2xl font-bold leading-relaxed text-theme-primary whitespace-pre-wrap">{frontText}</h3>
            )}
          </div>

          <div className="shrink-0 flex items-center justify-between pt-2">
            {card?.hint ? (
              <button type="button" onClick={(e) => { e.stopPropagation(); setShowHint(!showHint); }} className="flex items-center gap-1 text-xs text-forest hover:opacity-80 font-medium">
                <Lightbulb className="h-3.5 w-3.5" /><span>{showHint ? card.hint : 'Hint'}</span>
              </button>
            ) : <div />}
            <span className="text-[11px] text-theme-secondary font-mono">FSRS</span>
          </div>
        </div>

        {/* BACK */}
        <div style={{ transform: 'rotateY(180deg)' }} className={`absolute inset-0 backface-hidden rounded-3xl border border-theme bg-card-theme p-6 sm:p-8 flex flex-col justify-between shadow-sm overflow-y-auto transition-opacity duration-150 ${!isFlipped ? 'pointer-events-none invisible opacity-0' : 'pointer-events-auto visible opacity-100'}`}>
          <div className="flex items-center justify-between text-xs text-theme-secondary font-medium shrink-0">
            <div className="flex items-center gap-1.5">
              <span className="px-2 py-0.5 rounded-full bg-sage text-forest text-[10px] font-semibold">
                Answer
              </span>
              {(card?.isFlagged || card?.is_flagged) && (
                <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-600 text-[10px] font-bold">
                  <Flag className="h-2.5 w-2.5 fill-current" />
                  <span>Flagged</span>
                </span>
              )}
              <button
                type="button"
                onClick={handleTTS}
                title="Speak text"
                className="p-1 rounded-lg text-theme-secondary hover:text-forest active:scale-95 transition-all"
              >
                <Volume2 className="h-3.5 w-3.5" />
              </button>
            </div>
            <span>Rate recall</span>
          </div>

          <div className="py-4 my-auto text-center">
            {isOcclusion && card?.image_url ? (
              <div className="space-y-3">
                <OcclusionViewer imageUrl={card.image_url} boxes={occlusionBoxes} targetBoxId={card?.target_box_id} isFlipped={true} occlusionMode={card?.occlusion_mode} targetLabel={backText} />
                <div className="p-2.5 rounded-xl bg-sage text-forest font-bold text-sm">{backText}</div>
              </div>
            ) : card?.card_type === 'cloze' && clozeText ? (
              renderClozeText(clozeText, true)
            ) : (
              <h3 className="text-lg sm:text-xl font-bold leading-relaxed text-theme-primary whitespace-pre-wrap">{backText}</h3>
            )}
          </div>

          {(card?.extra_context || voiceAudio || sketchImg) && (
            <div onClick={(e) => e.stopPropagation()} className="rounded-2xl border border-theme bg-canvas p-3 text-xs space-y-2 shrink-0 text-left">
              <button type="button" onClick={() => setShowExtra(!showExtra)} className="w-full flex items-center justify-between font-semibold text-theme-primary">
                <span className="flex items-center gap-1.5"><Sparkles className="h-3.5 w-3.5 text-forest" /><span>Extra Context</span></span>
                {showExtra ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
              </button>
              {showExtra && (
                <div className="space-y-2 pt-1 border-t border-theme">
                  {voiceAudio && (
                    <div className="flex items-center justify-between p-2 rounded-xl bg-card-theme border border-theme text-xs">
                      <button type="button" onClick={handleToggleVoice} className="flex h-6 w-6 items-center justify-center rounded-full bg-forest text-white shrink-0">
                        {isPlayingVoice ? <Pause className="h-3 w-3 fill-current" /> : <Play className="h-3 w-3 fill-current ml-0.5" />}
                      </button>
                      <span className="text-[11px] text-theme-secondary flex items-center gap-1"><Volume2 className="h-3.5 w-3.5" /> Voice Note</span>
                    </div>
                  )}

                  {sketchImg && (
                    <div className="rounded-xl border border-theme bg-card-theme p-2 text-center">
                      <img src={sketchImg} alt="Sketch" className="max-h-32 mx-auto rounded-lg object-contain" />
                    </div>
                  )}

                  {card?.extra_context && <p className="text-theme-primary leading-relaxed whitespace-pre-wrap">{card.extra_context}</p>}
                </div>
              )}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};
