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

export const fetchKgAtlasFacultySearch = (q: string, limit = 12) => {
  const params = new URLSearchParams({ limit: String(limit) });
  if (q.trim()) params.set("q", q.trim());
  return kgFetch<import("./types").KgAtlasFacultySearchResult>(`/atlas/faculty-search?${params}`);
};

export const fetchKgFacultyAtlasIndices = (facultyIds: string[]) => {
  const params = new URLSearchParams({ ids: facultyIds.join(",") });
  return kgFetch<{ facultyIds: string[]; matchCount: number; indices: number[] }>(
    `/atlas/faculty-indices?${params}`,
  );
};

export const fetchKgAtlasDepartmentSearch = (q: string, limit = 12) => {
  const params = new URLSearchParams({ limit: String(limit) });
  if (q.trim()) params.set("q", q.trim());
  return kgFetch<import("./types").KgAtlasDepartmentSearchResult>(`/atlas/department-search?${params}`);
};

export const fetchKgDepartmentAtlasIndices = (departments: string[]) => {
  const params = new URLSearchParams({ departments: departments.join("|") });
  return kgFetch<{ departments: string[]; matchCount: number; indices: number[] }>(
    `/atlas/department-indices?${params}`,
  );
};

export interface KgPaperMeta {
  link: string;
  document_scopus_id: string;
  document_eid: string;
  title: string;
  abstract?: string;
  publication_year?: number | null;
  citation_count?: number;
  reference_count?: number;
  document_type?: string;
  field_associated?: string;
  subject_area?: string[];
  authors?: { name: string; author_id: string; position: string }[];
  iitd_faculty?: { facultyId: string; name: string; department: string; kerberos: string }[];
}

export const fetchKgPaperMeta = (paperId: string) =>
  kgFetch<KgPaperMeta>(`/paper/${encodeURIComponent(paperId)}/meta`);
