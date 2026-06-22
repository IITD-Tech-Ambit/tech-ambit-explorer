import { useState, useRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useElementWidth } from "@/hooks/use-element-width";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  ExternalLink, BookOpen, TrendingUp, BarChart2, PieChart as PieChartIcon,
  ChevronDown, Copy, Check, RotateCcw, Download, Pencil,
} from "lucide-react";
import type { ChatSource, ChatChartEvent, LineChartData, BarChartData, PieChartData } from "@/lib/api/services/chatService";
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

// ── Chart renderers ──

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

// ── Chart block ──

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
          {chart.chart.chart_type === "line" && renderLineChart(chart.chart as LineChartData, layoutOpts)}
          {chart.chart.chart_type === "bar" && renderBarChart(chart.chart as BarChartData, layoutOpts)}
          {chart.chart.chart_type === "pie" && renderPieChart(chart.chart as PieChartData, layoutOpts)}
        </div>
      </div>
    </div>
  );
};

// ── Source link resolution — mirrors Explore page 4-strategy logic ──

function resolvePaperHref(source: ChatSource): string | null {
  const link = source.link ?? "";
  const scopusId = source.document_scopus_id ?? "";
  const eid = source.document_eid ?? "";
  const isScholarId = (id: string) => id.startsWith("scholar_");

  if (link.includes("scholar.google.com")) return link;
  if (scopusId && !isScholarId(scopusId))
    return `https://www.scopus.com/pages/publications/${scopusId}?origin=resultslist`;
  if (eid && !isScholarId(eid))
    return `https://www.scopus.com/record/display.uri?eid=${encodeURIComponent(eid)}&origin=resultslist`;
  if (link && !/\/api\/documents\//i.test(link)) return link;
  return null;
}

const SourceItem = ({ source }: { source: ChatSource }) => {
  const authors =
    source.authors.slice(0, 2).join(", ") + (source.authors.length > 2 ? " et al." : "");
  const meta = [source.publication_year, authors].filter(Boolean).join(" · ");
  const href = resolvePaperHref(source);

  const inner = (
    <div className="flex items-start gap-2.5 px-3 py-2.5 hover:bg-accent/20 transition-colors group/item">
      <span className="flex-shrink-0 w-5 h-5 rounded-md bg-primary/10 text-primary text-[10px] font-bold flex items-center justify-center mt-0.5">
        {source.index}
      </span>
      <span className="flex-1 min-w-0">
        <span className="block text-[12px] font-medium text-foreground leading-snug line-clamp-2">
          {source.title}
        </span>
        {meta && (
          <span className="block text-[10px] text-muted-foreground truncate mt-0.5">{meta}</span>
        )}
      </span>
      {href && (
        <ExternalLink className="w-3 h-3 text-muted-foreground/40 group-hover/item:text-primary flex-shrink-0 mt-1 transition-colors" />
      )}
    </div>
  );

  return href ? (
    <a href={href} target="_blank" rel="noopener noreferrer" className="block">
      {inner}
    </a>
  ) : (
    <div>{inner}</div>
  );
};

const SourcesBlock = ({ sources }: { sources: ChatSource[] }) => {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-xl border border-border/40 overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-1.5 px-3 py-2 bg-muted/30 hover:bg-muted/50 transition-colors text-left"
      >
        <BookOpen className="w-3 h-3 text-muted-foreground flex-shrink-0" />
        <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex-1">
          {sources.length} Source{sources.length !== 1 ? "s" : ""}
        </span>
        <ChevronDown
          className={`w-3 h-3 text-muted-foreground transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <div className="divide-y divide-border/20 border-t border-border/30">
          {sources.map((s) => (
            <SourceItem key={s.id || s.title} source={s} />
          ))}
        </div>
      )}
    </div>
  );
};

// ── Action button bar ──

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

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard unavailable */
    }
  };

  const handleDownload = () => {
    const container = chartRef.current;
    if (!container) return;
    const svg = container.querySelector("svg");
    if (!svg) return;
    const clone = svg.cloneNode(true) as SVGSVGElement;
    clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    const svgStr = new XMLSerializer().serializeToString(clone);
    const blob = new Blob([svgStr], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "chart.svg";
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
        <button onClick={handleDownload} title="Download chart" className={btnCls}>
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

// ── Main component ──

const ChatMessage = ({ message, onRetry, onEdit, isLast }: ChatMessageProps) => {
  const chartRef = useRef<HTMLDivElement>(null);

  if (message.role === "user") {
    return (
      <div className="group/msg flex flex-col items-end gap-0.5">
        <div className="max-w-[88%] sm:max-w-[82%] px-3.5 sm:px-4 py-2.5 rounded-2xl rounded-br-sm bg-primary text-primary-foreground text-sm leading-relaxed shadow-sm break-words">
          {message.content}
        </div>
        {onEdit && (
          <div className="opacity-0 group-hover/msg:opacity-100 transition-opacity duration-150">
            <button
              onClick={() => onEdit(message.content)}
              title="Edit query"
              className={btnCls}
            >
              <Pencil className="w-3 h-3" />
              <span>Edit</span>
            </button>
          </div>
        )}
      </div>
    );
  }

  // Assistant message
  return (
    <div className="group/msg flex flex-col gap-2 w-full min-w-0 max-w-full">
      {message.content && (
        <div
          className={`w-full min-w-0 max-w-full px-4 py-3 rounded-2xl rounded-bl-sm text-sm leading-relaxed break-words shadow-sm border ${
            message.error
              ? "bg-destructive/6 text-destructive border-destructive/20"
              : "bg-card text-foreground border-border/40"
          }`}
        >
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
              prose-a:text-primary prose-a:no-underline hover:prose-a:underline
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
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content}</ReactMarkdown>
          </div>
        </div>
      )}

      {message.chart && <ChartBlock chart={message.chart} chartRef={chartRef} />}

      {message.sources && message.sources.length > 0 && (
        <SourcesBlock sources={message.sources} />
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
