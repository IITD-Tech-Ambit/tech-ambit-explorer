const API_BASE = `${import.meta.env.VITE_API_URL || "http://localhost:3002/api"}/kg`;

interface ApiEnvelope<T> {
  success: boolean;
  data: T;
  message?: string;
}

async function kgFetch<T>(path: string): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`);
  const body = (await response.json()) as ApiEnvelope<T> & { message?: string };
  if (!response.ok || body.success === false) {
    throw new Error(body.message || `KG request failed (${response.status})`);
  }
  return body.data;
}

export const KG_API = API_BASE;

export const fetchKgFacultyIndex = () => kgFetch<import("./types").KgFacultyItem[]>("/faculty");

export const fetchKgFacultyGraph = (facultyId: string) =>
  kgFetch<import("./types").KgGraph>(`/faculty/${encodeURIComponent(facultyId)}/knowledge-graph`);

export const fetchKgExploreTerms = (q = "", limit = 50) => {
  const params = new URLSearchParams({ limit: String(limit) });
  if (q.trim()) params.set("q", q.trim());
  return kgFetch<import("./types").KgTermItem[]>(`/explore/terms?${params}`);
};

export const fetchKgExploreDetail = (key: string) =>
  kgFetch<import("./types").KgExploreDetail>(`/explore/detail?key=${encodeURIComponent(key)}`);

export interface KgPaperMeta {
  link: string;
  document_scopus_id: string;
  document_eid: string;
  title: string;
}

export const fetchKgPaperMeta = (paperId: string) =>
  kgFetch<KgPaperMeta>(`/paper/${encodeURIComponent(paperId)}/meta`);
