/**
 * Octree LOD selection + streaming tile manager for the Research Atlas.
 *
 * selectVisibleNodes walks the headers-only tree, keeping every node that
 * intersects the camera frustum (additive LOD: a node plus its loaded ancestors
 * make up full density), and descends into children only while a node's
 * projected screen-space error is too large.
 *
 * TileManager streams the binary tiles for the selected nodes into pooled
 * Three.js Points buffers, bounds concurrency, and evicts least-recently-used
 * off-screen tiles once a point budget is exceeded.
 */
import * as THREE from "three";
import {
  AtlasTree,
  DecodedTile,
  childKeys,
  fetchAtlasTile,
} from "./atlasTiles";

// Must match the old renderer's THEME_CLUSTER_COLORS (atlasClusters.ts) and the
// sorted theme id assignment in build_atlas_tiles.py, so colors are identical.
const THEME_PALETTE = [
  "#f87171", "#fb923c", "#facc15", "#4ade80", "#22d3ee",
  "#818cf8", "#f472b6", "#a3e635", "#c084fc",
];

export function themeColorHex(themeId: number): string {
  return THEME_PALETTE[themeId % THEME_PALETTE.length];
}

/** All node keys — the octree stores each point once, so this is the full cloud. */
export function allNodeKeys(tree: AtlasTree): string[] {
  return Object.keys(tree.nodes);
}

export function selectVisibleNodes(
  tree: AtlasTree,
  camera: THREE.PerspectiveCamera,
  viewportHeight: number,
  sseThreshold: number,
  maxNodes: number,
): string[] {
  const projScreen = new THREE.Matrix4().multiplyMatrices(
    camera.projectionMatrix,
    camera.matrixWorldInverse,
  );
  const frustum = new THREE.Frustum().setFromProjectionMatrix(projScreen);
  const slope = Math.tan((camera.fov * Math.PI) / 180 / 2);
  const box = new THREE.Box3();
  const sphere = new THREE.Sphere();
  const camPos = camera.position;

  const result: string[] = [];
  const stack: string[] = [tree.root];
  while (stack.length && result.length < maxNodes) {
    const key = stack.pop()!;
    const node = tree.nodes[key];
    if (!node) continue;
    box.min.fromArray(node.bounds.min);
    box.max.fromArray(node.bounds.max);
    if (!frustum.intersectsBox(box)) continue;
    result.push(key);
    if (!node.childMask) continue;
    box.getBoundingSphere(sphere);
    const dist = Math.max(sphere.center.distanceTo(camPos) - sphere.radius, 1e-3);
    const projectedPx = (sphere.radius / dist) * (viewportHeight / (2 * slope));
    if (projectedPx > sseThreshold) {
      for (const c of childKeys(key, node.childMask)) stack.push(c);
    }
  }
  return result;
}

interface MountedTile {
  points: THREE.Points;
  tile: DecodedTile;
  lastUsed: number;
}

export class TileManager {
  private mounted = new Map<string, MountedTile>();
  private loading = new Set<string>();
  private queue: string[] = [];
  private inFlight = 0;
  private tick = 0;

  constructor(
    private tree: AtlasTree,
    private group: THREE.Group,
    private material: THREE.Material,
    private pointBudget: number,
    private maxInFlight: number,
    private onChange: () => void,
  ) {}

  /** Points objects currently in the scene (for raycasting). */
  get objects(): THREE.Points[] {
    return [...this.mounted.values()].map((m) => m.points);
  }

  tileFor(points: THREE.Points): DecodedTile | null {
    for (const m of this.mounted.values()) {
      if (m.points === points) return m.tile;
    }
    return null;
  }

  /** Reconcile the mounted set with the currently visible node keys. */
  update(visibleKeys: string[]): void {
    this.tick++;
    const visible = new Set(visibleKeys);
    for (const key of visibleKeys) {
      const m = this.mounted.get(key);
      if (m) {
        m.lastUsed = this.tick;
      } else if (!this.loading.has(key)) {
        this.enqueue(key);
      }
    }
    this.evict(visible);
    this.pump();
  }

  private enqueue(key: string): void {
    this.loading.add(key);
    this.queue.push(key);
  }

  private pump(): void {
    while (this.inFlight < this.maxInFlight && this.queue.length) {
      const key = this.queue.shift()!;
      const node = this.tree.nodes[key];
      if (!node) {
        this.loading.delete(key);
        continue;
      }
      this.inFlight++;
      // Tiles are quantized over the GLOBAL bbox, so decode with tree.bbox
      // (not the node's local bounds) or child octants get squished.
      fetchAtlasTile(key, this.tree.bbox)
        .then((tile) => this.mount(key, tile))
        .catch(() => {})
        .finally(() => {
          this.loading.delete(key);
          this.inFlight--;
          if (this.queue.length) this.pump();
        });
    }
  }

  private mount(key: string, tile: DecodedTile): void {
    if (this.mounted.has(key)) return;
    const n = tile.pointCount;
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(tile.positions, 3));

    const colors = new Float32Array(n * 3);
    const tmp = new THREE.Color();
    for (let k = 0; k < n; k++) {
      tmp.set(themeColorHex(tile.themeIds[k]));
      colors[k * 3] = tmp.r;
      colors[k * 3 + 1] = tmp.g;
      colors[k * 3 + 2] = tmp.b;
    }
    geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));

    const points = new THREE.Points(geometry, this.material);
    points.frustumCulled = false;
    points.userData.nodeKey = key;
    this.group.add(points);
    this.mounted.set(key, { points, tile, lastUsed: this.tick });
    this.onChange();
  }

  private evict(visible: Set<string>): void {
    let total = 0;
    for (const m of this.mounted.values()) total += m.tile.pointCount;
    if (total <= this.pointBudget) return;

    const candidates = [...this.mounted.entries()]
      .filter(([key]) => !visible.has(key))
      .sort((a, b) => a[1].lastUsed - b[1].lastUsed);

    for (const [key, m] of candidates) {
      if (total <= this.pointBudget) break;
      this.group.remove(m.points);
      m.points.geometry.dispose();
      this.mounted.delete(key);
      total -= m.tile.pointCount;
    }
  }

  dispose(): void {
    for (const m of this.mounted.values()) {
      this.group.remove(m.points);
      m.points.geometry.dispose();
    }
    this.mounted.clear();
    this.loading.clear();
    this.queue = [];
  }
}
