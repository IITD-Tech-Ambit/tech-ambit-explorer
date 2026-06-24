import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { CSS2DObject, CSS2DRenderer } from "three/examples/jsm/renderers/CSS2DRenderer.js";
import {
  Building2, Calendar, ExternalLink, Eye, Loader2, MousePointer2, RotateCcw, Search,
  Tag, User, Users, X, ZoomIn, ZoomOut,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type {
  KgAtlasDepartmentMatch,
  KgAtlasFacultyMatch,
  KgAtlasPaper,
  KgDepartmentItem,
  KgFacultyItem,
} from "./types";
import {
  fetchKgAtlasDepartmentSearch,
  fetchKgAtlasFacultySearch,
  fetchKgDepartmentAtlasIndices,
  fetchKgFacultyAtlasIndices,
  fetchKgFacultyIndex,
  fetchKgPaperMeta,
  KG_API,
  type KgPaperMeta,
} from "./api";
import { getPaperExternalUrl } from "./paperLink";
import {
  applyFilteredThemeCounts,
  buildAtlasClusterIndex,
  buildDepartmentList,
  buildThemeColorMap,
  clusterKey,
  clusterLabel,
  computeThemeClusterLabels,
  getClusterSet,
  matchLevelColor,
  resolveLockedClusterLevels,
  resolveSearchMatchLevels,
  suggestFacultyTerms,
  suggestDepartmentTerms,
  suggestTaxonomyTerms,
  typeBadge,
  type AtlasClusterIndex,
  type ClusterLevel,
  type MatchLevel,
  type TaxonomyEntry,
  type ThemeClusterLabel,
} from "./atlasClusters";

const BG = "#000000";
const BASE_COLOR = new THREE.Color("#6ecfff");
const BLOCKED_COLOR = new THREE.Color("#000000");
const DIM_COLOR = new THREE.Color("#1e3a5f");
const HOVER_COLOR = new THREE.Color("#ffb347");
const SELECTED_COLOR = new THREE.Color("#67e8f9");

const MATCH_COLORS: Record<MatchLevel, THREE.Color> = {
  theme: new THREE.Color("#f87171"),
  subdomain: new THREE.Color("#fb923c"),
  topic: new THREE.Color("#facc15"),
  paper: new THREE.Color("#4ade80"),
};

/** Cluster highlight sizes — noticeably larger than default dots. */
const CLUSTER_HIGHLIGHT_SIZES: Record<MatchLevel, number> = {
  topic: 0.078,
  subdomain: 0.064,
  theme: 0.052,
  paper: 0.07,
};

const DIM_SIZE = 0.011;
const DIM_ALPHA = 0.18;
const BASE_SIZE = 0.022;

export type AtlasMode = "view" | "interactive";

function formatCount(n: number): string {
  return n.toLocaleString();
}

function formatThemeCount(label: ThemeClusterLabel, filtered: boolean): string {
  if (filtered && label.count !== label.totalCount) {
    return `${label.count.toLocaleString()} of ${label.totalCount.toLocaleString()}`;
  }
  return `${label.count.toLocaleString()} papers`;
}

function createThemeLabelElement(
  label: ThemeClusterLabel,
  filtered: boolean,
): { el: HTMLDivElement; countEl: HTMLSpanElement; line: THREE.Line; marker: THREE.Mesh } {
  const el = document.createElement("div");
  el.className = "atlas-theme-label";
  el.style.cssText = [
    "pointer-events:none",
    "user-select:none",
    "transform:translate(-8px,-50%)",
    "text-align:left",
    "white-space:nowrap",
  ].join(";");

  const countText = formatThemeCount(label, filtered);

  el.innerHTML = `
    <div style="display:flex;flex-direction:column;gap:1px;line-height:1.25;">
      <span style="
        font-size:12px;font-weight:600;color:${label.color};
        letter-spacing:0.01em;
        text-shadow:0 0 8px rgba(0,0,0,0.95),0 1px 3px rgba(0,0,0,0.9);
      ">${label.shortLabel}</span>
      <span class="atlas-theme-count" style="
        font-size:10px;color:#cbd5e1;font-weight:500;
        text-shadow:0 0 6px rgba(0,0,0,0.95),0 1px 2px rgba(0,0,0,0.85);
      ">${countText}</span>
    </div>
  `;

  const cluster = new THREE.Vector3(label.clusterX, label.clusterY, label.clusterZ);
  const anchor = new THREE.Vector3(label.x, label.y, label.z);
  const line = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints([cluster, anchor]),
    new THREE.LineBasicMaterial({
      color: label.color,
      transparent: true,
      opacity: 0.72,
      depthWrite: false,
    }),
  );

  const marker = new THREE.Mesh(
    new THREE.SphereGeometry(0.014, 10, 10),
    new THREE.MeshBasicMaterial({
      color: label.color,
      transparent: true,
      opacity: 0.95,
      depthWrite: false,
    }),
  );
  marker.position.copy(cluster);

  const countEl = el.querySelector(".atlas-theme-count") as HTMLSpanElement;
  return { el, countEl, line, marker };
}

function isPaperPickable(
  paper: KgAtlasPaper,
  searchFilter: Set<number> | null,
): boolean {
  if (!searchFilter) return true;
  return searchFilter.has(paper.i);
}

function AtlasPaperPanel({
  paper,
  detail,
  detailLoading,
  activeHighlightLevel,
  clusterName,
  clusterCount,
  levelCounts,
  searchActive,
  onClusterLevelChange,
  onClose,
}: {
  paper: KgAtlasPaper;
  detail: KgPaperMeta | null;
  detailLoading: boolean;
  activeHighlightLevel: ClusterLevel | null;
  clusterName: string;
  clusterCount: number;
  levelCounts: Record<ClusterLevel, number>;
  searchActive: boolean;
  onClusterLevelChange: (level: ClusterLevel) => void;
  onClose: () => void;
}) {
  const linkMeta = detail ? getPaperExternalUrl(detail) : null;
  const citations = detail?.citation_count ?? paper.citations;
  const year = detail?.publication_year;
  const levels: ClusterLevel[] = ["topic", "subdomain", "theme"];

  return (
    <aside className="absolute top-0 right-0 bottom-0 z-40 w-full sm:w-[400px] border-l border-slate-700/60 bg-slate-950/95 backdrop-blur-md overflow-y-auto shadow-2xl">
      <div className="sticky top-0 z-10 flex items-center justify-between gap-2 px-4 py-3 border-b border-slate-700/60 bg-slate-950/95">
        <span className="text-xs font-semibold uppercase tracking-wide text-cyan-400/90">
          Paper details
        </span>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          onClick={onClose}
          className="h-8 w-8 text-slate-400 hover:text-white hover:bg-slate-800"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="p-4 space-y-4">
        <div className="rounded-xl border border-cyan-500/25 bg-cyan-950/20 p-3">
          {activeHighlightLevel ? (
            <>
              <p className="text-[10px] uppercase tracking-wide text-cyan-400/80 mb-1">
                Highlighted cluster · {formatCount(clusterCount)} papers
              </p>
              <p className="text-sm font-semibold text-white leading-snug">{clusterName}</p>
            </>
          ) : (
            <>
              <p className="text-[10px] uppercase tracking-wide text-cyan-400/80 mb-1">
                Explore this paper
              </p>
              <p className="text-sm text-slate-300 leading-snug">
                Choose a level below to highlight related papers on the graph
              </p>
            </>
          )}
          <div className="flex flex-wrap gap-1.5 mt-2">
            {levels.map((lvl) => {
              const accent = matchLevelColor(lvl);
              return (
                <button
                  key={lvl}
                  type="button"
                  onClick={() => onClusterLevelChange(lvl)}
                  className={cn(
                    "rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors inline-flex items-center gap-1.5",
                    activeHighlightLevel === lvl
                      ? "text-slate-950"
                      : "bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700",
                  )}
                  style={
                    activeHighlightLevel === lvl
                      ? { backgroundColor: accent }
                      : undefined
                  }
                >
                  <span
                    className="h-2 w-2 rounded-full shrink-0"
                    style={{
                      backgroundColor: activeHighlightLevel === lvl ? "rgba(15,23,42,0.35)" : accent,
                      boxShadow: activeHighlightLevel === lvl ? undefined : `0 0 6px ${accent}`,
                    }}
                  />
                  {clusterLabel(lvl)} ({formatCount(levelCounts[lvl])})
                </button>
              );
            })}
          </div>
          {activeHighlightLevel && (
            <p className="mt-2 text-[10px] text-slate-500">
              {searchActive
                ? "Cluster papers appear larger · all search matches stay visible"
                : "Highlighted papers appear larger and brighter on the graph"}
            </p>
          )}
        </div>

        <h2 className="text-base font-semibold text-white leading-snug">{paper.title}</h2>

        {!detailLoading && (detail?.iitd_faculty?.length ?? 0) > 0 && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2 flex items-center gap-1">
              <User className="h-3.5 w-3.5" /> IIT Delhi faculty
            </p>
            <ul className="space-y-2">
              {detail!.iitd_faculty!.map((f) => (
                <li key={f.facultyId}>
                  {f.kerberos ? (
                    <a
                      href={`/faculty/${f.kerberos}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block rounded-lg border border-cyan-500/30 bg-cyan-950/30 px-3 py-2 hover:bg-cyan-950/50 transition-colors"
                    >
                      <span className="font-medium text-cyan-200">{f.name}</span>
                      {f.department && (
                        <span className="block text-xs text-slate-400 mt-0.5">{f.department}</span>
                      )}
                    </a>
                  ) : (
                    <div className="rounded-lg border border-slate-700/50 bg-slate-900/50 px-3 py-2">
                      <span className="font-medium text-white">{f.name}</span>
                      {f.department && (
                        <span className="block text-xs text-slate-400 mt-0.5">{f.department}</span>
                      )}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          {([
            { label: paper.theme, type: "theme" as const },
            { label: paper.subdomain, type: "subdomain" as const },
            { label: paper.topic, type: "topic" as const },
          ] as const)
            .filter((t) => t.label)
            .map((t) => (
              <button
                key={`${t.type}-${t.label}`}
                type="button"
                onClick={() => onClusterLevelChange(t.type)}
                className={cn(
                  "inline-flex items-center gap-1 rounded-full border px-3.5 py-1.5 text-xs transition-colors",
                  activeHighlightLevel === t.type
                    ? "border-cyan-400/60 bg-cyan-950/50 text-cyan-100"
                    : "border-slate-600/50 bg-slate-900/80 text-slate-300 hover:border-cyan-500/40 hover:text-white",
                )}
              >
                <Tag className="h-3 w-3 text-cyan-400/80" />
                <span className="text-slate-500 mr-0.5">{typeBadge(t.type)}:</span>
                {t.label}
              </button>
            ))}
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-lg border border-slate-700/50 bg-slate-900/50 px-3 py-2">
            <p className="text-xs text-slate-500">Citations</p>
            <p className="font-semibold text-cyan-300">{citations}</p>
          </div>
          {year != null && (
            <div className="rounded-lg border border-slate-700/50 bg-slate-900/50 px-3 py-2">
              <p className="text-xs text-slate-500 flex items-center gap-1">
                <Calendar className="h-3 w-3" /> Year
              </p>
              <p className="font-semibold text-white">{year}</p>
            </div>
          )}
          {detail?.document_type && (
            <div className="rounded-lg border border-slate-700/50 bg-slate-900/50 px-3 py-2 col-span-2">
              <p className="text-xs text-slate-500">Document type</p>
              <p className="font-medium text-slate-200">{detail.document_type}</p>
            </div>
          )}
        </div>

        {detailLoading && (
          <div className="flex items-center gap-2 text-sm text-slate-400 py-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading full details…
          </div>
        )}

        {!detailLoading && (detail?.authors?.length ?? 0) > 0 && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2 flex items-center gap-1">
              <Users className="h-3.5 w-3.5" /> All authors
            </p>
            <p className="text-sm text-slate-300 leading-relaxed">
              {detail!.authors!.map((a) => a.name).filter(Boolean).join(", ")}
            </p>
          </div>
        )}

        {!detailLoading && (detail?.subject_area?.length ?? 0) > 0 && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">
              Subject areas
            </p>
            <p className="text-sm text-slate-400">{detail!.subject_area!.join(" · ")}</p>
          </div>
        )}

        {linkMeta && (
          <a
            href={linkMeta.href}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold text-sm px-4 py-2.5 transition-colors"
          >
            <ExternalLink className="h-4 w-4" />
            {linkMeta.label}
          </a>
        )}
      </div>
    </aside>
  );
}

export default function ResearchAtlas({ onModeChange }: { onModeChange?: (mode: AtlasMode) => void }) {
  const [searchParams] = useSearchParams();
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const comboRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<{
    renderer: THREE.WebGLRenderer;
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    controls: OrbitControls;
    points: THREE.Points;
    colorAttr: THREE.BufferAttribute;
    sizeAttr: THREE.BufferAttribute;
    alphaAttr: THREE.BufferAttribute;
    labelRenderer: CSS2DRenderer;
    themeLabelRefs: Array<{
      theme: string;
      obj: CSS2DObject;
      countEl: HTMLSpanElement;
      line: THREE.Line;
      marker: THREE.Mesh;
    }>;
    papers: KgAtlasPaper[];
    frameId: number;
  } | null>(null);

  const searchQueryRef = useRef("");
  const highlightSetRef = useRef<Set<number>>(new Set());
  const searchFilterRef = useRef<Set<number> | null>(null);
  const viewOnlyRef = useRef(false);

  const [papers, setPapers] = useState<KgAtlasPaper[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [atlasMode, setAtlasMode] = useState<AtlasMode>("interactive");
  const [query, setQuery] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchFilterSet, setSearchFilterSet] = useState<Set<number> | null>(null);
  const [comboOpen, setComboOpen] = useState(false);
  const [searchMatchCount, setSearchMatchCount] = useState(0);
  const [clusterHighlightCount, setClusterHighlightCount] = useState(0);
  const [matchedTerms, setMatchedTerms] = useState<TaxonomyEntry[]>([]);
  const [matchedFaculty, setMatchedFaculty] = useState<KgAtlasFacultyMatch[]>([]);
  const [matchedDepartments, setMatchedDepartments] = useState<KgAtlasDepartmentMatch[]>([]);
  const [facultyList, setFacultyList] = useState<KgFacultyItem[]>([]);
  const [searchFacultyOnlyId, setSearchFacultyOnlyId] = useState<string | null>(null);
  const [searchDepartmentOnly, setSearchDepartmentOnly] = useState<string | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showTierLegend, setShowTierLegend] = useState(false);
  const [hovered, setHovered] = useState<KgAtlasPaper | null>(null);
  const [selected, setSelected] = useState<KgAtlasPaper | null>(null);
  const [activeHighlightLevel, setActiveHighlightLevel] = useState<ClusterLevel | null>(null);
  const [clusterName, setClusterName] = useState("");
  const [paperDetail, setPaperDetail] = useState<KgPaperMeta | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const [canvasCursor, setCanvasCursor] = useState("grab");

  const clusterIndex = useMemo(
    () => (papers.length ? buildAtlasClusterIndex(papers) : null),
    [papers],
  );

  const themeLabels = useMemo(
    () => (papers.length ? computeThemeClusterLabels(papers) : []),
    [papers],
  );

  const filteredThemeLabels = useMemo(
    () => applyFilteredThemeCounts(themeLabels, papers, searchFilterSet),
    [themeLabels, papers, searchFilterSet],
  );

  const themeFilterActive = Boolean(searchFilterSet && searchFilterSet.size > 0);

  const themeColorMap = useMemo(() => {
    const hexMap = buildThemeColorMap(papers);
    const map = new Map<string, THREE.Color>();
    for (const [theme, hex] of hexMap) {
      map.set(theme, new THREE.Color(hex));
    }
    return map;
  }, [papers]);

  const suggestions = useMemo(
    () => (clusterIndex ? suggestTaxonomyTerms(query, clusterIndex, 10) : []),
    [query, clusterIndex],
  );

  const facultySuggestions = useMemo(
    () => suggestFacultyTerms(query, facultyList, 5),
    [query, facultyList],
  );

  const departmentList = useMemo(
    () => buildDepartmentList(facultyList),
    [facultyList],
  );

  const departmentSuggestions = useMemo(
    () => suggestDepartmentTerms(query, departmentList, 5),
    [query, departmentList],
  );

  const hasSuggestions =
    suggestions.length > 0 || facultySuggestions.length > 0 || departmentSuggestions.length > 0;

  const isViewMode = atlasMode === "view";

  useEffect(() => {
    viewOnlyRef.current = isViewMode;
  }, [isViewMode]);

  useEffect(() => {
    onModeChange?.(atlasMode);
  }, [atlasMode, onModeChange]);

  useEffect(() => {
    const container = containerRef.current;
    const scene = sceneRef.current;
    if (!container || !scene) return;

    const applySize = () => {
      const w = container.clientWidth;
      const h = container.clientHeight;
      scene.camera.aspect = w / h;
      scene.camera.updateProjectionMatrix();
      scene.renderer.setSize(w, h);
      scene.labelRenderer.setSize(w, h);
    };

    applySize();
    const t = window.setTimeout(applySize, 520);
    return () => window.clearTimeout(t);
  }, [isViewMode]);

  useEffect(() => {
    fetchKgFacultyIndex()
      .then(setFacultyList)
      .catch(() => setFacultyList([]));
  }, []);

  useEffect(() => {
    const theme = searchParams.get("theme")?.trim();
    if (!theme) return;
    setQuery(theme);
    searchQueryRef.current = theme;
    setSearchQuery(theme);
    setSearchFacultyOnlyId(null);
    setSearchDepartmentOnly(null);
    setAtlasMode("interactive");
  }, [searchParams]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch(`${KG_API}/atlas`)
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.message || `Failed to load atlas (${res.status})`);
        }
        return res.json();
      })
      .then((data) => {
        if (cancelled) return;
        setPapers(data.papers ?? []);
      })
      .catch((e) => {
        if (!cancelled) setError(String(e.message || e));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      searchQueryRef.current = query;
      setSearchQuery(query);
    }, 200);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (comboRef.current && !comboRef.current.contains(e.target as Node)) {
        setComboOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  useEffect(() => {
    setActiveHighlightLevel(null);
    setSelected(null);
    setClusterName("");
  }, [searchQuery]);

  useEffect(() => {
    let cancelled = false;

    async function runSearch() {
      if (!clusterIndex) {
        searchFilterRef.current = null;
        setSearchFilterSet(null);
        return;
      }
      if (!searchQuery.trim()) {
        searchFilterRef.current = null;
        setSearchFilterSet(null);
        setSearchMatchCount(0);
        setMatchedTerms([]);
        setMatchedFaculty([]);
        setMatchedDepartments([]);
        setSearchLoading(false);
        return;
      }

      setSearchLoading(true);
      const visible = new Set<number>();

      try {
        if (searchFacultyOnlyId) {
          const result = await fetchKgFacultyAtlasIndices([searchFacultyOnlyId]);
          if (cancelled) return;
          for (const idx of result.indices) visible.add(idx);
          const fac = facultyList.find((f) => f.facultyId === searchFacultyOnlyId);
          setMatchedFaculty(
            fac
              ? [{
                  facultyId: fac.facultyId,
                  name: fac.name,
                  department: fac.department,
                  paperCount: fac.paperCount,
                  atlasCount: result.indices.length,
                }]
              : [],
          );
          setMatchedDepartments([]);
          setMatchedTerms([]);
        } else if (searchDepartmentOnly) {
          const result = await fetchKgDepartmentAtlasIndices([searchDepartmentOnly]);
          if (cancelled) return;
          for (const idx of result.indices) visible.add(idx);
          const dept = departmentList.find((d) => d.department === searchDepartmentOnly);
          setMatchedDepartments(
            dept
              ? [{
                  department: dept.department,
                  facultyCount: dept.facultyCount,
                  atlasCount: result.indices.length,
                }]
              : [{
                  department: searchDepartmentOnly,
                  facultyCount: 0,
                  atlasCount: result.indices.length,
                }],
          );
          setMatchedFaculty([]);
          setMatchedTerms([]);
        } else {
          const textResolved = resolveSearchMatchLevels(searchQuery, papers, clusterIndex);
          if (cancelled) return;
          for (const idx of textResolved.visible) visible.add(idx);
          setMatchedTerms(textResolved.matchedTerms);

          try {
            const facResult = await fetchKgAtlasFacultySearch(searchQuery);
            if (cancelled) return;
            setMatchedFaculty(facResult.matches);
            for (const idx of facResult.indices) visible.add(idx);
          } catch {
            if (!cancelled) setMatchedFaculty([]);
          }

          try {
            const deptResult = await fetchKgAtlasDepartmentSearch(searchQuery);
            if (cancelled) return;
            setMatchedDepartments(deptResult.matches);
            for (const idx of deptResult.indices) visible.add(idx);
          } catch {
            if (!cancelled) setMatchedDepartments([]);
          }
        }

        if (cancelled) return;
        searchFilterRef.current = visible;
        setSearchFilterSet(new Set(visible));
        setSearchMatchCount(visible.size);
      } finally {
        if (!cancelled) setSearchLoading(false);
      }
    }

    runSearch();
    return () => {
      cancelled = true;
    };
  }, [searchQuery, papers, clusterIndex, searchFacultyOnlyId, searchDepartmentOnly, facultyList, departmentList]);

  useEffect(() => {
    if (!selected) {
      setPaperDetail(null);
      return;
    }
    setDetailLoading(true);
    fetchKgPaperMeta(selected.id)
      .then(setPaperDetail)
      .catch(() => setPaperDetail(null))
      .finally(() => setDetailLoading(false));
  }, [selected]);

  const applyHighlights = useCallback(
    (
      paperList: KgAtlasPaper[],
      index: AtlasClusterIndex | null,
      hoveredPaper: KgAtlasPaper | null,
      selectedPaper: KgAtlasPaper | null,
      highlightLevel: ClusterLevel | null,
      searchFilter: Set<number> | null,
      themeColors: Map<string, THREE.Color>,
      viewOnly: boolean,
    ) => {
      const scene = sceneRef.current;
      if (!scene || !index) return;

      const colors = scene.colorAttr.array as Float32Array;
      const sizes = scene.sizeAttr.array as Float32Array;
      const alphas = scene.alphaAttr.array as Float32Array;

      if (viewOnly) {
        highlightSetRef.current = new Set();
        setShowTierLegend(false);
        setClusterHighlightCount(0);

        for (let i = 0; i < paperList.length; i++) {
          const paper = paperList[i];
          const ci = i * 3;
          const color = themeColors.get(paper.theme) ?? BASE_COLOR;
          colors[ci] = color.r;
          colors[ci + 1] = color.g;
          colors[ci + 2] = color.b;
          sizes[i] = BASE_SIZE;
          alphas[i] = 0.92;
        }

        scene.colorAttr.needsUpdate = true;
        scene.sizeAttr.needsUpdate = true;
        scene.alphaAttr.needsUpdate = true;
        return;
      }

      const searchActive = Boolean(searchFilter && searchFilter.size > 0);
      const clusterHighlightActive = Boolean(highlightLevel && selectedPaper);

      let activeSet = new Set<number>();
      let levelByIndex = new Map<number, MatchLevel>();

      if (highlightLevel && selectedPaper) {
        const resolved = resolveLockedClusterLevels(selectedPaper, highlightLevel, index);
        activeSet = resolved.visible;
        levelByIndex = resolved.levelByIndex;
        setShowTierLegend(true);
      } else {
        setShowTierLegend(false);
      }

      highlightSetRef.current = activeSet;

      if (highlightLevel && selectedPaper) {
        const visibleHighlight = [...activeSet].filter(
          (idx) => !searchActive || searchFilter!.has(idx),
        ).length;
        setClusterHighlightCount(visibleHighlight);
      } else {
        setClusterHighlightCount(0);
      }

      const hoveredIdx = hoveredPaper?.i ?? -1;
      const selectedIdx = selectedPaper?.i ?? -1;

      const paperThemeColor = (paper: KgAtlasPaper) =>
        themeColors.get(paper.theme) ?? BASE_COLOR;

      for (let i = 0; i < paperList.length; i++) {
        const paper = paperList[i];
        const ci = i * 3;
        let color: THREE.Color;
        let size: number;
        let alpha: number;

        if (searchActive && !searchFilter!.has(paper.i)) {
          color = BLOCKED_COLOR;
          size = 0.003;
          alpha = 0.015;
        } else if (paper.i === selectedIdx) {
          color = SELECTED_COLOR;
          size = 0.085;
          alpha = 1;
        } else if (paper.i === hoveredIdx) {
          color = HOVER_COLOR;
          size = 0.075;
          alpha = 1;
        } else if (activeSet.has(paper.i) && levelByIndex.has(paper.i)) {
          const lvl = levelByIndex.get(paper.i)!;
          color =
            lvl === "theme"
              ? paperThemeColor(paper)
              : MATCH_COLORS[lvl];
          size = CLUSTER_HIGHLIGHT_SIZES[lvl];
          alpha = 1;
        } else if (clusterHighlightActive && !(searchActive && searchFilter!.has(paper.i))) {
          color = DIM_COLOR;
          size = DIM_SIZE;
          alpha = DIM_ALPHA;
        } else {
          color = paperThemeColor(paper);
          size = BASE_SIZE;
          alpha = 0.92;
        }

        colors[ci] = color.r;
        colors[ci + 1] = color.g;
        colors[ci + 2] = color.b;
        sizes[i] = size;
        alphas[i] = alpha;
      }

      scene.colorAttr.needsUpdate = true;
      scene.sizeAttr.needsUpdate = true;
      scene.alphaAttr.needsUpdate = true;
    },
    [],
  );

  useEffect(() => {
    applyHighlights(
      papers,
      clusterIndex,
      hovered,
      selected,
      activeHighlightLevel,
      searchFilterSet,
      themeColorMap,
      isViewMode,
    );
  }, [
    papers,
    clusterIndex,
    hovered,
    selected,
    activeHighlightLevel,
    searchFilterSet,
    themeColorMap,
    applyHighlights,
    isViewMode,
  ]);

  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene?.themeLabelRefs?.length) return;

    for (const ref of scene.themeLabelRefs) {
      const label = filteredThemeLabels.find((l) => l.theme === ref.theme);
      if (!label) continue;

      const show = !themeFilterActive || label.count > 0;
      ref.obj.visible = show;
      ref.line.visible = show;
      ref.marker.visible = show;

      const countText =
        themeFilterActive && label.count !== label.totalCount
          ? `${formatCount(label.count)} of ${formatCount(label.totalCount)}`
          : `${formatCount(label.count)} papers`;
      ref.countEl.textContent = countText;
    }
  }, [filteredThemeLabels, themeFilterActive]);

  useEffect(() => {
    if (!papers.length || !canvasRef.current || !containerRef.current) return;

    const container = containerRef.current;
    const canvas = canvasRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
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
    controls.minDistance = 0.5;
    controls.maxDistance = 6;

    const positions = new Float32Array(papers.length * 3);
    const colors = new Float32Array(papers.length * 3);
    const sizes = new Float32Array(papers.length);
    const alphas = new Float32Array(papers.length);

    const initialThemeColors = buildThemeColorMap(papers);

    for (let i = 0; i < papers.length; i++) {
      const p = papers[i];
      positions[i * 3] = p.x;
      positions[i * 3 + 1] = p.y;
      positions[i * 3 + 2] = p.z;
      const c = new THREE.Color(initialThemeColors.get(p.theme) ?? "#6ecfff");
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
      sizes[i] = 0.022;
      alphas[i] = 0.92;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    const colorAttr = new THREE.BufferAttribute(colors, 3);
    geometry.setAttribute("color", colorAttr);
    const sizeAttr = new THREE.BufferAttribute(sizes, 1);
    geometry.setAttribute("size", sizeAttr);
    const alphaAttr = new THREE.BufferAttribute(alphas, 1);
    geometry.setAttribute("alpha", alphaAttr);

    const material = new THREE.ShaderMaterial({
      uniforms: {},
      vertexShader: `
        attribute float size;
        attribute vec3 color;
        attribute float alpha;
        varying vec3 vColor;
        varying float vAlpha;
        void main() {
          vColor = color;
          vAlpha = alpha;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = size * (280.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        varying float vAlpha;
        void main() {
          vec2 c = gl_PointCoord - vec2(0.5);
          float d = length(c);
          if (d > 0.5) discard;
          float edge = smoothstep(0.5, 0.12, d);
          gl_FragColor = vec4(vColor, vAlpha * edge);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    const points = new THREE.Points(geometry, material);
    scene.add(points);

    const labelRenderer = new CSS2DRenderer();
    labelRenderer.setSize(width, height);
    labelRenderer.domElement.style.position = "absolute";
    labelRenderer.domElement.style.inset = "0";
    labelRenderer.domElement.style.pointerEvents = "none";
    container.appendChild(labelRenderer.domElement);

    const themeLabelRefs: Array<{
      theme: string;
      obj: CSS2DObject;
      countEl: HTMLSpanElement;
      line: THREE.Line;
      marker: THREE.Mesh;
    }> = [];

    for (const label of computeThemeClusterLabels(papers)) {
      const { el, countEl, line, marker } = createThemeLabelElement(label, false);
      const obj = new CSS2DObject(el);
      obj.position.set(label.x, label.y, label.z);
      scene.add(obj);
      scene.add(line);
      scene.add(marker);
      themeLabelRefs.push({ theme: label.theme, obj, countEl, line, marker });
    }

    sceneRef.current = {
      renderer,
      labelRenderer,
      themeLabelRefs,
      scene,
      camera,
      controls,
      points,
      colorAttr,
      sizeAttr,
      alphaAttr,
      papers,
      frameId: 0,
    };

    const raycaster = new THREE.Raycaster();
    raycaster.params.Points = { threshold: 0.035 };
    const mouse = new THREE.Vector2();
    let hoverFrame = 0;

    const pickPaper = (clientX: number, clientY: number): KgAtlasPaper | null => {
      if (viewOnlyRef.current) return null;
      const rect = canvas.getBoundingClientRect();
      mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(mouse, camera);
      const hits = raycaster.intersectObject(points);

      for (const hit of hits) {
        if (hit.index == null) continue;
        const paper = papers[hit.index];
        if (isPaperPickable(paper, searchFilterRef.current)) {
          return paper;
        }
      }
      return null;
    };

    const onMove = (e: MouseEvent) => {
      if (viewOnlyRef.current) {
        setHovered(null);
        setCanvasCursor("grab");
        return;
      }
      hoverFrame++;
      if (hoverFrame % 2 !== 0) return;
      setTooltipPos({
        x: e.clientX - container.getBoundingClientRect().left,
        y: e.clientY - container.getBoundingClientRect().top,
      });
      const paper = pickPaper(e.clientX, e.clientY);
      setHovered(paper);
      setCanvasCursor(paper ? "pointer" : "grab");
    };

    const onClick = (e: MouseEvent) => {
      if (viewOnlyRef.current) return;
      const paper = pickPaper(e.clientX, e.clientY);
      if (!paper) return;
      setSelected(paper);
      setActiveHighlightLevel(null);
      setClusterName("");
    };

    const onLeave = () => {
      setHovered(null);
      setCanvasCursor("grab");
    };

    const animate = () => {
      sceneRef.current!.frameId = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
      labelRenderer.render(scene, camera);
    };
    animate();

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
    };
    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(sceneRef.current?.frameId ?? 0);
      canvas.removeEventListener("mousemove", onMove);
      canvas.removeEventListener("click", onClick);
      canvas.removeEventListener("mouseleave", onLeave);
      window.removeEventListener("resize", onResize);
      for (const ref of themeLabelRefs) {
        scene.remove(ref.obj);
        scene.remove(ref.line);
        scene.remove(ref.marker);
        ref.line.geometry.dispose();
        (ref.line.material as THREE.Material).dispose();
        ref.marker.geometry.dispose();
        (ref.marker.material as THREE.Material).dispose();
      }
      if (labelRenderer.domElement.parentNode === container) {
        container.removeChild(labelRenderer.domElement);
      }
      controls.dispose();
      geometry.dispose();
      material.dispose();
      renderer.dispose();
      sceneRef.current = null;
    };
  }, [papers]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleClusterLevelChange = (level: ClusterLevel) => {
    if (!selected || !clusterIndex) return;
    setActiveHighlightLevel(level);
    setClusterName(clusterKey(selected, level));
  };

  const panelLevelCounts = useMemo((): Record<ClusterLevel, number> => {
    if (!selected || !clusterIndex) {
      return { topic: 0, subdomain: 0, theme: 0 };
    }
    const countAtLevel = (level: ClusterLevel) => {
      const cluster = getClusterSet(selected, level, clusterIndex);
      if (!searchFilterSet) return cluster.size;
      let n = 0;
      for (const idx of cluster) {
        if (searchFilterSet.has(idx)) n++;
      }
      return n;
    };
    return {
      topic: countAtLevel("topic"),
      subdomain: countAtLevel("subdomain"),
      theme: countAtLevel("theme"),
    };
  }, [selected, clusterIndex, searchFilterSet]);

  const pickSuggestion = (term: TaxonomyEntry) => {
    setQuery(term.label);
    setSearchQuery(term.label);
    setSearchFacultyOnlyId(null);
    setSearchDepartmentOnly(null);
    setComboOpen(false);
  };

  const pickFacultySuggestion = (fac: KgFacultyItem) => {
    setQuery(fac.name);
    setSearchQuery(fac.name);
    setSearchFacultyOnlyId(fac.facultyId);
    setSearchDepartmentOnly(null);
    setComboOpen(false);
  };

  const pickDepartmentSuggestion = (dept: KgDepartmentItem) => {
    setQuery(dept.department);
    setSearchQuery(dept.department);
    setSearchDepartmentOnly(dept.department);
    setSearchFacultyOnlyId(null);
    setComboOpen(false);
  };

  const clearHighlights = () => {
    setQuery("");
    setSearchQuery("");
    searchQueryRef.current = "";
    setActiveHighlightLevel(null);
    setSelected(null);
    setClusterName("");
    setHovered(null);
    searchFilterRef.current = null;
    setSearchFilterSet(null);
    setSearchFacultyOnlyId(null);
    setSearchDepartmentOnly(null);
    setMatchedFaculty([]);
    setMatchedDepartments([]);
  };

  const enterViewMode = () => {
    clearHighlights();
    setComboOpen(false);
    setAtlasMode("view");
  };

  const enterInteractiveMode = () => {
    setAtlasMode("interactive");
  };

  const resetView = () => {
    const s = sceneRef.current;
    if (!s) return;
    s.camera.position.set(0, 0, 2.4);
    s.controls.target.set(0, 0, 0);
    s.controls.update();
  };

  const zoomBy = (factor: number) => {
    const s = sceneRef.current;
    if (!s) return;
    const dir = new THREE.Vector3();
    s.camera.getWorldDirection(dir);
    s.camera.position.addScaledVector(dir, factor > 1 ? -0.35 : 0.35);
  };

  const searchActive = Boolean(searchQuery.trim());
  const highlightActive = activeHighlightLevel != null;

  const statusLine = useMemo(() => {
    if (loading) return "Loading research papers…";
    if (selected && highlightActive && clusterName) {
      if (searchActive) {
        return `${formatCount(clusterHighlightCount)} in “${clusterName}” · ${formatCount(searchMatchCount)} total match “${searchQuery.trim()}”`;
      }
      return `${formatCount(clusterHighlightCount)} papers highlighted for “${clusterName}”`;
    }
    if (selected) {
      return "Paper selected · choose Topic, Sub-domain, or Broad theme in the sidebar to highlight";
    }
    if (searchActive) {
      if (searchLoading) {
        return `Searching “${searchQuery.trim()}”…`;
      }
      if (searchMatchCount === 0) {
        return `No papers match “${searchQuery.trim()}” — try faculty, department, or keyword`;
      }
      if (searchDepartmentOnly && matchedDepartments.length === 1) {
        return `${formatCount(searchMatchCount)} papers · ${matchedDepartments[0].department}`;
      }
      if (searchFacultyOnlyId && matchedFaculty.length === 1) {
        return `${formatCount(searchMatchCount)} papers by ${matchedFaculty[0].name}`;
      }
      if (matchedDepartments.length > 0 && matchedFaculty.length === 0) {
        const deptNames = matchedDepartments.slice(0, 2).map((d) => d.department).join(", ");
        const suffix = matchedDepartments.length > 2 ? ` +${matchedDepartments.length - 2} more` : "";
        return `${formatCount(searchMatchCount)} papers match “${searchQuery.trim()}” (${deptNames}${suffix})`;
      }
      if (matchedFaculty.length > 0) {
        const facNames = matchedFaculty.slice(0, 2).map((f) => f.name).join(", ");
        const suffix = matchedFaculty.length > 2 ? ` +${matchedFaculty.length - 2} more` : "";
        return `${formatCount(searchMatchCount)} papers match “${searchQuery.trim()}” (${facNames}${suffix})`;
      }
      return `${formatCount(searchMatchCount)} papers match “${searchQuery.trim()}” · click a dot, then pick a level in sidebar`;
    }
    if (clusterIndex) {
      return `${formatCount(papers.length)} papers · ${clusterIndex.themes.length} themes · ${clusterIndex.subdomains.length} sub-domains · ${clusterIndex.topics.length} topics`;
    }
    return `All ${formatCount(papers.length)} papers · search, click a dot, then highlight from sidebar`;
  }, [
    loading,
    searchActive,
    searchQuery,
    searchMatchCount,
    clusterHighlightCount,
    searchLoading,
    searchFacultyOnlyId,
    searchDepartmentOnly,
    matchedFaculty,
    matchedDepartments,
    selected,
    highlightActive,
    clusterName,
    clusterIndex,
    papers.length,
  ]);

  const showTooltip = hovered && !selected && !isViewMode;

  const modeToggle = (
    <div
      className={cn(
        "inline-flex rounded-full border border-slate-600 bg-slate-900/90 p-1 backdrop-blur-sm shadow-lg",
        "transition-all duration-300 ease-out",
        isViewMode && "ring-1 ring-white/10",
      )}
      role="group"
      aria-label="Atlas display mode"
    >
      <button
        type="button"
        onClick={enterViewMode}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium",
          "transition-all duration-300 ease-out",
          isViewMode
            ? "bg-white text-black shadow-sm scale-[1.02]"
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
          "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium",
          "transition-all duration-300 ease-out",
          !isViewMode
            ? "bg-white text-black shadow-sm scale-[1.02]"
            : "text-slate-300 hover:text-white hover:bg-slate-800/80",
        )}
        aria-pressed={!isViewMode}
      >
        <MousePointer2 className="h-3.5 w-3.5" />
        Explore
      </button>
    </div>
  );

  return (
    <div className="relative flex flex-col flex-1 min-h-0 bg-black text-white">
      <div className="absolute top-4 right-4 z-30 pointer-events-auto flex items-center gap-2">
        {!isViewMode && (searchActive || selected) && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={clearHighlights}
            className="rounded-full border-slate-600 bg-slate-900/60 text-slate-200 hover:bg-slate-800"
          >
            Clear
          </Button>
        )}
        {!isViewMode && (
          <>
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => zoomBy(1 / 1.3)}
              className="h-9 w-9 rounded-full border-slate-600 bg-slate-900/60 text-slate-200 hover:bg-slate-800 hover:text-white"
              aria-label="Zoom in"
            >
              <ZoomIn className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => zoomBy(1.3)}
              className="h-9 w-9 rounded-full border-slate-600 bg-slate-900/60 text-slate-200 hover:bg-slate-800 hover:text-white"
              aria-label="Zoom out"
            >
              <ZoomOut className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={resetView}
              className="rounded-full border-slate-600 bg-slate-900/60 text-slate-200 hover:bg-slate-800 hover:text-white"
            >
              <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
              Reset view
            </Button>
          </>
        )}
        {modeToggle}
      </div>

      {!isViewMode && (
      <header className="absolute top-0 inset-x-0 z-20 pointer-events-none">
        <div className="flex items-start gap-4 px-4 sm:px-6 pt-4 pb-2 pr-52 sm:pr-64">
          <div ref={comboRef} className="flex-1 max-w-3xl mx-auto pointer-events-auto">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setSearchFacultyOnlyId(null);
                  setSearchDepartmentOnly(null);
                  setComboOpen(true);
                }}
                onFocus={() => setComboOpen(true)}
                placeholder="Search faculty, department, theme, sub-domain, topic, or paper…"
                className="pl-9 h-10 rounded-full border-slate-700/80 bg-slate-900/80 text-white placeholder:text-slate-500 backdrop-blur-sm"
              />
            </div>

            {comboOpen && !loading && clusterIndex && (
              <div className="absolute left-0 right-0 mt-1 max-h-64 overflow-y-auto rounded-xl border border-slate-700/80 bg-slate-950/95 shadow-2xl backdrop-blur-md z-50">
                <p className="px-3 py-2 text-[10px] uppercase tracking-wide text-slate-500 border-b border-slate-800">
                  {query.trim()
                    ? `Matching faculty, departments & areas for “${query.trim()}”`
                    : "Faculty, departments, broad themes, sub-domains & topics"}
                </p>
                {!hasSuggestions ? (
                  <p className="px-3 py-3 text-sm text-slate-500">No matching faculty, departments, or terms</p>
                ) : (
                  <>
                    {departmentSuggestions.map((dept) => (
                      <button
                        key={dept.department}
                        type="button"
                        onClick={() => pickDepartmentSuggestion(dept)}
                        className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm hover:bg-slate-800/80 border-b border-slate-800/60"
                      >
                        <span className="shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold bg-emerald-950 text-emerald-300">
                          Department
                        </span>
                        <Building2 className="h-3.5 w-3.5 shrink-0 text-emerald-400" />
                        <span className="flex-1 min-w-0">
                          <span className="block truncate text-slate-200">{dept.department}</span>
                          <span className="block truncate text-[11px] text-slate-500">
                            {formatCount(dept.facultyCount)} faculty
                          </span>
                        </span>
                        <span className="shrink-0 text-xs text-slate-500">{formatCount(dept.paperCount)}</span>
                      </button>
                    ))}
                    {facultySuggestions.map((fac) => (
                      <button
                        key={fac.facultyId}
                        type="button"
                        onClick={() => pickFacultySuggestion(fac)}
                        className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm hover:bg-slate-800/80 border-b border-slate-800/60"
                      >
                        <span className="shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold bg-violet-950 text-violet-300">
                          Faculty
                        </span>
                        <User className="h-3.5 w-3.5 shrink-0 text-violet-400" />
                        <span className="flex-1 min-w-0">
                          <span className="block truncate text-slate-200">{fac.name}</span>
                          <span className="block truncate text-[11px] text-slate-500">{fac.department}</span>
                        </span>
                        <span className="shrink-0 text-xs text-slate-500">{formatCount(fac.paperCount)}</span>
                      </button>
                    ))}
                    {suggestions.map((term) => (
                      <button
                        key={`${term.type}-${term.label}`}
                        type="button"
                        onClick={() => pickSuggestion(term)}
                        className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm hover:bg-slate-800/80 border-b border-slate-800/60 last:border-0"
                      >
                        <span className="shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold bg-slate-800 text-cyan-400">
                          {typeBadge(term.type)}
                        </span>
                        <span className="flex-1 min-w-0 truncate text-slate-200">{term.label}</span>
                        <span className="shrink-0 text-xs text-slate-500">{formatCount(term.count)}</span>
                      </button>
                    ))}
                  </>
                )}
              </div>
            )}

            <p className="mt-2 text-center text-xs sm:text-sm text-slate-400">
              <span className="inline-block rounded-full border border-slate-700/60 bg-slate-900/50 px-3 py-1 backdrop-blur-sm">
                {statusLine}
              </span>
            </p>

            {showTierLegend && activeHighlightLevel && (
              <div className="mt-2 flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 px-2">
                <span className="inline-flex items-center gap-1.5 text-[11px] text-slate-400">
                  <span
                    className="h-3 w-3 rounded-full shrink-0"
                    style={{
                      backgroundColor: matchLevelColor(activeHighlightLevel),
                      boxShadow: `0 0 8px ${matchLevelColor(activeHighlightLevel)}`,
                    }}
                  />
                  <span className="font-medium text-slate-300">
                    {clusterLabel(activeHighlightLevel)} · {formatCount(clusterHighlightCount)} papers (large)
                  </span>
                </span>
                {searchActive ? (
                  <span className="inline-flex items-center gap-1.5 text-[11px] text-slate-500">
                    <span className="h-2.5 w-2.5 rounded-full bg-gradient-to-r from-red-400 via-cyan-400 to-violet-400" />
                    {formatCount(searchMatchCount)} search matches stay visible (theme colors)
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 text-[11px] text-slate-500">
                    <span className="h-2 w-2 rounded-full bg-[#1e3a5f]" />
                    Other papers dimmed
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </header>
      )}

      <div ref={containerRef} className="absolute inset-0">
        <canvas
          ref={canvasRef}
          className="block w-full h-full touch-none"
          style={{ cursor: canvasCursor }}
        />
      </div>

      {loading && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="flex items-center gap-3 text-slate-300">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span>Loading {formatCount(69677)} papers…</span>
          </div>
        </div>
      )}
      {error && !loading && (
        <div className="absolute inset-0 z-10 flex items-center justify-center p-6">
          <div className="max-w-md rounded-xl border border-red-500/30 bg-red-950/40 p-4 text-sm text-red-200">
            {error}
          </div>
        </div>
      )}

      {showTooltip && (
        <div
          className={cn(
            "absolute z-30 max-w-xs rounded-lg border border-slate-600/50 bg-slate-950/90 px-3 py-2.5",
            "text-sm shadow-xl backdrop-blur-md pointer-events-none",
          )}
          style={{
            left: Math.min(tooltipPos.x + 14, (containerRef.current?.clientWidth ?? 400) - 280),
            top: Math.max(tooltipPos.y - 8, 72),
          }}
        >
          <p className="font-semibold text-white leading-snug">{hovered!.title}</p>
          <p className="mt-1 text-xs text-slate-400">
            {[hovered!.theme, hovered!.subdomain].filter(Boolean).join(" · ")}
            {hovered!.topic ? ` · ${hovered!.topic}` : ""}
          </p>
          <p className="mt-1 text-[10px] text-slate-500">Click to open details in sidebar</p>
        </div>
      )}

      {selected && !isViewMode && (
        <AtlasPaperPanel
          paper={selected}
          detail={paperDetail}
          detailLoading={detailLoading}
          activeHighlightLevel={activeHighlightLevel}
          clusterName={clusterName}
          clusterCount={clusterHighlightCount}
          levelCounts={panelLevelCounts}
          searchActive={searchActive}
          onClusterLevelChange={handleClusterLevelChange}
          onClose={() => {
            setSelected(null);
            setActiveHighlightLevel(null);
            setClusterName("");
          }}
        />
      )}

    </div>
  );
}
