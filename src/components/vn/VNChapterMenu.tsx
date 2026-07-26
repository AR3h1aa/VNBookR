"use client";

import { motion } from "framer-motion";
import { X, List, ChevronRight, Check } from "lucide-react";
import type { VNBook } from "@/lib/vn-parser";
import { cn } from "@/lib/utils";

interface VNChapterMenuProps {
  book: VNBook;
  currentChapterIdx: number;
  onClose: () => void;
  onSelect: (idx: number) => void;
}

export function VNChapterMenu({
  book,
  currentChapterIdx,
  onClose,
  onSelect,
}: VNChapterMenuProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 z-50 bg-black/60 flex items-center justify-center p-6"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 30, opacity: 0 }}
        className="vn-panel rounded-2xl max-w-2xl w-full max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <div>
            <h3 className="font-semibold flex items-center gap-2">
              <List className="w-4 h-4" /> Chapters
            </h3>
            <p className="text-xs opacity-60 mt-0.5">{book.title}</p>
          </div>
          <button onClick={onClose} className="vn-btn p-1.5 rounded-md">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto vn-scroll px-4 py-3">
          {book.chapters.map((ch, idx) => (
            <button
              key={ch.id}
              onClick={() => onSelect(idx)}
              className={cn(
                "w-full text-left px-4 py-3 rounded-lg flex items-center gap-3 hover:bg-white/5 transition-colors group",
                idx === currentChapterIdx && "bg-white/5"
              )}
            >
              <div
                className={cn(
                  "shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-mono",
                  idx === currentChapterIdx
                    ? "vn-nameplate"
                    : "bg-white/10 text-white/70"
                )}
              >
                {idx === currentChapterIdx ? (
                  <Check className="w-3.5 h-3.5" />
                ) : (
                  String(idx + 1).padStart(2, "0")
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div
                  className="text-sm font-medium truncate"
                  style={{ fontFamily: "var(--font-jp-serif), serif" }}
                >
                  {ch.title}
                </div>
                <div className="text-[11px] opacity-50">
                  {ch.segments.length} segments
                </div>
              </div>
              <ChevronRight className="w-4 h-4 opacity-30 group-hover:opacity-80 transition-opacity" />
            </button>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}
