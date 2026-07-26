"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { VNBook } from "./vn-parser";

export type VNMode = "adv" | "nvl" | "frame";
export type VNTheme = "sakura" | "night" | "paper" | "ocean";

export interface VNSaveSlot {
  id: string;
  bookId: string;
  bookTitle: string;
  chapterId: string;
  chapterTitle: string;
  segmentIndex: number;
  savedAt: number;
  thumbnail?: string; // chapter title snapshot
}

export interface VNSettings {
  /** Words per minute for typewriter effect (0 = instant). */
  textSpeed: number;
  /** Auto-read delay between segments, ms. */
  autoDelay: number;
  /** UI mode. */
  mode: VNMode;
  /** Visual theme. */
  theme: VNTheme;
  /** Background music volume (0-1) — reserved. */
  bgmVolume: number;
  /** Show speaker name plate. */
  showSpeaker: boolean;
  /** Font size scale. */
  fontScale: number;
  /** Auto-hide the bottom toolbar after inactivity. */
  autoHideToolbar: boolean;
}

/**
 * Reading statistics tracked per book.
 * - `timeSpentMs`: total milliseconds the reader has been open with this book.
 * - `highestChapterIdx` / `highestSegmentIdx`: furthest point reached.
 * - `lastReadAt`: timestamp of last read session.
 * - `wordsRead`: cumulative count of words the user has seen (advanced past).
 */
export interface VNBookStats {
  timeSpentMs: number;
  highestChapterIdx: number;
  highestSegmentIdx: number;
  lastReadAt: number;
  wordsRead: number;
}

interface VNState {
  books: VNBook[];
  saves: VNSaveSlot[];
  settings: VNSettings;
  /** Per-book stats keyed by bookId. */
  stats: Record<string, VNBookStats>;

  addBook: (book: VNBook) => void;
  removeBook: (bookId: string) => void;
  getBook: (bookId: string) => VNBook | undefined;

  saveProgress: (slot: VNSaveSlot) => void;
  deleteSave: (id: string) => void;
  loadSave: (id: string) => VNSaveSlot | undefined;

  updateSettings: (patch: Partial<VNSettings>) => void;

  /** Add milliseconds to a book's reading time. */
  addReadingTime: (bookId: string, ms: number) => void;
  /** Mark the highest chapter/segment reached and update word count. */
  recordProgress: (
    bookId: string,
    chapterIdx: number,
    segmentIdx: number,
    cumulativeWordsRead: number
  ) => void;
  /** Get stats for a book (or defaults if never read). */
  getStats: (bookId: string) => VNBookStats;
  /** Reset stats for a single book. */
  resetStats: (bookId: string) => void;
}

const DEFAULT_SETTINGS: VNSettings = {
  textSpeed: 80, // chars per second
  autoDelay: 1800,
  mode: "adv",
  theme: "sakura",
  bgmVolume: 0.4,
  showSpeaker: true,
  fontScale: 1,
  autoHideToolbar: true,
};

const DEFAULT_STATS: VNBookStats = {
  timeSpentMs: 0,
  highestChapterIdx: 0,
  highestSegmentIdx: 0,
  lastReadAt: 0,
  wordsRead: 0,
};

/**
 * Note: VNBook objects can be large (especially parsed PDFs). We persist
 * everything to localStorage but cap the number of books to avoid blowing
 * the quota — oldest books are evicted first.
 */
const MAX_BOOKS = 8;

export const useVNStore = create<VNState>()(
  persist(
    (set, get) => ({
      books: [],
      saves: [],
      settings: DEFAULT_SETTINGS,
      stats: {},

      addBook: (book) =>
        set((state) => {
          const next = [book, ...state.books];
          // Evict oldest if over limit.
          while (next.length > MAX_BOOKS) {
            const evicted = next.pop();
            if (evicted) {
              // Also clear saves + stats belonging to the evicted book.
              set((s) => ({
                saves: s.saves.filter((sv) => sv.bookId !== evicted.id),
                stats: Object.fromEntries(
                  Object.entries(s.stats).filter(([k]) => k !== evicted.id)
                ),
              }));
            }
          }
          return { books: next };
        }),

      removeBook: (bookId) =>
        set((state) => {
          const { [bookId]: _drop, ...restStats } = state.stats;
          return {
            books: state.books.filter((b) => b.id !== bookId),
            saves: state.saves.filter((s) => s.bookId !== bookId),
            stats: restStats,
          };
        }),

      getBook: (bookId) => get().books.find((b) => b.id === bookId),

      saveProgress: (slot) =>
        set((state) => {
          // Replace existing save at same chapter if same book/chapter.
          const filtered = state.saves.filter(
            (s) => !(s.bookId === slot.bookId && s.chapterId === slot.chapterId)
          );
          return { saves: [slot, ...filtered].slice(0, 20) };
        }),

      deleteSave: (id) =>
        set((state) => ({ saves: state.saves.filter((s) => s.id !== id) })),

      loadSave: (id) => get().saves.find((s) => s.id === id),

      updateSettings: (patch) =>
        set((state) => ({ settings: { ...state.settings, ...patch } })),

      addReadingTime: (bookId, ms) =>
        set((state) => {
          const prev = state.stats[bookId] || DEFAULT_STATS;
          return {
            stats: {
              ...state.stats,
              [bookId]: {
                ...prev,
                timeSpentMs: prev.timeSpentMs + ms,
                lastReadAt: Date.now(),
              },
            },
          };
        }),

      recordProgress: (bookId, chapterIdx, segmentIdx, cumulativeWordsRead) =>
        set((state) => {
          const prev = state.stats[bookId] || DEFAULT_STATS;
          // Only advance the "highest" pointer, never go backward.
          const currentLinear = chapterIdx * 1_000_000 + segmentIdx;
          const prevLinear =
            prev.highestChapterIdx * 1_000_000 + prev.highestSegmentIdx;
          const updated =
            currentLinear > prevLinear
              ? {
                  highestChapterIdx: chapterIdx,
                  highestSegmentIdx: segmentIdx,
                }
              : {};
          return {
            stats: {
              ...state.stats,
              [bookId]: {
                ...prev,
                ...updated,
                wordsRead: Math.max(prev.wordsRead, cumulativeWordsRead),
                lastReadAt: Date.now(),
              },
            },
          };
        }),

      getStats: (bookId) => get().stats[bookId] || DEFAULT_STATS,

      resetStats: (bookId) =>
        set((state) => {
          const { [bookId]: _drop, ...rest } = state.stats;
          return { stats: { ...rest, [bookId]: { ...DEFAULT_STATS } } };
        }),
    }),
    {
      name: "vn-store-v1",
      storage: createJSONStorage(() => localStorage),
      version: 2,
    }
  )
);

/* ============ Stats helpers ============ */

/** Format a millisecond duration as a human string like "2h 14m" or "8m 30s". */
export function formatDuration(ms: number): string {
  if (ms < 1000) return "0s";
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

/** Compute the percentage (0-100) of a book completed given chapter/segment pointers. */
export function computeBookProgress(
  book: VNBook,
  chapterIdx: number,
  segmentIdx: number
): number {
  if (!book.chapters.length) return 0;
  let totalSegs = 0;
  for (const c of book.chapters) totalSegs += c.segments.length;
  if (totalSegs === 0) return 0;
  let seen = 0;
  for (let i = 0; i < chapterIdx; i++) {
    seen += book.chapters[i].segments.length;
  }
  seen += Math.min(segmentIdx + 1, book.chapters[chapterIdx]?.segments.length || 0);
  return Math.min(100, Math.round((seen / totalSegs) * 100));
}

/** Count total segments in a book. */
export function totalSegments(book: VNBook): number {
  return book.chapters.reduce((sum, c) => sum + c.segments.length, 0);
}
