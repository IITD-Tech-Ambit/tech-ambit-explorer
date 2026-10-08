import type { PaperSource } from "@/lib/api/types";

const SOURCE_TYPE_LABELS: Record<string, string> = {
  j: "Journal",
  p: "Conference Proceeding",
  k: "Book Series",
  b: "Book",
  d: "Trade Journal",
  r: "Report",
};

export const getSourceTitle = (source?: PaperSource | null): string => source?.title?.trim() || "";

export const getSourceTypeLabel = (source?: PaperSource | null): string =>
  SOURCE_TYPE_LABELS[source?.source_type?.trim().toLowerCase() || ""] || "";
