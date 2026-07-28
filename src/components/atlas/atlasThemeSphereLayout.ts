/**
 * Client-side knowledge-graph theme clouds for the unfiltered atlas.
 * Remaps baked tile XYZ into organic nebulas (dense core + wispy fringe).
 */
import type { AtlasAnchor } from "./atlasTiles";

export type ThemeSphereCenter = {
  theme: string;
  cx: number;
  cy: number;
  cz: number;
  lx: number;
  ly: number;
  lz: number;
  blobR: number;
  count: number;
};

export type ThemeSphereLayout = {
  themeCount: number;
  centers: ThemeSphereCenter[];
  /** Per-theme stretch axes — keeps each cloud organic, not a perfect ball. */
  shapeByThemeId: Array<[number, number, number]>;
};

function fibonacciDir(k: number, n: number): [number, number, number] {
  const cosPhi = 1 - (2 * (k + 0.5)) / Math.max(1, n);
  const sinPhi = Math.sqrt(Math.max(0, 1 - cosPhi * cosPhi));
  const theta = Math.PI * (1 + Math.sqrt(5)) * (k + 0.5);
  return [Math.cos(theta) * sinPhi, Math.sin(theta) * sinPhi, cosPhi];
}

function hash01(seed: number): number {
  const x = Math.sin(seed * 127.1) * 43758.5453;
  return x - Math.floor(x);
}

/**
 * Organic KG cloud: dense glowing core, soft irregular fringe, mild anisotropy
 * so silhouettes read as knowledge clusters (not hard spheres / discs).
 */
function kgClusterOffset(
  seed: number,
  radius: number,
  shape: [number, number, number],
): [number, number, number] {
  const u = hash01(seed);
  const v = hash01(seed + 17);
  const w = hash01(seed + 31);
  const a = hash01(seed + 47);
  const b = hash01(seed + 71);
  const c = hash01(seed + 97);

  // Mix of compact core + open fringe (KG nebula, not a solid ball).
  const densityPower = 1.15;
  let r = radius * u ** densityPower;
  // ~12% of points spray farther for a wispy knowledge-graph edge.
  if (a > 0.88) r *= 1.15 + b * 0.35;

  const theta = v * Math.PI * 2;
  const cosPhi = w * 2 - 1;
  const sinPhi = Math.sqrt(Math.max(0, 1 - cosPhi * cosPhi));

  // Point-level jitter + theme shape → soft, cloud-like silhouette.
  const jx = 0.88 + c * 0.28;
  const jy = 0.88 + hash01(seed + 113) * 0.28;
  const jz = 0.88 + hash01(seed + 131) * 0.28;

  return [
    Math.cos(theta) * sinPhi * r * shape[0] * jx,
    Math.sin(theta) * sinPhi * r * shape[1] * jy,
    cosPhi * r * shape[2] * jz,
  ];
}

function themeShape(themeId: number): [number, number, number] {
  // Mild ellipsoid per theme — still roughly spherical, never a flat disc.
  const sx = 0.92 + hash01(themeId * 13 + 3) * 0.22;
  const sy = 0.92 + hash01(themeId * 17 + 5) * 0.22;
  const sz = 0.92 + hash01(themeId * 19 + 7) * 0.22;
  return [sx, sy, sz];
}

function blobRadiusForCount(count: number, maxCount: number): number {
  // Bigger themes → larger clouds; keep a soft KG look (not tiny hard cores).
  const t = Math.max(1, count) / Math.max(1, maxCount);
  return 0.58 + 0.95 * Math.pow(t, 0.55);
}

/**
 * Build one organic cloud centre per theme (order = dict.themes / themeId).
 */
export function createThemeSphereLayout(
  themes: string[],
  themeAnchors: AtlasAnchor[] = [],
): ThemeSphereLayout {
  const n = themes.length;
  const countByTheme = new Map(themeAnchors.map((a) => [a.theme, a.count] as const));
  const counts = themes.map((t) => countByTheme.get(t) ?? 1);
  const maxCount = Math.max(1, ...counts);
  const radii = counts.map((c) => blobRadiusForCount(c, maxCount));
  const maxBlob = radii.reduce((m, r) => Math.max(m, r), 0.58);
  // Close enough to feel like one knowledge graph, gap enough to stay readable.
  const gap = 0.36;
  const spreadR = n <= 1
    ? 0
    : Math.max(2.35, ((2 * maxBlob + gap) * Math.sqrt(n) / 3.81) * 1.4);

  type Node = { theme: string; count: number; blobR: number; x: number; y: number; z: number };
  const nodes: Node[] = themes.map((theme, k) => {
    const blobR = radii[k];
    const count = counts[k];
    if (n <= 1) return { theme, count, blobR, x: 0, y: 0, z: 0 };
    const [dx, dy, dz] = fibonacciDir(k, n);
    // Slight radius jitter so the overall graph isn't a perfect ring.
    const orbit = 0.94 + hash01(k * 9 + 2) * 0.12;
    return {
      theme,
      count,
      blobR,
      x: dx * spreadR * orbit,
      y: dy * spreadR * orbit,
      z: dz * spreadR * orbit,
    };
  });

  for (let iter = 0; iter < 120; iter++) {
    let moved = false;
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i];
        const b = nodes[j];
        let dx = b.x - a.x;
        let dy = b.y - a.y;
        let dz = b.z - a.z;
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
    let mx = 0; let my = 0; let mz = 0;
    for (const node of nodes) { mx += node.x; my += node.y; mz += node.z; }
    mx /= n; my /= n; mz /= n;
    for (const node of nodes) { node.x -= mx; node.y -= my; node.z -= mz; }
  }

  const labelGap = 0.3;
  const centers: ThemeSphereCenter[] = nodes.map((node) => {
    const dist = Math.hypot(node.x, node.y, node.z);
    const off = node.blobR + labelGap;
    const lx = dist < 1e-4 ? node.x : node.x + (node.x / dist) * off;
    const ly = dist < 1e-4 ? node.y + off : node.y + (node.y / dist) * off;
    const lz = dist < 1e-4 ? node.z : node.z + (node.z / dist) * off;
    return {
      theme: node.theme,
      cx: node.x, cy: node.y, cz: node.z,
      lx, ly, lz,
      blobR: node.blobR,
      count: node.count,
    };
  });

  const shapeByThemeId = themes.map((_, id) => themeShape(id));

  return { themeCount: n, centers, shapeByThemeId };
}

/** World position for one paper inside its theme cloud (deterministic). */
export function themeSpherePoint(
  themeId: number,
  paperIndex: number,
  layout: ThemeSphereLayout,
): [number, number, number] {
  const c = layout.centers[themeId] ?? layout.centers[0];
  if (!c) return [0, 0, 0];
  const shape = layout.shapeByThemeId[themeId] ?? [1, 1, 1];
  const [jx, jy, jz] = kgClusterOffset(paperIndex + 31, c.blobR, shape);
  return [c.cx + jx, c.cy + jy, c.cz + jz];
}

/** Remap a tile's position buffer in place using themeId + global index. */
export function remapTilePositionsToSpheres(
  positions: Float32Array,
  themeIds: Uint8Array,
  indices: Uint32Array,
  layout: ThemeSphereLayout,
): void {
  const n = themeIds.length;
  for (let k = 0; k < n; k++) {
    const [x, y, z] = themeSpherePoint(themeIds[k], indices[k], layout);
    positions[k * 3] = x;
    positions[k * 3 + 1] = y;
    positions[k * 3 + 2] = z;
  }
}

/**
 * Layout a filtered paper subset as organic theme spheres (dept compare, etc.).
 * Themes with zero papers in the subset are omitted.
 */
export function layoutFilteredThemeCloud(
  points: Array<{ i: number; theme: string }>,
  dictThemes: string[],
): {
  positions: Float32Array;
  centers: ThemeSphereCenter[];
  themeOrder: string[];
  pointThemes: string[];
} {
  const countByTheme = new Map<string, number>();
  for (const p of points) {
    const t = p.theme || "Other";
    countByTheme.set(t, (countByTheme.get(t) ?? 0) + 1);
  }
  const themeOrder = dictThemes.filter((t) => (countByTheme.get(t) ?? 0) > 0);
  if (!themeOrder.length) {
    themeOrder.push(...[...countByTheme.keys()].sort((a, b) => a.localeCompare(b)));
  }
  const anchors = themeOrder.map((theme) => ({
    theme,
    x: 0,
    y: 0,
    z: 0,
    count: countByTheme.get(theme) ?? 0,
  }));
  const layout = createThemeSphereLayout(themeOrder, anchors);
  const themeIndex = new Map(themeOrder.map((t, i) => [t, i] as const));

  const n = points.length;
  const positions = new Float32Array(n * 3);
  const pointThemes: string[] = new Array(n);

  for (let k = 0; k < n; k++) {
    const p = points[k];
    const theme = p.theme || "Other";
    const tid = themeIndex.get(theme) ?? 0;
    const [x, y, z] = themeSpherePoint(tid, p.i, layout);
    positions[k * 3] = x;
    positions[k * 3 + 1] = y;
    positions[k * 3 + 2] = z;
    pointThemes[k] = theme;
  }

  return { positions, centers: layout.centers, themeOrder, pointThemes };
}
