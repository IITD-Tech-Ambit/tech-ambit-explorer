import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import CytoscapeComponent from "react-cytoscapejs";
import cytoscape from "cytoscape";
import type { Core, ElementDefinition } from "cytoscape";
import fcose from "cytoscape-fcose";
import {
  BookOpen, Calendar, ChevronDown, ExternalLink, Globe, Hash,
  Microscope, Network, Search, Tag, X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import ModeToggle from "./ModeToggle";
import type { AppMode } from "./types";
import { fetchKgFacultyGraph, fetchKgFacultyIndex, fetchKgPaperMeta } from "./api";
import { getPaperExternalUrl } from "./paperLink";
import {
  KgBanner, KgCanvas, KgCard, KgDetailsPanel, KgDivider, KgEmptyCanvas,
  KgInfoRow, KgLegendItem, KgSearchDropdown, KgSectionTitle, KgSidebar,
  KgStat, KgToolbar, KgZoomControls, applyDefaultGraphView,
} from "./KgShared";
// Register the fcose force-directed layout once.
cytoscape.use(fcose);

/** Max papers rendered per faculty (top-N by citation count). */
const DEFAULT_PAPER_CAP = 50;

/** How many additional papers each "Load more" click reveals. */
const PAPER_PAGE = 50;

// ─── Types ────────────────────────────────────────────────────────────────────
type NodeType = "faculty" | "paper" | "theme" | "subdomain" | "topic";

interface GraphNode {
  id: string; label: string; type: NodeType;
  citation_count?: number; year?: number | null;
  department?: string; broad_theme?: string;
  sub_domain?: string; topic?: string;
  link?: string; document_scopus_id?: string; document_eid?: string;
}
interface GraphEdge { source: string; target: string; label: string }
interface Graph { nodes: GraphNode[]; edges: GraphEdge[] }
interface FacultyItem {
  facultyId: string; name: string; department: string;
  paperCount: number; nodeCount: number; edgeCount: number;
}

// ─── Visual Config ────────────────────────────────────────────────────────────
const TYPE_META: Record<NodeType, { color: string; label: string; desc: string; size: number; icon: string }> = {
  faculty:   { color: "#1d4ed8", label: "Faculty",     desc: "The researcher / professor",           size: 95, icon: "👤" },
  theme:     { color: "#dc2626", label: "Broad Theme", desc: "One of 9 national research themes",     size: 78, icon: "🌐" },
  subdomain: { color: "#ea580c", label: "Sub-Domain",  desc: "Academic sub-field within department",  size: 62, icon: "🔬" },
  paper:     { color: "#16a34a", label: "Paper",       desc: "Research paper (size = citations)",     size: 48, icon: "📄" },
  topic:     { color: "#ca8a04", label: "Topic",       desc: "Key topic / keyphrase",                 size: 40, icon: "🏷️" },
};

// Friendly edge label text (reference-style relationship names).
const EDGE_LABELS: Record<string, string> = {
  AUTHORED:         "authored",
  BELONGS_TO:       "has theme",
  IN_SUBDOMAIN:     "in sub-domain",
  HAS_TOPIC:        "has topic",
  CO_AUTHORED_WITH: "co-author",
};

function nodeSize(n: GraphNode): number {
  if (n.type !== "paper") return TYPE_META[n.type].size;
  const c = n.citation_count ?? 0;
  return Math.min(40 + Math.sqrt(c) * 4, 95);
}

const STYLESHEET: any[] = [
  {
    selector: "node",
    style: {
      "background-color": "data(color)",
      width: "data(size)", height: "data(size)",
      label: "data(displayLabel)",
      "font-size": "data(fontSize)",
      "font-weight": 600,
      color: "#ffffff",
      "text-wrap": "wrap",
      "text-max-width": "data(textWidth)",
      "text-valign": "center",
      "text-halign": "center",
      "border-width": 3,
      "border-color": "#ffffff",
      "border-opacity": 0.9,
      "text-outline-width": 1.5,
      "text-outline-color": "data(color)",
      "text-outline-opacity": 0.7,
    },
  },
  { selector: "node[type='faculty']",   style: { shape: "ellipse",          "border-color": "#bfdbfe", "border-width": 5 } },
  { selector: "node[type='theme']",     style: { shape: "round-rectangle" } },
  { selector: "node[type='subdomain']", style: { shape: "round-rectangle" } },
  { selector: "node[type='paper']",     style: { shape: "ellipse" } },
  { selector: "node[type='topic']",     style: { shape: "round-tag" } },
  {
    selector: "edge",
    style: {
      label: "data(edgeLabel)",
      "font-size": 9,
      "font-weight": 500,
      color: "#475569",
      width: 1.5,
      "line-color": "#cbd5e1",
      "target-arrow-color": "#94a3b8",
      "target-arrow-shape": "triangle",
      "arrow-scale": 0.8,
      "curve-style": "bezier",
      opacity: 0.75,
      "text-rotation": "autorotate",
      "text-background-color": "#eff6ff",
      "text-background-opacity": 0.95,
      "text-background-padding": 3,
      "text-background-shape": "round-rectangle",
      "text-border-width": 1,
      "text-border-color": "#bfdbfe",
      "text-border-opacity": 1,
    },
  },
  // Highlight / fade states
  { selector: "node.highlight", style: { "border-width": 6, "border-color": "#f59e0b", "border-opacity": 1 } },
  { selector: "node.faded",     style: { opacity: 0.1 } },
  { selector: "edge.faded",     style: { opacity: 0.05, "text-opacity": 0 } },
  { selector: "node:selected",  style: { "border-width": 6, "border-color": "#7c3aed", "border-opacity": 1 } },
];

const FCOSE_LAYOUT = {
  name: "fcose",
  quality: "default",
  animate: false,
  randomize: true,
  padding: 50,
  nodeSeparation: 120,
  idealEdgeLength: 130,
  nodeRepulsion: 9000,
  gravity: 0.25,
};

// Truncate long labels for inside-node display.
function shortLabel(label: string, type: NodeType): string {
  const max = type === "faculty" ? 26 : type === "theme" ? 28 : type === "paper" ? 22 : 24;
  return label.length > max ? label.slice(0, max - 1) + "…" : label;
}

// ─── Faculty Explorer ───────────────────────────────────────────────────────
export default function FacultyExplorer({ mode, setMode, initialFacultyId }: { mode: AppMode; setMode: (m: AppMode) => void; initialFacultyId?: string }) {
  const [facultyList, setFacultyList]   = useState<FacultyItem[]>([]);
  const [search, setSearch]             = useState("");
  const [selectedId, setSelectedId]     = useState("");
  const [graph, setGraph]               = useState<Graph | null>(null);
  const [loading, setLoading]           = useState(false);
  const [error, setError]               = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [paperLinkMeta, setPaperLinkMeta] = useState<GraphNode | null>(null);
  const [paperCap, setPaperCap]         = useState(DEFAULT_PAPER_CAP);
  const [showEdgeLabels, setShowEdgeLabels] = useState(true);
  const [nodeSearch, setNodeSearch]     = useState("");
  const [truncated, setTruncated]       = useState<{ shown: number; total: number } | null>(null);
  const [comboOpen, setComboOpen]       = useState(false);
  const cyRef = useRef<Core | null>(null);
  const comboRef = useRef<HTMLDivElement | null>(null);

  // ── Load faculty index ──
  useEffect(() => {
    fetchKgFacultyIndex()
      .then((data) => {
        setFacultyList(data);
        if (data.length) setSelectedId(initialFacultyId || data[0].facultyId);
      })
      .catch((e) => setError(`Cannot reach Knowledge Graph API. Is the backend running? (${e})`));
  }, []);

  // ── Honor a faculty opened from the Topic Explorer ──
  useEffect(() => {
    if (initialFacultyId) setSelectedId(initialFacultyId);
  }, [initialFacultyId]);

  // ── Close the faculty combobox when clicking outside it ──
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (comboRef.current && !comboRef.current.contains(e.target as Node)) {
        setComboOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  // ── Load graph ──
  useEffect(() => {
    if (!selectedId) return;
    setLoading(true); setError(null); setSelectedNode(null); setGraph(null);
    setPaperCap(DEFAULT_PAPER_CAP); // reset paging when switching faculty
    fetchKgFacultyGraph(selectedId)
      .then((g) => setGraph(g))
      .catch((e) => setError(`Failed to load graph: ${e}`))
      .finally(() => setLoading(false));
  }, [selectedId]);

  // ── Resolve paper link from node data or MongoDB fallback ──
  useEffect(() => {
    if (!selectedNode || selectedNode.type !== "paper") {
      setPaperLinkMeta(null);
      return;
    }
    if (getPaperExternalUrl(selectedNode)) {
      setPaperLinkMeta(selectedNode);
      return;
    }
    const mongoId = selectedNode.id.replace(/^p:/, "");
    fetchKgPaperMeta(mongoId)
      .then((meta) => setPaperLinkMeta({ ...selectedNode, ...meta }))
      .catch(() => setPaperLinkMeta(selectedNode));
  }, [selectedNode]);

  // ── Build visible elements based on view mode + cap ──
  const elements: ElementDefinition[] = useMemo(() => {
    if (!graph) return [];

    const papers = graph.nodes
      .filter(n => n.type === "paper")
      .sort((a, b) => (b.citation_count ?? 0) - (a.citation_count ?? 0));
    const cappedPapers = papers.slice(0, paperCap);
    const cappedPaperIds = new Set(cappedPapers.map(n => n.id));

    // Edges touching the capped papers
    const relevantEdges = graph.edges.filter(
      e => cappedPaperIds.has(e.source) || cappedPaperIds.has(e.target)
    );

    // PAPER VIEW — faculty → papers → theme / sub-domain / topic
    const referenced = new Set(relevantEdges.flatMap(e => [e.source, e.target]));
    const nonPapers = graph.nodes.filter(n => n.type !== "paper" && referenced.has(n.id));
    const keepNodes = [...nonPapers, ...cappedPapers];
    const keepIds = new Set(keepNodes.map(n => n.id));
    const keepEdges = relevantEdges.filter(e => keepIds.has(e.source) && keepIds.has(e.target));

    setTimeout(() => setTruncated(
      papers.length > paperCap
        ? { shown: Math.min(paperCap, papers.length), total: papers.length }
        : { shown: papers.length, total: papers.length }
    ), 0);

    return [
      ...keepNodes.map(n => ({
        data: {
          ...n,
          color: TYPE_META[n.type]?.color ?? "#94a3b8",
          size: nodeSize(n),
          displayLabel: `${TYPE_META[n.type]?.icon ?? ""} ${shortLabel(n.label, n.type)}`,
          fontSize: n.type === "faculty" ? 12 : n.type === "theme" ? 11 : 9,
          textWidth: `${nodeSize(n) - 12}px`,
        },
      })),
      ...keepEdges.map((e, i) => ({
        data: {
          id: `e${i}`, source: e.source, target: e.target,
          edgeLabel: showEdgeLabels ? (EDGE_LABELS[e.label] ?? e.label) : "",
        },
      })),
    ];
  }, [graph, paperCap, showEdgeLabels]);

  // Total papers available for this faculty (for the Load-more button).
  const totalPapers = useMemo(
    () => graph?.nodes.filter(n => n.type === "paper").length ?? 0,
    [graph]
  );

  // ── Re-run layout when elements change, then zoom out for overview ──
  useEffect(() => {
    const cy = cyRef.current;
    if (!cy || elements.length === 0) return;
    const layout = cy.layout(FCOSE_LAYOUT as any);
    layout.one("layoutstop", () => applyDefaultGraphView(cy));
    layout.run();
  }, [elements]);

  // ── Node search highlight ──
  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) return;
    cy.elements().removeClass("highlight faded");
    const q = nodeSearch.trim().toLowerCase();
    if (!q) return;
    const matched = cy.nodes().filter(n => String(n.data("label")).toLowerCase().includes(q));
    if (matched.length === 0) return;
    cy.elements().addClass("faded");
    matched.removeClass("faded").addClass("highlight");
    matched.connectedEdges().removeClass("faded");
    matched.neighborhood().removeClass("faded");
  }, [nodeSearch, elements]);

  // ── Cytoscape events ──
  const registerCy = useCallback((cy: Core) => {
    cyRef.current = cy;
    cy.removeAllListeners();
    cy.on("tap", "node", evt => setSelectedNode(evt.target.data() as GraphNode));
    cy.on("tap", evt => { if (evt.target === cy) setSelectedNode(null); });
    cy.on("mouseover", "node", evt => {
      const node = evt.target;
      cy.elements().addClass("faded");
      node.removeClass("faded").addClass("highlight");
      node.neighborhood().removeClass("faded");
      node.connectedEdges().removeClass("faded");
    });
    cy.on("mouseout", "node", () => cy.elements().removeClass("faded highlight"));
  }, []);

  const fitGraph = () => cyRef.current?.fit(undefined, 40);
  const zoomBy = (factor: number) => {
    const cy = cyRef.current; if (!cy) return;
    cy.zoom({ level: cy.zoom() * factor, renderedPosition: { x: cy.width() / 2, y: cy.height() / 2 } });
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return facultyList;
    return facultyList.filter(f =>
      f.name.toLowerCase().includes(q) || f.department.toLowerCase().includes(q)
    );
  }, [facultyList, search]);

  const selectedFaculty = facultyList.find(f => f.facultyId === selectedId);

  const pickFaculty = (f: FacultyItem) => {
    setSelectedId(f.facultyId);
    setSearch("");
    setComboOpen(false);
  };
  const visibleNodeCount = elements.filter((e: any) => !e.data.source).length;

  return (
    <div className="flex flex-col flex-1 min-h-0 bg-background">
      <KgToolbar
        title="Research Knowledge Graph"
        modeToggle={<ModeToggle mode={mode} setMode={setMode} />}
        search={
          <div ref={comboRef} className="relative">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                placeholder={selectedFaculty ? selectedFaculty.name : "Search faculty or department…"}
                value={search}
                onChange={(e) => { setSearch(e.target.value); setComboOpen(true); }}
                onFocus={() => setComboOpen(true)}
                className="pl-9 h-9 rounded-lg border bg-background text-sm"
              />
            </div>
            <KgSearchDropdown
              open={comboOpen}
              header={<>{filtered.length} of {facultyList.length} faculty</>}
              empty={filtered.length === 0 ? (
                <div className="px-3 py-4 text-sm text-muted-foreground">No faculty match “{search}”</div>
              ) : undefined}
            >
              {filtered.slice(0, 100).map((f) => (
                <button
                  key={f.facultyId}
                  type="button"
                  onClick={() => pickFaculty(f)}
                  className={`block w-full text-left px-3 py-2.5 text-sm border-b border-border/50 transition-colors hover:bg-muted/60 ${
                    f.facultyId === selectedId ? "bg-primary/10" : ""
                  }`}
                >
                  <div className="font-semibold text-foreground">{f.name}</div>
                  <div className="text-xs text-muted-foreground">{f.department} · {f.paperCount} papers</div>
                </button>
              ))}
              {filtered.length > 100 && (
                <div className="px-3 py-2 text-xs text-muted-foreground text-center">
                  Showing first 100 — keep typing to narrow down
                </div>
              )}
            </KgSearchDropdown>
          </div>
        }
      />

      <div className="flex flex-1 min-h-0 flex-col lg:flex-row">
        <KgSidebar>
          {selectedFaculty && (
            <KgCard>
              <div className="font-bold text-sm text-primary">{selectedFaculty.name}</div>
              <div className="text-xs text-muted-foreground mt-1">{selectedFaculty.department}</div>
              <div className="flex gap-6 mt-3">
                <KgStat label="Papers" value={selectedFaculty.paperCount} />
                <KgStat label="Showing" value={visibleNodeCount} />
              </div>
              {truncated && truncated.shown < truncated.total && (
                <div className="mt-3 text-xs text-amber-700 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-lg px-2.5 py-2">
                  Showing top {truncated.shown} of {truncated.total} papers by citations
                </div>
              )}
            </KgCard>
          )}

          <p className="text-xs text-muted-foreground mb-4 leading-relaxed">
            Each paper connects to its <strong>Theme</strong>, <strong>Sub-Domain</strong> and <strong>Topic</strong>.
            Papers load in batches of {PAPER_PAGE}, most-cited first.
          </p>

          <div className="mb-4">
            <KgSectionTitle>
              Papers shown: <span className="text-primary">{Math.min(paperCap, totalPapers)}</span> / {totalPapers}
            </KgSectionTitle>
            {paperCap < totalPapers ? (
              <Button className="w-full rounded-xl" onClick={() => setPaperCap((c) => c + PAPER_PAGE)}>
                <ChevronDown className="h-4 w-4 mr-2" />
                Load next {Math.min(PAPER_PAGE, totalPapers - paperCap)} papers
              </Button>
            ) : (
              totalPapers > PAPER_PAGE && (
                <div className="flex gap-2">
                  <div className="flex-1 text-xs text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-2 text-center">
                    All {totalPapers} papers shown
                  </div>
                  <Button variant="outline" size="sm" onClick={() => setPaperCap(DEFAULT_PAPER_CAP)}>
                    Reset
                  </Button>
                </div>
              )
            )}
          </div>

          <label className="flex items-center gap-2.5 mb-4 cursor-pointer">
            <Checkbox checked={showEdgeLabels} onCheckedChange={(v) => setShowEdgeLabels(!!v)} />
            <span className="text-xs font-medium">Show relationship labels</span>
          </label>

          <KgDivider />

          <KgSectionTitle>Highlight Nodes</KgSectionTitle>
          <Input
            placeholder="Type a topic or theme…"
            value={nodeSearch}
            onChange={(e) => setNodeSearch(e.target.value)}
            className="h-9 text-xs rounded-lg mb-1"
          />
          {nodeSearch && (
            <button type="button" onClick={() => setNodeSearch("")} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 mb-3">
              <X className="h-3 w-3" /> Clear highlight
            </button>
          )}

          <KgDivider />

          <KgSectionTitle>Legend</KgSectionTitle>
          {(Object.keys(TYPE_META) as NodeType[]).map((t) => (
            <KgLegendItem
              key={t}
              color={TYPE_META[t].color}
              icon={TYPE_META[t].icon}
              label={TYPE_META[t].label}
              desc={TYPE_META[t].desc}
            />
          ))}

          <KgDivider />

          <KgSectionTitle>How to Use</KgSectionTitle>
          <ul className="text-xs text-muted-foreground space-y-1.5 list-disc pl-4">
            <li>Pick a faculty from the search above</li>
            <li><strong>Load more</strong> to reveal additional papers</li>
            <li><strong>Click</strong> a node for details</li>
            <li><strong>Hover</strong> a node to highlight connections</li>
          </ul>
        </KgSidebar>

        <KgCanvas>
          <KgZoomControls onZoomIn={() => zoomBy(1.3)} onZoomOut={() => zoomBy(1 / 1.3)} onFit={fitGraph} />
          {error && <KgBanner variant="error">{error}</KgBanner>}
          {loading && <KgBanner variant="info">Loading graph…</KgBanner>}
          {!loading && !graph && !error && (
            <KgEmptyCanvas
              icon={<Network className="h-16 w-16" />}
              title="Select a faculty to explore their Knowledge Graph"
            />
          )}
          {graph && elements.length > 0 && (
            <CytoscapeComponent
              key={selectedId}
              elements={elements}
              stylesheet={STYLESHEET}
              layout={{ name: "preset" }}
              style={{ width: "100%", height: "100%" }}
              cy={registerCy}
              minZoom={0.02}
              maxZoom={4}
            />
          )}
        </KgCanvas>

        <KgDetailsPanel>
          <KgSectionTitle>Node Details</KgSectionTitle>
          {selectedNode ? (
            <div>
              <Badge
                className="mb-3 text-white border-0"
                style={{ background: TYPE_META[selectedNode.type]?.color ?? "#94a3b8" }}
              >
                {TYPE_META[selectedNode.type]?.icon} {TYPE_META[selectedNode.type]?.label ?? selectedNode.type}
              </Badge>
              <div className="font-bold text-base text-foreground mb-4 leading-snug">{selectedNode.label}</div>
              {selectedNode.type === "paper" && (() => {
                const paperUrl = getPaperExternalUrl(paperLinkMeta ?? selectedNode);
                return (
                <div className="space-y-3">
                  <KgInfoRow icon={<Calendar className="h-4 w-4" />} label="Year" value={selectedNode.year ?? "—"} />
                  <KgInfoRow icon={<Hash className="h-4 w-4" />} label="Citations" value={selectedNode.citation_count ?? 0} />
                  {selectedNode.broad_theme && <KgInfoRow icon={<Globe className="h-4 w-4" />} label="Broad Theme" value={selectedNode.broad_theme} />}
                  {selectedNode.sub_domain && <KgInfoRow icon={<Microscope className="h-4 w-4" />} label="Sub-Domain" value={selectedNode.sub_domain} />}
                  {selectedNode.topic && <KgInfoRow icon={<Tag className="h-4 w-4" />} label="Topic" value={selectedNode.topic} />}
                  {paperUrl && (
                    <a
                      href={paperUrl.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-primary/10 text-primary hover:bg-primary/20 text-sm font-semibold rounded-lg transition-all border border-primary/20"
                    >
                      <ExternalLink className="h-4 w-4" />
                      {paperUrl.label}
                    </a>
                  )}
                </div>
                );
              })()}
              {selectedNode.type === "faculty" && (
                <div className="space-y-3">
                  <KgInfoRow icon={<BookOpen className="h-4 w-4" />} label="Department" value={selectedNode.department ?? "—"} />
                  <KgInfoRow icon={<BookOpen className="h-4 w-4" />} label="Total papers" value={selectedFaculty?.paperCount ?? "—"} />
                </div>
              )}
              {selectedNode.type === "theme" && (
                <p className="text-xs text-muted-foreground bg-destructive/5 border border-destructive/10 rounded-lg p-3 leading-relaxed">
                  One of <strong>9 national research themes</strong> aligned with DST / IITD strategic priorities.
                </p>
              )}
              {selectedNode.type === "subdomain" && (
                <p className="text-xs text-muted-foreground bg-orange-500/5 border border-orange-500/10 rounded-lg p-3 leading-relaxed">
                  A curated academic <strong>sub-field</strong> within the department.
                </p>
              )}
              {selectedNode.type === "topic" && (
                <p className="text-xs text-muted-foreground bg-amber-500/5 border border-amber-500/10 rounded-lg p-3 leading-relaxed">
                  A specific <strong>keyphrase</strong> — the most granular leaf of the graph.
                </p>
              )}
            </div>
          ) : (
            <div>
              <p className="text-xs text-muted-foreground mb-4 leading-relaxed">
                Click any node in the graph to see its full details here.
              </p>
              <div className="rounded-xl border border-border bg-muted/40 p-3">
                <KgSectionTitle>Reading the Graph</KgSectionTitle>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  <span className="text-primary font-medium">Faculty</span> →{" "}
                  <span className="text-red-600 font-medium">Theme</span> →{" "}
                  <span className="text-orange-600 font-medium">Sub-Domain</span> →{" "}
                  <span className="text-amber-600 font-medium">Topic</span>.
                  <br /><br />
                  Bigger paper nodes = more citations.
                </p>
              </div>
            </div>
          )}
        </KgDetailsPanel>
      </div>
    </div>
  );
}
