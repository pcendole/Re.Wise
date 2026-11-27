import React, { useState, useEffect, useRef, useCallback } from 'react';
import { db } from '@/lib/database';
import { isDarkMode, toggleDarkMode } from '@/lib/theme';
import { FocusDurationModal } from '@/components/focus/FocusDurationModal';
import { Play, Pause, RotateCcw, Bell, Moon, Sun, Zap, Clock } from 'lucide-react';

interface FocusZoneProps {
  onStudy: (deckId?: string) => void;
}

const getTodayKey = () => `rewise_focus_minutes_${new Date().toISOString().slice(0, 10)}`;

export const FocusZone: React.FC<FocusZoneProps> = ({ onStudy }) => {
  const [durationMinutes, setDurationMinutes] = useState(25);
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [task, setTask] = useState('');
  const [todayMinutes, setTodayMinutes] = useState(0);
  const [dueCount, setDueCount] = useState(0);
  const [dark, setDark] = useState(isDarkMode());
  const [isDurationModalOpen, setIsDurationModalOpen] = useState(false);
  const timerRef = useRef<number | null>(null);
  const endTimeRef = useRef<number | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem(getTodayKey());
    if (saved) setTodayMinutes(parseInt(saved, 10) || 0);
    db.getCards()
      .then((cards) => {
        const now = Date.now();
        setDueCount(cards.filter((c) => new Date(c.due).getTime() <= now).length);
      })
      .catch(() => {});
  }, []);

  const playChime = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx(), now = ctx.currentTime;
      [587.33, 880].forEach((freq, idx) => {
        const osc = ctx.createOscillator(), gain = ctx.createGain();
        osc.type = 'sine'; osc.frequency.setValueAtTime(freq, now);
        gain.gain.setValueAtTime(0.18 / (idx + 1), now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 2.5);
        osc.connect(gain); gain.connect(ctx.destination);
        osc.start(now); osc.stop(now + 2.5);
      });
    } catch {}
  };

  const handleComplete = useCallback(() => {
    setIsRunning(false);
    endTimeRef.current = null;
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    setTimeLeft(0);
    playChime();
    const key = getTodayKey();
    const current = parseInt(localStorage.getItem(key) || '0', 10);
    const updated = current + durationMinutes;
    localStorage.setItem(key, updated.toString());
    setTodayMinutes(updated);
  }, [durationMinutes]);

  useEffect(() => {
    if (isRunning) {
      if (!endTimeRef.current) {
        const secs = timeLeft > 0 ? timeLeft : durationMinutes * 60;
        endTimeRef.current = Date.now() + secs * 1000;
      }
      const tick = () => {
        if (!endTimeRef.current) return;
        const remaining = Math.max(0, Math.ceil((endTimeRef.current - Date.now()) / 1000));
        setTimeLeft(remaining);
        if (remaining <= 0) handleComplete();
      };
      tick();
      const id = window.setInterval(tick, 250);
      timerRef.current = id;
      return () => window.clearInterval(id);
    } else {
      if (timerRef.current) { window.clearInterval(timerRef.current); timerRef.current = null; }
      endTimeRef.current = null;
    }
  }, [isRunning, handleComplete, durationMinutes]);

  useEffect(() => {
    const handleVisibility = () => {
      if (isRunning && endTimeRef.current) {
        const remaining = Math.max(0, Math.ceil((endTimeRef.current - Date.now()) / 1000));
        setTimeLeft(remaining);
        if (remaining <= 0) handleComplete();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [isRunning, handleComplete]);

  const toggleRunning = () => {
    if (isRunning) {
      if (endTimeRef.current) {
        const remaining = Math.max(0, Math.ceil((endTimeRef.current - Date.now()) / 1000));
        setTimeLeft(remaining);
      }
      endTimeRef.current = null;
      setIsRunning(false);
    } else {
      const secs = timeLeft === 0 ? durationMinutes * 60 : timeLeft;
      setTimeLeft(secs);
      endTimeRef.current = Date.now() + secs * 1000;
      setIsRunning(true);
    }
  };

  const setPreset = (mins: number) => {
    setIsRunning(false);
    endTimeRef.current = null;
    if (timerRef.current) { window.clearInterval(timerRef.current); timerRef.current = null; }
    setDurationMinutes(mins);
    setTimeLeft(mins * 60);
  };

  const adjustMinutes = (delta: number) => {
    if (isRunning) return;
    const newMins = Math.max(5, Math.min(180, durationMinutes + delta));
    setPreset(newMins);
  };

  const handleReset = () => {
    setIsRunning(false);
    endTimeRef.current = null;
    if (timerRef.current) { window.clearInterval(timerRef.current); timerRef.current = null; }
    setTimeLeft(durationMinutes * 60);
  };

  const totalSeconds = durationMinutes * 60;
  const progressFraction = Math.max(0, Math.min(1, timeLeft / totalSeconds));
  const radius = 95, circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - progressFraction);
  const minsDisplay = String(Math.floor(timeLeft / 60)).padStart(2, '0');
  const secsDisplay = String(timeLeft % 60).padStart(2, '0');

  return (
    <div className="min-h-screen bg-canvas text-theme-primary pb-24 selection:bg-[#2D5340]/20 flex flex-col">
      <header className="sticky top-0 z-40 bg-canvas/90 backdrop-blur-md border-b border-theme px-4 py-3">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <h2 className="font-extrabold text-lg tracking-tight text-theme-primary">Focus</h2>
          <div className="flex items-center gap-1.5">
            <button className="p-2 rounded-xl text-theme-secondary hover:text-theme-primary hover:bg-card-theme transition-all">
              <Bell className="h-4 w-4" />
            </button>
            <button onClick={() => setDark(toggleDarkMode())} className="p-2 rounded-xl text-theme-secondary hover:text-theme-primary hover:bg-card-theme transition-all">
              {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-md mx-auto w-full px-4 pt-6 flex-1 flex flex-col items-center justify-center space-y-6">
        <div className="relative flex items-center justify-center">
          <svg className="w-64 h-64 -rotate-90 transform" viewBox="0 0 240 240">
            <circle cx="120" cy="120" r={radius} stroke="var(--border-subtle)" strokeWidth="6" fill="transparent" />
            <circle
              cx="120" cy="120" r={radius} stroke="var(--accent-forest)" strokeWidth="7"
              strokeDasharray={circumference} strokeDashoffset={strokeDashoffset} strokeLinecap="round"
              fill="transparent" className="transition-all duration-300 ease-linear"
            />
          </svg>

          <button
            type="button" onClick={() => !isRunning && setIsDurationModalOpen(true)}
            className="absolute flex flex-col items-center justify-center text-center cursor-pointer active:scale-95 transition-transform"
            title="Tap to set duration"
          >
            <span className="font-mono text-4xl font-extrabold text-theme-primary tracking-tight tabular-nums">
              {minsDisplay}:{secsDisplay}
            </span>
            <span className="mt-2 text-xs font-semibold px-3 py-0.5 rounded-full bg-sage text-forest">
              {isRunning ? 'Focusing' : timeLeft === 0 ? 'Done' : 'Ready'}
            </span>
          </button>
        </div>

        <div className="space-y-2.5 w-full flex flex-col items-center">
          <div className="flex items-center justify-center gap-1.5">
            {[25, 50, 90].map((mins) => (
              <button
                key={mins} onClick={() => setPreset(mins)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all active:scale-95 ${
                  durationMinutes === mins ? 'bg-sage text-forest font-bold' : 'bg-card-theme border border-theme text-theme-secondary hover:text-theme-primary'
                }`}
              >
                {mins}m
              </button>
            ))}
            <button
              onClick={() => setIsDurationModalOpen(true)}
              className="px-3 py-1.5 rounded-full text-xs font-semibold bg-card-theme border border-theme text-theme-secondary hover:text-theme-primary active:scale-95 transition-all flex items-center gap-1"
            >
              <Clock className="h-3 w-3" /><span>Set Time</span>
            </button>
          </div>

          <div className="flex items-center gap-3 px-3 py-1 rounded-full bg-card-theme border border-theme text-xs text-theme-secondary">
            <button onClick={() => adjustMinutes(-5)} className="hover:text-theme-primary font-semibold active:scale-95">-5m</button>
            <span className="opacity-40">|</span>
            <button onClick={() => adjustMinutes(5)} className="hover:text-theme-primary font-semibold active:scale-95">+5m</button>
          </div>
        </div>

        <div className="w-full max-w-xs">
          <input
            type="text" value={task} onChange={(e) => setTask(e.target.value)} placeholder="Focus topic..." maxLength={50}
            className="w-full bg-card-theme border border-theme rounded-2xl px-4 py-2.5 text-xs text-center text-theme-primary placeholder:text-theme-secondary focus:outline-none focus:border-forest transition-colors shadow-sm"
          />
        </div>

        <div className="flex items-center gap-2.5 w-full max-w-xs">
          <button
            onClick={toggleRunning}
            className="flex-1 py-3 px-6 rounded-2xl bg-forest hover:opacity-95 text-white font-semibold text-xs shadow-sm active:scale-95 transition-all flex items-center justify-center gap-2"
          >
            {isRunning ? (<><Pause className="h-4 w-4 fill-current" /> Pause</>) : (<><Play className="h-4 w-4 fill-current" /> {timeLeft === 0 ? 'Restart' : 'Start Focus'}</>)}
          </button>
          <button onClick={handleReset} title="Reset" className="h-11 w-11 rounded-2xl border border-theme bg-card-theme flex items-center justify-center text-theme-secondary hover:text-theme-primary active:scale-95 transition-all shadow-sm">
            <RotateCcw className="h-4 w-4" />
          </button>
        </div>

        <div className="flex items-center gap-2 pt-2">
          <span className="px-3 py-1 rounded-full bg-sage text-forest text-xs font-semibold">Today: {todayMinutes}m</span>
          {dueCount > 0 && (
            <button onClick={() => onStudy()} className="px-3 py-1 rounded-full border border-theme bg-card-theme text-xs font-semibold text-theme-secondary hover:text-forest flex items-center gap-1 active:scale-95">
              <Zap className="h-3 w-3 text-forest fill-forest" /><span>Review ({dueCount})</span>
            </button>
          )}
        </div>
      </main>

      <FocusDurationModal
        isOpen={isDurationModalOpen} onClose={() => setIsDurationModalOpen(false)}
        currentMinutes={durationMinutes} onSelectMinutes={(mins) => setPreset(mins)}
      />
    </div>
  );
};
