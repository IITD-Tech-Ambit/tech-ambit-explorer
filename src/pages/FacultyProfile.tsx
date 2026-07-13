import { useParams, useNavigate, useLocation } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    User, Mail, BookOpen, Award, ExternalLink, Building2, ArrowLeft, Loader2,
    FileText, TrendingUp,
} from "lucide-react";
import type { ElementType } from "react";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { useFacultyByKerberos, useFacultyResearchSummary } from "@/lib/api/hooks/useDirectory";
import PublicationTimeline from "@/components/PublicationTimeline";
import { getDepartmentUrl } from "@/lib/deptUrls";

const kerberosFromEmail = (email?: string) =>
    email ? email.split("@")[0]?.toLowerCase() : "";

const FacultyProfile = () => {
    const { kerberos: urlKerberos } = useParams<{ kerberos: string }>();
    const navigate = useNavigate();
    const location = useLocation();

    const kerberos = urlKerberos?.trim().toLowerCase() ?? "";

    // Profiles are linked from many places (Directory, taxonomy Browse, Explore,
    // Atlas, chat) — go back to wherever the user actually came from
    // instead of a hardcoded destination. React Router sets location.key to
    // 'default' when this tab has no prior in-app history (direct link/refresh).
    const goBack = () => {
        if (location.key !== "default") navigate(-1);
        else navigate("/directory");
    };

    const { data: faculty, isLoading: isFacultyLoading, isError: isFacultyError } = useFacultyByKerberos(kerberos);
    const { data: summaryData, isLoading: isSummaryLoading } = useFacultyResearchSummary(kerberos);

    if (isFacultyLoading) {
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
                    <Button variant="outline" onClick={goBack}>
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Back
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
    const deptUrl = getDepartmentUrl(deptName);

    const hIndex = summaryData?.hIndex ?? faculty.hIndex ?? 0;
    const citations = summaryData?.citationCount ?? faculty.citationCount ?? 0;
    const totalPapers = summaryData?.stats?.totalPapers ?? 0;

    const scopusId = summaryData?.scopusId || faculty.scopusId;
    const googleScholarId = faculty.googleScholarId;

    const handleNavigateAuthor = (authorId: string, matchedProfile: string | null, name: string) => {
        if (matchedProfile) {
            resolveAndNavigate(matchedProfile);
        } else if (authorId) {
            resolveAndNavigateByScopus(authorId, name);
        }
    };

    const resolveAndNavigate = async (facultyId: string) => {
        try {
            const { getFacultyById } = await import("@/lib/api/services/directoryService");
            const f = await getFacultyById(facultyId);
            const k = kerberosFromEmail(f.email);
            if (k) window.open(`/faculty/${k}`, "_blank", "noopener");
        } catch { /* ignore */ }
    };

    const resolveAndNavigateByScopus = async (scopusAuthorId: string, _name: string) => {
        try {
            const { getFacultyByScopusId } = await import("@/lib/api/services/directoryService");
            const f = await getFacultyByScopusId(scopusAuthorId);
            const k = kerberosFromEmail(f.email);
            if (k) window.open(`/faculty/${k}`, "_blank", "noopener");
        } catch { /* ignore */ }
    };

    return (
        <div className="min-h-screen page-bg">
            <Navigation />

            {/* Hero Banner */}
            <div className="relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-accent/10 pointer-events-none" />
                <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-primary/5 blur-3xl pointer-events-none" />
                <div className="absolute -bottom-12 -left-12 w-72 h-72 rounded-full bg-accent/5 blur-3xl pointer-events-none" />

                <div className="relative container mx-auto px-4 pt-10 pb-12">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={goBack}
                        className="-ml-2 mb-8 text-muted-foreground hover:text-foreground group"
                    >
                        <ArrowLeft className="w-4 h-4 mr-1.5 transition-transform group-hover:-translate-x-0.5" />
                        Back
                    </Button>

                    <div className="flex flex-col lg:flex-row items-start gap-8">
                        <div className="flex-shrink-0">
                            <div className="relative">
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

                        <div className="flex-1 min-w-0 pt-1">
                            <h1 className="text-4xl font-bold tracking-tight mb-1">{faculty.name}</h1>
                            {faculty.designation && (
                                <p className="text-primary font-semibold text-lg mb-4">{faculty.designation}</p>
                            )}

                            <div className="flex flex-wrap gap-3 mb-5">
                                {deptName && (
                                    deptUrl ? (
                                        <a
                                            href={deptUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-2 rounded-xl bg-background/70 backdrop-blur border border-border/60 px-3 py-2 shadow-sm text-foreground hover:text-primary hover:border-primary/30 transition-colors group"
                                        >
                                            <div className="w-7 h-7 rounded-md bg-primary/10 flex items-center justify-center">
                                                <Building2 className="w-3.5 h-3.5 text-primary" />
                                            </div>
                                            <div>
                                                <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold leading-none mb-0.5">
                                                    {deptCategory || "Department"}
                                                </p>
                                                <p className="text-sm font-semibold leading-none flex items-center gap-1">
                                                    {deptName}
                                                    <ExternalLink className="w-3 h-3 opacity-50 group-hover:opacity-100 transition-opacity" />
                                                </p>
                                            </div>
                                        </a>
                                    ) : (
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
                                    )
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

                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-w-2xl">
                                <BigStatCard icon={Award} label="H-Index" value={hIndex} color="primary" />
                                <BigStatCard icon={BookOpen} label="Citations" value={citations.toLocaleString()} color="accent" />
                                {totalPapers > 0 && (
                                    <BigStatCard icon={FileText} label="Papers" value={totalPapers} color="primary" />
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Body */}
            <div className="container mx-auto px-4 py-10">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">

                    {/* Left Sidebar */}
                    <div className="lg:col-span-1 space-y-6">
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

                        {(scopusId || googleScholarId) && (
                            <div className="space-y-2">
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
                                {googleScholarId && (
                                    <a
                                        href={`https://scholar.google.com/citations?user=${googleScholarId}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center justify-between w-full rounded-2xl border border-blue-200/60 bg-gradient-to-r from-blue-50/50 to-sky-50/50 dark:from-blue-950/20 dark:to-sky-950/20 dark:border-blue-800/30 p-4 shadow-sm hover:shadow-md hover:border-blue-400/60 transition-all group"
                                    >
                                        <div>
                                            <p className="text-xs text-muted-foreground uppercase tracking-widest font-semibold mb-0.5">External Profile</p>
                                            <p className="text-sm font-semibold text-blue-600 dark:text-blue-400">View on Google Scholar</p>
                                        </div>
                                        <ExternalLink className="w-5 h-5 text-blue-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors flex-shrink-0" />
                                    </a>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Right Main Content */}
                    <div className="lg:col-span-2 space-y-6">
                        {isSummaryLoading ? (
                            <div className="flex flex-col items-center justify-center py-20 gap-3">
                                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                                <p className="text-sm text-muted-foreground">Loading research data…</p>
                            </div>
                        ) : (
                            summaryData?.timeline && summaryData.timeline.length > 0 && (
                                <PublicationTimeline
                                    timeline={summaryData.timeline}
                                    kerberos={kerberos}
                                    totalYears={summaryData.stats.totalYears}
                                    yearLimit={summaryData.yearLimit}
                                    onNavigateAuthor={handleNavigateAuthor}
                                />
                            )
                        )}
                    </div>
                </div>
            </div>

            <Footer />
        </div>
    );
};

export default FacultyProfile;

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
