import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { CSS2DObject, CSS2DRenderer } from "three/examples/jsm/renderers/CSS2DRenderer.js";
import {
  Building2, Calendar, ChevronDown, ChevronRight, Columns2, ExternalLink, Eye, Loader2, MousePointer2, RotateCcw, Search, Tag, User, Users, X, ZoomIn, ZoomOut,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  fetchAtlasTree, fetchAtlasDict, fetchAtlasPointCoords, searchAtlasIndices,
  tileObjectId, type AtlasTree, type AtlasDict, type AtlasPointCoord, type DecodedTile,
} from "./atlasTiles";
import { allNodeKeys, themeColorHex, TileManager } from "./atlasOctree";
import { createThemeSphereLayout, type ThemeSphereLayout } from "./atlasThemeSphereLayout";
import { themeDisplayName } from "./atlasClusters";
import DepartmentCompareView from "./DepartmentCompareView";
import {
  fetchKgAtlasClusterBreakdown, fetchKgAtlasYearIndices, fetchKgDepartmentAtlasIndices,
  fetchKgFacultyAtlasIndices, fetchKgFacultyIndex, fetchKgPaperMeta, type KgPaperMeta,
} from "./api";
import { getPaperExternalUrl } from "./paperLink";
import type {
  KgAtlasClusterBreakdown,
  KgFacultyItem,
} from "./types";

const BG = "#000000";
const POINT_BUDGET = 250_000;
const MAX_IN_FLIGHT = 8;
// Max matched points held in the highlight overlay. Per-theme counts on the
// cluster labels are derived from this overlay, so it must be able to hold the
// entire atlas — otherwise a filter that matches more points than the cap
// reports truncated theme counts (e.g. a 9,453-paper theme showing as "8,000").
// Set to the backend's own ceiling (getAtlasPoints caps at 70k; the whole cloud
// is ~67.8k) so every theme always shows its true count under any filter.
const OVERLAY_CAP = 70000;

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
type AtlasMode = "view" | "interactive" | "compare";

function formatCount(n: number): string {
  return n.toLocaleString();
}

function formatThemeCountLabel(n: number): string {
  return `(${formatCount(n)} papers)`;
}

/**
 * Compact searchable dropdown for the atlas filter bar: a trigger button that
 * opens a panel with a type-to-filter input and a short scrollable option list.
 */
function FilterCombobox({
  icon,
  placeholder,
  searchPlaceholder,
  value,
  options,
  onSelect,
}: {
  icon: React.ReactNode;
  placeholder: string;
  searchPlaceholder: string;
  value: string;
  options: { value: string; label: string; sub?: string }[];
  onSelect: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (ev: PointerEvent) => {
      if (!rootRef.current?.contains(ev.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  useEffect(() => {
    if (open) {
      setFilter("");
      inputRef.current?.focus();
    }
  }, [open]);

  const selected = options.find((option) => option.value === value);
  const fl = filter.trim().toLowerCase();
  const visible = fl
    ? options.filter((option) =>
        option.label.toLowerCase().includes(fl) || (option.sub ?? "").toLowerCase().includes(fl))
    : options;

  const pick = (next: string) => {
    onSelect(next);
    setOpen(false);
  };

  return (
    <div ref={rootRef} className="relative min-w-0">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={cn(
          "flex h-11 w-full items-center gap-2 rounded-lg border bg-slate-950/80 pl-3 pr-2.5 text-sm outline-none transition-colors",
          open ? "border-blue-500" : "border-slate-700 hover:border-slate-600",
        )}
      >
        <span className="shrink-0">{icon}</span>
        <span className={cn("min-w-0 flex-1 truncate text-left", selected ? "text-slate-100" : "text-slate-400")}>
          {selected?.label ?? placeholder}
        </span>
        {selected && (
          <span
            role="button"
            tabIndex={0}
            onClick={(ev) => { ev.stopPropagation(); pick(""); }}
            onKeyDown={(ev) => {
              if (ev.key === "Enter" || ev.key === " ") { ev.stopPropagation(); pick(""); }
            }}
            aria-label={`Clear ${placeholder}`}
            className="shrink-0 rounded-full p-0.5 text-slate-400 hover:text-white"
          >
            <X className="h-3.5 w-3.5" />
          </span>
        )}
        <ChevronDown className={cn("h-4 w-4 shrink-0 text-slate-500 transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div className="absolute left-0 right-0 z-50 mt-1 overflow-hidden rounded-lg border border-slate-700 bg-slate-950/95 shadow-2xl backdrop-blur-md">
          <div className="relative border-b border-slate-800">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
            <input
              ref={inputRef}
              value={filter}
              onChange={(ev) => setFilter(ev.target.value)}
              onKeyDown={(ev) => {
                if (ev.key === "Escape") setOpen(false);
                if (ev.key === "Enter" && visible.length === 1) pick(visible[0].value);
              }}
              placeholder={searchPlaceholder}
              className="h-9 w-full bg-transparent pl-9 pr-3 text-sm text-slate-100 outline-none placeholder:text-slate-500"
            />
          </div>
          <ul role="listbox" className="max-h-44 overflow-y-auto overscroll-contain p-1">
            <li>
              <button
                type="button"
                onClick={() => pick("")}
                className={cn(
                  "w-full truncate rounded-md px-2.5 py-1.5 text-left text-sm hover:bg-slate-800/80",
                  !value ? "text-blue-400" : "text-slate-300",
                )}
              >
                {placeholder}
              </button>
            </li>
            {visible.length === 0 && (
              <li className="px-2.5 py-2 text-sm text-slate-500">No matches</li>
            )}
            {visible.map((option) => (
              <li key={option.value}>
                <button
                  type="button"
                  onClick={() => pick(option.value)}
                  className={cn(
                    "w-full rounded-md px-2.5 py-1.5 text-left text-sm hover:bg-slate-800/80",
                    option.value === value ? "text-blue-400" : "text-slate-200",
                  )}
                >
                  <span className="block truncate">{option.label}</span>
                  {option.sub && (
                    <span className="block truncate text-[11px] text-slate-500">{option.sub}</span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
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
  obj: CSS2DObject;
  line: THREE.Line;
  tip: THREE.Mesh;
  fullCount: number;
  themeName: string;
};

type DomainLabelEntry = {
  root: HTMLElement;
  titleEl: HTMLElement;
  countEl: HTMLElement;
  obj: CSS2DObject;
  line: THREE.Line;
  tip: THREE.Mesh;
  theme: string;
  domain: string;
};

type DomainCluster = {
  domain: string;
  count: number;
  cx: number; cy: number; cz: number;
  lx: number; ly: number; lz: number;
  hue: number;
  blobR: number;
};

type DrillLayout = {
  posById: Map<number, [number, number, number]>;
  hueById: Map<number, number>;
  centers: DomainCluster[];
  /** Ring radius + biggest blob — the world-space extent used to frame the camera. */
  extent: number;
};

/** Organic knowledge-graph cloud in full 3D: dense core, wispy irregular fringe. */
function kgCloudJitter(
  seed: number,
  radius: number,
  /** Higher → denser core (disk-like). Lower → open fluffy cluster. */
  densityPower = 1.5,
): [number, number, number] {
  const a = Math.sin(seed * 127.1) * 43758.5453;
  const b = Math.sin(seed * 269.5) * 43758.5453;
  const c = Math.sin(seed * 419.2) * 43758.5453;
  const d = Math.sin(seed * 61.3) * 43758.5453;
  const e = Math.sin(seed * 91.7) * 43758.5453;
  const f = Math.sin(seed * 151.9) * 43758.5453;
  const r1 = a - Math.floor(a);
  const r2 = b - Math.floor(b);
  const r3 = c - Math.floor(c);
  const rr = r1 ** densityPower * radius;
  const theta = r2 * Math.PI * 2;
  const cosPhi = r3 * 2 - 1;
  const sinPhi = Math.sqrt(Math.max(0, 1 - cosPhi * cosPhi));
  // Mild anisotropy so silhouettes stay cloud-like in every viewing direction.
  const sx = 0.8 + (d - Math.floor(d)) * 0.45;
  const sy = 0.8 + (e - Math.floor(e)) * 0.45;
  const sz = 0.8 + (f - Math.floor(f)) * 0.45;
  return [
    Math.cos(theta) * sinPhi * rr * sx,
    Math.sin(theta) * sinPhi * rr * sy,
    cosPhi * rr * sz,
  ];
}

/** Evenly-spaced direction on the unit sphere (fibonacci lattice). */
function fibonacciDir(k: number, n: number): [number, number, number] {
  const cosPhi = 1 - (2 * (k + 0.5)) / Math.max(1, n);
  const sinPhi = Math.sqrt(Math.max(0, 1 - cosPhi * cosPhi));
  const theta = Math.PI * (1 + Math.sqrt(5)) * (k + 0.5);
  return [Math.cos(theta) * sinPhi, Math.sin(theta) * sinPhi, cosPhi];
}

/**
 * Domain drill layout in true 3D: every domain centre sits on a sphere (none
 * locked in the middle); each domain is a fluffy volumetric blob. Orbiting
 * shows real parallax. Domain hues are unchanged.
 */
function buildDomainSpreadLayout(points: AtlasPointCoord[]): DrillLayout {
  const byDomain = new Map<string, AtlasPointCoord[]>();
  for (const p of points) {
    const d = p.domain || "Other";
    const list = byDomain.get(d);
    if (list) list.push(p);
    else byDomain.set(d, [p]);
  }
  const domains = [...byDomain.entries()].sort(
    (a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]),
  );
  const n = domains.length;

  // Larger fluffy clouds + more air between them.
  const blobRadius = (count: number) => Math.min(0.95, 0.26 + Math.sqrt(count) * 0.016);
  const gap = 0.55;
  const labelGap = 0.3;

  type Node = {
    domain: string; pts: AtlasPointCoord[]; blobR: number; hue: number;
    x: number; y: number; z: number;
  };
  const radii = domains.map(([, pts]) => blobRadius(pts.length));
  const maxBlobR = radii.reduce((m, r) => Math.max(m, r), 0);

  // Bigger sphere so neighbouring centres stay clearly separated.
  const spreadR = n <= 1
    ? 0
    : Math.max(
        1.55,
        ((2 * maxBlobR + gap) * Math.sqrt(n) / 3.81) * 1.35,
      );

  const nodes: Node[] = domains.map(([domain, pts], k) => {
    const hue = (k * 47) % 360;
    const blobR = radii[k];
    if (n <= 1) {
      return { domain, pts, blobR, hue, x: 0, y: 0, z: 0 };
    }
    // All domains on the 3D sphere — no dedicated centre hub.
    const [dx, dy, dz] = fibonacciDir(k, n);
    // Keep radii similar so clusters don't bunch near the middle.
    const t = 0.88 + 0.12 * ((k * 5) % n) / Math.max(1, n - 1);
    return {
      domain, pts, blobR, hue,
      x: dx * spreadR * t,
      y: dy * spreadR * t,
      z: dz * spreadR * t,
    };
  });

  // Soft 3D collision — keep clouds distinct without flattening onto a plane.
  for (let iter = 0; iter < 100; iter++) {
    let moved = false;
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i], b = nodes[j];
        let dx = b.x - a.x, dy = b.y - a.y, dz = b.z - a.z;
        let d = Math.hypot(dx, dy, dz);
        if (d < 1e-6) {
          const [fx, fy, fz] = fibonacciDir(j, n);
          dx = fx; dy = fy; dz = fz; d = 1e-6;
        }
        const minD = a.blobR + b.blobR + gap;
        if (d < minD) {
          const push = (minD - d) / 2 / d;
          a.x -= dx * push; a.y -= dy * push; a.z -= dz * push;
          b.x += dx * push; b.y += dy * push; b.z += dz * push;
          moved = true;
        }
      }
    }
    if (!moved) break;
  }

  if (n > 1) {
    let mx = 0, my = 0, mz = 0;
    for (const node of nodes) { mx += node.x; my += node.y; mz += node.z; }
    mx /= n; my /= n; mz /= n;
    for (const node of nodes) { node.x -= mx; node.y -= my; node.z -= mz; }
  }

  const posById = new Map<number, [number, number, number]>();
  const hueById = new Map<number, number>();
  const centers: DomainCluster[] = [];
  let extent = 0;

  for (const node of nodes) {
    for (const p of node.pts) {
      const [jx, jy, jz] = kgCloudJitter(p.i + 11, node.blobR, 0.85);
      posById.set(p.i, [node.x + jx, node.y + jy, node.z + jz]);
      hueById.set(p.i, node.hue);
    }

    const dist = Math.hypot(node.x, node.y, node.z);
    const off = node.blobR + labelGap;
    const lx = dist < 1e-4 ? node.x : node.x + (node.x / dist) * off;
    const ly = dist < 1e-4 ? node.y + off : node.y + (node.y / dist) * off;
    const lz = dist < 1e-4 ? node.z : node.z + (node.z / dist) * off;
    extent = Math.max(extent, dist + node.blobR);
    centers.push({
      domain: node.domain,
      count: node.pts.length,
      cx: node.x, cy: node.y, cz: node.z,
      lx, ly, lz,
      hue: node.hue,
      blobR: node.blobR,
    });
  }

  return { posById, hueById, centers, extent };
}

/** Default camera distance for the drilled domain overview (keeps labels clear of the header / Clear all). */
function drillOverviewCameraZ(layout: DrillLayout | null): number {
  if (!layout || layout.centers.length <= 1) return 3.6;
  return Math.max(4.8, (layout.extent + 0.55) * 2.55);
}

type ThemeFilterCluster = {
  theme: string;
  count: number;
  cx: number; cy: number; cz: number;
  lx: number; ly: number; lz: number;
  blobR: number;
};

type ThemeFilterLayout = {
  posById: Map<number, [number, number, number]>;
  centers: ThemeFilterCluster[];
  extent: number;
};

/**
 * When filters/search show theme clouds (not domain-drilled), rebuild each
 * theme as an open 3D cluster on a sphere — atlas tile coords are flat discs.
 */
function buildThemeFilterLayout(points: AtlasPointCoord[]): ThemeFilterLayout {
  const byTheme = new Map<string, AtlasPointCoord[]>();
  for (const p of points) {
    const t = p.theme || "Other";
    const list = byTheme.get(t);
    if (list) list.push(p);
    else byTheme.set(t, [p]);
  }
  const themes = [...byTheme.entries()].sort(
    (a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]),
  );
  const n = themes.length;

  // Spherical themes with more point spread (match unfiltered bake feel).
  const blobRadius = (count: number) => Math.min(1.45, 0.48 + Math.sqrt(count) * 0.032);
  const gap = 0.5;
  const labelGap = 0.32;

  type Node = {
    theme: string; pts: AtlasPointCoord[]; blobR: number;
    x: number; y: number; z: number;
  };
  const radii = themes.map(([, pts]) => blobRadius(pts.length));
  const maxBlobR = radii.reduce((m, r) => Math.max(m, r), 0);
  const spreadR = n <= 1
    ? 0
    : Math.max(1.8, ((2 * maxBlobR + gap) * Math.sqrt(n) / 3.81) * 1.4);

  const nodes: Node[] = themes.map(([theme, pts], k) => {
    const blobR = radii[k];
    if (n <= 1) return { theme, pts, blobR, x: 0, y: 0, z: 0 };
    const [dx, dy, dz] = fibonacciDir(k, n);
    const t = 0.88 + 0.12 * ((k * 5) % n) / Math.max(1, n - 1);
    return {
      theme, pts, blobR,
      x: dx * spreadR * t,
      y: dy * spreadR * t,
      z: dz * spreadR * t,
    };
  });

  for (let iter = 0; iter < 100; iter++) {
    let moved = false;
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i], b = nodes[j];
        let dx = b.x - a.x, dy = b.y - a.y, dz = b.z - a.z;
        let d = Math.hypot(dx, dy, dz);
        if (d < 1e-6) {
          const [fx, fy, fz] = fibonacciDir(j, n);
          dx = fx; dy = fy; dz = fz; d = 1e-6;
        }
        const minD = a.blobR + b.blobR + gap;
        if (d < minD) {
          const push = (minD - d) / 2 / d;
          a.x -= dx * push; a.y -= dy * push; a.z -= dz * push;
          b.x += dx * push; b.y += dy * push; b.z += dz * push;
          moved = true;
        }
      }
    }
    if (!moved) break;
  }

  if (n > 1) {
    let mx = 0, my = 0, mz = 0;
    for (const node of nodes) { mx += node.x; my += node.y; mz += node.z; }
    mx /= n; my /= n; mz /= n;
    for (const node of nodes) { node.x -= mx; node.y -= my; node.z -= mz; }
  }

  const posById = new Map<number, [number, number, number]>();
  const centers: ThemeFilterCluster[] = [];
  let extent = 0;

  for (const node of nodes) {
    // More open fill so larger spheres stay fluffy (not white-hot cores).
    for (const p of node.pts) {
      const [jx, jy, jz] = kgCloudJitter(p.i + 31, node.blobR, 0.65);
      posById.set(p.i, [node.x + jx, node.y + jy, node.z + jz]);
    }
    const dist = Math.hypot(node.x, node.y, node.z);
    // Push tiny-theme labels farther out so they don't collide with big-cluster labels.
    const off = node.blobR + labelGap + (node.pts.length < 40 ? 0.25 : 0);
    const lx = dist < 1e-4 ? node.x : node.x + (node.x / dist) * off;
    const ly = dist < 1e-4 ? node.y + off : node.y + (node.y / dist) * off;
    const lz = dist < 1e-4 ? node.z : node.z + (node.z / dist) * off;
    extent = Math.max(extent, dist + node.blobR);
    centers.push({
      theme: node.theme,
      count: node.pts.length,
      cx: node.x, cy: node.y, cz: node.z,
      lx, ly, lz,
      blobR: node.blobR,
    });
  }

  return { posById, centers, extent };
}

function themeFilterCameraZ(layout: ThemeFilterLayout | null): number {
  if (!layout || layout.centers.length <= 1) return 3.2;
  return Math.max(3.8, (layout.extent + 0.4) * 2.05);
}

/** Build department list for a theme from the current search overlay points. */
function buildThemeBreakdownFromOverlay(
  theme: string,
  query: string,
  points: AtlasPointCoord[],
  paperLimit = 200,
): KgAtlasClusterBreakdown {
  const inTheme = points.filter((p) => p.theme === theme);
  const byDept = new Map<string, {
    paperCount: number;
    papers: KgAtlasClusterBreakdown["departments"][0]["papers"];
    indices: Set<number>;
  }>();

  for (const p of inTheme) {
    const dept = (p.department || "").trim() || "Unassigned";
    let entry = byDept.get(dept);
    if (!entry) {
      entry = { paperCount: 0, papers: [], indices: new Set() };
      byDept.set(dept, entry);
    }
    entry.paperCount += 1;
    entry.indices.add(p.i);
    if (entry.papers.length < paperLimit) {
      entry.papers.push({
        id: p.id,
        i: p.i,
        title: p.title || "Untitled",
        domain: p.domain || "",
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
      faculty: [] as NonNullable<KgAtlasClusterBreakdown["departments"][0]["faculty"]>,
      // Internal: full index set for faculty intersection (stripped before render if needed)
      _indices: entry.indices,
    }))
    .sort((a, b) => b.paperCount - a.paperCount || a.department.localeCompare(b.department));

  return { theme, query, totalPapers: inTheme.length, departments };
}

/**
 * Build a department → papers breakdown for a single domain from the drilled
 * theme's points. Powers the right sidebar when a domain is focused.
 */
function buildDomainBreakdownFromPoints(
  domain: string,
  query: string,
  points: AtlasPointCoord[],
  paperLimit = 200,
): KgAtlasClusterBreakdown {
  const inDomain = points.filter((p) => (p.domain || "Other") === domain);
  const byDept = new Map<string, {
    paperCount: number;
    papers: KgAtlasClusterBreakdown["departments"][0]["papers"];
  }>();

  for (const p of inDomain) {
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
        domain: p.domain || "",
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
      faculty: [] as NonNullable<KgAtlasClusterBreakdown["departments"][0]["faculty"]>,
    }))
    .sort((a, b) => b.paperCount - a.paperCount || a.department.localeCompare(b.department));

  return { theme: domain, query, totalPapers: inDomain.length, departments };
}

/** Attach professors under each department from a server breakdown, scoped to local papers. */
function mergeFacultyIntoBreakdown(
  local: KgAtlasClusterBreakdown,
  api: KgAtlasClusterBreakdown,
): KgAtlasClusterBreakdown {
  const apiByDept = new Map(
    api.departments.map((d) => [d.department.trim().toLowerCase(), d]),
  );
  return {
    ...local,
    departments: local.departments.map((dept) => {
      const apiDept = apiByDept.get(dept.department.trim().toLowerCase());
      const localSet: Set<number> =
        (dept as { _indices?: Set<number> })._indices
        ?? new Set(dept.papers.map((p) => p.i));

      const faculty = (apiDept?.faculty ?? [])
        .map((f) => {
          const papers = f.papers.filter((p) => localSet.has(p.i));
          if (!papers.length) return null;
          return {
            facultyId: f.facultyId,
            name: f.name,
            paperCount: papers.length,
            papers,
          };
        })
        .filter((f): f is NonNullable<typeof f> => !!f)
        .sort((a, b) => b.paperCount - a.paperCount || a.name.localeCompare(b.name));

      const { _indices: _drop, ...rest } = dept as typeof dept & { _indices?: Set<number> };
      void _drop;
      return { ...rest, faculty };
    }),
  };
}

function ThemeClusterPanel({
  theme, query, breakdown, loading, themeColor, onClose, onPaperClick, domain,
}: {
  theme: string;
  query: string;
  breakdown: KgAtlasClusterBreakdown | null;
  loading: boolean;
  themeColor: string;
  onClose: () => void;
  onPaperClick: (paper: PickedPaper) => void;
  /** When set, the panel is scoped to a single domain within `theme`. */
  domain?: string | null;
}) {
  const [openDept, setOpenDept] = useState<string | null>(null);
  const [openFaculty, setOpenFaculty] = useState<string | null>(null);
  const [deptFilter, setDeptFilter] = useState("");
  const q = deptFilter.trim().toLowerCase();
  const depts = (breakdown?.departments ?? []).filter((d) =>
    !q || d.department.toLowerCase().includes(q),
  );

  const pickPaper = (p: { id: string; i: number; title: string; domain: string; topic?: string; citations: number }) => {
    onPaperClick({
      i: p.i,
      id: p.id,
      title: p.title,
      theme,
      domain: p.domain,
      citations: p.citations,
      x: 0, y: 0, z: 0,
    });
  };

  return (
    <aside className="absolute top-0 right-0 bottom-0 z-40 w-full sm:w-[420px] border-l border-slate-700/60 bg-slate-950/95 backdrop-blur-md overflow-y-auto shadow-2xl">
      <div className="sticky top-0 z-10 flex items-center justify-between gap-2 px-4 py-3 border-b border-slate-700/60 bg-slate-950/95">
        <span className="text-xs font-semibold uppercase tracking-wide text-cyan-400/90">
          {domain ? "Domain cluster" : "Theme cluster"}
        </span>
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
              <p className="text-sm font-semibold text-white leading-snug">{domain || theme}</p>
              <p className="mt-1 text-xs text-slate-400">
                {domain
                  ? <>Papers in this domain{breakdown ? ` · ${formatCount(breakdown.totalPapers)} total` : ""}</>
                  : <>Papers matching “{query}” in this theme{breakdown ? ` · ${formatCount(breakdown.totalPapers)} total` : ""}</>}
              </p>
              {domain && (
                <p className="mt-0.5 text-[11px] text-slate-500 truncate">in {theme}</p>
              )}
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
              const faculty = dept.faculty ?? [];
              const hasFaculty = faculty.length > 0;
              return (
                <div key={dept.department}
                  className="rounded-xl border border-slate-700/50 bg-slate-900/40 overflow-hidden">
                  <button type="button"
                    onClick={() => {
                      setOpenDept(isOpen ? null : dept.department);
                      setOpenFaculty(null);
                    }}
                    className="flex w-full items-center gap-2 px-3 py-2.5 text-left hover:bg-slate-800/50 transition-colors">
                    <ChevronDown className={cn(
                      "h-4 w-4 shrink-0 text-slate-500 transition-transform",
                      isOpen && "rotate-180",
                    )} />
                    <span className="flex-1 min-w-0 text-sm font-medium text-slate-200 truncate">
                      {dept.department}
                    </span>
                    <span className="shrink-0 text-xs text-slate-500">
                      {hasFaculty
                        ? `${formatCount(faculty.length)} faculty · ${formatCount(dept.paperCount)} papers`
                        : `${formatCount(dept.paperCount)} papers`}
                    </span>
                  </button>
                  {isOpen && (
                    <div className="border-t border-slate-800/80 px-2 py-2 space-y-1 max-h-80 overflow-y-auto">
                      {hasFaculty ? (
                        <>
                          <p className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500 flex items-center gap-1">
                            <User className="h-3 w-3" />
                            Faculty in this department
                          </p>
                          {faculty.map((fac) => {
                            const facKey = `${dept.department}::${fac.facultyId || fac.name}`;
                            const facOpen = openFaculty === facKey;
                            return (
                              <div key={facKey} className="rounded-lg border border-slate-800/80 bg-slate-950/40 overflow-hidden">
                                <button
                                  type="button"
                                  onClick={() => setOpenFaculty(facOpen ? null : facKey)}
                                  className="flex w-full items-center gap-2 px-2.5 py-2 text-left hover:bg-slate-800/50 transition-colors"
                                >
                                  <ChevronRight className={cn(
                                    "h-3.5 w-3.5 shrink-0 text-slate-500 transition-transform",
                                    facOpen && "rotate-90",
                                  )} />
                                  <User className="h-3.5 w-3.5 shrink-0 text-violet-400" />
                                  <span className="flex-1 min-w-0 text-xs font-medium text-slate-200 truncate">
                                    {fac.name}
                                  </span>
                                  <span className="shrink-0 text-[10px] text-slate-500">
                                    {formatCount(fac.paperCount)}
                                  </span>
                                </button>
                                {facOpen && (
                                  <ul className="border-t border-slate-800/80 px-1.5 py-1.5 space-y-0.5">
                                    {fac.papers.map((p) => (
                                      <li key={p.id || String(p.i)}>
                                        <button
                                          type="button"
                                          onClick={() => pickPaper(p)}
                                          className="w-full rounded-md px-2 py-1.5 text-left hover:bg-slate-800/70 transition-colors"
                                        >
                                          <span className="block text-xs text-white leading-snug line-clamp-2">{p.title}</span>
                                          {p.topic && (
                                            <span className="block mt-0.5 text-[10px] text-slate-500 truncate">{p.topic}</span>
                                          )}
                                        </button>
                                      </li>
                                    ))}
                                    {fac.paperCount > fac.papers.length && (
                                      <li className="px-2 py-1 text-[10px] text-slate-500">
                                        Showing {formatCount(fac.papers.length)} of {formatCount(fac.paperCount)} papers
                                      </li>
                                    )}
                                  </ul>
                                )}
                              </div>
                            );
                          })}
                        </>
                      ) : (
                        <ul className="space-y-1">
                          {dept.papers.map((p) => (
                            <li key={p.id || String(p.i)}>
                              <button type="button"
                                onClick={() => pickPaper(p)}
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

export default function ResearchAtlasTiles({
  mode,
  onModeChange,
}: {
  mode?: AtlasMode;
  onModeChange?: (mode: AtlasMode) => void;
} = {}) {
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
    labelByDomain: Map<string, DomainLabelEntry[]>;
    frameId: number;
    dirty: boolean;
    lastStream: number;
  } | null>(null);

  const treeRef = useRef<AtlasTree | null>(null);
  const dictRef = useRef<AtlasDict | null>(null);
  /** Client sphere layout for the unfiltered tile cloud. */
  const themeSphereLayoutRef = useRef<ThemeSphereLayout | null>(null);
  const overlayIndicesRef = useRef<number[]>([]);
  const overlayPointsRef = useRef<AtlasPointCoord[]>([]);
  const filterActiveRef = useRef(false);
  /** Per-theme filtered counts (null = not filtering) — drives theme label visibility. */
  const filterCountsRef = useRef<Record<string, number> | null>(null);
  /**
   * Point set currently driving domain counts / left sidebar.
   * Kept separate from drillPointsRef (full theme) so the right sidebar total
   * matches the left when filtering is active.
   */
  const domainCountPointsRef = useRef<AtlasPointCoord[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchLoading, setSearchLoading] = useState(false);
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
  const [internalMode, setInternalMode] = useState<AtlasMode>("interactive");
  const atlasMode = mode ?? internalMode;
  const setAtlasMode = useCallback(
    (next: AtlasMode | ((prev: AtlasMode) => AtlasMode)) => {
      const resolved = typeof next === "function" ? next(atlasMode) : next;
      if (mode === undefined) setInternalMode(resolved);
      onModeChange?.(resolved);
    },
    [atlasMode, mode, onModeChange],
  );
  const [clusterTheme, setClusterTheme] = useState<string | null>(null);
  const [clusterBreakdown, setClusterBreakdown] = useState<KgAtlasClusterBreakdown | null>(null);
  /** When the cluster sidebar is scoped to a focused domain (vs a whole theme). */
  const [clusterDomain, setClusterDomain] = useState<string | null>(null);
  const [clusterLoading, setClusterLoading] = useState(false);
  const [drillTheme, setDrillTheme] = useState<string | null>(null);
  const [focusedDomain, setFocusedDomain] = useState<string | null>(null);
  const [filterThemeCounts, setFilterThemeCounts] = useState<{ theme: string; count: number; color: string }[]>([]);
  const [drillDomainCounts, setDrillDomainCounts] = useState<{ domain: string; count: number; hue: number }[]>([]);
  const [facultyOptions, setFacultyOptions] = useState<KgFacultyItem[]>([]);
  const [selectedDepartment, setSelectedDepartment] = useState("");
  const [selectedFacultyId, setSelectedFacultyId] = useState("");
  const [selectedYears, setSelectedYears] = useState(0);
  const onThemeLabelClickRef = useRef<(theme: string) => void>(() => {});
  const onDomainLabelClickRef = useRef<(theme: string, domain: string) => void>(() => {});
  /** Raycast papers from label DOM handlers (labels sit above the canvas). */
  const pickPaperRef = useRef<(clientX: number, clientY: number) => PickedPaper | null>(() => null);
  const selectPaperRef = useRef<(paper: PickedPaper) => void>(() => {});
  const hoverPaperRef = useRef<(
    paper: PickedPaper | null,
    clientX: number,
    clientY: number,
  ) => void>(() => {});
  const drillThemeRef = useRef<string | null>(null);
  const drillLayoutRef = useRef<DrillLayout | null>(null);
  /** Open 3D theme clouds while filters/search are active (not domain-drilled). */
  const themeFilterLayoutRef = useRef<ThemeFilterLayout | null>(null);
  /** Full point set of the drilled theme (all domains) — lets focus re-filter. */
  const drillPointsRef = useRef<AtlasPointCoord[]>([]);
  /** Domain currently isolated/zoomed within the drilled theme, or null. */
  const focusedDomainRef = useRef<string | null>(null);
  const themesClickableRef = useRef(true);
  const viewOnlyRef = useRef(false);

  const isViewMode = atlasMode === "view";
  const isCompareMode = atlasMode === "compare";
  const isExploreMode = atlasMode === "interactive";
  const structuredFilterActive = Boolean(
    selectedDepartment || selectedFacultyId || selectedYears,
  );
  const departmentOptions = useMemo(
    () => [...new Set(facultyOptions.map((faculty) => faculty.department).filter(Boolean))]
      .sort((a, b) => a.localeCompare(b)),
    [facultyOptions],
  );
  const visibleFacultyOptions = useMemo(
    () => facultyOptions
      .filter((faculty) => !selectedDepartment || faculty.department === selectedDepartment)
      .sort((a, b) => a.name.localeCompare(b.name)),
    [facultyOptions, selectedDepartment],
  );

  useEffect(() => {
    viewOnlyRef.current = isViewMode;
  }, [isViewMode]);

  // Re-fit the WebGL canvas after nav chrome / fullscreen layout changes.
  useEffect(() => {
    const t = window.setTimeout(() => window.dispatchEvent(new Event("resize")), 520);
    return () => window.clearTimeout(t);
  }, [isViewMode, isCompareMode]);

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

  /** Pull the camera back so the domain ring + labels clear the search header. */
  const frameDrillOverview = useCallback(() => {
    const e = engineRef.current;
    if (!e) return;
    // Bias the look-target slightly down so the ring sits under the header chips.
    e.controls.target.set(0, -0.2, 0);
    e.camera.position.set(0, -0.2, drillOverviewCameraZ(drillLayoutRef.current));
    e.controls.update();
    e.dirty = true;
    streamNow();
  }, [streamNow]);

  /** Frame the open 3D theme clouds used by faculty/dept/year filters. */
  const frameThemeFilterOverview = useCallback(() => {
    const e = engineRef.current;
    if (!e) return;
    e.controls.target.set(0, -0.15, 0);
    e.camera.position.set(0.55, 0.35, themeFilterCameraZ(themeFilterLayoutRef.current));
    e.controls.update();
    e.dirty = true;
    streamNow();
  }, [streamNow]);

  const syncThemeLabelPresentation = useCallback((filterActive: boolean, clickable: boolean) => {
    const e = engineRef.current;
    if (!e) return;
    for (const [, entry] of e.labelByTheme) {
      const { root, titleEl, countEl, themeName } = entry;
      // The label block is clickable (drills into the theme); the inner spans
      // stay pass-through so the hit falls to the root's click handler.
      // In view mode labels stay visible but are not interactive.
      root.style.pointerEvents = clickable ? "auto" : "none";
      root.style.cursor = clickable ? "pointer" : "default";
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
      titleEl.style.cursor = clickable ? "pointer" : "default";

      countEl.style.display = "block";
      countEl.style.fontSize = filterActive ? "9px" : "10px";
      countEl.style.color = "#94a3b8";
    }
  }, []);

  // Single source of truth for cluster-label VISIBILITY. Because CSS2DRenderer
  // rewrites element.style.display every frame from the CSS2DObject's .visible
  // flag, visibility MUST be driven via obj.visible (not root.style.display).
  //
  // Rules:
  //  - Drilled  → all theme labels hidden; the drilled theme's domain labels are
  //    positioned at their spread centers and shown (only the focused one when a
  //    domain is focused). All other domain labels hidden.
  //  - Not drilled → theme labels shown (except zero-count themes while
  //    filtering); all domain labels hidden.
  // Idempotent, so it can be re-run after any state change.
  const syncDrillLabels = useCallback(() => {
    const e = engineRef.current;
    if (!e) return;
    const norm = (s: string) => (s || "").trim().toLowerCase();
    const drill = drillThemeRef.current;
    const drillN = norm(drill ?? "");
    const layout = drillLayoutRef.current;
    const counts = filterCountsRef.current;
    const focus = drill ? focusedDomainRef.current : null;
    const focusN = norm(focus ?? "");

    const themeFilter = !drill ? themeFilterLayoutRef.current : null;
    const themeCenterByName = new Map<string, ThemeFilterCluster>();
    if (themeFilter) {
      for (const c of themeFilter.centers) themeCenterByName.set(norm(c.theme), c);
    }
    const dict = dictRef.current;

    for (const [theme, entry] of e.labelByTheme) {
      let show = !drill;
      if (show && counts) show = (counts[theme] ?? 0) > 0;
      entry.obj.visible = show;
      entry.line.visible = show;
      entry.tip.visible = show;
      if (!show) continue;

      // While filtering, move labels onto the open 3D cluster layout.
      const fc = themeCenterByName.get(norm(theme));
      if (fc) {
        entry.tip.position.set(fc.cx, fc.cy, fc.cz);
        entry.obj.position.set(fc.lx, fc.ly, fc.lz);
        entry.line.geometry.setFromPoints([
          new THREE.Vector3(fc.cx, fc.cy, fc.cz),
          new THREE.Vector3(fc.lx, fc.ly, fc.lz),
        ]);
      } else if (dict) {
        const sphere = themeSphereLayoutRef.current?.centers.find(
          (c) => norm(c.theme) === norm(theme),
        );
        if (sphere) {
          entry.tip.position.set(sphere.cx, sphere.cy, sphere.cz);
          entry.obj.position.set(sphere.lx, sphere.ly, sphere.lz);
          entry.line.geometry.setFromPoints([
            new THREE.Vector3(sphere.cx, sphere.cy, sphere.cz),
            new THREE.Vector3(sphere.lx, sphere.ly, sphere.lz),
          ]);
        } else {
          const themeId = dict.themes.indexOf(theme);
          const anchor = dict.themeAnchors.find((a) => a.theme === theme);
          if (anchor && themeId >= 0) {
            const pos = themeLabelWorldPos(anchor.x, anchor.y, anchor.z, themeId);
            entry.tip.position.set(pos.clusterX, pos.clusterY, pos.clusterZ);
            entry.obj.position.set(pos.x, pos.y, pos.z);
            entry.line.geometry.setFromPoints([
              new THREE.Vector3(pos.clusterX, pos.clusterY, pos.clusterZ),
              new THREE.Vector3(pos.x, pos.y, pos.z),
            ]);
          }
        }
      }
    }

    // Match domains by normalized name so subtle whitespace/case differences
    // between the point stream and the dict anchors never drop a label.
    const centerByDomain = new Map<string, DomainCluster>();
    if (drill && layout) for (const c of layout.centers) centerByDomain.set(norm(c.domain), c);

    for (const [theme, list] of e.labelByDomain) {
      const themeMatch = !!drill && norm(theme) === drillN;
      for (const d of list) {
        const c = themeMatch ? centerByDomain.get(norm(d.domain)) : undefined;
        // While a domain is focused, only that domain's label stays visible.
        // Also drop domains with no papers in the current (refined) set.
        const show = !!c && c.count > 0 && (!focus || focusN === norm(d.domain));
        if (!show || !c) {
          d.obj.visible = false;
          d.line.visible = false;
          d.tip.visible = false;
          continue;
        }
        const col = `hsl(${c.hue}, 72%, 66%)`;
        d.titleEl.style.color = col;
        d.countEl.textContent = formatThemeCountLabel(c.count);
        (d.tip.material as THREE.MeshBasicMaterial).color.set(col);
        (d.line.material as THREE.LineBasicMaterial).color.set(col);
        d.tip.position.set(c.cx, c.cy, c.cz);
        d.obj.position.set(c.lx, c.ly, c.lz);
        d.line.geometry.setFromPoints([
          new THREE.Vector3(c.cx, c.cy, c.cz),
          new THREE.Vector3(c.lx, c.ly, c.lz),
        ]);
        // The DOM element starts at opacity:0 (see creation); make it visible.
        // Visibility itself is driven by obj.visible (CSS2DRenderer owns display).
        d.root.style.opacity = "1";
        // Labels stay interactive for domain focus, but paper hits are preferred
        // in the click/move handlers so the DOM box never traps paper selection.
        d.root.style.pointerEvents = viewOnlyRef.current ? "none" : "auto";
        d.root.style.cursor = viewOnlyRef.current ? "default" : "pointer";
        d.titleEl.style.pointerEvents = "none";
        d.countEl.style.pointerEvents = "none";
        d.obj.visible = true;
        d.line.visible = true;
        d.tip.visible = true;
      }
    }
    markDirty();
  }, [markDirty]);

  const applyThemeLabelCounts = useCallback((counts: Record<string, number> | null) => {
    const e = engineRef.current;
    if (!e) return;
    const filterActive = counts != null;
    filterActiveRef.current = filterActive;
    filterCountsRef.current = counts;
    for (const [, entry] of e.labelByTheme) {
      const n = counts ? (counts[entry.themeName] ?? 0) : entry.fullCount;
      entry.countEl.textContent = formatThemeCountLabel(n);
    }
    // Styling only — actual visibility is applied by syncDrillLabels (obj.visible).
    // Theme labels stay clickable in view mode as well.
    syncThemeLabelPresentation(filterActive, true);
    syncDrillLabels();
  }, [syncThemeLabelPresentation, syncDrillLabels]);

  const rebuildOverlay = useCallback((points: AtlasPointCoord[]) => {
    const e = engineRef.current;
    const dict = dictRef.current;
    if (!e) return;

    // While drilled, use per-domain layout; otherwise (filters/search) rebuild
    // each theme as an open 3D cloud so filtered results aren't flat discs.
    const layout = drillThemeRef.current ? drillLayoutRef.current : null;
    // When a domain is focused, isolate its points (hide the other domains).
    const focus = drillThemeRef.current ? focusedDomainRef.current : null;
    const src = focus ? points.filter((p) => (p.domain || "Other") === focus) : points;
    const themeFilter = !layout && src.length > 0
      ? buildThemeFilterLayout(src)
      : null;
    themeFilterLayoutRef.current = themeFilter;

    const n = src.length;
    const positions = new Float32Array(n * 3);
    const colors = new Float32Array(n * 3);
    const tmp = new THREE.Color();
    const counts: Record<string, number> = {};

    for (let k = 0; k < n; k++) {
      const p = src[k];
      const pos = layout?.posById.get(p.i) ?? themeFilter?.posById.get(p.i);
      if (pos) {
        positions[k * 3] = pos[0];
        positions[k * 3 + 1] = pos[1];
        positions[k * 3 + 2] = pos[2];
      } else {
        positions[k * 3] = p.x;
        positions[k * 3 + 1] = p.y;
        positions[k * 3 + 2] = p.z;
      }
      const hue = layout?.hueById.get(p.i);
      if (hue != null) {
        // Domain drill hues — additive glow brightens dense cores, so start darker.
        tmp.setHSL(hue / 360, 0.9, 0.5);
      } else {
        // Exact theme palette + brightness (same as the unfiltered atlas cloud).
        const themeId = dict ? dict.themes.indexOf(p.theme) : -1;
        tmp.set(themeColorHex(themeId >= 0 ? themeId : 0));
      }
      colors[k * 3] = tmp.r;
      colors[k * 3 + 1] = tmp.g;
      colors[k * 3 + 2] = tmp.b;
      if (p.theme) counts[p.theme] = (counts[p.theme] ?? 0) + 1;
    }

    e.overlayGeom.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    e.overlayGeom.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    e.overlayGeom.setDrawRange(0, n);
    // Same Additive theme look as the base atlas — no brightness boost.
    e.overlayMat.blending = THREE.AdditiveBlending;
    e.overlayMat.depthTest = false;
    e.overlayMat.uniforms.uSize.value = layout ? 0.1 : 0.07;
    e.overlayMat.uniforms.uAlpha.value = layout ? 0.32 : 0.95;
    e.overlayMat.uniforms.uMaxPx.value = 10.0 * Math.min(window.devicePixelRatio, 2);
    e.overlayMat.needsUpdate = true;
    e.overlay.visible = n > 0;
    // Hide the full atlas cloud while filtering so only matched papers show.
    e.tileGroup.visible = n === 0;
    e.baseMaterial.uniforms.uDim.value = 1.0;

    // Refresh each domain's paper count from the current point set so labels
    // reflect a narrowing/refine (positions stay stable via the drill layout).
    // Use `points` (pre-focus) so a focused view still shows real per-domain totals.
    domainCountPointsRef.current = points;
    if (layout) {
      const domCounts = new Map<string, number>();
      for (const p of points) {
        const d = p.domain || "Other";
        domCounts.set(d, (domCounts.get(d) ?? 0) + 1);
      }
      for (const c of layout.centers) c.count = domCounts.get(c.domain) ?? 0;
      // Keep the bottom-left domains panel in sync with the current (narrowed) set.
      setDrillDomainCounts(
        layout.centers
          .filter((c) => c.count > 0)
          .map((c) => ({ domain: c.domain, count: c.count, hue: c.hue }))
          .sort((a, b) => b.count - a.count || a.domain.localeCompare(b.domain)),
      );
    }

    overlayPointsRef.current = src;
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
        themeSphereLayoutRef.current = createThemeSphereLayout(
          dict.themes,
          dict.themeAnchors,
        );
      })
      .catch((err) => { if (!cancelled) setError(String(err?.message || err)); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const theme = searchParams.get("theme")?.trim();
    if (theme) {
      setDrillTheme(theme);
      setSearchQuery(theme);
    }
  }, [searchParams]);

  useEffect(() => {
    fetchKgFacultyIndex()
      .then(setFacultyOptions)
      .catch(() => setFacultyOptions([]));
  }, []);

  // Department, faculty and publication-window filters are authoritative index
  // intersections. They do not use text search, so counts remain exact.
  useEffect(() => {
    let cancelled = false;
    if (!structuredFilterActive || loading || !atlasReady) return;

    setSearchLoading(true);
    (async () => {
      try {
        const currentYear = new Date().getFullYear();
        const sinceYear = selectedYears > 0
          ? currentYear - selectedYears + 1
          : 0;
        const [departmentResult, facultyResult, yearResult] = await Promise.all([
          selectedDepartment
            ? fetchKgDepartmentAtlasIndices([selectedDepartment])
            : Promise.resolve(null),
          selectedFacultyId
            ? fetchKgFacultyAtlasIndices([selectedFacultyId])
            : Promise.resolve(null),
          sinceYear
            ? fetchKgAtlasYearIndices(sinceYear)
            : Promise.resolve(null),
        ]);
        if (cancelled) return;

        const sets = [
          departmentResult?.indices,
          facultyResult?.indices,
          yearResult?.indices,
        ].filter((indices): indices is number[] => Array.isArray(indices));
        if (!sets.length) return;

        sets.sort((a, b) => a.length - b.length);
        let indices = sets[0];
        for (let n = 1; n < sets.length; n++) {
          const allowed = new Set(sets[n]);
          indices = indices.filter((index) => allowed.has(index));
        }

        const coords = await fetchAtlasPointCoords(indices);
        if (cancelled) return;
        let points = indices
          .map((index) => coords.get(index))
          .filter((point): point is AtlasPointCoord => Boolean(point));
        if (drillTheme) {
          points = points.filter((point) => point.theme === drillTheme);
          indices = points.map((point) => point.i);
        }

        overlayIndicesRef.current = indices;
        setMatchCount(points.length);
        drillLayoutRef.current = drillTheme ? buildDomainSpreadLayout(points) : null;
        drillPointsRef.current = drillTheme ? points : [];
        setDrillDomainCounts(
          drillLayoutRef.current
            ? drillLayoutRef.current.centers
                .map((center) => ({
                  domain: center.domain,
                  count: center.count,
                  hue: center.hue,
                }))
                .sort((a, b) => b.count - a.count || a.domain.localeCompare(b.domain))
            : [],
        );
        rebuildOverlay(points);
        if (drillTheme && drillLayoutRef.current) frameDrillOverview();
        else if (!drillTheme && themeFilterLayoutRef.current) frameThemeFilterOverview();
      } catch (err) {
        if (!cancelled) {
          toast.error(err instanceof Error ? err.message : "Could not apply filters");
        }
      } finally {
        if (!cancelled) setSearchLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [
    structuredFilterActive, selectedDepartment, selectedFacultyId, selectedYears, drillTheme,
    loading, atlasReady, rebuildOverlay, frameDrillOverview, frameThemeFilterOverview,
  ]);

  // Theme drill / ?theme= deep link — load text indices and filter to exact theme.
  useEffect(() => {
    let cancelled = false;
    if (structuredFilterActive) return;
    const q = searchQuery.trim();
    if (!q || loading || !atlasReady) {
      if (!q || loading) {
        overlayIndicesRef.current = [];
        setMatchCount(0);
        drillLayoutRef.current = null;
        rebuildOverlay([]);
        setClusterTheme(null);
        setClusterBreakdown(null);
      }
      return;
    }
    setSearchLoading(true);
    (async () => {
      try {
        const textIdx = await searchAtlasIndices(q, OVERLAY_CAP).catch(() => []);
        if (cancelled) return;

        const indices = textIdx.slice(0, OVERLAY_CAP);
        const coords = await fetchAtlasPointCoords(indices);
        if (cancelled) return;
        let points = indices.map((i) => coords.get(i)).filter((p): p is AtlasPointCoord => !!p);
        // When the query exactly names a theme, show only that theme's papers.
        const dictThemes = dictRef.current?.themes ?? [];
        const exactTheme = dictThemes.find((t) => t.toLowerCase() === q.toLowerCase());
        if (exactTheme) points = points.filter((p) => p.theme === exactTheme);

        overlayIndicesRef.current = points.map((p) => p.i);
        setMatchCount(points.length);
        drillLayoutRef.current = drillThemeRef.current
          ? buildDomainSpreadLayout(points)
          : null;
        setDrillDomainCounts(
          drillLayoutRef.current
            ? drillLayoutRef.current.centers
                .map((c) => ({ domain: c.domain, count: c.count, hue: c.hue }))
                .sort((a, b) => b.count - a.count || a.domain.localeCompare(b.domain))
            : [],
        );
        drillPointsRef.current = drillThemeRef.current ? points : [];
        if (focusedDomainRef.current) {
          focusedDomainRef.current = null;
          setFocusedDomain(null);
        }
        rebuildOverlay(points);
        if (drillThemeRef.current && drillLayoutRef.current) {
          frameDrillOverview();
        } else if (!drillThemeRef.current && themeFilterLayoutRef.current) {
          frameThemeFilterOverview();
        }
      } finally {
        if (!cancelled) setSearchLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [searchQuery, loading, rebuildOverlay, atlasReady, frameDrillOverview, frameThemeFilterOverview, structuredFilterActive]);

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
      setSearchQuery("");
      return;
    }
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
    const themeSphereLayout = themeSphereLayoutRef.current
      ?? createThemeSphereLayout(dict.themes, dict.themeAnchors);
    themeSphereLayoutRef.current = themeSphereLayout;

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    renderer.setClearColor(BG, 1);

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(BG, 0.05);

    const camera = new THREE.PerspectiveCamera(55, width / height, 0.01, 100);
    camera.position.set(0, 0.2, 4.2);

    const controls = new OrbitControls(camera, canvas);
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controls.rotateSpeed = 0.45;
    controls.zoomSpeed = 0.8;
    controls.minDistance = 0.2;
    // Leave headroom for the drilled domain cloud, which frames from ~12-15 away.
    controls.maxDistance = 20;

    const baseMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uSize: { value: 0.032 },
        uDim: { value: 1.0 },
        uMaxPx: { value: 7.5 * Math.min(window.devicePixelRatio, 2) },
      },
      vertexShader: `
        attribute vec3 color; uniform float uSize; uniform float uMaxPx; varying vec3 vColor;
        void main() {
          vColor = color;
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = min(uSize * (300.0 / -mv.z), uMaxPx);
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: `
        varying vec3 vColor; uniform float uDim;
        void main() {
          vec2 c = gl_PointCoord - vec2(0.5);
          float d = length(c);
          if (d > 0.5) discard;
          // Softer falloff — KG clouds glow without white-hot cores.
          float edge = smoothstep(0.5, 0.18, d);
          gl_FragColor = vec4(vColor, 0.38 * uDim * edge);
        }`,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    });

    const group = new THREE.Group();
    scene.add(group);
    const tileManager = new TileManager(
      tree, group, baseMaterial, POINT_BUDGET, MAX_IN_FLIGHT,
      () => { if (engineRef.current) engineRef.current.dirty = true; },
      themeSphereLayout,
    );

    const overlayGeom = new THREE.BufferGeometry();
    overlayGeom.setAttribute("position", new THREE.BufferAttribute(new Float32Array(0), 3));
    overlayGeom.setAttribute("color", new THREE.BufferAttribute(new Float32Array(0), 3));
    const overlayMat = new THREE.ShaderMaterial({
      uniforms: {
        uSize: { value: 0.07 },
        uAlpha: { value: 0.95 },
        // Cap the on-screen sprite size (device px) so zooming into a cluster
        // keeps crisp dots instead of ballooning into blurry discs.
        uMaxPx: { value: 10.0 * Math.min(window.devicePixelRatio, 2) },
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
          float edge = smoothstep(0.5, 0.3, d);
          gl_FragColor = vec4(vColor, uAlpha * edge);
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
      const sphere = themeSphereLayout.centers[themeId];
      const anchor = dict.themeAnchors.find((a) => a.theme === themeName);
      if (!sphere && !anchor) return;
      const color = themeColorHex(themeId);
      const pos = sphere
        ? {
            clusterX: sphere.cx, clusterY: sphere.cy, clusterZ: sphere.cz,
            x: sphere.lx, y: sphere.ly, z: sphere.lz,
          }
        : themeLabelWorldPos(anchor!.x, anchor!.y, anchor!.z, themeId);
      const fullCount = sphere?.count ?? anchor?.count ?? 0;

      const root = document.createElement("div");
      root.style.cssText = [
        "pointer-events:auto",
        "cursor:pointer",
        "user-select:none",
        "transform:translate(-6px,-50%)",
        "display:flex",
        "flex-direction:column",
        "align-items:flex-start",
        "gap:2px",
        "white-space:nowrap",
        "text-align:left",
      ].join(";");
      root.addEventListener("click", (ev) => {
        ev.stopPropagation();
        // In view mode papers stay non-interactive, but theme names still drill.
        if (!viewOnlyRef.current) {
          // CSS2D labels sit above the canvas — prefer a paper under the cursor.
          const paper = pickPaperRef.current(ev.clientX, ev.clientY);
          if (paper) {
            selectPaperRef.current(paper);
            return;
          }
        }
        onThemeLabelClickRef.current(themeName);
      });
      root.addEventListener("mousemove", (ev) => {
        if (viewOnlyRef.current) return;
        const paper = pickPaperRef.current(ev.clientX, ev.clientY);
        hoverPaperRef.current(paper, ev.clientX, ev.clientY);
      });
      root.addEventListener("mouseleave", () => {
        hoverPaperRef.current(null, 0, 0);
      });

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
      countEl.textContent = formatThemeCountLabel(fullCount);

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
        obj,
        line,
        tip,
        fullCount,
        themeName,
      });
    });

    // Domain cluster labels — one per domain anchor, grouped by parent theme.
    // Hidden until the user drills into a theme (see syncDrillLabels). Each
    // domain gets a distinct hue so the sub-clusters read as separate groups.
    const labelByDomain = new Map<string, DomainLabelEntry[]>();
    const domainTips: THREE.Mesh[] = [];
    const anchorsByTheme = new Map<string, typeof dict.domainAnchors>();
    for (const a of dict.domainAnchors) {
      if (!a.domain || !a.theme) continue;
      const list = anchorsByTheme.get(a.theme) ?? [];
      list.push(a);
      anchorsByTheme.set(a.theme, list);
    }
    for (const [themeName, anchors] of anchorsByTheme) {
      const sorted = [...anchors].sort((a, b) => (b.count ?? 0) - (a.count ?? 0));
      const entries: DomainLabelEntry[] = [];
      sorted.forEach((anchor, di) => {
        const color = `hsl(${(di * 47) % 360}, 72%, 66%)`;
        const dist = Math.hypot(anchor.x, anchor.y, anchor.z) || 1;
        const nx = anchor.x / dist;
        const ny = anchor.y / dist;
        const nz = anchor.z / dist;
        const labelDist = dist + 0.3;
        const stagger = ((di % 6) - 2.5) * 0.06;
        let tx = -nz;
        let ty = 0;
        let tz = nx;
        const tl = Math.hypot(tx, ty, tz) || 1;
        tx = (tx / tl) * stagger;
        ty = (ty / tl) * stagger;
        tz = (tz / tl) * stagger;

        const dRoot = document.createElement("div");
        dRoot.style.cssText = [
          "pointer-events:auto",
          "cursor:pointer",
          "user-select:none",
          "transform:translate(-6px,-50%)",
          "display:none",
          "opacity:0",
          "flex-direction:column",
          "align-items:flex-start",
          "gap:1px",
          "white-space:nowrap",
          "text-align:left",
        ].join(";");
        const dTheme = themeName;
        const dDomain = anchor.domain;
        dRoot.addEventListener("click", (ev) => {
          ev.stopPropagation();
          if (viewOnlyRef.current) return;
          // Prefer papers under the label so filtration/drill never traps clicks.
          const paper = pickPaperRef.current(ev.clientX, ev.clientY);
          if (paper) {
            selectPaperRef.current(paper);
            return;
          }
          onDomainLabelClickRef.current(dTheme, dDomain);
        });
        dRoot.addEventListener("mousemove", (ev) => {
          if (viewOnlyRef.current) return;
          const paper = pickPaperRef.current(ev.clientX, ev.clientY);
          hoverPaperRef.current(paper, ev.clientX, ev.clientY);
        });
        dRoot.addEventListener("mouseleave", () => {
          hoverPaperRef.current(null, 0, 0);
        });

        const dTitle = document.createElement("span");
        dTitle.title = anchor.domain;
        dTitle.style.cssText = [
          "display:block",
          "font-size:11px",
          "font-weight:600",
          `color:${color}`,
          "line-height:1.2",
          "letter-spacing:0.01em",
          "text-shadow:0 0 8px rgba(0,0,0,0.95),0 1px 3px rgba(0,0,0,0.9)",
        ].join(";");
        dTitle.textContent =
          anchor.domain.length > 30 ? `${anchor.domain.slice(0, 29)}…` : anchor.domain;

        const dCount = document.createElement("span");
        dCount.style.cssText = [
          "display:block",
          "font-size:9px",
          "color:#94a3b8",
          "font-weight:500",
          "line-height:1.15",
          "text-shadow:0 0 6px rgba(0,0,0,0.95),0 1px 2px rgba(0,0,0,0.85)",
        ].join(";");
        dCount.textContent = formatThemeCountLabel(anchor.count ?? 0);

        dRoot.appendChild(dTitle);
        dRoot.appendChild(dCount);

        const dCluster = new THREE.Vector3(anchor.x, anchor.y, anchor.z);
        const dLabelAt = new THREE.Vector3(
          nx * labelDist + tx,
          ny * labelDist + ty,
          nz * labelDist + tz,
        );
        const dLine = new THREE.Line(
          new THREE.BufferGeometry().setFromPoints([dCluster, dLabelAt]),
          new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.7, depthWrite: false }),
        );
        dLine.renderOrder = 4;
        dLine.visible = false;

        const dTip = new THREE.Mesh(
          new THREE.SphereGeometry(0.016, 10, 10),
          new THREE.MeshBasicMaterial({
            color,
            transparent: true,
            opacity: 0.95,
            depthWrite: false,
            depthTest: false,
          }),
        );
        dTip.position.copy(dCluster);
        dTip.renderOrder = 4;
        dTip.visible = false;
        dTip.userData.isDomainTip = true;
        dTip.userData.theme = themeName;
        dTip.userData.domain = anchor.domain;

        const dObj = new CSS2DObject(dRoot);
        dObj.visible = false;
        dObj.position.copy(dLabelAt);
        scene.add(dObj);
        scene.add(dLine);
        scene.add(dTip);
        labelObjs.push(dObj);
        labelExtras.push(dLine, dTip);
        domainTips.push(dTip);
        entries.push({
          root: dRoot,
          titleEl: dTitle,
          countEl: dCount,
          obj: dObj,
          line: dLine,
          tip: dTip,
          theme: themeName,
          domain: anchor.domain,
        });
      });
      labelByDomain.set(themeName, entries);
    }

    const raycaster = new THREE.Raycaster();
    // Larger threshold so sparse filtered paper dots remain easy to click.
    raycaster.params.Points = { threshold: 0.08 };
    const mouse = new THREE.Vector2();
    const themeTips = Array.from(labelByTheme.values()).map((e) => e.tip);
    const allTips = [...themeTips, ...domainTips];

    // Pick the nearest visible cluster tip (theme when not drilled, domain when
    // drilled). Visibility gates which set is active, so both share one raycast.
    const pickTip = (
      clientX: number,
      clientY: number,
    ): { kind: "theme" | "domain"; theme: string; domain: string } | null => {
      if (viewOnlyRef.current) return null;
      const rect = canvas.getBoundingClientRect();
      mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(mouse, camera);
      const hits = raycaster.intersectObjects(allTips, false);
      for (const hit of hits) {
        if (!hit.object.visible) continue;
        const ud = hit.object.userData ?? {};
        if (ud.isDomainTip) {
          return { kind: "domain", theme: String(ud.theme || ""), domain: String(ud.domain || "") };
        }
        if (ud.isThemeTip) {
          return { kind: "theme", theme: String(ud.theme || ""), domain: "" };
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
        // Generous threshold: filtered/drilled dots are often sparse on screen.
        raycaster.params.Points = { threshold: 0.16 };
        const hits = raycaster.intersectObject(overlay);
        raycaster.params.Points = { threshold: 0.08 };
        if (hits.length && hits[0].index != null) {
          const p = overlayPointsRef.current[hits[0].index];
          if (p) {
            // While drilled the point is drawn at its laid-out cluster position,
            // so the marker must use that (not the original) coordinate.
            const laid = drillThemeRef.current
              ? drillLayoutRef.current?.posById.get(p.i)
              : undefined;
            return {
              i: p.i,
              id: p.id,
              title: p.title || "",
              theme: p.theme,
              domain: p.domain || "",
              citations: 0,
              x: laid ? laid[0] : p.x,
              y: laid ? laid[1] : p.y,
              z: laid ? laid[2] : p.z,
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
        // Theme tips stay clickable in view mode — hint with a pointer cursor.
        hoverFrame++;
        if (hoverFrame % 2 !== 0) return;
        setCursor(pickTip(ev.clientX, ev.clientY)?.kind === "theme" ? "pointer" : "grab");
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
      setCursor(pickTip(ev.clientX, ev.clientY) ? "pointer" : "grab");
    };
    const onClick = (ev: MouseEvent) => {
      if (viewOnlyRef.current) {
        // Papers/domains stay non-interactive, but theme tips still drill.
        const tip = pickTip(ev.clientX, ev.clientY);
        if (tip?.kind === "theme") onThemeLabelClickRef.current(tip.theme);
        return;
      }
      // Prefer paper hits so labels/tips never block selecting papers.
      const paper = pick(ev.clientX, ev.clientY);
      if (paper) {
        setSelected(paper);
        setActiveLevel(null);
        setClusterTheme(null);
        setClusterBreakdown(null);
        return;
      }
      const tip = pickTip(ev.clientX, ev.clientY);
      if (tip?.kind === "theme") onThemeLabelClickRef.current(tip.theme);
      else if (tip?.kind === "domain") onDomainLabelClickRef.current(tip.theme, tip.domain);
    };
    const onLeave = () => { setHovered(null); setCursor("grab"); };

    canvas.addEventListener("mousemove", onMove);
    canvas.addEventListener("click", onClick);
    canvas.addEventListener("mouseleave", onLeave);

    // Label DOM sits above the canvas; expose pick so label handlers can prefer papers.
    pickPaperRef.current = pick;

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
      labelByTheme, labelByDomain, frameId: 0, dirty: true, lastStream: 0,
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
      pickPaperRef.current = () => null;
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
    if (drillThemeRef.current && drillLayoutRef.current && !focusedDomainRef.current) {
      frameDrillOverview();
      return;
    }
    e.camera.position.set(0, 0.2, 4.2);
    e.controls.target.set(0, 0, 0);
    e.controls.update();
    e.dirty = true;
    streamNow();
  };

  const closeThemeCluster = useCallback(() => {
    setClusterTheme(null);
    setClusterBreakdown(null);
    setClusterDomain(null);
    setClusterLoading(false);
  }, []);

  const openThemeCluster = useCallback(async (theme: string) => {
    const q = searchQuery.trim();
    if (!q && !structuredFilterActive) return;

    setSelected(null);
    setActiveLevel(null);
    setClusterTheme(theme);
    setClusterLoading(true);

    // Overlay set is authoritative under faculty/dept refines; show it immediately,
    // then merge department→faculty nesting from the server breakdown.
    const local = buildThemeBreakdownFromOverlay(theme, q, overlayPointsRef.current);
    if (local.totalPapers > 0) setClusterBreakdown(local);

    if (structuredFilterActive) {
      setClusterLoading(false);
      return;
    }

    try {
      const data = await fetchKgAtlasClusterBreakdown(theme, q);
      if (local.totalPapers > 0) {
        setClusterBreakdown(mergeFacultyIntoBreakdown(local, data));
      } else {
        setClusterBreakdown(data);
      }
    } catch {
      if (local.totalPapers > 0) setClusterBreakdown(local);
      else setClusterBreakdown({ theme, query: q, totalPapers: 0, departments: [] });
    } finally {
      setClusterLoading(false);
    }
  }, [searchQuery, structuredFilterActive]);

  const themesClickable = useMemo(() => {
    return (Boolean(searchQuery.trim()) || structuredFilterActive) && matchCount > 0;
  }, [searchQuery, structuredFilterActive, matchCount]);

  useEffect(() => {
    themesClickableRef.current = themesClickable;
    const e = engineRef.current;
    if (!e) return;
    syncThemeLabelPresentation(filterActiveRef.current, true);
    // Re-apply drill visibility: syncThemeLabelPresentation resets theme labels
    // to visible, which would otherwise resurface them over the domain labels.
    syncDrillLabels();
    if (!themesClickable) {
      setClusterTheme(null);
      setClusterBreakdown(null);
      setClusterDomain(null);
    }
  }, [themesClickable, isViewMode, atlasReady, syncThemeLabelPresentation, syncDrillLabels]);

  // Keep the drill ref + label visibility in sync with the drilled theme.
  useEffect(() => {
    drillThemeRef.current = drillTheme;
    // Restore theme labels to their normal (non-drilled) presentation first;
    // syncDrillLabels then either hides them again (while drilled) or leaves
    // them visible (after Clear all), and toggles the domain labels to match.
    syncThemeLabelPresentation(filterActiveRef.current, true);
    syncDrillLabels();
  }, [drillTheme, isViewMode, syncThemeLabelPresentation, syncDrillLabels, atlasReady]);

  // The drill layout is built asynchronously (after the point fetch), so re-run
  // label sync whenever the drilled results settle (matchCount) or the focused
  // domain changes — this guarantees domain labels appear once the layout exists.
  useEffect(() => {
    syncDrillLabels();
  }, [matchCount, focusedDomain, syncDrillLabels]);

  // Keep an open domain sidebar in sync when the narrowing set changes
  // (e.g. Chemical Engineering refine applied while the panel is open).
  useEffect(() => {
    if (!clusterDomain) return;
    const pts = domainCountPointsRef.current;
    if (!pts.length) return;
    setClusterBreakdown(buildDomainBreakdownFromPoints(clusterDomain, searchQuery.trim(), pts));
  }, [clusterDomain, matchCount, drillDomainCounts, searchQuery]);

  // Re-frame whenever the drilled domain ring is showing (not when a single
  // domain is zoomed in). Guarantees zoom-out even if HMR skipped the search path.
  useEffect(() => {
    if (!drillTheme || focusedDomain) return;
    if (!drillLayoutRef.current?.centers.length) return;
    frameDrillOverview();
  }, [drillTheme, focusedDomain, matchCount, drillDomainCounts, frameDrillOverview]);

  // Clicking a theme label drills into it: filter to the theme and reveal its
  // domain sub-clusters. Clicking a domain narrows within the drilled theme.
  const drillIntoTheme = useCallback((theme: string) => {
    setSelected(null);
    setActiveLevel(null);
    setClusterTheme(null);
    setClusterBreakdown(null);
    focusedDomainRef.current = null;
    setFocusedDomain(null);
    setDrillTheme(theme);
    setSearchQuery(theme);
  }, []);

  // Isolate a single domain within the drilled theme: hide the other domains'
  // points + labels, then fly the camera to that cluster. Clicking the same
  // domain again (or its label) expands back to the full theme.
  const focusDomain = useCallback((domain: string) => {
    const e = engineRef.current;
    const layout = drillLayoutRef.current;
    if (!e || !layout || !drillThemeRef.current) return;

    const next = focusedDomainRef.current === domain ? null : domain;
    focusedDomainRef.current = next;
    setFocusedDomain(next);
    setSelected(null);

    const all = drillPointsRef.current;
    setMatchCount(
      next ? all.filter((p) => (p.domain || "Other") === next).length : all.length,
    );
    rebuildOverlay(all);
    syncDrillLabels();

    const c = next ? layout.centers.find((x) => x.domain === next) : null;
    if (c) {
      e.controls.target.set(c.cx, c.cy, c.cz);
      e.camera.position.set(c.cx, c.cy, c.cz + Math.max(0.55, c.blobR * 3.2));
      e.controls.update();
      e.dirty = true;
      streamNow();
    } else {
      // Expanded back to the whole theme — frame the full ring (zoomed out).
      frameDrillOverview();
    }
  }, [rebuildOverlay, syncDrillLabels, streamNow, frameDrillOverview]);

  // Open the right sidebar with a domain's departments + papers — WITHOUT
  // isolating/zooming the domain on the canvas (that's what focusDomain does).
  const openDomainCluster = useCallback((domain: string) => {
    setSelected(null);
    setClusterDomain(domain);
    setClusterTheme(drillThemeRef.current);
    const pts = domainCountPointsRef.current.length
      ? domainCountPointsRef.current
      : drillPointsRef.current;
    setClusterBreakdown(buildDomainBreakdownFromPoints(domain, searchQuery.trim(), pts));
    setClusterLoading(false);
  }, [searchQuery]);

  onThemeLabelClickRef.current = (theme) => {
    // Theme drilling is allowed in view mode too — only paper/domain
    // interactions stay explore-only.
    drillIntoTheme(theme);
  };

  onDomainLabelClickRef.current = (theme, domain) => {
    if (viewOnlyRef.current) return;
    if (drillThemeRef.current === theme && domain) focusDomain(domain);
  };

  selectPaperRef.current = (paper) => {
    setSelected(paper);
    setActiveLevel(null);
    setClusterTheme(null);
    setClusterBreakdown(null);
  };

  hoverPaperRef.current = (paper, clientX, clientY) => {
    if (viewOnlyRef.current) {
      setHovered(null);
      setCursor("grab");
      return;
    }
    const container = containerRef.current;
    if (paper && container) {
      const rect = container.getBoundingClientRect();
      setTooltipPos({ x: clientX - rect.left, y: clientY - rect.top });
      setHovered(paper);
      setCursor("pointer");
      return;
    }
    setHovered(null);
    setCursor("grab");
  };

  const clearSearch = () => {
    setSelectedDepartment("");
    setSelectedFacultyId("");
    setSelectedYears(0);
    setSearchQuery("");
    setActiveLevel(null);
    setSelected(null); setHovered(null);
    setFilterThemeCounts([]);
    setDrillDomainCounts([]);
    setDrillTheme(null);
    focusedDomainRef.current = null;
    setFocusedDomain(null);
    drillLayoutRef.current = null;
    themeFilterLayoutRef.current = null;
    drillPointsRef.current = [];
    domainCountPointsRef.current = [];
    closeThemeCluster();
  };

  /** Remove only the primary search / drilled theme, keeping the structured
   *  dropdown filters (department / faculty / years) applied. */
  const exitPrimarySearch = () => {
    setSearchQuery("");
    setActiveLevel(null);
    setSelected(null); setHovered(null);
    setDrillTheme(null);
    focusedDomainRef.current = null;
    setFocusedDomain(null);
    drillLayoutRef.current = null;
    drillPointsRef.current = [];
    domainCountPointsRef.current = [];
    setDrillDomainCounts([]);
    closeThemeCluster();
    // Back to the whole-cloud framing (the drill camera sits much further out).
    const e = engineRef.current;
    if (e) {
      e.camera.position.set(0, 0.2, 4.2);
      e.controls.target.set(0, 0, 0);
      e.controls.update();
      e.dirty = true;
    }
  };

  /** Shared cleanup when one structured filter is removed via its chip. */
  const afterStructuredFilterChange = () => {
    focusedDomainRef.current = null;
    setFocusedDomain(null);
    closeThemeCluster();
    setSearchQuery(drillTheme ?? "");
  };

  const enterViewMode = () => {
    // Keep the active filters/search — view mode is a clean, click-free way to
    // present the current selection, and the filter bar stays usable there.
    setSelected(null);
    setHovered(null);
    closeThemeCluster();
    setAtlasMode("view");
  };

  const enterInteractiveMode = () => {
    setAtlasMode("interactive");
  };

  const enterCompareMode = () => {
    setSelected(null);
    setHovered(null);
    closeThemeCluster();
    setAtlasMode("compare");
  };

  const showTooltip = hovered && !selected && !clusterTheme && isExploreMode;

  const clusterThemeColor = useMemo(() => {
    if (!clusterTheme || !dictRef.current) return "#22d3ee";
    const id = dictRef.current.themes.indexOf(clusterTheme);
    return themeColorHex(id >= 0 ? id : 0);
  }, [clusterTheme]);

  const handleClusterPaperClick = useCallback((paper: PickedPaper) => {
    const fromOverlay = overlayPointsRef.current.find((p) => p.i === paper.i);
    setClusterTheme(null);
    setClusterBreakdown(null);
    setClusterDomain(null);
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
    <div className={cn(
      "relative flex flex-col flex-1 min-h-0 bg-black text-white",
      (isViewMode || isCompareMode) && "ring-1 ring-white/10",
    )}>
      {isCompareMode && (
        <DepartmentCompareView
          departmentOptions={departmentOptions}
          onExit={enterInteractiveMode}
        />
      )}
      <div className={cn(
        "absolute top-4 right-4 z-30 flex flex-wrap items-center justify-end gap-2",
        isCompareMode && "hidden",
      )}>
        {isExploreMode && (
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
            (isViewMode || isCompareMode) && "ring-1 ring-white/10",
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
              isExploreMode
                ? "bg-white text-black shadow-sm"
                : "text-slate-300 hover:text-white hover:bg-slate-800/80",
            )}
            aria-pressed={isExploreMode}
          >
            <MousePointer2 className="h-3.5 w-3.5" />
            Explore
          </button>
          <button
            type="button"
            onClick={enterCompareMode}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all",
              isCompareMode
                ? "bg-white text-black shadow-sm"
                : "text-slate-300 hover:text-white hover:bg-slate-800/80",
            )}
            aria-pressed={isCompareMode}
          >
            <Columns2 className="h-3.5 w-3.5" />
            Compare
          </button>
        </div>
      </div>

      <header className={cn(
        "absolute top-0 inset-x-0 z-20 pointer-events-none",
        isCompareMode && "hidden",
      )}>
        <div className="flex items-start gap-4 px-4 sm:px-6 pt-4 pb-2 pr-44 sm:pr-72 lg:pr-80">
          <div className="flex-1 max-w-3xl mx-auto relative pointer-events-none">
            <div className="grid grid-cols-1 gap-2 rounded-xl border border-slate-700/70 bg-slate-900/90 p-2 shadow-lg backdrop-blur-md pointer-events-auto sm:grid-cols-3">
              <FilterCombobox
                icon={<Building2 className="h-4 w-4 text-emerald-400" />}
                placeholder="All departments"
                searchPlaceholder="Search departments…"
                value={selectedDepartment}
                options={departmentOptions.map((department) => ({
                  value: department,
                  label: department,
                }))}
                onSelect={(department) => {
                  setSelectedDepartment(department);
                  const faculty = facultyOptions.find((item) => item.facultyId === selectedFacultyId);
                  if (faculty && department && faculty.department !== department) {
                    setSelectedFacultyId("");
                  }
                  setSearchQuery(drillTheme ?? "");
                  // Keep an opened theme drilled: the structured-filter effect
                  // will rebuild its domain clusters from the matching papers.
                  focusedDomainRef.current = null;
                  setFocusedDomain(null);
                  closeThemeCluster();
                }}
              />

              <FilterCombobox
                icon={<User className="h-4 w-4 text-violet-400" />}
                placeholder="All faculty"
                searchPlaceholder="Search faculty…"
                value={selectedFacultyId}
                options={visibleFacultyOptions.map((faculty) => ({
                  value: faculty.facultyId,
                  label: faculty.name,
                  sub: faculty.department,
                }))}
                onSelect={(facultyId) => {
                  setSelectedFacultyId(facultyId);
                  setSearchQuery(drillTheme ?? "");
                  focusedDomainRef.current = null;
                  setFocusedDomain(null);
                  closeThemeCluster();
                }}
              />

              <label className="relative min-w-0">
                <span className="sr-only">Publication period</span>
                <Calendar className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-sky-400" />
                <select
                  value={selectedYears}
                  onChange={(event) => {
                    setSelectedYears(Number(event.target.value));
                    setSearchQuery(drillTheme ?? "");
                    focusedDomainRef.current = null;
                    setFocusedDomain(null);
                    closeThemeCluster();
                  }}
                  className="h-11 w-full appearance-none truncate rounded-lg border border-slate-700 bg-slate-950/80 pl-10 pr-8 text-sm text-slate-100 outline-none transition-colors hover:border-slate-600 focus:border-blue-500"
                >
                  <option value={0}>All publication years</option>
                  {[1, 2, 3, 4, 5].map((years) => (
                    <option key={years} value={years}>
                      Last {years} {years === 1 ? "year" : "years"}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              </label>
            </div>

            {Boolean(searchQuery.trim()) && (
              <div className="mt-2 flex min-w-0 flex-wrap items-center gap-1.5 pointer-events-auto">
                <span className="shrink-0 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                  {drillTheme ? "Exploring theme:" : "Searching:"}
                </span>
                <span
                  title={searchQuery.trim()}
                  className="inline-flex max-w-[240px] shrink-0 items-center gap-1 rounded-md bg-blue-600 px-3 py-1 text-xs font-medium text-white shadow-sm"
                >
                  <span className="truncate">{searchQuery.trim()}</span>
                  <button
                    type="button"
                    onClick={exitPrimarySearch}
                    className="rounded-full p-0.5 hover:bg-white/20"
                    aria-label={`Remove ${drillTheme ? "theme" : "search"} ${searchQuery.trim()}`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
                {drillTheme && focusedDomain && (
                  <>
                    <ChevronRight className="h-3.5 w-3.5 shrink-0 text-slate-500" />
                    <span
                      title={focusedDomain}
                      className="inline-flex max-w-[220px] shrink-0 items-center gap-1 rounded-md bg-blue-600 px-3 py-1 text-xs font-medium text-white shadow-sm"
                    >
                      <span className="truncate">{focusedDomain}</span>
                      <button
                        type="button"
                        onClick={() => focusDomain(focusedDomain)}
                        className="rounded-full p-0.5 hover:bg-white/20"
                        aria-label={`Exit domain ${focusedDomain}`}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  </>
                )}
                {/* When the Filtering row is visible too, it carries the single
                    paper count + Clear all so the button never appears twice. */}
                {!structuredFilterActive && (
                  <>
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
                  </>
                )}
              </div>
            )}

            {structuredFilterActive && (
              <div className="mt-2 flex min-w-0 flex-wrap items-center gap-1.5 pointer-events-auto">
                <span className="shrink-0 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                  Filtering:
                </span>
                {selectedDepartment && (
                  <span className="inline-flex max-w-[220px] items-center gap-1 rounded-md bg-emerald-700 px-3 py-1 text-xs font-medium text-white shadow-sm">
                    <span className="truncate">{selectedDepartment}</span>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedDepartment("");
                        afterStructuredFilterChange();
                      }}
                      className="rounded-full p-0.5 hover:bg-white/20"
                      aria-label={`Remove department filter ${selectedDepartment}`}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                )}
                {selectedFacultyId && (
                  <span className="inline-flex max-w-[220px] items-center gap-1 rounded-md bg-violet-700 px-3 py-1 text-xs font-medium text-white shadow-sm">
                    <span className="truncate">
                      {facultyOptions.find((faculty) => faculty.facultyId === selectedFacultyId)?.name ?? "Faculty"}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedFacultyId("");
                        afterStructuredFilterChange();
                      }}
                      className="rounded-full p-0.5 hover:bg-white/20"
                      aria-label="Remove faculty filter"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                )}
                {selectedYears > 0 && (
                  <span className="inline-flex items-center gap-1 rounded-md bg-sky-700 px-3 py-1 text-xs font-medium text-white shadow-sm">
                    Last {selectedYears} {selectedYears === 1 ? "year" : "years"}
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedYears(0);
                        afterStructuredFilterChange();
                      }}
                      className="rounded-full p-0.5 hover:bg-white/20"
                      aria-label="Remove publication year filter"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
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

      {isExploreMode && (searchQuery.trim() || structuredFilterActive) && (drillTheme
        ? drillDomainCounts.length > 0
        : filterThemeCounts.length > 0) && (
        <aside
          className="absolute bottom-4 left-4 z-30 w-[min(100%-2rem,280px)] max-h-[min(42vh,320px)] flex flex-col rounded-xl border border-slate-700/70 bg-slate-950/90 shadow-2xl backdrop-blur-md overflow-hidden"
          aria-label={drillTheme ? "Domains in theme" : "Matched themes"}
        >
          <div className="shrink-0 flex items-center justify-between gap-2 px-3 py-2 border-b border-slate-700/60">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
              {drillTheme ? `Domains (${drillDomainCounts.length})` : `Themes (${filterThemeCounts.length})`}
            </p>
            <p className="text-[10px] text-slate-300 font-medium">
              {formatCount(matchCount)} papers
            </p>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-2 space-y-1">
            {drillTheme
              ? drillDomainCounts.map(({ domain, count, hue }) => {
                  const color = `hsl(${hue}, 70%, 62%)`;
                  const active = clusterDomain === domain;
                  return (
                    <button
                      key={domain}
                      type="button"
                      onClick={() => openDomainCluster(domain)}
                      title={`Show departments in ${domain}`}
                      className={cn(
                        "flex w-full items-start gap-2.5 rounded-lg border px-2.5 py-2 text-left transition-colors hover:bg-slate-800/70",
                        active
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
                          {domain}
                        </span>
                        <span className="mt-0.5 block text-[11px] text-slate-400">
                          ({formatCount(count)} papers)
                        </span>
                      </span>
                    </button>
                  );
                })
              : filterThemeCounts.map(({ theme, count, color }) => (
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

      {clusterTheme && isExploreMode && (
        <ThemeClusterPanel
          theme={clusterTheme}
          domain={clusterDomain}
          query={searchQuery.trim()}
          breakdown={clusterBreakdown}
          loading={clusterLoading}
          themeColor={clusterThemeColor}
          onClose={closeThemeCluster}
          onPaperClick={handleClusterPaperClick}
        />
      )}

      {selected && !clusterTheme && isExploreMode && (
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
