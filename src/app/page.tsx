"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Library } from "@/components/vn/Library";
import { VNReader } from "@/components/vn/VNReader";
import { useVNStore } from "@/lib/vn-store";
import type { VNBook } from "@/lib/vn-parser";

interface ReaderState {
  book: VNBook;
  chapterId?: string;
  segmentIndex?: number;
}

export default function Home() {
  const getBook = useVNStore((s) => s.getBook);
  const [reader, setReader] = useState<ReaderState | null>(null);
  // Mount guard so the persisted zustand store has time to hydrate from
  // localStorage before we render anything data-driven. This avoids SSR/CSR
  // hydration mismatches.
  const [mounted, setMounted] = useState(false);
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    setMounted(true);
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  // Always look up the latest book from the store so updates (e.g. removals)
  // don't leave us with stale references.
  const currentBook = reader ? getBook(reader.book.id) : undefined;

  // If the book disappeared from the store, treat the reader as closed.
  // We don't call setReader(null) inside an effect — we just render the
  // library branch when activeReader is null.
  const activeReader = currentBook ? reader : null;

  if (!mounted) {
    return (
      <div className="vn-app vn-bg-sakura min-h-screen flex items-center justify-center">
        <div className="text-rose-500 text-sm opacity-70">Loading…</div>
      </div>
    );
  }

  return (
    <AnimatePresence mode="wait">
      {!activeReader ? (
        <motion.div
          key="library"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Library
            onOpen={(book, chapterId, segmentIndex) =>
              setReader({ book, chapterId, segmentIndex })
            }
          />
        </motion.div>
      ) : (
        <motion.div
          key="reader"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          <VNReader
            book={currentBook!}
            initialChapterId={activeReader.chapterId}
            initialSegmentIndex={activeReader.segmentIndex}
            onExit={() => setReader(null)}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
