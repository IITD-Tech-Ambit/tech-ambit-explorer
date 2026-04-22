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

/**
 * Wrap matches of any `terms` inside `node` with a styled `<mark>` element.
 * Works on plain strings and on the ReactNode arrays returned by `formatAbstract`
 * (walks child strings, leaves `<sub>` / `<sup>` React elements untouched).
 */
export function highlightTerms(node: React.ReactNode, terms: string[]): React.ReactNode {
  const normalized = Array.from(
    new Set(
      terms
        .map((t) => (typeof t === "string" ? t.trim() : ""))
        .filter((t) => t.length >= 2)
    )
  );
  if (normalized.length === 0) return node;

  const escaped = normalized.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const splitter = new RegExp(`(${escaped.join("|")})`, "gi");
  const termSet = new Set(normalized.map((t) => t.toLowerCase()));

  const renderString = (text: string, keyPrefix: string): React.ReactNode => {
    if (!text) return text;
    const pieces = text.split(splitter);
    return pieces.map((part, i) => {
      if (part && termSet.has(part.toLowerCase())) {
        return React.createElement(
          "span",
          {
            key: `${keyPrefix}-m-${i}`,
            className: "font-semibold rounded-sm bg-primary/10 bg-yellow-200 text-primary px-1 py-0.5",
          },
          part
        );
      }
      return React.createElement(React.Fragment, { key: `${keyPrefix}-t-${i}` }, part);
    });
  };

  const walk = (n: React.ReactNode, keyPrefix: string): React.ReactNode => {
    if (n == null || typeof n === "boolean") return n;
    if (typeof n === "string") return renderString(n, keyPrefix);
    if (typeof n === "number") return n;
    if (Array.isArray(n)) {
      return n.map((child, i) => walk(child, `${keyPrefix}-${i}`));
    }
    return n;
  };

  return walk(node, "h");
}
