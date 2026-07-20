import { useCallback, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileBadge2, Hash, ArrowUpRight, Loader2, ChevronDown, ChevronUp, MoreHorizontal } from "lucide-react";
import type { IPDocument, IPSearchPagination } from "@/lib/api/types";
import { IPDocumentModal } from "@/components/exploreIP/IPDocumentModal";
import { searchIP } from "@/lib/api/services/ipSearchService";
import { buildFacultyPatentsQuery, FACULTY_PATENTS_PAGE_SIZE } from "@/lib/api/hooks/useIPSearch";

interface PatentTimelineProps {
    /** First page of results, as returned by `useFacultyPatents`. */
    documents: IPDocument[];
    /** The profile owner's kerberos — used to highlight them among co-inventors and to skip a self-link. */
    kerberos: string;
    /** Drives subsequent "load more" pages with the same title-stripped query `useFacultyPatents` used. */
    facultyName: string;
    pagination: IPSearchPagination | null;
}

const YEAR_PREVIEW_COUNT = 3;

/** publication_year is usually set; fall back to the filing year so nothing silently drops off the timeline. */
const getDocYear = (doc: IPDocument): number | null => {
    if (doc.publication_year) return doc.publication_year;
    if (doc.filing_date) {
        const parsed = new Date(doc.filing_date);
        if (!Number.isNaN(parsed.getTime())) return parsed.getFullYear();
    }
    return null;
};

const PatentTimeline = ({ documents: initialDocuments, kerberos, facultyName, pagination }: PatentTimelineProps) => {
    const [documents, setDocuments] = useState<IPDocument[]>(initialDocuments);
    const [selectedDocument, setSelectedDocument] = useState<IPDocument | null>(null);
    const [currentPage, setCurrentPage] = useState(pagination?.page ?? 1);
    const [loadingMore, setLoadingMore] = useState(false);
    const [expandedYears, setExpandedYears] = useState<Set<number>>(new Set());

    const total = pagination?.total ?? documents.length;
    const hasMore = documents.length < total;

    const handleLoadMore = useCallback(async () => {
        setLoadingMore(true);
        try {
            const nextPage = currentPage + 1;
            const data = await searchIP({
                query: buildFacultyPatentsQuery(facultyName),
                search_in: ["inventor"],
                filters: { kerberos },
                mode: "basic",
                sort: "date",
                page: nextPage,
                per_page: FACULTY_PATENTS_PAGE_SIZE,
            });
            if (data.results.length > 0) {
                setDocuments((prev) => [...prev, ...data.results]);
                setCurrentPage(nextPage);
            }
        } catch {
            // fail-open
        } finally {
            setLoadingMore(false);
        }
    }, [currentPage, facultyName, kerberos]);

    const toggleYear = useCallback((year: number) => {
        setExpandedYears((prev) => {
            const next = new Set(prev);
            if (next.has(year)) next.delete(year);
            else next.add(year);
            return next;
        });
    }, []);

    const { years, undated } = useMemo(() => {
        const byYear = new Map<number, IPDocument[]>();
        const withoutYear: IPDocument[] = [];

        documents.forEach((doc) => {
            const year = getDocYear(doc);
            if (year == null) {
                withoutYear.push(doc);
                return;
            }
            const list = byYear.get(year) ?? [];
            list.push(doc);
            byYear.set(year, list);
        });

        const sortedYears = Array.from(byYear.entries())
            .sort((a, b) => b[0] - a[0])
            .map(([year, docs]) => ({ year, docs }));

        return { years: sortedYears, undated: withoutYear };
    }, [documents]);

    const openFacultyProfile = (targetKerberos: string) => {
        if (!targetKerberos || targetKerberos === kerberos) return;
        window.open(`/faculty/${targetKerberos}`, "_blank", "noopener");
    };

    if (!documents.length) return null;

    return (
        <div className="rounded-2xl border border-border/60 bg-card/80 backdrop-blur shadow-sm overflow-hidden">
            <div className="flex items-center gap-2.5 px-5 py-4 border-b border-border/50 bg-muted/20">
                <div className="w-7 h-7 rounded-lg bg-accent/10 flex items-center justify-center">
                    <FileBadge2 className="w-3.5 h-3.5 text-accent" />
                </div>
                <h2 className="text-sm font-semibold text-foreground tracking-wide">Patent Timeline</h2>
                <span className="text-[10px] text-muted-foreground bg-muted/60 rounded-full px-2 py-0.5 font-medium ml-auto">
                    {total} patent{total !== 1 ? "s" : ""}
                </span>
            </div>
            {/* Same cap as PublicationTimeline's body so the two cards line up when shown side by side. */}
            <div className="p-5 max-h-[640px] overflow-y-auto scrollbar-thin">
                <div className="relative">
                    <div className="absolute left-[7px] top-2 bottom-2 w-0.5 bg-gradient-to-b from-accent/60 via-accent/30 to-transparent rounded-full" />

                    <div className="space-y-6">
                        {years.map(({ year, docs }) => {
                            const isExpanded = expandedYears.has(year);
                            const visibleDocs = isExpanded ? docs : docs.slice(0, YEAR_PREVIEW_COUNT);

                            return (
                                <div key={year} className="relative pl-7">
                                    <div className="absolute left-0 top-1 w-3.5 h-3.5 rounded-full bg-gradient-to-br from-accent to-accent/60 shadow-sm border-2 border-background" />

                                    <div className="flex items-center gap-2 mb-2">
                                        <span className="text-base font-bold text-accent">{year}</span>
                                        <span className="text-[10px] text-muted-foreground bg-muted/60 rounded-full px-2 py-0.5 font-medium">
                                            {docs.length} patent{docs.length !== 1 ? "s" : ""}
                                        </span>
                                    </div>

                                    <div className={isExpanded ? "max-h-[320px] overflow-y-auto pr-1 scrollbar-thin" : ""}>
                                        <div className="space-y-2">
                                            {visibleDocs.map((doc) => (
                                                <PatentItemCard
                                                    key={doc._id}
                                                    doc={doc}
                                                    kerberos={kerberos}
                                                    onSelect={setSelectedDocument}
                                                    onInventorClick={openFacultyProfile}
                                                />
                                            ))}
                                        </div>
                                    </div>

                                    {docs.length > YEAR_PREVIEW_COUNT && (
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="mt-2 text-[11px] text-muted-foreground hover:text-accent h-7 px-2"
                                            onClick={() => toggleYear(year)}
                                        >
                                            {isExpanded ? (
                                                <>
                                                    <ChevronUp className="w-3 h-3 mr-1" />
                                                    Show less
                                                </>
                                            ) : (
                                                <>
                                                    <ChevronDown className="w-3 h-3 mr-1" />
                                                    +{docs.length - YEAR_PREVIEW_COUNT} more in {year}
                                                </>
                                            )}
                                        </Button>
                                    )}
                                </div>
                            );
                        })}

                        {undated.length > 0 && (
                            <div className="relative pl-7">
                                <div className="absolute left-0 top-1 w-3.5 h-3.5 rounded-full bg-muted border-2 border-background" />

                                <div className="flex items-center gap-2 mb-2">
                                    <span className="text-base font-bold text-muted-foreground">Undated</span>
                                    <span className="text-[10px] text-muted-foreground bg-muted/60 rounded-full px-2 py-0.5 font-medium">
                                        {undated.length} patent{undated.length !== 1 ? "s" : ""}
                                    </span>
                                </div>

                                <div className="space-y-2">
                                    {undated.map((doc) => (
                                        <PatentItemCard
                                            key={doc._id}
                                            doc={doc}
                                            kerberos={kerberos}
                                            onSelect={setSelectedDocument}
                                            onInventorClick={openFacultyProfile}
                                        />
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {hasMore && (
                        <div className="relative pl-7 mt-6">
                            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full bg-muted border-2 border-background flex items-center justify-center">
                                <MoreHorizontal className="w-2 h-2 text-muted-foreground" />
                            </div>
                            <Button
                                variant="outline"
                                size="sm"
                                className="text-xs text-muted-foreground hover:text-accent border-dashed"
                                onClick={handleLoadMore}
                                disabled={loadingMore}
                            >
                                {loadingMore ? (
                                    <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                                ) : (
                                    <ChevronDown className="w-3.5 h-3.5 mr-1.5" />
                                )}
                                Load {Math.min(FACULTY_PATENTS_PAGE_SIZE, total - documents.length)} more patent{Math.min(FACULTY_PATENTS_PAGE_SIZE, total - documents.length) !== 1 ? "s" : ""}
                            </Button>
                        </div>
                    )}
                </div>
            </div>

            {selectedDocument && (
                <IPDocumentModal
                    document={selectedDocument}
                    highlightTokens={[]}
                    onClose={() => setSelectedDocument(null)}
                    onInventorClick={(_name, inventorKerberos) => openFacultyProfile(inventorKerberos)}
                />
            )}
        </div>
    );
};

const PatentItemCard = ({
    doc,
    kerberos,
    onSelect,
    onInventorClick,
}: {
    doc: IPDocument;
    kerberos: string;
    onSelect: (doc: IPDocument) => void;
    onInventorClick: (kerberos: string) => void;
}) => (
    <div
        role="button"
        tabIndex={0}
        onClick={() => onSelect(doc)}
        onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onSelect(doc);
            }
        }}
        className="group rounded-xl border border-border/50 bg-background/60 backdrop-blur p-3 hover:border-accent/30 hover:bg-accent/[0.03] transition-all shadow-sm cursor-pointer"
    >
        <div className="flex items-start gap-1">
            <p className="text-sm font-medium text-accent group-hover:underline underline-offset-2 line-clamp-2 leading-snug min-w-0">
                {doc.title}
            </p>
            <ArrowUpRight className="w-3 h-3 mt-0.5 shrink-0 opacity-0 group-hover:opacity-70 transition-opacity" />
        </div>

        {doc.inventors && doc.inventors.length > 0 && (
            <p className="text-[11px] text-muted-foreground mt-1.5 leading-relaxed">
                with{" "}
                {doc.inventors.slice(0, 5).map((inventor, idx) => {
                    const isSelf = !!inventor.kerberos && inventor.kerberos === kerberos;
                    const canNavigate = inventor.is_faculty && !!inventor.kerberos && !isSelf;
                    return (
                        <span key={idx}>
                            {idx > 0 && ", "}
                            {canNavigate ? (
                                <button
                                    type="button"
                                    className="underline underline-offset-2 decoration-accent/50 hover:decoration-accent text-accent/80 hover:text-accent transition-colors cursor-pointer bg-transparent border-0 p-0 text-[11px]"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onInventorClick(inventor.kerberos!);
                                    }}
                                >
                                    {inventor.name}
                                </button>
                            ) : (
                                <span className={isSelf ? "font-semibold text-foreground" : undefined}>
                                    {inventor.name}
                                </span>
                            )}
                        </span>
                    );
                })}
                {doc.inventors.length > 5 && <span> +{doc.inventors.length - 5} more</span>}
            </p>
        )}

        <div className="flex flex-wrap items-center gap-1.5 mt-2">
            <Badge
                variant="secondary"
                className="text-[10px] px-1.5 py-0 font-medium uppercase tracking-wide bg-accent/10 text-accent border border-accent/20 hover:bg-accent/10"
            >
                {doc.type_of_ip}
            </Badge>
            {doc.field_of_invention && (
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-normal border-border/60">
                    {doc.field_of_invention}
                </Badge>
            )}
            <span className="inline-flex items-center gap-0.5 text-[10px] text-muted-foreground/70 font-mono ml-auto">
                <Hash className="w-2.5 h-2.5" />
                {doc.application_number}
            </span>
        </div>
    </div>
);

export default PatentTimeline;
