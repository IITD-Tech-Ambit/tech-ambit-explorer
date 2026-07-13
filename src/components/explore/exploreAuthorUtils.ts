import type { SearchAuthor } from "@/lib/api/types";

/**
 * Paper `authors` from the search API are already limited to IIT Delhi Faculty roster (Scopus id on Faculty).
 * Names for Explore result cards: when a faculty member is selected, they are listed first.
 *
 * NOTE: People sidebar uses `expert_id` while paper authors carry Scopus `author_id`.
 * Matching must fall back to name comparison when IDs don't match across systems.
 */
export type ExploreCardAuthorEntry = { name: string; author_id: string };

export type ExploreModalAuthorRow = {
  name: string;
  affiliation?: string;
  highlight?: boolean;
  author_id: string;
};

const TITLE_PREFIXES = /^(prof\.?\s+|dr\.?\s+|mr\.?\s+|ms\.?\s+|mrs\.?\s+)/i;

export function normalizeName(raw: string): string {
  return raw.replace(TITLE_PREFIXES, "").replace(/\s+/g, " ").trim().toLowerCase();
}

function findAuthorMatch(
  roster: SearchAuthor[],
  selectedAuthor: { name: string; author_id: string }
): SearchAuthor | undefined {
  const id = String(selectedAuthor.author_id);
  const byId = roster.find((a) => a.author_id != null && String(a.author_id) === id);
  if (byId) return byId;
  const norm = normalizeName(selectedAuthor.name);
  if (!norm) return undefined;
  return roster.find((a) => {
    const n = normalizeName((a.author_name || a.name || "").trim());
    return n && n === norm;
  });
}

function dedupeByNormalizedName<T extends { name: string; author_id: string }>(entries: T[]): T[] {
  const seenIds = new Set<string>();
  const seenNames = new Set<string>();
  return entries.filter((e) => {
    if (seenIds.has(e.author_id)) return false;
    const norm = normalizeName(e.name);
    if (seenNames.has(norm)) return false;
    seenIds.add(e.author_id);
    if (norm) seenNames.add(norm);
    return true;
  });
}

export function getExploreCardAuthorEntries(
  authors: SearchAuthor[] | undefined,
  selectedAuthor: { name: string; author_id: string } | null
): ExploreCardAuthorEntry[] {
  const roster = authors || [];

  if (selectedAuthor) {
    const match = findAuthorMatch(roster, selectedAuthor);
    const matchId = match ? String(match.author_id) : String(selectedAuthor.author_id);
    const headName =
      (match?.author_name || match?.name || selectedAuthor.name).trim() || selectedAuthor.name;
    const head: ExploreCardAuthorEntry = { name: headName, author_id: matchId };
    const headNorm = normalizeName(headName);
    const others = roster
      .filter((a) => {
        if (a.author_id == null) return false;
        if (String(a.author_id) === matchId) return false;
        const n = normalizeName((a.author_name || a.name || "").trim());
        return n !== headNorm;
      })
      .map((a) => ({
        name: (a.author_name || a.name || "").trim(),
        author_id: String(a.author_id),
      }))
      .filter((e) => e.name);
    const merged = dedupeByNormalizedName([head, ...others]);
    return merged.length ? merged : [{ name: selectedAuthor.name, author_id: matchId }];
  }

  return dedupeByNormalizedName(
    roster
      .filter((a) => a.author_id != null)
      .map((a) => ({
        name: (a.author_name || a.name || "").trim(),
        author_id: String(a.author_id),
      }))
      .filter((e) => e.name)
  );
}

export function getExploreModalAuthorRows(
  authors: SearchAuthor[] | undefined,
  selectedAuthor: { name: string; author_id: string } | null
): ExploreModalAuthorRow[] | null {
  const roster = (authors || []).filter((a) => a.author_id != null);

  if (roster.length === 0) return null;

  if (!selectedAuthor) {
    return dedupeByNormalizedName(
      roster
        .map((a) => ({
          name: (a.author_name || a.name || "").trim(),
          affiliation: a.author_affiliation || a.affiliation,
          author_id: String(a.author_id),
        }))
        .filter((r) => r.name)
    );
  }

  const match = findAuthorMatch(roster, selectedAuthor);
  const matchId = match ? String(match.author_id) : String(selectedAuthor.author_id);
  const scoped: ExploreModalAuthorRow = {
    name: (match?.author_name || match?.name || selectedAuthor.name).trim() || selectedAuthor.name,
    affiliation: match?.author_affiliation || match?.affiliation,
    highlight: true,
    author_id: matchId,
  };
  const scopedNorm = normalizeName(scoped.name);
  const rest: ExploreModalAuthorRow[] = roster
    .filter((a) => {
      if (String(a.author_id) === matchId) return false;
      const n = normalizeName((a.author_name || a.name || "").trim());
      return n !== scopedNorm;
    })
    .map((a) => ({
      name: (a.author_name || a.name || "").trim(),
      affiliation: a.author_affiliation || a.affiliation,
      author_id: String(a.author_id),
    }))
    .filter((r) => r.name);

  const rows = dedupeByNormalizedName([scoped, ...rest]).filter((r) => r.name);
  return rows.length ? rows : [{ name: selectedAuthor.name, highlight: true, author_id: matchId }];
}

