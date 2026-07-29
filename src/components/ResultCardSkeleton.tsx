import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { FileText, Users } from "lucide-react";

const STAGGER_MS = 60;

/**
 * Mirrors ExplorePaperCard / IPPaperCard chrome (Card/CardHeader/CardTitle/CardContent,
 * badges row, title, meta line, 3-line abstract, footer meta row) using the project's
 * own Skeleton primitive — same building block as TaxonomyNodeGrid's GridSkeleton.
 */
function ResultCardSkeleton({ delayMs }: { delayMs: number }) {
  return (
    <Card
      className="border-border animate-fade-in"
      style={{ animationDelay: `${delayMs}ms`, animationFillMode: "backwards" }}
      aria-hidden="true"
    >
      <CardHeader>
        <div className="flex items-start justify-between mb-2">
          <Skeleton className="h-5 w-16 rounded-full" />
          <Skeleton className="h-5 w-20 rounded-full" />
        </div>
        <CardTitle className="mb-2 leading-snug space-y-2">
          <Skeleton className="h-5 sm:h-6 w-full" />
          <Skeleton className="h-5 sm:h-6 w-2/3" />
        </CardTitle>
        <div className="flex items-center gap-2">
          <Skeleton className="h-3.5 w-16" />
          <Skeleton className="h-3.5 w-32" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2 mb-4">
          <Skeleton className="h-3.5 w-full" />
          <Skeleton className="h-3.5 w-full" />
          <Skeleton className="h-3.5 w-1/2" />
        </div>
        <div className="flex items-center gap-4 pt-4 border-t border-border text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <FileText className="h-4 w-4 opacity-30" />
            <Skeleton className="h-3.5 w-10" />
          </div>
          <div className="flex items-center gap-1">
            <Users className="h-4 w-4 opacity-30" />
            <Skeleton className="h-3.5 w-16" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/** Result-list loading state: cards that mirror the real card chrome, built from the shared Skeleton primitive. */
export function ResultListSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4" aria-busy="true" aria-label="Loading results">
      {Array.from({ length: count }).map((_, i) => (
        <ResultCardSkeleton key={i} delayMs={(i % 4) * STAGGER_MS} />
      ))}
    </div>
  );
}
