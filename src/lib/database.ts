import { Capacitor } from '@capacitor/core';
import { CapacitorSQLite, SQLiteConnection, type SQLiteDBConnection } from '@capacitor-community/sqlite';
import type { Deck, Flashcard, ReviewLogEntry, ExamSettings, StudyStats } from '@/types/models';
import { scheduleCard, Rating } from './fsrsEngine';

const DB_NAME = 're_wise_db';
const STORAGE_PREFIX = 'rewise_';

// -------------------------------------------------------------
// Clean-Slate Initial Definitions (Zero Pre-Filled Data)
// -------------------------------------------------------------
export const STARTER_DECKS: Deck[] = [];
export const STARTER_CARDS: Flashcard[] = [];

export const DEFAULT_EXAM_SETTINGS: ExamSettings = {
  target_exam_name: '',
  target_exam_date: '',
  daily_review_goal: 0,
  desired_retention: 0.90,
};

// -------------------------------------------------------------
// Database Service Interface
// -------------------------------------------------------------
class DatabaseService {
  private isNative: boolean = false;
  private sqliteConn: SQLiteConnection | null = null;
  private db: SQLiteDBConnection | null = null;
  private isInitialized: boolean = false;

  async init(): Promise<void> {
    if (this.isInitialized) return;

    this.isNative = Capacitor.isNativePlatform();

    if (this.isNative) {
      try {
        this.sqliteConn = new SQLiteConnection(CapacitorSQLite);
        const ret = await this.sqliteConn.checkConnectionsConsistency();
        const isConn = (await this.sqliteConn.isConnection(DB_NAME, false)).result;

        if (ret.result && isConn) {
          this.db = await this.sqliteConn.retrieveConnection(DB_NAME, false);
        } else {
          this.db = await this.sqliteConn.createConnection(
            DB_NAME,
            false,
            'no-encryption',
            1,
            false
          );
        }

        await this.db.open();
        await this.createNativeTables();
        await this.seedIfEmptyNative();
      } catch (err) {
        console.warn('Native SQLite initialization failed, falling back to Web localStorage:', err);
        this.isNative = false;
        this.seedIfEmptyWeb();
      }
    } else {
      this.seedIfEmptyWeb();
    }

    this.isInitialized = true;
  }

  // --- SQLite Native Schemas ---
  private async createNativeTables(): Promise<void> {
    if (!this.db) return;

    const schema = `
      CREATE TABLE IF NOT EXISTS decks (
        id TEXT PRIMARY KEY,
        parent_id TEXT,
        title TEXT NOT NULL,
        description TEXT,
        category TEXT NOT NULL,
        icon TEXT,
        color TEXT,
        card_count INTEGER DEFAULT 0,
        due_count INTEGER DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS cards (
        id TEXT PRIMARY KEY,
        deck_id TEXT NOT NULL,
        card_type TEXT NOT NULL,
        front TEXT NOT NULL,
        back TEXT NOT NULL,
        cloze_content TEXT,
        cloze_mode TEXT,
        image_url TEXT,
        occlusion_boxes TEXT,
        extra_context TEXT,
        hint TEXT,
        tags TEXT,
        voice_note_url TEXT,
        drawing_data_url TEXT,
        is_flagged INTEGER DEFAULT 0,
        due TEXT NOT NULL,
        stability REAL NOT NULL,
        difficulty REAL NOT NULL,
        elapsed_days INTEGER NOT NULL,
        scheduled_days INTEGER NOT NULL,
        reps INTEGER NOT NULL,
        lapses INTEGER NOT NULL,
        state INTEGER NOT NULL,
        last_review TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY(deck_id) REFERENCES decks(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS review_logs (
        id TEXT PRIMARY KEY,
        card_id TEXT NOT NULL,
        rating INTEGER NOT NULL,
        state INTEGER NOT NULL,
        due TEXT NOT NULL,
        stability REAL NOT NULL,
        difficulty REAL NOT NULL,
        elapsed_days INTEGER NOT NULL,
        last_elapsed_days INTEGER NOT NULL,
        scheduled_days INTEGER NOT NULL,
        review TEXT NOT NULL,
        duration_ms INTEGER,
        FOREIGN KEY(card_id) REFERENCES cards(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS exam_settings (
        id TEXT PRIMARY KEY,
        target_exam_name TEXT NOT NULL,
        target_exam_date TEXT NOT NULL,
        daily_review_goal INTEGER NOT NULL,
        desired_retention REAL NOT NULL
      );
    `;

    await this.db.execute(schema);

    // Safe schema migrations for existing SQLite databases
    try {
      await this.db.execute('ALTER TABLE cards ADD COLUMN voice_note_url TEXT;');
    } catch {}
    try {
      await this.db.execute('ALTER TABLE cards ADD COLUMN drawing_data_url TEXT;');
    } catch {}
    try {
      await this.db.execute('ALTER TABLE cards ADD COLUMN is_flagged INTEGER DEFAULT 0;');
    } catch {}
  }

  private async seedIfEmptyNative(): Promise<void> {
    if (!this.db) return;
    const res = await this.db.query('SELECT COUNT(*) as count FROM exam_settings');
    const count = res.values?.[0]?.count ?? 0;
    if (count === 0) {
      await this.db.run(
        `INSERT INTO exam_settings (id, target_exam_name, target_exam_date, daily_review_goal, desired_retention)
         VALUES (?, ?, ?, ?, ?)`,
        [
          'default',
          DEFAULT_EXAM_SETTINGS.target_exam_name,
          DEFAULT_EXAM_SETTINGS.target_exam_date,
          DEFAULT_EXAM_SETTINGS.daily_review_goal,
          DEFAULT_EXAM_SETTINGS.desired_retention,
        ]
      );
    }
  }

  // --- Web Preview (localStorage) Fallback ---
  private seedIfEmptyWeb(): void {
    if (!localStorage.getItem(`${STORAGE_PREFIX}decks`)) {
      localStorage.setItem(`${STORAGE_PREFIX}decks`, JSON.stringify([]));
      localStorage.setItem(`${STORAGE_PREFIX}cards`, JSON.stringify([]));
      localStorage.setItem(`${STORAGE_PREFIX}review_logs`, JSON.stringify([]));
      localStorage.setItem(`${STORAGE_PREFIX}exam_settings`, JSON.stringify(DEFAULT_EXAM_SETTINGS));
    }
  }

  // -------------------------------------------------------------
  // Public Deck Operations
  // -------------------------------------------------------------
  async getDecks(): Promise<Deck[]> {
    await this.init();

    if (this.isNative && this.db) {
      const res = await this.db.query('SELECT * FROM decks ORDER BY created_at ASC');
      const decks = (res.values as Deck[]) || [];
      // Calculate active card counts
      for (const deck of decks) {
        const countRes = await this.db.query('SELECT COUNT(*) as count FROM cards WHERE deck_id = ?', [deck.id]);
        deck.card_count = countRes.values?.[0]?.count ?? 0;
        const dueRes = await this.db.query(
          'SELECT COUNT(*) as count FROM cards WHERE deck_id = ? AND datetime(due) <= datetime(?)',
          [deck.id, new Date().toISOString()]
        );
        deck.due_count = dueRes.values?.[0]?.count ?? 0;
      }
      return decks;
    }

    const raw = localStorage.getItem(`${STORAGE_PREFIX}decks`);
    const decks: Deck[] = raw ? JSON.parse(raw) : [];
    const allCards = await this.getCards();
    const now = new Date().getTime();

    return decks.map((deck) => {
      const deckCards = allCards.filter((c) => c.deck_id === deck.id);
      const dueCards = deckCards.filter((c) => new Date(c.due).getTime() <= now);
      return {
        ...deck,
        card_count: deckCards.length,
        due_count: dueCards.length,
      };
    });
  }

  async getDeckById(id: string): Promise<Deck | null> {
    const decks = await this.getDecks();
    return decks.find((d) => d.id === id) || null;
  }

  async saveDeck(deck: Deck): Promise<void> {
    await this.init();

    if (this.isNative && this.db) {
      await this.db.run(
        `INSERT OR REPLACE INTO decks (id, parent_id, title, description, category, icon, color, card_count, due_count, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          deck.id,
          deck.parent_id ?? null,
          deck.title,
          deck.description ?? '',
          deck.category,
          deck.icon ?? 'BookOpen',
          deck.color ?? '#6366F1',
          deck.card_count ?? 0,
          deck.due_count ?? 0,
          deck.created_at,
          deck.updated_at,
        ]
      );
      return;
    }

    const decks = await this.getDecks();
    const idx = decks.findIndex((d) => d.id === deck.id);
    if (idx >= 0) {
      decks[idx] = deck;
    } else {
      decks.push(deck);
    }
    localStorage.setItem(`${STORAGE_PREFIX}decks`, JSON.stringify(decks));
  }

  async deleteDeck(id: string): Promise<void> {
    await this.init();

    if (this.isNative && this.db) {
      await this.db.run('DELETE FROM cards WHERE deck_id = ?', [id]);
      await this.db.run('DELETE FROM decks WHERE id = ?', [id]);
      return;
    }

    const decks = (await this.getDecks()).filter((d) => d.id !== id);
    const cards = (await this.getCards()).filter((c) => c.deck_id !== id);
    localStorage.setItem(`${STORAGE_PREFIX}decks`, JSON.stringify(decks));
    localStorage.setItem(`${STORAGE_PREFIX}cards`, JSON.stringify(cards));
  }

  // -------------------------------------------------------------
  // Public Card Operations
  // -------------------------------------------------------------
  async getCards(deckId?: string): Promise<Flashcard[]> {
    await this.init();

    if (this.isNative && this.db) {
      let query = 'SELECT * FROM cards';
      const params: (string | number)[] = [];
      if (deckId) {
        query += ' WHERE deck_id = ?';
        params.push(deckId);
      }
      query += ' ORDER BY created_at ASC';

      const res = await this.db.query(query, params);
      const rows = res.values || [];
      return rows.map((r: any) => ({
        ...r,
        is_flagged: Boolean(r.is_flagged),
        isFlagged: Boolean(r.is_flagged),
        occlusion_boxes: r.occlusion_boxes ? JSON.parse(r.occlusion_boxes) : undefined,
        tags: r.tags ? JSON.parse(r.tags) : undefined,
      }));
    }

    const raw = localStorage.getItem(`${STORAGE_PREFIX}cards`);
    const cards: Flashcard[] = raw ? JSON.parse(raw) : [];
    if (deckId) {
      const rawDecks = localStorage.getItem(`${STORAGE_PREFIX}decks`);
      const allDecks: Deck[] = rawDecks ? JSON.parse(rawDecks) : [];
      const validIds = new Set<string>([deckId]);
      let changed = true;
      while (changed) {
        changed = false;
        for (const d of allDecks) {
          if (d.parent_id && validIds.has(d.parent_id) && !validIds.has(d.id)) {
            validIds.add(d.id);
            changed = true;
          }
        }
      }
      return cards.filter((c) => validIds.has(c.deck_id));
    }
    return cards;
  }

  async getCardsByDeck(deckId: string): Promise<Flashcard[]> {
    return this.getCards(deckId);
  }

  async getCardById(id: string): Promise<Flashcard | null> {
    const cards = await this.getCards();
    return cards.find((c) => c.id === id) || null;
  }

  async getDueCards(deckId?: string, now: Date = new Date()): Promise<Flashcard[]> {
    const cards = await this.getCards(deckId);
    const nowTime = now.getTime();
    return cards.filter((card) => {
      const dueTime = new Date(card.due).getTime();
      return isNaN(dueTime) || dueTime <= nowTime;
    });
  }

  async saveCard(card: Flashcard): Promise<void> {
    await this.init();

    if (this.isNative && this.db) {
      await this.db.run(
        `INSERT OR REPLACE INTO cards (
          id, deck_id, card_type, front, back, cloze_content, cloze_mode, image_url, occlusion_boxes,
          extra_context, hint, tags, voice_note_url, drawing_data_url, is_flagged, due, stability, difficulty, elapsed_days, scheduled_days,
          reps, lapses, state, last_review, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          card.id,
          card.deck_id,
          card.card_type,
          card.front,
          card.back,
          card.cloze_content ?? null,
          card.cloze_mode ?? null,
          card.image_url ?? null,
          card.occlusion_boxes ? JSON.stringify(card.occlusion_boxes) : null,
          card.extra_context ?? null,
          card.hint ?? null,
          card.tags ? JSON.stringify(card.tags) : null,
          card.voice_note_url ?? card.voiceNoteDataUrl ?? null,
          card.sketchDataUrl ?? card.sketch_url ?? null,
          (card.isFlagged || card.is_flagged) ? 1 : 0,
          card.due,
          card.stability,
          card.difficulty,
          card.elapsed_days,
          card.scheduled_days,
          card.reps,
          card.lapses,
          card.state,
          card.last_review ?? null,
          card.created_at,
          card.updated_at,
        ]
      );
      return;
    }

    const cards = await this.getCards();
    const idx = cards.findIndex((c) => c.id === card.id);
    if (idx >= 0) {
      cards[idx] = card;
    } else {
      cards.push(card);
    }
    localStorage.setItem(`${STORAGE_PREFIX}cards`, JSON.stringify(cards));
  }

  async deleteCard(id: string): Promise<void> {
    await this.init();

    if (this.isNative && this.db) {
      await this.db.run('DELETE FROM cards WHERE id = ?', [id]);
      await this.db.run('DELETE FROM review_logs WHERE card_id = ?', [id]);
      return;
    }

    const cards = (await this.getCards()).filter((c) => c.id !== id);
    localStorage.setItem(`${STORAGE_PREFIX}cards`, JSON.stringify(cards));
  }

  // -------------------------------------------------------------
  // Review Logging & FSRS Scheduling
  // -------------------------------------------------------------
  async recordReview(
    card: Flashcard,
    rating: Rating,
    durationMs: number = 0
  ): Promise<{ updatedCard: Flashcard; log: ReviewLogEntry }> {
    const now = new Date();
    const { updatedCard, reviewLog } = scheduleCard(card, rating, now);
    reviewLog.duration_ms = durationMs;

    await this.saveCard(updatedCard);

    if (this.isNative && this.db) {
      await this.db.run(
        `INSERT INTO review_logs (id, card_id, rating, state, due, stability, difficulty, elapsed_days, last_elapsed_days, scheduled_days, review, duration_ms)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          reviewLog.id,
          reviewLog.card_id,
          reviewLog.rating,
          reviewLog.state,
          reviewLog.due,
          reviewLog.stability,
          reviewLog.difficulty,
          reviewLog.elapsed_days,
          reviewLog.last_elapsed_days,
          reviewLog.scheduled_days,
          reviewLog.review,
          reviewLog.duration_ms ?? 0,
        ]
      );
    } else {
      const logs = await this.getReviewLogs();
      logs.push(reviewLog);
      localStorage.setItem(`${STORAGE_PREFIX}review_logs`, JSON.stringify(logs));
    }

    return { updatedCard, log: reviewLog };
  }

  async undoReview(cardSnapshot: Flashcard, logId?: string): Promise<void> {
    await this.init();
    await this.saveCard(cardSnapshot);
    if (logId) {
      if (this.isNative && this.db) {
        await this.db.run('DELETE FROM review_logs WHERE id = ?', [logId]);
      } else {
        const raw = localStorage.getItem(`${STORAGE_PREFIX}review_logs`);
        if (raw) {
          const logs: ReviewLogEntry[] = JSON.parse(raw);
          localStorage.setItem(
            `${STORAGE_PREFIX}review_logs`,
            JSON.stringify(logs.filter((l) => l.id !== logId))
          );
        }
      }
    }
  }

  async getReviewLogs(limit: number = 1000): Promise<ReviewLogEntry[]> {
    await this.init();

    if (this.isNative && this.db) {
      const res = await this.db.query('SELECT * FROM review_logs ORDER BY review DESC LIMIT ?', [limit]);
      return (res.values as ReviewLogEntry[]) || [];
    }

    const raw = localStorage.getItem(`${STORAGE_PREFIX}review_logs`);
    const logs: ReviewLogEntry[] = raw ? JSON.parse(raw) : [];
    return logs.slice(-limit);
  }

  // -------------------------------------------------------------
  // Exam Settings & Heatmap Statistics
  // -------------------------------------------------------------
  async getExamSettings(): Promise<ExamSettings> {
    await this.init();

    if (this.isNative && this.db) {
      const res = await this.db.query('SELECT * FROM exam_settings WHERE id = ?', ['default']);
      if (res.values && res.values.length > 0) {
        const row = res.values[0];
        return {
          target_exam_name: row.target_exam_name,
          target_exam_date: row.target_exam_date,
          daily_review_goal: row.daily_review_goal,
          desired_retention: row.desired_retention,
        };
      }
    }

    const raw = localStorage.getItem(`${STORAGE_PREFIX}exam_settings`);
    return raw ? JSON.parse(raw) : DEFAULT_EXAM_SETTINGS;
  }

  async saveExamSettings(settings: ExamSettings): Promise<void> {
    await this.init();

    if (this.isNative && this.db) {
      await this.db.run(
        `INSERT OR REPLACE INTO exam_settings (id, target_exam_name, target_exam_date, daily_review_goal, desired_retention)
         VALUES (?, ?, ?, ?, ?)`,
        [
          'default',
          settings.target_exam_name,
          settings.target_exam_date,
          settings.daily_review_goal,
          settings.desired_retention,
        ]
      );
      return;
    }

    localStorage.setItem(`${STORAGE_PREFIX}exam_settings`, JSON.stringify(settings));
  }

  async getStudyStats(): Promise<StudyStats> {
    const logs = await this.getReviewLogs(5000);
    const heatmap: Record<string, number> = {};

    for (const log of logs) {
      const day = log.review.split('T')[0];
      heatmap[day] = (heatmap[day] || 0) + 1;
    }

    const daysSorted = Object.keys(heatmap).sort();
    let streak = 0;
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

    const hasStudiedRecent = heatmap[today] || heatmap[yesterday];
    if (hasStudiedRecent && daysSorted.length > 0) {
      streak = daysSorted.length;
    }

    return {
      streak_days: streak,
      last_study_date: daysSorted[daysSorted.length - 1] || '',
      total_reviews: logs.length,
      review_heatmap: heatmap,
    };
  }

  async resetToStarterDeck(): Promise<void> {
    if (this.isNative && this.db) {
      await this.db.execute(`
        DELETE FROM review_logs;
        DELETE FROM cards;
        DELETE FROM decks;
        DELETE FROM exam_settings;
      `);
      await this.seedIfEmptyNative();
    } else {
      localStorage.removeItem(`${STORAGE_PREFIX}decks`);
      localStorage.removeItem(`${STORAGE_PREFIX}cards`);
      localStorage.removeItem(`${STORAGE_PREFIX}review_logs`);
      localStorage.removeItem(`${STORAGE_PREFIX}exam_settings`);
      this.seedIfEmptyWeb();
    }
  }
}

export const db = new DatabaseService();
