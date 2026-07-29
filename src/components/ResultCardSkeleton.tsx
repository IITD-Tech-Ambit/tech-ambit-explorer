import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const STAGGER_MS = 90;

function FlickerBar({ className, delayMs }: { className?: string; delayMs: number }) {
  return (
    <span
      className={cn("skeleton-flicker-text block", className)}
      style={{ animationDelay: `${delayMs}ms` }}
    />
  );
}

function ResultCardSkeleton({ delayMs }: { delayMs: number }) {
  return (
    <Card className="border-border shadow-sm" aria-hidden="true">
      <CardHeader>
        <div className="flex items-start justify-between mb-2">
          <FlickerBar className="h-5 w-20 rounded-full" delayMs={delayMs} />
          <FlickerBar className="h-5 w-16 rounded-full" delayMs={delayMs} />
        </div>
        <FlickerBar className="h-5 sm:h-6 w-[85%] mb-2" delayMs={delayMs} />
        <FlickerBar className="h-4 w-1/2" delayMs={delayMs} />
      </CardHeader>
      <CardContent>
        <div className="space-y-2 mb-4">
          <FlickerBar className="h-3.5 w-full" delayMs={delayMs} />
          <FlickerBar className="h-3.5 w-full" delayMs={delayMs} />
          <FlickerBar className="h-3.5 w-2/3" delayMs={delayMs} />
        </div>
        <div className="flex items-center gap-4 pt-4 border-t border-border">
          <FlickerBar className="h-3.5 w-16" delayMs={delayMs} />
          <FlickerBar className="h-3.5 w-20" delayMs={delayMs} />
        </div>
      </CardContent>
    </Card>
  );
}

/** Result-list loading state: card-shaped placeholders whose text blurs and flickers in place. */
export function ResultListSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4" aria-busy="true" aria-label="Loading results">
      {Array.from({ length: count }).map((_, i) => (
        <ResultCardSkeleton key={i} delayMs={(i % 2) * STAGGER_MS} />
      ))}
    </div>
  );
}
