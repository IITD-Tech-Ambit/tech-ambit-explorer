import { kgApiClient } from "@/lib/api/apiClient";
import { KG_BASE_URL } from "@/lib/api/endpoints";

interface ApiEnvelope<T> {
  success: boolean;
  data: T;
  message?: string;
}

// These calls (esp. the atlas faculty/department search, fired on every
// debounced keystroke) don't go through React Query, so without a cache
// here, re-typing/backspacing to a previously-seen query re-hits the network
// every time. Small in-memory TTL cache + in-flight de-dupe, keyed by the
// request path (query params included), fixes that without needing a
// bigger refactor of the search effect that calls these.
const CACHE_TTL_MS = 60_000;
const CACHE_MAX_ENTRIES = 200;
const responseCache = new Map<string, { data: unknown; expiresAt: number }>();
const inflight = new Map<string, Promise<unknown>>();

async function kgFetch<T>(path: string): Promise<T> {
  const cached = responseCache.get(path);
  if (cached) {
    if (Date.now() < cached.expiresAt) return cached.data as T;
    responseCache.delete(path);
  }

  const existing = inflight.get(path);
  if (existing) return existing as Promise<T>;

  const request = (async () => {
    const { data: body } = await kgApiClient.get<ApiEnvelope<T>>(path);
    if (body.success === false) {
      throw new Error(body.message || "KG request failed");
    }
    if (responseCache.size >= CACHE_MAX_ENTRIES) {
      const oldestKey = responseCache.keys().next().value;
      if (oldestKey !== undefined) responseCache.delete(oldestKey);
    }
    responseCache.set(path, { data: body.data, expiresAt: Date.now() + CACHE_TTL_MS });
    return body.data;
  })().finally(() => inflight.delete(path));

  inflight.set(path, request);
  return request;
}

export const KG_API = KG_BASE_URL;

/**
 * Full 3D atlas payload — deliberately bypasses the cache/envelope handling
 * above: the server sends the raw file content (not the {success,data}
 * envelope every other KG endpoint uses) with its own no-cache/ETag headers,
 * and the payload is large enough that we always want a fresh fetch rather
 * than serving a stale in-memory copy.
 */
export async function fetchKgAtlas<T = { papers: unknown[] }>(): Promise<T> {
  const { data } = await kgApiClient.get<T>("/atlas", {
    headers: { "Cache-Control": "no-cache" },
  });
  return data;
}

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

export const fetchKgAtlasClusterBreakdown = (theme: string, q: string, paperLimit = 200) => {
  const params = new URLSearchParams({
    theme,
    q,
    paperLimit: String(paperLimit),
  });
  return kgFetch<import("./types").KgAtlasClusterBreakdown>(`/atlas/cluster-breakdown?${params}`);
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
