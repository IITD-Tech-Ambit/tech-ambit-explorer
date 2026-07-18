/** Fields needed to resolve an external paper URL (search, chat, KG, timeline). */
export type PaperLinkFields = {
  link?: string | null;
  document_scopus_id?: string | null;
  document_eid?: string | null;
};

const isScholarId = (id: string) => id.startsWith("scholar_");

/**
 * Resolve an external paper URL.
 * Scholar-origin papers use a synthetic "scholar_<hash>" as both IDs.
 * Strategy: (1) Google Scholar link (2) Scopus ID page (3) EID display URI (4) any non-API link.
 */
export function getPaperExternalUrl(
  paper: PaperLinkFields
): { href: string; label: string } | null {
  const link = (paper.link ?? "").trim();
  const scopusId = (paper.document_scopus_id ?? "").trim();
  const eid = (paper.document_eid ?? "").trim();

  if (link.includes("scholar.google.com")) {
    return { href: link, label: "View on Google Scholar" };
  }
  if (scopusId && !isScholarId(scopusId)) {
    return {
      href: `https://www.scopus.com/pages/publications/${scopusId}?origin=resultslist`,
      label: "View Original Paper",
    };
  }
  if (eid && !isScholarId(eid)) {
    return {
      href: `https://www.scopus.com/record/display.uri?eid=${encodeURIComponent(eid)}&origin=resultslist`,
      label: "View Original Paper",
    };
  }
  if (link && !/\/api\/documents\//i.test(link)) {
    return { href: link, label: "View Original Paper" };
  }
  return null;
}

export function resolvePaperHref(paper: PaperLinkFields): string | null {
  return getPaperExternalUrl(paper)?.href ?? null;
}
