import { useEffect, useId } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Calendar, ExternalLink, Quote, X } from "lucide-react";
import { useSearchDocument, type SearchDocument } from "@/lib/api";
import { renderHighlightedText, renderHighlightedAbstract } from "@/lib/utils";
import { getPaperExternalUrl } from "@/lib/paperLink";
import {
  formatIssn,
  getPageRange,
  getSourceAbbreviation,
  getSourceLocator,
  getSourceTitle,
  getSourceTypeLabel,
} from "@/lib/paperSource";
import { getExploreModalAuthorRows } from "@/components/explore/exploreAuthorUtils";

const NO_ABSTRACT = "(No abstract available)";

type Props = {
  document: SearchDocument;
  selectedAuthor: { name: string; author_id: string } | null;
  onClose: () => void;
  onAuthorClick: (scopusAuthorId: string, name: string) => void;
  /** Extra classes for the full-screen overlay (e.g. higher z-index when stacked). */
  overlayClassName?: string;
};

export function ExploreDocumentModal({
  document: selectedDocument,
  selectedAuthor,
  onClose,
  onAuthorClick,
  overlayClassName,
}: Props) {
  const titleId = useId();
  const paperLink = getPaperExternalUrl(selectedDocument);
  const authorRows = getExploreModalAuthorRows(selectedDocument.authors, selectedAuthor);
  const { data: fullDocument } = useSearchDocument(selectedDocument._id, { enabled: !selectedDocument.source });
  const source = selectedDocument.source ?? fullDocument?.source;
  const relationship = selectedDocument.source_relationship ?? fullDocument?.source_relationship;

  const sourceTitle = getSourceTitle(source);
  const sourceAbbreviation = getSourceAbbreviation(source);
  const locator = getSourceLocator(relationship);
  const pages = getPageRange(relationship);
  const abstract = selectedDocument.highlight?.abstract ?? selectedDocument.abstract;
  const hasAbstract = !!abstract?.trim() && abstract.trim() !== NO_ABSTRACT;

  const details = [
    { label: "Published in", value: sourceTitle, note: sourceAbbreviation },
    { label: "Source type", value: getSourceTypeLabel(source) },
    { label: "Publisher", value: source?.publisher?.trim() },
    { label: "Volume", value: relationship?.volume?.trim() },
    { label: "Issue", value: relationship?.issue?.trim() },
    { label: "Pages", value: pages },
    { label: "Article number", value: relationship?.articleNumber?.trim() },
    { label: "ISSN", value: formatIssn(source?.issn) },
    { label: "ISBN", value: source?.isbn?.trim() },
  ].filter((d) => d.value);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  return (
    <div
      className={`fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 ${overlayClassName ?? ""}`}
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="bg-background border border-border/50 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative flex items-start justify-between p-6 border-b border-border/60 bg-gradient-to-br from-primary/10 via-background to-primary/5 shrink-0">
          <div className="flex-1 min-w-0 pr-4">
            <div className="flex flex-wrap gap-2 mb-3">
              <Badge
                variant="secondary"
                className="px-3 py-0.5 font-bold rounded-full uppercase tracking-wider text-[10px]"
              >
                {selectedDocument.document_type}
              </Badge>
              {selectedDocument.field_associated && (
                <Badge
                  variant="outline"
                  className="px-3 py-0.5 bg-background/50 rounded-full uppercase tracking-wider text-[10px] text-muted-foreground border-border/50"
                >
                  {selectedDocument.field_associated}
                </Badge>
              )}
            </div>
            <h2 id={titleId} className="text-lg sm:text-2xl font-bold text-foreground leading-tight">
              {renderHighlightedText(selectedDocument.highlight?.title ?? selectedDocument.title)}
            </h2>

            {sourceTitle && (
              <p className="flex items-start gap-2 mt-3 text-sm text-foreground/80">
                <BookOpen className="h-4 w-4 mt-0.5 shrink-0 text-primary" />
                <span>
                  <span className="font-semibold italic text-foreground">{sourceTitle}</span>
                  {locator && <span className="text-muted-foreground">, {locator}</span>}
                </span>
              </p>
            )}

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-sm text-muted-foreground">
              {selectedDocument.publication_year ? (
                <span className="inline-flex items-center gap-1.5">
                  <Calendar className="h-4 w-4" />
                  {selectedDocument.publication_year}
                </span>
              ) : null}
              <span className="inline-flex items-center gap-1.5">
                <Quote className="h-4 w-4" />
                <span className="font-semibold text-foreground">{selectedDocument.citation_count || 0}</span>
                citation{selectedDocument.citation_count === 1 ? "" : "s"}
              </span>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            aria-label="Close"
            className="shrink-0 rounded-full hover:bg-background/80"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="overflow-y-auto flex-1 min-h-0 p-6 space-y-7">
          {authorRows && authorRows.length > 0 && (
            <section className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Corresponding Author(s)
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
            </section>
          )}

          <section className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Abstract</h3>
            {hasAbstract ? (
              <div className="p-5 rounded-xl bg-muted/30 border border-border/50 leading-relaxed text-foreground/80 text-sm">
                {renderHighlightedAbstract(abstract!)}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground italic">No abstract is available for this paper.</p>
            )}
          </section>

          {details.length > 0 && (
            <section className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Publication Details
              </h3>
              <div className="rounded-xl border border-border overflow-hidden">
                <dl className="grid grid-cols-1 sm:grid-cols-2 -mb-px">
                  {details.map((d) => (
                    <div
                      key={d.label}
                      className={`flex flex-col gap-0.5 px-4 py-3 border-b border-border/60 ${
                        d.label === "Published in" ? "sm:col-span-2 bg-muted/20" : ""
                      }`}
                    >
                      <dt className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{d.label}</dt>
                      <dd className="text-sm font-medium text-foreground break-words">
                        {d.value}
                        {d.note && <span className="ml-1.5 text-muted-foreground font-normal">({d.note})</span>}
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>
            </section>
          )}

          {selectedDocument.subject_area && selectedDocument.subject_area.length > 0 && (
            <section className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Subject Areas
              </h3>
              <div className="flex flex-wrap gap-2">
                {selectedDocument.subject_area.map((area, idx) => (
                  <Badge
                    key={idx}
                    variant="secondary"
                    className="px-3 py-1 font-medium bg-secondary/50 border border-border/50"
                  >
                    {area}
                  </Badge>
                ))}
              </div>
            </section>
          )}
        </div>

        {paperLink && (
          <div className="flex justify-end p-4 border-t border-border bg-background/80 shrink-0">
            <a
              href={paperLink.href}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground hover:bg-primary/90 text-sm font-semibold rounded-lg transition-colors"
            >
              <ExternalLink className="h-4 w-4" />
              {paperLink.label}
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
