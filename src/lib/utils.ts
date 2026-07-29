import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import React from "react";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Parse Scopus-style XML markup in abstract text (e.g. `<inf>`, `<sup>`)
 * and return React elements with proper `<sub>` / `<sup>` tags.
 */
export function formatAbstract(text: string): React.ReactNode {
  const TAG_MAP: Record<string, string> = { inf: "sub", sup: "sup" };
  const tagNames = Object.keys(TAG_MAP).join("|");
  const regex = new RegExp(`<(${tagNames})>(.*?)</\\1>`, "gi");

  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    const htmlTag = TAG_MAP[match[1].toLowerCase()];
    parts.push(React.createElement(htmlTag, { key: match.index }, match[2]));
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts.length === 1 && typeof parts[0] === "string" ? parts[0] : parts;
}

// Matches src/utils/highlight.js on the backend: OpenSearch wraps matched spans in these
// Private Use Area markers instead of raw HTML, so the frontend never has to trust/sanitize
// injected markup.
const HL_OPEN = "";
const HL_CLOSE = "";
const HL_MARK_RE = new RegExp(`${HL_OPEN}([\\s\\S]*?)${HL_CLOSE}`, "g");

type MarkSpan = { start: number; end: number; content: string };

// OpenSearch tags each matched word independently, so adjacent highlighted words in the
// same phrase (e.g. "battery" then "storage") arrive as two separate marker pairs with a
// plain space between them. Rendering each as its own <mark> then stacks two boxes side by
// side, each with its own padding, which reads as a visible gap/seam. Merging spans that are
// separated only by whitespace renders them as one continuous highlight instead.
function mergeAdjacentSpans(text: string, spans: MarkSpan[]): MarkSpan[] {
  const merged: MarkSpan[] = [];
  for (const span of spans) {
    const prev = merged[merged.length - 1];
    if (prev && /^\s*$/.test(text.slice(prev.end, span.start))) {
      prev.content += text.slice(prev.end, span.start) + span.content;
      prev.end = span.end;
    } else {
      merged.push({ ...span });
    }
  }
  return merged;
}

function renderMarkedString(text: string, keyPrefix: string): React.ReactNode {
  if (!text.includes(HL_OPEN)) return text;

  const rawSpans: MarkSpan[] = [];
  const re = new RegExp(HL_MARK_RE);
  let match: RegExpExecArray | null;
  while ((match = re.exec(text)) !== null) {
    rawSpans.push({ start: match.index, end: match.index + match[0].length, content: match[1] });
  }
  const spans = mergeAdjacentSpans(text, rawSpans);

  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  spans.forEach((span, i) => {
    if (span.start > lastIndex) parts.push(text.slice(lastIndex, span.start));
    parts.push(
      React.createElement(
        "mark",
        { key: `${keyPrefix}-m-${i}`, className: "font-semibold rounded-sm bg-primary/10 text-primary px-1 py-0.5" },
        span.content
      )
    );
    lastIndex = span.end;
  });
  if (lastIndex < text.length) parts.push(text.slice(lastIndex));
  return parts;
}

function walkMarked(n: React.ReactNode, keyPrefix: string): React.ReactNode {
  if (n == null || typeof n === "boolean") return n;
  if (typeof n === "string") return renderMarkedString(n, keyPrefix);
  if (typeof n === "number") return n;
  if (Array.isArray(n)) return n.map((child, i) => walkMarked(child, `${keyPrefix}-${i}`));
  return n;
}

/** Renders backend-highlighted title text (OpenSearch-marked spans, or plain text if absent). */
export function renderHighlightedText(text?: string): React.ReactNode {
  return text ? renderMarkedString(text, "ht") : text;
}

/** Renders a backend-highlighted abstract snippet, composed with `formatAbstract`'s <inf>/<sup> handling. */
export function renderHighlightedAbstract(text?: string): React.ReactNode {
  return text ? walkMarked(formatAbstract(text), "ha") : text;
}
