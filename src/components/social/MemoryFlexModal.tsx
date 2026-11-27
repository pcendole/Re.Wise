import React, { useRef, useState } from 'react';
import { X, Sparkles, Download, Share2, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { StudyStats } from '@/types/models';

interface MemoryFlexModalProps {
  isOpen: boolean;
  onClose: () => void;
  stats: StudyStats;
  targetExam?: string;
}

export const MemoryFlexModal: React.FC<MemoryFlexModalProps> = ({
  isOpen,
  onClose,
  stats,
  targetExam = 'NEET PG / UPSC',
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const streakDays = stats.streak_days || 1;
  const cardsReviewed = stats.total_reviews || 42;
  const retention = '92%';

  const renderCanvasAndExport = async (action: 'download' | 'share') => {
    setDownloading(true);
    try {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      canvas.width = 1080;
      canvas.height = 1920;

      // Background
      const bgGrad = ctx.createLinearGradient(0, 0, 1080, 1920);
      bgGrad.addColorStop(0, '#1D2923');
      bgGrad.addColorStop(0.5, '#2D5340');
      bgGrad.addColorStop(1, '#111714');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, 1080, 1920);

      // Card Border & Container
      ctx.strokeStyle = 'rgba(232, 239, 234, 0.4)';
      ctx.lineWidth = 4;
      ctx.strokeRect(90, 120, 900, 1680);

      // Top Tag
      ctx.fillStyle = '#E8EFEA';
      ctx.font = 'bold 36px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('RE.WISE • FSRS ACTIVE RECALL', 540, 240);

      // Flame Icon / Text
      ctx.font = '160px sans-serif';
      ctx.fillText('🔥', 540, 480);

      // Giant Streak
      ctx.fillStyle = '#F59E0B';
      ctx.font = '900 130px sans-serif';
      ctx.fillText(`${streakDays} DAYS`, 540, 660);

      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 50px sans-serif';
      ctx.fillText('DAILY REVIEW STREAK', 540, 740);

      // Target Exam Pill
      ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
      ctx.fillRect(240, 840, 600, 100);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.strokeRect(240, 840, 600, 100);
      ctx.fillStyle = '#E8EFEA';
      ctx.font = 'bold 42px sans-serif';
      ctx.fillText(`TARGET: ${targetExam.toUpperCase()}`, 540, 905);

      // Stats Grid Box
      ctx.fillStyle = 'rgba(17, 23, 20, 0.7)';
      ctx.fillRect(160, 1040, 760, 420);
      ctx.strokeStyle = 'rgba(232, 239, 234, 0.3)';
      ctx.strokeRect(160, 1040, 760, 420);

      // Reviews Count
      ctx.fillStyle = '#E6E8E3';
      ctx.font = '34px sans-serif';
      ctx.fillText('CARDS REVIEWED', 350, 1150);
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 70px sans-serif';
      ctx.fillText(`${cardsReviewed}`, 350, 1240);

      // Retention Rate
      ctx.fillStyle = '#E6E8E3';
      ctx.font = '34px sans-serif';
      ctx.fillText('FSRS RETENTION', 730, 1150);
      ctx.fillStyle = '#E8EFEA';
      ctx.font = 'bold 70px sans-serif';
      ctx.fillText(retention, 730, 1240);

      // Motivation Pearl
      ctx.fillStyle = '#E8EFEA';
      ctx.font = 'italic 38px sans-serif';
      ctx.fillText('“No passive rereading. Pure active recall.”', 540, 1370);

      // Bottom Branding Watermark
      ctx.fillStyle = '#9CA3AF';
      ctx.font = '32px sans-serif';
      ctx.fillText('rewise.app • Built for Top 1% Competitive Aspirants', 540, 1720);

      canvas.toBlob(async (blob) => {
        if (!blob) return;
        if (action === 'share' && navigator.share && navigator.canShare) {
          const file = new File([blob], `rewise-streak-${streakDays}.png`, { type: 'image/png' });
          if (navigator.canShare({ files: [file] })) {
            await navigator.share({
              files: [file],
              title: `${streakDays}-Day Memory Streak on Re.Wise`,
              text: `🔥 Consistency locked with FSRS Spaced Repetition on Re.Wise!`,
            });
            return;
          }
        }

        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `rewise-streak-${streakDays}-days.png`;
        a.click();
        URL.revokeObjectURL(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }, 'image/png');
    } catch (err) {
      console.warn('Memory Flex export error:', err);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative w-full max-w-sm rounded-3xl border border-theme bg-card-theme p-5 shadow-2xl text-theme-primary space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-theme pb-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-sage text-forest">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-theme-primary tracking-tight">Memory Flex</h3>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-theme-secondary hover:text-theme-primary hover:bg-canvas transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* 9:14 Aesthetic Preview Card */}
        <div className="relative aspect-[9/14] w-full rounded-2xl border border-theme bg-gradient-to-b from-[#1D2923] to-[#2D5340] text-white p-5 flex flex-col justify-between text-center overflow-hidden shadow-xl">
          <div className="space-y-1">
            <span className="text-[9px] font-bold uppercase tracking-widest text-emerald-200">
              RE.WISE • FSRS
            </span>
            <div className="pt-2">
              <span className="text-4xl block animate-bounce">🔥</span>
              <span className="text-3xl font-black text-amber-400 tracking-tight block">
                {streakDays} DAYS
              </span>
              <span className="text-[10px] uppercase font-bold text-emerald-100">Streak</span>
            </div>
          </div>

          <div className="py-1 px-2.5 rounded-xl bg-white/10 border border-white/20 mx-auto text-xs text-white font-semibold">
            {targetExam}
          </div>

          <div className="grid grid-cols-2 gap-2 p-3 rounded-xl bg-black/30 border border-white/15 text-xs">
            <div>
              <span className="text-[9px] text-emerald-200 uppercase block font-bold">Reviewed</span>
              <span className="text-base font-black text-white">{cardsReviewed}</span>
            </div>
            <div>
              <span className="text-[9px] text-emerald-200 uppercase block font-bold">Retention</span>
              <span className="text-base font-black text-emerald-300">{retention}</span>
            </div>
          </div>
        </div>

        <canvas ref={canvasRef} className="hidden" />

        {/* Export Action Buttons */}
        <div className="grid grid-cols-2 gap-2 pt-1">
          <Button
            size="lg"
            disabled={downloading}
            onClick={() => renderCanvasAndExport('download')}
            className="rounded-2xl bg-forest hover:opacity-90 text-white font-bold text-xs gap-1.5 shadow-sm"
          >
            {copied ? <Check className="h-4 w-4" /> : <Download className="h-4 w-4" />}
            <span>{copied ? 'Saved' : 'Save'}</span>
          </Button>

          <Button
            size="lg"
            variant="outline"
            disabled={downloading}
            onClick={() => renderCanvasAndExport('share')}
            className="rounded-2xl font-bold text-xs gap-1.5"
          >
            <Share2 className="h-4 w-4" />
            <span>Share</span>
          </Button>
        </div>
      </div>
    </div>
  );
};
