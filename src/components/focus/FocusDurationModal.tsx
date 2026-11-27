import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, X, Check } from 'lucide-react';

interface FocusDurationModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentMinutes: number;
  onSelectMinutes: (minutes: number) => void;
}

const PRESETS = [15, 25, 45, 60, 90, 120];

export const FocusDurationModal: React.FC<FocusDurationModalProps> = ({
  isOpen,
  onClose,
  currentMinutes,
  onSelectMinutes,
}) => {
  const [customVal, setCustomVal] = useState<string>(currentMinutes.toString());

  const handleApplyCustom = () => {
    const parsed = parseInt(customVal, 10);
    if (!isNaN(parsed) && parsed >= 1 && parsed <= 180) {
      onSelectMinutes(parsed);
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm"
          />

          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="relative z-10 w-full max-w-xs bg-card-theme border border-theme rounded-3xl p-5 shadow-2xl space-y-4"
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-2 border-b border-theme">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-xl bg-sage text-forest flex items-center justify-center">
                  <Clock className="h-4 w-4" />
                </div>
                <h3 className="text-sm font-bold text-theme-primary">Set Duration</h3>
              </div>
              <button
                onClick={onClose}
                className="p-1 rounded-lg text-theme-secondary hover:text-theme-primary"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Quick Presets Grid */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-theme-secondary">Presets</label>
              <div className="grid grid-cols-3 gap-2">
                {PRESETS.map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => {
                      onSelectMinutes(m);
                      onClose();
                    }}
                    className={`py-2 rounded-xl text-xs font-semibold transition-all active:scale-95 ${
                      currentMinutes === m
                        ? 'bg-forest text-white'
                        : 'bg-canvas border border-theme text-theme-secondary hover:text-theme-primary'
                    }`}
                  >
                    {m}m
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Minutes Input */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-theme-secondary">Custom (1–180 min)</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={1}
                  max={180}
                  value={customVal}
                  onChange={(e) => setCustomVal(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleApplyCustom()}
                  placeholder="Minutes"
                  className="flex-1 bg-canvas border border-theme rounded-xl px-3 py-2 text-xs text-theme-primary placeholder:text-theme-secondary focus:outline-none focus:border-forest font-mono text-center"
                />
                <button
                  type="button"
                  onClick={handleApplyCustom}
                  className="px-4 py-2 rounded-xl bg-forest text-white text-xs font-semibold hover:opacity-90 active:scale-95 transition-all flex items-center gap-1"
                >
                  <Check className="h-3.5 w-3.5" />
                  <span>Set</span>
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};