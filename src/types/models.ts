export type CardType = 'basic' | 'cloze' | 'image_occlusion' | 'occlusion';

export interface OcclusionBox {
  id: string;
  x: number; // percentage (0-100)
  y: number; // percentage (0-100)
  width: number; // percentage (0-100)
  height: number; // percentage (0-100)
  label?: string;
}

export type ClozeMode = 'all' | 'one_by_one';
export type OcclusionMode = 'hide_all_guess_one' | 'hide_one_guess_one';

export interface Flashcard {
  id: string;
  deck_id: string;
  card_type: CardType;
  front: string;
  back: string;
  cloze_content?: string;
  cloze_mode?: ClozeMode;
  image_url?: string;
  occlusion_boxes?: OcclusionBox[];
  occlusion_mode?: OcclusionMode;
  target_box_id?: string;
  extra_context?: string; // Revealed after flip (textbook screenshots, mnemonics, explanations)
  voiceNoteDataUrl?: string; // 15-second audio base64 WebP/WebM
  sketchDataUrl?: string; // Hand-drawn canvas mnemonic base64 WebP
  voice_note_url?: string; // Alias for compatibility
  sketch_url?: string; // Alias for compatibility
  hint?: string;
  tags?: string[];
  isFlagged?: boolean;
  is_flagged?: boolean;

  // FSRS scheduling parameters (persisted as ISO strings & numbers)
  due: string; // ISO timestamp
  stability: number;
  difficulty: number;
  elapsed_days: number;
  scheduled_days: number;
  reps: number;
  lapses: number;
  state: number; // 0 = New, 1 = Learning, 2 = Review, 3 = Relearning
  last_review?: string; // ISO timestamp

  created_at: string;
  updated_at: string;
}

export interface Deck {
  id: string;
  parent_id?: string | null;
  title: string;
  description?: string;
  category: 'NEET PG' | 'UPSC' | 'Engineering' | 'General' | string;
  icon?: string;
  color?: string;
  card_count?: number;
  due_count?: number;
  created_at: string;
  updated_at: string;
}

export interface ReviewLogEntry {
  id: string;
  card_id: string;
  rating: number; // 1 = Again, 2 = Hard, 3 = Good, 4 = Easy
  state: number;
  due: string;
  stability: number;
  difficulty: number;
  elapsed_days: number;
  last_elapsed_days: number;
  scheduled_days: number;
  review: string; // ISO timestamp
  duration_ms?: number;
}

export interface ExamSettings {
  target_exam_name: string;
  target_exam_date: string;
  daily_review_goal: number;
  desired_retention: number; // Default 0.90
}

export interface StudyStats {
  streak_days: number;
  last_study_date: string;
  total_reviews: number;
  review_heatmap: Record<string, number>; // "YYYY-MM-DD" -> review count
}
