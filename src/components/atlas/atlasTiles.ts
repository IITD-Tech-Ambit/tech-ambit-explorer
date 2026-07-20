/**
 * Client for the octree LOD atlas: fetches the headers-only tree, the taxonomy
 * dict, binary node tiles, exact point coords (highlight overlay), and
 * server-side search. Replaces the one-shot 27 MB /atlas fetch — the renderer
 * streams only the tiles the camera needs.
 *
 * Tile binary layout (little-endian) — mirrors build_atlas_tiles.py:
 *   uint32 pointCount(n)
 *   uint32 index[n]      global atlas index i
 *   uint8  oid[12n]      Mongo ObjectId bytes
 *   uint16 pos[3n]       x,y,z quantized over the global bbox
 *   uint16 domainId[n]
 *   uint16 citations[n]
 *   uint8  themeId[n]
 */
import { kgApiClient } from "@/lib/api/apiClient";

export interface AtlasBounds {
  min: [number, number, number];
  max: [number, number, number];
}

export interface AtlasTreeNode {
  bounds: AtlasBounds;
  childMask: number;
  pointCount: number;
  depth: number;
}

export interface AtlasTree {
  version: string;
  pointCount: number;
  root: string;
  bbox: AtlasBounds;
  gridRes: number;
  capacity: number;
  nodes: Record<string, AtlasTreeNode>;
}

export interface AtlasAnchor {
  theme: string;
  domain?: string;
  x: number;
  y: number;
  z: number;
  count: number;
}

export interface AtlasDict {
  version: string;
  themes: string[];
  domains: string[];
  themeAnchors: AtlasAnchor[];
  domainAnchors: AtlasAnchor[];
}

export interface DecodedTile {
  nodeKey: string;
  pointCount: number;
  indices: Uint32Array;
  positions: Float32Array; // dequantized xyz, length 3n
  themeIds: Uint8Array;
  domainIds: Uint16Array;
  citations: Uint16Array;
  idBytes: Uint8Array; // 12 bytes per point
}

interface Envelope<T> {
  success: boolean;
  data: T;
  message?: string;
}

const HEX = Array.from({ length: 256 }, (_, i) => i.toString(16).padStart(2, "0"));

/** Extract the 24-hex Mongo ObjectId for a point's local index in a tile. */
export function tileObjectId(tile: DecodedTile, localIndex: number): string {
  const base = localIndex * 12;
  let s = "";
  for (let b = 0; b < 12; b++) s += HEX[tile.idBytes[base + b]];
  return s;
}

export async function fetchAtlasTree(): Promise<AtlasTree> {
  const { data } = await kgApiClient.get<Envelope<AtlasTree>>("/atlas/tree");
  return data.data;
}

export async function fetchAtlasDict(): Promise<AtlasDict> {
  const { data } = await kgApiClient.get<Envelope<AtlasDict>>("/atlas/dict");
  return data.data;
}

export async function fetchAtlasTile(nodeKey: string, bbox: AtlasBounds): Promise<DecodedTile> {
  const { data } = await kgApiClient.get<ArrayBuffer>(`/atlas/tile/${encodeURIComponent(nodeKey)}`, {
    responseType: "arraybuffer",
  });
  return decodeTile(nodeKey, data, bbox);
}

export function decodeTile(nodeKey: string, buffer: ArrayBuffer, bbox: AtlasBounds): DecodedTile {
  const view = new DataView(buffer);
  const n = view.getUint32(0, true);
  let off = 4;

  const indices = new Uint32Array(buffer, off, n);
  off += 4 * n;
  const idBytes = new Uint8Array(buffer.slice(off, off + 12 * n));
  off += 12 * n;
  const quant = new Uint16Array(buffer, off, 3 * n);
  off += 6 * n;
  const domainIds = new Uint16Array(buffer.slice(off, off + 2 * n));
  off += 2 * n;
  const citations = new Uint16Array(buffer.slice(off, off + 2 * n));
  off += 2 * n;
  const themeIds = new Uint8Array(buffer.slice(off, off + n));

  const [minX, minY, minZ] = bbox.min;
  const [maxX, maxY, maxZ] = bbox.max;
  const sx = (maxX - minX) / 65535;
  const sy = (maxY - minY) / 65535;
  const sz = (maxZ - minZ) / 65535;

  const positions = new Float32Array(n * 3);
  for (let k = 0; k < n; k++) {
    positions[k * 3] = minX + quant[k * 3] * sx;
    positions[k * 3 + 1] = minY + quant[k * 3 + 1] * sy;
    positions[k * 3 + 2] = minZ + quant[k * 3 + 2] * sz;
  }

  return {
    nodeKey,
    pointCount: n,
    indices,
    positions,
    themeIds,
    domainIds: new Uint16Array(domainIds),
    citations: new Uint16Array(citations),
    idBytes,
  };
}

/** Exact coords + theme for atlas indices (chunked to keep GET URLs bounded). */
export interface AtlasPointCoord {
  i: number;
  x: number;
  y: number;
  z: number;
  id: string;
  theme: string;
  domain: string;
  title: string;
  department: string;
}

export async function fetchAtlasPointCoords(
  indices: number[],
): Promise<Map<number, AtlasPointCoord>> {
  const out = new Map<number, AtlasPointCoord>();
  const CHUNK = 500;
  const chunks: Promise<void>[] = [];
  for (let i = 0; i < indices.length; i += CHUNK) {
    const slice = indices.slice(i, i + CHUNK);
    chunks.push(
      kgApiClient
        .get<Envelope<{ points: AtlasPointCoord[] }>>(
          `/atlas/points?indices=${slice.join(",")}`,
        )
        .then(({ data }) => {
          for (const p of data.data.points) {
            out.set(p.i, {
              i: p.i,
              x: p.x,
              y: p.y,
              z: p.z,
              id: p.id ?? "",
              theme: p.theme ?? "",
              domain: p.domain ?? "",
              title: p.title ?? "",
              department: p.department ?? "",
            });
          }
        }),
    );
  }
  await Promise.all(chunks);
  return out;
}

export async function searchAtlasIndices(q: string, limit = 8000): Promise<number[]> {
  if (!q.trim()) return [];
  const { data } = await kgApiClient.get<Envelope<{ indices: number[] }>>(
    `/atlas/search?q=${encodeURIComponent(q.trim())}&limit=${limit}`,
  );
  return data.data.indices ?? [];
}

/** Child node keys implied by a node's childMask (octant bits 0..7). */
export function childKeys(nodeKey: string, childMask: number): string[] {
  const keys: string[] = [];
  for (let o = 0; o < 8; o++) {
    if (childMask & (1 << o)) keys.push(`${nodeKey}-${o}`);
  }
  return keys;
}
