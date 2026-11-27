import JSZip from 'jszip';
import type { Deck, Flashcard, CardType } from '@/types/models';
import { db } from './database';
import { initNewFSRSCard } from './fsrsEngine';
import { compressImageToWebP } from './imageUtils';

export interface AnkiImportProgress {
  stage: 'unzipping' | 'loading_engine' | 'reading_database' | 'extracting_media' | 'saving_cards' | 'done';
  percent: number;
  message: string;
}

/**
 * Dynamically loads sql.js from CDN without bundling any WASM locally (<9 MB budget).
 */
async function getSqlJsEngine(): Promise<any> {
  const cdnBase = 'https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.12.0';

  if (!(window as any).initSqlJs) {
    await new Promise<void>((resolve, reject) => {
      const script = document.createElement('script');
      script.src = `${cdnBase}/sql-wasm.js`;
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Failed to load sql.js engine from CDN'));
      document.head.appendChild(script);
    });
  }

  return (window as any).initSqlJs({
    locateFile: (file: string) => `${cdnBase}/${file}`,
  });
}

/**
 * Cleans Anki HTML while preserving cloze markers like {{c1::text}}
 */
function cleanAnkiText(raw: string): string {
  if (!raw) return '';
  return raw
    .replace(/<br\s*[\/]?>/gi, '\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<div>/gi, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/<[^>]+>/g, '') // Strip remaining HTML tags
    .trim();
}

/**
 * Parses and imports an Anki .apkg file directly in the browser
 */
export async function importAnkiPackage(
  file: File,
  onProgress?: (p: AnkiImportProgress) => void
): Promise<{ deckCount: number; cardCount: number }> {
  onProgress?.({ stage: 'unzipping', percent: 10, message: 'Unpacking .apkg archive...' });

  const zip = await JSZip.loadAsync(file);

  // Locate collection SQLite database (Anki 2.1 or 2.0 format)
  const dbFile = zip.file('collection.anki21') || zip.file('collection.anki2');
  if (!dbFile) {
    throw new Error('Invalid .apkg: missing collection.anki21 or collection.anki2 database.');
  }

  onProgress?.({ stage: 'loading_engine', percent: 30, message: 'Loading SQLite parser...' });
  const SQL = await getSqlJsEngine();

  onProgress?.({ stage: 'reading_database', percent: 45, message: 'Reading Anki database tables...' });
  const dbBuffer = await dbFile.async('uint8array');
  const ankiDb = new SQL.Database(dbBuffer);

  // 1. Parse Anki Decks
  const colRes = ankiDb.exec('SELECT decks FROM col LIMIT 1');
  if (colRes.length === 0 || !colRes[0].values[0]) {
    throw new Error('Unable to read deck configuration from Anki collection.');
  }

  const decksJson = JSON.parse(colRes[0].values[0][0] as string);
  const now = new Date().toISOString();
  const deckIdMap: Record<string, string> = {}; // ankiDeckId -> rewiseDeckId
  const createdDecks: Deck[] = [];

  for (const ankiId of Object.keys(decksJson)) {
    const rawDeck = decksJson[ankiId];
    if (rawDeck.name === 'Default' && Object.keys(decksJson).length > 1) continue;

    // Handle nested deck hierarchies (e.g., "Parent::Child")
    const parts = (rawDeck.name as string).split('::');
    let parentId: string | null = null;
    let accumulatedPath = '';

    for (let p = 0; p < parts.length; p++) {
      const seg = parts[p].trim();
      accumulatedPath = accumulatedPath ? `${accumulatedPath}::${seg}` : seg;
      let existing = createdDecks.find((d) => d.title === seg && d.parent_id === parentId);

      if (!existing) {
        existing = {
          id: `deck_anki_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          parent_id: parentId,
          title: seg,
          description: `Imported from Anki: ${rawDeck.name}`,
          category: 'General',
          color: p === 0 ? '#6366F1' : '#3B82F6',
          card_count: 0,
          due_count: 0,
          created_at: now,
          updated_at: now,
        };
        createdDecks.push(existing);
        await db.saveDeck(existing);
      }
      parentId = existing.id;
    }
    deckIdMap[ankiId] = parentId!;
  }

  // 2. Extract media map if present
  onProgress?.({ stage: 'extracting_media', percent: 60, message: 'Processing media files...' });
  const mediaFile = zip.file('media');
  const mediaMap: Record<string, string> = mediaFile ? JSON.parse(await mediaFile.async('text')) : {};
  const imageCache: Record<string, string> = {};

  for (const [key, origName] of Object.entries(mediaMap)) {
    if (/\.(png|jpe?g|webp|gif|svg)$/i.test(origName)) {
      const imgEntry = zip.file(key);
      if (imgEntry) {
        try {
          const blob = await imgEntry.async('blob');
          const compressed = await compressImageToWebP(blob);
          imageCache[origName] = compressed.dataUrl;
        } catch {
          // Keep raw if compression fails
        }
      }
    }
  }

  // 3. Query notes & cards
  onProgress?.({ stage: 'saving_cards', percent: 75, message: 'Importing flashcards...' });
  const notesQuery = ankiDb.exec('SELECT id, flds, tags FROM notes');
  const cardsQuery = ankiDb.exec('SELECT nid, did FROM cards');

  const cardToDeck: Record<string, string> = {};
  if (cardsQuery.length > 0) {
    for (const row of cardsQuery[0].values) {
      const nid = String(row[0]);
      const did = String(row[1]);
      cardToDeck[nid] = deckIdMap[did] || createdDecks[0]?.id;
    }
  }

  let importedCount = 0;
  if (notesQuery.length > 0) {
    const rows = notesQuery[0].values;
    for (let i = 0; i < rows.length; i++) {
      const [nid, rawFlds, rawTags] = rows[i];
      const fields = (rawFlds as string).split('\x1f');
      const targetDeckId = cardToDeck[String(nid)] || createdDecks[0]?.id;
      if (!targetDeckId) continue;

      let frontRaw = fields[0] || '';
      let backRaw = fields[1] || '';
      const extraRaw = fields[2] || '';

      // Match embedded images from media cache
      let embeddedImage: string | undefined;
      const imgMatch = frontRaw.match(/src=["']?([^"'>\s]+)["']?/i) || backRaw.match(/src=["']?([^"'>\s]+)["']?/i);
      if (imgMatch && imageCache[imgMatch[1]]) {
        embeddedImage = imageCache[imgMatch[1]];
      }

      const front = cleanAnkiText(frontRaw);
      const back = cleanAnkiText(backRaw);
      const extra = cleanAnkiText(extraRaw);
      if (!front) continue;

      const isCloze = /(?:\{\{|\[)c\d+::/.test(front);
      const cardType: CardType = isCloze ? 'cloze' : 'basic';

      const tagList = (rawTags as string)
        ? (rawTags as string).split(/\s+/).map((t) => t.trim()).filter(Boolean)
        : undefined;

      const card: Flashcard = {
        id: `card_anki_${Date.now()}_${i}`,
        deck_id: targetDeckId,
        card_type: cardType,
        front,
        back: back || front,
        cloze_content: isCloze ? front : undefined,
        cloze_mode: isCloze ? 'all' : undefined,
        image_url: embeddedImage,
        extra_context: extra || undefined,
        tags: tagList,
        ...initNewFSRSCard(),
        created_at: now,
        updated_at: now,
      };

      await db.saveCard(card);
      importedCount++;
    }
  }

  ankiDb.close();
  onProgress?.({ stage: 'done', percent: 100, message: `Imported ${importedCount} cards into ${createdDecks.length} decks!` });

  return { deckCount: createdDecks.length, cardCount: importedCount };
}
