import type { SearchAuthor } from "@/lib/api/types";
import { getExploreCardAuthorEntries } from "@/components/explore/exploreAuthorUtils";

export function ExploreCardAuthorsLine({
  authors,
  selectedAuthor,
  onAuthorClick,
}: {
  authors: SearchAuthor[] | undefined;
  selectedAuthor: { name: string; author_id: string } | null;
  onAuthorClick: (scopusAuthorId: string, name: string) => void;
}) {
  const entries = getExploreCardAuthorEntries(authors, selectedAuthor);
  if (entries.length === 0) return null;
  const shown = entries.slice(0, 3);
  const more = entries.length - shown.length;
  return (
    <div
      className="text-sm text-muted-foreground"
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
      role="presentation"
    >
      <span className="font-semibold text-primary/80 mr-1">Authors:</span>
      {shown.map((entry, i) => (
        <span key={`${entry.author_id}-${i}`}>
          {i > 0 && ", "}
          <button
            type="button"
            className={`inline p-0 bg-transparent border-0 cursor-pointer text-left underline underline-offset-2 decoration-primary/60 hover:decoration-primary transition-colors ${
              selectedAuthor && i === 0 ? "font-semibold text-primary" : "text-primary/80 hover:text-primary"
            }`}
            onClick={() => onAuthorClick(entry.author_id, entry.name)}
          >
            {entry.name}
          </button>
        </span>
      ))}
      {more > 0 && <span className="text-muted-foreground"> +{more} more</span>}
    </div>
  );
}
