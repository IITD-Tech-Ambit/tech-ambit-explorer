import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { User, Mail, BookOpen, Users, GraduationCap, Calendar, Award, ExternalLink } from "lucide-react";
import { useFacultyCoworking } from "@/lib/api/hooks/useDirectory";
import type { DirectoryFaculty } from "@/lib/api/types";

interface FacultyModalProps {
    faculty: DirectoryFaculty | null;
    open: boolean;
    onClose: () => void;
}

const FacultyModal = ({ faculty, open, onClose }: FacultyModalProps) => {
    const { data: coworkingData, isLoading } = useFacultyCoworking(faculty?._id || "", {
        enabled: open && !!faculty?._id,
    });

    if (!faculty) return null;

    const timelineData = coworkingData?.coworkersFromPapers
        ?.reduce((acc, paper) => {
            const year = paper.publication_year;
            if (year) {
                if (!acc[year]) acc[year] = [];
                acc[year].push(paper);
            }
            return acc;
        }, {} as Record<number, typeof coworkingData.coworkersFromPapers>) || {};

    const sortedYears = Object.keys(timelineData)
        .map(Number)
        .sort((a, b) => b - a);

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-w-3xl max-h-[85vh] p-0 overflow-hidden">
                <DialogHeader className="p-6 pb-4 bg-gradient-to-r from-primary/10 to-accent/10">
                    <div className="flex items-start gap-4">
                        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary/30 to-accent/30 flex items-center justify-center flex-shrink-0">
                            <User className="w-10 h-10 text-primary/70" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <DialogTitle className="text-2xl font-bold mb-1">
                                {faculty.name}
                            </DialogTitle>
                            <p className="text-primary font-medium">Professor</p>
                            <p className="text-sm text-muted-foreground">{faculty.department?.name}</p>
                            {faculty.email && (
                                <a
                                    href={`mailto:${faculty.email}`}
                                    className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary mt-1"
                                >
                                    <Mail className="w-3.5 h-3.5" />
                                    {faculty.email}
                                </a>
                            )}
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-4 mt-4">
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-background/80 rounded-lg">
                            <Award className="w-4 h-4 text-primary" />
                            <span className="text-sm">h-Index: <strong>{coworkingData?.hIndex ?? faculty.hIndex ?? 0}</strong></span>
                        </div>
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-background/80 rounded-lg">
                            <BookOpen className="w-4 h-4 text-primary" />
                            <span className="text-sm">Citations: <strong>{coworkingData?.citationCount ?? faculty.citationCount ?? 0}</strong></span>
                        </div>
                        {coworkingData?.stats && (
                            <>
                                <div className="flex items-center gap-2 px-3 py-1.5 bg-background/80 rounded-lg">
                                    <Users className="w-4 h-4 text-primary" />
                                    <span className="text-sm">Co-authors: <strong>{coworkingData.stats.uniqueCoauthors}</strong></span>
                                </div>
                                <div className="flex items-center gap-2 px-3 py-1.5 bg-background/80 rounded-lg">
                                    <GraduationCap className="w-4 h-4 text-primary" />
                                    <span className="text-sm">Students: <strong>{coworkingData.stats.totalStudentsSupervised}</strong></span>
                                </div>
                            </>
                        )}
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
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                            </div>
                        ) : (
                            <>
                                {coworkingData?.coworkersFromPapers && coworkingData.coworkersFromPapers.length > 0 && (
                                    <div>
                                        <h4 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wide flex items-center gap-2">
                                            <Users className="w-4 h-4" />
                                            Coworkers ({coworkingData.stats.uniqueCoauthors})
                                        </h4>
                                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                                            {coworkingData.coworkersFromPapers.slice(0, 9).map((coworker, idx) => (
                                                <div
                                                    key={idx}
                                                    className="flex items-center gap-2 p-2 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                                                >
                                                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                                                        <User className="w-4 h-4 text-primary/60" />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="text-xs font-medium truncate">{coworker.name}</p>
                                                        <p className="text-[10px] text-muted-foreground truncate">
                                                            {coworker.affiliation}
                                                        </p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {coworkingData?.studentsSupervised && coworkingData.studentsSupervised.length > 0 && (
                                    <div>
                                        <h4 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wide flex items-center gap-2">
                                            <GraduationCap className="w-4 h-4" />
                                            PhD Students Supervised ({coworkingData.stats.totalStudentsSupervised})
                                        </h4>
                                        <div className="space-y-2">
                                            {coworkingData.studentsSupervised.slice(0, 5).map((student, idx) => (
                                                <div
                                                    key={idx}
                                                    className="p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                                                >
                                                    <div className="flex items-start justify-between gap-2">
                                                        <div className="min-w-0">
                                                            <p className="text-sm font-medium">{student.name}</p>
                                                            <p className="text-xs text-muted-foreground line-clamp-1">
                                                                {student.thesis_title}
                                                            </p>
                                                        </div>
                                                        {student.year && (
                                                            <Badge variant="outline" className="text-[10px] flex-shrink-0">
                                                                {student.year}
                                                            </Badge>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {sortedYears.length > 0 && (
                                    <div>
                                        <h4 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wide flex items-center gap-2">
                                            <Calendar className="w-4 h-4" />
                                            Publication Timeline
                                        </h4>
                                        <div className="relative pl-4 border-l-2 border-primary/20 space-y-4">
                                            {sortedYears.slice(0, 6).map((year) => (
                                                <div key={year} className="relative">
                                                    <div className="absolute -left-[1.35rem] w-3 h-3 rounded-full bg-primary/80 border-2 border-background"></div>
                                                    <div className="ml-2">
                                                        <span className="text-sm font-semibold text-primary">{year}</span>
                                                        <div className="mt-1 space-y-1">
                                                            {timelineData[year].slice(0, 2).map((paper, idx) => (
                                                                <div
                                                                    key={idx}
                                                                    className="text-xs text-muted-foreground p-2 bg-muted/30 rounded"
                                                                >
                                                                    <p className="line-clamp-1 font-medium text-foreground/80">
                                                                        {paper.title}
                                                                    </p>
                                                                    <p className="text-[10px] mt-0.5">
                                                                        with {paper.name} • {paper.document_type}
                                                                    </p>
                                                                </div>
                                                            ))}
                                                            {timelineData[year].length > 2 && (
                                                                <p className="text-[10px] text-muted-foreground pl-2">
                                                                    +{timelineData[year].length - 2} more publications
                                                                </p>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {(coworkingData?.scopusId || faculty.scopusId) && (
                                    <div className="pt-4 border-t">
                                        <a
                                            href={`https://www.scopus.com/authid/detail.uri?authorId=${coworkingData?.scopusId || faculty.scopusId}`}
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
