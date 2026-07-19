import { useState, useRef, useMemo, isValidElement, type ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useElementWidth } from "@/hooks/use-element-width";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  ExternalLink, BookOpen, TrendingUp, BarChart2, PieChart as PieChartIcon,
  ChevronDown, Copy, Check, RotateCcw, Download, Pencil, Image as ImageIcon,
  UserRound, Lightbulb,
} from "lucide-react";
import { isIPSource, type ChatSource, type ChatChartEvent, type LineChartData, type BarChartData, type PieChartData } from "@/lib/api/services/chatService";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { resolvePaperHref } from "@/lib/paperLink";

export interface ChatMessageData {
  role: "user" | "assistant";
  content: string;
  sources?: ChatSource[];
  chart?: ChatChartEvent;
  error?: boolean;
}

export interface ChatMessageProps {
  message: ChatMessageData;
  onRetry?: () => void;
  onEdit?: (text: string) => void;
  isLast?: boolean;
  /** Opens the shared IP/patent detail modal for a clicked patent source card. */
  onOpenIPSource?: (source: ChatSource) => void;
}

const CHART_COLORS = [
  "#6366f1", "#06b6d4", "#10b981", "#f59e0b", "#ef4444",
  "#8b5cf6", "#ec4899", "#14b8a6", "#f97316", "#84cc16",
  "#64748b", "#a78bfa",
];

const TOOLTIP_STYLE = {
  backgroundColor: "hsl(var(--card))",
  border: "1px solid hsl(var(--border))",
  borderRadius: 8,
  fontSize: 11,
  color: "hsl(var(--foreground))",
  boxShadow: "0 4px 12px rgba(0,0,0,0.12)",
};

type ChartLayoutOpts = {
  containerWidth: number;
  isCompact: boolean;
};


const renderLineChart = (chart: LineChartData, opts?: ChartLayoutOpts) => {
  const compact = opts?.isCompact ?? false;
  const allXValues = new Set<string | number>();
  chart.series.forEach((s) => s.data.forEach((p) => allXValues.add(p.x)));
  const allData = Array.from(allXValues)
    .sort((a, b) => (a < b ? -1 : a > b ? 1 : 0))
    .map((x) => {
      const row: Record<string, string | number> = { x: String(x) };
      chart.series.forEach((s) => {
        const pt = s.data.find((p) => p.x === x);
        row[s.label] = pt ? pt.y : 0;
      });
      return row;
    });
  return (
    <ResponsiveContainer width="100%" height={compact ? 180 : 200}>
      <LineChart
        data={allData}
        margin={{ top: 8, right: compact ? 8 : 20, bottom: 8, left: 0 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.4} />
        <XAxis
          dataKey="x"
          tick={{ fontSize: compact ? 9 : 10, fill: "hsl(var(--muted-foreground))" }}
          interval="preserveStartEnd"
        />
        <YAxis
          tick={{ fontSize: compact ? 9 : 10, fill: "hsl(var(--muted-foreground))" }}
          width={compact ? 28 : 36}
        />
        <Tooltip contentStyle={TOOLTIP_STYLE} />
        {chart.series.length > 1 && <Legend wrapperStyle={{ fontSize: 10 }} />}
        {chart.series.map((s, i) => (
          <Line
            key={s.label}
            type="monotone"
            dataKey={s.label}
            stroke={CHART_COLORS[i % CHART_COLORS.length]}
            strokeWidth={2.5}
            dot={{ r: 3, fill: CHART_COLORS[i % CHART_COLORS.length], strokeWidth: 0 }}
            activeDot={{ r: 5, strokeWidth: 0 }}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
};

const renderBarChart = (chart: BarChartData, opts?: ChartLayoutOpts) => {
  const isHorizontal = chart.layout === "horizontal";
  const count = chart.categories.length;
  const compact = opts?.isCompact ?? false;
  const containerWidth = opts?.containerWidth ?? 0;

  const data = chart.categories.map((cat, i) => {
    const row: Record<string, string | number> = { name: cat };
    chart.series.forEach((s) => { row[s.label] = s.data[i] ?? 0; });
    return row;
  });

  if (isHorizontal) {
    const rowHeight = compact ? 30 : 28;
    const dynamicHeight = Math.max(compact ? 160 : 180, count * rowHeight + 48);
    const maxLabelLen = Math.max(...chart.categories.map((c) => c.length));
    const charWidth = compact ? 5.2 : 6.5;
    const maxLabelPx = containerWidth > 0
      ? Math.min(compact ? 132 : 148, Math.floor(containerWidth * (compact ? 0.46 : 0.42)))
      : compact ? 100 : 120;
    const labelWidth = Math.min(
      maxLabelPx,
      Math.max(compact ? 64 : 72, maxLabelLen * charWidth),
    );
    const maxChars = Math.max(compact ? 12 : 14, Math.floor(labelWidth / charWidth));
    const tickFontSize = compact ? 9 : 10;

    return (
      <ResponsiveContainer width="100%" height={dynamicHeight}>
        <BarChart
          layout="vertical"
          data={data}
          margin={{ top: 8, right: compact ? 6 : 16, bottom: 8, left: 0 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="hsl(var(--border))"
            strokeOpacity={0.35}
            horizontal={false}
          />
          <XAxis
            type="number"
            tick={{ fontSize: tickFontSize, fill: "hsl(var(--muted-foreground))" }}
            tickCount={compact ? 4 : 5}
          />
          <YAxis
            type="category"
            dataKey="name"
            width={labelWidth}
            tick={{ fontSize: tickFontSize, fill: "hsl(var(--muted-foreground))" }}
            tickFormatter={(v: string) =>
              v.length > maxChars ? v.slice(0, maxChars - 1) + "…" : v
            }
          />
          <Tooltip contentStyle={TOOLTIP_STYLE} />
          {chart.series.map((s, i) => (
            <Bar
              key={s.label}
              dataKey={s.label}
              fill={CHART_COLORS[i % CHART_COLORS.length]}
              radius={[0, 4, 4, 0]}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    );
  }

  // Vertical bar (default — for years, small count categories)
  return (
    <ResponsiveContainer width="100%" height={compact ? 180 : 200}>
      <BarChart data={data} margin={{ top: 8, right: compact ? 8 : 20, bottom: 8, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.4} />
        <XAxis
          dataKey="name"
          tick={{ fontSize: compact ? 9 : 10, fill: "hsl(var(--muted-foreground))" }}
          interval={compact ? "preserveStartEnd" : 0}
          angle={compact && count > 4 ? -35 : 0}
          textAnchor={compact && count > 4 ? "end" : "middle"}
          height={compact && count > 4 ? 52 : 30}
        />
        <YAxis
          tick={{ fontSize: compact ? 9 : 10, fill: "hsl(var(--muted-foreground))" }}
          width={compact ? 28 : 36}
        />
        <Tooltip contentStyle={TOOLTIP_STYLE} />
        {chart.series.length > 1 && <Legend wrapperStyle={{ fontSize: 10 }} />}
        {chart.series.map((s, i) => (
          <Bar
            key={s.label}
            dataKey={s.label}
            fill={CHART_COLORS[i % CHART_COLORS.length]}
            radius={[4, 4, 0, 0]}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
};

const renderPieChart = (chart: PieChartData, opts?: ChartLayoutOpts) => {
  const slices = chart.slices.slice(0, 8);
  const compact = opts?.isCompact ?? false;
  const containerWidth = opts?.containerWidth ?? 280;
  const outerRadius = Math.min(compact ? 64 : 82, Math.max(48, containerWidth * 0.22));
  const innerRadius = Math.round(outerRadius * 0.42);

  return (
    <ResponsiveContainer width="100%" height={compact ? 200 : 220}>
      <PieChart>
        <Pie
          data={slices}
          dataKey="value"
          nameKey="label"
          cx="50%"
          cy={compact ? "42%" : "44%"}
          outerRadius={outerRadius}
          innerRadius={innerRadius}
          paddingAngle={2}
        >
          {slices.map((_, i) => (
            <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} strokeWidth={0} />
          ))}
        </Pie>
        <Tooltip contentStyle={TOOLTIP_STYLE} />
        <Legend
          wrapperStyle={{ fontSize: compact ? 9 : 10, paddingTop: 6 }}
          formatter={(v: string) => {
            const max = compact ? 16 : 22;
            return v.length > max ? v.slice(0, max - 2) + "…" : v;
          }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
};


const chartRenderers: Record<string, (chart: LineChartData | BarChartData | PieChartData, opts?: ChartLayoutOpts) => React.ReactNode> = {
  line: (chart, opts) => renderLineChart(chart as LineChartData, opts),
  bar: (chart, opts) => renderBarChart(chart as BarChartData, opts),
  pie: (chart, opts) => renderPieChart(chart as PieChartData, opts),
};

const ChartBlock = ({
  chart,
  chartRef,
}: {
  chart: ChatChartEvent;
  chartRef: React.RefObject<HTMLDivElement | null>;
}) => {
  const isMobile = useIsMobile();
  const { ref: measureRef, width: containerWidth } = useElementWidth<HTMLDivElement>();
  const isCompact = isMobile || (containerWidth > 0 && containerWidth < 360);
  const layoutOpts: ChartLayoutOpts = { containerWidth, isCompact };

  const icons = { line: TrendingUp, bar: BarChart2, pie: PieChartIcon };
  const Icon = icons[chart.chart.chart_type as keyof typeof icons] ?? BarChart2;

  const setChartRef = (node: HTMLDivElement | null) => {
    measureRef(node);
    if (chartRef && "current" in chartRef) {
      (chartRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
    }
  };

  return (
    <div
      ref={setChartRef}
      className="w-full min-w-0 max-w-full rounded-xl border border-primary/15 overflow-hidden"
      style={{ background: "linear-gradient(160deg, hsl(var(--primary)/0.04) 0%, transparent 60%)" }}
    >
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border/25 min-w-0">
        <Icon className="w-3.5 h-3.5 text-primary flex-shrink-0" />
        <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider truncate">
          {chart.chart.title}
        </span>
      </div>
      <div className="w-full min-w-0 max-w-full px-1 pb-3 pt-2 overflow-x-auto">
        <div className="w-full min-w-0" style={{ minWidth: isCompact ? undefined : 0 }}>
          {chartRenderers[chart.chart.chart_type]?.(chart.chart, layoutOpts)}
        </div>
      </div>
    </div>
  );
};

const SourceItem = ({
  source,
  onOpenIPSource,
}: {
  source: ChatSource;
  onOpenIPSource?: (source: ChatSource) => void;
}) => {
  const isIP = isIPSource(source);
  const href = isIP ? null : resolvePaperHref(source);
  const authors = source.authors.slice(0, 2).join(", ") + (source.authors.length > 2 ? ` +${source.authors.length - 2}` : "");

  const content = (
    <div className="group/item flex items-start gap-3 px-4 py-3 hover:bg-primary/[0.03] transition-colors duration-150">
      <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/10 text-primary text-[9px] font-bold flex items-center justify-center mt-0.5 ring-1 ring-primary/15">
        {source.index}
      </span>

      <div className="flex-1 min-w-0 space-y-1.5">
        <p className="text-[12px] font-medium text-foreground leading-snug line-clamp-2 group-hover/item:text-primary transition-colors duration-150">
          {source.title}
        </p>

        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          {isIP && source.document_type && (
            <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-semibold uppercase tracking-wide text-secondary-foreground bg-secondary/70 flex-shrink-0">
              {source.document_type}
            </span>
          )}
          {source.publication_year && (
            <span className="text-[10px] text-muted-foreground/70 font-medium">
              {source.publication_year}
            </span>
          )}
          {authors && (
            <span className="text-[10px] text-muted-foreground/60 truncate max-w-[180px]">
              {authors}
            </span>
          )}
          {source.faculty_name && source.kerberos && (
            <a
              href={`/faculty/${source.kerberos}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-semibold no-underline text-primary bg-primary/8 border border-primary/20 hover:bg-primary/15 hover:border-primary/40 transition-all duration-150 flex-shrink-0"
            >
              <UserRound className="w-2.5 h-2.5 flex-shrink-0" />
              {source.faculty_name}
              <ExternalLink className="w-2 h-2 flex-shrink-0 opacity-50" />
            </a>
          )}
        </div>
      </div>

      
      {isIP ? (
        <Lightbulb className="w-3 h-3 text-muted-foreground/25 group-hover/item:text-primary/60 flex-shrink-0 mt-0.5 transition-colors duration-150" />
      ) : href && (
        <ExternalLink className="w-3 h-3 text-muted-foreground/25 group-hover/item:text-primary/60 flex-shrink-0 mt-0.5 transition-colors duration-150" />
      )}
    </div>
  );

  if (isIP) {
    return (
      <button type="button" onClick={() => onOpenIPSource?.(source)} className="block w-full text-left">
        {content}
      </button>
    );
  }

  return href ? (
    <a href={href} target="_blank" rel="noopener noreferrer" className="block">
      {content}
    </a>
  ) : (
    <div>{content}</div>
  );
};

const SourcesBlock = ({
  sources,
  onOpenIPSource,
}: {
  sources: ChatSource[];
  onOpenIPSource?: (source: ChatSource) => void;
}) => {
  const [open, setOpen] = useState(false);
  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{
        border: "1px solid hsl(var(--border)/0.45)",
        background: "hsl(var(--card))",
        boxShadow: "0 1px 6px -2px rgba(0,0,0,0.07)",
      }}
    >
      
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-2.5 px-3.5 py-2.5 transition-colors duration-150 text-left hover:bg-muted/30"
        style={{ borderBottom: open ? "1px solid hsl(var(--border)/0.35)" : "none" }}
      >
        
        <div
          className="w-[22px] h-[22px] rounded-lg flex items-center justify-center flex-shrink-0"
          style={{
            background:
              "linear-gradient(135deg, hsl(var(--primary)/0.12), hsl(var(--accent)/0.08))",
            border: "1px solid hsl(var(--primary)/0.15)",
          }}
        >
          <BookOpen className="w-3 h-3 text-primary" />
        </div>
        <span className="text-[11px] font-semibold text-foreground/80 flex-1">
          {sources.length} Source{sources.length !== 1 ? "s" : ""}
        </span>
        <ChevronDown
          className={`w-3.5 h-3.5 text-muted-foreground/50 transition-transform duration-200 ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      
      {open && (
        <div className="divide-y" style={{ borderColor: "hsl(var(--border)/0.25)" }}>
          {sources.map((s) => (
            <SourceItem key={s.id || s.title} source={s} onOpenIPSource={onOpenIPSource} />
          ))}
        </div>
      )}
    </div>
  );
};

// Faculty links (/faculty/kerberos) → pill chip; IP/patent citations → open the
// shared detail modal instead of navigating; everything else → styled external link

function extractText(node: ReactNode): string {
  if (node == null || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(extractText).join("");
  if (isValidElement(node)) return extractText((node.props as { children?: ReactNode }).children);
  return "";
}

function normalizeTitle(s: string): string {
  return s
    .toLowerCase()
    .replace(/[…]|\.{2,}$/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

// The LLM cites IP filings by title in prose (patents/IP results carry no `url`
// field, unlike papers), so inline links can only be resolved back to a source
// by matching their visible text against `message.sources` — not by href.
function findIPSourceMatch(sources: ChatSource[] | undefined, linkText: string): ChatSource | undefined {
  const norm = normalizeTitle(linkText);
  if (!sources?.length || norm.length < 8) return undefined;

  const ipSources = sources.filter(isIPSource);
  const exact = ipSources.find((s) => normalizeTitle(s.title) === norm);
  if (exact) return exact;

  return ipSources.find((s) => {
    const st = normalizeTitle(s.title);
    return st.length >= 8 && (st.startsWith(norm) || norm.startsWith(st));
  });
}

const MarkdownLink = ({
  href,
  children,
  sources,
  onOpenIPSource,
}: React.AnchorHTMLAttributes<HTMLAnchorElement> & {
  sources?: ChatSource[];
  onOpenIPSource?: (source: ChatSource) => void;
}) => {
  const isFaculty = href?.startsWith("/faculty/");

  if (isFaculty) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="
          inline-flex items-center gap-1 align-middle
          px-2 py-0.5 mx-0.5 rounded-full
          text-[11px] font-semibold no-underline
          text-primary bg-primary/8 border border-primary/20
          hover:bg-primary/14 hover:border-primary/40 hover:shadow-sm
          transition-all duration-150 cursor-pointer
        "
      >
        <UserRound className="w-3 h-3 flex-shrink-0 opacity-80" />
        <span>{children}</span>
        <ExternalLink className="w-2.5 h-2.5 flex-shrink-0 opacity-50" />
      </a>
    );
  }

  const ipMatch = findIPSourceMatch(sources, extractText(children));

  if (ipMatch) {
    const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
      e.preventDefault();
      onOpenIPSource?.(ipMatch);
    };

    return (
      <a
        href={href}
        onClick={handleClick}
        className="
          inline-flex items-baseline gap-0.5 cursor-pointer
          text-primary underline decoration-primary/30 underline-offset-2
          hover:decoration-primary/70 hover:text-primary/90
          transition-colors duration-150
        "
      >
        <span>{children}</span>
        <Lightbulb className="w-3 h-3 flex-shrink-0 self-center opacity-50 ml-0.5" />
      </a>
    );
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="
        inline-flex items-baseline gap-0.5
        text-primary underline decoration-primary/30 underline-offset-2
        hover:decoration-primary/70 hover:text-primary/90
        transition-colors duration-150
      "
    >
      <span>{children}</span>
      <ExternalLink className="w-3 h-3 flex-shrink-0 self-center opacity-50 ml-0.5" />
    </a>
  );
};


async function chartToPng(container: HTMLDivElement): Promise<Blob | null> {
  // Target the Recharts SVG specifically — querySelector("svg") would find the
  // lucide icon in the chart header first, giving a tiny icon instead of the chart.
  const svg = container.querySelector<SVGSVGElement>("svg.recharts-surface");
  if (!svg) return null;

  const rect = svg.getBoundingClientRect();
  const w = Math.round(rect.width) || 600;
  const h = Math.round(rect.height) || 300;

  const clone = svg.cloneNode(true) as SVGSVGElement;
  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  clone.setAttribute("width", String(w));
  clone.setAttribute("height", String(h));

  // Inline computed styles on every element so CSS variables resolve in the exported image
  const srcEls = Array.from(svg.querySelectorAll("*"));
  const dstEls = Array.from(clone.querySelectorAll("*"));
  const props = [
    "fill", "stroke", "stroke-width", "stroke-dasharray", "stroke-opacity",
    "opacity", "font-size", "font-family", "font-weight", "text-anchor", "dominant-baseline",
  ];
  srcEls.forEach((src, i) => {
    const dst = dstEls[i] as SVGElement;
    if (!dst) return;
    const cs = window.getComputedStyle(src as Element);
    props.forEach((p) => {
      const v = cs.getPropertyValue(p);
      if (v) dst.style.setProperty(p, v);
    });
  });

  // White background rect so the chart is readable on any surface
  const bg = document.createElementNS("http://www.w3.org/2000/svg", "rect");
  bg.setAttribute("width", "100%");
  bg.setAttribute("height", "100%");
  bg.setAttribute("fill", "white");
  clone.insertBefore(bg, clone.firstChild);

  const svgStr = new XMLSerializer().serializeToString(clone);
  const svgBlob = new Blob([svgStr], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(svgBlob);

  return new Promise<Blob | null>((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const dpr = window.devicePixelRatio || 1;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      const ctx = canvas.getContext("2d");
      if (!ctx) { URL.revokeObjectURL(url); resolve(null); return; }
      ctx.scale(dpr, dpr);
      ctx.drawImage(img, 0, 0);
      URL.revokeObjectURL(url);
      canvas.toBlob(resolve, "image/png");
    };
    img.onerror = () => { URL.revokeObjectURL(url); resolve(null); };
    img.src = url;
  });
}


const btnCls =
  "flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] text-muted-foreground/70 hover:text-foreground hover:bg-muted/60 transition-all";

const AssistantActions = ({
  content,
  hasChart,
  chartRef,
  onRetry,
  canRetry,
}: {
  content: string;
  hasChart: boolean;
  chartRef: React.RefObject<HTMLDivElement | null>;
  onRetry?: () => void;
  canRetry?: boolean;
}) => {
  const [copied, setCopied] = useState(false);
  const [copiedChart, setCopiedChart] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard unavailable */
    }
  };

  const handleCopyChart = async () => {
    const container = chartRef.current;
    if (!container) return;
    const blob = await chartToPng(container);
    if (!blob) return;
    try {
      await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
      setCopiedChart(true);
      setTimeout(() => setCopiedChart(false), 2000);
    } catch {
      /* clipboard unavailable */
    }
  };

  const handleDownload = async () => {
    const container = chartRef.current;
    if (!container) return;
    const blob = await chartToPng(container);
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "chart.png";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex gap-0.5 opacity-0 group-hover/msg:opacity-100 focus-within:opacity-100 transition-opacity duration-150">
      {content && (
        <button onClick={handleCopy} title={copied ? "Copied!" : "Copy response"} className={btnCls}>
          {copied ? (
            <Check className="w-3 h-3 text-emerald-500" />
          ) : (
            <Copy className="w-3 h-3" />
          )}
          <span>{copied ? "Copied" : "Copy"}</span>
        </button>
      )}
      {hasChart && (
        <button onClick={handleCopyChart} title={copiedChart ? "Copied!" : "Copy chart as image"} className={btnCls}>
          {copiedChart ? (
            <Check className="w-3 h-3 text-emerald-500" />
          ) : (
            <ImageIcon className="w-3 h-3" />
          )}
          <span>{copiedChart ? "Copied" : "Copy chart"}</span>
        </button>
      )}
      {hasChart && (
        <button onClick={handleDownload} title="Download chart as PNG" className={btnCls}>
          <Download className="w-3 h-3" />
          <span>Download</span>
        </button>
      )}
      {canRetry && onRetry && (
        <button onClick={onRetry} title="Retry query" className={btnCls}>
          <RotateCcw className="w-3 h-3" />
          <span>Retry</span>
        </button>
      )}
    </div>
  );
};


const ChatMessage = ({ message, onRetry, onEdit, isLast, onOpenIPSource }: ChatMessageProps) => {
  const chartRef = useRef<HTMLDivElement>(null);

  const LinkRenderer = useMemo(
    () =>
      (props: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
        <MarkdownLink {...props} sources={message.sources} onOpenIPSource={onOpenIPSource} />
      ),
    [message.sources, onOpenIPSource]
  );

  if (message.role === "user") {
    return (
      <div className="group/msg flex flex-col items-end gap-0.5">
        <div
          className="max-w-[88%] sm:max-w-[82%] px-3.5 sm:px-4 py-2.5 rounded-2xl rounded-br-sm text-primary-foreground text-sm leading-relaxed break-words"
          style={{
            background:
              "linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(222 68% 40%) 55%, hsl(var(--accent)/0.85) 100%)",
            boxShadow: "0 2px 10px -2px hsl(var(--primary)/0.35)",
          }}
        >
          {message.content}
        </div>
        {onEdit && (
          <div className="opacity-0 group-hover/msg:opacity-100 transition-opacity duration-150">
            <button onClick={() => onEdit(message.content)} title="Edit query" className={btnCls}>
              <Pencil className="w-3 h-3" />
              <span>Edit</span>
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="group/msg flex flex-col gap-2 w-full min-w-0 max-w-full">
      {message.content && (
        <div
          className={`relative w-full min-w-0 max-w-full pl-4 pr-4 py-3 rounded-2xl rounded-bl-sm text-sm leading-relaxed break-words ${
            message.error
              ? "bg-destructive/6 text-destructive border border-destructive/20"
              : "bg-card text-foreground border border-border/35"
          }`}
          style={
            !message.error
              ? { boxShadow: "0 1px 4px -1px rgba(0,0,0,0.06)" }
              : undefined
          }
        >
          
          {!message.error && (
            <div
              className="absolute left-0 top-3 bottom-3 w-[2.5px] rounded-r-full"
              style={{
                background:
                  "linear-gradient(180deg, hsl(var(--primary)/0.55), hsl(var(--accent)/0.4))",
              }}
            />
          )}
          <div
            className="
              prose prose-sm dark:prose-invert max-w-none
              prose-p:my-1.5 prose-p:leading-relaxed
              prose-ul:my-1.5 prose-ul:pl-5 prose-ul:list-disc
              prose-ol:my-1.5 prose-ol:pl-5
              prose-li:my-0.5 prose-li:leading-relaxed
              prose-headings:my-2 prose-headings:font-semibold prose-headings:text-foreground
              prose-h1:text-[15px] prose-h2:text-[14px] prose-h3:text-[13px]
              prose-strong:text-foreground prose-strong:font-semibold
              prose-em:text-muted-foreground
              prose-a:no-underline
              prose-code:text-primary prose-code:bg-primary/8 prose-code:px-1.5 prose-code:py-0.5
              prose-code:rounded prose-code:text-[11px] prose-code:font-mono prose-code:font-medium
              prose-pre:bg-muted prose-pre:rounded-lg prose-pre:text-xs prose-pre:overflow-x-auto
              prose-blockquote:border-l-2 prose-blockquote:border-primary/30
              prose-blockquote:text-muted-foreground prose-blockquote:pl-3 prose-blockquote:italic
              prose-table:text-xs prose-th:py-1.5 prose-th:px-2 prose-td:py-1.5 prose-td:px-2
              prose-hr:border-border/40
              [&>*:first-child]:mt-0 [&>*:last-child]:mb-0
            "
          >
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{ a: LinkRenderer }}
            >
              {message.content}
            </ReactMarkdown>
          </div>
        </div>
      )}

      {message.chart && <ChartBlock chart={message.chart} chartRef={chartRef} />}

      {message.sources && message.sources.length > 0 && (
        <SourcesBlock sources={message.sources} onOpenIPSource={onOpenIPSource} />
      )}

      {!message.error && (message.content || message.chart) && (
        <AssistantActions
          content={message.content}
          hasChart={!!message.chart}
          chartRef={chartRef}
          onRetry={onRetry}
          canRetry={isLast}
        />
      )}
    </div>
  );
};

export default ChatMessage;
