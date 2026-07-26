"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  BookOpen,
  ChevronLeft,
  ChevronRight,
  FastForward,
  Grid2x2,
  List,
  Pause,
  Play,
  Save,
  Settings as SettingsIcon,
  SkipForward,
  Sparkles,
  Type,
  X,
  Bookmark,
  Eye,
  EyeOff,
  LayoutPanelLeft,
  Square,
  BarChart3,
} from "lucide-react";
import type { VNBook, VNSegment } from "@/lib/vn-parser";
import { useVNStore, type VNMode, type VNTheme } from "@/lib/vn-store";
import { cn } from "@/lib/utils";
import { VNToolbar } from "./VNToolbar";
import { VNSettingsPanel } from "./VNSettingsPanel";
import { VNChapterMenu } from "./VNChapterMenu";
import { VNSaveLoadDialog } from "./VNSaveLoadDialog";
import { VNStatsBar } from "./VNStatsBar";
import { VNStatsDialog } from "./VNStatsDialog";
import { GradientBackground } from "./GradientBackground";

interface VNReaderProps {
  book: VNBook;
  initialChapterId?: string;
  initialSegmentIndex?: number;
  onExit: () => void;
}

const THEME_BG: Record<VNTheme, string> = {
  sakura: "vn-bg-sakura",
  night: "vn-bg-night",
  paper: "vn-bg-paper",
  ocean: "vn-bg-ocean",
};

export function VNReader({
  book,
  initialChapterId,
  initialSegmentIndex,
  onExit,
}: VNReaderProps) {
  const { settings, updateSettings, saveProgress, addReadingTime, recordProgress } = useVNStore();

  const [chapterIdx, setChapterIdx] = useState(() => {
    if (initialChapterId) {
      const i = book.chapters.findIndex((c) => c.id === initialChapterId);
      if (i >= 0) return i;
    }
    return 0;
  });

  const chapter = book.chapters[chapterIdx];

  const [segIdx, setSegIdx] = useState(() => {
    if (initialChapterId && chapter?.id === initialChapterId) {
      return Math.max(0, initialSegmentIndex ?? 0);
    }
    return 0;
  });

  const [displayedText, setDisplayedText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [autoMode, setAutoMode] = useState(false);
  const [skipMode, setSkipMode] = useState(false);
  const [showChapters, setShowChapters] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showSaveLoad, setShowSaveLoad] = useState<"save" | "load" | null>(null);
  const [showToolbar, setShowToolbar] = useState(true);
  const [showBacklog, setShowBacklog] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [chapterTransition, setChapterTransition] = useState(false);

  const typeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const skipTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastActivityRef = useRef<number>(Date.now());

  const segment: VNSegment | undefined = chapter?.segments[segIdx];

  /* ============ Typewriter ============ */
  useEffect(() => {
    if (!segment) {
      setDisplayedText("");
      setIsTyping(false);
      return;
    }
    const fullText = segment.text;
    setDisplayedText("");
    setIsTyping(true);

    if (settings.textSpeed <= 0) {
      setDisplayedText(fullText);
      setIsTyping(false);
      return;
    }

    const charIntervalMs = 1000 / Math.max(5, settings.textSpeed);
    let i = 0;

    const tick = () => {
      i += 1;
      // Skip 2-3 chars at a time for CJK to feel natural.
      const step = /[\u3040-\u30ff\u3400-\u9fff\uac00-\ud7af]/.test(fullText[i - 1] || "") ? 1 : 1;
      setDisplayedText(fullText.slice(0, i));
      if (i >= fullText.length) {
        setIsTyping(false);
        if (typeTimerRef.current) clearTimeout(typeTimerRef.current);
      } else {
        typeTimerRef.current = setTimeout(tick, charIntervalMs * step);
      }
    };
    typeTimerRef.current = setTimeout(tick, charIntervalMs);

    return () => {
      if (typeTimerRef.current) clearTimeout(typeTimerRef.current);
    };
  }, [segment, settings.textSpeed]);

  /* ============ Advance logic ============ */
  const goNext = useCallback(() => {
    if (!chapter) return;
    if (isTyping) {
      // Skip typing animation
      if (typeTimerRef.current) clearTimeout(typeTimerRef.current);
      setDisplayedText(segment?.text || "");
      setIsTyping(false);
      return;
    }
    if (segIdx < chapter.segments.length - 1) {
      setSegIdx((i) => i + 1);
    } else if (chapterIdx < book.chapters.length - 1) {
      setChapterTransition(true);
      setTimeout(() => {
        setChapterIdx((i) => i + 1);
        setSegIdx(0);
        setChapterTransition(false);
      }, 350);
    } else {
      // End of book — nothing more to do.
    }
  }, [chapter, chapterIdx, segIdx, isTyping, segment, book.chapters.length]);

  const goPrev = useCallback(() => {
    if (segIdx > 0) {
      setSegIdx((i) => i - 1);
    } else if (chapterIdx > 0) {
      setChapterIdx((i) => i - 1);
      const prevChap = book.chapters[chapterIdx - 1];
      setSegIdx(Math.max(0, prevChap.segments.length - 1));
    }
  }, [segIdx, chapterIdx, book.chapters]);

  const goChapter = useCallback(
    (idx: number) => {
      if (idx < 0 || idx >= book.chapters.length) return;
      setChapterTransition(true);
      setTimeout(() => {
        setChapterIdx(idx);
        setSegIdx(0);
        setShowChapters(false);
        setChapterTransition(false);
      }, 350);
    },
    [book.chapters.length]
  );

  /* ============ Auto mode ============ */
  useEffect(() => {
    if (!autoMode || isTyping) {
      if (autoTimerRef.current) clearTimeout(autoTimerRef.current);
      return;
    }
    autoTimerRef.current = setTimeout(() => {
      goNext();
    }, settings.autoDelay);
    return () => {
      if (autoTimerRef.current) clearTimeout(autoTimerRef.current);
    };
  }, [autoMode, isTyping, segIdx, chapterIdx, settings.autoDelay, goNext]);

  /* ============ Skip mode (rapid advance) ============ */
  useEffect(() => {
    if (!skipMode) {
      if (skipTimerRef.current) clearTimeout(skipTimerRef.current);
      return;
    }
    skipTimerRef.current = setTimeout(
      () => {
        goNext();
      },
      isTyping ? 80 : 250
    );
    return () => {
      if (skipTimerRef.current) clearTimeout(skipTimerRef.current);
    };
  }, [skipMode, isTyping, segIdx, chapterIdx, goNext]);

  /* ============ Click anywhere to advance (ADV/NVL only) ============ */
  const handleStageClick = useCallback(
    (e: React.MouseEvent) => {
      // Don't advance when clicking on a button or interactive element.
      const target = e.target as HTMLElement;
      if (target.closest("button") || target.closest("[data-no-advance]")) return;
      lastActivityRef.current = Date.now();
      setShowToolbar(true);
      goNext();
    },
    [goNext]
  );

  /* ============ Auto-hide toolbar ============ */
  useEffect(() => {
    // Frame mode keeps its UI permanently visible — the frame IS the design.
    if (!settings.autoHideToolbar || settings.mode === "frame") {
      setShowToolbar(true);
      return;
    }
    const onActivity = () => {
      lastActivityRef.current = Date.now();
      setShowToolbar(true);
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
      hideTimerRef.current = setTimeout(() => {
        if (Date.now() - lastActivityRef.current >= 5000) {
          setShowToolbar(false);
        }
      }, 5500);
    };
    window.addEventListener("mousemove", onActivity);
    window.addEventListener("touchstart", onActivity);
    onActivity();
    return () => {
      window.removeEventListener("mousemove", onActivity);
      window.removeEventListener("touchstart", onActivity);
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    };
  }, [settings.autoHideToolbar, settings.mode]);

  /* ============ Keyboard ============ */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      switch (e.key) {
        case " ":
        case "Enter":
        case "ArrowRight":
          e.preventDefault();
          goNext();
          break;
        case "ArrowLeft":
          e.preventDefault();
          goPrev();
          break;
        case "a":
        case "A":
          setAutoMode((v) => !v);
          break;
        case "s":
        case "S":
          setSkipMode((v) => !v);
          break;
        case "Escape":
          if (showChapters) setShowChapters(false);
          else if (showSettings) setShowSettings(false);
          else if (showSaveLoad) setShowSaveLoad(null);
          else if (showBacklog) setShowBacklog(false);
          else if (showStats) setShowStats(false);
          else onExit();
          break;
        case "l":
        case "L":
          setShowBacklog((v) => !v);
          break;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [goNext, goPrev, onExit, showChapters, showSettings, showSaveLoad, showBacklog, showStats]);

  /* ============ Save current ============ */
  const handleSave = useCallback(() => {
    saveProgress({
      id: `${book.id}-${chapter.id}-${segIdx}-${Date.now()}`,
      bookId: book.id,
      bookTitle: book.title,
      chapterId: chapter.id,
      chapterTitle: chapter.title,
      segmentIndex: segIdx,
      savedAt: Date.now(),
      thumbnail: segment?.text?.slice(0, 80),
    });
  }, [book, chapter, segIdx, segment, saveProgress]);

  /* ============ Reading time tracker ============ */
  // Accumulate wall-clock time the reader is mounted & the page is visible.
  useEffect(() => {
    let lastTick = Date.now();
    const interval = setInterval(() => {
      if (typeof document !== "undefined" && document.visibilityState === "visible") {
        const now = Date.now();
        const delta = now - lastTick;
        // Only count up to 5 seconds per tick (avoids huge jumps after sleep).
        addReadingTime(book.id, Math.min(delta, 5000));
        lastTick = now;
      } else {
        lastTick = Date.now();
      }
    }, 2000);
    return () => clearInterval(interval);
  }, [book.id, addReadingTime]);

  /* ============ Progress + words-read tracker ============ */
  // Recompute cumulative words read every time chapter/segment changes.
  const cumulativeWordsRead = useMemo(() => {
    let count = 0;
    for (let c = 0; c < book.chapters.length; c++) {
      const ch = book.chapters[c];
      const upTo = c < chapterIdx ? ch.segments.length : c === chapterIdx ? segIdx : 0;
      for (let s = 0; s < upTo; s++) {
        const words = ch.segments[s]?.text
          .trim()
          .split(/\s+/)
          .filter(Boolean).length;
        count += words || 0;
      }
    }
    return count;
  }, [book.chapters, chapterIdx, segIdx]);

  useEffect(() => {
    recordProgress(book.id, chapterIdx, segIdx, cumulativeWordsRead);
  }, [book.id, chapterIdx, segIdx, cumulativeWordsRead, recordProgress]);

  /* ============ Progress ============ */
  const totalSegs = chapter?.segments.length || 1;
  const progress = chapter ? (segIdx / totalSegs) * 100 : 0;

  /* ============ Backlog ============ */
  const backlog = useMemo(() => {
    if (!chapter) return [] as { idx: number; seg: VNSegment }[];
    return chapter.segments.slice(0, segIdx + 1).map((seg, idx) => ({ idx, seg }));
  }, [chapter, segIdx]);

  if (!chapter) {
    return (
      <div className="vn-app vn-bg-sakura flex items-center justify-center">
        <div className="text-center">
          <p className="text-lg">No chapters found in this book.</p>
          <button onClick={onExit} className="vn-btn mt-4 px-4 py-2 rounded-md">
            Back to Library
          </button>
        </div>
      </div>
    );
  }

  const isLastSegmentOfBook =
    segIdx === chapter.segments.length - 1 && chapterIdx === book.chapters.length - 1;

  return (
    <div
      className={cn("vn-app relative w-full h-screen overflow-hidden select-none", THEME_BG[settings.theme])}
      onClick={handleStageClick}
    >
      {/* Generic animated gradient background (animejs) */}
      <GradientBackground theme={settings.theme} />

      {/* Sakura petals ambient layer */}
      {settings.theme === "sakura" && <SakuraPetals />}

      {/* Top chapter banner */}
      <div
        className="absolute top-0 left-0 right-0 z-20 pointer-events-none"
        data-no-advance
      >
        <div className="flex items-center justify-between px-6 py-4">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onExit();
            }}
            className="vn-btn px-3 py-1.5 rounded-md text-sm flex items-center gap-1.5 pointer-events-auto"
            title="Back to Library (Esc)"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            Library
          </button>
          <div className="pointer-events-auto text-center">
            <div className="text-xs uppercase tracking-widest opacity-60">
              Chapter {chapterIdx + 1} / {book.chapters.length}
            </div>
            <div
              className="text-base font-medium tracking-wide"
              style={{ fontFamily: "var(--font-jp-serif), var(--font-jp), serif" }}
            >
              {chapter.title}
            </div>
          </div>
          <VNStatsBar
            book={book}
            chapterIdx={chapterIdx}
            segmentIdx={segIdx}
            compact
            className="pointer-events-auto"
          />
        </div>
        {/* Progress bar — whole-book percentage */}
        <div className="h-0.5 bg-black/10 relative">
          <div
            className="h-full bg-gradient-to-r from-pink-400 via-rose-400 to-purple-500 transition-all duration-500"
            style={{ width: `${(() => {
              let total = 0;
              for (const c of book.chapters) total += c.segments.length;
              if (!total) return 0;
              let seen = 0;
              for (let i = 0; i < chapterIdx; i++) {
                seen += book.chapters[i].segments.length;
              }
              seen += Math.min(segIdx + 1, chapter.segments.length);
              return Math.min(100, (seen / total) * 100);
            })()}%` }}
          />
        </div>
      </div>

      {/* Chapter transition overlay */}
      <AnimatePresence>
        {chapterTransition && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-40 bg-black flex items-center justify-center"
            data-no-advance
          >
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="text-center"
            >
              <Sparkles className="w-8 h-8 mx-auto mb-3 text-pink-300" />
              <div className="text-pink-200 text-sm tracking-widest uppercase mb-2">
                Chapter {chapterIdx + 2}
              </div>
              <div
                className="text-2xl text-white"
                style={{ fontFamily: "var(--font-jp-serif), serif" }}
              >
                {book.chapters[chapterIdx + 1]?.title || ""}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ============ MAIN CONTENT AREA ============ */}
      {settings.mode === "adv" && (
        <ADVStage
          segment={segment}
          displayedText={displayedText}
          isTyping={isTyping}
          showSpeaker={settings.showSpeaker}
          fontScale={settings.fontScale}
          theme={settings.theme}
          onAdvance={goNext}
          isLast={isLastSegmentOfBook}
        />
      )}

      {settings.mode === "nvl" && (
        <NVLStage
          chapter={chapter}
          segIdx={segIdx}
          displayedText={displayedText}
          isTyping={isTyping}
          showSpeaker={settings.showSpeaker}
          fontScale={settings.fontScale}
          theme={settings.theme}
          onAdvance={goNext}
          isLast={isLastSegmentOfBook}
        />
      )}

      {settings.mode === "frame" && (
        <FrameStage
          segment={segment}
          displayedText={displayedText}
          isTyping={isTyping}
          showSpeaker={settings.showSpeaker}
          fontScale={settings.fontScale}
          theme={settings.theme}
          onAdvance={goNext}
          isLast={isLastSegmentOfBook}
          bookTitle={book.title}
          chapterTitle={chapter.title}
          chapterIdx={chapterIdx}
          totalChapters={book.chapters.length}
          autoMode={autoMode}
          skipMode={skipMode}
          onToggleAuto={() => setAutoMode((v) => !v)}
          onToggleSkip={() => setSkipMode((v) => !v)}
          onSave={handleSave}
          onOpenChapters={() => setShowChapters(true)}
          onOpenSettings={() => setShowSettings(true)}
          onOpenSaveLoad={(m) => setShowSaveLoad(m)}
          onOpenStats={() => setShowStats(true)}
          onPrev={goPrev}
          onNext={goNext}
          showToolbar={showToolbar}
          onExit={onExit}
        />
      )}

      {/* ============ BOTTOM TOOLBAR (ADV / NVL) ============ */}
      {settings.mode !== "frame" && (
        <AnimatePresence>
          {showToolbar && (
            <motion.div
              initial={{ y: 60, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 60, opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="absolute bottom-0 left-0 right-0 z-30"
              data-no-advance
            >
              <VNToolbar
                mode={settings.mode}
                autoMode={autoMode}
                skipMode={skipMode}
                onToggleAuto={() => setAutoMode((v) => !v)}
                onToggleSkip={() => setSkipMode((v) => !v)}
                onPrev={goPrev}
                onNext={goNext}
                onSave={handleSave}
                onOpenChapters={() => setShowChapters(true)}
                onOpenSettings={() => setShowSettings(true)}
                onOpenSaveLoad={(m) => setShowSaveLoad(m)}
                onOpenBacklog={() => setShowBacklog(true)}
                onOpenStats={() => setShowStats(true)}
                onCycleMode={() => {
                  const order: VNMode[] = ["adv", "nvl", "frame"];
                  const i = order.indexOf(settings.mode);
                  updateSettings({ mode: order[(i + 1) % order.length] });
                }}
              />
            </motion.div>
          )}
        </AnimatePresence>
      )}

      {/* ============ CHAPTER MENU ============ */}
      <AnimatePresence>
        {showChapters && (
          <VNChapterMenu
            book={book}
            currentChapterIdx={chapterIdx}
            onClose={() => setShowChapters(false)}
            onSelect={(idx) => goChapter(idx)}
          />
        )}
      </AnimatePresence>

      {/* ============ SETTINGS PANEL ============ */}
      <AnimatePresence>
        {showSettings && (
          <VNSettingsPanel
            settings={settings}
            onUpdate={updateSettings}
            onClose={() => setShowSettings(false)}
          />
        )}
      </AnimatePresence>

      {/* ============ SAVE / LOAD ============ */}
      <AnimatePresence>
        {showSaveLoad && (
          <VNSaveLoadDialog
            mode={showSaveLoad}
            bookId={book.id}
            currentChapterId={chapter.id}
            currentSegmentIndex={segIdx}
            onClose={() => setShowSaveLoad(null)}
            onLoad={(cId, idx) => {
              const cIdx = book.chapters.findIndex((c) => c.id === cId);
              if (cIdx >= 0) {
                setChapterIdx(cIdx);
                setSegIdx(idx);
              }
              setShowSaveLoad(null);
            }}
          />
        )}
      </AnimatePresence>

      {/* ============ BACKLOG ============ */}
      <AnimatePresence>
        {showBacklog && (
          <BacklogDialog
            entries={backlog}
            onClose={() => setShowBacklog(false)}
            onJump={(idx) => {
              setSegIdx(idx);
              setShowBacklog(false);
            }}
          />
        )}
      </AnimatePresence>

      {/* ============ STATS DIALOG ============ */}
      <AnimatePresence>
        {showStats && (
          <VNStatsDialog
            book={book}
            chapterIdx={chapterIdx}
            segmentIdx={segIdx}
            onClose={() => setShowStats(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

/* =================================================================== */
/* ADV MODE — translucent bottom textbox, name plate, big stage above  */
/* =================================================================== */

interface StageProps {
  segment?: VNSegment;
  displayedText: string;
  isTyping: boolean;
  showSpeaker: boolean;
  fontScale: number;
  theme: VNTheme;
  onAdvance: () => void;
  isLast: boolean;
}

function ADVStage({
  segment,
  displayedText,
  isTyping,
  showSpeaker,
  fontScale,
  theme,
  onAdvance,
  isLast,
}: StageProps) {
  return (
    <div className="absolute inset-0 flex flex-col justify-end pb-24">
      {/* Background "scene" area */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center opacity-30 select-none">
          <BookOpen
            className={cn(
              "w-32 h-32 mx-auto mb-4",
              theme === "night" ? "text-purple-300" : "text-rose-400"
            )}
          />
        </div>
      </div>

      {/* Textbox — bottom ~1/4 of screen, translucent */}
      <div
        className="vn-textbox-adv relative mx-auto w-[94%] max-w-5xl rounded-t-2xl px-8 pt-6 pb-8 vn-slide-up"
        data-no-advance
        style={{ minHeight: 180 }}
      >
        {/* Name plate */}
        {showSpeaker && segment?.speaker && (
          <div className="vn-nameplate absolute -top-4 left-6 px-4 py-1 rounded-md text-sm">
            {segment.speaker}
          </div>
        )}
        {showSpeaker && segment?.narrator && !segment.speaker && (
          <div className="vn-narrator-plate absolute -top-4 left-6 px-4 py-1 rounded-md text-xs">
            — narration —
          </div>
        )}

        {/* Text body */}
        <div
          className={cn(
            "leading-relaxed whitespace-pre-wrap",
            isTyping ? "" : "vn-caret"
          )}
          style={{
            fontSize: `calc(1.125rem * ${fontScale})`,
            lineHeight: 1.85,
            fontFamily: "var(--font-jp), var(--font-geist-sans), sans-serif",
            minHeight: "4em",
            maxWidth: "85%", // ~1/3 empty space per article
          }}
        >
          {displayedText || "…"}
        </div>

        {/* Click hint */}
        {!isLast && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onAdvance();
            }}
            className="absolute bottom-3 right-4 text-xs opacity-60 hover:opacity-100 transition-opacity flex items-center gap-1"
          >
            click / space
            <ChevronRight className="w-3 h-3" />
          </button>
        )}
        {isLast && (
          <div className="absolute bottom-3 right-4 text-xs opacity-70 flex items-center gap-1">
            <Sparkles className="w-3 h-3" />
            end of book
          </div>
        )}
      </div>
    </div>
  );
}

/* =================================================================== */
/* NVL MODE — large translucent panel, multiple paragraphs visible     */
/* =================================================================== */

interface NVLStageProps extends StageProps {
  chapter: VNBook["chapters"][number];
  segIdx: number;
}

function NVLStage({
  chapter,
  segIdx,
  displayedText,
  isTyping,
  showSpeaker,
  fontScale,
  theme,
  onAdvance,
  isLast,
}: NVLStageProps) {
  // Show all past segments + current typewriter text, like a flowing paragraph.
  const pastSegments = chapter.segments.slice(0, segIdx);
  const currentSegment = chapter.segments[segIdx];

  return (
    <div className="absolute inset-0 flex items-center justify-center p-6 md:p-12">
      <div
        className="vn-textbox-nvl relative w-full max-w-4xl max-h-[78vh] rounded-2xl px-8 md:px-12 py-8 overflow-y-auto vn-scroll vn-fade-in"
        data-no-advance
      >
        {/* Speaker tags inline */}
        {pastSegments.map((s, i) => (
          <NVLLine key={i} seg={s} showSpeaker={showSpeaker} />
        ))}

        {/* Current typing line */}
        {currentSegment && (
          <NVLLine
            seg={{ ...currentSegment, text: displayedText }}
            showSpeaker={showSpeaker}
            typing={!isLast && !isTyping ? false : isTyping}
            isCurrent
            isLast={isLast}
            onAdvance={onAdvance}
          />
        )}
      </div>
    </div>
  );
}

function NVLLine({
  seg,
  showSpeaker,
  typing,
  isCurrent,
  isLast,
  onAdvance,
}: {
  seg: VNSegment;
  showSpeaker: boolean;
  typing?: boolean;
  isCurrent?: boolean;
  isLast?: boolean;
  onAdvance?: () => void;
}) {
  return (
    <div
      className={cn(
        "mb-3 last:mb-0",
        isCurrent ? "vn-fade-in" : "opacity-90"
      )}
    >
      {showSpeaker && seg.speaker && (
        <span
          className="inline-block vn-nameplate px-2 py-0.5 rounded text-xs mr-2 align-middle"
          style={{ verticalAlign: "middle" }}
        >
          {seg.speaker}
        </span>
      )}
      <span
        className={cn(
          "whitespace-pre-wrap inline",
          isCurrent && !isLast ? (typing ? "" : "vn-caret") : ""
        )}
        style={{
          fontSize: "1rem",
          lineHeight: 1.9,
          fontFamily: "var(--font-jp), var(--font-geist-sans), sans-serif",
        }}
      >
        {seg.text}
      </span>
      {isCurrent && isLast && (
        <span className="ml-3 text-xs opacity-70 inline-flex items-center gap-1">
          <Sparkles className="w-3 h-3" /> end of book
        </span>
      )}
    </div>
  );
}

/* =================================================================== */
/* FRAME MODE — full-frame UI with side buttons (Girlfriend Sim style) */
/* =================================================================== */

interface FrameStageProps extends StageProps {
  bookTitle: string;
  chapterTitle: string;
  chapterIdx: number;
  totalChapters: number;
  autoMode: boolean;
  skipMode: boolean;
  onToggleAuto: () => void;
  onToggleSkip: () => void;
  onSave: () => void;
  onOpenChapters: () => void;
  onOpenSettings: () => void;
  onOpenSaveLoad: (m: "save" | "load") => void;
  onOpenStats: () => void;
  onPrev: () => void;
  onNext: () => void;
  showToolbar: boolean;
  onExit: () => void;
}

function FrameStage(props: FrameStageProps) {
  const {
    segment,
    displayedText,
    isTyping,
    showSpeaker,
    fontScale,
    theme,
    onAdvance,
    isLast,
    bookTitle,
    chapterTitle,
    chapterIdx,
    totalChapters,
    autoMode,
    skipMode,
    onToggleAuto,
    onToggleSkip,
    onSave,
    onOpenChapters,
    onOpenSettings,
    onOpenSaveLoad,
    onOpenStats,
    onPrev,
    onNext,
    showToolbar,
    onExit,
  } = props;

  return (
    <div className="absolute inset-0 flex items-center justify-center p-4 md:p-6">
      <div className="vn-frame relative w-full max-w-6xl h-[88vh] rounded-2xl flex flex-col overflow-hidden vn-fade-in">
        {/* Header bar */}
        <div className="flex items-center justify-between px-6 py-3 border-b border-pink-200/20">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onExit();
            }}
            className="vn-btn px-3 py-1 rounded text-xs flex items-center gap-1"
          >
            <ChevronLeft className="w-3 h-3" /> Library
          </button>
          <div className="text-center">
            <div className="text-[10px] uppercase tracking-widest opacity-50">{bookTitle}</div>
            <div className="text-sm font-medium">{chapterTitle}</div>
          </div>
          <div className="text-[10px] opacity-50">{chapterIdx + 1}/{totalChapters}</div>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Left sidebar — large clear buttons */}
          {showToolbar && (
            <div className="w-32 md:w-40 border-r border-pink-200/20 flex flex-col p-3 gap-2">
              <FrameButton icon={<ChevronLeft className="w-4 h-4" />} label="Prev" onClick={onPrev} />
              <FrameButton icon={<ChevronRight className="w-4 h-4" />} label="Next" onClick={onNext} />
              <div className="my-1 border-t border-pink-200/15" />
              <FrameButton
                icon={autoMode ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                label={autoMode ? "Auto" : "Auto"}
                onClick={onToggleAuto}
                active={autoMode}
              />
              <FrameButton
                icon={<FastForward className="w-4 h-4" />}
                label="Skip"
                onClick={onToggleSkip}
                active={skipMode}
              />
              <FrameButton icon={<Bookmark className="w-4 h-4" />} label="Save" onClick={() => onOpenSaveLoad("save")} />
              <FrameButton icon={<BookOpen className="w-4 h-4" />} label="Load" onClick={() => onOpenSaveLoad("load")} />
              <FrameButton icon={<List className="w-4 h-4" />} label="Chapters" onClick={onOpenChapters} />
              <FrameButton icon={<BarChart3 className="w-4 h-4" />} label="Stats" onClick={onOpenStats} />
              <FrameButton icon={<SettingsIcon className="w-4 h-4" />} label="Settings" onClick={onOpenSettings} />
            </div>
          )}

          {/* Main content area */}
          <div className="flex-1 flex flex-col">
            {/* Scene area */}
            <div className="flex-1 flex items-center justify-center p-8 relative">
              <Eye
                className={cn(
                  "w-40 h-40 opacity-10",
                  theme === "night" ? "text-purple-200" : "text-rose-300"
                )}
              />
              {/* Unease meter example — like Girlfriend Simulator article */}
              <div className="absolute top-4 left-4 text-[10px] uppercase tracking-widest opacity-50">
                <div>chapter progress</div>
                <div className="w-32 h-1 bg-white/10 mt-1 rounded">
                  <div
                    className="h-full bg-rose-400/70 rounded transition-all"
                    style={{ width: `${props.chapterIdx / Math.max(1, totalChapters - 1) * 100}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Textbox */}
            <div className="px-8 pb-6 pt-3 border-t border-pink-200/20" data-no-advance>
              {showSpeaker && segment?.speaker && (
                <div className="vn-nameplate inline-block px-3 py-0.5 rounded text-xs mb-2">
                  {segment.speaker}
                </div>
              )}
              {showSpeaker && segment?.narrator && !segment.speaker && (
                <div className="vn-narrator-plate inline-block px-3 py-0.5 rounded text-xs mb-2">
                  — narration —
                </div>
              )}
              <div
                className={cn(
                  "whitespace-pre-wrap leading-relaxed",
                  isTyping ? "" : "vn-caret"
                )}
                style={{
                  fontSize: `calc(1.05rem * ${fontScale})`,
                  lineHeight: 1.8,
                  fontFamily: "var(--font-jp), var(--font-geist-sans), sans-serif",
                  minHeight: "3em",
                }}
              >
                {displayedText || "…"}
              </div>
              {!isLast && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onAdvance();
                  }}
                  className="mt-2 text-xs opacity-60 hover:opacity-100 flex items-center gap-1"
                >
                  click / space to continue
                  <ChevronRight className="w-3 h-3" />
                </button>
              )}
              {isLast && (
                <div className="mt-2 text-xs opacity-70 flex items-center gap-1">
                  <Sparkles className="w-3 h-3" /> end of book
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function FrameButton({
  icon,
  label,
  onClick,
  active,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  active?: boolean;
}) {
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={cn(
        "vn-btn flex flex-col items-center justify-center gap-1 py-2 px-1 rounded text-[11px]",
        active && "vn-btn active"
      )}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

/* =================================================================== */
/* Backlog dialog                                                      */
/* =================================================================== */

function BacklogDialog({
  entries,
  onClose,
  onJump,
}: {
  entries: { idx: number; seg: VNSegment }[];
  onClose: () => void;
  onJump: (idx: number) => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 z-50 bg-black/60 flex items-center justify-center p-6"
      data-no-advance
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 30, opacity: 0 }}
        className="vn-panel rounded-2xl max-w-3xl w-full max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <h3 className="font-semibold flex items-center gap-2">
            <BookOpen className="w-4 h-4" /> Backlog
          </h3>
          <button
            onClick={onClose}
            className="vn-btn p-1.5 rounded-md"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto vn-scroll px-6 py-4 space-y-3">
          {entries.length === 0 && (
            <div className="text-center opacity-50 py-8">Nothing in the backlog yet.</div>
          )}
          {entries.map(({ idx, seg }) => (
            <div
              key={idx}
              className="hover:bg-white/5 rounded-lg p-3 cursor-pointer transition-colors"
              onClick={() => onJump(idx)}
            >
              <div className="flex items-baseline gap-2">
                <span className="text-xs opacity-50 shrink-0">#{idx + 1}</span>
                {seg.speaker && (
                  <span className="vn-nameplate px-2 py-0.5 rounded text-xs">{seg.speaker}</span>
                )}
              </div>
              <p className="mt-1 text-sm leading-relaxed whitespace-pre-wrap">{seg.text}</p>
            </div>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}

/* =================================================================== */
/* Sakura petals ambient animation                                     */
/* =================================================================== */

function SakuraPetals() {
  // 14 petals with randomized params (stable across renders)
  const petals = useMemo(
    () =>
      Array.from({ length: 14 }).map((_, i) => ({
        id: i,
        left: `${Math.random() * 100}%`,
        delay: `${Math.random() * 12}s`,
        duration: `${10 + Math.random() * 14}s`,
        size: `${10 + Math.random() * 14}px`,
        char: Math.random() > 0.5 ? "❀" : "✿",
        opacity: 0.3 + Math.random() * 0.5,
      })),
    []
  );

  return (
    <div className="absolute inset-0 pointer-events-none z-0" aria-hidden>
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
