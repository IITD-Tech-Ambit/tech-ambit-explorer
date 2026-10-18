import type { ReactNode } from "react";
import {
  AlertTriangle, CloudOff, Hourglass, Lock, RotateCw, SearchX, ServerCrash, WifiOff, type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { describeError, type ErrorKind } from "@/lib/errors";

const KIND_ICON: Record<ErrorKind, LucideIcon> = {
  offline: WifiOff,
  unreachable: CloudOff,
  timeout: Hourglass,
  server: ServerCrash,
  notFound: SearchX,
  forbidden: Lock,
  unknown: AlertTriangle,
};

const KIND_GLOW: Record<ErrorKind, string> = {
  offline: "bg-sky-500/25",
  unreachable: "bg-sky-500/25",
  timeout: "bg-amber-500/25",
  server: "bg-amber-500/25",
  notFound: "bg-primary/20",
  forbidden: "bg-violet-500/25",
  unknown: "bg-rose-500/25",
};

const KIND_ICON_COLOR: Record<ErrorKind, string> = {
  offline: "text-sky-500",
  unreachable: "text-sky-500",
  timeout: "text-amber-500",
  server: "text-amber-500",
  notFound: "text-primary",
  forbidden: "text-violet-500",
  unknown: "text-rose-500",
};

export interface ErrorStateProps {
  error?: unknown;
  kind?: ErrorKind;
  title?: string;
  message?: ReactNode;
  icon?: LucideIcon;
  onRetry?: () => void;
  retrying?: boolean;
  retryLabel?: string;
  children?: ReactNode;
  size?: "page" | "section" | "compact";
  /** "dark" keeps the palette fixed for always-dark surfaces such as IITD Verse. */
  tone?: "default" | "dark";
  className?: string;
}

export function ErrorState({
  error,
  kind: kindProp,
  title,
  message,
  icon,
  onRetry,
  retrying = false,
  retryLabel = "Try again",
  children,
  size = "section",
  tone = "default",
  className,
}: ErrorStateProps) {
  const friendly = describeError(error);
  const kind = kindProp ?? friendly.kind;
  const Icon = icon ?? KIND_ICON[kind];
  const dark = tone === "dark";
  const showRetry = onRetry && (kindProp ? true : friendly.retryable);

  if (size === "compact") {
    return (
      <div
        role="alert"
        className={cn(
          "flex items-start gap-3 rounded-xl border p-3 text-left",
          dark ? "border-slate-700/70 bg-slate-900/70" : "border-border/60 bg-muted/40",
          className,
        )}
      >
        <Icon className={cn("mt-0.5 h-4 w-4 shrink-0", KIND_ICON_COLOR[kind])} aria-hidden />
        <div className="min-w-0 flex-1">
          <p className={cn("text-sm font-medium", dark ? "text-slate-100" : "text-foreground")}>
            {title ?? friendly.title}
          </p>
          <p className={cn("mt-0.5 text-xs", dark ? "text-slate-400" : "text-muted-foreground")}>
            {message ?? friendly.message}
          </p>
          {showRetry && (
            <button
              type="button"
              onClick={onRetry}
              disabled={retrying}
              className={cn(
                "mt-2 inline-flex items-center gap-1.5 text-xs font-medium transition-colors disabled:opacity-60",
                dark ? "text-sky-300 hover:text-sky-200" : "text-primary hover:text-primary/80",
              )}
            >
              <RotateCw className={cn("h-3 w-3", retrying && "animate-spin")} aria-hidden />
              {retrying ? "Retrying…" : retryLabel}
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      role="alert"
      className={cn(
        "flex flex-col items-center justify-center px-4 text-center animate-in fade-in-0 zoom-in-95 duration-300",
        size === "page" ? "min-h-[60vh] py-16" : "pt-10 pb-8 sm:pt-16 sm:pb-12",
        className,
      )}
    >
      <div className="relative mb-5">
        <div className={cn("absolute -inset-3 rounded-3xl blur-2xl", KIND_GLOW[kind])} aria-hidden />
        <div
          className={cn(
            "relative flex h-14 w-14 items-center justify-center rounded-2xl border shadow-sm",
            dark
              ? "border-slate-700/80 bg-gradient-to-b from-slate-800 to-slate-900"
              : "border-border/50 bg-gradient-to-b from-card to-muted/60",
          )}
        >
          <Icon className={cn("h-7 w-7", KIND_ICON_COLOR[kind])} aria-hidden />
        </div>
      </div>
      <h3 className={cn("mb-1.5 text-lg font-semibold", dark ? "text-white" : "text-foreground")}>
        {title ?? friendly.title}
      </h3>
      <p className={cn("max-w-sm text-sm leading-relaxed", dark ? "text-slate-400" : "text-muted-foreground")}>
        {message ?? friendly.message}
      </p>
      {(showRetry || children) && (
        <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
          {showRetry && (
            <Button
              type="button"
              size="sm"
              onClick={onRetry}
              disabled={retrying}
              className={cn(
                "gap-1.5 rounded-full px-4",
                dark && "bg-white text-slate-900 hover:bg-white/90",
              )}
            >
              <RotateCw className={cn("h-3.5 w-3.5", retrying && "animate-spin")} aria-hidden />
              {retrying ? "Retrying…" : retryLabel}
            </Button>
          )}
          {children}
        </div>
      )}
    </div>
  );
}
