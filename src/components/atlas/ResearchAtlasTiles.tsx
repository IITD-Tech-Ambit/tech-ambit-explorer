import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { CSS2DObject, CSS2DRenderer } from "three/examples/jsm/renderers/CSS2DRenderer.js";
import {
  Building2, Calendar, ChevronDown, ChevronRight, ExternalLink, Eye, Loader2, MousePointer2, RotateCcw, Search, Tag, User, Users, X, ZoomIn, ZoomOut,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  fetchAtlasTree, fetchAtlasDict, fetchAtlasPointCoords, searchAtlasIndices,
  tileObjectId, type AtlasTree, type AtlasDict, type AtlasPointCoord, type DecodedTile,
} from "./atlasTiles";
import { allNodeKeys, themeColorHex, TileManager } from "./atlasOctree";
import { themeDisplayName } from "./atlasClusters";
import {
  fetchKgAtlasDepartmentSearch, fetchKgAtlasFacultySearch, fetchKgAtlasSuggestSafe,
  fetchKgAtlasClusterBreakdown, fetchKgAtlasRefine, fetchKgFacultyAtlasIndices, fetchKgPaperMeta, type KgPaperMeta,
} from "./api";
import { getPaperExternalUrl } from "./paperLink";
import type {
  KgAtlasClusterBreakdown, KgAtlasDepartmentMatch, KgAtlasFacultyMatch, KgAtlasSuggestResult,
} from "./types";

const BG = "#000000";
const POINT_BUDGET = 250_000;
const MAX_IN_FLIGHT = 8;
const OVERLAY_CAP = 8000;

/** A point picked from a tile — carries what the detail panel + overlay need. */
export interface PickedPaper {
  i: number;
  id: string;
  title: string;
  theme: string;
  domain: string;
  citations: number;
  x: number;
  y: number;
  z: number;
}

const CLUSTER_LEVELS = ["topic", "subdomain", "domain", "theme"] as const;
type ClusterLevel = (typeof CLUSTER_LEVELS)[number];
type AtlasMode = "view" | "interactive";
type SearchEntity = "text" | "faculty" | "department";

function formatCount(n: number): string {
  return n.toLocaleString();
}

function formatThemeCountLabel(n: number): string {
  return `(${formatCount(n)} papers)`;
}

/** Place the text label outward from the cluster so a leader line can connect them. */
function themeLabelWorldPos(cx: number, cy: number, cz: number, themeIndex: number) {
  const dist = Math.hypot(cx, cy, cz) || 1;
  const nx = cx / dist;
  const ny = cy / dist;
  const nz = cz / dist;
  const clusterDist = dist * 1.02;
  const labelDist = dist * 1.52;
  const stagger = ((themeIndex % 5) - 2) * 0.04;
  let tx = ny * 0 - nz * 1;
  let ty = nz * 0 - nx * 0;
  let tz = nx * 1 - ny * 0;
  const tLen = Math.hypot(tx, ty, tz) || 1;
  tx = (tx / tLen) * stagger;
  ty = (ty / tLen) * stagger;
  tz = (tz / tLen) * stagger;
  return {
    clusterX: nx * clusterDist,
    clusterY: ny * clusterDist,
    clusterZ: nz * clusterDist,
    x: nx * labelDist + tx,
    y: ny * labelDist + ty,
    z: nz * labelDist + tz,
  };
}

type ThemeLabelEntry = {
  root: HTMLElement;
  titleEl: HTMLElement;
  countEl: HTMLElement;
  line: THREE.Line;
  tip: THREE.Mesh;
  fullCount: number;
  themeName: string;
};

function classifySearchEntity(
  q: string,
  faculty: KgAtlasFacultyMatch[],
  departments: KgAtlasDepartmentMatch[],
  picked: SuggestItem["group"] | null = null,
): SearchEntity {
  if (picked === "faculty" || picked === "department") return picked;
  const ql = q.trim().toLowerCase();
  if (!ql) return "text";
  if (departments.some((d) => d.department.toLowerCase() === ql)) return "department";
  if (faculty.some((f) => f.name.toLowerCase() === ql)) return "faculty";
  // Strong prefix match (typed partial department / faculty name)
  if (departments.some((d) => d.department.toLowerCase().startsWith(ql) && ql.length >= 4)) {
    return "department";
  }
  if (faculty.some((f) => f.name.toLowerCase().startsWith(ql) && ql.length >= 4)) {
    return "faculty";
  }
  return "text";
}

/** One row in the search suggestion dropdown (flattened for keyboard nav). */
interface SuggestItem {
  group: "theme" | "topic" | "faculty" | "department";
  label: string;
  sub: string;
  count: number;
}

const SUGGEST_BADGE: Record<SuggestItem["group"], { text: string; className: string }> = {
  theme: { text: "Theme", className: "bg-slate-800 text-cyan-400" },
  topic: { text: "Topic", className: "bg-slate-800 text-amber-300" },
  faculty: { text: "Faculty", className: "bg-violet-950 text-violet-300" },
  department: { text: "Department", className: "bg-emerald-950 text-emerald-300" },
};

function flattenSuggestions(result: KgAtlasSuggestResult): SuggestItem[] {
  const items: SuggestItem[] = [];
  for (const t of result.themes) {
    items.push({ group: "theme", label: t.label, sub: "", count: t.paperCount });
  }
  for (const t of result.topics) {
    items.push({ group: "topic", label: t.label, sub: "", count: t.paperCount });
  }
  for (const f of result.faculty) {
    items.push({ group: "faculty", label: f.name, sub: f.department, count: f.paperCount });
  }
  for (const d of result.departments) {
    items.push({
      group: "department", label: d.department,
      sub: `${formatCount(d.facultyCount)} faculty`, count: d.paperCount,
    });
  }
  return items;
}

/** Build department list for a theme from the current search overlay points. */
function buildThemeBreakdownFromOverlay(
  theme: string,
  query: string,
  points: AtlasPointCoord[],
  paperLimit = 200,
): KgAtlasClusterBreakdown {
  const inTheme = points.filter((p) => p.theme === theme);
  const byDept = new Map<string, { paperCount: number; papers: KgAtlasClusterBreakdown["departments"][0]["papers"] }>();

  for (const p of inTheme) {
    const dept = (p.department || "").trim() || "Unassigned";
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
        title: p.title || "Untitled",
        domain: "",
        topic: "",
        citations: 0,
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

  return { theme, query, totalPapers: inTheme.length, departments };
}

function ThemeClusterPanel({
  theme, query, breakdown, loading, themeColor, onClose, onPaperClick,
}: {
  theme: string;
  query: string;
  breakdown: KgAtlasClusterBreakdown | null;
  loading: boolean;
  themeColor: string;
  onClose: () => void;
  onPaperClick: (paper: PickedPaper) => void;
}) {
  const [openDept, setOpenDept] = useState<string | null>(null);
  const [deptFilter, setDeptFilter] = useState("");
  const q = deptFilter.trim().toLowerCase();
  const depts = (breakdown?.departments ?? []).filter((d) =>
    !q || d.department.toLowerCase().includes(q),
  );

  return (
    <aside className="absolute top-0 right-0 bottom-0 z-40 w-full sm:w-[420px] border-l border-slate-700/60 bg-slate-950/95 backdrop-blur-md overflow-y-auto shadow-2xl">
      <div className="sticky top-0 z-10 flex items-center justify-between gap-2 px-4 py-3 border-b border-slate-700/60 bg-slate-950/95">
        <span className="text-xs font-semibold uppercase tracking-wide text-cyan-400/90">Theme cluster</span>
        <Button type="button" size="icon" variant="ghost" onClick={onClose}
          className="h-8 w-8 text-slate-400 hover:text-white hover:bg-slate-800" aria-label="Close">
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="p-4 space-y-4">
        <div className="rounded-xl border p-3"
          style={{ borderColor: `${themeColor}55`, backgroundColor: `${themeColor}12` }}>
          <div className="flex items-start gap-2">
            <span className="mt-1 h-3 w-3 shrink-0 rounded-full"
              style={{ backgroundColor: themeColor, boxShadow: `0 0 8px ${themeColor}` }} />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-white leading-snug">{theme}</p>
              <p className="mt-1 text-xs text-slate-400">
                Papers matching “{query}” in this theme
                {breakdown ? ` · ${formatCount(breakdown.totalPapers)} total` : ""}
              </p>
            </div>
          </div>
        </div>

        <Input value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)}
          placeholder="Filter departments…"
          className="h-9 rounded-lg border-slate-700 bg-slate-900/80 text-sm text-white placeholder:text-slate-500" />

        {loading && (
          <div className="flex items-center gap-2 text-sm text-slate-400 py-4">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading departments…
          </div>
        )}

        {!loading && breakdown && depts.length === 0 && (
          <p className="text-sm text-slate-500">No departments found for this theme and search.</p>
        )}

        {!loading && breakdown && depts.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 flex items-center gap-1">
              <Building2 className="h-3.5 w-3.5" />
              Departments ({depts.length})
            </p>
            {depts.map((dept) => {
              const isOpen = openDept === dept.department;
              return (
                <div key={dept.department}
                  className="rounded-xl border border-slate-700/50 bg-slate-900/40 overflow-hidden">
                  <button type="button"
                    onClick={() => setOpenDept(isOpen ? null : dept.department)}
                    className="flex w-full items-center gap-2 px-3 py-2.5 text-left hover:bg-slate-800/50 transition-colors">
                    <ChevronDown className={cn(
                      "h-4 w-4 shrink-0 text-slate-500 transition-transform",
                      isOpen && "rotate-180",
                    )} />
                    <span className="flex-1 min-w-0 text-sm font-medium text-slate-200 truncate">
                      {dept.department}
                    </span>
                    <span className="shrink-0 text-xs text-slate-500">
                      {formatCount(dept.paperCount)} papers
                    </span>
                  </button>
                  {isOpen && (
                    <ul className="border-t border-slate-800/80 px-2 py-2 space-y-1 max-h-64 overflow-y-auto">
                      {dept.papers.map((p) => (
                        <li key={p.id || String(p.i)}>
                          <button type="button"
                            onClick={() => onPaperClick({
                              i: p.i,
                              id: p.id,
                              title: p.title,
                              theme,
                              domain: p.domain,
                              citations: p.citations,
                              x: 0, y: 0, z: 0,
                            })}
                            className="w-full rounded-lg px-2 py-2 text-left hover:bg-slate-800/70 transition-colors">
                            <span className="block text-xs text-white leading-snug line-clamp-2">{p.title}</span>
                            {p.topic && (
                              <span className="block mt-0.5 text-[10px] text-slate-500 truncate">{p.topic}</span>
                            )}
                          </button>
                        </li>
                      ))}
                      {dept.paperCount > dept.papers.length && (
                        <li className="px-2 py-1 text-[10px] text-slate-500">
                          Showing {formatCount(dept.papers.length)} of {formatCount(dept.paperCount)} papers
                        </li>
                      )}
                    </ul>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </aside>
  );
}

function PaperPanel({
  paper, detail, detailLoading, activeLevel, onLevelChange, onClose,
}: {
  paper: PickedPaper;
  detail: KgPaperMeta | null;
  detailLoading: boolean;
  activeLevel: ClusterLevel | null;
  onLevelChange: (level: ClusterLevel, value: string) => void;
  onClose: () => void;
}) {
  const linkMeta = detail ? getPaperExternalUrl(detail) : null;
  const citations = detail?.citation_count ?? paper.citations;
  const year = detail?.publication_year;
  const tags: { label: string; type: ClusterLevel }[] = [
    { label: paper.theme, type: "theme" },
    { label: paper.domain, type: "domain" },
  ].filter((t) => t.label) as { label: string; type: ClusterLevel }[];

  return (
    <aside className="absolute top-0 right-0 bottom-0 z-40 w-full sm:w-[400px] border-l border-slate-700/60 bg-slate-950/95 backdrop-blur-md overflow-y-auto shadow-2xl">
      <div className="sticky top-0 z-10 flex items-center justify-between gap-2 px-4 py-3 border-b border-slate-700/60 bg-slate-950/95">
        <span className="text-xs font-semibold uppercase tracking-wide text-cyan-400/90">Paper details</span>
        <Button type="button" size="icon" variant="ghost" onClick={onClose}
          className="h-8 w-8 text-slate-400 hover:text-white hover:bg-slate-800" aria-label="Close">
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="p-4 space-y-4">
        <div className="rounded-xl border border-cyan-500/25 bg-cyan-950/20 p-3">
          <p className="text-[10px] uppercase tracking-wide text-cyan-400/80 mb-2">Highlight related papers</p>
          <div className="flex flex-wrap gap-1.5">
            {tags.map((t) => (
              <button key={t.type} type="button" onClick={() => onLevelChange(t.type, t.label)}
                className={cn(
                  "inline-flex items-center gap-1 rounded-full border px-3 py-1 text-[11px] transition-colors",
                  activeLevel === t.type
                    ? "border-cyan-400/60 bg-cyan-950/50 text-cyan-100"
                    : "border-slate-600/50 bg-slate-900/80 text-slate-300 hover:border-cyan-500/40 hover:text-white",
                )}>
                <Tag className="h-3 w-3 text-cyan-400/80" />
                <span className="text-slate-500 mr-0.5">{t.type}:</span>{t.label}
              </button>
            ))}
          </div>
        </div>

        <h2 className="text-base font-semibold text-white leading-snug">
          {detail?.title || paper.title || "Loading title…"}
        </h2>

        {!detailLoading && (detail?.iitd_faculty?.length ?? 0) > 0 && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2 flex items-center gap-1">
              <User className="h-3.5 w-3.5" /> IIT Delhi faculty
            </p>
            <ul className="space-y-2">
              {detail!.iitd_faculty!.map((f) => (
                <li key={f.facultyId}>
                  {f.kerberos ? (
                    <a href={`/faculty/${f.kerberos}`} target="_blank" rel="noopener noreferrer"
                      className="block rounded-lg border border-cyan-500/30 bg-cyan-950/30 px-3 py-2 hover:bg-cyan-950/50 transition-colors">
                      <span className="font-medium text-cyan-200">{f.name}</span>
                      {f.department && <span className="block text-xs text-slate-400 mt-0.5">{f.department}</span>}
                    </a>
                  ) : (
                    <div className="rounded-lg border border-slate-700/50 bg-slate-900/50 px-3 py-2">
                      <span className="font-medium text-white">{f.name}</span>
                      {f.department && <span className="block text-xs text-slate-400 mt-0.5">{f.department}</span>}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-lg border border-slate-700/50 bg-slate-900/50 px-3 py-2">
            <p className="text-xs text-slate-500">Citations</p>
            <p className="font-semibold text-cyan-300">{citations}</p>
          </div>
          {year != null && (
            <div className="rounded-lg border border-slate-700/50 bg-slate-900/50 px-3 py-2">
              <p className="text-xs text-slate-500 flex items-center gap-1"><Calendar className="h-3 w-3" /> Year</p>
              <p className="font-semibold text-white">{year}</p>
            </div>
          )}
        </div>

        {detailLoading && (
          <div className="flex items-center gap-2 text-sm text-slate-400 py-2">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading full details…
          </div>
        )}

        {!detailLoading && (detail?.authors?.length ?? 0) > 0 && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2 flex items-center gap-1">
              <Users className="h-3.5 w-3.5" /> Authors
            </p>
            <p className="text-sm text-slate-300 leading-relaxed">
              {detail!.authors!.map((a) => a.name).filter(Boolean).join(", ")}
            </p>
          </div>
        )}

        {linkMeta && (
          <a href={linkMeta.href} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold text-sm px-4 py-2.5 transition-colors">
            <ExternalLink className="h-4 w-4" /> {linkMeta.label}
          </a>
        )}
      </div>
    </aside>
  );
}

export default function ResearchAtlasTiles() {
  const [searchParams] = useSearchParams();
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const engineRef = useRef<{
    renderer: THREE.WebGLRenderer;
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    controls: OrbitControls;
    labelRenderer: CSS2DRenderer;
    tileManager: TileManager;
    tileGroup: THREE.Group;
    overlay: THREE.Points;
    overlayGeom: THREE.BufferGeometry;
    overlayMat: THREE.ShaderMaterial;
    baseMaterial: THREE.ShaderMaterial;
    marker: THREE.Mesh;
    labelByTheme: Map<string, ThemeLabelEntry>;
    frameId: number;
    dirty: boolean;
    lastStream: number;
  } | null>(null);

  const treeRef = useRef<AtlasTree | null>(null);
  const dictRef = useRef<AtlasDict | null>(null);
  const overlayIndicesRef = useRef<number[]>([]);
  const overlayPointsRef = useRef<AtlasPointCoord[]>([]);
  const filterActiveRef = useRef(false);
  /** Full result of the primary search — refine filters within this set. */
  const basePointsRef = useRef<AtlasPointCoord[]>([]);
  const baseIndicesRef = useRef<Set<number>>(new Set());

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [refineQuery, setRefineQuery] = useState("");
  const [refineSearchQuery, setRefineSearchQuery] = useState("");
  const [searchLoading, setSearchLoading] = useState(false);
  const [baseMatchCount, setBaseMatchCount] = useState(0);
  const [matchCount, setMatchCount] = useState(0);
  const [hovered, setHovered] = useState<PickedPaper | null>(null);
  const [selected, setSelected] = useState<PickedPaper | null>(null);
  const [detail, setDetail] = useState<KgPaperMeta | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [activeLevel, setActiveLevel] = useState<ClusterLevel | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const [cursor, setCursor] = useState("grab");
  const [contextLost, setContextLost] = useState(false);
  const [rendererEpoch, setRendererEpoch] = useState(0);
  const [atlasReady, setAtlasReady] = useState(false);
  const [atlasMode, setAtlasMode] = useState<AtlasMode>("interactive");
  const [suggestOpen, setSuggestOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<KgAtlasSuggestResult | null>(null);
  const [suggestActive, setSuggestActive] = useState(-1);
  const [refineItems, setRefineItems] = useState<SuggestItem[]>([]);
  const [clusterTheme, setClusterTheme] = useState<string | null>(null);
  const [clusterBreakdown, setClusterBreakdown] = useState<KgAtlasClusterBreakdown | null>(null);
  const [clusterLoading, setClusterLoading] = useState(false);
  const [filterThemeCounts, setFilterThemeCounts] = useState<{ theme: string; count: number; color: string }[]>([]);
  const [primaryEntity, setPrimaryEntity] = useState<SearchEntity>("text");
  const [refineEntity, setRefineEntity] = useState<SearchEntity | null>(null);
  const searchBoxRef = useRef<HTMLDivElement>(null);
  const onThemeLabelClickRef = useRef<(theme: string) => void>(() => {});
  const primaryPickRef = useRef<"faculty" | "department" | null>(null);
  const refinePickRef = useRef<"faculty" | "department" | null>(null);
  const themesClickableRef = useRef(true);
  const viewOnlyRef = useRef(false);

  const isViewMode = atlasMode === "view";

  useEffect(() => {
    viewOnlyRef.current = isViewMode;
  }, [isViewMode]);

  const markDirty = useCallback(() => {
    if (engineRef.current) engineRef.current.dirty = true;
  }, []);

  // The whole cloud is small (~66k points, ~1-2 MB of binary tiles), so we load
  // every node up front for a dense view identical to the original renderer.
  const streamNow = useCallback(() => {
    const e = engineRef.current;
    const tree = treeRef.current;
    if (!e || !tree) return;
    e.tileManager.update(allNodeKeys(tree));
  }, []);

  const syncThemeLabelPresentation = useCallback((filterActive: boolean, _clickable: boolean) => {
    const e = engineRef.current;
    if (!e) return;
    for (const [, entry] of e.labelByTheme) {
      const { root, titleEl, countEl, themeName } = entry;
      // Labels must never capture clicks — papers stay clickable under/near them.
      root.style.pointerEvents = "none";
      titleEl.style.pointerEvents = "none";
      countEl.style.pointerEvents = "none";
      root.style.transform = "translate(-6px,-50%)";
      root.style.display = "flex";
      root.style.flexDirection = "column";
      root.style.alignItems = "flex-start";
      root.style.gap = "2px";
      root.style.whiteSpace = "nowrap";

      titleEl.style.display = "block";
      titleEl.textContent = themeDisplayName(themeName);
      titleEl.style.fontSize = filterActive ? "11px" : "12px";
      titleEl.style.textDecoration = "none";
      titleEl.style.cursor = "default";

      countEl.style.display = "block";
      countEl.style.fontSize = filterActive ? "9px" : "10px";
      countEl.style.color = "#94a3b8";
    }
  }, []);

  const applyThemeLabelCounts = useCallback((counts: Record<string, number> | null) => {
    const e = engineRef.current;
    if (!e) return;
    const filterActive = counts != null;
    filterActiveRef.current = filterActive;
    for (const [theme, entry] of e.labelByTheme) {
      const n = counts ? (counts[theme] ?? 0) : entry.fullCount;
      entry.countEl.textContent = formatThemeCountLabel(n);
      // Hide only themes with zero matches while filtering.
      const hide = Boolean(counts && n === 0);
      entry.root.style.display = hide ? "none" : "flex";
      entry.root.style.opacity = hide ? "0" : "1";
      entry.line.visible = !hide;
      entry.tip.visible = !hide;
    }
    syncThemeLabelPresentation(filterActive, themesClickableRef.current);
  }, [syncThemeLabelPresentation]);

  const rebuildOverlay = useCallback((points: AtlasPointCoord[]) => {
    const e = engineRef.current;
    const dict = dictRef.current;
    if (!e) return;

    const n = points.length;
    const positions = new Float32Array(n * 3);
    const colors = new Float32Array(n * 3);
    const tmp = new THREE.Color();
    const counts: Record<string, number> = {};

    for (let k = 0; k < n; k++) {
      const p = points[k];
      positions[k * 3] = p.x;
      positions[k * 3 + 1] = p.y;
      positions[k * 3 + 2] = p.z;
      const themeId = dict ? dict.themes.indexOf(p.theme) : -1;
      tmp.set(themeColorHex(themeId >= 0 ? themeId : 0));
      colors[k * 3] = tmp.r;
      colors[k * 3 + 1] = tmp.g;
      colors[k * 3 + 2] = tmp.b;
      if (p.theme) counts[p.theme] = (counts[p.theme] ?? 0) + 1;
    }

    e.overlayGeom.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    e.overlayGeom.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    e.overlayGeom.setDrawRange(0, n);
    e.overlay.visible = n > 0;
    // Hide the full atlas cloud while filtering so only matched papers show.
    e.tileGroup.visible = n === 0;
    e.baseMaterial.uniforms.uDim.value = 1.0;

    overlayPointsRef.current = points;
    if (n > 0) {
      applyThemeLabelCounts(counts);
      const dictThemes = dict?.themes ?? [];
      setFilterThemeCounts(
        Object.entries(counts)
          .filter(([, c]) => c > 0)
          .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
          .map(([theme, count]) => {
            const id = dictThemes.indexOf(theme);
            return { theme, count, color: themeColorHex(id >= 0 ? id : 0) };
          }),
      );
    } else {
      applyThemeLabelCounts(null);
      setFilterThemeCounts([]);
    }
    markDirty();
  }, [markDirty, applyThemeLabelCounts]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([fetchAtlasTree(), fetchAtlasDict()])
      .then(([tree, dict]) => {
        if (cancelled) return;
        treeRef.current = tree;
        dictRef.current = dict;
      })
      .catch((err) => { if (!cancelled) setError(String(err?.message || err)); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const theme = searchParams.get("theme")?.trim();
    if (theme) {
      setQuery("");
      setSearchQuery(theme);
    }
  }, [searchParams]);

  const hasSearched = Boolean(searchQuery.trim());

  // Typeahead: primary suggest when idle; refine suggest when already searching.
  useEffect(() => {
    if (!suggestOpen || loading || hasSearched) return;
    let cancelled = false;
    fetchKgAtlasSuggestSafe(query.trim())
      .then((result) => { if (!cancelled) setSuggestions(result); })
      .catch(() => {
        if (!cancelled) {
          setSuggestions({ query: query.trim(), themes: [], topics: [], faculty: [], departments: [] });
        }
      });
    return () => { cancelled = true; };
  }, [query, suggestOpen, loading, hasSearched]);

  useEffect(() => {
    if (!suggestOpen) return;
    const onPointerDown = (ev: PointerEvent) => {
      if (!searchBoxRef.current?.contains(ev.target as Node)) setSuggestOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [suggestOpen]);

  const suggestItems = useMemo(
    () => (suggestions ? flattenSuggestions(suggestions) : []),
    [suggestions],
  );

  const dropdownItems = hasSearched ? refineItems : suggestItems;

  useEffect(() => { setSuggestActive(-1); }, [dropdownItems]);

  const applyPrimarySearch = useCallback((term: string, pick: "faculty" | "department" | null = null) => {
    const t = term.trim();
    if (!t) return;
    primaryPickRef.current = pick;
    refinePickRef.current = null;
    setSearchQuery(t);
    setQuery("");
    setRefineQuery("");
    setRefineSearchQuery("");
    setSuggestOpen(false);
    setActiveLevel(null);
    setSelected(null);
    setClusterTheme(null);
    setClusterBreakdown(null);
  }, []);

  const applyRefineSearch = useCallback((term: string, pick: "faculty" | "department" | null = null) => {
    const t = term.trim();
    if (!t || !searchQuery.trim()) return;
    refinePickRef.current = pick;
    setRefineQuery(t);
    setRefineSearchQuery(t);
    setQuery("");
    setSuggestOpen(false);
    setSelected(null);
    setClusterTheme(null);
    setClusterBreakdown(null);
  }, [searchQuery]);

  const submitSearch = useCallback(() => {
    const term = query.trim();
    if (!term) return;
    if (!hasSearched) applyPrimarySearch(term);
    else applyRefineSearch(term);
  }, [query, hasSearched, applyPrimarySearch, applyRefineSearch]);

  const pickSuggestion = useCallback((item: SuggestItem) => {
    const pick = item.group === "faculty" || item.group === "department" ? item.group : null;
    if (!hasSearched) applyPrimarySearch(item.label, pick);
    else applyRefineSearch(item.label, pick);
  }, [hasSearched, applyPrimarySearch, applyRefineSearch]);

  const onSearchKeyDown = useCallback((ev: React.KeyboardEvent<HTMLInputElement>) => {
    if (ev.key === "Escape") { setSuggestOpen(false); return; }
    if (!suggestOpen || !dropdownItems.length) return;
    if (ev.key === "ArrowDown") {
      ev.preventDefault();
      setSuggestActive((i) => (i + 1) % dropdownItems.length);
    } else if (ev.key === "ArrowUp") {
      ev.preventDefault();
      setSuggestActive((i) => (i <= 0 ? dropdownItems.length - 1 : i - 1));
    } else if (ev.key === "Enter" && suggestActive >= 0) {
      ev.preventDefault();
      pickSuggestion(dropdownItems[suggestActive]);
    }
  }, [suggestOpen, dropdownItems, suggestActive, pickSuggestion]);

  // Primary search — stores the base set that nested refine filters within.
  useEffect(() => {
    let cancelled = false;
    const q = searchQuery.trim();
    if (!q || loading || !atlasReady) {
      if (!q || loading) {
        basePointsRef.current = [];
        baseIndicesRef.current = new Set();
        overlayIndicesRef.current = [];
        setBaseMatchCount(0);
        setMatchCount(0);
        setRefineQuery("");
        setRefineSearchQuery("");
        setPrimaryEntity("text");
        setRefineEntity(null);
        primaryPickRef.current = null;
        refinePickRef.current = null;
        rebuildOverlay([]);
        setClusterTheme(null);
        setClusterBreakdown(null);
      }
      return;
    }
    setSearchLoading(true);
    setRefineQuery("");
    setRefineSearchQuery("");
    setRefineEntity(null);
    refinePickRef.current = null;
    (async () => {
      const union = new Set<number>();
      try {
        const [textIdx, fac, dept] = await Promise.all([
          searchAtlasIndices(q, OVERLAY_CAP).catch(() => []),
          fetchKgAtlasFacultySearch(q).catch(() => ({ matches: [], indices: [] as number[] })),
          fetchKgAtlasDepartmentSearch(q).catch(() => ({ matches: [], indices: [] as number[] })),
        ]);
        if (cancelled) return;
        for (const i of textIdx) union.add(i);
        for (const i of fac.indices) union.add(i);
        for (const i of dept.indices) union.add(i);
        setPrimaryEntity(classifySearchEntity(
          q, fac.matches ?? [], dept.matches ?? [], primaryPickRef.current,
        ));

        const indices = [...union].slice(0, OVERLAY_CAP);
        const coords = await fetchAtlasPointCoords(indices);
        if (cancelled) return;
        const points = indices.map((i) => coords.get(i)).filter((p): p is AtlasPointCoord => !!p);
        basePointsRef.current = points;
        baseIndicesRef.current = new Set(points.map((p) => p.i));
        overlayIndicesRef.current = points.map((p) => p.i);
        setBaseMatchCount(points.length);
        setMatchCount(points.length);
        rebuildOverlay(points);
      } finally {
        if (!cancelled) setSearchLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [searchQuery, loading, rebuildOverlay, atlasReady]);

  // Nested refine — authoritative server intersection within the primary query.
  useEffect(() => {
    let cancelled = false;
    const base = basePointsRef.current;
    const rq = refineSearchQuery.trim();
    const baseQ = searchQuery.trim();

    if (!baseQ || !base.length) return;

    if (!rq) {
      overlayIndicesRef.current = base.map((p) => p.i);
      setMatchCount(base.length);
      setRefineEntity(null);
      rebuildOverlay(base);
      return;
    }

    setSearchLoading(true);
    (async () => {
      try {
        const result = await fetchKgAtlasRefine(baseQ, rq, OVERLAY_CAP);
        if (cancelled) return;

        const points: AtlasPointCoord[] = (result.points ?? []).map((p) => ({
          i: p.i,
          id: p.id || "",
          title: p.title || "",
          theme: p.theme || "",
          department: p.department || "",
          x: p.x,
          y: p.y,
          z: p.z,
        }));

        overlayIndicesRef.current = points.map((p) => p.i);
        setMatchCount(result.matchCount ?? points.length);
        if (typeof result.baseCount === "number" && result.baseCount > 0) {
          setBaseMatchCount(result.baseCount);
        }

        const rqLower = rq.toLowerCase();
        const deptNames = [...new Set(
          points.map((p) => (p.department || "").trim()).filter(Boolean),
        )];
        const deptForClassify = deptNames.map((department) => ({
          department,
          facultyCount: 0,
          atlasCount: points.filter((p) => (p.department || "").trim() === department).length,
        }));
        let entity = classifySearchEntity(rq, [], deptForClassify, refinePickRef.current);
        if (entity === "text" && deptNames.some((n) => n.toLowerCase() === rqLower)) {
          entity = "department";
        }
        setRefineEntity(entity);

        rebuildOverlay(points);
      } catch {
        if (cancelled) return;
        // Fallback: keep showing the primary base set if refine API fails.
        overlayIndicesRef.current = base.map((p) => p.i);
        setMatchCount(base.length);
        setRefineEntity(null);
        rebuildOverlay(base);
      } finally {
        if (!cancelled) setSearchLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [refineSearchQuery, searchQuery, baseMatchCount, rebuildOverlay]);

  // Refine suggestions scoped to departments / faculty inside the primary result set.
  useEffect(() => {
    if (!suggestOpen || !hasSearched || !basePointsRef.current.length) {
      setRefineItems([]);
      return;
    }
    let cancelled = false;
    const rq = query.trim().toLowerCase();
    const base = basePointsRef.current;
    const baseSet = baseIndicesRef.current;

    const deptCounts = new Map<string, number>();
    for (const p of base) {
      const name = (p.department || "").trim() || "Unassigned";
      if (rq && !name.toLowerCase().includes(rq)) continue;
      deptCounts.set(name, (deptCounts.get(name) ?? 0) + 1);
    }
    const deptItems: SuggestItem[] = [...deptCounts.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, 8)
      .map(([label, count]) => ({
        group: "department" as const,
        label,
        sub: "in current results",
        count,
      }));

    (async () => {
      if (!rq) {
        if (!cancelled) setRefineItems(deptItems);
        return;
      }
      try {
        const fac = await fetchKgAtlasFacultySearch(rq, 20).catch(() => ({ matches: [], indices: [] as number[] }));
        if (cancelled) return;
        const facItems: SuggestItem[] = [];
        for (const f of fac.matches ?? []) {
          facItems.push({
            group: "faculty",
            label: f.name,
            sub: f.department || "in current results",
            count: f.paperCount ?? 0,
          });
        }
        const withCounts: SuggestItem[] = [];
        await Promise.all(facItems.slice(0, 10).map(async (item) => {
          const match = (fac.matches ?? []).find((f) => f.name === item.label);
          if (!match) return;
          try {
            const res = await fetchKgFacultyAtlasIndices([match.facultyId]);
            const n = (res.indices ?? []).filter((i) => baseSet.has(i)).length;
            if (n > 0) withCounts.push({ ...item, count: n, sub: match.department || "in current results" });
          } catch { /* skip */ }
        }));
        if (!cancelled) {
          setRefineItems([
            ...deptItems.slice(0, 6),
            ...withCounts.sort((a, b) => b.count - a.count).slice(0, 6),
          ]);
        }
      } catch {
        if (!cancelled) setRefineItems(deptItems);
      }
    })();
    return () => { cancelled = true; };
  }, [suggestOpen, query, hasSearched, baseMatchCount]);

  useEffect(() => {
    if (!selected) { setDetail(null); return; }
    setDetailLoading(true);
    fetchKgPaperMeta(selected.id)
      .then(setDetail)
      .catch(() => setDetail(null))
      .finally(() => setDetailLoading(false));
  }, [selected]);

  const handleLevelChange = useCallback((level: ClusterLevel, value: string) => {
    setActiveLevel((prev) => (prev === level ? null : level));
    const applied = activeLevel === level ? "" : value;
    if (!applied) {
      setQuery(""); setSearchQuery("");
      setRefineQuery(""); setRefineSearchQuery("");
      return;
    }
    setQuery(applied);
    setSearchQuery(applied);
    setRefineQuery("");
    setRefineSearchQuery("");
  }, [activeLevel]);

  useEffect(() => {
    if (loading || error || !treeRef.current || !dictRef.current) return;
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const width = container.clientWidth;
    const height = container.clientHeight;
    const tree = treeRef.current;
    const dict = dictRef.current;

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    renderer.setClearColor(BG, 1);

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(BG, 0.05);

    const camera = new THREE.PerspectiveCamera(55, width / height, 0.01, 100);
    camera.position.set(0, 0, 2.4);

    const controls = new OrbitControls(camera, canvas);
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controls.rotateSpeed = 0.45;
    controls.zoomSpeed = 0.8;
    controls.minDistance = 0.2;
    controls.maxDistance = 6;

    const baseMaterial = new THREE.ShaderMaterial({
      uniforms: { uSize: { value: 0.022 }, uDim: { value: 1.0 } },
      vertexShader: `
        attribute vec3 color; uniform float uSize; varying vec3 vColor;
        void main() {
          vColor = color;
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = uSize * (300.0 / -mv.z);
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: `
        varying vec3 vColor; uniform float uDim;
        void main() {
          vec2 c = gl_PointCoord - vec2(0.5);
          float d = length(c);
          if (d > 0.5) discard;
          float edge = smoothstep(0.5, 0.12, d);
          gl_FragColor = vec4(vColor, 0.92 * uDim * edge);
        }`,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    });

    const group = new THREE.Group();
    scene.add(group);
    const tileManager = new TileManager(tree, group, baseMaterial, POINT_BUDGET, MAX_IN_FLIGHT, () => {
      if (engineRef.current) engineRef.current.dirty = true;
    });

    const overlayGeom = new THREE.BufferGeometry();
    overlayGeom.setAttribute("position", new THREE.BufferAttribute(new Float32Array(0), 3));
    overlayGeom.setAttribute("color", new THREE.BufferAttribute(new Float32Array(0), 3));
    const overlayMat = new THREE.ShaderMaterial({
      uniforms: { uSize: { value: 0.07 } },
      vertexShader: `
        attribute vec3 color;
        varying vec3 vColor;
        uniform float uSize;
        void main() {
          vColor = color;
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = uSize * (300.0 / -mv.z);
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: `
        varying vec3 vColor;
        void main() {
          vec2 c = gl_PointCoord - vec2(0.5);
          float d = length(c);
          if (d > 0.5) discard;
          float edge = smoothstep(0.5, 0.15, d);
          gl_FragColor = vec4(vColor, 0.95 * edge);
        }`,
      transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending,
    });
    const overlay = new THREE.Points(overlayGeom, overlayMat);
    overlay.frustumCulled = false;
    overlay.visible = false;
    overlay.renderOrder = 2;
    scene.add(overlay);

    const marker = new THREE.Mesh(
      new THREE.SphereGeometry(0.02, 12, 12),
      new THREE.MeshBasicMaterial({ color: "#67e8f9", transparent: true, opacity: 0.95, depthTest: false }),
    );
    marker.visible = false;
    marker.renderOrder = 3;
    scene.add(marker);

    const labelRenderer = new CSS2DRenderer();
    labelRenderer.setSize(width, height);
    labelRenderer.domElement.style.position = "absolute";
    labelRenderer.domElement.style.inset = "0";
    labelRenderer.domElement.style.pointerEvents = "none";
    labelRenderer.domElement.style.zIndex = "5";
    container.appendChild(labelRenderer.domElement);

    const labelObjs: CSS2DObject[] = [];
    const labelExtras: Array<THREE.Object3D> = [];
    const labelByTheme = new Map<string, ThemeLabelEntry>();
    dict.themes.forEach((themeName, themeId) => {
      const anchor = dict.themeAnchors.find((a) => a.theme === themeName);
      if (!anchor) return;
      const color = themeColorHex(themeId);
      const pos = themeLabelWorldPos(anchor.x, anchor.y, anchor.z, themeId);

      const root = document.createElement("div");
      root.style.cssText = [
        "pointer-events:none",
        "user-select:none",
        "transform:translate(-6px,-50%)",
        "display:flex",
        "flex-direction:column",
        "align-items:flex-start",
        "gap:2px",
        "white-space:nowrap",
        "text-align:left",
      ].join(";");

      const titleEl = document.createElement("span");
      titleEl.dataset.theme = themeName;
      titleEl.title = themeName;
      titleEl.style.cssText = [
        "pointer-events:none",
        "display:block",
        "font-size:12px",
        "font-weight:600",
        `color:${color}`,
        "line-height:1.25",
        "letter-spacing:0.01em",
        "text-shadow:0 0 8px rgba(0,0,0,0.95),0 1px 3px rgba(0,0,0,0.9)",
      ].join(";");
      titleEl.textContent = themeDisplayName(themeName);

      const countEl = document.createElement("span");
      countEl.style.cssText = [
        "pointer-events:none",
        "display:block",
        "font-size:10px",
        "color:#94a3b8",
        "font-weight:500",
        "line-height:1.2",
        "text-shadow:0 0 6px rgba(0,0,0,0.95),0 1px 2px rgba(0,0,0,0.85)",
      ].join(";");
      countEl.textContent = formatThemeCountLabel(anchor.count);

      root.appendChild(titleEl);
      root.appendChild(countEl);

      const cluster = new THREE.Vector3(pos.clusterX, pos.clusterY, pos.clusterZ);
      const labelAt = new THREE.Vector3(pos.x, pos.y, pos.z);
      const line = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints([cluster, labelAt]),
        new THREE.LineBasicMaterial({
          color,
          transparent: true,
          opacity: 0.72,
          depthWrite: false,
        }),
      );
      line.renderOrder = 4;

      const tip = new THREE.Mesh(
        new THREE.SphereGeometry(0.018, 10, 10),
        new THREE.MeshBasicMaterial({
          color,
          transparent: true,
          opacity: 0.95,
          depthWrite: false,
          depthTest: false,
        }),
      );
      tip.position.copy(cluster);
      tip.renderOrder = 4;
      tip.userData.isThemeTip = true;
      tip.userData.theme = themeName;

      const obj = new CSS2DObject(root);
      obj.position.copy(labelAt);
      scene.add(obj);
      scene.add(line);
      scene.add(tip);
      labelObjs.push(obj);
      labelExtras.push(line, tip);
      labelByTheme.set(themeName, {
        root,
        titleEl,
        countEl,
        line,
        tip,
        fullCount: anchor.count,
        themeName,
      });
    });

    const raycaster = new THREE.Raycaster();
    // Larger threshold so sparse filtered paper dots remain easy to click.
    raycaster.params.Points = { threshold: 0.08 };
    const mouse = new THREE.Vector2();
    const themeTips = Array.from(labelByTheme.values()).map((e) => e.tip);

    const pickThemeTip = (clientX: number, clientY: number): string | null => {
      if (!themesClickableRef.current) return null;
      const rect = canvas.getBoundingClientRect();
      mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(mouse, camera);
      const hits = raycaster.intersectObjects(themeTips, false);
      for (const hit of hits) {
        if (hit.object.userData?.isThemeTip && hit.object.visible) {
          return String(hit.object.userData.theme || "");
        }
      }
      return null;
    };

    const pick = (clientX: number, clientY: number): PickedPaper | null => {
      const rect = canvas.getBoundingClientRect();
      mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(mouse, camera);

      // While a filter is active the base cloud is hidden — pick from the overlay.
      if (overlay.visible && overlayPointsRef.current.length) {
        raycaster.params.Points = { threshold: 0.1 };
        const hits = raycaster.intersectObject(overlay);
        raycaster.params.Points = { threshold: 0.08 };
        if (hits.length && hits[0].index != null) {
          const p = overlayPointsRef.current[hits[0].index];
          if (p) {
            return {
              i: p.i,
              id: p.id,
              title: p.title || "",
              theme: p.theme,
              domain: "",
              citations: 0,
              x: p.x,
              y: p.y,
              z: p.z,
            };
          }
        }
        return null;
      }

      const hits = raycaster.intersectObjects(tileManager.objects);
      for (const hit of hits) {
        if (hit.index == null) continue;
        const tile = tileManager.tileFor(hit.object as THREE.Points);
        if (!tile) continue;
        return buildPicked(tile, hit.index, dict);
      }
      return null;
    };

    let hoverFrame = 0;
    const onMove = (ev: MouseEvent) => {
      if (viewOnlyRef.current) {
        setHovered(null);
        setCursor("grab");
        return;
      }
      hoverFrame++;
      if (hoverFrame % 2 !== 0) return;
      const rect = container.getBoundingClientRect();
      setTooltipPos({ x: ev.clientX - rect.left, y: ev.clientY - rect.top });
      const paper = pick(ev.clientX, ev.clientY);
      if (paper) {
        setHovered(paper);
        setCursor("pointer");
        return;
      }
      setHovered(null);
      setCursor(pickThemeTip(ev.clientX, ev.clientY) ? "pointer" : "grab");
    };
    const onClick = (ev: MouseEvent) => {
      if (viewOnlyRef.current) return;
      // Prefer paper hits so labels/tips never block selecting papers.
      const paper = pick(ev.clientX, ev.clientY);
      if (paper) {
        setSelected(paper);
        setActiveLevel(null);
        setClusterTheme(null);
        setClusterBreakdown(null);
        return;
      }
      const theme = pickThemeTip(ev.clientX, ev.clientY);
      if (theme) onThemeLabelClickRef.current(theme);
    };
    const onLeave = () => { setHovered(null); setCursor("grab"); };

    canvas.addEventListener("mousemove", onMove);
    canvas.addEventListener("click", onClick);
    canvas.addEventListener("mouseleave", onLeave);

    const onResize = () => {
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      labelRenderer.setSize(w, h);
      if (engineRef.current) engineRef.current.dirty = true;
    };
    window.addEventListener("resize", onResize);

    // Same recovery as ResearchAtlas.tsx: a lost WebGL context otherwise
    // leaves the canvas frozen with no way to recover short of a reload.
    const onContextLost = (event: Event) => {
      event.preventDefault();
      cancelAnimationFrame(engineRef.current?.frameId ?? 0);
      setContextLost(true);
    };
    const onContextRestored = () => {
      setContextLost(false);
      setRendererEpoch((n) => n + 1);
    };
    canvas.addEventListener("webglcontextlost", onContextLost, false);
    canvas.addEventListener("webglcontextrestored", onContextRestored, false);

    engineRef.current = {
      renderer, scene, camera, controls, labelRenderer, tileManager,
      tileGroup: group, overlay, overlayGeom, overlayMat, baseMaterial, marker,
      labelByTheme, frameId: 0, dirty: true, lastStream: 0,
    };
    setAtlasReady(true);

    controls.addEventListener("change", () => { if (engineRef.current) engineRef.current.dirty = true; });

    const animate = () => {
      const e = engineRef.current;
      if (!e) return;
      e.frameId = requestAnimationFrame(animate);
      const changed = controls.update();
      if (changed || e.dirty) {
        const now = performance.now();
        if (changed && now - e.lastStream > 120) {
          e.lastStream = now;
          streamNow();
        }
        renderer.render(scene, camera);
        labelRenderer.render(scene, camera);
        e.dirty = false;
      }
    };
    streamNow();
    animate();

    return () => {
      setAtlasReady(false);
      cancelAnimationFrame(engineRef.current?.frameId ?? 0);
      canvas.removeEventListener("mousemove", onMove);
      canvas.removeEventListener("click", onClick);
      canvas.removeEventListener("mouseleave", onLeave);
      canvas.removeEventListener("webglcontextlost", onContextLost);
      canvas.removeEventListener("webglcontextrestored", onContextRestored);
      window.removeEventListener("resize", onResize);
      for (const obj of labelObjs) scene.remove(obj);
      for (const extra of labelExtras) {
        scene.remove(extra);
        if (extra instanceof THREE.Line) {
          extra.geometry.dispose();
          (extra.material as THREE.Material).dispose();
        } else if (extra instanceof THREE.Mesh) {
          extra.geometry.dispose();
          (extra.material as THREE.Material).dispose();
        }
      }
      tileManager.dispose();
      overlayGeom.dispose();
      overlayMat.dispose();
      baseMaterial.dispose();
      marker.geometry.dispose();
      (marker.material as THREE.Material).dispose();
      controls.dispose();
      renderer.dispose();
      if (labelRenderer.domElement.parentNode === container) {
        container.removeChild(labelRenderer.domElement);
      }
      engineRef.current = null;
    };
  }, [loading, error, streamNow, rendererEpoch]);

  useEffect(() => {
    const e = engineRef.current;
    if (!e) return;
    if (selected) {
      e.marker.position.set(selected.x, selected.y, selected.z);
      e.marker.visible = true;
    } else {
      e.marker.visible = false;
    }
    e.dirty = true;
  }, [selected]);

  const zoomBy = (factor: number) => {
    const e = engineRef.current;
    if (!e) return;
    const dir = new THREE.Vector3();
    e.camera.getWorldDirection(dir);
    e.camera.position.addScaledVector(dir, factor > 1 ? -0.35 : 0.35);
    e.controls.update();
    e.dirty = true;
    streamNow();
  };

  const resetView = () => {
    const e = engineRef.current;
    if (!e) return;
    e.camera.position.set(0, 0, 2.4);
    e.controls.target.set(0, 0, 0);
    e.controls.update();
    e.dirty = true;
    streamNow();
  };

  const closeThemeCluster = useCallback(() => {
    setClusterTheme(null);
    setClusterBreakdown(null);
    setClusterLoading(false);
  }, []);

  const openThemeCluster = useCallback(async (theme: string) => {
    const q = searchQuery.trim();
    if (!q) return;

    setSelected(null);
    setActiveLevel(null);
    setClusterTheme(theme);
    setClusterLoading(true);

    // Prefer the exact filtered overlay set (correct for faculty/dept searches).
    const local = buildThemeBreakdownFromOverlay(theme, q, overlayPointsRef.current);
    if (local.totalPapers > 0) {
      setClusterBreakdown(local);
      setClusterLoading(false);
      return;
    }

    try {
      const data = await fetchKgAtlasClusterBreakdown(theme, q);
      setClusterBreakdown(data);
    } catch {
      setClusterBreakdown(local);
    } finally {
      setClusterLoading(false);
    }
  }, [searchQuery]);

  const themesClickable = useMemo(() => {
    return Boolean(searchQuery.trim()) && matchCount > 0;
  }, [searchQuery, matchCount]);

  useEffect(() => {
    themesClickableRef.current = themesClickable;
    const e = engineRef.current;
    if (!e) return;
    syncThemeLabelPresentation(filterActiveRef.current, themesClickable);
    if (!themesClickable) {
      setClusterTheme(null);
      setClusterBreakdown(null);
    }
  }, [themesClickable, atlasReady, syncThemeLabelPresentation]);

  onThemeLabelClickRef.current = (theme) => {
    if (!themesClickableRef.current) return;
    if (searchQuery.trim()) {
      void openThemeCluster(theme);
    } else {
      closeThemeCluster();
    }
  };

  const clearSearch = () => {
    setQuery(""); setSearchQuery("");
    setRefineQuery(""); setRefineSearchQuery("");
    setActiveLevel(null);
    setSelected(null); setHovered(null); setSuggestOpen(false);
    setFilterThemeCounts([]);
    closeThemeCluster();
  };

  const clearRefine = () => {
    refinePickRef.current = null;
    setRefineQuery("");
    setRefineSearchQuery("");
    setRefineEntity(null);
    setQuery("");
  };

  const enterViewMode = () => {
    clearSearch();
    setAtlasMode("view");
  };

  const enterInteractiveMode = () => {
    setAtlasMode("interactive");
  };

  const showTooltip = hovered && !selected && !clusterTheme && !isViewMode;

  const clusterThemeColor = useMemo(() => {
    if (!clusterTheme || !dictRef.current) return "#22d3ee";
    const id = dictRef.current.themes.indexOf(clusterTheme);
    return themeColorHex(id >= 0 ? id : 0);
  }, [clusterTheme]);

  const handleClusterPaperClick = useCallback((paper: PickedPaper) => {
    const fromOverlay = overlayPointsRef.current.find((p) => p.i === paper.i);
    setClusterTheme(null);
    setClusterBreakdown(null);
    setSelected({
      ...paper,
      id: fromOverlay?.id || paper.id,
      title: fromOverlay?.title || paper.title,
      theme: fromOverlay?.theme || paper.theme,
      x: fromOverlay?.x ?? paper.x,
      y: fromOverlay?.y ?? paper.y,
      z: fromOverlay?.z ?? paper.z,
    });
  }, []);

  return (
    <div className={cn("relative flex flex-col flex-1 min-h-0 bg-black text-white", isViewMode && "ring-1 ring-white/10")}>
      <div className="absolute top-4 right-4 z-30 flex items-center gap-2">
        {!isViewMode && (
          <>
            <Button type="button" variant="outline" size="icon" onClick={() => zoomBy(1 / 1.3)}
              className="h-9 w-9 rounded-full border-slate-600 bg-slate-900/60 text-slate-200 hover:bg-slate-800" aria-label="Zoom in">
              <ZoomIn className="h-4 w-4" />
            </Button>
            <Button type="button" variant="outline" size="icon" onClick={() => zoomBy(1.3)}
              className="h-9 w-9 rounded-full border-slate-600 bg-slate-900/60 text-slate-200 hover:bg-slate-800" aria-label="Zoom out">
              <ZoomOut className="h-4 w-4" />
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={resetView}
              className="rounded-full border-slate-600 bg-slate-900/60 text-slate-200 hover:bg-slate-800">
              <RotateCcw className="h-3.5 w-3.5 mr-1.5" /> Reset view
            </Button>
          </>
        )}
        <div
          className={cn(
            "inline-flex rounded-full border border-slate-600 bg-slate-900/90 p-1 backdrop-blur-sm shadow-lg",
            isViewMode && "ring-1 ring-white/10",
          )}
          role="group"
          aria-label="Atlas display mode"
        >
          <button
            type="button"
            onClick={enterViewMode}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all",
              isViewMode
                ? "bg-white text-black shadow-sm"
                : "text-slate-300 hover:text-white hover:bg-slate-800/80",
            )}
            aria-pressed={isViewMode}
          >
            <Eye className="h-3.5 w-3.5" />
            View
          </button>
          <button
            type="button"
            onClick={enterInteractiveMode}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all",
              !isViewMode
                ? "bg-white text-black shadow-sm"
                : "text-slate-300 hover:text-white hover:bg-slate-800/80",
            )}
            aria-pressed={!isViewMode}
          >
            <MousePointer2 className="h-3.5 w-3.5" />
            Explore
          </button>
        </div>
      </div>

      {!isViewMode && (
      <header className="absolute top-0 inset-x-0 z-20 pointer-events-none">
        <div className="flex items-start gap-4 px-4 sm:px-6 pt-4 pb-2 pr-52 sm:pr-64">
          <div ref={searchBoxRef} className="flex-1 max-w-3xl mx-auto pointer-events-auto relative">
            <form
              className="relative flex items-center rounded-xl border border-slate-700/70 bg-slate-900/90 p-1.5 shadow-lg backdrop-blur-md"
              onSubmit={(ev) => {
                ev.preventDefault();
                submitSearch();
              }}
            >
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                value={query}
                onChange={(e) => {
                  if (hasSearched) refinePickRef.current = null;
                  else primaryPickRef.current = null;
                  setQuery(e.target.value);
                  setSuggestOpen(true);
                }}
                onFocus={() => setSuggestOpen(true)}
                onKeyDown={onSearchKeyDown}
                autoComplete="off"
                role="combobox"
                aria-expanded={suggestOpen}
                aria-autocomplete="list"
                placeholder={
                  hasSearched
                    ? `Narrow within “${searchQuery.trim()}”…`
                    : "Search faculty, department, theme, domain, topic, or paper…"
                }
                className="h-11 border-0 bg-transparent pl-10 pr-20 text-sm text-white shadow-none placeholder:text-slate-400 focus-visible:ring-0"
              />
              {query.trim() && (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  className="absolute right-14 top-1/2 -translate-y-1/2 rounded-full p-1 text-slate-400 hover:text-white"
                  aria-label="Clear input"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
              <button
                type="submit"
                disabled={!query.trim()}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-white transition-colors hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-40"
                aria-label={hasSearched ? "Narrow within results" : "Search"}
              >
                <Search className="h-4 w-4" />
              </button>
            </form>

            {suggestOpen && !loading && (
              <div className="absolute left-0 right-0 mt-1 max-h-72 overflow-y-auto rounded-xl border border-slate-700/80 bg-slate-950/95 shadow-2xl backdrop-blur-md z-50">
                <p className="px-3 py-2 text-[10px] uppercase tracking-wide text-slate-500 border-b border-slate-800">
                  {hasSearched
                    ? `Departments & faculty inside “${searchQuery.trim()}”`
                    : query.trim()
                      ? `Matching themes, topics, faculty & departments for “${query.trim()}”`
                      : "Top themes, topics, faculty & departments"}
                </p>
                {hasSearched ? (
                  !dropdownItems.length ? (
                    <p className="px-3 py-3 text-sm text-slate-500">
                      {query.trim()
                        ? "No matching faculty or departments in these results"
                        : "Type a faculty or department name…"}
                    </p>
                  ) : (
                    dropdownItems.map((item, idx) => {
                      const badge = SUGGEST_BADGE[item.group];
                      return (
                        <button
                          key={`refine-${item.group}-${item.label}`}
                          type="button"
                          onClick={() => pickSuggestion(item)}
                          onMouseEnter={() => setSuggestActive(idx)}
                          className={cn(
                            "flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm border-b border-slate-800/60 last:border-0",
                            idx === suggestActive ? "bg-slate-800/80" : "hover:bg-slate-800/80",
                          )}
                        >
                          <span className={cn("shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold", badge.className)}>
                            {badge.text}
                          </span>
                          {item.group === "faculty" && <User className="h-3.5 w-3.5 shrink-0 text-violet-400" />}
                          {item.group === "department" && <Building2 className="h-3.5 w-3.5 shrink-0 text-emerald-400" />}
                          <span className="flex-1 min-w-0">
                            <span className="block truncate text-slate-200">{item.label}</span>
                            {item.sub && (
                              <span className="block truncate text-[11px] text-slate-500">{item.sub}</span>
                            )}
                          </span>
                          <span className="shrink-0 text-xs text-slate-500">{formatCount(item.count)}</span>
                        </button>
                      );
                    })
                  )
                ) : !suggestions ? (
                  <p className="px-3 py-3 text-sm text-slate-500 flex items-center gap-2">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading suggestions…
                  </p>
                ) : !dropdownItems.length ? (
                  <p className="px-3 py-3 text-sm text-slate-500">No matching themes, topics, faculty, or departments</p>
                ) : (
                  dropdownItems.map((item, idx) => {
                    const badge = SUGGEST_BADGE[item.group];
                    return (
                      <button
                        key={`${item.group}-${item.label}`}
                        type="button"
                        onClick={() => pickSuggestion(item)}
                        onMouseEnter={() => setSuggestActive(idx)}
                        className={cn(
                          "flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm border-b border-slate-800/60 last:border-0",
                          idx === suggestActive ? "bg-slate-800/80" : "hover:bg-slate-800/80",
                        )}
                      >
                        <span className={cn("shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold", badge.className)}>
                          {badge.text}
                        </span>
                        {item.group === "faculty" && <User className="h-3.5 w-3.5 shrink-0 text-violet-400" />}
                        {item.group === "department" && <Building2 className="h-3.5 w-3.5 shrink-0 text-emerald-400" />}
                        <span className="flex-1 min-w-0">
                          <span className="block truncate text-slate-200">{item.label}</span>
                          {item.sub && (
                            <span className="block truncate text-[11px] text-slate-500">{item.sub}</span>
                          )}
                        </span>
                        <span className="shrink-0 text-xs text-slate-500">{formatCount(item.count)}</span>
                      </button>
                    );
                  })
                )}
              </div>
            )}

            {hasSearched && (
              <div className="mt-2 flex min-w-0 flex-wrap items-center gap-1.5">
                <span className="shrink-0 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                  {refineSearchQuery.trim() ? "Narrowing:" : "Searching:"}
                </span>
                <span
                  title={searchQuery.trim()}
                  className={cn(
                    "inline-flex max-w-[240px] shrink-0 items-center rounded-md px-3 py-1 text-xs font-medium shadow-sm",
                    refineSearchQuery.trim()
                      ? "bg-slate-700 text-slate-100"
                      : "bg-blue-600 text-white",
                  )}
                >
                  <span className="truncate">{searchQuery.trim()}</span>
                </span>
                {refineSearchQuery.trim() && (
                  <>
                    <ChevronRight className="h-3.5 w-3.5 shrink-0 text-slate-500" />
                    <span
                      title={refineSearchQuery.trim()}
                      className="inline-flex max-w-[220px] shrink-0 items-center gap-1 rounded-md bg-blue-600 px-3 py-1 text-xs font-medium text-white shadow-sm"
                    >
                      <span className="truncate">{refineSearchQuery.trim()}</span>
                      <button
                        type="button"
                        onClick={clearRefine}
                        className="rounded-full p-0.5 hover:bg-white/20"
                        aria-label={`Remove refinement ${refineSearchQuery.trim()}`}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  </>
                )}
                <span
                  className="inline-flex shrink-0 items-center rounded-full border border-slate-600/80 bg-slate-900/70 px-2.5 py-1 text-[11px] font-medium text-slate-200"
                  aria-live="polite"
                >
                  {searchLoading ? "Counting…" : `${formatCount(matchCount)} papers`}
                </span>
                <button
                  type="button"
                  onClick={clearSearch}
                  className="ml-1 shrink-0 text-[11px] text-slate-400 transition-colors hover:text-red-300 hover:underline"
                >
                  Clear all
                </button>
              </div>
            )}
          </div>
        </div>
      </header>
      )}

      {!isViewMode && filterThemeCounts.length > 0 && searchQuery.trim() && (
        <aside
          className="absolute bottom-4 left-4 z-30 w-[min(100%-2rem,280px)] max-h-[min(42vh,320px)] flex flex-col rounded-xl border border-slate-700/70 bg-slate-950/90 shadow-2xl backdrop-blur-md overflow-hidden"
          aria-label="Matched themes"
        >
          <div className="shrink-0 flex items-center justify-between gap-2 px-3 py-2 border-b border-slate-700/60">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
              Themes ({filterThemeCounts.length})
            </p>
            <p className="text-[10px] text-slate-300 font-medium">
              {formatCount(matchCount)} papers
            </p>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-2 space-y-1">
            {filterThemeCounts.map(({ theme, count, color }) => (
              <button
                key={theme}
                type="button"
                onClick={() => void openThemeCluster(theme)}
                title={`Open departments in ${theme}`}
                className={cn(
                  "flex w-full items-start gap-2.5 rounded-lg border px-2.5 py-2 text-left transition-colors hover:bg-slate-800/70",
                  clusterTheme === theme
                    ? "border-slate-500 bg-slate-800/60"
                    : "border-transparent hover:border-slate-600",
                )}
              >
                <span
                  className="mt-1.5 h-2 w-2 shrink-0 rounded-full"
                  style={{ backgroundColor: color, boxShadow: `0 0 6px ${color}` }}
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-xs font-semibold leading-snug" style={{ color }}>
                    {themeDisplayName(theme)}
                  </span>
                  <span className="mt-0.5 block text-[11px] text-slate-400">
                    ({formatCount(count)} papers)
                  </span>
                </span>
              </button>
            ))}
          </div>
        </aside>
      )}

      <div ref={containerRef} className="absolute inset-0">
        <canvas ref={canvasRef} className="block w-full h-full touch-none" style={{ cursor }} />
      </div>

      {(loading || contextLost) && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="flex items-center gap-3 text-slate-300">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span>{contextLost ? "Restoring visualization…" : "Loading research atlas…"}</span>
          </div>
        </div>
      )}
      {error && !loading && (
        <div className="absolute inset-0 z-10 flex items-center justify-center p-6">
          <div className="max-w-md rounded-xl border border-red-500/30 bg-red-950/40 p-4 text-sm text-red-200">{error}</div>
        </div>
      )}

      {showTooltip && (
        <div className="absolute z-30 max-w-xs rounded-lg border border-slate-600/50 bg-slate-950/90 px-3 py-2.5 text-sm shadow-xl backdrop-blur-md pointer-events-none"
          style={{
            left: Math.min(tooltipPos.x + 14, (containerRef.current?.clientWidth ?? 400) - 280),
            top: Math.max(tooltipPos.y - 8, 72),
          }}>
          <p className="text-xs text-slate-300">
            {[hovered!.theme, hovered!.domain].filter(Boolean).join(" · ")}
          </p>
          <p className="mt-1 text-[10px] text-slate-500">Click to open details</p>
        </div>
      )}

      {clusterTheme && !isViewMode && (
        <ThemeClusterPanel
          theme={clusterTheme}
          query={searchQuery.trim()}
          breakdown={clusterBreakdown}
          loading={clusterLoading}
          themeColor={clusterThemeColor}
          onClose={closeThemeCluster}
          onPaperClick={handleClusterPaperClick}
        />
      )}

      {selected && !clusterTheme && !isViewMode && (
        <PaperPanel paper={selected} detail={detail} detailLoading={detailLoading}
          activeLevel={activeLevel} onLevelChange={handleLevelChange}
          onClose={() => { setSelected(null); setActiveLevel(null); }} />
      )}
    </div>
  );
}

function buildPicked(tile: DecodedTile, localIndex: number, dict: AtlasDict): PickedPaper {
  const themeId = tile.themeIds[localIndex];
  const domainId = tile.domainIds[localIndex];
  return {
    i: tile.indices[localIndex],
    id: tileObjectId(tile, localIndex),
    title: "",
    theme: dict.themes[themeId] ?? "",
    domain: dict.domains[domainId] ?? "",
    citations: tile.citations[localIndex],
    x: tile.positions[localIndex * 3],
    y: tile.positions[localIndex * 3 + 1],
    z: tile.positions[localIndex * 3 + 2],
  };
}
