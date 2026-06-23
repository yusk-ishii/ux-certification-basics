import type { LearningHistory, LearningRecord } from '../types/quiz';

const HISTORY_KEY = 'ux-quiz:history';

const SRS_INTERVALS = [0, 1, 3, 7, 14, 30] as const;

export function getHistory(): LearningHistory {
  if (typeof localStorage === 'undefined') return {};
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) ?? '{}');
  } catch {
    return {};
  }
}

function saveHistory(history: LearningHistory): void {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
}

function defaultRecord(): LearningRecord {
  return { correct: 0, incorrect: 0, level: 0, nextReview: null, bookmarked: false, lastAnswered: null };
}

export function recordAnswer(questionId: string, isCorrect: boolean): void {
  const history = getHistory();
  const rec = history[questionId] ?? defaultRecord();

  if (isCorrect) {
    rec.correct++;
    const newLevel = Math.min(5, (rec.level + 1)) as LearningRecord['level'];
    rec.level = newLevel;
    const days = SRS_INTERVALS[newLevel];
    const next = new Date();
    next.setDate(next.getDate() + days);
    rec.nextReview = next.toISOString().slice(0, 10);
  } else {
    rec.incorrect++;
    rec.level = 0;
    rec.nextReview = new Date().toISOString().slice(0, 10);
  }
  rec.lastAnswered = new Date().toISOString();
  history[questionId] = rec;
  saveHistory(history);
}

export function toggleBookmark(questionId: string): boolean {
  const history = getHistory();
  const rec = history[questionId] ?? defaultRecord();
  rec.bookmarked = !rec.bookmarked;
  history[questionId] = rec;
  saveHistory(history);
  return rec.bookmarked;
}

export function getTodayReviewIds(): string[] {
  const today = new Date().toISOString().slice(0, 10);
  const history = getHistory();
  return Object.entries(history)
    .filter(([, rec]) => rec.nextReview !== null && rec.nextReview <= today)
    .map(([id]) => id);
}

export function getBookmarkedIds(): string[] {
  const history = getHistory();
  return Object.entries(history)
    .filter(([, rec]) => rec.bookmarked)
    .map(([id]) => id);
}

export function getWeakIds(limit = 30): string[] {
  const history = getHistory();
  return Object.entries(history)
    .filter(([, rec]) => rec.correct + rec.incorrect > 0)
    .sort(([, a], [, b]) => {
      const rateA = a.correct / (a.correct + a.incorrect);
      const rateB = b.correct / (b.correct + b.incorrect);
      return rateA - rateB;
    })
    .slice(0, limit)
    .map(([id]) => id);
}

export function clearHistory(): void {
  localStorage.removeItem(HISTORY_KEY);
}
