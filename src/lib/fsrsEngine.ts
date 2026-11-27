import {
  fsrs,
  generatorParameters,
  Rating,
  State,
  createEmptyCard,
  type Card as FSRSCard,
  type Grade,
} from 'ts-fsrs';
import type { Flashcard, ReviewLogEntry } from '@/types/models';

export { Rating, State };

// Desired Retention locked at 0.90 (90%) per DECISIONS.md
export const DEFAULT_DESIRED_RETENTION = 0.90;

export function createFSRSEngine(desiredRetention: number = DEFAULT_DESIRED_RETENTION) {
  const params = generatorParameters({
    request_retention: desiredRetention,
  });
  return fsrs(params);
}

// Global FSRS instance with locked 0.90 retention
export const fsrsEngine = createFSRSEngine(DEFAULT_DESIRED_RETENTION);

export function cardToFSRSCard(card: Flashcard): FSRSCard {
  const d = card?.due ? new Date(card.due) : new Date();
  const validDue = isNaN(d.getTime()) ? new Date() : d;
  const lr = card?.last_review ? new Date(card.last_review) : undefined;
  const validLastReview = lr && !isNaN(lr.getTime()) ? lr : undefined;

  return {
    due: validDue,
    stability: typeof card?.stability === 'number' && !isNaN(card.stability) ? card.stability : 0,
    difficulty: typeof card?.difficulty === 'number' && !isNaN(card.difficulty) ? card.difficulty : 0,
    scheduled_days: card?.scheduled_days || 0,
    learning_steps: 0,
    reps: card?.reps || 0,
    lapses: card?.lapses || 0,
    state: (typeof card?.state === 'number' ? card.state : State.New) as State,
    last_review: validLastReview,
  };
}

export function fsrsCardToPartial(
  fsrsCard: FSRSCard,
  reviewDate: Date = new Date(),
  previousLastReview?: string
): Pick<
  Flashcard,
  'due' | 'stability' | 'difficulty' | 'elapsed_days' | 'scheduled_days' | 'reps' | 'lapses' | 'state' | 'last_review'
> {
  const elapsed = previousLastReview
    ? Math.max(0, Math.floor((reviewDate.getTime() - new Date(previousLastReview).getTime()) / 86400000))
    : 0;

  return {
    due: fsrsCard.due.toISOString(),
    stability: fsrsCard.stability,
    difficulty: fsrsCard.difficulty,
    elapsed_days: elapsed,
    scheduled_days: fsrsCard.scheduled_days ?? 0,
    reps: fsrsCard.reps ?? 0,
    lapses: fsrsCard.lapses ?? 0,
    state: fsrsCard.state,
    last_review: fsrsCard.last_review ? fsrsCard.last_review.toISOString() : undefined,
  };
}

export function initNewFSRSCard(now: Date = new Date()): Pick<
  Flashcard,
  'due' | 'stability' | 'difficulty' | 'elapsed_days' | 'scheduled_days' | 'reps' | 'lapses' | 'state' | 'last_review'
> {
  const empty = createEmptyCard(now);
  return {
    due: empty.due.toISOString(),
    stability: empty.stability,
    difficulty: empty.difficulty,
    elapsed_days: 0,
    scheduled_days: empty.scheduled_days,
    reps: empty.reps,
    lapses: empty.lapses,
    state: empty.state,
    last_review: undefined,
  };
}

export function formatInterval(days: number): string {
  if (days <= 0) return '< 1d';
  if (days < 1) {
    const minutes = Math.round(days * 24 * 60);
    if (minutes <= 1) return '1m';
    if (minutes < 60) return `${minutes}m`;
    return `${Math.round(days * 24)}h`;
  }
  if (days < 30) {
    return `${Math.round(days)}d`;
  }
  if (days < 365) {
    const months = Math.round(days / 30);
    return `${months}mo`;
  }
  const years = (days / 365).toFixed(1);
  return `${years}y`;
}

export interface NextIntervals {
  [Rating.Again]: { intervalDays: number; label: string };
  [Rating.Hard]: { intervalDays: number; label: string };
  [Rating.Good]: { intervalDays: number; label: string };
  [Rating.Easy]: { intervalDays: number; label: string };
}

export function getNextReviewIntervals(card: Flashcard, now: Date = new Date()): NextIntervals {
  try {
    const fsrsCard = cardToFSRSCard(card);
    const repeat = fsrsEngine.repeat(fsrsCard, now);

    const getInterval = (grade: Grade) => {
      const item = repeat[grade];
      const days = item?.card?.scheduled_days ?? 0;
      return {
        intervalDays: days,
        label: formatInterval(days),
      };
    };

    return {
      [Rating.Again]: getInterval(Rating.Again),
      [Rating.Hard]: getInterval(Rating.Hard),
      [Rating.Good]: getInterval(Rating.Good),
      [Rating.Easy]: getInterval(Rating.Easy),
    };
  } catch (err) {
    console.warn('FSRS getNextReviewIntervals fallback:', err);
    return {
      [Rating.Again]: { intervalDays: 0, label: '< 1d' },
      [Rating.Hard]: { intervalDays: 1, label: '1d' },
      [Rating.Good]: { intervalDays: 3, label: '3d' },
      [Rating.Easy]: { intervalDays: 7, label: '7d' },
    };
  }
}

export function scheduleCard(
  card: Flashcard,
  rating: Rating,
  reviewDate: Date = new Date()
): { updatedCard: Flashcard; reviewLog: ReviewLogEntry } {
  try {
    const fsrsCard = cardToFSRSCard(card);
    const schedulingRecord = fsrsEngine.repeat(fsrsCard, reviewDate);
    const item = schedulingRecord[rating as Grade];

    const updatedPartial = fsrsCardToPartial(item.card, reviewDate, card.last_review);
    const updatedCard: Flashcard = {
      ...card,
      ...updatedPartial,
      last_review: reviewDate.toISOString(),
      updated_at: reviewDate.toISOString(),
    };

    const elapsed = card.last_review
      ? Math.max(0, Math.floor((reviewDate.getTime() - new Date(card.last_review).getTime()) / 86400000))
      : 0;

    const reviewLog: ReviewLogEntry = {
      id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      card_id: card.id,
      rating,
      state: item.log.state,
      due: item.log.due.toISOString(),
      stability: item.log.stability,
      difficulty: item.log.difficulty,
      elapsed_days: elapsed,
      last_elapsed_days: card.elapsed_days || 0,
      scheduled_days: item.log.scheduled_days ?? 0,
      review: item.log.review.toISOString(),
    };

    return { updatedCard, reviewLog };
  } catch (err) {
    console.warn('FSRS scheduleCard fallback:', err);
    const days = rating === Rating.Again ? 0 : rating === Rating.Hard ? 1 : rating === Rating.Good ? 3 : 7;
    const nextDue = new Date(reviewDate.getTime() + days * 86400000);
    const updatedCard: Flashcard = {
      ...card,
      due: nextDue.toISOString(),
      state: rating === Rating.Again ? 1 : 2,
      scheduled_days: days,
      reps: (card.reps || 0) + 1,
      lapses: rating === Rating.Again ? (card.lapses || 0) + 1 : (card.lapses || 0),
      last_review: reviewDate.toISOString(),
      updated_at: reviewDate.toISOString(),
    };
    const reviewLog: ReviewLogEntry = {
      id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      card_id: card.id,
      rating,
      state: updatedCard.state,
      due: nextDue.toISOString(),
      stability: card.stability || 1,
      difficulty: card.difficulty || 5,
      elapsed_days: 0,
      last_elapsed_days: card.elapsed_days || 0,
      scheduled_days: days,
      review: reviewDate.toISOString(),
    };
    return { updatedCard, reviewLog };
  }
}

export function getCardRetrievability(card: Flashcard, now: Date = new Date()): number {
  if (card.state === State.New) {
    return 0;
  }
  const fsrsCard = cardToFSRSCard(card);
  const r = fsrsEngine.retrievability(fsrsCard, now);
  if (typeof r === 'number') {
    return Math.max(0, Math.min(1, r));
  }
  return 0;
}
