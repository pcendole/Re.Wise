import React, { useState } from 'react';
import {
  X,
  Key,
  ExternalLink,
  Sparkles,
  Server,
  Check,
} from 'lucide-react';
import {
  getCustomApiKey,
  setCustomApiKey,
  getEndpointOverride,
  setEndpointOverride,
  getAiQuotaStatus,
} from '@/lib/aiCardGenerator';

interface AiSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved?: () => void;
}

export const AiSettingsModal: React.FC<AiSettingsModalProps> = ({
  isOpen,
  onClose,
  onSaved,
}) => {
  const [apiKey, setApiKey] = useState(getCustomApiKey());
  const [endpoint, setEndpoint] = useState(getEndpointOverride());
  const [savedSuccess, setSavedSuccess] = useState(false);
  const quota = getAiQuotaStatus();

  if (!isOpen) return null;

  const handleSave = () => {
    setCustomApiKey(apiKey);
    setEndpointOverride(endpoint);
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onSaved?.();
      onClose();
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div
        className="w-full max-w-md rounded-2xl border border-theme bg-card-theme p-5 shadow-2xl space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-2 border-b border-theme">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-sage text-forest">
              <Key className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-theme-primary">AI Config</h3>
            </div>
          </div>
          <button onClick={onClose} className="text-theme-secondary hover:text-theme-primary p-1 rounded-lg">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Quota Status Card */}
        <div className="p-3 rounded-xl bg-canvas border border-theme space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-theme-secondary flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-forest" />
              Daily Runs:
            </span>
            <span className="font-mono font-bold text-theme-primary">
              {quota.hasCustomKey ? 'Unlimited' : `${quota.used} / ${quota.limit}`}
            </span>
          </div>
          <div className="w-full bg-card-theme border border-theme h-2 rounded-full overflow-hidden">
            <div
              className="h-full bg-forest transition-all"
              style={{ width: quota.hasCustomKey ? '100%' : `${Math.min(100, (quota.used / quota.limit) * 100)}%` }}
            />
          </div>
        </div>

        {/* Custom API Key Input */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs">
            <label className="font-semibold text-theme-secondary">Gemini API Key</label>
            <a
              href="https://aistudio.google.com/app/apikey"
              target="_blank"
              rel="noreferrer"
              className="text-[10px] text-forest hover:underline flex items-center gap-0.5 font-medium"
            >
              Get Key <ExternalLink className="h-2.5 w-2.5" />
            </a>
          </div>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="AIzaSy..."
            className="w-full bg-canvas border border-theme rounded-xl px-3 py-2 text-xs text-theme-primary placeholder:text-theme-secondary focus:outline-none focus:border-forest font-mono"
          />
        </div>

        {/* Custom Cloudflare / Proxy Endpoint */}
        <div className="space-y-1">
          <label className="text-xs font-semibold text-theme-secondary flex items-center gap-1.5">
            <Server className="h-3.5 w-3.5" />
            <span>Proxy Endpoint</span>
          </label>
          <input
            type="text"
            value={endpoint}
            onChange={(e) => setEndpoint(e.target.value)}
            placeholder="https://..."
            className="w-full bg-canvas border border-theme rounded-xl px-3 py-2 text-xs text-theme-primary placeholder:text-theme-secondary focus:outline-none focus:border-forest font-mono"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-theme">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 rounded-xl text-xs text-theme-secondary hover:text-theme-primary font-medium"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-4 py-1.5 rounded-xl text-xs bg-forest text-white font-semibold hover:opacity-90 active:scale-95 transition-all min-w-[70px]"
          >
            {savedSuccess ? (
              <span className="flex items-center justify-center gap-1">
                <Check className="h-3.5 w-3.5" /> Saved
              </span>
            ) : (
              'Save'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};