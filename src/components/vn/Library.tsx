"use client";

import { useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BookOpen,
  FileText,
  Upload,
  Trash2,
  Play,
  Sparkles,
  Loader2,
  BookMarked,
  Clock,
  ChevronRight,
  X,
} from "lucide-react";
import type { VNBook } from "@/lib/vn-parser";
import { parseFile, formatBytes } from "@/lib/vn-parser";
import {
  useVNStore,
  formatDuration,
  computeBookProgress,
  totalSegments,
} from "@/lib/vn-store";
import { cn } from "@/lib/utils";
import { GradientBackground } from "./GradientBackground";

interface LibraryProps {
  onOpen: (book: VNBook, chapterId?: string, segIdx?: number) => void;
}

const ACCEPTED = ".txt,.pdf,.docx,.epub";

export function Library({ onOpen }: LibraryProps) {
  const { books, addBook, removeBook, saves, settings } = useVNStore();
  const fileRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [previewBook, setPreviewBook] = useState<VNBook | null>(null);

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setImporting(true);
    setImportError(null);
    try {
      for (const file of Array.from(files)) {
        const book = await parseFile(file);
        addBook(book);
      }
    } catch (err) {
      console.error(err);
      setImportError(
        err instanceof Error
          ? `Failed to import: ${err.message}`
          : "Failed to import file."
      );
    } finally {
      setImporting(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    handleFiles(e.dataTransfer.files);
  };

  return (
    <div className="vn-app vn-bg-sakura min-h-screen overflow-y-auto vn-scroll">
      {/* Generic animated gradient background (animejs) */}
      <GradientBackground theme={settings.theme} />

      {/* Decorative sakura petals */}
      <SakuraPetals />

      {/* Header */}
      <header className="relative z-10 px-6 md:px-12 pt-10 pb-6 text-center">
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6 }}
        >
          <div className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.3em] opacity-70 mb-3">
            <Sparkles className="w-3 h-3" />
            Japanese-style Visual Novel Reader
            <Sparkles className="w-3 h-3" />
          </div>
          <h1
            className="text-5xl md:text-6xl font-bold mb-3"
            style={{
              fontFamily: "var(--font-jp-serif), serif",
              letterSpacing: "0.05em",
              background: "linear-gradient(135deg, #d6336c 0%, #a61e4d 50%, #7048e8 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            桜ノベル
          </h1>
          <p className="text-base opacity-70 max-w-xl mx-auto">
            Sakura Novels — import PDF, TXT, DOCX, or EPUB books and read them
            as immersive visual novels. Chapters become chapters; text becomes
            beats; your book becomes a story.
          </p>
        </motion.div>
      </header>

      <main className="relative z-10 px-6 md:px-12 pb-20 max-w-6xl mx-auto">
        {/* Import dropzone */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          className={cn(
            "relative rounded-2xl border-2 border-dashed p-8 md:p-12 text-center mb-10 transition-all cursor-pointer",
            dragOver
              ? "border-rose-400 bg-rose-50/50 scale-[1.01]"
              : "border-rose-200 bg-white/40 hover:bg-white/60 hover:border-rose-300"
          )}
          onClick={() => fileRef.current?.click()}
        >
          <input
            ref={fileRef}
            type="file"
            accept={ACCEPTED}
            multiple
            className="sr-only"
            aria-label="Import book file"
            onChange={(e) => handleFiles(e.target.files)}
          />
          <div className="flex flex-col items-center gap-3">
            <div
              className={cn(
                "w-14 h-14 rounded-full flex items-center justify-center transition-colors",
                dragOver ? "bg-rose-400 text-white" : "bg-rose-100 text-rose-600"
              )}
            >
              {importing ? (
                <Loader2 className="w-6 h-6 animate-spin" />
              ) : (
                <Upload className="w-6 h-6" />
              )}
            </div>
            <div>
              <div className="text-lg font-semibold">
                {importing
                  ? "Importing your book…"
                  : dragOver
                    ? "Drop your book here"
                    : "Import a book"}
              </div>
              <div className="text-sm opacity-60 mt-1">
                Drag &amp; drop or click to browse · PDF, TXT, DOCX, EPUB
              </div>
            </div>
          </div>
          {importError && (
            <div className="mt-4 text-sm text-rose-700 bg-rose-100/70 rounded-lg px-4 py-2 inline-block">
              {importError}
            </div>
          )}
        </motion.div>

        {/* Aggregate stats */}
        {books.length > 0 && <AggregateStats />}

        {/* Library */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <BookMarked className="w-5 h-5 text-rose-500" />
            Your Library
            <span className="text-sm font-normal opacity-50">
              ({books.length})
            </span>
          </h2>
        </div>

        {books.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {books.map((book) => {
              const lastSave = saves.find((s) => s.bookId === book.id);
              return (
                <BookCard
                  key={book.id}
                  book={book}
                  lastSave={lastSave}
                  onOpen={() => {
                    if (lastSave) {
                      onOpen(book, lastSave.chapterId, lastSave.segmentIndex);
                    } else {
                      onOpen(book);
                    }
                  }}
                  onPreview={() => setPreviewBook(book)}
                  onRemove={() => removeBook(book.id)}
                  theme={settings.theme}
                />
              );
            })}
          </div>
        )}

        {/* Article quote — the design philosophy */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="mt-12 text-center text-xs opacity-50 max-w-2xl mx-auto italic"
        >
          “An ideal UI will never draw attention to itself and become a natural
          extension of the player&apos;s engagement with the game.”
          <div className="mt-1 not-italic">— The Magic of Buttons</div>
        </motion.div>
      </main>

      {/* Preview modal */}
      <AnimatePresence>
        {previewBook && (
          <PreviewModal
            book={previewBook}
            onClose={() => setPreviewBook(null)}
            onOpenChapter={(chId) => {
              onOpen(previewBook, chId, 0);
              setPreviewBook(null);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function EmptyState() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="text-center py-16 opacity-60"
    >
      <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-50" />
      <p className="text-sm">No books in your library yet.</p>
      <p className="text-xs mt-1">
        Import a PDF, TXT, DOCX, or EPUB to get started.
      </p>
    </motion.div>
  );
}

function BookCard({
  book,
  lastSave,
  onOpen,
  onPreview,
  onRemove,
  theme,
}: {
  book: VNBook;
  lastSave: ReturnType<typeof useVNStore.getState>["saves"][number] | undefined;
  onOpen: () => void;
  onPreview: () => void;
  onRemove: () => void;
  theme: string;
}) {
  const stats = useVNStore((s) => s.stats[book.id]);
  const totalSegs = book.chapters.reduce((sum, c) => sum + c.segments.length, 0);
  const coverGradient = COVER_GRADIENTS[book.id.charCodeAt(0) % COVER_GRADIENTS.length];

  // Progress based on highest reached chapter/segment.
  const progress =
    stats && (stats.highestChapterIdx > 0 || stats.highestSegmentIdx > 0)
      ? computeBookProgress(
          book,
          stats.highestChapterIdx,
          stats.highestSegmentIdx
        )
      : 0;
  const timeSpent = stats?.timeSpentMs || 0;
  const hasStarted = progress > 0 || timeSpent > 0;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="vn-book-card group bg-white/70 backdrop-blur rounded-2xl overflow-hidden border border-rose-100"
    >
      {/* Cover */}
      <div
        className="h-36 relative flex items-center justify-center p-4 cursor-pointer"
        style={{ background: coverGradient }}
        onClick={onOpen}
      >
        <div className="absolute inset-0 bg-black/10 group-hover:bg-black/0 transition-colors" />
        <div className="text-center relative z-10">
          <div className="text-[10px] uppercase tracking-widest opacity-70 mb-1">
            {book.sourceFileName.split(".").pop()?.toUpperCase()}
          </div>
          <div
            className="text-lg font-semibold text-white line-clamp-3 leading-tight"
            style={{ fontFamily: "var(--font-jp-serif), serif" }}
          >
            {book.title}
          </div>
        </div>
        {/* Progress badge */}
        {hasStarted && (
          <div className="absolute top-2 left-2 bg-black/40 backdrop-blur px-2 py-0.5 rounded-full text-[10px] text-white font-medium">
            {progress}% read
          </div>
        )}
        <div className="absolute top-2 right-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
            className="bg-black/30 hover:bg-rose-500 text-white p-1.5 rounded-md transition-colors"
            title="Remove book"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
        {/* Progress bar at bottom of cover */}
        {hasStarted && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/20">
            <div
              className="h-full bg-gradient-to-r from-rose-300 to-white transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}
      </div>

      {/* Meta */}
      <div className="p-4">
        <div className="flex items-center justify-between text-xs opacity-60 mb-2">
          <span className="flex items-center gap-1">
            <FileText className="w-3 h-3" />
            {book.chapters.length} chapters
          </span>
          <span>{totalSegs} beats</span>
        </div>

        {/* Reading time + progress row */}
        {hasStarted && (
          <div className="flex items-center gap-3 mb-2 text-[11px]">
            <span className="flex items-center gap-1 text-rose-600 font-medium">
              <Clock className="w-3 h-3" />
              {formatDuration(timeSpent)}
            </span>
            <span className="opacity-30">·</span>
            <span className="opacity-60">
              {stats?.wordsRead.toLocaleString() || 0} words
            </span>
          </div>
        )}

        {book.description && (
          <p className="text-xs opacity-70 line-clamp-2 mb-3 italic">
            “{book.description}”
          </p>
        )}
        <div className="flex gap-2">
          <button
            onClick={onOpen}
            className="flex-1 bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 text-white py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-1.5 transition-colors"
          >
            {hasStarted ? (
              <>
                <Play className="w-3.5 h-3.5" /> Continue · {progress}%
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5" /> Read
              </>
            )}
          </button>
          <button
            onClick={onPreview}
            className="bg-white border border-rose-200 hover:bg-rose-50 text-rose-700 py-2 px-3 rounded-lg text-sm flex items-center gap-1 transition-colors"
            title="View chapters"
          >
            <BookOpen className="w-3.5 h-3.5" />
          </button>
        </div>
        {lastSave && (
          <div className="mt-2 text-[10px] opacity-60 flex items-center gap-1">
            <Clock className="w-2.5 h-2.5" />
            Last read: {new Date(lastSave.savedAt).toLocaleDateString()} ·{" "}
            {lastSave.chapterTitle || "Chapter"}
          </div>
        )}
      </div>
    </motion.div>
  );
}

/**
 * Aggregate stats banner across all books in the library.
 * Shows: total books, total reading time, total words read, books finished.
 */
function AggregateStats() {
  const { books, stats } = useVNStore();
  const statEntries = Object.values(stats);

  const totalTime = statEntries.reduce((sum, s) => sum + s.timeSpentMs, 0);
  const totalWords = statEntries.reduce((sum, s) => sum + s.wordsRead, 0);

  // Count books finished (progress >= 100%).
  const finished = books.filter((b) => {
    const s = stats[b.id];
    if (!s) return false;
    return computeBookProgress(b, s.highestChapterIdx, s.highestSegmentIdx) >= 100;
  }).length;

  const inProgress = books.filter((b) => {
    const s = stats[b.id];
    if (!s) return false;
    const p = computeBookProgress(b, s.highestChapterIdx, s.highestSegmentIdx);
    return p > 0 && p < 100;
  }).length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15 }}
      className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8"
    >
      <AggTile
        label="Books"
        value={String(books.length)}
        sub={`${finished} finished · ${inProgress} in progress`}
        accent="from-rose-400 to-pink-500"
      />
      <AggTile
        label="Total Reading Time"
        value={formatDuration(totalTime)}
        sub="across all books"
        accent="from-violet-400 to-purple-500"
      />
      <AggTile
        label="Words Read"
        value={totalWords.toLocaleString()}
        sub="cumulative"
        accent="from-amber-400 to-orange-500"
      />
      <AggTile
        label="Books Finished"
        value={`${finished} / ${books.length}`}
        sub={finished > 0 ? "great job!" : "keep reading"}
        accent="from-emerald-400 to-teal-500"
      />
    </motion.div>
  );
}

function AggTile({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string;
  sub: string;
  accent: string;
}) {
  return (
    <div className="bg-white/70 backdrop-blur rounded-xl p-4 border border-rose-100 relative overflow-hidden">
      <div
        className={cn(
          "absolute top-0 left-0 w-1 h-full bg-gradient-to-b opacity-80",
          accent
        )}
      />
      <div className="text-[10px] uppercase tracking-widest opacity-60 mb-1">
        {label}
      </div>
      <div className="text-xl font-bold tabular-nums text-rose-900">{value}</div>
      <div className="text-[10px] opacity-60 mt-0.5">{sub}</div>
    </div>
  );
}

const COVER_GRADIENTS = [
  "linear-gradient(135deg, #f43f5e 0%, #be123c 100%)",
  "linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)",
  "linear-gradient(135deg, #ec4899 0%, #be185d 100%)",
  "linear-gradient(135deg, #f97316 0%, #c2410c 100%)",
  "linear-gradient(135deg, #06b6d4 0%, #0e7490 100%)",
  "linear-gradient(135deg, #10b981 0%, #047857 100%)",
  "linear-gradient(135deg, #6366f1 0%, #4338ca 100%)",
  "linear-gradient(135deg, #d946ef 0%, #a21caf 100%)",
];

function PreviewModal({
  book,
  onClose,
  onOpenChapter,
}: {
  book: VNBook;
  onClose: () => void;
  onOpenChapter: (chapterId: string) => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-6"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 30, opacity: 0 }}
        className="bg-white rounded-2xl max-w-2xl w-full max-h-[80vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-rose-100 flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-rose-900">{book.title}</h3>
            <p className="text-xs text-rose-500 mt-0.5">
              {book.chapters.length} chapters · {book.sourceFileName}
            </p>
          </div>
          <button
            onClick={onClose}
            className="bg-rose-50 hover:bg-rose-100 p-2 rounded-lg text-rose-600"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto vn-scroll p-4">
          {book.chapters.map((ch, idx) => (
            <button
              key={ch.id}
              onClick={() => onOpenChapter(ch.id)}
              className="w-full text-left px-4 py-3 rounded-lg hover:bg-rose-50 transition-colors flex items-center gap-3 group"
            >
              <div className="shrink-0 w-8 h-8 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center text-xs font-mono">
                {String(idx + 1).padStart(2, "0")}
              </div>
              <div className="flex-1 min-w-0">
                <div
                  className="text-sm font-medium text-rose-900 truncate"
                  style={{ fontFamily: "var(--font-jp-serif), serif" }}
                >
                  {ch.title}
                </div>
                <div className="text-[11px] text-rose-400">
                  {ch.segments.length} beats
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-rose-300 group-hover:text-rose-600 transition-colors" />
            </button>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}

function SakuraPetals() {
  const petals = Array.from({ length: 18 }).map((_, i) => ({
    id: i,
    left: `${Math.random() * 100}%`,
    delay: `${Math.random() * 12}s`,
    duration: `${12 + Math.random() * 16}s`,
    size: `${10 + Math.random() * 14}px`,
    char: Math.random() > 0.5 ? "❀" : "✿",
    opacity: 0.2 + Math.random() * 0.4,
  }));
  return (
    <div className="fixed inset-0 pointer-events-none z-0" aria-hidden>
      {petals.map((p) => (
        <span
          key={p.id}
          className="vn-petal"
          style={{
            left: p.left,
            animationDelay: p.delay,
            animationDuration: p.duration,
            fontSize: p.size,
            opacity: p.opacity,
            color: p.char === "❀" ? "#ffb6c1" : "#ffc8d6",
          }}
        >
          {p.char}
        </span>
      ))}
    </div>
  );
}
