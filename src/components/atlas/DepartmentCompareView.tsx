/**
 * Side-by-side department knowledge-graph compare.
 * Uses existing read APIs only (department-indices ∩ year-indices + atlas points) — no DB writes.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { CSS2DObject, CSS2DRenderer } from "three/examples/jsm/renderers/CSS2DRenderer.js";
import { Building2, Calendar, Columns2, Loader2, ZoomIn, ZoomOut, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { fetchAtlasDict, fetchAtlasPointCoords, type AtlasPointCoord } from "./atlasTiles";
import { themeColorHex } from "./atlasOctree";
import { themeDisplayName } from "./atlasClusters";
import { layoutFilteredThemeCloud, type ThemeSphereCenter } from "./atlasThemeSphereLayout";
import { fetchKgAtlasYearIndices, fetchKgDepartmentAtlasIndices } from "./api";

function intersectIndexSets(sets: number[][]): number[] {
  if (!sets.length) return [];
  const ordered = [...sets].sort((a, b) => a.length - b.length);
  let indices = ordered[0];
  for (let n = 1; n < ordered.length; n++) {
    const allowed = new Set(ordered[n]);
    indices = indices.filter((index) => allowed.has(index));
  }
  return indices;
}

const BG = "#000000";
/** 100% = default framing distance. Users can zoom freely within the range. */
const DEFAULT_ZOOM_PCT = 100;
const MIN_ZOOM_PCT = 25;
const MAX_ZOOM_PCT = 500;
const ZOOM_STEP_PCT = 25;
const BASE_CAMERA_DIST = 4.0;
const MIN_CAMERA_DIST = BASE_CAMERA_DIST / (MAX_ZOOM_PCT / 100);
const MAX_CAMERA_DIST = BASE_CAMERA_DIST / (MIN_ZOOM_PCT / 100);

function formatCount(n: number): string {
  return n.toLocaleString();
}

function clampZoom(pct: number): number {
  return Math.max(MIN_ZOOM_PCT, Math.min(MAX_ZOOM_PCT, Math.round(pct)));
}

function zoomPercentFromDistance(dist: number): number {
  return clampZoom((BASE_CAMERA_DIST / Math.max(dist, MIN_CAMERA_DIST)) * 100);
}

type CloudHandle = {
  dispose: () => void;
  setZoomPercent: (pct: number) => void;
};

function DeptPicker({
  label,
  value,
  options,
  onChange,
  accent,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
  accent: string;
}) {
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (ev: PointerEvent) => {
      if (!rootRef.current?.contains(ev.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [open]);

  const fl = filter.trim().toLowerCase();
  const visible = fl
    ? options.filter((d) => d.toLowerCase().includes(fl))
    : options;

  return (
    <div ref={rootRef} className="relative z-20 min-w-0 flex-1">
      <p className={cn("mb-1 text-[10px] font-semibold uppercase tracking-wide", accent)}>
        {label}
      </p>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "flex h-10 w-full items-center gap-2 rounded-lg border bg-slate-950/80 px-3 text-sm outline-none",
          open ? "border-blue-500" : "border-slate-700 hover:border-slate-600",
        )}
      >
        <Building2 className="h-4 w-4 shrink-0 text-emerald-400" />
        <span className={cn("min-w-0 flex-1 truncate text-left", value ? "text-slate-100" : "text-slate-400")}>
          {value || "Select department…"}
        </span>
        {value && (
          <span
            role="button"
            tabIndex={0}
            onClick={(ev) => { ev.stopPropagation(); onChange(""); }}
            onKeyDown={(ev) => {
              if (ev.key === "Enter" || ev.key === " ") { ev.stopPropagation(); onChange(""); }
            }}
            className="rounded-full p-0.5 text-slate-400 hover:text-white"
            aria-label="Clear department"
          >
            <X className="h-3.5 w-3.5" />
          </span>
        )}
      </button>
      {open && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-56 overflow-hidden rounded-lg border border-slate-700 bg-slate-950 shadow-2xl">
          <input
            autoFocus
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Search departments…"
            className="w-full border-b border-slate-800 bg-transparent px-3 py-2 text-sm text-slate-100 outline-none"
          />
          <ul className="max-h-44 overflow-y-auto py-1" role="listbox">
            {!visible.length ? (
              <li className="px-3 py-2 text-sm text-slate-500">No matches</li>
            ) : (
              visible.map((d) => (
                <li key={d}>
                  <button
                    type="button"
                    className={cn(
                      "w-full truncate px-3 py-1.5 text-left text-sm hover:bg-slate-800",
                      d === value ? "text-emerald-300" : "text-slate-200",
                    )}
                    onClick={() => { onChange(d); setOpen(false); setFilter(""); }}
                  >
                    {d}
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
}

function DeptCloudPane({
  department,
  themes,
  selectedYears,
  accentLabel,
}: {
  department: string;
  themes: string[];
  selectedYears: number;
  accentLabel: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cloudRef = useRef<CloudHandle | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paperCount, setPaperCount] = useState(0);
  const [zoomPercent, setZoomPercent] = useState(DEFAULT_ZOOM_PCT);

  useEffect(() => {
    let cancelled = false;
    cloudRef.current = null;

    if (!department) {
      setPaperCount(0);
      setError(null);
      setLoading(false);
      setZoomPercent(DEFAULT_ZOOM_PCT);
      return;
    }

    setLoading(true);
    setError(null);
    setZoomPercent(DEFAULT_ZOOM_PCT);

    (async () => {
      try {
        const sinceYear = selectedYears > 0
          ? new Date().getFullYear() - selectedYears + 1
          : 0;
        const [departmentResult, yearResult] = await Promise.all([
          fetchKgDepartmentAtlasIndices([department]),
          sinceYear
            ? fetchKgAtlasYearIndices(sinceYear)
            : Promise.resolve(null),
        ]);
        if (cancelled) return;

        const sets = [
          departmentResult?.indices,
          yearResult?.indices,
        ].filter((indices): indices is number[] => Array.isArray(indices));
        const indices = intersectIndexSets(sets);
        if (!indices.length) {
          setPaperCount(0);
          setLoading(false);
          return;
        }

        const coords = await fetchAtlasPointCoords(indices);
        if (cancelled) return;
        const points = indices
          .map((i) => coords.get(i))
          .filter((p): p is AtlasPointCoord => Boolean(p));

        const laid = layoutFilteredThemeCloud(points, themes);
        const colors = new Float32Array(points.length * 3);
        const tmp = new THREE.Color();
        for (let k = 0; k < points.length; k++) {
          const globalId = themes.indexOf(laid.pointThemes[k]);
          tmp.set(themeColorHex(globalId >= 0 ? globalId : 0));
          colors[k * 3] = tmp.r;
          colors[k * 3 + 1] = tmp.g;
          colors[k * 3 + 2] = tmp.b;
        }

        if (cancelled) return;
        setPaperCount(points.length);

        await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
        if (cancelled) return;

        const handle = mountCloud(
          containerRef.current,
          canvasRef.current,
          laid.positions,
          colors,
          laid.centers,
          themes,
          DEFAULT_ZOOM_PCT,
          (pct) => {
            if (!cancelled) setZoomPercent(pct);
          },
        );
        cloudRef.current = handle;
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Could not load department graph");
          setPaperCount(0);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      cloudRef.current?.dispose();
      cloudRef.current = null;
    };
  }, [department, themes, selectedYears]);

  const applyZoom = (pct: number) => {
    const next = clampZoom(pct);
    setZoomPercent(next);
    cloudRef.current?.setZoomPercent(next);
  };

  return (
    <div className="flex min-h-[280px] flex-1 flex-col overflow-hidden rounded-xl border border-slate-700/70 bg-black md:min-h-0">
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-slate-800 bg-slate-950/90 px-3 py-2">
        <p className={cn("min-w-0 truncate text-xs font-medium", accentLabel)}>
          {department || "Select a department"}
        </p>
        <div className="flex shrink-0 items-center gap-2">
          {department && !loading && !error && (
            <span className="rounded-full border border-slate-600/80 bg-slate-900/80 px-2 py-0.5 text-[11px] text-slate-200">
              {formatCount(paperCount)} papers
            </span>
          )}
          {department && !loading && !error && paperCount > 0 && (
            <div
              className="inline-flex items-center gap-0.5 rounded-full border border-slate-600 bg-slate-950/80 p-0.5"
              role="group"
              aria-label={`Zoom for ${department}`}
            >
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => applyZoom(zoomPercent - ZOOM_STEP_PCT)}
                disabled={zoomPercent <= MIN_ZOOM_PCT}
                className="h-7 w-7 rounded-full border-0 bg-transparent text-slate-200 hover:bg-slate-800 disabled:opacity-40"
                aria-label={`Zoom out ${department}`}
              >
                <ZoomOut className="h-3.5 w-3.5" />
              </Button>
              <span className="min-w-[2.75rem] text-center text-[11px] font-semibold tabular-nums text-slate-100">
                {zoomPercent}%
              </span>
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => applyZoom(zoomPercent + ZOOM_STEP_PCT)}
                disabled={zoomPercent >= MAX_ZOOM_PCT}
                className="h-7 w-7 rounded-full border-0 bg-transparent text-slate-200 hover:bg-slate-800 disabled:opacity-40"
                aria-label={`Zoom in ${department}`}
              >
                <ZoomIn className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}
        </div>
      </div>

      <div className="relative min-h-0 flex-1 overflow-hidden">
        <div ref={containerRef} className="absolute inset-0 overflow-hidden">
          <canvas ref={canvasRef} className="block h-full w-full" />
        </div>
        {!department && (
          <div className="absolute inset-0 flex items-center justify-center px-4 text-center text-sm text-slate-500">
            Select a department to load its knowledge graph
          </div>
        )}
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50 text-sm text-slate-300">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading…
          </div>
        )}
        {error && (
          <div className="absolute inset-x-3 top-3 rounded-lg border border-red-800/60 bg-red-950/80 px-3 py-2 text-xs text-red-200">
            {error}
          </div>
        )}
        {department && !loading && !error && paperCount === 0 && (
          <div className="absolute inset-0 flex items-center justify-center px-4 text-center text-sm text-slate-500">
            No atlas papers found for this department
          </div>
        )}
      </div>
    </div>
  );
}

function mountCloud(
  container: HTMLDivElement | null,
  canvas: HTMLCanvasElement | null,
  positions: Float32Array,
  colors: Float32Array,
  centers: ThemeSphereCenter[],
  dictThemes: string[],
  initialZoomPercent: number,
  onZoomChange?: (pct: number) => void,
): CloudHandle {
  if (!container || !canvas) {
    return { dispose: () => {}, setZoomPercent: () => {} };
  }

  const width = Math.max(container.clientWidth, 1);
  const height = Math.max(container.clientHeight, 1);

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(width, height, false);
  renderer.setClearColor(BG, 1);

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(BG, 0.04);

  const camera = new THREE.PerspectiveCamera(50, width / height, 0.01, 100);
  camera.position.set(0, 0.2, BASE_CAMERA_DIST);

  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.dampingFactor = 0.06;
  controls.minDistance = MIN_CAMERA_DIST;
  controls.maxDistance = MAX_CAMERA_DIST;
  controls.enableZoom = true;
  controls.zoomSpeed = 1.0;

  let applyingProgrammaticZoom = false;
  let lastReportedZoom = clampZoom(initialZoomPercent);

  const readZoomPercent = () =>
    zoomPercentFromDistance(camera.position.distanceTo(controls.target));

  const applyZoomPercent = (pct: number) => {
    const next = clampZoom(pct);
    const dist = THREE.MathUtils.clamp(
      BASE_CAMERA_DIST / (next / 100),
      MIN_CAMERA_DIST,
      MAX_CAMERA_DIST,
    );
    const target = controls.target.clone();
    const dir = camera.position.clone().sub(target);
    if (dir.lengthSq() < 1e-8) dir.set(0, 0.05, 1);
    dir.normalize();
    applyingProgrammaticZoom = true;
    camera.position.copy(target).addScaledVector(dir, dist);
    controls.update();
    applyingProgrammaticZoom = false;
    lastReportedZoom = next;
    onZoomChange?.(next);
  };
  // Start at the default framing (100%), not the zoom-out floor.
  applyZoomPercent(initialZoomPercent || DEFAULT_ZOOM_PCT);

  controls.addEventListener("change", () => {
    if (applyingProgrammaticZoom) return;
    const pct = readZoomPercent();
    if (pct === lastReportedZoom) return;
    lastReportedZoom = pct;
    onZoomChange?.(pct);
  });

  const geom = new THREE.BufferGeometry();
  geom.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geom.setAttribute("color", new THREE.BufferAttribute(colors, 3));

  const mat = new THREE.ShaderMaterial({
    uniforms: {
      uSize: { value: 0.11 },
      uAlpha: { value: 0.92 },
      uMaxPx: { value: 14 * Math.min(window.devicePixelRatio, 2) },
    },
    vertexShader: `
      attribute vec3 color;
      varying vec3 vColor;
      uniform float uSize;
      uniform float uMaxPx;
      void main() {
        vColor = color;
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = min(uSize * (300.0 / -mv.z), uMaxPx);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: `
      varying vec3 vColor;
      uniform float uAlpha;
      void main() {
        vec2 c = gl_PointCoord - vec2(0.5);
        float d = length(c);
        if (d > 0.5) discard;
        float edge = smoothstep(0.5, 0.24, d);
        float core = smoothstep(0.28, 0.0, d);
        gl_FragColor = vec4(vColor, uAlpha * edge * (0.85 + 0.15 * core));
      }`,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });

  const points = new THREE.Points(geom, mat);
  points.frustumCulled = false;
  scene.add(points);

  const labelRenderer = new CSS2DRenderer();
  labelRenderer.setSize(width, height);
  labelRenderer.domElement.style.position = "absolute";
  labelRenderer.domElement.style.inset = "0";
  labelRenderer.domElement.style.pointerEvents = "none";
  labelRenderer.domElement.style.overflow = "hidden";
  labelRenderer.domElement.style.zIndex = "2";
  container.appendChild(labelRenderer.domElement);

  const labelObjs: CSS2DObject[] = [];
  for (const c of centers) {
    if (c.count <= 0) continue;
    const id = dictThemes.indexOf(c.theme);
    const color = themeColorHex(id >= 0 ? id : 0);
    const el = document.createElement("div");
    el.style.cssText = [
      "pointer-events:none",
      "display:flex",
      "flex-direction:column",
      "gap:1px",
      "white-space:nowrap",
      "text-shadow:0 0 8px rgba(0,0,0,0.95)",
    ].join(";");
    const title = document.createElement("span");
    title.style.cssText = `font-size:11px;font-weight:600;color:${color}`;
    title.textContent = themeDisplayName(c.theme);
    const count = document.createElement("span");
    count.style.cssText = "font-size:10px;color:#94a3b8";
    count.textContent = `(${formatCount(c.count)} papers)`;
    el.appendChild(title);
    el.appendChild(count);
    const obj = new CSS2DObject(el);
    obj.position.set(c.lx, c.ly, c.lz);
    scene.add(obj);
    labelObjs.push(obj);
  }

  let frame = 0;
  let disposed = false;
  const animate = () => {
    if (disposed) return;
    frame = requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
    labelRenderer.render(scene, camera);
  };
  animate();

  const onResize = () => {
    const w = Math.max(container.clientWidth, 1);
    const h = Math.max(container.clientHeight, 1);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h, false);
    labelRenderer.setSize(w, h);
  };
  window.addEventListener("resize", onResize);
  const ro = typeof ResizeObserver !== "undefined"
    ? new ResizeObserver(() => onResize())
    : null;
  ro?.observe(container);
  requestAnimationFrame(onResize);

  return {
    setZoomPercent: applyZoomPercent,
    dispose: () => {
      disposed = true;
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", onResize);
      ro?.disconnect();
      for (const obj of labelObjs) scene.remove(obj);
      if (labelRenderer.domElement.parentNode === container) {
        container.removeChild(labelRenderer.domElement);
      }
      geom.dispose();
      mat.dispose();
      controls.dispose();
      renderer.dispose();
    },
  };
}

export default function DepartmentCompareView({
  departmentOptions,
  onExit,
}: {
  departmentOptions: string[];
  onExit: () => void;
}) {
  const [deptA, setDeptA] = useState("");
  const [deptB, setDeptB] = useState("");
  const [selectedYears, setSelectedYears] = useState(0);
  const [themes, setThemes] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;
    fetchAtlasDict()
      .then((dict) => { if (!cancelled) setThemes(dict.themes ?? []); })
      .catch(() => { if (!cancelled) setThemes([]); });
    return () => { cancelled = true; };
  }, []);

  const sameDept = Boolean(deptA && deptB && deptA === deptB);
  const options = useMemo(
    () => [...departmentOptions].sort((a, b) => a.localeCompare(b)),
    [departmentOptions],
  );
  const optionsA = useMemo(
    () => (deptB ? options.filter((d) => d !== deptB) : options),
    [options, deptB],
  );
  const optionsB = useMemo(
    () => (deptA ? options.filter((d) => d !== deptA) : options),
    [options, deptA],
  );

  return (
    <div className="absolute inset-0 z-50 flex flex-col overflow-hidden bg-black text-white">
      <div className="relative z-30 flex shrink-0 flex-col gap-3 border-b border-slate-800 bg-slate-950/95 px-4 py-3 backdrop-blur-md">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2 text-sm font-semibold text-slate-100">
            <Columns2 className="h-4 w-4 shrink-0 text-cyan-400" />
            <span className="truncate">Compare departments</span>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onExit}
            className="shrink-0 rounded-full border-slate-600 bg-slate-900/60 text-slate-200 hover:bg-slate-800"
          >
            <X className="mr-1.5 h-3.5 w-3.5" />
            Exit compare
          </Button>
        </div>
        <div className="flex min-w-0 flex-col gap-2 lg:flex-row lg:items-end">
          <DeptPicker
            label="Department A"
            value={deptA}
            options={optionsA}
            onChange={setDeptA}
            accent="text-emerald-400"
          />
          <DeptPicker
            label="Department B"
            value={deptB}
            options={optionsB}
            onChange={setDeptB}
            accent="text-violet-400"
          />
          <div className="relative min-w-0 shrink-0 sm:w-[220px]">
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-sky-400">
              Publication years
            </p>
            <div className="relative">
              <Calendar className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-sky-400" />
              <select
                value={selectedYears}
                onChange={(event) => setSelectedYears(Number(event.target.value))}
                className="h-10 w-full appearance-none rounded-lg border border-slate-700 bg-slate-950/80 py-2 pl-9 pr-8 text-sm text-slate-100 outline-none hover:border-slate-600 focus:border-blue-500"
              >
                <option value={0}>All publication years</option>
                {[1, 2, 3, 4, 5].map((years) => (
                  <option key={years} value={years}>
                    Last {years} {years === 1 ? "year" : "years"}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {sameDept && (
        <p className="shrink-0 bg-amber-950/50 px-4 py-2 text-xs text-amber-200">
          Pick two different departments to compare.
        </p>
      )}

      <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-hidden p-2 md:flex-row">
        <DeptCloudPane
          department={sameDept ? "" : deptA}
          themes={themes}
          selectedYears={selectedYears}
          accentLabel="text-emerald-300"
        />
        <DeptCloudPane
          department={sameDept ? "" : deptB}
          themes={themes}
          selectedYears={selectedYears}
          accentLabel="text-violet-300"
        />
      </div>
    </div>
  );
}
