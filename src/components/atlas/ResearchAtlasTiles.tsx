import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { CSS2DObject, CSS2DRenderer } from "three/examples/jsm/renderers/CSS2DRenderer.js";
import {
  Calendar, ExternalLink, Loader2, RotateCcw, Search, Tag, User, Users, X, ZoomIn, ZoomOut,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  fetchAtlasTree, fetchAtlasDict, fetchAtlasPointCoords, searchAtlasIndices,
  tileObjectId, type AtlasTree, type AtlasDict, type DecodedTile,
} from "./atlasTiles";
import { allNodeKeys, themeColorHex, TileManager } from "./atlasOctree";
import {
  fetchKgAtlasDepartmentSearch, fetchKgAtlasFacultySearch, fetchKgPaperMeta, type KgPaperMeta,
} from "./api";
import { getPaperExternalUrl } from "./paperLink";
import type { KgAtlasDepartmentMatch, KgAtlasFacultyMatch } from "./types";

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

function formatCount(n: number): string {
  return n.toLocaleString();
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
    overlay: THREE.Points;
    overlayGeom: THREE.BufferGeometry;
    baseMaterial: THREE.ShaderMaterial;
    marker: THREE.Mesh;
    frameId: number;
    dirty: boolean;
    lastStream: number;
  } | null>(null);

  const treeRef = useRef<AtlasTree | null>(null);
  const dictRef = useRef<AtlasDict | null>(null);
  const overlayIndicesRef = useRef<number[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchLoading, setSearchLoading] = useState(false);
  const [matchCount, setMatchCount] = useState(0);
  const [matchedFaculty, setMatchedFaculty] = useState<KgAtlasFacultyMatch[]>([]);
  const [matchedDepartments, setMatchedDepartments] = useState<KgAtlasDepartmentMatch[]>([]);
  const [hovered, setHovered] = useState<PickedPaper | null>(null);
  const [selected, setSelected] = useState<PickedPaper | null>(null);
  const [detail, setDetail] = useState<KgPaperMeta | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [activeLevel, setActiveLevel] = useState<ClusterLevel | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const [cursor, setCursor] = useState("grab");
  const [contextLost, setContextLost] = useState(false);
  const [rendererEpoch, setRendererEpoch] = useState(0);

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

  const rebuildOverlay = useCallback((coords: Map<number, [number, number, number]>) => {
    const e = engineRef.current;
    if (!e) return;
    const positions = new Float32Array(coords.size * 3);
    let k = 0;
    for (const [, c] of coords) {
      positions[k * 3] = c[0];
      positions[k * 3 + 1] = c[1];
      positions[k * 3 + 2] = c[2];
      k++;
    }
    e.overlayGeom.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    e.overlayGeom.setDrawRange(0, coords.size);
    e.overlay.visible = coords.size > 0;
    e.baseMaterial.uniforms.uDim.value = coords.size > 0 ? 0.14 : 1.0;
    markDirty();
  }, [markDirty]);

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
    const t = setTimeout(() => setSearchQuery(query), 220);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    const theme = searchParams.get("theme")?.trim();
    if (theme) { setQuery(theme); setSearchQuery(theme); }
  }, [searchParams]);

  useEffect(() => {
    let cancelled = false;
    const q = searchQuery.trim();
    if (!q || loading) {
      overlayIndicesRef.current = [];
      setMatchCount(0);
      setMatchedFaculty([]);
      setMatchedDepartments([]);
      rebuildOverlay(new Map());
      return;
    }
    setSearchLoading(true);
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
        setMatchedFaculty(fac.matches ?? []);
        setMatchedDepartments(dept.matches ?? []);

        const indices = [...union].slice(0, OVERLAY_CAP);
        overlayIndicesRef.current = indices;
        setMatchCount(indices.length);
        const coords = await fetchAtlasPointCoords(indices);
        if (cancelled) return;
        rebuildOverlay(coords);
      } finally {
        if (!cancelled) setSearchLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [searchQuery, loading, rebuildOverlay]);

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
    if (!applied) { setQuery(""); setSearchQuery(""); return; }
    setQuery(applied);
    setSearchQuery(applied);
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
    const overlayMat = new THREE.ShaderMaterial({
      uniforms: {},
      vertexShader: `
        void main() {
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = 0.06 * (300.0 / -mv.z);
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: `
        void main() {
          vec2 c = gl_PointCoord - vec2(0.5);
          float d = length(c);
          if (d > 0.5) discard;
          float edge = smoothstep(0.5, 0.15, d);
          gl_FragColor = vec4(0.98, 0.86, 0.35, edge);
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
    dict.themes.forEach((themeName, themeId) => {
      const anchor = dict.themeAnchors.find((a) => a.theme === themeName);
      if (!anchor) return;
      const color = themeColorHex(themeId);
      const el = document.createElement("div");
      el.style.cssText = "pointer-events:auto;cursor:pointer;user-select:none;transform:translate(-8px,-50%);white-space:nowrap;padding:4px 8px;";
      el.innerHTML = `<span style="font-size:12px;font-weight:600;color:${color};text-shadow:0 0 8px rgba(0,0,0,0.95);">${themeName}</span>
        <span style="display:block;font-size:10px;color:#cbd5e1;text-shadow:0 0 6px rgba(0,0,0,0.95);">${anchor.count.toLocaleString()} papers</span>`;
      el.addEventListener("click", () => {
        controls.target.set(anchor.x, anchor.y, anchor.z);
        const dir = new THREE.Vector3(anchor.x, anchor.y, anchor.z).normalize();
        camera.position.set(anchor.x + dir.x * 0.6, anchor.y + dir.y * 0.6, anchor.z + dir.z * 0.6 + 0.4);
        controls.update();
        if (engineRef.current) engineRef.current.dirty = true;
      });
      const obj = new CSS2DObject(el);
      obj.position.set(anchor.x, anchor.y, anchor.z);
      scene.add(obj);
      labelObjs.push(obj);
    });

    const raycaster = new THREE.Raycaster();
    raycaster.params.Points = { threshold: 0.02 };
    const mouse = new THREE.Vector2();

    const pick = (clientX: number, clientY: number): PickedPaper | null => {
      const rect = canvas.getBoundingClientRect();
      mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(mouse, camera);
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
      hoverFrame++;
      if (hoverFrame % 2 !== 0) return;
      const rect = container.getBoundingClientRect();
      setTooltipPos({ x: ev.clientX - rect.left, y: ev.clientY - rect.top });
      const paper = pick(ev.clientX, ev.clientY);
      setHovered(paper);
      setCursor(paper ? "pointer" : "grab");
    };
    const onClick = (ev: MouseEvent) => {
      const paper = pick(ev.clientX, ev.clientY);
      if (!paper) return;
      setSelected(paper);
      setActiveLevel(null);
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
      overlay, overlayGeom, baseMaterial, marker, frameId: 0, dirty: true, lastStream: 0,
    };

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
      cancelAnimationFrame(engineRef.current?.frameId ?? 0);
      canvas.removeEventListener("mousemove", onMove);
      canvas.removeEventListener("click", onClick);
      canvas.removeEventListener("mouseleave", onLeave);
      canvas.removeEventListener("webglcontextlost", onContextLost);
      canvas.removeEventListener("webglcontextrestored", onContextRestored);
      window.removeEventListener("resize", onResize);
      for (const obj of labelObjs) scene.remove(obj);
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

  const clearSearch = () => {
    setQuery(""); setSearchQuery(""); setActiveLevel(null);
    setSelected(null); setHovered(null);
  };

  const statusLine = useMemo(() => {
    if (loading) return "Loading atlas tiles…";
    if (searchQuery.trim()) {
      if (searchLoading) return `Searching “${searchQuery.trim()}”…`;
      if (matchCount === 0) return `No papers match “${searchQuery.trim()}”`;
      const fac = matchedFaculty.slice(0, 2).map((f) => f.name).join(", ");
      const dept = matchedDepartments.slice(0, 2).map((d) => d.department).join(", ");
      const who = [fac, dept].filter(Boolean).join(" · ");
      return `${formatCount(matchCount)} papers highlighted${who ? ` · ${who}` : ""}`;
    }
    return null;
  }, [loading, searchQuery, searchLoading, matchCount, matchedFaculty, matchedDepartments]);

  const showTooltip = hovered && !selected;

  return (
    <div className="relative flex flex-col flex-1 min-h-0 bg-black text-white">
      <div className="absolute top-4 right-4 z-30 flex items-center gap-2">
        {searchQuery.trim() && (
          <Button type="button" variant="outline" size="sm" onClick={clearSearch}
            className="rounded-full border-slate-600 bg-slate-900/60 text-slate-200 hover:bg-slate-800">Clear</Button>
        )}
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
      </div>

      <header className="absolute top-0 inset-x-0 z-20 pointer-events-none">
        <div className="flex items-start gap-4 px-4 sm:px-6 pt-4 pb-2 pr-52 sm:pr-64">
          <div className="flex-1 max-w-3xl mx-auto pointer-events-auto">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input value={query} onChange={(e) => setQuery(e.target.value)}
                placeholder="Search faculty, department, theme, domain, topic, or paper…"
                className="pl-9 h-10 rounded-full border-slate-700/80 bg-slate-900/80 text-white placeholder:text-slate-500 backdrop-blur-sm" />
            </div>
            {statusLine && (
              <p className="mt-2 text-center text-xs sm:text-sm text-slate-400">
                <span className="inline-block rounded-full border border-slate-700/60 bg-slate-900/50 px-3 py-1 backdrop-blur-sm">
                  {statusLine}
                </span>
              </p>
            )}
          </div>
        </div>
      </header>

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

      {selected && (
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
