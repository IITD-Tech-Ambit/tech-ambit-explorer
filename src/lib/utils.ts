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
