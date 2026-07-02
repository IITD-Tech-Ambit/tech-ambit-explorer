import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, ChevronLeft, ChevronRight } from "lucide-react";
import FacultyCard from "@/components/directory/FacultyCard";
import { useTaxonomyFaculty, useTaxonomyFacultyCards } from "@/lib/api/hooks/useTaxonomy";
import type { TaxonomyBrowseFilters } from "@/lib/api/services/taxonomyService";
import type { DirectoryFaculty } from "@/lib/api/types";

interface TaxonomyFacultySectionProps {
    filters: TaxonomyBrowseFilters;
    page: number;
    onPageChange: (page: number) => void;
}

const PER_PAGE = 12;

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

/**
 * Faculty results for the current browse configuration: fetches the kerberos
 * page from the taxonomy API, batch-resolves profiles via the directory API,
 * and renders the same FacultyCard used across the portal. Card click goes to
 * /faculty/:kerberos, exactly like the Directory section.
 */
const TaxonomyFacultySection = ({ filters, page, onPageChange }: TaxonomyFacultySectionProps) => {
    const navigate = useNavigate();

    const facultyQuery = useTaxonomyFaculty(filters, page, PER_PAGE);
    const kerberosPage = facultyQuery.data?.kerberos_list ?? [];
    const cardsQuery = useTaxonomyFacultyCards(kerberosPage);

    const pagination = facultyQuery.data?.pagination;
    const total = facultyQuery.data?.faculty_total ?? 0;
    const isLoading = facultyQuery.isLoading || (kerberosPage.length > 0 && cardsQuery.isLoading);

    const openProfile = (kerberos: string) => navigate(`/faculty/${kerberos}`);

    return (
        <section aria-label="Faculty in this research area">
            <div className="flex items-center justify-between mb-5">
                <h2 className="text-xl font-semibold flex items-center gap-2">
                    <Users className="w-5 h-5 text-accent" />
                    Faculty
                    {!facultyQuery.isLoading && (
                        <span className="text-sm font-normal text-muted-foreground">({total})</span>
                    )}
                </h2>
                {pagination && pagination.total_pages > 1 && (
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
                                <FacultyCard
                                    key={kerberos}
                                    faculty={faculty}
                                    onClick={() => openProfile(kerberos)}
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

                    {pagination && pagination.total_pages > 1 && (
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
        </section>
    );
};

export default TaxonomyFacultySection;
