"use client";

import { Clock, TrendingUp, BookOpen, Type } from "lucide-react";
import { motion } from "framer-motion";
import type { VNBook } from "@/lib/vn-parser";
import {
  useVNStore,
  formatDuration,
  computeBookProgress,
  totalSegments,
} from "@/lib/vn-store";
import { cn } from "@/lib/utils";

interface VNStatsBarProps {
  book: VNBook;
  chapterIdx: number;
  segmentIdx: number;
  /** Compact mode for in-reader display (horizontal, smaller). */
  compact?: boolean;
  className?: string;
}

/**
 * Compact stats strip shown above the VN stage.
 * Shows: reading time, % complete, words read, current chapter.
 */
export function VNStatsBar({
  book,
  chapterIdx,
  segmentIdx,
  compact,
  className,
}: VNStatsBarProps) {
  const stats = useVNStore((s) => s.stats[book.id]) || {
    timeSpentMs: 0,
    highestChapterIdx: 0,
    highestSegmentIdx: 0,
    lastReadAt: 0,
    wordsRead: 0,
  };
  const progress = computeBookProgress(book, chapterIdx, segmentIdx);
  const total = totalSegments(book);

  let seen = 0;
  for (let i = 0; i < chapterIdx; i++) {
    seen += book.chapters[i].segments.length;
  }
  seen += Math.min(segmentIdx + 1, book.chapters[chapterIdx]?.segments.length || 0);

  if (compact) {
    return (
      <div
        className={cn(
          "flex items-center gap-3 text-[11px] opacity-80 pointer-events-auto",
          className
        )}
        data-no-advance
      >
        <span className="flex items-center gap-1" title="Time spent reading this book">
          <Clock className="w-3 h-3" />
          {formatDuration(stats.timeSpentMs)}
        </span>
        <span className="opacity-40">·</span>
        <span className="flex items-center gap-1" title="Book completion percentage">
          <TrendingUp className="w-3 h-3" />
          {progress}%
        </span>
        <span className="opacity-40">·</span>
        <span className="flex items-center gap-1" title="Segments read">
          <BookOpen className="w-3 h-3" />
          {seen}/{total}
        </span>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "grid grid-cols-2 md:grid-cols-4 gap-3",
        className
      )}
      data-no-advance
    >
      <StatCard
        icon={<Clock className="w-4 h-4" />}
        label="Reading Time"
        value={formatDuration(stats.timeSpentMs)}
        accent="from-rose-400 to-pink-500"
      />
      <StatCard
        icon={<TrendingUp className="w-4 h-4" />}
        label="Book Progress"
        value={`${progress}%`}
        accent="from-violet-400 to-purple-500"
        progress={progress}
      />
      <StatCard
        icon={<BookOpen className="w-4 h-4" />}
        label="Segments"
        value={`${seen} / ${total}`}
        accent="from-cyan-400 to-blue-500"
      />
      <StatCard
        icon={<Type className="w-4 h-4" />}
        label="Words Read"
        value={stats.wordsRead.toLocaleString()}
        accent="from-amber-400 to-orange-500"
      />
    </motion.div>
  );
}

function StatCard({
  icon,
  label,
  value,
  accent,
  progress,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  accent: string;
  progress?: number;
}) {
  return (
    <div className="vn-panel rounded-xl p-4 relative overflow-hidden">
      <div
        className={cn(
          "absolute top-0 left-0 w-1 h-full bg-gradient-to-b opacity-70",
          accent
        )}
      />
      <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest opacity-60 mb-1">
        {icon}
        {label}
      </div>
      <div className="text-lg font-semibold tabular-nums">{value}</div>
      {typeof progress === "number" && (
        <div className="mt-2 h-1 rounded-full bg-white/10 overflow-hidden">
          <motion.div
            className={cn("h-full bg-gradient-to-r rounded-full", accent)}
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          />
        </div>
      )}
    </div>
  );
}
