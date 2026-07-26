"use client";

import { motion } from "framer-motion";
import { X, Save, BookOpen, Trash2 } from "lucide-react";
import { useVNStore } from "@/lib/vn-store";
import { cn } from "@/lib/utils";

interface VNSaveLoadDialogProps {
  mode: "save" | "load";
  bookId: string;
  currentChapterId: string;
  currentSegmentIndex: number;
  onClose: () => void;
  onLoad: (chapterId: string, segmentIndex: number) => void;
}

export function VNSaveLoadDialog({
  mode,
  bookId,
  currentChapterId,
  currentSegmentIndex,
  onClose,
  onLoad,
}: VNSaveLoadDialogProps) {
  const { saves, saveProgress, deleteSave } = useVNStore();

  // For "save" mode, only show this book's saves (you'd replace the matching chapter save).
  // For "load" mode, show all saves.
  const relevantSaves = mode === "save"
    ? saves.filter((s) => s.bookId === bookId)
    : saves;

  const handleQuickSave = () => {
    saveProgress({
      id: `${bookId}-${currentChapterId}-${currentSegmentIndex}-${Date.now()}`,
      bookId,
      bookTitle: saves.find((s) => s.bookId === bookId)?.bookTitle || "",
      chapterId: currentChapterId,
      chapterTitle: "",
      segmentIndex: currentSegmentIndex,
      savedAt: Date.now(),
    });
    onClose();
  };

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
        className="vn-panel rounded-2xl max-w-3xl w-full max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <h3 className="font-semibold flex items-center gap-2">
            {mode === "save" ? (
              <>
                <Save className="w-4 h-4" /> Save
              </>
            ) : (
              <>
                <BookOpen className="w-4 h-4" /> Load
              </>
            )}
          </h3>
          <button onClick={onClose} className="vn-btn p-1.5 rounded-md">
            <X className="w-4 h-4" />
          </button>
        </div>

        {mode === "save" && (
          <div className="px-6 py-3 border-b border-white/10">
            <button
              onClick={handleQuickSave}
              className="vn-btn active w-full py-2.5 rounded-lg text-sm font-medium"
            >
              ＋ Quick-save current position
            </button>
          </div>
        )}

        <div className="flex-1 overflow-y-auto vn-scroll p-4">
          {relevantSaves.length === 0 ? (
            <div className="text-center opacity-50 py-12">
              {mode === "save"
                ? "No saves yet. Use the button above to create one."
                : "No saved games. Read for a while and save your progress!"}
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 gap-3">
              {relevantSaves.map((s) => (
                <div
                  key={s.id}
                  className="bg-white/5 hover:bg-white/10 rounded-lg p-3 transition-colors group"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="text-xs opacity-50">{s.bookTitle}</div>
                      <div
                        className="text-sm font-medium truncate mt-0.5"
                        style={{ fontFamily: "var(--font-jp-serif), serif" }}
                      >
                        {s.chapterTitle || "—"}
                      </div>
                      {s.thumbnail && (
                        <p className="text-xs opacity-60 mt-1 line-clamp-2 italic">
                          “{s.thumbnail}”
                        </p>
                      )}
                      <div className="text-[10px] opacity-50 mt-1.5">
                        {new Date(s.savedAt).toLocaleString()}
                      </div>
                    </div>
                    <button
                      onClick={() => deleteSave(s.id)}
                      className="vn-btn p-1.5 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Delete save"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                  {mode === "load" && (
                    <button
                      onClick={() => onLoad(s.chapterId, s.segmentIndex)}
                      className="vn-btn w-full mt-3 py-1.5 rounded text-xs"
                    >
                      Load
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
