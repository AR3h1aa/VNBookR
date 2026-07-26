---
Task ID: vn-app-1
Agent: main
Task: Build a Japanese-style Visual Novel web app that imports PDF/TXT/Word/EPUB books and renders them as visual novels, with three UI modes (ADV / NVL / Frame) inspired by "The Magic of Buttons" article.

Work Log:
- Initialized fullstack dev environment (Next.js 16 + TS + Tailwind 4 + shadcn/ui).
- Installed pdfjs-dist, mammoth, epubjs, framer-motion.
- Built `src/lib/vn-parser.ts` — unified parser for TXT/DOCX/PDF/EPUB with chapter detection (regex for EN/JA/CN headings + font-size heuristic for PDF) and segment splitting (paragraph + sentence boundaries + speaker detection).
- Built `src/lib/vn-store.ts` — Zustand store (persisted) for books, save slots, and settings (mode/theme/textSpeed/autoDelay/fontScale/showSpeaker/autoHideToolbar).
- Built `src/app/globals.css` — Japanese visual theme: sakura/night/paper/ocean backgrounds, translucent ADV textbox, NVL panel, Frame UI, name plate, narrator plate, footer buttons, typewriter caret, falling sakura petals animation.
- Updated `src/app/layout.tsx` — added Noto Sans JP + Shippori Mincho fonts.
- Built `src/components/vn/VNReader.tsx` — main reader with three rendering modes (ADVStage, NVLStage, FrameStage), typewriter effect, click-to-advance, auto/skip modes, keyboard shortcuts, chapter transitions, backlog dialog.
- Built `src/components/vn/VNToolbar.tsx` — small unobtrusive bottom toolbar (Prev/Next/Auto/Skip/Log/Save/Load/Chapters/Config/UI cycle).
- Built `src/components/vn/VNSettingsPanel.tsx` — full settings dialog with UI mode, theme, text speed, font size, auto delay, display toggles, keyboard shortcuts.
- Built `src/components/vn/VNChapterMenu.tsx` — chapter list dialog.
- Built `src/components/vn/VNSaveLoadDialog.tsx` — quick-save + save/load slots.
- Built `src/components/vn/Library.tsx` — entry screen with drag-drop import, book grid with cover gradients, preview modal, removal.
- Wired everything in `src/app/page.tsx` with proper hydration guard.
- Fixed ESLint errors (react-hooks/set-state-in-effect) using block-form disable comments.
- Fixed auto-hide toolbar so Frame mode keeps its sidebar visible (per article: Frame UI is by design always visible).
- Verified end-to-end with Agent Browser:
  - TXT import: 4-chapter sample book parsed correctly with 27 total segments.
  - PDF import: 2-chapter sample parsed with heading detection via font-size heuristic.
  - ADV mode: translucent bottom textbox, narration plate, typewriter, click-to-advance.
  - NVL mode: full-screen translucent panel showing accumulated segments.
  - Frame mode: bordered frame with left sidebar (Library/Prev/Next/Auto/Skip/Save/Load/Chapters/Settings), header bar, scene area with eye icon, textbox at bottom — matches Girlfriend Simulator description from the article.
  - Chapter menu: shows all chapters with segment counts, click to jump.
  - Settings: UI mode / theme / text speed / font size / auto delay / toggles all working.
  - Save/Load: quick-save creates a slot, library card shows "Continue" instead of "Read".
  - Night theme + Frame mode combination verified.
  - `bun run lint` passes cleanly.

Stage Summary:
- App name: 桜ノベル (Sakura Novels).
- Three UI modes implemented per the article:
  1. ADV — translucent bottom textbox (~1/4 of screen), name plate, small footer buttons (Yuzusoft / Sabbat of the Witch style).
  2. NVL — large translucent panel covering most of screen, accumulated text visible (no buttons visible — opens via pause menu as article describes for NVL).
  3. Frame — full-frame UI with left sidebar of large clear buttons, header bar, "chapter progress" meter in scene area (mirrors Girlfriend Simulator description).
- Four visual themes: Sakura (pink petals), Night (deep purple/blue), Paper (warm cream), Ocean (soft blue).
- File formats supported: TXT, PDF (font-size heading detection), DOCX (heading styles), EPUB (spine items).
- Persistence: books + saves + settings all in localStorage via Zustand persist middleware.
- Keyboard shortcuts: Space/→/Enter to advance, ← for prev, A for auto, S for skip, L for backlog, Esc to exit.
- Sample test files: `/home/z/my-project/scripts/sample-book.txt` and `/home/z/my-project/scripts/sample.pdf`.
- Final lint passes; dev server running on port 3000.

---
Task ID: vn-app-2
Agent: main
Task: Add animejs-powered animated gradient background, reading time tracking, book completion percentage, and stats dialog.

Work Log:
- Installed animejs@4.5.0 + @types/animejs.
- Created `src/components/vn/GradientBackground.tsx` — generic animated gradient background using animejs `animate()` API with 5 drifting color blobs per theme (sakura/night/paper/ocean). Removed unused `createTimeline` import (doesn't exist in animejs v4).
- Extended `src/lib/vn-store.ts` with VNBookStats interface (timeSpentMs, highestChapterIdx, highestSegmentIdx, lastReadAt, wordsRead) + actions (addReadingTime, recordProgress, getStats, resetStats). Bumped persist version to 2. Added helpers `formatDuration`, `computeBookProgress`, `totalSegments`.
- Created `src/components/vn/VNStatsBar.tsx` — compact horizontal stats strip (time · % · segments) for the reader header, plus a full 4-tile grid variant.
- Created `src/components/vn/VNStatsDialog.tsx` — full stats modal with progress ring (SVG + framer-motion), 4 stat tiles, per-chapter breakdown bars, ETA calculation, reset button.
- Updated `src/components/vn/VNReader.tsx`:
  - Added GradientBackground layer (always rendered, theme-aware)
  - Added compact VNStatsBar in the top header (right side)
  - Replaced chapter-only progress bar with whole-book percentage progress bar
  - Added reading-time tracker (1s tick, only counts when page visible, capped at 5s/tick to avoid sleep jumps)
  - Added cumulative words-read tracker (recomputed on every chapter/segment change)
  - Wired onOpenStats prop to Frame stage + ADV/NVL toolbar
  - Added Stats dialog render + Esc-to-close
- Updated `src/components/vn/VNToolbar.tsx` — added Stats button (BarChart3 icon) between Chapters and Config.
- Updated `src/components/vn/Library.tsx`:
  - Added GradientBackground layer
  - Added AggregateStats component (4 tiles: Books, Total Reading Time, Words Read, Books Finished)
  - Updated BookCard to show progress % badge on cover, reading time + words read row, "Continue · X%" button label, progress bar at bottom of cover
- Fixed bug: `segIdx` → `segmentIdx` in VNStatsDialog chapter breakdown (was causing ReferenceError on open).
- Fixed bug: `useVNStore((s) => s.getStats(book.id))` returns a new object each render → changed to `useVNStore((s) => s.stats[book.id])` with fallback defaults in both VNStatsBar and VNStatsDialog.
- Fixed bug: motion.circle with `transform` string attribute conflicted with framer-motion → wrapped in `<g transform="...">` instead.
- Verified end-to-end with Agent Browser:
  - Library shows aggregate stats (Books: 1, Total Reading Time, Words Read, Books Finished: 0/1)
  - Book cards show "19% read" badge + "Continue · 19%" button
  - Reader header shows live stats: `3m 12s · 7% · 2/27`
  - Stats dialog opens with progress ring, 4 stat tiles, per-chapter breakdown, ETA "≈ 18m 36s remaining"
  - Reading speed calculated: 28 wpm
  - Time accumulates across sessions (persisted in localStorage)
- `bun run lint` passes cleanly.

Stage Summary:
- animejs integration: 5 animated gradient blobs per theme, drifting/scaling/rotating on infinite loops.
- Stats tracking: time spent (ms), words read (cumulative), highest chapter/segment reached, last read timestamp.
- Stats display: compact bar in reader header, full dialog with progress ring + chapter breakdown, aggregate panel in library.
- All stats persisted in localStorage via Zustand persist (version 2).
