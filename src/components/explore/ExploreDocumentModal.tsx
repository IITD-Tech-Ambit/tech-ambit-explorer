import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, X } from "lucide-react";
import type { SearchDocument } from "@/lib/api";
import { formatAbstract, highlightTerms } from "@/lib/utils";
import { getPaperExternalUrl } from "@/lib/paperLink";
import { getExploreModalAuthorRows } from "@/components/explore/exploreAuthorUtils";

type Props = {
  document: SearchDocument;
  selectedAuthor: { name: string; author_id: string } | null;
  highlightTokens: string[];
  onClose: () => void;
  onAuthorClick: (scopusAuthorId: string, name: string) => void;
};

export function ExploreDocumentModal({
  document: selectedDocument,
  selectedAuthor,
  highlightTokens,
  onClose,
  onAuthorClick,
}: Props) {
  const paperLink = getPaperExternalUrl(selectedDocument);
  const authorRows = getExploreModalAuthorRows(selectedDocument.authors, selectedAuthor);

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-background border border-border/50 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative flex items-start justify-between p-6 border-b border-white/10 overflow-hidden bg-gradient-to-br from-indigo-500/10 via-background to-primary/5 shrink-0">
          <div className="absolute inset-0 bg-grid-white/10 [mask-image:linear-gradient(0deg,transparent,black)] pointer-events-none" />
          <div className="relative flex-1 pr-4">
            <div className="flex flex-wrap gap-2 mb-3">
              <Badge
                variant="secondary"
                className="px-3 py-0.5 font-bold rounded-full uppercase tracking-wider text-[10px] bg-secondary/80 text-secondary-foreground"
              >
                {selectedDocument.document_type}
              </Badge>
              {selectedDocument.field_associated && (
                <Badge
                  variant="outline"
                  className="px-3 py-0.5 bg-background/50 backdrop-blur-sm rounded-full uppercase tracking-wider text-[10px] text-muted-foreground border-border/50"
                >
                  {selectedDocument.field_associated}
                </Badge>
              )}
            </div>
            <h2 className="text-lg sm:text-2xl font-bold text-foreground leading-tight">
              {highlightTerms(selectedDocument.title, highlightTokens)}
            </h2>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="relative shrink-0 rounded-full hover:bg-background/80"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="overflow-y-auto flex-1 min-h-0 p-6 space-y-7">
          {authorRows && authorRows.length > 0 && (
            <div onClick={(e) => e.stopPropagation()} className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Author(s)
              </h3>
              <div className="flex flex-wrap gap-3">
                {authorRows.map((row, idx) => (
                  <button
                    key={`${row.author_id}-${idx}`}
                    type="button"
                    onClick={() => onAuthorClick(row.author_id, row.name)}
                    className={`rounded-xl px-4 py-2 border text-left transition-smooth hover:-translate-y-0.5 hover:shadow-md ${
                      row.highlight
                        ? "bg-primary/5 border-primary/30 ring-1 ring-primary/20 shadow-sm"
                        : "bg-card border-border shadow-sm hover:border-primary/30"
                    }`}
                  >
                    <div
                      className={`text-sm leading-tight ${
                        row.highlight ? "font-bold text-foreground" : "font-semibold text-foreground/90"
                      }`}
                    >
                      {row.name}
                    </div>
                    {row.affiliation && (
                      <div className="text-[10px] font-medium text-muted-foreground mt-1 tracking-wide uppercase line-clamp-1">
                        {row.affiliation}
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {selectedDocument.abstract && (
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Abstract</h3>
              <div className="p-5 rounded-xl bg-muted/30 border border-border/50 leading-relaxed text-foreground/80 text-sm shadow-inner">
                {highlightTerms(formatAbstract(selectedDocument.abstract), highlightTokens)}
              </div>
            </div>
          )}

          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Publication Details
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="flex flex-col p-4 rounded-xl bg-blue-500/5 border border-blue-500/10">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                  Publication Year
                </div>
                <div className="text-xl font-bold text-foreground leading-tight">
                  {selectedDocument.publication_year || "N/A"}
                </div>
              </div>
              <div className="flex flex-col p-4 rounded-xl bg-orange-500/5 border border-orange-500/10">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                  Citations
                </div>
                <div className="text-xl font-bold text-foreground leading-tight">
                  {selectedDocument.citation_count || 0}
                </div>
              </div>
              <div className="flex flex-col p-4 rounded-xl bg-green-500/5 border border-green-500/10">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                  Document Type
                </div>
                <div className="text-sm font-bold text-foreground leading-tight mt-1 line-clamp-1">
                  {selectedDocument.document_type}
                </div>
              </div>
              {selectedDocument.field_associated && (
                <div className="flex flex-col p-4 rounded-xl bg-purple-500/5 border border-purple-500/10">
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                    Field
                  </div>
                  <div className="text-sm font-bold text-foreground leading-tight mt-1 line-clamp-2">
                    {selectedDocument.field_associated}
                  </div>
                </div>
              )}
            </div>
          </div>

          {selectedDocument.subject_area && selectedDocument.subject_area.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Subject Areas
              </h3>
              <div className="flex flex-wrap gap-2">
                {selectedDocument.subject_area.map((area, idx) => (
                  <Badge
                    key={idx}
                    variant="secondary"
                    className="px-3 py-1 font-medium bg-secondary/50 hover:bg-secondary border border-border/50 transition-colors"
                  >
                    {area}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-col-reverse sm:flex-row items-center justify-between gap-3 p-5 border-t border-border bg-background/80 backdrop-blur-md shrink-0">
          <Button variant="outline" onClick={onClose} className="w-full sm:w-auto font-semibold">
            Close
          </Button>
          <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
            {paperLink && (
              <a
                href={paperLink.href}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-primary/10 text-primary hover:bg-primary/20 text-sm font-bold rounded-lg transition-all border border-primary/20"
              >
                <ExternalLink className="h-4 w-4" />
                {paperLink.label}
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
