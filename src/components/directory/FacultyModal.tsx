import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Mail, BookOpen, Award, ExternalLink, Building2, Loader2, FileText } from "lucide-react";
import type { ElementType } from "react";
import { useFacultyResearchSummary } from "@/lib/api/hooks/useDirectory";
import type { DirectoryFaculty } from "@/lib/api/types";
import PublicationTimeline from "@/components/PublicationTimeline";

const kerberosFromEmail = (email?: string) =>
    email ? email.split("@")[0]?.toLowerCase() : "";

interface FacultyModalProps {
    faculty: DirectoryFaculty | null;
    open: boolean;
    onClose: () => void;
}

const FacultyModal = ({ faculty, open, onClose }: FacultyModalProps) => {
    const kerberos = kerberosFromEmail(faculty?.email);

    const { data: summaryData, isLoading } = useFacultyResearchSummary(kerberos, {
        enabled: open && !!kerberos,
    });

    if (!faculty) return null;

    const initials = getInitials(faculty.name);
    const dept = faculty.department;
    const deptName = dept?.name?.trim();
    const deptCode = dept?.code?.trim();
    const deptCategory = dept?.category?.trim();

    const hIndex = summaryData?.hIndex ?? faculty.hIndex ?? 0;
    const citations = summaryData?.citationCount ?? faculty.citationCount ?? 0;
    const totalPapers = summaryData?.stats?.totalPapers ?? 0;

    const handleNavigateAuthor = async (authorId: string, matchedProfile: string | null, _name: string) => {
        if (matchedProfile) {
            try {
                const { getFacultyById } = await import("@/lib/api/services/directoryService");
                const f = await getFacultyById(matchedProfile);
                const k = kerberosFromEmail(f.email);
                if (k) window.open(`/faculty/${k}`, "_blank", "noopener");
            } catch { /* ignore */ }
        } else if (authorId) {
            try {
                const { getFacultyByScopusId } = await import("@/lib/api/services/directoryService");
                const f = await getFacultyByScopusId(authorId);
                const k = kerberosFromEmail(f.email);
                if (k) window.open(`/faculty/${k}`, "_blank", "noopener");
            } catch { /* ignore */ }
        }
    };

    return (
        <Dialog
            open={open}
            onOpenChange={(nextOpen) => {
                if (!nextOpen) onClose();
            }}
        >
            <DialogContent className="z-[100] max-w-3xl max-h-[85vh] p-0 overflow-hidden">
                <DialogHeader className="p-6 pb-4 bg-gradient-to-r from-primary/10 to-accent/10">
                    <div className="flex items-start gap-5">
                        <div className="relative flex-shrink-0">
                            {faculty.profileImageUrl ? (
                                <img
                                    src={faculty.profileImageUrl}
                                    alt={faculty.name}
                                    loading="lazy"
                                    className="w-24 h-24 rounded-3xl object-cover shadow-xl border border-white/40"
                                />
                            ) : (
                                <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-primary/40 to-accent/30 text-primary flex items-center justify-center text-2xl font-semibold">
                                    {initials}
                                </div>
                            )}
                            {deptCode && (
                                <Badge className="absolute -bottom-2 left-1/2 -translate-x-1/2 text-[10px] px-2 py-0.5 shadow border border-primary/20 bg-primary text-primary-foreground">
                                    {deptCode.toUpperCase()}
                                </Badge>
                            )}
                        </div>
                        <div className="flex-1 min-w-0">
                            <DialogTitle className="text-2xl font-bold mb-1">
                                {faculty.name}
                            </DialogTitle>
                            {faculty.designation && (
                                <p className="text-primary font-semibold text-sm mb-0.5">{faculty.designation}</p>
                            )}
                            {deptName ? (
                                <div className="mt-3 rounded-xl border border-primary/15 bg-gradient-to-br from-primary/[0.08] via-background/80 to-accent/[0.06] p-3 shadow-sm">
                                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground mb-2">
                                        Department
                                    </p>
                                    <div className="flex flex-wrap items-center gap-2">
                                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary ring-1 ring-primary/20">
                                            <Building2 className="h-4 w-4" />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <p className="text-base font-semibold text-foreground leading-snug">
                                                {deptName}
                                            </p>
                                            {deptCategory && (
                                                <p className="text-xs text-muted-foreground mt-0.5">{deptCategory}</p>
                                            )}
                                        </div>
                                        {deptCode && (
                                            <Badge
                                                variant="secondary"
                                                className="shrink-0 font-mono text-[11px] px-2.5 py-0.5 bg-background/90 border border-border/80"
                                            >
                                                {deptCode.toUpperCase()}
                                            </Badge>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <p className="text-sm text-muted-foreground inline-flex items-center gap-2 mt-1 rounded-lg border border-dashed border-border/80 bg-muted/30 px-3 py-2">
                                    <Building2 className="w-4 h-4 shrink-0 opacity-60" />
                                    <span>Department not listed</span>
                                </p>
                            )}
                            {faculty.email && (
                                <a
                                    href={`mailto:${faculty.email}`}
                                    className="mt-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary"
                                >
                                    <Mail className="w-3.5 h-3.5" />
                                    {faculty.email}
                                </a>
                            )}
                        </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-5">
                        <StatPill icon={Award} label="h-index" value={hIndex} />
                        <StatPill icon={BookOpen} label="citations" value={citations} />
                        {totalPapers > 0 && <StatPill icon={FileText} label="papers" value={totalPapers} />}
                    </div>
                </DialogHeader>

                <ScrollArea className="flex-1 max-h-[50vh]">
                    <div className="p-6 pt-2 space-y-6">
                        {faculty.research_areas && faculty.research_areas.length > 0 && (
                            <div>
                                <h4 className="text-sm font-semibold text-muted-foreground mb-2 uppercase tracking-wide">
                                    Research Areas
                                </h4>
                                <div className="flex flex-wrap gap-2">
                                    {faculty.research_areas.map((area, idx) => (
                                        <Badge key={idx} variant="secondary" className="text-xs">
                                            {area}
                                        </Badge>
                                    ))}
                                </div>
                            </div>
                        )}

                        {isLoading ? (
                            <div className="flex items-center justify-center py-8">
                                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                            </div>
                        ) : (
                            <>
                                {summaryData?.timeline && summaryData.timeline.length > 0 && (
                                    <PublicationTimeline
                                        timeline={summaryData.timeline}
                                        kerberos={kerberos}
                                        totalYears={summaryData.stats.totalYears}
                                        yearLimit={summaryData.yearLimit}
                                        onNavigateAuthor={handleNavigateAuthor}
                                    />
                                )}

                                {(summaryData?.scopusId || faculty.scopusId) && (
                                    <div className="pt-4 border-t">
                                        <a
                                            href={`https://www.scopus.com/authid/detail.uri?authorId=${summaryData?.scopusId || faculty.scopusId}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
                                        >
                                            <ExternalLink className="w-4 h-4" />
                                            View Scopus Profile
                                        </a>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </ScrollArea>
            </DialogContent>
        </Dialog>
    );
};

export default FacultyModal;

const getInitials = (name: string) =>
    name
        .split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase() ?? "")
        .join("") || "IITD";

const StatPill = ({ icon: Icon, label, value }: { icon: ElementType; label: string; value: number }) => (
    <div className="flex items-center gap-2 rounded-xl bg-background/80 px-3 py-2 shadow-sm">
        <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
            <Icon className="w-4 h-4 text-primary" />
        </div>
        <div>
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
            <p className="text-sm font-semibold text-foreground">{value}</p>
        </div>
    </div>
);
