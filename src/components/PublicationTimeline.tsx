import { useState, useRef, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, ExternalLink, Loader2, ChevronDown, ChevronUp, MoreHorizontal } from "lucide-react";
import type { TimelineYear, TimelinePaper } from "@/lib/api/types";
import { getFacultyYearPublications, getFacultyResearchSummary } from "@/lib/api/services/directoryService";
import { resolvePaperHref } from "@/lib/paperLink";

interface PublicationTimelineProps {
    timeline: TimelineYear[];
    kerberos: string;
    totalYears: number;
    yearLimit: number;
    onNavigateAuthor?: (authorId: string, matchedProfile: string | null, name: string) => void;
}

const PublicationTimeline = ({ timeline: initialTimeline, kerberos, totalYears, yearLimit, onNavigateAuthor }: PublicationTimelineProps) => {
    const [timeline, setTimeline] = useState<TimelineYear[]>(initialTimeline);
    const [expandedYears, setExpandedYears] = useState<Record<number, TimelinePaper[]>>({});
    const [loadingYears, setLoadingYears] = useState<Record<number, boolean>>({});
    const [loadingMoreYears, setLoadingMoreYears] = useState(false);
    const [loadedYearCount, setLoadedYearCount] = useState(initialTimeline.length);
    const scrollRefs = useRef<Record<number, HTMLDivElement | null>>({});

    const hasMoreYears = loadedYearCount < totalYears;

    const handleLoadMoreYears = useCallback(async () => {
        setLoadingMoreYears(true);
        try {
            const data = await getFacultyResearchSummary(kerberos, loadedYearCount, yearLimit);
            if (data.timeline.length > 0) {
                setTimeline((prev) => [...prev, ...data.timeline]);
                setLoadedYearCount((prev) => prev + data.timeline.length);
            }
        } catch {
            // fail-open
        } finally {
            setLoadingMoreYears(false);
        }
    }, [kerberos, loadedYearCount, yearLimit]);

    const handleExpandYear = useCallback(async (year: number) => {
        if (expandedYears[year]) {
            setExpandedYears((prev) => {
                const next = { ...prev };
                delete next[year];
                return next;
            });
            return;
        }

        setLoadingYears((prev) => ({ ...prev, [year]: true }));
        try {
            const data = await getFacultyYearPublications(kerberos, year, 3, 47);
            setExpandedYears((prev) => ({ ...prev, [year]: data.papers }));
            setTimeout(() => {
                scrollRefs.current[year]?.scrollTo({ top: 0, behavior: "smooth" });
            }, 50);
        } catch {
            // fail silently
        } finally {
            setLoadingYears((prev) => ({ ...prev, [year]: false }));
        }
    }, [kerberos, expandedYears]);

    const getPaperUrl = (paper: TimelinePaper): string | null => resolvePaperHref(paper);

    if (!timeline.length) return null;

    return (
        <div className="rounded-2xl border border-border/60 bg-card/80 backdrop-blur shadow-sm overflow-hidden">
            <div className="flex items-center gap-2.5 px-5 py-4 border-b border-border/50 bg-muted/20">
                <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Calendar className="w-3.5 h-3.5 text-primary" />
                </div>
                <h2 className="text-sm font-semibold text-foreground tracking-wide">Publication Timeline</h2>
                {totalYears > 0 && (
                    <span className="text-[10px] text-muted-foreground bg-muted/60 rounded-full px-2 py-0.5 font-medium ml-auto">
                        {totalYears} year{totalYears !== 1 ? "s" : ""}
                    </span>
                )}
            </div>
            <div className="p-5">
                <div className="relative">
                    <div className="absolute left-[7px] top-2 bottom-2 w-0.5 bg-gradient-to-b from-primary/60 via-primary/30 to-transparent rounded-full" />

                    <div className="space-y-6">
                        {timeline.map((yearData) => {
                            const isExpanded = !!expandedYears[yearData.year];
                            const isLoading = !!loadingYears[yearData.year];
                            const extraPapers = expandedYears[yearData.year] || [];
                            const allPapers = isExpanded
                                ? [...yearData.papers, ...extraPapers]
                                : yearData.papers;

                            return (
                                <div key={yearData.year} className="relative pl-7">
                                    <div className="absolute left-0 top-1 w-3.5 h-3.5 rounded-full bg-gradient-to-br from-primary to-accent shadow-sm border-2 border-background" />

                                    <div className="flex items-center gap-2 mb-2">
                                        <span className="text-base font-bold text-primary">{yearData.year}</span>
                                        <span className="text-[10px] text-muted-foreground bg-muted/60 rounded-full px-2 py-0.5 font-medium">
                                            {yearData.count} publication{yearData.count !== 1 ? "s" : ""}
                                        </span>
                                    </div>

                                    <div
                                        ref={(el) => { scrollRefs.current[yearData.year] = el; }}
                                        className={isExpanded ? "max-h-[320px] overflow-y-auto pr-1 scrollbar-thin" : ""}
                                    >
                                        <div className="space-y-2">
                                            {allPapers.map((paper, idx) => {
                                                const paperUrl = getPaperUrl(paper);
                                                return (
                                                    <div
                                                        key={`${yearData.year}-${idx}`}
                                                        className="rounded-xl border border-border/50 bg-background/60 backdrop-blur p-3 hover:border-primary/30 hover:bg-primary/[0.02] transition-all shadow-sm"
                                                    >
                                                        {paperUrl ? (
                                                            <a
                                                                href={paperUrl}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="text-sm font-medium text-primary hover:underline underline-offset-2 line-clamp-2 leading-snug flex items-start gap-1 group"
                                                            >
                                                                {paper.title}
                                                                <ExternalLink className="w-3 h-3 mt-0.5 shrink-0 opacity-0 group-hover:opacity-70 transition-opacity" />
                                                            </a>
                                                        ) : (
                                                            <p className="text-sm font-medium text-foreground/90 line-clamp-2 leading-snug">
                                                                {paper.title}
                                                            </p>
                                                        )}
                                                        <div className="flex flex-wrap items-center gap-x-1 gap-y-1 mt-1.5">
                                                            {paper.authors.length > 0 && (
                                                                <span className="text-[11px] text-muted-foreground">
                                                                    with{" "}
                                                                    {paper.authors.slice(0, 5).map((author, aIdx) => {
                                                                        const canNavigate = !!(author.matched_profile || author.author_id);
                                                                        return (
                                                                            <span key={aIdx}>
                                                                                {aIdx > 0 && ", "}
                                                                                {canNavigate && onNavigateAuthor ? (
                                                                                    <button
                                                                                        type="button"
                                                                                        className="underline underline-offset-2 decoration-primary/50 hover:decoration-primary text-primary/80 hover:text-primary transition-colors cursor-pointer bg-transparent border-0 p-0 text-[11px]"
                                                                                        onClick={() => onNavigateAuthor(author.author_id, author.matched_profile, author.name)}
                                                                                    >
                                                                                        {author.name}
                                                                                    </button>
                                                                                ) : (
                                                                                    <span>{author.name}</span>
                                                                                )}
                                                                            </span>
                                                                        );
                                                                    })}
                                                                    {paper.authors.length > 5 && (
                                                                        <span> +{paper.authors.length - 5} more</span>
                                                                    )}
                                                                </span>
                                                            )}
                                                            {paper.citations > 0 && (
                                                                <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-normal border-border/60">
                                                                    {paper.citations} cited
                                                                </Badge>
                                                            )}
                                                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-normal border-border/60">
                                                                {paper.type}
                                                            </Badge>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {yearData.count > 3 && !isExpanded && (
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="mt-2 text-[11px] text-muted-foreground hover:text-primary h-7 px-2"
                                            onClick={() => handleExpandYear(yearData.year)}
                                            disabled={isLoading}
                                        >
                                            {isLoading ? (
                                                <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                                            ) : (
                                                <ChevronDown className="w-3 h-3 mr-1" />
                                            )}
                                            +{yearData.count - 3} more in {yearData.year}
                                        </Button>
                                    )}

                                    {isExpanded && (
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="mt-2 text-[11px] text-muted-foreground hover:text-primary h-7 px-2"
                                            onClick={() => {
                                                setExpandedYears((prev) => {
                                                    const next = { ...prev };
                                                    delete next[yearData.year];
                                                    return next;
                                                });
                                            }}
                                        >
                                            <ChevronUp className="w-3 h-3 mr-1" />
                                            Show less
                                        </Button>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    {hasMoreYears && (
                        <div className="relative pl-7 mt-6">
                            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full bg-muted border-2 border-background flex items-center justify-center">
                                <MoreHorizontal className="w-2 h-2 text-muted-foreground" />
                            </div>
                            <Button
                                variant="outline"
                                size="sm"
                                className="text-xs text-muted-foreground hover:text-primary border-dashed"
                                onClick={handleLoadMoreYears}
                                disabled={loadingMoreYears}
                            >
                                {loadingMoreYears ? (
                                    <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                                ) : (
                                    <ChevronDown className="w-3.5 h-3.5 mr-1.5" />
                                )}
                                Load {Math.min(yearLimit, totalYears - loadedYearCount)} older year{Math.min(yearLimit, totalYears - loadedYearCount) !== 1 ? "s" : ""}
                            </Button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default PublicationTimeline;
