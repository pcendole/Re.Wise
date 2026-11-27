import type { Flashcard, CardType } from '@/types/models';
import { initNewFSRSCard } from './fsrsEngine';

export interface ParsedCardItem {
  front: string;
  back: string;
  card_type: CardType;
  cloze_content?: string;
  extra_context?: string;
  hint?: string;
  tags?: string[];
}

/**
 * Robust CSV/TSV parser handling quotes, escaped quotes, multiline values, and TSV/CSV delimiters.
 */
export function parseCSVText(csvText: string): string[][] {
  const delimiter = csvText.includes('\t') && !csvText.includes('","') ? '\t' : ',';
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = '';
  let insideQuotes = false;

  for (let i = 0; i < csvText.length; i++) {
    const char = csvText[i];
    const nextChar = csvText[i + 1];

    if (char === '"') {
      if (insideQuotes && nextChar === '"') {
        currentField += '"';
        i++; // skip escaped quote
      } else {
        insideQuotes = !insideQuotes;
      }
    } else if (char === delimiter && !insideQuotes) {
      currentRow.push(currentField.trim());
      currentField = '';
    } else if ((char === '\r' || char === '\n') && !insideQuotes) {
      if (char === '\r' && nextChar === '\n') {
        i++; // handle CRLF
      }
      currentRow.push(currentField.trim());
      currentField = '';
      if (currentRow.some((f) => f.length > 0)) {
        rows.push(currentRow);
      }
      currentRow = [];
    } else {
      currentField += char;
    }
  }

  if (currentField.length > 0 || currentRow.length > 0) {
    currentRow.push(currentField.trim());
    if (currentRow.some((f) => f.length > 0)) {
      rows.push(currentRow);
    }
  }

  return rows;
}

/**
 * Maps parsed CSV rows to Flashcard payloads with automatic header and cloze detection.
 */
export function mapRowsToCards(rows: string[][], targetDeckId: string): Flashcard[] {
  if (rows.length === 0) return [];

  let startIndex = 0;
  const firstRow = rows[0].map((h) => h.toLowerCase());

  // Detect header indices
  let frontIdx = 0;
  let backIdx = 1;
  let extraIdx = -1;
  let tagsIdx = -1;
  let hintIdx = -1;

  const hasHeader = firstRow.some((col) =>
    ['front', 'question', 'q', 'text', 'back', 'answer', 'a', 'tags', 'extra'].includes(col)
  );

  if (hasHeader) {
    startIndex = 1;
    firstRow.forEach((col, idx) => {
      if (['front', 'question', 'q', 'text'].includes(col)) frontIdx = idx;
      else if (['back', 'answer', 'a'].includes(col)) backIdx = idx;
      else if (['extra', 'context', 'notes', 'mnemonic'].includes(col)) extraIdx = idx;
      else if (['tags', 'tag'].includes(col)) tagsIdx = idx;
      else if (['hint'].includes(col)) hintIdx = idx;
    });
  }

  const now = new Date().toISOString();
  const cards: Flashcard[] = [];

  for (let r = startIndex; r < rows.length; r++) {
    const row = rows[r];
    const rawFront = row[frontIdx] || '';
    const rawBack = row[backIdx] || '';
    if (!rawFront.trim()) continue;

    const extra = extraIdx >= 0 ? row[extraIdx] || '' : '';
    const hint = hintIdx >= 0 ? row[hintIdx] || '' : '';
    const tagsRaw = tagsIdx >= 0 ? row[tagsIdx] || '' : '';
    const tags = tagsRaw
      ? tagsRaw.split(/[,;\s]+/).map((t) => t.trim()).filter(Boolean)
      : undefined;

    // Detect Cloze syntax {{c1::...}} or [c1::...]
    const isCloze = /(?:\{\{|\[)c\d+::/.test(rawFront);
    const cardType: CardType = isCloze ? 'cloze' : 'basic';

    cards.push({
      id: `card_csv_${Date.now()}_${r}`,
      deck_id: targetDeckId,
      card_type: cardType,
      front: rawFront.trim(),
      back: rawBack.trim() || (isCloze ? rawFront.trim() : 'Answer'),
      cloze_content: isCloze ? rawFront.trim() : undefined,
      cloze_mode: isCloze ? 'all' : undefined,
      extra_context: extra.trim() || undefined,
      hint: hint.trim() || undefined,
      tags: tags && tags.length > 0 ? tags : undefined,
      ...initNewFSRSCard(),
      created_at: now,
      updated_at: now,
    });
  }

  return cards;
}

/**
 * Exports cards to a downloadable UTF-8 CSV file.
 */
export function exportCardsToCSV(cards: Flashcard[], deckTitle: string): void {
  const headers = ['Front', 'Back', 'Card Type', 'Extra Context', 'Hint', 'Tags'];
  const escapeField = (val: string | undefined) => {
    if (!val) return '""';
    return `"${val.replace(/"/g, '""')}"`;
  };

  const csvRows = [headers.join(',')];

  for (const card of cards) {
    const row = [
      escapeField(card.card_type === 'cloze' ? card.cloze_content || card.front : card.front),
      escapeField(card.back),
      escapeField(card.card_type),
      escapeField(card.extra_context),
      escapeField(card.hint),
      escapeField(card.tags?.join(', ')),
    ];
    csvRows.push(row.join(','));
  }

  const csvContent = '\uFEFF' + csvRows.join('\r\n'); // Add UTF-8 BOM for Excel compatibility
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  const safeName = deckTitle.toLowerCase().replace(/[^a-z0-9]/g, '_');
  a.download = `re_wise_${safeName}_cards.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
