import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import CytoscapeComponent from "react-cytoscapejs";
import cytoscape from "cytoscape";
import type { Core, ElementDefinition } from "cytoscape";
import fcose from "cytoscape-fcose";
import {
  ArrowRight, Building2, ChevronRight, Compass, FileText, Search, Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import ModeToggle from "./ModeToggle";
import type { AppMode } from "./types";
import { fetchKgExploreDetail, fetchKgExploreTerms } from "./api";
import {
  KgBanner, KgCanvas, KgCard, KgDetailsPanel, KgDivider, KgEmptyCanvas,
  KgInfoRow, KgLegendItem, KgSearchDropdown, KgSectionTitle, KgSidebar,
  KgStat, KgToolbar, KgZoomControls, applyDefaultGraphView,
} from "./KgShared";

cytoscape.use(fcose);

// ─── Types ────────────────────────────────────────────────────────────────────
type TermType = "theme" | "subdomain" | "topic";

interface TermItem {
  key: string; term: string; type: TermType;
  paperCount: number; deptCount: number; facultyCount: number;
}
interface FacItem { facultyId: string; name: string; paperCount: number }
interface DeptItem { department: string; paperCount: number; facultyCount: number; faculty: FacItem[] }
interface Detail { term: string; type: TermType; departments: DeptItem[] }

// ─── Visual config ────────────────────────────────────────────────────────────
const TYPE_META: Record<TermType, { color: string; label: string; icon: string }> = {
  theme:     { color: "#dc2626", label: "Broad Theme", icon: "🌐" },
  subdomain: { color: "#ea580c", label: "Sub-Domain",  icon: "🔬" },
  topic:     { color: "#ca8a04", label: "Topic",       icon: "🏷️" },
};
const DEPT_COLOR = "#0891b2";
const FAC_COLOR  = "#1d4ed8";

const STYLESHEET: any[] = [
  {
    selector: "node",
    style: {
      "background-color": "data(color)",
      width: "data(size)", height: "data(size)",
      label: "data(displayLabel)",
      "font-size": "data(fontSize)",
      "font-weight": 700,
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
      "text-outline-opacity": 0.6,
    },
  },
  { selector: "node[kind='term']", style: { shape: "round-rectangle", "border-width": 5, "border-color": "#fde68a" } },
  { selector: "node[kind='dept']", style: { shape: "round-rectangle" } },
  { selector: "node[kind='fac']",  style: { shape: "ellipse" } },
  { selector: "node[kind='dept'].collapsed", style: { "border-color": "#a5f3fc", "border-width": 5 } },
  {
    selector: "edge",
    style: {
      label: "data(edgeLabel)",
      "font-size": 9, "font-weight": 600, color: "#475569",
      width: 1.6, "line-color": "#cbd5e1",
      "target-arrow-color": "#94a3b8", "target-arrow-shape": "triangle",
      "arrow-scale": 0.8, "curve-style": "bezier", opacity: 0.8,
      "text-rotation": "autorotate",
      "text-background-color": "#ecfeff", "text-background-opacity": 0.95,
      "text-background-padding": 3, "text-background-shape": "round-rectangle",
      "text-border-width": 1, "text-border-color": "#a5f3fc", "text-border-opacity": 1,
    },
  },
  { selector: "node.highlight", style: { "border-width": 6, "border-color": "#f59e0b", "border-opacity": 1 } },
  { selector: "node.faded", style: { opacity: 0.12 } },
  { selector: "edge.faded", style: { opacity: 0.06, "text-opacity": 0 } },
  { selector: "node:selected", style: { "border-width": 6, "border-color": "#7c3aed", "border-opacity": 1 } },
];

const FCOSE_LAYOUT = {
  name: "fcose", quality: "default", animate: false, randomize: true,
  padding: 50, nodeSeparation: 130, idealEdgeLength: 150,
  nodeRepulsion: 9000, gravity: 0.2,
};

function shortLabel(label: string, max = 26): string {
  return label.length > max ? label.slice(0, max - 1) + "…" : label;
}

// ─── Topic Explorer ───────────────────────────────────────────────────────────
export default function TopicExplorer({
  mode, setMode, onOpenFaculty,
}: {
  mode: AppMode;
  setMode: (m: AppMode) => void;
  onOpenFaculty: (facultyId: string) => void;
}) {
  const [query, setQuery]           = useState("");
  const [suggestions, setSuggestions] = useState<TermItem[]>([]);
  const [comboOpen, setComboOpen]   = useState(false);
  const [selectedTerm, setSelectedTerm] = useState<TermItem | null>(null);
  const [detail, setDetail]         = useState<Detail | null>(null);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState<string | null>(null);
  const [expanded, setExpanded]     = useState<Set<string>>(new Set());
  const [selectedNode, setSelectedNode] = useState<any>(null);

  const cyRef = useRef<Core | null>(null);
  const comboRef = useRef<HTMLDivElement | null>(null);

  // ── Fetch term suggestions (debounced) ──
  useEffect(() => {
    const t = setTimeout(() => {
      const q = query.trim();
      fetchKgExploreTerms(q, 50)
        .then((data) => setSuggestions(data))
        .catch((e) => setError(`Cannot reach Knowledge Graph API. Is the backend running? (${e})`));
    }, 180);
    return () => clearTimeout(t);
  }, [query]);

  // ── Close combobox on outside click ──
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (comboRef.current && !comboRef.current.contains(e.target as Node)) setComboOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  // ── Load detail for a chosen term ──
  const pickTerm = useCallback((t: TermItem) => {
    setSelectedTerm(t);
    setQuery("");
    setComboOpen(false);
    setSelectedNode(null);
    setExpanded(new Set());
    setDetail(null);
    setLoading(true);
    setError(null);
    fetchKgExploreDetail(t.key)
      .then((d) => setDetail(d))
      .catch((e) => setError(`Failed to load detail: ${e}`))
      .finally(() => setLoading(false));
  }, []);

  const toggleDept = useCallback((dept: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      next.has(dept) ? next.delete(dept) : next.add(dept);
      return next;
    });
  }, []);

  // ── Build graph elements ──
  const elements: ElementDefinition[] = useMemo(() => {
    if (!detail) return [];
    const meta = TYPE_META[detail.type];
    const els: ElementDefinition[] = [];

    // Center term node
    els.push({
      data: {
        id: "term", kind: "term", color: meta.color, size: 110,
        label: detail.term, term: detail.term, ttype: detail.type,
        displayLabel: `${meta.icon} ${shortLabel(detail.term, 30)}`,
        fontSize: 13, textWidth: "96px",
      },
    });

    const maxDeptPapers = Math.max(...detail.departments.map(d => d.paperCount), 1);

    detail.departments.forEach((d, di) => {
      const deptId = `dept:${d.department}`;
      const isExp = expanded.has(d.department);
      const size = 55 + (d.paperCount / maxDeptPapers) * 35;
      els.push({
        data: {
          id: deptId, kind: "dept", color: DEPT_COLOR, size,
          label: d.department, department: d.department,
          paperCount: d.paperCount, facultyCount: d.facultyCount,
          displayLabel: `🏛️ ${shortLabel(d.department, 24)}`,
          fontSize: 10, textWidth: `${size - 10}px`,
        },
        classes: isExp ? "" : "collapsed",
      });
      els.push({
        data: { id: `e-term-${di}`, source: "term", target: deptId,
          edgeLabel: `${d.facultyCount} prof${d.facultyCount > 1 ? "s" : ""}` },
      });

      if (isExp) {
        d.faculty.forEach((f, fi) => {
          const facId = `fac:${f.facultyId}`;
          const fsize = 38 + Math.min(Math.sqrt(f.paperCount) * 5, 30);
          els.push({
            data: {
              id: facId, kind: "fac", color: FAC_COLOR, size: fsize,
              label: f.name, name: f.name, facultyId: f.facultyId,
              paperCount: f.paperCount, department: d.department,
              displayLabel: `👤 ${shortLabel(f.name, 22)}`,
              fontSize: 9, textWidth: `${fsize - 8}px`,
            },
          });
          els.push({
            data: { id: `e-${di}-${fi}`, source: deptId, target: facId,
              edgeLabel: `${f.paperCount} paper${f.paperCount > 1 ? "s" : ""}` },
          });
        });
      }
    });

    return els;
  }, [detail, expanded]);

  // ── Re-run layout when graph changes, then zoom out for overview ──
  useEffect(() => {
    const cy = cyRef.current;
    if (!cy || elements.length === 0) return;
    const layout = cy.layout(FCOSE_LAYOUT as any);
    layout.one("layoutstop", () => applyDefaultGraphView(cy));
    layout.run();
  }, [elements]);

  // ── Cytoscape events ──
  const registerCy = useCallback((cy: Core) => {
    cyRef.current = cy;
    cy.removeAllListeners();
    cy.on("tap", "node[kind='dept']", evt => {
      const d = evt.target.data();
      setSelectedNode(d);
      toggleDept(d.department);
    });
    cy.on("tap", "node[kind='fac']", evt => setSelectedNode(evt.target.data()));
    cy.on("tap", "node[kind='term']", evt => setSelectedNode(evt.target.data()));
    cy.on("tap", evt => { if (evt.target === cy) setSelectedNode(null); });
    cy.on("mouseover", "node", evt => {
      const node = evt.target;
      cy.elements().addClass("faded");
      node.removeClass("faded").addClass("highlight");
      node.neighborhood().removeClass("faded");
      node.connectedEdges().removeClass("faded");
    });
    cy.on("mouseout", "node", () => cy.elements().removeClass("faded highlight"));
  }, [toggleDept]);

  const fitGraph = () => cyRef.current?.fit(undefined, 40);
  const zoomBy = (factor: number) => {
    const cy = cyRef.current; if (!cy) return;
    cy.zoom({ level: cy.zoom() * factor, renderedPosition: { x: cy.width() / 2, y: cy.height() / 2 } });
  };

  const totalFaculty = detail
    ? new Set(detail.departments.flatMap(d => d.faculty.map(f => f.facultyId))).size
    : 0;

  return (
    <div className="flex flex-col flex-1 min-h-0 bg-background">
      <KgToolbar
        title="Topic Explorer"
        modeToggle={<ModeToggle mode={mode} setMode={setMode} />}
        search={
          <div ref={comboRef} className="relative">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                placeholder={selectedTerm ? selectedTerm.term : "Search topic, theme or sub-domain…"}
                value={query}
                onChange={(e) => { setQuery(e.target.value); setComboOpen(true); }}
                onFocus={() => setComboOpen(true)}
                className="pl-9 h-9 rounded-lg border bg-background text-sm"
              />
            </div>
            <KgSearchDropdown
              open={comboOpen}
              header={
                query.trim()
                  ? `Results for “${query.trim()}”`
                  : "Popular themes & sub-domains — type to search topics"
              }
              empty={suggestions.length === 0 ? (
                <div className="px-3 py-4 text-sm text-muted-foreground">No matches</div>
              ) : undefined}
            >
              {suggestions.map((t) => (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => pickTerm(t)}
                  className="flex items-center gap-2.5 w-full text-left px-3 py-2.5 text-sm border-b border-border/50 hover:bg-muted/60 transition-colors"
                >
                  <span className="shrink-0">{TYPE_META[t.type].icon}</span>
                  <span className="flex-1 min-w-0">
                    <span className="font-semibold text-foreground block truncate">{t.term}</span>
                    <span className="text-xs text-muted-foreground">
                      {TYPE_META[t.type].label} · {t.deptCount} depts · {t.facultyCount} profs · {t.paperCount} papers
                    </span>
                  </span>
                </button>
              ))}
            </KgSearchDropdown>
          </div>
        }
      />

      <div className="flex flex-1 min-h-0 flex-col lg:flex-row">
        <KgSidebar>
          {selectedTerm && detail ? (
            <>
              <KgCard>
                <Badge
                  className="mb-2 text-white border-0"
                  style={{ background: TYPE_META[detail.type].color }}
                >
                  {TYPE_META[detail.type].icon} {TYPE_META[detail.type].label}
                </Badge>
                <div className="font-bold text-sm text-primary leading-snug">{detail.term}</div>
                <div className="flex gap-6 mt-3">
                  <KgStat label="Departments" value={detail.departments.length} />
                  <KgStat label="Professors" value={totalFaculty} />
                </div>
              </KgCard>

              <KgSectionTitle>Departments</KgSectionTitle>
              <p className="text-xs text-muted-foreground mb-3 leading-relaxed">
                Click a department to reveal professors working on this {TYPE_META[detail.type].label.toLowerCase()}.
              </p>
              {detail.departments.map((d) => {
                const isExp = expanded.has(d.department);
                return (
                  <button
                    key={d.department}
                    type="button"
                    onClick={() => toggleDept(d.department)}
                    className={cn(
                      "block w-full text-left mb-2 px-3 py-2.5 rounded-xl border transition-colors",
                      isExp
                        ? "border-primary/40 bg-primary/5"
                        : "border-border bg-card hover:border-primary/30 hover:bg-muted/40",
                    )}
                  >
                    <span className="font-semibold text-sm text-foreground flex items-center gap-1">
                      <ChevronRight className={cn("h-3.5 w-3.5 transition-transform", isExp && "rotate-90")} />
                      {d.department}
                    </span>
                    <span className="text-xs text-muted-foreground mt-1 block pl-5">
                      {d.facultyCount} prof{d.facultyCount > 1 ? "s" : ""} · {d.paperCount} papers
                    </span>
                  </button>
                );
              })}
            </>
          ) : (
            <div className="text-sm text-muted-foreground">
              <KgSectionTitle>How it works</KgSectionTitle>
              <ol className="text-xs space-y-2 list-decimal pl-4 leading-relaxed">
                <li><strong>Search</strong> a theme, sub-domain or topic above.</li>
                <li>See all <strong>departments</strong> active in that area.</li>
                <li><strong>Click a department</strong> to reveal its professors.</li>
                <li><strong>Click a professor</strong> to open their full graph.</li>
              </ol>
            </div>
          )}

          <KgDivider />

          <KgSectionTitle>Legend</KgSectionTitle>
          <KgLegendItem color={TYPE_META[detail?.type ?? "theme"].color} icon={TYPE_META[detail?.type ?? "theme"].icon} label="Search term" desc="Theme / sub-domain / topic" />
          <KgLegendItem color={DEPT_COLOR} icon={<Building2 className="h-2.5 w-2.5 text-white" />} label="Department" desc="Click to expand professors" />
          <KgLegendItem color={FAC_COLOR} icon={<Users className="h-2.5 w-2.5 text-white" />} label="Professor" desc="Click to open full graph" />
        </KgSidebar>

        <KgCanvas>
          <KgZoomControls onZoomIn={() => zoomBy(1.3)} onZoomOut={() => zoomBy(1 / 1.3)} onFit={fitGraph} />
          {error && <KgBanner variant="error">{error}</KgBanner>}
          {loading && <KgBanner variant="info">Loading…</KgBanner>}
          {!loading && !detail && !error && (
            <KgEmptyCanvas
              icon={<Compass className="h-16 w-16" />}
              title="Search a topic, theme or sub-domain to begin"
              hint='e.g. "Artificial Intelligence", "Energy", "Manufacturing"'
            />
          )}
          {detail && elements.length > 0 && (
            <CytoscapeComponent
              key={selectedTerm?.key}
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
          <KgSectionTitle>Details</KgSectionTitle>
          {selectedNode ? (
            <div>
              {selectedNode.kind === "fac" && (
                <>
                  <Badge className="mb-3 text-white border-0" style={{ background: FAC_COLOR }}>Professor</Badge>
                  <div className="font-bold text-base text-foreground mb-4">{selectedNode.name}</div>
                  <div className="space-y-3 mb-4">
                    <KgInfoRow icon={<Building2 className="h-4 w-4" />} label="Department" value={selectedNode.department} />
                    <KgInfoRow icon={<FileText className="h-4 w-4" />} label="Papers on this topic" value={selectedNode.paperCount} />
                  </div>
                  <Button className="w-full rounded-xl" onClick={() => onOpenFaculty(selectedNode.facultyId)}>
                    Open full graph <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </>
              )}
              {selectedNode.kind === "dept" && (
                <>
                  <Badge className="mb-3 text-white border-0" style={{ background: DEPT_COLOR }}>Department</Badge>
                  <div className="font-bold text-base text-foreground mb-4">{selectedNode.department}</div>
                  <div className="space-y-3">
                    <KgInfoRow icon={<Users className="h-4 w-4" />} label="Professors" value={selectedNode.facultyCount} />
                    <KgInfoRow icon={<FileText className="h-4 w-4" />} label="Papers" value={selectedNode.paperCount} />
                  </div>
                  <p className="mt-4 text-xs text-muted-foreground bg-accent/5 border border-accent/10 rounded-lg p-3 leading-relaxed">
                    {expanded.has(selectedNode.department)
                      ? "Professors are shown in the graph. Click again to collapse."
                      : "Click this department node to reveal its professors."}
                  </p>
                </>
              )}
              {selectedNode.kind === "term" && (
                <>
                  <Badge className="mb-3 text-white border-0" style={{ background: TYPE_META[selectedNode.ttype as TermType].color }}>
                    {TYPE_META[selectedNode.ttype as TermType].icon} {TYPE_META[selectedNode.ttype as TermType].label}
                  </Badge>
                  <div className="font-bold text-base text-foreground mb-4">{selectedNode.term}</div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Departments around this node have professors publishing in this area. Click any department to drill into its professors.
                  </p>
                </>
              )}
            </div>
          ) : (
            <div>
              <p className="text-xs text-muted-foreground mb-4 leading-relaxed">
                Click any node to see its details. Click a department to expand its professors.
              </p>
              <div className="rounded-xl border border-border bg-muted/40 p-3">
                <KgSectionTitle>Reading the Graph</KgSectionTitle>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  <span className="text-red-600 font-medium">Topic / Theme</span> →{" "}
                  <span className="text-accent font-medium">Departments</span> →{" "}
                  <span className="text-primary font-medium">Professors</span>.
                  <br /><br />
                  Bigger department nodes have more papers.
                </p>
              </div>
            </div>
          )}
        </KgDetailsPanel>
      </div>
    </div>
  );
}
