import { supabase, isSupabaseConfigured, getCurrentUser } from './supabase';
import { db } from './database';
import type { Deck, Flashcard } from '@/types/models';

export type SyncState = 'guest' | 'idle' | 'syncing' | 'synced' | 'error' | 'offline';

type SyncListener = (state: SyncState, lastSyncTime: string | null) => void;

class SyncEngine {
  private syncState: SyncState = 'idle';
  private listeners: Set<SyncListener> = new Set();
  private intervalId: any = null;
  private isRunning: boolean = false;

  constructor() {
    this.updateState(isSupabaseConfigured ? 'idle' : 'guest');
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => this.sync());
      window.addEventListener('offline', () => this.updateState('offline'));
    }
  }

  subscribe(listener: SyncListener): () => void {
    this.listeners.add(listener);
    listener(this.syncState, this.getLastSyncTime());
    return () => this.listeners.delete(listener);
  }

  private updateState(state: SyncState) {
    this.syncState = state;
    const lastSync = this.getLastSyncTime();
    this.listeners.forEach((fn) => fn(this.syncState, lastSync));
  }

  getLastSyncTime(): string | null {
    return localStorage.getItem('rewise_last_synced_at');
  }

  startPeriodicSync() {
    if (this.intervalId) clearInterval(this.intervalId);
    // 60-Second Batched Sync Loop
    this.intervalId = setInterval(() => {
      if (document.visibilityState === 'visible') {
        this.sync();
      }
    }, 60000);
  }

  stopPeriodicSync() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  async sync(): Promise<{ success: boolean; error?: string }> {
    if (this.isRunning) return { success: false, error: 'Sync already in progress' };
    if (!navigator.onLine) {
      this.updateState('offline');
      return { success: false, error: 'Device is offline' };
    }
    if (!isSupabaseConfigured) {
      this.updateState('guest');
      return { success: true };
    }

    const user = await getCurrentUser();
    if (!user) {
      this.updateState('guest');
      return { success: true };
    }

    this.isRunning = true;
    this.updateState('syncing');

    try {
      await db.init();
      const lastSyncIso = this.getLastSyncTime() || '1970-01-01T00:00:00.000Z';
      const syncStartTime = new Date().toISOString();

      const [allDecks, allCards, stats, settings] = await Promise.all([
        db.getDecks(),
        db.getCards(),
        db.getStudyStats(),
        db.getExamSettings(),
      ]);

      // 1. PUSH MODIFIED DECKS TO SUPABASE
      const modifiedDecks = allDecks
        .filter((d) => !d.updated_at || d.updated_at > lastSyncIso)
        .map((d) => ({
          id: d.id,
          user_id: user.id,
          parent_id: d.parent_id || null,
          title: d.title,
          description: d.description || '',
          category: d.category,
          color: d.color || '#6366F1',
          card_count: d.card_count || 0,
          due_count: d.due_count || 0,
          created_at: d.created_at || syncStartTime,
          updated_at: d.updated_at || syncStartTime,
        }));

      if (modifiedDecks.length > 0) {
        const { error: deckErr } = await supabase.from('decks').upsert(modifiedDecks);
        if (deckErr) throw deckErr;
      }

      // 2. PUSH MODIFIED CARDS TO SUPABASE
      const modifiedCards = allCards
        .filter((c) => !c.updated_at || c.updated_at > lastSyncIso)
        .map((c) => ({
          id: c.id,
          user_id: user.id,
          deck_id: c.deck_id,
          card_type: c.card_type,
          front: c.front,
          back: c.back,
          cloze_content: c.cloze_content || null,
          cloze_mode: c.cloze_mode || null,
          image_url: c.image_url || null,
          occlusion_boxes: c.occlusion_boxes || null,
          occlusion_mode: c.occlusion_mode || null,
          target_box_id: c.target_box_id || null,
          extra_context: c.extra_context || null,
          hint: c.hint || null,
          tags: c.tags || [],
          due: c.due,
          stability: c.stability,
          difficulty: c.difficulty,
          elapsed_days: c.elapsed_days || 0,
          scheduled_days: c.scheduled_days || 0,
          reps: c.reps || 0,
          lapses: c.lapses || 0,
          state: c.state,
          last_review: c.last_review || null,
          voice_note_url: c.voiceNoteDataUrl || c.voice_note_url || null,
          sketch_url: c.sketchDataUrl || c.sketch_url || null,
          created_at: c.created_at || syncStartTime,
          updated_at: c.updated_at || syncStartTime,
        }));

      if (modifiedCards.length > 0) {
        // Chunk uploads in batches of 100 for network safety
        for (let i = 0; i < modifiedCards.length; i += 100) {
          const chunk = modifiedCards.slice(i, i + 100);
          const { error: cardErr } = await supabase.from('cards').upsert(chunk);
          if (cardErr) throw cardErr;
        }
      }

      // 3. PUSH USER STUDY STATS & EXAM GOALS
      if (stats || settings) {
        await supabase.from('user_stats').upsert({
          user_id: user.id,
          target_exam_name: settings?.target_exam_name || '',
          target_exam_date: settings?.target_exam_date || '',
          daily_review_goal: settings?.daily_review_goal || 50,
          desired_retention: settings?.desired_retention || 0.9,
          streak_days: stats?.streak_days || 0,
          last_study_date: stats?.last_study_date || '',
          total_reviews: stats?.total_reviews || 0,
          review_heatmap: stats?.review_heatmap || {},
          updated_at: syncStartTime,
        });
      }

      // 4. PULL REMOTE DECKS MODIFIED SINCE LAST SYNC
      const { data: remoteDecks } = await supabase
        .from('decks')
        .select('*')
        .eq('user_id', user.id)
        .gt('updated_at', lastSyncIso);

      if (remoteDecks && remoteDecks.length > 0) {
        for (const rd of remoteDecks) {
          const localDeck: Deck = {
            id: rd.id,
            parent_id: rd.parent_id,
            title: rd.title,
            description: rd.description,
            category: rd.category,
            color: rd.color,
            card_count: rd.card_count,
            due_count: rd.due_count,
            created_at: rd.created_at,
            updated_at: rd.updated_at,
          };
          await db.saveDeck(localDeck);
        }
      }

      // 5. PULL REMOTE CARDS MODIFIED SINCE LAST SYNC
      const { data: remoteCards } = await supabase
        .from('cards')
        .select('*')
        .eq('user_id', user.id)
        .gt('updated_at', lastSyncIso);

      if (remoteCards && remoteCards.length > 0) {
        for (const rc of remoteCards) {
          const localCard: Flashcard = {
            id: rc.id,
            deck_id: rc.deck_id,
            card_type: rc.card_type,
            front: rc.front,
            back: rc.back,
            cloze_content: rc.cloze_content,
            cloze_mode: rc.cloze_mode,
            image_url: rc.image_url,
            occlusion_boxes: rc.occlusion_boxes,
            occlusion_mode: rc.occlusion_mode,
            target_box_id: rc.target_box_id,
            extra_context: rc.extra_context,
            hint: rc.hint,
            tags: rc.tags,
            due: rc.due,
            stability: rc.stability,
            difficulty: rc.difficulty,
            elapsed_days: rc.elapsed_days,
            scheduled_days: rc.scheduled_days,
            reps: rc.reps,
            lapses: rc.lapses,
            state: rc.state,
            last_review: rc.last_review,
            voiceNoteDataUrl: rc.voice_note_url,
            sketchDataUrl: rc.sketch_url,
            created_at: rc.created_at,
            updated_at: rc.updated_at,
          };
          await db.saveCard(localCard);
        }
      }

      localStorage.setItem('rewise_last_synced_at', syncStartTime);
      this.updateState('synced');
      return { success: true };
    } catch (err: any) {
      console.warn('60s Batched Sync error:', err);
      this.updateState('error');
      return { success: false, error: err.message };
    } finally {
      this.isRunning = false;
    }
  }
}

export const syncEngine = new SyncEngine();
