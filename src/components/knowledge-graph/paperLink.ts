/** Resolve external URL for a KG paper node (same rules as Explore page). */
export function getPaperExternalUrl(paper: {
  link?: string;
  document_scopus_id?: string;
  document_eid?: string;
}): { href: string; label: string } | null {
  const link = (paper.link ?? "").trim();
  const scopusId = (paper.document_scopus_id ?? "").trim();
  const eid = (paper.document_eid ?? "").trim();
  const isScholarId = (id: string) => id.startsWith("scholar_");

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
