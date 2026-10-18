import { Component, type ErrorInfo, type ReactNode } from "react";
import { Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/ErrorState";
import instituteSeal from "@/assets/logo2-transparent.png";

interface ErrorBoundaryProps {
  children: ReactNode;
  /** Replaces the full-page fallback; pass `null` to fail silently (e.g. floating widgets). */
  fallback?: ReactNode;
  /** Changing this clears a caught error, e.g. the current route. */
  resetKey?: string;
}

interface ErrorBoundaryState {
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[ErrorBoundary]", error, info.componentStack);
  }

  componentDidUpdate(prev: ErrorBoundaryProps) {
    if (this.state.error && prev.resetKey !== this.props.resetKey) {
      this.setState({ error: null });
    }
  }

  private reset = () => this.setState({ error: null });

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;
    if (this.props.fallback !== undefined) return this.props.fallback;
    return <PageCrashFallback error={error} onReset={this.reset} />;
  }
}

function PageCrashFallback({ error, onReset }: { error: Error; onReset: () => void }) {
  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-gradient-to-b from-background to-muted/40">
      <div
        className="pointer-events-none absolute left-1/2 top-1/3 h-[420px] w-[420px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/10 blur-3xl"
        aria-hidden
      />
      <header className="relative z-10 container mx-auto flex items-center gap-3 px-4 py-5">
        <a href="/" className="flex items-center gap-3">
          <img src={instituteSeal} alt="" className="h-10 w-10 object-contain" />
          <span className="text-lg font-semibold text-primary">Research Ambit</span>
        </a>
      </header>
      <main className="relative z-10 flex flex-1 items-center justify-center px-4 pb-16">
        <div className="w-full max-w-md rounded-3xl border border-border/60 bg-card/70 px-6 py-2 shadow-xl backdrop-blur-sm">
          <ErrorState
            kind="unknown"
            title="This page hit a snag"
            message="Something unexpected broke while loading this page. Try again, or head back to the home page."
            onRetry={onReset}
            className="pt-8 pb-8 sm:pt-10 sm:pb-10"
          >
            <Button asChild variant="outline" size="sm" className="gap-1.5 rounded-full px-4">
              <a href="/">
                <Home className="h-3.5 w-3.5" aria-hidden />
                Go to home
              </a>
            </Button>
          </ErrorState>
          {import.meta.env.DEV && (
            <details className="mb-6 rounded-lg border border-border/60 bg-muted/40 p-3 text-left text-xs">
              <summary className="cursor-pointer font-medium text-muted-foreground">Error details</summary>
              <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap break-words text-destructive">
                {error.message}
              </pre>
            </details>
          )}
        </div>
      </main>
    </div>
  );
}
