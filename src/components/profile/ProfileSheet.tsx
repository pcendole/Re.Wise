import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, User as UserIcon, RefreshCw, ShieldCheck, Share2, Download,
  LogOut, Bell
} from 'lucide-react';
import type { User } from '@supabase/supabase-js';
import type { ExamSettings } from '@/types/models';
import type { SyncState } from '@/lib/syncEngine';
import { signInWithGoogle, signOut } from '@/lib/supabase';
import { db } from '@/lib/database';

interface ProfileSheetProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  settings: ExamSettings;
  decksCount: number;
  cardsCount: number;
  syncState: SyncState;
  onUpdateSettings: (settings: ExamSettings) => Promise<void>;
  onTriggerSync: () => Promise<void>;
  onOpenExport: () => void;
  onAuthChanged: () => void;
}

export const ProfileSheet: React.FC<ProfileSheetProps> = ({
  isOpen, onClose, user, settings, decksCount, cardsCount, syncState,
  onUpdateSettings, onTriggerSync, onOpenExport, onAuthChanged,
}) => {
  const [examName, setExamName] = useState(settings.target_exam_name || ''), [examDate, setExamDate] = useState(settings.target_exam_date || '');
  const [retention, setRetention] = useState(settings.desired_retention || 0.90);
  const [reviewMode, setReviewMode] = useState<'swipe' | 'pro'>((localStorage.getItem('rewise_review_mode') as 'swipe' | 'pro') || 'swipe');
  const [reminderEnabled, setReminderEnabled] = useState(localStorage.getItem('rewise_reminder_enabled') === 'true');
  const [reminderTime, setReminderTime] = useState(localStorage.getItem('rewise_reminder_time') || '20:00');
  const [isSyncing, setIsSyncing] = useState(false), [confirmDelete, setConfirmDelete] = useState(false), [showPrivacy, setShowPrivacy] = useState(false);

  const handleSaveSettings = async (overrides?: Partial<ExamSettings>) => {
    await onUpdateSettings({ ...settings, target_exam_name: examName.trim(), target_exam_date: examDate, desired_retention: retention, ...overrides });
  };

  const handleReviewModeChange = (mode: 'swipe' | 'pro') => { setReviewMode(mode); localStorage.setItem('rewise_review_mode', mode); };
  const handleReminderToggle = (val: boolean) => { setReminderEnabled(val); localStorage.setItem('rewise_reminder_enabled', String(val)); };
  const handleReminderTimeChange = (time: string) => { setReminderTime(time); localStorage.setItem('rewise_reminder_time', time); };
  const handleSyncNow = async () => { setIsSyncing(true); try { await onTriggerSync(); } finally { setIsSyncing(false); } };
  const handleSignOut = async () => { await signOut(); onAuthChanged(); onClose(); };

  const handleDeleteAccount = async () => {
    await db.resetToStarterDeck(); localStorage.clear(); await signOut(); onAuthChanged(); onClose(); window.location.reload();
  };

  const handleShareApp = () => {
    if (navigator.share) {
      navigator.share({ title: 'Re.Wise', text: 'Fast offline FSRS spaced repetition flashcards', url: window.location.origin }).catch(() => {});
    } else {
      navigator.clipboard.writeText(window.location.origin);
      alert('App link copied to clipboard!');
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="fixed inset-0 bg-black/40 backdrop-blur-sm" />

          <motion.div
            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 26, stiffness: 280 }}
            className="relative z-10 w-full max-w-md mx-auto bg-card-theme border-t border-theme rounded-t-3xl shadow-2xl flex flex-col max-h-[88vh] bottom-nav-safe overflow-hidden"
          >
            <div className="w-10 h-1 bg-[var(--border-subtle)] rounded-full mx-auto mt-3 mb-1" />

            <div className="px-5 py-2 flex items-center justify-between border-b border-theme">
              <h3 className="text-base font-bold text-theme-primary">Profile</h3>
              <button onClick={onClose} className="p-1 rounded-lg text-theme-secondary hover:text-theme-primary"><X className="h-4 w-4" /></button>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3.5">
              {/* Account Card */}
              <div className="p-3.5 rounded-2xl bg-canvas border border-theme space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-full bg-sage text-forest flex items-center justify-center font-bold text-xs border border-theme">
                      {user?.email ? user.email[0].toUpperCase() : <UserIcon className="h-4 w-4" />}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-theme-primary">{user?.email || 'Guest Mode'}</div>
                      <div className="text-[10px] text-theme-secondary flex items-center gap-1">
                        <span className={`w-1.5 h-1.5 rounded-full ${user ? 'bg-emerald-500' : 'bg-zinc-400'}`} />
                        <span>{user ? (syncState === 'offline' ? 'Offline' : 'Synced') : 'Local Storage'}</span>
                      </div>
                    </div>
                  </div>
                  {user ? (
                    <button onClick={handleSyncNow} disabled={isSyncing} className="px-3 py-1 rounded-full bg-sage text-forest text-xs font-semibold hover:opacity-90 flex items-center gap-1 active:scale-95">
                      <RefreshCw className={`h-3 w-3 ${isSyncing ? 'animate-spin' : ''}`} />
                      <span>{isSyncing ? 'Syncing' : 'Sync'}</span>
                    </button>
                  ) : null}
                </div>

                {!user && (
                  <button onClick={() => signInWithGoogle()} className="w-full py-2.5 rounded-xl bg-forest hover:opacity-90 text-white font-semibold text-xs shadow-sm active:scale-95 transition-all">
                    Sign in with Google
                  </button>
                )}
              </div>

              {/* Study & FSRS Settings */}
              <div className="p-3.5 rounded-2xl bg-canvas border border-theme space-y-3">
                <div className="text-[10px] font-bold uppercase tracking-wider text-theme-secondary">Study Settings</div>

                {/* Exam Target */}
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text" value={examName} onChange={(e) => setExamName(e.target.value)} onBlur={() => handleSaveSettings()}
                    placeholder="Exam (e.g. USMLE)" className="bg-card-theme border border-theme rounded-xl px-2.5 py-1.5 text-xs text-theme-primary placeholder:text-theme-secondary focus:outline-none focus:border-forest"
                  />
                  <input
                    type="date" value={examDate} onChange={(e) => { setExamDate(e.target.value); handleSaveSettings({ target_exam_date: e.target.value }); }}
                    className="bg-card-theme border border-theme rounded-xl px-2 py-1.5 text-xs text-theme-primary focus:outline-none focus:border-forest"
                  />
                </div>

                {/* Review Mode & Retention */}
                <div className="flex items-center justify-between text-xs pt-1">
                  <span className="text-theme-secondary font-medium">Review Mode</span>
                  <div className="flex gap-1 bg-card-theme p-0.5 rounded-lg border border-theme">
                    {(['swipe', 'pro'] as const).map((m) => (
                      <button key={m} onClick={() => handleReviewModeChange(m)} className={`px-2.5 py-0.5 rounded-md text-[11px] font-semibold capitalize ${reviewMode === m ? 'bg-forest text-white' : 'text-theme-secondary'}`}>
                        {m === 'pro' ? '4-Button' : 'Swipe'}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-theme-secondary font-medium">Retention</span>
                  <div className="flex gap-1">
                    {[0.85, 0.90, 0.95].map((val) => (
                      <button key={val} onClick={() => { setRetention(val); handleSaveSettings({ desired_retention: val }); }} className={`px-2 py-0.5 rounded-lg text-[11px] font-semibold border ${retention === val ? 'bg-sage border-forest/30 text-forest' : 'bg-card-theme border-theme text-theme-secondary'}`}>
                        {Math.round(val * 100)}%
                      </button>
                    ))}
                  </div>
                </div>

                {/* Daily Reminder */}
                <div className="flex items-center justify-between text-xs pt-0.5">
                  <div className="flex items-center gap-1.5 text-theme-secondary font-medium"><Bell className="h-3.5 w-3.5" /> <span>Reminder</span></div>
                  <div className="flex items-center gap-1.5">
                    {reminderEnabled && (
                      <input type="time" value={reminderTime} onChange={(e) => handleReminderTimeChange(e.target.value)} className="bg-card-theme border border-theme rounded-lg px-1.5 py-0.5 text-[11px] text-theme-primary focus:outline-none" />
                    )}
                    <button onClick={() => handleReminderToggle(!reminderEnabled)} className={`w-8 h-4 rounded-full transition-colors relative ${reminderEnabled ? 'bg-forest' : 'bg-[var(--border-subtle)]'}`}>
                      <span className={`block w-3 h-3 rounded-full bg-white transition-transform ${reminderEnabled ? 'translate-x-4' : 'translate-x-0.5'}`} />
                    </button>
                  </div>
                </div>
              </div>

              {/* Data & Compliance */}
              <div className="p-3.5 rounded-2xl bg-canvas border border-theme space-y-2.5">
                <div className="flex items-center justify-between text-[11px] text-theme-secondary">
                  <span>Storage: {decksCount} Decks · {cardsCount} Cards</span>
                  <span className="px-2 py-0.5 rounded-full bg-sage text-forest font-semibold">Offline Ready</span>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button onClick={onOpenExport} className="py-2 px-3 rounded-xl bg-card-theme border border-theme text-xs font-semibold text-theme-primary flex items-center justify-center gap-1.5 active:scale-95">
                    <Download className="h-3.5 w-3.5 text-forest" /> Backup
                  </button>
                  <button onClick={handleShareApp} className="py-2 px-3 rounded-xl bg-card-theme border border-theme text-xs font-semibold text-theme-primary flex items-center justify-center gap-1.5 active:scale-95">
                    <Share2 className="h-3.5 w-3.5 text-forest" /> Share App
                  </button>
                </div>

                <button onClick={() => setShowPrivacy(true)} className="w-full text-center text-[11px] text-theme-secondary hover:text-forest py-1">
                  Privacy Policy
                </button>
              </div>

              {/* Sign Out & Destructive Account Delete */}
              <div className="space-y-2 pt-1">
                {user && (
                  <button onClick={handleSignOut} className="w-full py-2.5 rounded-xl border border-theme bg-card-theme text-theme-primary font-semibold text-xs flex items-center justify-center gap-1.5 hover:bg-canvas active:scale-95">
                    <LogOut className="h-3.5 w-3.5" /> Sign Out
                  </button>
                )}

                {confirmDelete ? (
                  <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-center space-y-2">
                    <p className="text-xs font-bold text-rose-600">Delete all data permanently?</p>
                    <div className="flex items-center gap-2">
                      <button onClick={() => setConfirmDelete(false)} className="flex-1 py-1.5 rounded-lg border border-theme bg-card-theme text-xs font-semibold text-theme-secondary">Cancel</button>
                      <button onClick={handleDeleteAccount} className="flex-1 py-1.5 rounded-lg bg-rose-600 text-white text-xs font-semibold hover:bg-rose-700">Delete</button>
                    </div>
                  </div>
                ) : (
                  <button onClick={() => setConfirmDelete(true)} className="w-full py-2 text-center text-xs text-rose-500 hover:text-rose-600 font-medium">
                    Delete Account & Data
                  </button>
                )}
              </div>
            </div>
          </motion.div>

          {/* Privacy Policy Modal */}
          {showPrivacy && (
            <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
              <div className="bg-card-theme border border-theme rounded-2xl p-5 max-w-sm w-full space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-theme">
                  <h4 className="text-sm font-bold text-theme-primary flex items-center gap-1.5"><ShieldCheck className="h-4 w-4 text-forest" /> Privacy Policy</h4>
                  <button onClick={() => setShowPrivacy(false)} className="text-theme-secondary hover:text-theme-primary"><X className="h-4 w-4" /></button>
                </div>
                <div className="text-xs text-theme-secondary space-y-2 leading-relaxed">
                  <p>Re.Wise stores all flashcards, notes, and study progress locally on your device via SQLite.</p>
                  <p>Optional Cloud Sync uses Supabase to synchronize your cards across devices. We never sell your personal data.</p>
                  <p>You may export or delete all your data at any time using the Delete Account option.</p>
                </div>
                <button onClick={() => setShowPrivacy(false)} className="w-full py-2 rounded-xl bg-forest text-white text-xs font-semibold">Done</button>
              </div>
            </div>
          )}
        </div>
      )}
    </AnimatePresence>
  );
};