import type { ReactNode } from "react";
import type { Core } from "cytoscape";
import { AlertCircle, Loader2, Maximize2, ZoomIn, ZoomOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Extra padding when fitting — larger = graph appears smaller on load. */
export const KG_DEFAULT_FIT_PADDING = 110;
/** Scale applied after fit (0.7 = 70% zoom, more overview). */
export const KG_DEFAULT_ZOOM_SCALE = 0.68;

/** Fit graph zoomed out so users see the full structure, then zoom in themselves. */
export function applyDefaultGraphView(cy: Core) {
  if (cy.elements().length === 0) return;
  cy.fit(cy.elements(), KG_DEFAULT_FIT_PADDING);
  cy.zoom(cy.zoom() * KG_DEFAULT_ZOOM_SCALE);
  cy.center(cy.elements());
}

export function KgToolbar({
  title,
  modeToggle,
  search,
}: {
  title: string;
  subtitle?: string;
  modeToggle: ReactNode;
  search: ReactNode;
}) {
  return (
    <section className="shrink-0 border-b border-border bg-card/90 backdrop-blur-sm">
      <div className="px-3 sm:px-4 py-2 flex flex-wrap items-center gap-2 sm:gap-3">
        <h1 className="text-sm sm:text-base font-bold text-foreground mr-auto shrink-0">
          {title}
        </h1>
        {modeToggle}
        <div className="w-full sm:w-64 lg:w-72 order-last sm:order-none">{search}</div>
      </div>
    </section>
  );
}

export function KgSidebar({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <aside
      className={cn(
        "w-full lg:w-72 xl:w-80 shrink-0 bg-card border-border border-r overflow-y-auto p-4 text-sm",
        className,
      )}
    >
      {children}
    </aside>
  );
}

export function KgDetailsPanel({ children }: { children: ReactNode }) {
  return (
    <aside className="hidden xl:block w-72 shrink-0 bg-card border-l border-border overflow-y-auto p-4 text-sm">
      {children}
    </aside>
  );
}

export function KgCanvas({ children }: { children: ReactNode }) {
  return (
    <div className="flex-1 relative min-w-0 min-h-[420px] lg:min-h-0 bg-muted/30">{children}</div>
  );
}

export function KgBanner({
  variant = "info",
  children,
}: {
  variant?: "info" | "error";
  children: ReactNode;
}) {
  const styles =
    variant === "error"
      ? "bg-destructive/10 border-destructive/30 text-destructive"
      : "bg-primary/10 border-primary/30 text-primary";
  const Icon = variant === "error" ? AlertCircle : Loader2;

  return (
    <div
      className={cn(
        "absolute top-3 left-3 right-14 z-10 flex items-center gap-2 px-4 py-2.5 rounded-lg border text-sm shadow-card",
        styles,
      )}
    >
      <Icon className={cn("h-4 w-4 shrink-0", variant === "info" && "animate-spin")} />
      <span>{children}</span>
    </div>
  );
}

export function KgZoomControls({
  onZoomIn,
  onZoomOut,
  onFit,
}: {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFit: () => void;
}) {
  return (
    <div className="absolute top-3 right-3 z-10 flex flex-col gap-2">
      <Button variant="outline" size="icon" className="h-9 w-9 bg-card shadow-card" onClick={onZoomIn} title="Zoom in">
        <ZoomIn className="h-4 w-4" />
      </Button>
      <Button variant="outline" size="icon" className="h-9 w-9 bg-card shadow-card" onClick={onZoomOut} title="Zoom out">
        <ZoomOut className="h-4 w-4" />
      </Button>
      <Button variant="outline" size="icon" className="h-9 w-9 bg-card shadow-card" onClick={onFit} title="Fit graph">
        <Maximize2 className="h-4 w-4" />
      </Button>
    </div>
  );
}

export function KgStat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="text-center">
      <div className="font-bold text-lg text-primary">{value}</div>
      <div className="text-[10px] text-muted-foreground uppercase tracking-wide">{label}</div>
    </div>
  );
}

export function KgInfoRow({ icon, label, value }: { icon: ReactNode; label: string; value: string | number }) {
  return (
    <div className="flex gap-2.5 items-start text-sm">
      <span className="shrink-0 text-muted-foreground mt-0.5">{icon}</span>
      <div>
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="font-semibold text-foreground mt-0.5">{value}</div>
      </div>
    </div>
  );
}

export function KgSectionTitle({ children }: { children: ReactNode }) {
  return <h3 className="font-semibold text-foreground mb-2">{children}</h3>;
}

export function KgDivider() {
  return <div className="border-t border-border my-4" />;
}

export function KgCard({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("rounded-xl border border-border bg-primary/5 p-4 mb-4", className)}>
      {children}
    </div>
  );
}

export function KgLegendItem({
  color,
  icon,
  label,
  desc,
}: {
  color: string;
  icon: ReactNode;
  label: string;
  desc: string;
}) {
  return (
    <div className="flex items-center gap-2.5 mb-2.5">
      <span
        className="w-4 h-4 rounded flex items-center justify-center text-[9px] shrink-0"
        style={{ background: color }}
      >
        {icon}
      </span>
      <div>
        <div className="font-medium text-xs text-foreground">{label}</div>
        <div className="text-[10px] text-muted-foreground">{desc}</div>
      </div>
    </div>
  );
}

export function KgEmptyCanvas({ icon, title, hint }: { icon: ReactNode; title: string; hint?: string }) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-muted-foreground p-6 text-center">
      <div className="text-5xl opacity-40">{icon}</div>
      <p className="font-semibold text-foreground/70">{title}</p>
      {hint && <p className="text-sm">{hint}</p>}
    </div>
  );
}

export function KgSearchDropdown({
  open,
  header,
  empty,
  children,
}: {
  open: boolean;
  header: ReactNode;
  empty?: ReactNode;
  children: ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="absolute top-[calc(100%+6px)] left-0 right-0 z-50 bg-popover border border-border rounded-xl shadow-elegant max-h-80 overflow-y-auto">
      <div className="px-3 py-2 text-xs text-muted-foreground border-b border-border sticky top-0 bg-popover">
        {header}
      </div>
      {empty ?? children}
    </div>
  );
}
