"use client";

/**
 * Visual Novel Book Parser
 * Converts PDF / TXT / DOCX / EPUB files into a normalized Book object
 * with chapters and segments ready for VN-style display.
 */

export interface VNSegment {
  /** Display text for this beat (one click = next segment). */
  text: string;
  /** Optional speaker name detected from dialogue. */
  speaker?: string;
  /** Optional narrator flag (no speaker). */
  narrator?: boolean;
}

export interface VNChapter {
  id: string;
  title: string;
  segments: VNSegment[];
}

export interface VNBook {
  id: string;
  title: string;
  author?: string;
  sourceFileName: string;
  chapters: VNChapter[];
  importedAt: number;
  /** Raw cover-style description (first paragraph). */
  description?: string;
}

/* ----------------------------- helpers ----------------------------- */

const uid = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36);

/** Common "Chapter X" heading patterns across EN/JA/CN. */
const HEADING_RE =
  /^(?:\s*)(?:(?:第\s*[零一二三四五六七八九十百千0-9]+\s*[章回节卷篇話话])|(?:chapter\s+[\divxlcdm]+)|(?:prologue|epilogue|序章|終章|尾声|楔子|後記|后记)|(?:\d+[\.、])|(?:part\s+[\divxlcdm]+))(?:\s*[:：\-—]?\s*.*)?$/i;

const SPEAKER_RE =
  /^\s*([「『"'""「『]*)([^\s「『"'""」』:：]{1,12})\s*(?:说|道|问|答|喊|叫|笑|叹|低声|轻声|大声|怒道|笑道|问道|答道|喊道|叫道|叹道|曰|：|:|，|,)(?:\s*[「『"'""].*)?$/;

const QUOTE_PAIRS: [string, string][] = [
  ["「", "」"],
  ["『", "』"],
  ["“", "”"],
  ["'", "'"],
  ['"', '"'],
];

function stripQuotes(s: string): string {
  for (const [o, c] of QUOTE_PAIRS) {
    if (s.startsWith(o) && s.endsWith(c) && s.length >= 2) {
      return s.slice(1, -1).trim();
    }
  }
  return s;
}

function tryDetectSpeaker(line: string): { speaker?: string; text: string } {
  // Pattern A: "Name：text" or "Name: text"
  const colonMatch = line.match(/^([^：:\n]{1,12})[：:]\s*(.+)$/);
  if (colonMatch) {
    const name = colonMatch[1].trim();
    const text = colonMatch[2].trim();
    if (name && !/[\s。.!？?]/.test(name) && text.length > 0) {
      return { speaker: name, text: stripQuotes(text) };
    }
  }
  // Pattern B: "Name said," prefix
  const m = line.match(SPEAKER_RE);
  if (m && m[2]) {
    const rest = line.slice(m.index! + m[0].length).trim();
    return { speaker: m[2].trim(), text: stripQuotes(rest || line) };
  }
  return { text: line };
}

/** Normalize text, collapse excessive whitespace inside paragraphs but keep paragraph breaks. */
function normalize(raw: string): string {
  return raw
    .replace(/\r\n?/g, "\n")
    .replace(/\u00a0/g, " ")
    .replace(/\u3000/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]+/g, " ")
    .trim();
}

/** Split a chapter body into segments. Each paragraph becomes a segment; very long paragraphs are split on sentence boundaries. */
function toSegments(body: string): VNSegment[] {
  const paragraphs = body
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);

  const segments: VNSegment[] = [];
  const MAX = 220; // chars per beat (rough)

  for (const p of paragraphs) {
    // Split into sentences (CJK + Latin friendly)
    const sentences = p
      .split(/(?<=[。！？!?…」』”’])\s*/u)
      .map((s) => s.trim())
      .filter(Boolean);

    let buffer = "";
    const flush = () => {
      if (buffer.trim().length === 0) return;
      const detected = tryDetectSpeaker(buffer.trim());
      segments.push({
        text: detected.text,
        speaker: detected.speaker,
        narrator: !detected.speaker,
      });
      buffer = "";
    };

    for (const s of sentences) {
      if ((buffer + s).length > MAX && buffer.length > 0) {
        flush();
      }
      buffer = buffer ? buffer + s : s;
      // If speaker-tagged, treat as its own segment.
      if (/^[^：:\n]{1,12}[：:]/.test(buffer)) {
        flush();
      }
    }
    flush();
  }

  // Fallback: if we somehow produced nothing, treat the body as one narrator segment.
  if (segments.length === 0 && body.trim()) {
    segments.push({ text: body.trim(), narrator: true });
  }
  return segments;
}

/** Try to find a sensible title for a heading line. */
function cleanHeading(line: string): string {
  return line
    .replace(/^#+\s*/, "")
    .replace(/^\s*[-*•·]\s*/, "")
    .replace(/^["'""「『]+|["'""」』]+$/g, "")
    .trim()
    .slice(0, 120);
}

/** Detect whether a line is a chapter heading (used for plain text / docx / epub). */
function isHeading(line: string): boolean {
  const t = line.trim();
  if (!t) return false;
  if (t.length > 120) return false;
  if (HEADING_RE.test(t)) return true;
  // Markdown-style headings
  if (/^#{1,6}\s+\S/.test(t)) return true;
  // Short all-caps title-case line standing alone (EN fiction)
  if (/^[A-Z0-9][A-Z0-9 \-:'!,.?]{2,60}$/.test(t) && t.split(" ").length <= 8) {
    return true;
  }
  return false;
}

/**
 * Take a body of text and split it into chapters based on detected headings.
 * Lines that look like headings become chapter titles; everything in between
 * becomes the chapter body.
 */
function splitIntoChapters(text: string, fallbackTitle = "Chapter"): VNChapter[] {
  const lines = text.split("\n");
  const chapters: VNChapter[] = [];
  let currentTitle = "";
  let currentBody: string[] = [];

  const flush = () => {
    if (currentBody.length === 0 && !currentTitle) return;
    const body = currentBody.join("\n").trim();
    if (body || currentTitle) {
      chapters.push({
        id: uid(),
        title: currentTitle || `${fallbackTitle} ${chapters.length + 1}`,
        segments: toSegments(body),
      });
    }
    currentTitle = "";
    currentBody = [];
  };

  for (const raw of lines) {
    const line = raw.trimEnd();
    const trimmed = line.trim();
    if (trimmed && isHeading(trimmed)) {
      flush();
      currentTitle = cleanHeading(trimmed);
    } else {
      currentBody.push(line);
    }
  }
  flush();

  // If we only have one chapter and no real title was detected, that's fine.
  // If we have zero, make a single default chapter.
  if (chapters.length === 0) {
    chapters.push({
      id: uid(),
      title: fallbackTitle,
      segments: toSegments(text),
    });
  }
  return chapters;
}

/* ----------------------------- TXT ----------------------------- */

async function parseTxt(file: File): Promise<VNBook> {
  const text = normalize(await file.text());
  const chapters = splitIntoChapters(text, "Chapter");
  return {
    id: uid(),
    title: file.name.replace(/\.txt$/i, ""),
    sourceFileName: file.name,
    chapters,
    importedAt: Date.now(),
    description: chapters[0]?.segments[0]?.text?.slice(0, 180),
  };
}

/* ----------------------------- DOCX ----------------------------- */

async function parseDocx(file: File): Promise<VNBook> {
  const mammoth = await import("mammoth/mammoth.browser");
  const arrayBuffer = await file.arrayBuffer();
  // Convert with style map so heading styles map to <h1>/<h2>
  const result = await mammoth.convertToHtml(
    { arrayBuffer },
    {
      styleMap: [
        "p[style-name='Heading 1'] => h1:fresh",
        "p[style-name='Heading 2'] => h2:fresh",
        "p[style-name='Heading 3'] => h3:fresh",
        "p[style-name='Title'] => h1:fresh",
        "p[style-name='Subtitle'] => h2:fresh",
      ],
    }
  );
  const html = result.value || "";

  // Walk the HTML and split into chapters based on h1/h2/h3 tags.
  const doc = new DOMParser().parseFromString(html, "text/html");
  const chapters: VNChapter[] = [];
  let currentTitle = "";
  let currentBody: string[] = [];

  const flush = () => {
    const body = currentBody.join("\n").trim();
    if (body || currentTitle) {
      chapters.push({
        id: uid(),
        title: currentTitle || `Chapter ${chapters.length + 1}`,
        segments: toSegments(body),
      });
    }
    currentTitle = "";
    currentBody = [];
  };

  doc.body.childNodes.forEach((node) => {
    if (node.nodeType !== 1) return;
    const el = node as HTMLElement;
    const tag = el.tagName.toLowerCase();
    const text = (el.textContent || "").trim();
    if (!text) return;
    if (tag === "h1" || tag === "h2" || tag === "h3") {
      flush();
      currentTitle = cleanHeading(text);
    } else {
      currentBody.push(text);
    }
  });
  flush();

  if (chapters.length === 0) {
    chapters.push({
      id: uid(),
      title: "Chapter 1",
      segments: toSegments(doc.body.textContent || ""),
    });
  }

  return {
    id: uid(),
    title: file.name.replace(/\.docx?$/i, ""),
    sourceFileName: file.name,
    chapters,
    importedAt: Date.now(),
    description: chapters[0]?.segments[0]?.text?.slice(0, 180),
  };
}

/* ----------------------------- PDF ----------------------------- */

async function parsePdf(file: File): Promise<VNBook> {
  // Dynamic import to keep SSR light
  const pdfjs: any = await import("pdfjs-dist/build/pdf.mjs");
  // Worker must be served from CDN to avoid bundler issues.
  try {
    pdfjs.GlobalWorkerOptions.workerSrc = new URL(
      "pdfjs-dist/build/pdf.worker.mjs",
      import.meta.url
    ).toString();
  } catch {
    // Fallback to CDN
    pdfjs.GlobalWorkerOptions.workerSrc =
      "https://cdn.jsdelivr.net/npm/pdfjs-dist@6.1.200/build/pdf.worker.min.mjs";
  }

  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjs.getDocument({ data: arrayBuffer });
  const pdf = await loadingTask.promise;

  // Use textContent + font size heuristic to detect headings.
  const fullLines: { text: string; size: number; page: number }[] = [];
  let maxFontSize = 0;

  for (let p = 1; p <= pdf.numPages; p++) {
    const page = await pdf.getPage(p);
    const content = await page.getTextContent();
    // Group items by their Y position to reconstruct lines.
    const byY = new Map<number, { items: any[]; y: number }>();
    for (const item of content.items as any[]) {
      if (!("str" in item) || !item.str.trim()) continue;
      const y = Math.round(item.transform[5]);
      const bucket = byY.get(y) || { items: [], y };
      bucket.items.push(item);
      byY.set(y, bucket);
    }
    const ys = Array.from(byY.keys()).sort((a, b) => b - a); // top→bottom
    for (const y of ys) {
      const bucket = byY.get(y)!;
      const items = [...bucket.items].sort((a, b) => a.transform[0] - b.transform[0]);
      let lineText = "";
      let lineSize = 0;
      for (const it of items) {
        if (lineText && !lineText.endsWith(" ") && !it.str.startsWith(" ")) {
          lineText += " ";
        }
        lineText += it.str;
        lineSize = Math.max(lineSize, it.height || 0);
      }
      lineText = lineText.trim();
      if (lineText) {
        maxFontSize = Math.max(maxFontSize, lineSize);
        fullLines.push({ text: lineText, size: lineSize, page: p });
      }
    }
  }

  // Threshold: anything 1.4x the median font size or matches a heading regex is a heading.
  const sizes = fullLines.map((l) => l.size).filter((s) => s > 0).sort((a, b) => a - b);
  const median = sizes.length ? sizes[Math.floor(sizes.length / 2)] : 12;

  const chapters: VNChapter[] = [];
  let currentTitle = "";
  let currentBody: string[] = [];

  const flush = () => {
    const body = currentBody.join("\n").trim();
    if (body || currentTitle) {
      chapters.push({
        id: uid(),
        title: currentTitle || `Chapter ${chapters.length + 1}`,
        segments: toSegments(body),
      });
    }
    currentTitle = "";
    currentBody = [];
  };

  for (const line of fullLines) {
    const isBig = line.size >= median * 1.35 && line.size > 0;
    const looksHeading = isHeading(line.text) || isBig;
    if (looksHeading && line.text.length <= 120) {
      flush();
      currentTitle = cleanHeading(line.text);
    } else {
      currentBody.push(line.text);
    }
  }
  flush();

  if (chapters.length === 0) {
    chapters.push({
      id: uid(),
      title: "Chapter 1",
      segments: toSegments(fullLines.map((l) => l.text).join("\n")),
    });
  }

  return {
    id: uid(),
    title: file.name.replace(/\.pdf$/i, ""),
    sourceFileName: file.name,
    chapters,
    importedAt: Date.now(),
    description: chapters[0]?.segments[0]?.text?.slice(0, 180),
  };
}

/* ----------------------------- EPUB ----------------------------- */

async function parseEpub(file: File): Promise<VNBook> {
  // epubjs works in browser; we just need chapter HTML.
  const ePub = (await import("epubjs")).default;
  const arrayBuffer = await file.arrayBuffer();
  const book = ePub(arrayBuffer);
  await book.ready;

  const title = (book.packaging?.metadata?.title as string) || file.name.replace(/\.epub$/i, "");
  const author = book.packaging?.metadata?.creator as string | undefined;

  const chapters: VNChapter[] = [];
  const spine = book.spine;
  // Iterate over spine items (chapters / sections)
  for (const item of spine.spineByHref ? spine.items : spine.items as any[]) {
    if (!item || !item.load) continue;
    try {
      const doc = await item.load(book.load.bind(book));
      const text = (doc as Document).body
        ? (doc as Document).body.textContent || ""
        : String(doc);
      const headEl = (doc as Document).querySelector?.("h1, h2, h3, title");
      const heading = headEl ? (headEl.textContent || "").trim() : "";
      const body = normalize(text || "");
      if (!body) continue;
      const subChapters = splitIntoChapters(
        (heading ? `# ${heading}\n\n` : "") + body,
        heading || "Chapter"
      );
      chapters.push(...subChapters);
    } catch {
      // skip broken sections
    }
  }

  await book.destroy();

  if (chapters.length === 0) {
    chapters.push({
      id: uid(),
      title: "Chapter 1",
      segments: [{ text: title, narrator: true }],
    });
  }

  return {
    id: uid(),
    title,
    author,
    sourceFileName: file.name,
    chapters,
    importedAt: Date.now(),
    description: chapters[0]?.segments[0]?.text?.slice(0, 180),
  };
}

/* ----------------------------- dispatch ----------------------------- */

export async function parseFile(file: File): Promise<VNBook> {
  const name = file.name.toLowerCase();
  if (name.endsWith(".txt")) return parseTxt(file);
  if (name.endsWith(".docx")) return parseDocx(file);
  if (name.endsWith(".pdf")) return parsePdf(file);
  if (name.endsWith(".epub")) return parseEpub(file);
  // Fallback: try as text
  return parseTxt(file);
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
