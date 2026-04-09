import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Award, BookOpen, Clock3, Mail, User, ArrowUpRight } from "lucide-react";
import type { DirectoryFaculty } from "@/lib/api/types";
import { cn } from "@/lib/utils";

interface FacultyCardProps {
    faculty: DirectoryFaculty;
    onClick: () => void;
}
const getInitials = (name: string) => {
    return name
        .split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase() ?? "")
        .join("") || "IITD";
};

/*const formatTenure = (year?: number | null) => {
    if (!year) return null;
    const currentYear = new Date().getFullYear();
    if (year >= currentYear) return "Joined this year";
    const diff = currentYear - year;
    return diff === 1 ? "1 year at IIT Delhi" : `${diff} years at IIT Delhi`;
};*/

const Stat = ({
    icon: Icon,
    label,
    value,
}: {
    icon: React.ElementType;
    label: string;
    value: number;
}) => (
    <div className="flex items-center gap-3 rounded-xl border border-border/70 px-3 py-2">
        <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
            <Icon className="w-4 h-4 text-primary" />
        </div>
        <div>
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
            <p className="text-sm font-semibold text-foreground">{value}</p>
        </div>
    </div>
);

const FacultyCard = ({ faculty, onClick }: FacultyCardProps) => {
    //const tenure = formatTenure(faculty.workingFromYear);
    const initials = getInitials(faculty.name);

    return (
        <Card
            className="group h-full cursor-pointer border-border/70 bg-card/60 backdrop-blur transition duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-elegant"
            onClick={onClick}
            role="button"
            tabIndex={0}
        >
            <CardContent className="p-6 flex flex-col gap-5 h-full">
                <div className="flex items-start gap-4">
                    <div className="relative">
                        {faculty.profileImageUrl ? (
                            <img
                                src={faculty.profileImageUrl}
                                alt={faculty.name}
                                loading="lazy"
                                className="w-20 h-20 rounded-2xl object-cover shadow-md"
                            />
                        ) : (
                            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 text-primary flex items-center justify-center text-xl font-semibold">
                                {initials}
                            </div>
                        )}
                        {faculty.department?.code && (
                            <Badge className="absolute -bottom-2 left-1/2 -translate-x-1/2 text-[10px] px-2 py-0.5 shadow-sm">
                                {faculty.department.code.toUpperCase()}
                            </Badge>
                        )}
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                                <h3 className="text-lg font-semibold leading-tight line-clamp-1">{faculty.name}</h3>
                                {faculty.designation && (
                                    <p className="text-sm text-primary font-medium line-clamp-1">{faculty.designation}</p>
                                )}
                                <p className="text-sm text-muted-foreground line-clamp-1">
                                    {faculty.department?.name || "Faculty"}
                                </p>
                            </div>
                            <span className="text-[11px] uppercase tracking-wide text-muted-foreground inline-flex items-center gap-1">
                                View
                                <ArrowUpRight className="w-4 h-4" />
                            </span>
                        </div>
                        {faculty.email && (
                            <a
                                href={`mailto:${faculty.email}`}
                                className="mt-2 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary"
                                onClick={(e) => e.stopPropagation()}
                            >
                                <Mail className="w-3.5 h-3.5" />
                                {faculty.email}
                            </a>
                        )}
                        {/* {tenure && (
                            <div className="mt-1 inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                                <Clock3 className="w-3 h-3" />
                                {tenure}
                            </div>
                        )} */}
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <Stat icon={Award} label="h-index" value={faculty.hIndex ?? 0} />
                    <Stat icon={BookOpen} label="citations" value={faculty.citationCount ?? 0} />
                </div>

                {faculty.research_areas && faculty.research_areas.length > 0 && (
                    <div className="mt-auto pt-3 border-t border-dashed border-border/80 flex flex-wrap gap-1.5">
                        {faculty.research_areas.slice(0, 4).map((area, idx) => (
                            <Badge
                                key={`${area}-${idx}`}
                                variant="secondary"
                                className={cn(
                                    "text-[11px] px-2 py-0.5 bg-primary/10 text-primary",
                                    "hover:bg-primary/20"
                                )}
                            >
                                {area.length > 24 ? area.slice(0, 24) + "…" : area}
                            </Badge>
                        ))}
                        {faculty.research_areas.length > 4 && (
                            <Badge variant="outline" className="text-[10px] px-2 py-0.5">
                                +{faculty.research_areas.length - 4}
                            </Badge>
                        )}
                    </div>
                )}
            </CardContent>
        </Card>
    );
};

export default FacultyCard;
