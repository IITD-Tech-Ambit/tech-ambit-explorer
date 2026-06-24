import type { KgAtlasPaper, KgDepartmentItem, KgFacultyItem } from "./types";

export type ClusterLevel = "topic" | "subdomain" | "theme";

export interface TaxonomyEntry {
  label: string;
  type: ClusterLevel;
  count: number;
}

export interface AtlasClusterIndex {
  byTheme: Map<string, number[]>;
  bySubdomain: Map<string, number[]>;
  byTopic: Map<string, number[]>;
  themes: TaxonomyEntry[];
  subdomains: TaxonomyEntry[];
  topics: TaxonomyEntry[];
  allTerms: TaxonomyEntry[];
}

function pushIndex(map: Map<string, number[]>, key: string, idx: number) {
  if (!key) return;
  let list = map.get(key);
  if (!list) {
    list = [];
    map.set(key, list);
  }
  list.push(idx);
}

function toSortedEntries(map: Map<string, number[]>, type: ClusterLevel): TaxonomyEntry[] {
  return [...map.entries()]
    .map(([label, indices]) => ({ label, type, count: indices.length }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}

export function buildAtlasClusterIndex(papers: KgAtlasPaper[]): AtlasClusterIndex {
  const byTheme = new Map<string, number[]>();
  const bySubdomain = new Map<string, number[]>();
  const byTopic = new Map<string, number[]>();

  for (const p of papers) {
    pushIndex(byTheme, p.theme, p.i);
    pushIndex(bySubdomain, p.subdomain, p.i);
    pushIndex(byTopic, p.topic, p.i);
  }

  const themes = toSortedEntries(byTheme, "theme");
  const subdomains = toSortedEntries(bySubdomain, "subdomain");
  const topics = toSortedEntries(byTopic, "topic");

  return {
    byTheme,
    bySubdomain,
    byTopic,
    themes,
    subdomains,
    topics,
    allTerms: [...themes, ...subdomains, ...topics],
  };
}

export interface ThemeClusterLabel {
  theme: string;
  shortLabel: string;
  /** Visible count (updates with filters). */
  count: number;
  /** Total papers in theme (unfiltered). */
  totalCount: number;
  /** Label anchor (outer). */
  x: number;
  y: number;
  z: number;
  /** Cluster centroid the arrow points to. */
  clusterX: number;
  clusterY: number;
  clusterZ: number;
  color: string;
}

const THEME_CLUSTER_COLORS = [
  "#f87171",
  "#fb923c",
  "#facc15",
  "#4ade80",
  "#22d3ee",
  "#818cf8",
  "#f472b6",
  "#a3e635",
  "#c084fc",
];

/** Nine broad research themes, ordered by paper volume (matches atlas legend). */
export const BROAD_THEME_CLUSTERS = [
  "Advanced Materials & Devices",
  "Manufacturing & Industry 4.0",
  "Smart & Sustainable Infrastructure",
  "Healthcare & MedTech",
  "Next-Gen Communication",
  "AI/ML, Supercomputing & Quantum Computing",
  "Quantum Technologies & Semiconductor Technology",
  "Social Sciences, Humanities & Management",
  "Energy, Sustainability & Climate Change",
] as const;

/** Link to Knowledge Graph filtered by a broad theme (footer / cross-page navigation). */
export function knowledgeGraphThemePath(theme: string): string {
  return `/knowledge-graph?theme=${encodeURIComponent(theme)}`;
}

export function broadThemeClusterColor(theme: string): string {
  const sorted = [...BROAD_THEME_CLUSTERS].sort((a, b) => a.localeCompare(b));
  const index = sorted.indexOf(theme as (typeof BROAD_THEME_CLUSTERS)[number]);
  return THEME_CLUSTER_COLORS[index >= 0 ? index % THEME_CLUSTER_COLORS.length : 0];
}

/** Stable theme → hex color map (same order as legend labels). */
export function buildThemeColorMap(papers: KgAtlasPaper[]): Map<string, string> {
  const themes = [...new Set(papers.map((p) => p.theme || "Unknown Theme"))].sort((a, b) =>
    a.localeCompare(b),
  );
  const map = new Map<string, string>();
  themes.forEach((theme, index) => {
    map.set(theme, THEME_CLUSTER_COLORS[index % THEME_CLUSTER_COLORS.length]);
  });
  return map;
}

function themeColorFromMap(colorMap: Map<string, string>, theme: string): string {
  return colorMap.get(theme) ?? THEME_CLUSTER_COLORS[0];
}

const THEME_SHORT_LABELS: Record<string, string> = {
  "AI/ML, Supercomputing & Quantum Computing": "AI/ML & Quantum",
  "Advanced Materials & Devices": "Advanced Materials",
  "Energy, Sustainability & Climate Change": "Energy & Climate",
  "Healthcare & MedTech": "Healthcare & MedTech",
  "Manufacturing & Industry 4.0": "Manufacturing 4.0",
  "Next-Gen Communication": "Next-Gen Communication",
  "Quantum Technologies & Semiconductor Technology": "Quantum & Semiconductors",
  "Smart & Sustainable Infrastructure": "Smart Infrastructure",
  "Social Sciences, Humanities & Management": "Social Sciences & Management",
};

function shortThemeLabel(theme: string): string {
  if (THEME_SHORT_LABELS[theme]) return THEME_SHORT_LABELS[theme];
  const part = theme.split(/[,&]/)[0]?.trim() ?? theme;
  return part.length > 28 ? `${part.slice(0, 27)}…` : part;
}

/** Centroid label positions for each broad-theme cluster in the 3D atlas. */
export function computeThemeClusterLabels(papers: KgAtlasPaper[]): ThemeClusterLabel[] {
  const colorMap = buildThemeColorMap(papers);
  const groups = new Map<string, { sx: number; sy: number; sz: number; n: number }>();

  for (const p of papers) {
    const theme = p.theme || "Unknown Theme";
    const g = groups.get(theme) ?? { sx: 0, sy: 0, sz: 0, n: 0 };
    g.sx += p.x;
    g.sy += p.y;
    g.sz += p.z;
    g.n += 1;
    groups.set(theme, g);
  }

  return [...groups.entries()]
    .sort((a, b) => b[1].n - a[1].n || a[0].localeCompare(b[0]))
    .map(([theme, g]) => {
      const rawCx = g.sx / g.n;
      const rawCy = g.sy / g.n;
      const rawCz = g.sz / g.n;
      const dist = Math.hypot(rawCx, rawCy, rawCz) || 1;
      const nx = rawCx / dist;
      const ny = rawCy / dist;
      const nz = rawCz / dist;
      const clusterDist = dist * 1.04;
      const labelDist = dist * 1.58;
      // Slight tangential stagger so labels don't stack on top of each other.
      const stagger = ((g.n % 5) - 2) * 0.045;
      const up = { x: 0, y: 1, z: 0 };
      let tx = ny * up.z - nz * up.y;
      let ty = nz * up.x - nx * up.z;
      let tz = nx * up.y - ny * up.x;
      const tLen = Math.hypot(tx, ty, tz) || 1;
      tx = (tx / tLen) * stagger;
      ty = (ty / tLen) * stagger;
      tz = (tz / tLen) * stagger;

      return {
        theme,
        shortLabel: shortThemeLabel(theme),
        count: g.n,
        totalCount: g.n,
        clusterX: nx * clusterDist,
        clusterY: ny * clusterDist,
        clusterZ: nz * clusterDist,
        x: nx * labelDist + tx,
        y: ny * labelDist + ty,
        z: nz * labelDist + tz,
        color: themeColorFromMap(colorMap, theme),
      };
    });
}

/** Recompute per-theme visible counts for the active paper filter. */
export function applyFilteredThemeCounts(
  labels: ThemeClusterLabel[],
  papers: KgAtlasPaper[],
  visibleFilter: Set<number> | null,
): ThemeClusterLabel[] {
  if (!visibleFilter) return labels;

  const counts = new Map<string, number>();
  for (const p of papers) {
    if (!visibleFilter.has(p.i)) continue;
    const theme = p.theme || "Unknown Theme";
    counts.set(theme, (counts.get(theme) ?? 0) + 1);
  }

  return labels.map((label) => ({
    ...label,
    count: counts.get(label.theme) ?? 0,
  }));
}

export function clusterKey(paper: KgAtlasPaper, level: ClusterLevel): string {
  if (level === "theme") return paper.theme;
  if (level === "subdomain") return paper.subdomain;
  return paper.topic;
}

export function getClusterIndices(
  paper: KgAtlasPaper,
  level: ClusterLevel,
  index: AtlasClusterIndex,
): number[] {
  const key = clusterKey(paper, level);
  if (!key) return [paper.i];
  const map =
    level === "theme" ? index.byTheme : level === "subdomain" ? index.bySubdomain : index.byTopic;
  return map.get(key) ?? [paper.i];
}

export function getClusterSet(
  paper: KgAtlasPaper,
  level: ClusterLevel,
  index: AtlasClusterIndex,
): Set<number> {
  return new Set(getClusterIndices(paper, level, index));
}

export function clusterLabel(level: ClusterLevel): string {
  if (level === "theme") return "Broad theme";
  if (level === "subdomain") return "Sub-domain";
  return "Topic / keyword";
}

export type MatchLevel = "topic" | "subdomain" | "theme" | "paper";

export interface SearchHighlightResult {
  /** Papers that receive the active-level highlight color. */
  visible: Set<number>;
  /** Match level per highlighted paper index. */
  levelByIndex: Map<number, MatchLevel>;
  matchedTerms: TaxonomyEntry[];
}

function setLevel(
  levelByIndex: Map<number, MatchLevel>,
  visible: Set<number>,
  idx: number,
  level: MatchLevel,
) {
  const prev = levelByIndex.get(idx);
  const rank: Record<MatchLevel, number> = { topic: 4, subdomain: 3, theme: 2, paper: 5 };
  if (!prev || rank[level] > rank[prev]) {
    levelByIndex.set(idx, level);
  }
  visible.add(idx);
}

function addClusterTier(
  levelByIndex: Map<number, MatchLevel>,
  visible: Set<number>,
  indices: number[],
  level: MatchLevel,
) {
  for (const idx of indices) setLevel(levelByIndex, visible, idx, level);
}

function findMatchingTaxonomyTerms(query: string, index: AtlasClusterIndex): TaxonomyEntry[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  let terms = index.allTerms.filter((t) => t.label.toLowerCase() === q);
  if (!terms.length) {
    terms = index.allTerms
      .filter((t) => t.label.toLowerCase().includes(q))
      .sort((a, b) => {
        const aStarts = a.label.toLowerCase().startsWith(q) ? 0 : 1;
        const bStarts = b.label.toLowerCase().startsWith(q) ? 0 : 1;
        if (aStarts !== bStarts) return aStarts - bStarts;
        const rank: Record<ClusterLevel, number> = { topic: 0, subdomain: 1, theme: 2 };
        if (rank[a.type] !== rank[b.type]) return rank[a.type] - rank[b.type];
        return b.count - a.count;
      })
      .slice(0, 12);
  }

  return terms;
}

/** Inclusive substring match — broader queries always include narrower ones. */
function paperMatchesQuery(paper: KgAtlasPaper, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return false;

  const title = paper.title.toLowerCase();
  const topic = paper.topic.toLowerCase();
  const subdomain = paper.subdomain.toLowerCase();
  const theme = paper.theme.toLowerCase();
  const combined = `${title} ${topic} ${subdomain} ${theme}`;

  if (combined.includes(q)) return true;

  const tokens = q.split(/\s+/).filter((t) => t.length >= 2);
  if (tokens.length <= 1) {
    return title.includes(q) || topic.includes(q) || subdomain.includes(q) || theme.includes(q);
  }

  return tokens.every((t) => combined.includes(t));
}

function matchLevelForPaper(paper: KgAtlasPaper, query: string): MatchLevel | null {
  const q = query.trim().toLowerCase();
  if (!q) return null;

  const title = paper.title.toLowerCase();
  const topic = paper.topic.toLowerCase();
  const subdomain = paper.subdomain.toLowerCase();
  const theme = paper.theme.toLowerCase();
  const combined = `${title} ${topic} ${subdomain} ${theme}`;
  const tokens = q.split(/\s+/).filter((t) => t.length >= 2);
  const fieldHit = (value: string) =>
    value.includes(q) || (tokens.length > 1 && tokens.every((t) => value.includes(t)));

  if (fieldHit(topic)) return "topic";
  if (fieldHit(subdomain)) return "subdomain";
  if (fieldHit(theme)) return "theme";
  if (fieldHit(title) || combined.includes(q) || tokens.every((t) => combined.includes(t))) {
    return "paper";
  }
  return null;
}

/** Search with hierarchical match levels for tiered coloring. */
export function resolveSearchMatchLevels(
  query: string,
  papers: KgAtlasPaper[],
  index: AtlasClusterIndex,
): SearchHighlightResult {
  const q = query.trim().toLowerCase();
  const visible = new Set<number>();
  const levelByIndex = new Map<number, MatchLevel>();
  const matchedTerms = findMatchingTaxonomyTerms(query, index);

  if (!q) return { visible, levelByIndex, matchedTerms };

  for (const p of papers) {
    if (!paperMatchesQuery(p, q)) continue;
    const level = matchLevelForPaper(p, q) ?? "paper";
    setLevel(levelByIndex, visible, p.i, level);
  }

  return { visible, levelByIndex, matchedTerms };
}

/** Highlight only the selected cluster level — no parent-tier coloring. */
export function resolveLockedClusterLevels(
  anchor: KgAtlasPaper,
  level: ClusterLevel,
  index: AtlasClusterIndex,
): SearchHighlightResult {
  const visible = new Set<number>();
  const levelByIndex = new Map<number, MatchLevel>();
  const matchedTerms: TaxonomyEntry[] = [];

  const matchLevel: MatchLevel =
    level === "theme" ? "theme" : level === "subdomain" ? "subdomain" : "topic";
  const indices = getClusterIndices(anchor, level, index);
  addClusterTier(levelByIndex, visible, indices, matchLevel);

  matchedTerms.push({
    label: clusterKey(anchor, level),
    type: level,
    count: indices.length,
  });

  return { visible, levelByIndex, matchedTerms };
}

/** Match search query to full taxonomy clusters + free-text paper search. */
export function resolveSearchHighlights(
  query: string,
  papers: KgAtlasPaper[],
  index: AtlasClusterIndex,
): { indices: Set<number>; matchedTerms: TaxonomyEntry[] } {
  const { visible, matchedTerms } = resolveSearchMatchLevels(query, papers, index);
  return { indices: visible, matchedTerms };
}

export function suggestTaxonomyTerms(query: string, index: AtlasClusterIndex, limit = 12): TaxonomyEntry[] {
  const q = query.trim().toLowerCase();
  if (!q) {
    return [...index.themes.slice(0, 6), ...index.subdomains.slice(0, 4), ...index.topics.slice(0, 4)].slice(
      0,
      limit,
    );
  }
  return index.allTerms
    .filter((t) => t.label.toLowerCase().includes(q))
    .sort((a, b) => {
      const aExact = a.label.toLowerCase() === q ? 0 : 1;
      const bExact = b.label.toLowerCase() === q ? 0 : 1;
      if (aExact !== bExact) return aExact - bExact;
      const aStart = a.label.toLowerCase().startsWith(q) ? 0 : 1;
      const bStart = b.label.toLowerCase().startsWith(q) ? 0 : 1;
      if (aStart !== bStart) return aStart - bStart;
      return b.count - a.count;
    })
    .slice(0, limit);
}

function facultyNameMatches(name: string, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return false;
  const hay = name.toLowerCase();
  if (hay.includes(q)) return true;
  const tokens = q.split(/\s+/).filter((t) => t.length >= 2);
  if (tokens.length > 1) return tokens.every((t) => hay.includes(t));
  return tokens.length === 1 && hay.includes(tokens[0]);
}

export function buildDepartmentList(faculty: KgFacultyItem[]): KgDepartmentItem[] {
  const map = new Map<string, { facultyCount: number; paperCount: number }>();
  for (const f of faculty) {
    const department = f.department?.trim();
    if (!department) continue;
    const entry = map.get(department) ?? { facultyCount: 0, paperCount: 0 };
    entry.facultyCount += 1;
    entry.paperCount += f.paperCount ?? 0;
    map.set(department, entry);
  }
  return [...map.entries()]
    .map(([department, stats]) => ({ department, ...stats }))
    .sort((a, b) => b.paperCount - a.paperCount || a.department.localeCompare(b.department));
}

export function suggestDepartmentTerms(
  query: string,
  departments: KgDepartmentItem[],
  limit = 6,
): KgDepartmentItem[] {
  const q = query.trim().toLowerCase();
  if (!q || !departments.length) return [];

  return departments
    .filter((d) => facultyNameMatches(d.department, q))
    .sort((a, b) => {
      const aName = a.department.toLowerCase();
      const bName = b.department.toLowerCase();
      const aExact = aName === q ? 0 : 1;
      const bExact = bName === q ? 0 : 1;
      if (aExact !== bExact) return aExact - bExact;
      const aStart = aName.startsWith(q) ? 0 : 1;
      const bStart = bName.startsWith(q) ? 0 : 1;
      if (aStart !== bStart) return aStart - bStart;
      return b.paperCount - a.paperCount;
    })
    .slice(0, limit);
}

export function suggestFacultyTerms(
  query: string,
  faculty: KgFacultyItem[],
  limit = 6,
): KgFacultyItem[] {
  const q = query.trim().toLowerCase();
  if (!q || !faculty.length) return [];

  return faculty
    .filter((f) => facultyNameMatches(f.name, q))
    .sort((a, b) => {
      const aName = a.name.toLowerCase();
      const bName = b.name.toLowerCase();
      const aExact = aName === q ? 0 : 1;
      const bExact = bName === q ? 0 : 1;
      if (aExact !== bExact) return aExact - bExact;
      const aStart = aName.startsWith(q) ? 0 : 1;
      const bStart = bName.startsWith(q) ? 0 : 1;
      if (aStart !== bStart) return aStart - bStart;
      return b.paperCount - a.paperCount;
    })
    .slice(0, limit);
}

export function typeBadge(type: ClusterLevel): string {
  if (type === "theme") return "Theme";
  if (type === "subdomain") return "Sub-domain";
  return "Topic";
}

export function matchLevelLabel(level: MatchLevel): string {
  if (level === "theme") return "Broad theme";
  if (level === "subdomain") return "Sub-domain";
  if (level === "topic") return "Topic / keyword";
  return "Paper title";
}

export function matchLevelColor(level: MatchLevel): string {
  if (level === "theme") return "#f87171";
  if (level === "subdomain") return "#fb923c";
  if (level === "topic") return "#facc15";
  return "#4ade80";
}
