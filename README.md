# 桜ノベル — VNBookR

A Japanese-style Visual Novel reader that imports PDF / TXT / DOCX / EPUB books and renders them as immersive visual novels, with three UI modes (ADV / NVL / Frame) inspired by "The Magic of Buttons" article.

## Features

- **File Import**: PDF, TXT, DOCX, EPUB with automatic chapter detection
- **Three UI Modes**:
  - **ADV** — translucent bottom textbox, name plate, small footer buttons (Yuzusoft-style)
  - **NVL** — large translucent panel, accumulated text, auto-hiding toolbar
  - **Frame** — full-frame bordered UI with side buttons (Girlfriend Simulator-style)
- **Four Themes**: Sakura (pink petals), Night (deep purple), Paper (warm cream), Ocean (soft blue)
- **Animated Gradient Background** (animejs-powered) — 5 drifting color blobs per theme
- **Reading Statistics**:
  - Time spent reading per book (live tracker, persisted)
  - Book completion percentage (with progress ring)
  - Words read (cumulative)
  - Reading speed (words per minute)
  - ETA to finish
  - Per-chapter breakdown with progress bars
  - Aggregate stats panel in library (total books, total time, total words, books finished)
- **Reader Controls**: typewriter text, click/space to advance, auto mode, skip mode, backlog
- **Persistence**: books, saves, settings, and stats all stored in localStorage via Zustand persist
- **Keyboard Shortcuts**: Space/→/Enter (advance), ← (prev), A (auto), S (skip), L (backlog), Esc (exit)

## Setup

```bash
# Install dependencies
bun install

# Run dev server
bun run dev

# Open http://localhost:3000
```

## Tech Stack

- Next.js 16 (App Router) + TypeScript
- Tailwind CSS 4 + shadcn/ui
- Zustand (persisted state)
- Framer Motion (transitions)
- **animejs 4.5** (animated gradient background)
- pdfjs-dist (PDF parsing)
- mammoth (DOCX parsing)
- epubjs (EPUB parsing)
- Noto Sans JP + Shippori Mincho (Japanese typography)

## File Structure

```
src/
├── app/
│   ├── page.tsx           # Entry: switches between Library and Reader
│   ├── layout.tsx         # Loads Japanese fonts
│   └── globals.css        # VN-specific styles (textbox, nameplate, frame, petals)
├── lib/
│   ├── vn-parser.ts       # Unified parser for TXT/PDF/DOCX/EPUB
│   └── vn-store.ts        # Zustand persisted store (books/saves/settings/stats)
└── components/vn/
    ├── Library.tsx              # Library screen with drag-drop import + aggregate stats
    ├── VNReader.tsx             # Main reader with all 3 modes + stats tracking
    ├── VNToolbar.tsx            # Bottom toolbar (ADV/NVL) with Stats button
    ├── VNSettingsPanel.tsx      # Settings dialog
    ├── VNChapterMenu.tsx        # Chapter list dialog
    ├── VNSaveLoadDialog.tsx     # Save/load slots
    ├── VNStatsBar.tsx           # Compact stats strip (reader header)
    ├── VNStatsDialog.tsx        # Full stats dialog with progress ring
    └── GradientBackground.tsx   # animejs animated gradient background
```

## How to Use

1. Open the app — you'll see the sakura-themed library with animated gradient background
2. Drag-drop a PDF/TXT/DOCX/EPUB file (or click to browse)
3. The parser auto-detects chapters via heading patterns (EN/JA/CN) or font-size for PDFs
4. Click "Read" to start, or "View chapters" to jump to a specific chapter
5. Inside the reader, the top-right shows live stats: `3m 12s · 7% · 2/27` (time · % · segments)
6. Use the bottom toolbar:
   - **UI button** — cycle ADV → NVL → Frame modes
   - **Config** — change theme, text speed, font size, etc.
   - **Save/Load** — quick-save your progress
   - **Chapters** — jump between chapters
   - **Stats** — open full stats dialog with progress ring + chapter breakdown
   - **Log** — view text backlog
7. Click anywhere on the stage or press Space to advance text

## Reading Stats

The app tracks your reading automatically:
- **Time** accumulates while the reader is open and the page is visible (1s tick, capped at 5s per tick to avoid sleep jumps)
- **Words read** is computed from the segments you've advanced past
- **Progress %** is based on segments seen vs total segments in the book
- **Reading speed** (wpm) is calculated from time + words
- **ETA** estimates time to finish based on your current speed
- All stats persist across sessions in localStorage

Open the **Stats** dialog from the toolbar to see:
- Big progress ring with current completion %
- 4 stat tiles: Time Reading, Words Read, Reading Speed, Last Read
- Per-chapter breakdown with individual progress bars
- Reset Stats button (per book)

## Sample Files

Two sample files are included in `scripts/`:
- `sample-book.txt` — 4-chapter short story (27 segments, ~600 words)
- `sample.pdf` — 2-chapter test PDF

Import either one to see the parser in action.
