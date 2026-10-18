import type { PaperSource, PaperSourceRelationship } from "@/lib/api/types";

const SOURCE_TYPE_LABELS: Record<string, string> = {
  j: "Journal",
  p: "Conference Proceeding",
  k: "Book Series",
  b: "Book",
  d: "Trade Journal",
  r: "Report",
};

const clean = (value: unknown): string => (value == null ? "" : String(value).trim());

export const getSourceTitle = (source?: PaperSource | null): string => clean(source?.title);

export const getSourceTypeLabel = (source?: PaperSource | null): string =>
  SOURCE_TYPE_LABELS[clean(source?.source_type).toLowerCase()] || "";

export const getSourceAbbreviation = (source?: PaperSource | null): string => {
  const abbreviation = clean(source?.sourceTitleAbbreviation);
  return abbreviation && abbreviation !== getSourceTitle(source) ? abbreviation : "";
};

/** Scopus stores ISSNs without the hyphen ("00194565" → "0019-4565"). */
export const formatIssn = (issn?: string | null): string => {
  const value = clean(issn);
  return /^\d{7}[\dXx]$/.test(value) ? `${value.slice(0, 4)}-${value.slice(4).toUpperCase()}` : value;
};

export const getPageRange = (rel?: PaperSourceRelationship | null): string =>
  (Array.isArray(rel?.pages) ? rel.pages : [])
    .map(({ pageFirst, pageLast }) => {
      const first = clean(pageFirst);
      const last = clean(pageLast);
      return first && last && first !== last ? `${first}–${last}` : first || last;
    })
    .filter(Boolean)
    .join(", ");

export const getVolumeIssue = (rel?: PaperSourceRelationship | null): string => {
  const volume = clean(rel?.volume);
  const issue = clean(rel?.issue);
  if (!volume) return issue ? `Issue ${issue}` : "";
  return issue ? `Vol. ${volume} (${issue})` : `Vol. ${volume}`;
};

export const getSourceLocator = (rel?: PaperSourceRelationship | null): string => {
  const volume = clean(rel?.volume);
  const issue = clean(rel?.issue);
  const pages = getPageRange(rel);
  const article = clean(rel?.articleNumber);
  return [
    volume && `Vol. ${volume}`,
    issue && `Issue ${issue}`,
    pages ? `${/[–,]/.test(pages) ? "pp." : "p."} ${pages}` : article && `Article ${article}`,
  ]
    .filter(Boolean)
    .join(", ");
};
