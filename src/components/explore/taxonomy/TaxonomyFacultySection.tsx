import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, ChevronLeft, ChevronRight } from "lucide-react";
import FacultyCard from "@/components/directory/FacultyCard";
import TaxonomyFacultyPapersModal from "@/components/explore/taxonomy/TaxonomyFacultyPapersModal";
import TaxonomyExploreDocumentOverlay from "@/components/explore/taxonomy/TaxonomyExploreDocumentOverlay";
import {
    useTaxonomyFaculty,
    useTaxonomyFacultyCards,
    useTaxonomyFacultyPapers,
} from "@/lib/api/hooks/useTaxonomy";
import type { TaxonomyBrowseFilters } from "@/lib/api/services/taxonomyService";
import type { DirectoryFaculty } from "@/lib/api/types";

interface TaxonomyFacultySectionProps {
    filters: TaxonomyBrowseFilters;
    page: number;
    onPageChange: (page: number) => void;
}

const PER_PAGE = 12;
// The larger of the two rollup-side recommended_count ceilings (theme-only:
// 48, domain: 12), so the default view never needs a second round trip.
const INITIAL_PER_PAGE = 48;
const PAPERS_PREVIEW = 2;

type PapersModalState = {
    kerberos: string;
    facultyName: string;
} | null;

const CardsSkeleton = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-border/70 p-6 space-y-4">
                <div className="flex items-start gap-4">
                    <Skeleton className="w-20 h-20 rounded-2xl" />
                    <div className="flex-1 space-y-2 pt-1">
                        <Skeleton className="h-5 w-3/4" />
                        <Skeleton className="h-4 w-1/2" />
                        <Skeleton className="h-3 w-2/3" />
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                    <Skeleton className="h-14 rounded-xl" />
                    <Skeleton className="h-14 rounded-xl" />
                </div>
            </div>
        ))}
    </div>
);

/** Minimal card for a kerberos the directory could not resolve (rare). */
const UnresolvedFacultyCard = ({ kerberos, onClick }: { kerberos: string; onClick: () => void }) => (
    <button
        onClick={onClick}
        className="h-full min-h-[120px] rounded-xl border border-dashed border-border/80 p-6 text-left hover:border-primary/40 transition-colors"
    >
        <p className="font-semibold">{kerberos}</p>
        <p className="text-sm text-muted-foreground mt-1">Profile details unavailable — view profile page</p>
    </button>
);

const TaxonomyFacultyCard = ({
    faculty,
    kerberos,
    filters,
    onClick,
    onShowAllPapers,
    onPaperSelect,
}: {
    faculty: DirectoryFaculty;
    kerberos: string;
    filters: TaxonomyBrowseFilters;
    onClick: () => void;
    onShowAllPapers: () => void;
    onPaperSelect: (paperId: string) => void;
}) => {
    const papersQuery = useTaxonomyFacultyPapers(
        kerberos,
        { theme: filters.theme, domain: filters.domain, subdomain: filters.subdomain },
        1,
        PAPERS_PREVIEW
    );

    return (
        <FacultyCard
            faculty={faculty}
            onClick={onClick}
            areaPapers={papersQuery.data?.results ?? []}
            areaPapersTotal={papersQuery.data?.pagination.total ?? 0}
            areaPapersLoading={papersQuery.isLoading}
            onAreaPapersOverflowClick={onShowAllPapers}
            onAreaPaperClick={(paper) => onPaperSelect(paper.id)}
        />
    );
};

/**
 * Faculty results for the current browse configuration: fetches the kerberos
 * page from the taxonomy API, batch-resolves profiles via the directory API,
 * and renders FacultyCard with area papers. Preview titles and +N list items
 * both open the Explore paper detail modal.
 */
const TaxonomyFacultySection = ({ filters, page, onPageChange }: TaxonomyFacultySectionProps) => {
    const navigate = useNavigate();
    const [papersModal, setPapersModal] = useState<PapersModalState>(null);
    const [selectedPaperId, setSelectedPaperId] = useState<string | null>(null);

    // Recommended view (default): show only the statistically-relevant
    // prefix for this area, no pagination controls. "Show all" flips to the
    // full paginated list. Reset whenever the browse filters change so a
    // narrower/broader area doesn't inherit the previous area's expansion.
    const [showAll, setShowAll] = useState(false);
    useEffect(() => {
        setShowAll(false);
    }, [filters.theme, filters.domain, filters.subdomain, filters.department]);

    const facultyQuery = useTaxonomyFaculty(filters, showAll ? page : 1, showAll ? PER_PAGE : INITIAL_PER_PAGE);
    const recommendedCount = facultyQuery.data?.recommended_count ?? 0;
    const total = facultyQuery.data?.faculty_total ?? 0;
    const kerberosPage = showAll
        ? facultyQuery.data?.kerberos_list ?? []
        : (facultyQuery.data?.kerberos_list ?? []).slice(0, recommendedCount);
    const cardsQuery = useTaxonomyFacultyCards(kerberosPage);

    const pagination = facultyQuery.data?.pagination;
    const isLoading = facultyQuery.isLoading || (kerberosPage.length > 0 && cardsQuery.isLoading);
    const canShowAll = !showAll && total > recommendedCount;

    const openProfile = (kerberos: string) => navigate(`/faculty/${kerberos}`);

    const revealAll = () => {
        setShowAll(true);
        onPageChange(1);
    };

    return (
        <section aria-label="Faculty in this research area">
            <div className="flex items-center justify-between mb-5">
                <h2 className="text-xl font-semibold flex items-center gap-2">
                    <Users className="w-5 h-5 text-accent" />
                    Faculty
                    {!facultyQuery.isLoading && (
                        <span className="text-sm font-normal text-muted-foreground">
                            ({showAll ? total : recommendedCount}{!showAll && canShowAll ? ` of ${total}` : ""})
                        </span>
                    )}
                </h2>
                {showAll && pagination && pagination.total_pages > 1 && (
                    <span className="text-sm text-muted-foreground">
                        Page {pagination.page} of {pagination.total_pages}
                    </span>
                )}
            </div>

            {isLoading ? (
                <CardsSkeleton />
            ) : total === 0 ? (
                <div className="text-center py-16">
                    <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
                        <Users className="w-6 h-6 text-muted-foreground" />
                    </div>
                    <h3 className="font-semibold mb-1">No faculty found</h3>
                    <p className="text-muted-foreground text-sm">
                        No faculty match this combination of filters. Try removing a filter.
                    </p>
                </div>
            ) : (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 animate-fade-in">
                        {kerberosPage.map((kerberos) => {
                            const faculty: DirectoryFaculty | undefined = cardsQuery.data?.[kerberos];
                            return faculty ? (
                                <TaxonomyFacultyCard
                                    key={kerberos}
                                    faculty={faculty}
                                    kerberos={kerberos}
                                    filters={filters}
                                    onClick={() => openProfile(kerberos)}
                                    onShowAllPapers={() =>
                                        setPapersModal({
                                            kerberos,
                                            facultyName: faculty.name,
                                        })
                                    }
                                    onPaperSelect={setSelectedPaperId}
                                />
                            ) : (
                                <UnresolvedFacultyCard
                                    key={kerberos}
                                    kerberos={kerberos}
                                    onClick={() => openProfile(kerberos)}
                                />
                            );
                        })}
                    </div>

                    {canShowAll && (
                        <div className="mt-8 flex justify-center">
                            <Button variant="outline" onClick={revealAll}>
                                Show all {total} experts
                            </Button>
                        </div>
                    )}

                    {showAll && pagination && pagination.total_pages > 1 && (
                        <div className="mt-8 flex items-center justify-center gap-3">
                            <Button
                                variant="outline"
                                size="sm"
                                disabled={page <= 1}
                                onClick={() => onPageChange(page - 1)}
                            >
                                <ChevronLeft className="w-4 h-4 mr-1" />
                                Previous
                            </Button>
                            <span className="px-4 py-1.5 rounded-full bg-muted text-sm font-medium">
                                {pagination.page} / {pagination.total_pages}
                            </span>
                            <Button
                                variant="outline"
                                size="sm"
                                disabled={page >= pagination.total_pages}
                                onClick={() => onPageChange(page + 1)}
                            >
                                Next
                                <ChevronRight className="w-4 h-4 ml-1" />
                            </Button>
                        </div>
                    )}
                </>
            )}

            {papersModal && (
                <TaxonomyFacultyPapersModal
                    open
                    onClose={() => setPapersModal(null)}
                    kerberos={papersModal.kerberos}
                    facultyName={papersModal.facultyName}
                    filters={{
                        theme: filters.theme,
                        domain: filters.domain,
                        subdomain: filters.subdomain,
                    }}
                    onPaperSelect={setSelectedPaperId}
                />
            )}

            <TaxonomyExploreDocumentOverlay
                paperId={selectedPaperId}
                onClose={() => setSelectedPaperId(null)}
            />
        </section>
    );
};

export default TaxonomyFacultySection;
