import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { FileText, X } from "lucide-react";
import {
    getTaxonomyFacultyPapers,
    type TaxonomyBrowseFilters,
    type TaxonomyFacultyPaper,
} from "@/lib/api/services/taxonomyService";

const PAGE_SIZE = 100;

type Props = {
    open: boolean;
    onClose: () => void;
    kerberos: string;
    facultyName: string;
    filters: Pick<TaxonomyBrowseFilters, "theme" | "domain" | "subdomain">;
    /** Opens the Explore paper detail card for a listed paper. */
    onPaperSelect: (paperId: string) => void;
};

/**
 * Centered modal listing all papers for one faculty member within the current
 * theme/domain browse context. Paper clicks are handled by the parent.
 */
const TaxonomyFacultyPapersModal = ({
    open,
    onClose,
    kerberos,
    facultyName,
    filters,
    onPaperSelect,
}: Props) => {
    const [papers, setPapers] = useState<TaxonomyFacultyPaper[]>([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [loading, setLoading] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!open) return;

        let cancelled = false;
        setPapers([]);
        setTotal(0);
        setPage(1);
        setError(null);
        setLoading(true);

        getTaxonomyFacultyPapers(kerberos, filters, 1, PAGE_SIZE)
            .then((res) => {
                if (cancelled) return;
                setPapers(res.results);
                setTotal(res.pagination.total);
                setPage(1);
            })
            .catch((err: Error) => {
                if (!cancelled) setError(err.message || "Failed to load papers");
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });

        return () => {
            cancelled = true;
        };
    }, [open, kerberos, filters.theme, filters.domain, filters.subdomain]);

    useEffect(() => {
        if (!open) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [open, onClose]);

    if (!open) return null;

    const hasMore = papers.length < total;

    const loadMore = async () => {
        setLoadingMore(true);
        setError(null);
        try {
            const next = page + 1;
            const res = await getTaxonomyFacultyPapers(kerberos, filters, next, PAGE_SIZE);
            setPapers((prev) => [...prev, ...res.results]);
            setTotal(res.pagination.total);
            setPage(next);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to load more papers");
        } finally {
            setLoadingMore(false);
        }
    };

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
            onClick={onClose}
            role="presentation"
        >
            <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="taxonomy-faculty-papers-title"
                className="bg-background border border-border/50 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-start justify-between gap-3 p-5 border-b border-border/60 shrink-0">
                    <div className="min-w-0">
                        <h2
                            id="taxonomy-faculty-papers-title"
                            className="text-lg font-semibold text-foreground truncate"
                        >
                            Papers by {facultyName}
                        </h2>
                        <p className="text-sm text-muted-foreground mt-0.5">
                            {loading ? "Loading…" : `${total} paper${total === 1 ? "" : "s"} in this area`}
                        </p>
                    </div>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={onClose}
                        className="shrink-0 rounded-full"
                        aria-label="Close"
                    >
                        <X className="h-5 w-5" />
                    </Button>
                </div>

                <div className="overflow-y-auto flex-1 min-h-0 p-4">
                    {loading ? (
                        <div className="space-y-3">
                            {Array.from({ length: 6 }).map((_, i) => (
                                <Skeleton key={i} className="h-14 w-full rounded-xl" />
                            ))}
                        </div>
                    ) : error && papers.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-10">{error}</p>
                    ) : papers.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-10">
                            No papers found in this area.
                        </p>
                    ) : (
                        <ol className="space-y-2">
                            {papers.map((paper, index) => (
                                <li key={paper.id}>
                                    <button
                                        type="button"
                                        onClick={() => onPaperSelect(paper.id)}
                                        className="w-full flex items-start gap-3 rounded-xl border border-border/60 px-3 py-3 text-left hover:border-primary/40 hover:bg-primary/5 transition-colors"
                                    >
                                        <span className="text-xs text-muted-foreground w-6 shrink-0 pt-0.5 tabular-nums">
                                            {index + 1}.
                                        </span>
                                        <FileText className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                                        <div className="min-w-0 flex-1">
                                            <p className="text-sm font-medium text-foreground leading-snug">
                                                {paper.title}
                                            </p>
                                            {(paper.publication_year || paper.citation_count) && (
                                                <p className="text-xs text-muted-foreground mt-1">
                                                    {[
                                                        paper.publication_year,
                                                        paper.citation_count != null
                                                            ? `${paper.citation_count} citations`
                                                            : null,
                                                    ]
                                                        .filter(Boolean)
                                                        .join(" · ")}
                                                </p>
                                            )}
                                        </div>
                                    </button>
                                </li>
                            ))}
                        </ol>
                    )}

                    {error && papers.length > 0 && (
                        <p className="text-xs text-destructive text-center mt-3">{error}</p>
                    )}
                </div>

                {hasMore && !loading && (
                    <div className="p-4 border-t border-border/60 shrink-0 flex justify-center">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={loadMore}
                            disabled={loadingMore}
                        >
                            {loadingMore ? "Loading…" : `Load more (${papers.length} of ${total})`}
                        </Button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default TaxonomyFacultyPapersModal;
