import type { KgAtlasPaper, KgDepartmentItem, KgFacultyItem } from "./types";

export type ClusterLevel = "topic" | "subdomain" | "domain" | "theme";

const UNCLASSIFIED = new Set(["Unclassified", "Unknown Theme", "Unknown Domain"]);

/** Keep only Excel-classified atlas papers (excludes unclassified legacy rows). */
export function filterClassifiedAtlasPapers(papers: KgAtlasPaper[]): KgAtlasPaper[] {
  const kept = papers.filter(
    (p) =>
      p.theme &&
      !UNCLASSIFIED.has(p.theme) &&
      p.domain &&
      !UNCLASSIFIED.has(p.domain),
  );
  if (kept.length === papers.length) return papers;
  return kept.map((p, i) => ({ ...p, i }));
}

export interface TaxonomyEntry {
  label: string;
  type: ClusterLevel;
  count: number;
}

export interface AtlasClusterIndex {
  byTheme: Map<string, number[]>;
  byDomain: Map<string, number[]>;
  bySubdomain: Map<string, number[]>;
  byTopic: Map<string, number[]>;
  themes: TaxonomyEntry[];
  domains: TaxonomyEntry[];
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
  const byDomain = new Map<string, number[]>();
  const bySubdomain = new Map<string, number[]>();
  const byTopic = new Map<string, number[]>();

  for (const p of papers) {
    pushIndex(byTheme, p.theme, p.i);
    pushIndex(byDomain, p.domain, p.i);
    pushIndex(bySubdomain, p.subdomain, p.i);
    pushIndex(byTopic, p.topic, p.i);
  }

  const themes = toSortedEntries(byTheme, "theme");
  const domains = toSortedEntries(byDomain, "domain");
  const subdomains = toSortedEntries(bySubdomain, "subdomain");
  const topics = toSortedEntries(byTopic, "topic");

  return {
    byTheme,
    byDomain,
    bySubdomain,
    byTopic,
    themes,
    domains,
    subdomains,
    topics,
    allTerms: [...themes, ...domains, ...subdomains, ...topics],
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

export interface DomainClusterLabel {
  domain: string;
  theme: string;
  shortLabel: string;
  fullLabel: string;
  count: number;
  x: number;
  y: number;
  z: number;
  clusterX: number;
  clusterY: number;
  clusterZ: number;
  color: string;
  showLabelOnMap: boolean;
}

const DOMAIN_LABEL_COLORS = [
  "#818cf8",
  "#a78bfa",
  "#6366f1",
  "#8b5cf6",
  "#7c3aed",
  "#c084fc",
  "#a855f7",
  "#9333ea",
  "#6d28d9",
  "#4f46e5",
];

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

/** Link to Atlas filtered by a broad theme (footer / cross-page navigation). */
export function atlasThemePath(theme: string): string {
  return `/atlas?theme=${encodeURIComponent(theme)}`;
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

function shortDomainLabel(domain: string, maxLen = 34): string {
  if (domain.length <= maxLen) return domain;
  return `${domain.slice(0, maxLen - 1)}…`;
}

export function themeDisplayName(theme: string): string {
  return shortThemeLabel(theme);
}

export interface ExpandedDomainLayout {
  labels: DomainClusterLabel[];
  paperPositions: Map<number, { x: number; y: number; z: number }>;
  themeCenter: { x: number; y: number; z: number };
  totalPapers: number;
}

function hashSeed(key: string): number {
  let h = 2166136261;
  for (let i = 0; i < key.length; i++) {
    h = Math.imul(h ^ key.charCodeAt(i), 16777619);
  }
  return h >>> 0;
}

function jitterFromId(id: string, radius: number): { x: number; y: number; z: number } {
  let s = hashSeed(id);
  const next = () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    x: (next() - 0.5) * 2 * radius,
    y: (next() - 0.5) * 2 * radius,
    z: (next() - 0.5) * 2 * radius,
  };
}

function normalize3(x: number, y: number, z: number): { x: number; y: number; z: number } {
  const len = Math.hypot(x, y, z) || 1;
  return { x: x / len, y: y / len, z: z / len };
}

function cross3(
  ax: number, ay: number, az: number,
  bx: number, by: number, bz: number,
): { x: number; y: number; z: number } {
  return {
    x: ay * bz - az * by,
    y: az * bx - ax * bz,
    z: ax * by - ay * bx,
  };
}

export const DOMAINS_PER_PAGE = 9;

function themeDomainGroups(papers: KgAtlasPaper[], theme: string): [string, KgAtlasPaper[]][] {
  const themePapers = papers.filter((p) => p.theme === theme && p.domain);
  const byDomain = new Map<string, KgAtlasPaper[]>();
  for (const p of themePapers) {
    const list = byDomain.get(p.domain) ?? [];
    list.push(p);
    byDomain.set(p.domain, list);
  }
  return [...byDomain.entries()].sort(
    (a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]),
  );
}

function themeCentroid(papers: KgAtlasPaper[], theme: string): { x: number; y: number; z: number; total: number } {
  const themePapers = papers.filter((p) => p.theme === theme && p.domain);
  if (!themePapers.length) {
    return { x: 0, y: 0, z: 0, total: 0 };
  }
  let tcx = 0;
  let tcy = 0;
  let tcz = 0;
  for (const p of themePapers) {
    tcx += p.x;
    tcy += p.y;
    tcz += p.z;
  }
  return {
    x: tcx / themePapers.length,
    y: tcy / themePapers.length,
    z: tcz / themePapers.length,
    total: themePapers.length,
  };
}

/** Sorted domain metadata for a theme (colors stable across pagination). */
export function listThemeDomains(papers: KgAtlasPaper[], theme: string): DomainClusterLabel[] {
  const domains = themeDomainGroups(papers, theme);
  return domains.map(([domain, domainPapers], index) => ({
    domain,
    theme,
    fullLabel: domain,
    shortLabel: shortDomainLabel(domain, 28),
    count: domainPapers.length,
    color: DOMAIN_LABEL_COLORS[index % DOMAIN_LABEL_COLORS.length],
    showLabelOnMap: false,
    clusterX: 0,
    clusterY: 0,
    clusterZ: 0,
    x: 0,
    y: 0,
    z: 0,
  }));
}

function clusterJitterFromId(id: string, radius: number): { x: number; y: number; z: number } {
  const j = jitterFromId(id, 1);
  const scale = radius * Math.pow(Math.abs(j.x), 0.52);
  const angle = j.y * Math.PI * 2;
  const wobble = j.z * 0.35;
  return {
    x: Math.cos(angle) * scale + wobble * 0.08,
    y: Math.sin(angle) * scale + wobble * 0.08,
    z: (j.z - 0.5) * scale * 0.65,
  };
}

/** Spread visible domains in a theme-style ring with labeled clusters (9 per page). */
export function computeExpandedDomainLayout(
  papers: KgAtlasPaper[],
  theme: string,
  visibleDomains?: string[],
): ExpandedDomainLayout {
  const paperPositions = new Map<number, { x: number; y: number; z: number }>();
  const { x: tcx, y: tcy, z: tcz, total } = themeCentroid(papers, theme);

  if (!total) {
    return {
      labels: [],
      paperPositions,
      themeCenter: { x: 0, y: 0, z: 0 },
      totalPapers: 0,
    };
  }

  const allDomains = themeDomainGroups(papers, theme);
  const domainIndexMap = new Map(allDomains.map(([domain], index) => [domain, index]));
  const visibleSet = visibleDomains?.length ? new Set(visibleDomains) : null;
  const domains = visibleSet
    ? allDomains.filter(([domain]) => visibleSet.has(domain))
    : allDomains;

  const nDomains = domains.length;
  const maxCount = domains[0]?.[1].length ?? 1;

  const viewNormal = normalize3(tcx, tcy, tcz);
  let refX = 0;
  let refY = 1;
  let refZ = 0;
  if (Math.abs(viewNormal.y) > 0.88) {
    refX = 1;
    refY = 0;
    refZ = 0;
  }
  let tangent = cross3(viewNormal.x, viewNormal.y, viewNormal.z, refX, refY, refZ);
  tangent = normalize3(tangent.x, tangent.y, tangent.z);
  let bitangent = cross3(viewNormal.x, viewNormal.y, viewNormal.z, tangent.x, tangent.y, tangent.z);
  bitangent = normalize3(bitangent.x, bitangent.y, bitangent.z);

  const spreadRadius =
    nDomains <= 1 ? 0
      : nDomains <= 3 ? 0.48
        : nDomains <= 6 ? 0.62
          : 0.78;

  const labels: DomainClusterLabel[] = [];

  domains.forEach(([domain, domainPapers], index) => {
    const globalIndex = domainIndexMap.get(domain) ?? index;
    const angle = nDomains <= 1 ? 0 : (2 * Math.PI * index) / nDomains - Math.PI / 2;

    const anchorX = nDomains <= 1
      ? tcx
      : tcx + tangent.x * Math.cos(angle) * spreadRadius + bitangent.x * Math.sin(angle) * spreadRadius;
    const anchorY = nDomains <= 1
      ? tcy
      : tcy + tangent.y * Math.cos(angle) * spreadRadius + bitangent.y * Math.sin(angle) * spreadRadius;
    const anchorZ = nDomains <= 1
      ? tcz
      : tcz + tangent.z * Math.cos(angle) * spreadRadius + bitangent.z * Math.sin(angle) * spreadRadius;

    const countRatio = domainPapers.length / maxCount;
    const blobRadius = Math.min(
      0.11,
      0.022 + Math.sqrt(domainPapers.length) * 0.0048 + countRatio * 0.028,
    );

    for (const p of domainPapers) {
      const j = clusterJitterFromId(p.id, blobRadius);
      paperPositions.set(p.i, {
        x: anchorX + j.x,
        y: anchorY + j.y,
        z: anchorZ + j.z,
      });
    }

    const radialLen = Math.hypot(anchorX - tcx, anchorY - tcy, anchorZ - tcz) || spreadRadius || 0.5;
    const rx = radialLen > 0.001 ? (anchorX - tcx) / radialLen : tangent.x;
    const ry = radialLen > 0.001 ? (anchorY - tcy) / radialLen : tangent.y;
    const rz = radialLen > 0.001 ? (anchorZ - tcz) / radialLen : tangent.z;
    const stagger = ((index % 5) - 2) * 0.038;
    const labelOffset = 0.24 + stagger;

    labels.push({
      domain,
      theme,
      fullLabel: domain,
      shortLabel: shortDomainLabel(domain, 32),
      count: domainPapers.length,
      color: DOMAIN_LABEL_COLORS[globalIndex % DOMAIN_LABEL_COLORS.length],
      showLabelOnMap: true,
      clusterX: anchorX,
      clusterY: anchorY,
      clusterZ: anchorZ,
      x: anchorX + rx * labelOffset,
      y: anchorY + ry * labelOffset,
      z: anchorZ + rz * labelOffset,
    });
  });

  return {
    labels,
    paperPositions,
    themeCenter: { x: tcx, y: tcy, z: tcz },
    totalPapers: total,
  };
}

/** @deprecated Use computeExpandedDomainLayout for spread sub-clusters. */
export function computeDomainClusterLabels(
  papers: KgAtlasPaper[],
  theme: string,
): DomainClusterLabel[] {
  return computeExpandedDomainLayout(papers, theme).labels;
}

/** Build domain → color map for papers within one theme. */
export function buildDomainColorMapForTheme(
  papers: KgAtlasPaper[],
  theme: string,
): Map<string, string> {
  const map = new Map<string, string>();
  for (const label of listThemeDomains(papers, theme)) {
    map.set(label.domain, label.color);
  }
  return map;
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
  if (level === "domain") return paper.domain;
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
    level === "theme"
      ? index.byTheme
      : level === "domain"
        ? index.byDomain
        : level === "subdomain"
          ? index.bySubdomain
          : index.byTopic;
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
  if (level === "domain") return "Domain";
  if (level === "subdomain") return "Sub-domain";
  return "Topic / keyword";
}

export type MatchLevel = "topic" | "subdomain" | "domain" | "theme" | "paper";

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
  const rank: Record<MatchLevel, number> = { topic: 5, subdomain: 4, domain: 3, theme: 2, paper: 6 };
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
        const rank: Record<ClusterLevel, number> = { topic: 0, subdomain: 1, domain: 2, theme: 3 };
        if (rank[a.type] !== rank[b.type]) return rank[a.type] - rank[b.type];
        return b.count - a.count;
      })
      .slice(0, 12);
  }

  return terms;
}

/** Inclusive substring match — broader queries always include narrower ones. */
export function paperMatchesQuery(paper: KgAtlasPaper, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return false;

  const title = paper.title.toLowerCase();
  const topic = paper.topic.toLowerCase();
  const subdomain = paper.subdomain.toLowerCase();
  const domain = paper.domain.toLowerCase();
  const theme = paper.theme.toLowerCase();
  const combined = `${title} ${topic} ${subdomain} ${domain} ${theme}`;

  if (combined.includes(q)) return true;

  const tokens = q.split(/\s+/).filter((t) => t.length >= 2);
  if (tokens.length <= 1) {
    return (
      title.includes(q)
      || topic.includes(q)
      || subdomain.includes(q)
      || domain.includes(q)
      || theme.includes(q)
    );
  }

  return tokens.every((t) => combined.includes(t));
}

function matchLevelForPaper(paper: KgAtlasPaper, query: string): MatchLevel | null {
  const q = query.trim().toLowerCase();
  if (!q) return null;

  const title = paper.title.toLowerCase();
  const topic = paper.topic.toLowerCase();
  const subdomain = paper.subdomain.toLowerCase();
  const domain = paper.domain.toLowerCase();
  const theme = paper.theme.toLowerCase();
  const combined = `${title} ${topic} ${subdomain} ${domain} ${theme}`;
  const tokens = q.split(/\s+/).filter((t) => t.length >= 2);
  const fieldHit = (value: string) =>
    value.includes(q) || (tokens.length > 1 && tokens.every((t) => value.includes(t)));

  if (fieldHit(topic)) return "topic";
  if (fieldHit(subdomain)) return "subdomain";
  if (fieldHit(domain)) return "domain";
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
    level === "theme"
      ? "theme"
      : level === "domain"
        ? "domain"
        : level === "subdomain"
          ? "subdomain"
          : "topic";
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

/** Build theme → department paper breakdown on the client (fallback when API unavailable). */
export function buildThemeClusterBreakdownClient(
  papers: KgAtlasPaper[],
  searchFilter: Set<number>,
  theme: string,
  query: string,
  paperLimit = 200,
): import("./types").KgAtlasClusterBreakdown {
  const byDept = new Map<string, { paperCount: number; papers: import("./types").KgAtlasClusterPaper[] }>();
  let totalPapers = 0;

  for (const p of papers) {
    if (p.theme !== theme || !searchFilter.has(p.i)) continue;
    if (!paperMatchesQuery(p, query)) continue;
    totalPapers += 1;

    const dept = p.department?.trim() || "Unassigned";
    let entry = byDept.get(dept);
    if (!entry) {
      entry = { paperCount: 0, papers: [] };
      byDept.set(dept, entry);
    }
    entry.paperCount += 1;
    if (entry.papers.length < paperLimit) {
      entry.papers.push({
        id: p.id,
        i: p.i,
        title: p.title,
        domain: p.domain,
        topic: p.topic,
        citations: p.citations,
      });
    }
  }

  const departments = [...byDept.entries()]
    .map(([department, entry]) => ({
      department,
      paperCount: entry.paperCount,
      papers: entry.papers,
    }))
    .sort((a, b) => b.paperCount - a.paperCount || a.department.localeCompare(b.department));

  return { theme, query, totalPapers, departments };
}

export function suggestTaxonomyTerms(query: string, index: AtlasClusterIndex, limit = 12): TaxonomyEntry[] {
  const q = query.trim().toLowerCase();
  if (!q) {
    return [...index.themes.slice(0, 5), ...index.domains.slice(0, 3), ...index.subdomains.slice(0, 3), ...index.topics.slice(0, 3)].slice(
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
  if (type === "domain") return "Domain";
  if (type === "subdomain") return "Sub-domain";
  return "Topic";
}

export function matchLevelLabel(level: MatchLevel): string {
  if (level === "theme") return "Broad theme";
  if (level === "domain") return "Domain";
  if (level === "subdomain") return "Sub-domain";
  if (level === "topic") return "Topic / keyword";
  return "Paper title";
}

export function matchLevelColor(level: MatchLevel): string {
  if (level === "theme") return "#f87171";
  if (level === "domain") return "#818cf8";
  if (level === "subdomain") return "#fb923c";
  if (level === "topic") return "#facc15";
  return "#4ade80";
}
