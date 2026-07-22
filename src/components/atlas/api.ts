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
 *
 * Longer timeout than the client default (30s): a cold-cache atlas read can
 * take longer, and the gateway/Envoy path now budgets up to 130s for it.
 */
export async function fetchKgAtlas<T = { papers: unknown[] }>(): Promise<T> {
  const { data } = await kgApiClient.get<T>("/atlas", {
    headers: { "Cache-Control": "no-cache" },
    timeout: 120_000,
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

export const fetchKgAtlasYearIndices = (sinceYear: number) => {
  const params = new URLSearchParams({ sinceYear: String(sinceYear) });
  return kgFetch<{ sinceYear: number; matchCount: number; indices: number[] }>(
    `/atlas/year-indices?${params}`,
  );
};

export const fetchKgAtlasSuggest = (q: string, limit = 8) => {
  const params = new URLSearchParams({ limit: String(limit) });
  if (q.trim()) params.set("q", q.trim());
  return kgFetch<import("./types").KgAtlasSuggestResult>(`/atlas/suggest?${params}`);
};

/** Fallback when /atlas/suggest is unavailable (stale gRPC / 501). Uses existing read APIs. */
export async function fetchKgAtlasSuggestFallback(q: string, limit = 8): Promise<import("./types").KgAtlasSuggestResult> {
  const query = q.trim();
  const termParams = new URLSearchParams({ limit: String(Math.max(limit * 4, 16)) });
  if (query) termParams.set("q", query);

  const termPromise = kgFetch<Array<{ key?: string; term?: string; type?: string; paperCount?: number; facultyCount?: number; deptCount?: number }>>(
    `/explore/terms?${termParams}`,
  ).catch(() => [] as Array<{ key?: string; term?: string; type?: string; paperCount?: number; facultyCount?: number; deptCount?: number }>);

  const [terms, facMatches, deptMatches, facultyIndex] = await Promise.all([
    termPromise,
    query
      ? fetchKgAtlasFacultySearch(query, limit).then((r) => r.matches ?? []).catch(() => [] as import("./types").KgAtlasFacultyMatch[])
      : Promise.resolve([] as import("./types").KgAtlasFacultyMatch[]),
    query
      ? fetchKgAtlasDepartmentSearch(query, Math.ceil(limit / 2)).then((r) => r.matches ?? []).catch(() => [] as import("./types").KgAtlasDepartmentMatch[])
      : Promise.resolve([] as import("./types").KgAtlasDepartmentMatch[]),
    query ? Promise.resolve([] as import("./types").KgFacultyItem[]) : fetchKgFacultyIndex().catch(() => [] as import("./types").KgFacultyItem[]),
  ]);

  const themes = [];
  const topics = [];
  for (const row of terms) {
    const mapped = {
      kind: row.type ?? "",
      key: row.key ?? "",
      label: row.term ?? "",
      paperCount: row.paperCount ?? 0,
      facultyCount: row.facultyCount ?? 0,
      deptCount: row.deptCount ?? 0,
    };
    if (row.type === "theme" && themes.length < limit) themes.push(mapped);
    else if (row.type === "topic" && topics.length < limit) topics.push(mapped);
  }

  const faculty = (query ? facMatches : facultyIndex.slice(0, limit)).map((f) => ({
    facultyId: f.facultyId,
    name: f.name,
    department: f.department,
    paperCount: f.paperCount ?? 0,
    atlasCount: "atlasCount" in f ? (f as import("./types").KgAtlasFacultyMatch).atlasCount ?? 0 : 0,
  }));

  const departments = deptMatches.slice(0, Math.ceil(limit / 2)).map((d) => ({
    department: d.department,
    facultyCount: d.facultyCount ?? 0,
    paperCount: d.atlasCount ?? 0,
  }));

  return { query, themes, topics, faculty, departments, papers: [], keywords: [] };
}

export async function fetchKgAtlasSuggestSafe(q: string, limit = 8): Promise<import("./types").KgAtlasSuggestResult> {
  try {
    return await fetchKgAtlasSuggest(q, limit);
  } catch {
    return fetchKgAtlasSuggestFallback(q, limit);
  }
}

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

export interface KgAtlasRefinePoint {
  i: number;
  id: string;
  title: string;
  theme: string;
  domain: string;
  department: string;
  x: number;
  y: number;
  z: number;
}

export interface KgAtlasRefineResult {
  baseQuery: string;
  query: string;
  baseCount: number;
  matchCount: number;
  indices: number[];
  points: KgAtlasRefinePoint[];
}

/** Server-side nested search: refine `q` within papers matching `baseQ`. */
export const fetchKgAtlasRefine = (
  baseQ: string,
  q: string,
  limit = 8000,
  entity?: "department" | "faculty" | null,
  baseEntity?: "department" | "faculty" | null,
) => {
  const params = new URLSearchParams({
    baseQ: baseQ.trim(),
    limit: String(limit),
  });
  if (q.trim()) params.set("q", q.trim());
  if (entity) params.set("entity", entity);
  if (baseEntity) params.set("baseEntity", baseEntity);
  return kgFetch<KgAtlasRefineResult>(`/atlas/refine?${params}`);
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
