"use client";

import { motion } from "framer-motion";
import { X, BarChart3, Clock, TrendingUp, BookOpen, Type, RotateCcw } from "lucide-react";
import type { VNBook } from "@/lib/vn-parser";
import {
  useVNStore,
  formatDuration,
  computeBookProgress,
  totalSegments,
} from "@/lib/vn-store";
import { cn } from "@/lib/utils";

interface VNStatsDialogProps {
  book: VNBook;
  chapterIdx: number;
  segmentIdx: number;
  onClose: () => void;
}

export function VNStatsDialog({ book, chapterIdx, segmentIdx, onClose }: VNStatsDialogProps) {
  const stats = useVNStore((s) => s.stats[book.id]) || {
    timeSpentMs: 0,
    highestChapterIdx: 0,
    highestSegmentIdx: 0,
    lastReadAt: 0,
    wordsRead: 0,
  };
  const resetStats = useVNStore((s) => s.resetStats);
  const progress = computeBookProgress(book, chapterIdx, segmentIdx);
  const total = totalSegments(book);

  let seen = 0;
  for (let i = 0; i < chapterIdx; i++) {
    seen += book.chapters[i].segments.length;
  }
  seen += Math.min(segmentIdx + 1, book.chapters[chapterIdx]?.segments.length || 0);

  // Average reading speed (words per minute).
  const minutes = stats.timeSpentMs / 60000;
  const wpm = minutes > 0.05 ? Math.round(stats.wordsRead / minutes) : 0;

  // Estimated time to finish (based on current WPM).
  const totalWords = book.chapters
    .flatMap((c) => c.segments)
    .reduce((sum, s) => sum + s.text.trim().split(/\s+/).filter(Boolean).length, 0);
  const remainingWords = Math.max(0, totalWords - stats.wordsRead);
  const etaMs = wpm > 0 ? (remainingWords / wpm) * 60000 : 0;

  const lastRead = stats.lastReadAt
    ? new Date(stats.lastReadAt).toLocaleString()
    : "—";

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 z-50 bg-black/60 flex items-center justify-center p-6"
      onClick={onClose}
      data-no-advance
    >
      <motion.div
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 30, opacity: 0 }}
        className="vn-panel rounded-2xl max-w-3xl w-full max-h-[85vh] overflow-y-auto vn-scroll"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 sticky top-0 bg-[rgba(30,20,25,0.95)] backdrop-blur z-10">
          <h3 className="font-semibold flex items-center gap-2">
            <BarChart3 className="w-4 h-4" /> Reading Stats
            <span className="text-xs opacity-50 font-normal ml-2">— {book.title}</span>
          </h3>
          <button onClick={onClose} className="vn-btn p-1.5 rounded-md">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-5">
          {/* Headline metric: progress ring + % */}
          <div className="flex items-center gap-6 bg-white/5 rounded-xl p-5">
            <ProgressRing percent={progress} />
            <div className="flex-1">
              <div className="text-xs uppercase tracking-widest opacity-60">Book Completion</div>
              <div className="text-3xl font-bold mt-1">
                {progress}<span className="text-lg opacity-60">%</span>
              </div>
              <div className="text-xs opacity-60 mt-1">
                {seen} of {total} segments read
              </div>
              {etaMs > 0 && progress < 100 && (
                <div className="text-xs mt-3 text-rose-300">
                  ≈ {formatDuration(etaMs)} remaining at your pace
                </div>
              )}
              {progress >= 100 && (
                <div className="text-xs mt-3 text-emerald-300 flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" /> Book finished — well done!
                </div>
              )}
            </div>
          </div>

          {/* Stat grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatTile
              icon={<Clock className="w-4 h-4" />}
              label="Time Reading"
              value={formatDuration(stats.timeSpentMs)}
              accent="from-rose-400 to-pink-500"
            />
            <StatTile
              icon={<Type className="w-4 h-4" />}
              label="Words Read"
              value={stats.wordsRead.toLocaleString()}
              accent="from-amber-400 to-orange-500"
            />
            <StatTile
              icon={<BookOpen className="w-4 h-4" />}
              label="Reading Speed"
              value={wpm > 0 ? `${wpm} wpm` : "—"}
              accent="from-cyan-400 to-blue-500"
            />
            <StatTile
              icon={<TrendingUp className="w-4 h-4" />}
              label="Last Read"
              value={stats.lastReadAt ? new Date(stats.lastReadAt).toLocaleDateString() : "—"}
              accent="from-violet-400 to-purple-500"
            />
          </div>

          {/* Per-chapter breakdown */}
          <div>
            <h4 className="text-xs uppercase tracking-widest opacity-60 mb-3">
              Chapter Breakdown
            </h4>
            <div className="space-y-1.5">
              {book.chapters.map((ch, idx) => {
                const isPast = idx < chapterIdx;
                const isCurrent = idx === chapterIdx;
                const isFuture = idx > chapterIdx;
                const segCount = ch.segments.length;
                const currentSegInChap = isCurrent ? segmentIdx + 1 : isPast ? segCount : 0;
                const chapPct = Math.round((currentSegInChap / segCount) * 100);
                return (
                  <div
                    key={ch.id}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2 rounded-lg",
                      isCurrent ? "bg-rose-500/15" : "bg-white/5"
                    )}
                  >
                    <div
                      className={cn(
                        "shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-mono",
                        isPast
                          ? "bg-emerald-500/30 text-emerald-200"
                          : isCurrent
                            ? "vn-nameplate"
                            : "bg-white/10 text-white/40"
                      )}
                    >
                      {String(idx + 1).padStart(2, "0")}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm truncate" style={{ fontFamily: "var(--font-jp-serif), serif" }}>
                        {ch.title}
                      </div>
                      <div className="h-1 mt-1 bg-white/10 rounded-full overflow-hidden">
                        <div
                          className={cn(
                            "h-full rounded-full transition-all",
                            isPast
                              ? "bg-emerald-400"
                              : isCurrent
                                ? "bg-gradient-to-r from-rose-400 to-pink-500"
                                : "bg-transparent"
                          )}
                          style={{ width: `${chapPct}%` }}
                        />
                      </div>
                    </div>
                    <div className="text-[11px] tabular-nums opacity-60 w-16 text-right">
                      {currentSegInChap} / {segCount}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between pt-3 border-t border-white/10">
            <div className="text-xs opacity-50">
              Last activity: {lastRead}
            </div>
            <button
              onClick={() => {
                if (confirm("Reset all reading stats for this book? This cannot be undone.")) {
                  resetStats(book.id);
                }
              }}
              className="vn-btn px-3 py-1.5 rounded-md text-xs flex items-center gap-1.5"
            >
              <RotateCcw className="w-3 h-3" />
              Reset Stats
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

function ProgressRing({ percent }: { percent: number }) {
  const radius = 38;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percent / 100) * circumference;
  return (
    <svg width="96" height="96" viewBox="0 0 96 96" className="shrink-0">
      <defs>
        <linearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#f43f5e" />
          <stop offset="100%" stopColor="#a855f7" />
        </linearGradient>
      </defs>
      <circle
        cx="48"
        cy="48"
        r={radius}
        fill="none"
        stroke="rgba(255,255,255,0.1)"
        strokeWidth="6"
      />
      <g transform="rotate(-90 48 48)">
        <motion.circle
          cx="48"
          cy="48"
          r={radius}
          fill="none"
          stroke="url(#ringGrad)"
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        />
      </g>
      <text
        x="48"
        y="54"
        textAnchor="middle"
        className="fill-white font-bold"
        style={{ fontSize: "18px" }}
      >
        {percent}%
      </text>
    </svg>
  );
}

function StatTile({
  icon,
  label,
  value,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  accent: string;
}) {
  return (
    <div className="bg-white/5 rounded-xl p-3 relative overflow-hidden">
      <div
        className={cn(
          "absolute top-0 left-0 w-1 h-full bg-gradient-to-b opacity-70",
          accent
        )}
      />
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest opacity-60 mb-1">
        {icon}
        {label}
      </div>
      <div className="text-base font-semibold tabular-nums">{value}</div>
    </div>
  );
}
