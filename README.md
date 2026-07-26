<p align="center">
  <img src="public/logo.svg" alt="Sakura Novels logo" width="64" height="64">
</p>

# 桜ノベル — Sakura Novels

A Japanese-style Visual Novel reader that transforms your PDF, TXT, DOCX, and EPUB books into immersive visual novel experiences. Import any book and read it with typewriter text effects, click-to-advance mechanics, auto/skip modes, and three distinct UI layouts inspired by classic Japanese visual novel engines.

> *"An ideal UI will never draw attention to itself and become a natural extension of the player's engagement with the game."* — The Magic of Buttons

## Features

### Reading Modes

| Mode | Style | Description |
|---|---|---|
| **ADV** | Yuzusoft / Sabbat of the Witch | Translucent bottom textbox (~25% of screen), name plate for speakers, small footer buttons. Click or press Space to advance. |
| **NVL** | Classic NVL | Large translucent panel covering most of the screen. Text accumulates across segments. Toolbar auto-hides; access controls via pause menu. |
| **Frame** | Girlfriend Simulator | Full-frame bordered UI with a left sidebar of clear buttons, header bar, scene area, and textbox at bottom. Controls are always visible by design. |

### Core Features

- **Multi-format Import** — Drag-and-drop or browse to import PDF, TXT, DOCX, or EPUB files. The parser auto-detects chapters using heading patterns (English, Japanese, Chinese) and font-size heuristics for PDFs.
- **Typewriter Text** | Text appears character-by-character at configurable speed. Click or press Space/Enter/Right arrow to advance to the next segment.
- **Auto & Skip Modes** — Auto mode advances segments at a set delay; skip mode rapidly advances through text.
- **Save & Load** — Quick-save your progress per chapter. Up to 20 save slots per book. Progress persists across sessions via localStorage.
- **Four Visual Themes** — Sakura (pink petals + warm gradient), Night (deep purple/blue), Paper (warm cream), Ocean (soft blue). Each theme has an animated gradient background powered by animejs.
- **Reading Statistics** — Tracks time spent, words read, completion percentage, reading speed (wpm), and ETA to finish. Per-book and aggregate stats across your entire library.
- **Speaker Detection** | Automatically detects dialogue speakers from patterns like `Name: text` or `Name said,` and displays a name plate above the text.
- **Keyboard Shortcuts** — Space/Right/Enter (advance), Left (previous segment), A (auto mode), S (skip mode), L (backlog), Esc (exit reader).

## Quickstart

### Prerequisites

- **Bun** (recommended) or **Node.js** 18+

### Install and run

```bash
bun install
bun run dev
```

Open `http://localhost:3000` — you'll see the sakura-themed library with animated gradient background and falling petals.

### Import a book

1. Drag-and-drop a PDF, TXT, DOCX, or EPUB file onto the import zone, or click to browse
2. The parser processes the file and splits it into chapters + segments
3. Click **Read** to start from the beginning, or **View chapters** to jump to a specific chapter
4. Inside the reader, use the bottom toolbar to switch modes, save progress, view stats, and configure settings

### Sample files

Two sample files are included in `scripts/`:

- `sample-book.txt` — A 4-chapter short story (27 segments, ~600 words)
- `sample.pdf` — A 2-chapter test PDF with heading detection via font-size heuristic

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) + TypeScript |
| Styling | Tailwind CSS 4 + shadcn/ui + custom VN CSS |
| State | Zustand with `persist` middleware (localStorage) |
| Animations | Framer Motion (transitions) + animejs 4.5 (gradient backgrounds) |
| PDF Parsing | pdfjs-dist (font-size heading detection) |
| DOCX Parsing | mammoth (heading style map) |
| EPUB Parsing | epubjs (spine iteration) |
| Typography | Noto Sans JP + Shippori Mincho (Japanese serif) |

## Architecture

```
src/
├── app/
│   ├── page.tsx                  # Entry: switches between Library ↔ VNReader with AnimatePresence
│   ├── layout.tsx                # Loads Japanese fonts, sets up base layout
│   └── globals.css               # VN-specific styles: textbox, nameplate, frame UI, sakura petals, themes
├── lib/
│   ├── vn-parser.ts              # Unified parser: TXT → chapter split, DOCX → HTML heading split,
│   │                             #   PDF → font-size heuristic, EPUB → spine items
│   ├── vn-store.ts               # Zustand persisted store: books, saves, settings, reading stats
│   ├── db.ts                     # Prisma client (reserved for future backend features)
│   └── utils.ts                  # Utility helpers (cn, etc.)
└── components/vn/
    ├── Library.tsx               # Library screen: drag-drop import, book grid, aggregate stats, preview modal
    ├── VNReader.tsx              # Main reader: 3 rendering modes (ADV/NVL/Frame), typewriter, auto/skip,
    │                             #   chapter transitions, reading-time tracker, stats bar
    ├── VNToolbar.tsx             # Bottom toolbar for ADV/NVL modes (Prev/Next/Auto/Skip/Log/Save/Load/Chapters/Config/Stats)
    ├── VNSettingsPanel.tsx       # Settings dialog: mode, theme, text speed, font size, auto delay, toggles
    ├── VNChapterMenu.tsx         # Chapter list dialog with segment counts
    ├── VNSaveLoadDialog.tsx      # Quick-save + save/load slot management
    ├── VNStatsBar.tsx            # Compact stats strip (time · % · segments) in reader header
    ├── VNStatsDialog.tsx         # Full stats modal: progress ring, 4 stat tiles, per-chapter breakdown, ETA
    └── GradientBackground.tsx    # animejs animated gradient: 5 drifting color blobs per theme
```

## How the Parser Works

The parser (`vn-parser.ts`) converts raw files into a normalized `VNBook` structure with `VNChapter[]` and `VNSegment[]` objects. Each segment is one "beat" of text — a paragraph or a speaker-tagged dialogue line that the reader displays one at a time.

### Chapter detection

| Format | Strategy |
|---|---|
| **TXT** | Regex-based heading detection: `Chapter X`, `第X章`, `Prologue`, `Epilogue`, markdown `#` headings, all-caps title lines |
| **DOCX** | mammoth converts to HTML; `h1/h2/h3` tags become chapter boundaries |
| **PDF** | pdfjs-dist extracts text per page; font-size heuristic marks lines ≥1.35x the median as headings |
| **EPUB** | epubjs iterates spine items; each section becomes a chapter, with sub-chapter detection via heading patterns |

### Speaker detection

The parser attempts to identify dialogue speakers using two patterns:
- **Colon format**: `Name: text` or `Name：text`
- **Verb format**: `Name said/asked/replied, text` (supports Chinese verbs like 说, 道, 问, 笑, 叹)

Detected speakers appear in a name plate above the text in ADV and Frame modes.

### Segment splitting

Each chapter body is split into segments at paragraph boundaries (double newlines). Long paragraphs are further split at sentence boundaries (CJK period `。`, exclamation `！`, ellipsis `…`, Latin punctuation). Each segment targets ~220 characters max to maintain a comfortable reading pace.

## Reading Statistics

The app tracks your reading automatically across sessions:

- **Time spent** — Accumulates while the reader is open and the page is visible (1-second tick, capped at 5 seconds per tick to avoid sleep-time jumps)
- **Words read** — Computed cumulatively from segments you've advanced past
- **Completion %** — Based on segments seen vs. total segments in the book
- **Reading speed** — Calculated from time + words (displayed as wpm)
- **ETA** — Estimates remaining time to finish based on your current speed
- **Per-chapter breakdown** — Individual progress bars for each chapter

All stats persist in localStorage via Zustand's `persist` middleware (store version 2). The library shows aggregate stats across all books: total books, total reading time, total words read, and books finished.

> [!NOTE]
> The library stores up to 8 books. When exceeded, the oldest book is evicted along with its saves and stats.

## Production Deployment

The project includes a `Caddyfile` for Caddy reverse proxy. Build for production:

```bash
bun run build
NODE_ENV=production bun .next/standalone/server.js
```

## Keyboard Shortcuts

| Key | Action |
|---|---|
| `Space` / `Right` / `Enter` | Advance to next segment |
| `Left` | Go back to previous segment |
| `A` | Toggle auto mode |
| `S` | Toggle skip mode |
| `L` | Open text backlog |
| `Esc` | Exit reader / close dialogs |
