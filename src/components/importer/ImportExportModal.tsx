import React, { useState, useRef, useEffect } from 'react';
import type { Deck } from '@/types/models';
import { db } from '@/lib/database';
import { parseCSVText, mapRowsToCards, exportCardsToCSV } from '@/lib/csvParser';
import { importAnkiPackage, type AnkiImportProgress } from '@/lib/ankiImporter';
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  PackageCheck,
  X,
  CheckCircle,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ImportExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  decks: Deck[];
  onImportSuccess: () => void;
  initialTab?: 'import' | 'export';
  initialExportDeckId?: string;
}

export const ImportExportModal: React.FC<ImportExportModalProps> = ({
  isOpen,
  onClose,
  decks,
  onImportSuccess,
  initialTab = 'import',
  initialExportDeckId,
}) => {
  const [activeTab, setActiveTab] = useState<'import' | 'export'>(initialTab);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null), [targetDeckId, setTargetDeckId] = useState<string>(decks[0]?.id || '');
  const [previewInfo, setPreviewInfo] = useState<{ type: 'csv' | 'apkg'; count?: number; name: string } | null>(null);
  const [importing, setImporting] = useState(false), [progress, setProgress] = useState<AnkiImportProgress | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null), [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [exportDeckId, setExportDeckId] = useState<string>(initialExportDeckId || decks[0]?.id || 'all'), [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
      if (initialExportDeckId) setExportDeckId(initialExportDeckId);
      setErrorMsg(null); setSuccessMsg(null); setSelectedFile(null); setPreviewInfo(null);
    }
  }, [isOpen, initialTab, initialExportDeckId]);

  if (!isOpen) return null;

  const handleFileSelect = async (file: File) => {
    setSelectedFile(file);
    setErrorMsg(null);
    setSuccessMsg(null);
    if (file.name.endsWith('.apkg')) {
      setPreviewInfo({ type: 'apkg', name: file.name });
    } else {
      try {
        const rows = parseCSVText(await file.text());
        setPreviewInfo({ type: 'csv', name: file.name, count: Math.max(0, rows.length - 1) });
      } catch {
        setPreviewInfo({ type: 'csv', name: file.name });
      }
    }
  };

  const handleStartImport = async () => {
    if (!selectedFile) return;
    setImporting(true);
    setErrorMsg(null);

    try {
      if (selectedFile.name.endsWith('.apkg')) {
        const res = await importAnkiPackage(selectedFile, (p) => setProgress(p));
        setSuccessMsg(`Imported ${res.cardCount} cards across ${res.deckCount} decks!`);
      } else {
        const cards = mapRowsToCards(parseCSVText(await selectedFile.text()), targetDeckId || decks[0]?.id);
        for (const card of cards) await db.saveCard(card);
        setSuccessMsg(`Imported ${cards.length} cards!`);
      }
      onImportSuccess();
    } catch (err: any) {
      setErrorMsg(err.message || 'Import failed. Check file format.');
    } finally {
      setImporting(false);
    }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      if (exportDeckId === 'all') {
        const allCards = await db.getCards();
        exportCardsToCSV(allCards, 'all_decks');
      } else {
        const selectedDeck = decks.find((d) => d.id === exportDeckId);
        const cards = await db.getCards(exportDeckId);
        exportCardsToCSV(cards, selectedDeck?.title || 'deck');
      }
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-150">
      <div
        className="w-full max-w-md rounded-2xl border border-theme bg-card-theme p-5 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto text-theme-primary"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with Minimal Tabs */}
        <div className="flex items-center justify-between pb-2 border-b border-theme">
          <div className="flex items-center gap-1.5 p-1 bg-canvas rounded-xl border border-theme">
            <button
              onClick={() => setActiveTab('import')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'import' ? 'bg-forest text-white shadow-xs' : 'text-theme-secondary hover:text-theme-primary'
              }`}
            >
              <ArrowDownToLine className="h-3.5 w-3.5" />
              <span>Import</span>
            </button>
            <button
              onClick={() => setActiveTab('export')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'export' ? 'bg-forest text-white shadow-xs' : 'text-theme-secondary hover:text-theme-primary'
              }`}
            >
              <ArrowUpFromLine className="h-3.5 w-3.5" />
              <span>Export</span>
            </button>
          </div>
          <button onClick={onClose} className="text-theme-secondary hover:text-theme-primary p-1.5 rounded-lg hover:bg-canvas">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Import Tab Content */}
        {activeTab === 'import' && (
          <div className="space-y-3.5 text-xs">
            {!successMsg ? (
              <>
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-theme hover:border-forest rounded-2xl p-6 text-center cursor-pointer bg-canvas/50 hover:bg-canvas transition-all space-y-2 group"
                >
                  <div className="h-10 w-10 rounded-xl bg-sage text-forest flex items-center justify-center mx-auto border border-theme group-hover:scale-105 transition-transform">
                    <ArrowDownToLine className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-bold text-theme-primary text-sm">Select .apkg or .csv</p>
                    <p className="text-[11px] text-theme-secondary mt-0.5">Anki deck package or CSV spreadsheet</p>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".apkg,.csv,.tsv,application/zip"
                    className="hidden"
                    onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
                  />
                </div>

                {previewInfo && (
                  <div className="p-3 rounded-xl bg-canvas border border-theme space-y-2">
                    <div className="flex items-center justify-between font-semibold">
                      <span className="truncate max-w-[220px] text-theme-primary">{previewInfo.name}</span>
                      <span className="uppercase text-[10px] px-2 py-0.5 rounded-full bg-sage text-forest font-mono font-bold">
                        {previewInfo.type}
                      </span>
                    </div>
                    {previewInfo.type === 'csv' && (
                      <div className="space-y-1 pt-1 border-t border-theme">
                        <label className="text-theme-secondary font-medium">Target Deck</label>
                        <select
                          value={targetDeckId}
                          onChange={(e) => setTargetDeckId(e.target.value)}
                          className="w-full rounded-xl bg-card-theme border border-theme px-2.5 py-1.5 text-theme-primary focus:outline-none focus:border-forest"
                        >
                          {decks.map((d) => (
                            <option key={d.id} value={d.id}>{d.title}</option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                )}

                {progress && (
                  <div className="space-y-1.5 p-3 rounded-xl bg-canvas border border-theme">
                    <div className="flex justify-between text-[11px] text-theme-secondary font-medium">
                      <span>{progress.message}</span>
                      <span>{progress.percent}%</span>
                    </div>
                    <div className="w-full bg-theme h-1.5 rounded-full overflow-hidden">
                      <div className="bg-forest h-full transition-all duration-300" style={{ width: `${progress.percent}%` }} />
                    </div>
                  </div>
                )}

                {errorMsg && (
                  <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                <Button
                  onClick={handleStartImport}
                  disabled={!selectedFile || importing}
                  className="w-full bg-forest hover:opacity-90 text-white font-bold h-10 gap-1.5 rounded-xl shadow-sm"
                >
                  {importing ? <RefreshCw className="h-4 w-4 animate-spin" /> : <PackageCheck className="h-4 w-4" />}
                  <span>{importing ? 'Importing...' : 'Start Import'}</span>
                </Button>
              </>
            ) : (
              <div className="text-center py-4 space-y-3">
                <CheckCircle className="h-10 w-10 text-forest mx-auto" />
                <p className="font-bold text-theme-primary text-sm">{successMsg}</p>
                <Button onClick={onClose} className="w-full bg-forest hover:opacity-90 text-white rounded-xl font-bold">Done</Button>
              </div>
            )}
          </div>
        )}

        {/* Export Tab Content */}
        {activeTab === 'export' && (
          <div className="space-y-3.5 text-xs">
            <div className="space-y-1">
              <label className="text-theme-secondary font-semibold">Select Deck</label>
              <select value={exportDeckId} onChange={(e) => setExportDeckId(e.target.value)} className="w-full rounded-xl bg-canvas border border-theme px-3 py-2 text-theme-primary focus:outline-none focus:border-forest">
                <option value="all">All Decks</option>
                {decks.map((d) => (<option key={d.id} value={d.id}>{d.title} ({d.card_count || 0})</option>))}
              </select>
            </div>

            <Button onClick={handleExport} disabled={exporting} className="w-full bg-forest hover:opacity-90 text-white font-bold h-10 gap-1.5 rounded-xl shadow-sm">
              <ArrowUpFromLine className="h-4 w-4" /><span>{exporting ? 'Exporting...' : 'Export CSV'}</span>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};
