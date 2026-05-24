import { useParams, useNavigate, useLocation } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    User, Mail, BookOpen, Users, GraduationCap, Calendar,
    Award, ExternalLink, Building2, ArrowLeft, Loader2,
    FileText, TrendingUp,
} from "lucide-react";
import type { ElementType } from "react";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { useFacultyById, useFacultyCoworking } from "@/lib/api/hooks/useDirectory";
import { useDirectorySearch } from "@/lib/api/hooks/useDirectory";

type DeduplicatedPaper = {
    title: string;
    publication_year: number;
    document_type: string;
    coauthorNames: string[];
};

const FacultyProfile = () => {
    const { slug } = useParams<{ slug: string }>();
    const navigate = useNavigate();
    const location = useLocation();

    // ID passed via router state (normal click from Directory)
    const stateId: string | undefined = (location.state as { facultyId?: string } | null)?.facultyId;

    // Fallback: search by name when someone opens the URL directly (bookmark / share)
    const nameQuery = slug?.replace(/-/g, " ") ?? "";
    const { data: searchData, isLoading: isSearchLoading } = useDirectorySearch(nameQuery, 1, {
        enabled: !stateId && nameQuery.length >= 2,
    });

    const resolvedId = stateId || searchData?.faculties?.[0]?._id || "";

    const { data: faculty, isLoading: isFacultyLoading, isError: isFacultyError } = useFacultyById(resolvedId, {
        enabled: !!resolvedId,
    });
    const { data: coworkingData, isLoading: isCoworkingLoading } = useFacultyCoworking(resolvedId, {
        enabled: !!resolvedId,
    });

    const isLoading = (!stateId && isSearchLoading) || (!!resolvedId && isFacultyLoading);

    if (isLoading) {
        return (
            <div className="min-h-screen page-bg">
                <Navigation />
                <div className="flex flex-col items-center justify-center min-h-[70vh] gap-4">
                    <div className="relative">
                        <div className="w-16 h-16 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
                        <div className="absolute inset-0 w-16 h-16 rounded-full border-4 border-transparent border-b-accent/40 animate-spin" style={{ animationDuration: "1.5s", animationDirection: "reverse" }} />
                    </div>
                    <p className="text-sm text-muted-foreground animate-pulse">Loading faculty profile…</p>
                </div>
                <Footer />
            </div>
        );
    }

    if (isFacultyError || !faculty) {
        return (
            <div className="min-h-screen page-bg">
                <Navigation />
                <div className="flex flex-col items-center justify-center min-h-[70vh] gap-4">
                    <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center">
                        <User className="w-9 h-9 text-muted-foreground/50" />
                    </div>
                    <p className="text-muted-foreground text-lg font-medium">Faculty profile not found</p>
                    <Button variant="outline" onClick={() => navigate("/directory")}>
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Back to Directory
                    </Button>
                </div>
                <Footer />
            </div>
        );
    }

    const initials = getInitials(faculty.name);
    const dept = faculty.department;
    const deptName = dept?.name?.trim();
    const deptCode = dept?.code?.trim();
    const deptCategory = dept?.category?.trim();

    const hIndex = coworkingData?.hIndex ?? faculty.hIndex ?? 0;
    const citations = coworkingData?.citationCount ?? faculty.citationCount ?? 0;
    const coauthorCount = coworkingData?.stats?.uniqueCoauthors ?? 0;
    const totalPapers = coworkingData?.stats?.totalPapers ?? 0;

    // Deduplicate publications timeline grouped by year
    const timelineByYear = coworkingData?.coworkersFromPapers?.reduce(
        (acc, paper) => {
            const year = paper.publication_year;
            if (!year) return acc;
            if (!acc[year]) acc[year] = new Map<string, DeduplicatedPaper>();
            const existing = acc[year].get(paper.title);
            if (existing) {
                existing.coauthorNames.push(paper.name);
            } else {
                acc[year].set(paper.title, {
                    title: paper.title,
                    publication_year: year,
                    document_type: paper.document_type,
                    coauthorNames: [paper.name],
                });
            }
            return acc;
        },
        {} as Record<number, Map<string, DeduplicatedPaper>>
    ) ?? {};

    const sortedYears = Object.keys(timelineByYear).map(Number).sort((a, b) => b - a);
    const scopusId = coworkingData?.scopusId || faculty.scopusId;

    return (
        <div className="min-h-screen page-bg">
            <Navigation />

            {/* ── Hero Banner ── */}
            <div className="relative overflow-hidden">
                {/* Mesh gradient backdrop */}
                <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-accent/10 pointer-events-none" />
                <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-primary/5 blur-3xl pointer-events-none" />
                <div className="absolute -bottom-12 -left-12 w-72 h-72 rounded-full bg-accent/5 blur-3xl pointer-events-none" />

                <div className="relative container mx-auto px-4 pt-10 pb-12">
                    {/* Back button */}
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate("/directory")}
                        className="-ml-2 mb-8 text-muted-foreground hover:text-foreground group"
                    >
                        <ArrowLeft className="w-4 h-4 mr-1.5 transition-transform group-hover:-translate-x-0.5" />
                        Back to Directory
                    </Button>

                    <div className="flex flex-col lg:flex-row items-start gap-8">
                        {/* Avatar column */}
                        <div className="flex-shrink-0">
                            <div className="relative">
                                {/* Glow ring */}
                                <div className="absolute -inset-1 rounded-3xl bg-gradient-to-br from-primary/30 to-accent/20 blur-md opacity-60" />
                                {faculty.profileImageUrl ? (
                                    <img
                                        src={faculty.profileImageUrl}
                                        alt={faculty.name}
                                        loading="lazy"
                                        className="relative w-36 h-36 rounded-3xl object-cover shadow-2xl border-2 border-white/50 dark:border-white/10"
                                    />
                                ) : (
                                    <div className="relative w-36 h-36 rounded-3xl bg-gradient-to-br from-primary/50 to-accent/40 flex items-center justify-center text-4xl font-bold text-white shadow-2xl">
                                        {initials}
                                    </div>
                                )}
                                {deptCode && (
                                    <Badge className="absolute -bottom-3 left-1/2 -translate-x-1/2 text-[10px] px-2.5 py-1 bg-primary text-primary-foreground border border-primary/20 shadow-lg whitespace-nowrap">
                                        {deptCode.toUpperCase()}
                                    </Badge>
                                )}
                            </div>
                        </div>

                        {/* Info column */}
                        <div className="flex-1 min-w-0 pt-1">
                            <h1 className="text-4xl font-bold tracking-tight mb-1">{faculty.name}</h1>
                            {faculty.designation && (
                                <p className="text-primary font-semibold text-lg mb-4">{faculty.designation}</p>
                            )}

                            <div className="flex flex-wrap gap-3 mb-5">
                                {deptName && (
                                    <div className="inline-flex items-center gap-2 rounded-xl bg-background/70 backdrop-blur border border-border/60 px-3 py-2 shadow-sm">
                                        <div className="w-7 h-7 rounded-md bg-primary/10 flex items-center justify-center">
                                            <Building2 className="w-3.5 h-3.5 text-primary" />
                                        </div>
                                        <div>
                                            <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold leading-none mb-0.5">
                                                {deptCategory || "Department"}
                                            </p>
                                            <p className="text-sm font-semibold text-foreground leading-none">{deptName}</p>
                                        </div>
                                    </div>
                                )}
                                {faculty.email && (
                                    <a
                                        href={`mailto:${faculty.email}`}
                                        className="inline-flex items-center gap-2 rounded-xl bg-background/70 backdrop-blur border border-border/60 px-3 py-2 shadow-sm text-sm text-muted-foreground hover:text-primary hover:border-primary/30 transition-colors"
                                    >
                                        <Mail className="w-3.5 h-3.5" />
                                        {faculty.email}
                                    </a>
                                )}
                            </div>

                            {/* Stats strip */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-2xl">
                                <BigStatCard icon={Award} label="H-Index" value={hIndex} color="primary" />
                                <BigStatCard icon={BookOpen} label="Citations" value={citations.toLocaleString()} color="accent" />
                                {totalPapers > 0 && (
                                    <BigStatCard icon={FileText} label="Papers" value={totalPapers} color="primary" />
                                )}
                                {coauthorCount > 0 && (
                                    <BigStatCard icon={Users} label="Co-Authors" value={coauthorCount} color="accent" />
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Main Body ── */}
            <div className="container mx-auto px-4 py-10">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">

                    {/* ── Left Sidebar ── */}
                    <div className="lg:col-span-1 space-y-6">

                        {/* Research Areas */}
                        {faculty.research_areas && faculty.research_areas.length > 0 && (
                            <SectionCard icon={TrendingUp} title="Research Areas">
                                <div className="flex flex-wrap gap-1.5">
                                    {faculty.research_areas.map((area, idx) => (
                                        <Badge
                                            key={idx}
                                            variant="secondary"
                                            className="text-[11px] px-2.5 py-1 rounded-lg bg-primary/8 text-primary border border-primary/15 hover:bg-primary/12 transition-colors"
                                        >
                                            {area}
                                        </Badge>
                                    ))}
                                </div>
                            </SectionCard>
                        )}

                        {/* Scopus CTA */}
                        {scopusId && (
                            <a
                                href={`https://www.scopus.com/authid/detail.uri?authorId=${scopusId}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center justify-between w-full rounded-2xl border border-primary/20 bg-gradient-to-r from-primary/5 to-accent/5 p-4 shadow-sm hover:shadow-md hover:border-primary/40 transition-all group"
                            >
                                <div>
                                    <p className="text-xs text-muted-foreground uppercase tracking-widest font-semibold mb-0.5">External Profile</p>
                                    <p className="text-sm font-semibold text-primary">View on Scopus</p>
                                </div>
                                <ExternalLink className="w-5 h-5 text-primary/60 group-hover:text-primary transition-colors flex-shrink-0" />
                            </a>
                        )}

                        {/* PhD Students */}
                        {!isCoworkingLoading && coworkingData?.studentsSupervised && coworkingData.studentsSupervised.length > 0 && (
                            <SectionCard icon={GraduationCap} title={`PhD Students (${coworkingData.stats.totalStudentsSupervised})`}>
                                <div className="space-y-2">
                                    {coworkingData.studentsSupervised.slice(0, 6).map((student, idx) => (
                                        <div key={idx} className="group p-3 rounded-xl bg-muted/40 hover:bg-muted/70 border border-transparent hover:border-border/50 transition-all">
                                            <div className="flex items-start justify-between gap-2">
                                                <div className="min-w-0 flex-1">
                                                    <p className="text-sm font-semibold text-foreground leading-tight">{student.name}</p>
                                                    {student.thesis_title && (
                                                        <p className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5 leading-relaxed">
                                                            {student.thesis_title}
                                                        </p>
                                                    )}
                                                </div>
                                                {student.year && (
                                                    <Badge variant="outline" className="text-[10px] flex-shrink-0 font-mono">
                                                        {student.year}
                                                    </Badge>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </SectionCard>
                        )}
                    </div>

                    {/* ── Right Main Content ── */}
                    <div className="lg:col-span-2 space-y-6">

                        {isCoworkingLoading ? (
                            <div className="flex flex-col items-center justify-center py-20 gap-3">
                                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                                <p className="text-sm text-muted-foreground">Loading research data…</p>
                            </div>
                        ) : (
                            <>
                                {/* Co-authors */}
                                {coworkingData?.coworkersFromPapers && coworkingData.coworkersFromPapers.length > 0 && (
                                    <SectionCard icon={Users} title={`Co-Authors (${coworkingData.stats.uniqueCoauthors})`}>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                                            {coworkingData.coworkersFromPapers.slice(0, 9).map((coworker, idx) => (
                                                <div
                                                    key={idx}
                                                    className="flex items-center gap-3 p-2.5 rounded-xl bg-muted/40 hover:bg-muted/70 border border-transparent hover:border-border/50 transition-all"
                                                >
                                                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary/20 to-accent/15 flex items-center justify-center flex-shrink-0 text-xs font-bold text-primary">
                                                        {getInitials(coworker.name)}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="text-xs font-semibold text-foreground truncate leading-tight">{coworker.name}</p>
                                                        <p className="text-[10px] text-muted-foreground truncate mt-0.5">
                                                            {coworker.affiliation || "—"}
                                                        </p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </SectionCard>
                                )}

                                {/* Publication Timeline */}
                                {sortedYears.length > 0 && (
                                    <SectionCard icon={Calendar} title="Publication Timeline">
                                        <div className="relative">
                                            {/* Vertical line */}
                                            <div className="absolute left-[7px] top-2 bottom-2 w-0.5 bg-gradient-to-b from-primary/60 via-primary/30 to-transparent rounded-full" />

                                            <div className="space-y-6">
                                                {sortedYears.slice(0, 6).map((year, yearIdx) => {
                                                    const papers = Array.from(timelineByYear[year].values());
                                                    return (
                                                        <div key={year} className="relative pl-7">
                                                            {/* Year dot */}
                                                            <div className="absolute left-0 top-1 w-3.5 h-3.5 rounded-full bg-gradient-to-br from-primary to-accent shadow-sm border-2 border-background" />

                                                            {/* Year label */}
                                                            <div className="flex items-center gap-2 mb-2">
                                                                <span className="text-base font-bold text-primary">{year}</span>
                                                                <span className="text-[10px] text-muted-foreground bg-muted/60 rounded-full px-2 py-0.5 font-medium">
                                                                    {papers.length} publication{papers.length !== 1 ? "s" : ""}
                                                                </span>
                                                            </div>

                                                            {/* Papers */}
                                                            <div className="space-y-2">
                                                                {papers.slice(0, 3).map((paper, idx) => (
                                                                    <div
                                                                        key={idx}
                                                                        className="rounded-xl border border-border/50 bg-background/60 backdrop-blur p-3 hover:border-primary/30 hover:bg-primary/[0.02] transition-all shadow-sm"
                                                                    >
                                                                        <p className="text-sm font-medium text-foreground/90 line-clamp-2 leading-snug">
                                                                            {paper.title}
                                                                        </p>
                                                                        <div className="flex flex-wrap items-center gap-2 mt-1.5">
                                                                            <span className="text-[11px] text-muted-foreground">
                                                                                with {paper.coauthorNames.join(", ")}
                                                                            </span>
                                                                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-normal border-border/60">
                                                                                {paper.document_type}
                                                                            </Badge>
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                                {papers.length > 3 && (
                                                                    <p className="text-[11px] text-muted-foreground pl-1 italic">
                                                                        +{papers.length - 3} more in {year}
                                                                    </p>
                                                                )}
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    </SectionCard>
                                )}
                            </>
                        )}
                    </div>
                </div>
            </div>

            <Footer />
        </div>
    );
};

export default FacultyProfile;

/* ── Helpers ── */

const getInitials = (name: string) =>
    name
        .split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase() ?? "")
        .join("") || "?";

const BigStatCard = ({
    icon: Icon,
    label,
    value,
    color,
}: {
    icon: ElementType;
    label: string;
    value: number | string;
    color: "primary" | "accent";
}) => (
    <div className={`rounded-2xl border bg-background/70 backdrop-blur shadow-sm px-4 py-3 flex items-center gap-3 ${color === "primary" ? "border-primary/15" : "border-accent/15"}`}>
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${color === "primary" ? "bg-primary/10" : "bg-accent/10"}`}>
            <Icon className={`w-5 h-5 ${color === "primary" ? "text-primary" : "text-accent"}`} />
        </div>
        <div>
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold leading-none mb-1">{label}</p>
            <p className={`text-xl font-bold leading-none ${color === "primary" ? "text-primary" : "text-accent"}`}>{value}</p>
        </div>
    </div>
);

const SectionCard = ({
    icon: Icon,
    title,
    children,
}: {
    icon: ElementType;
    title: string;
    children: React.ReactNode;
}) => (
    <div className="rounded-2xl border border-border/60 bg-card/80 backdrop-blur shadow-sm overflow-hidden">
        <div className="flex items-center gap-2.5 px-5 py-4 border-b border-border/50 bg-muted/20">
            <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
                <Icon className="w-3.5 h-3.5 text-primary" />
            </div>
            <h2 className="text-sm font-semibold text-foreground tracking-wide">{title}</h2>
        </div>
        <div className="p-5">{children}</div>
    </div>
);
