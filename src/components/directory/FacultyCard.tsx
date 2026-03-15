import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { User, BookOpen, Award } from "lucide-react";
import type { DirectoryFaculty } from "@/lib/api/types";

interface FacultyCardProps {
    faculty: DirectoryFaculty;
    onClick: () => void;
}

const FacultyCard = ({ faculty, onClick }: FacultyCardProps) => {
    return (
        <Card
            className="hover:shadow-elegant transition-smooth cursor-pointer border-border group"
            onClick={onClick}
        >
            <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center overflow-hidden group-hover:scale-105 transition-transform">
                        <User className="w-8 h-8 text-primary/60" />
                    </div>
                    <Badge variant="secondary" className="text-xs">
                        {faculty.department?.name || "Faculty"}
                    </Badge>
                </div>

                <h3 className="text-xl font-semibold mb-1 line-clamp-1">{faculty.name}</h3>
                <p className="text-sm text-primary font-medium mb-2">Professor</p>
                <p className="text-sm text-muted-foreground mb-3 line-clamp-1">
                    {faculty.department?.name || "Department"}
                </p>

                <div className="flex items-center gap-3 mb-4">
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Award className="w-3.5 h-3.5" />
                        <span>h-Index: <strong className="text-foreground">{faculty.hIndex}</strong></span>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <BookOpen className="w-3.5 h-3.5" />
                        <span>Citations: <strong className="text-foreground">{faculty.citationCount}</strong></span>
                    </div>
                </div>

                {faculty.research_areas && faculty.research_areas.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-3 border-t border-border">
                        {faculty.research_areas.slice(0, 3).map((area, idx) => (
                            <Badge
                                key={idx}
                                variant="outline"
                                className="text-[10px] px-2 py-0.5 bg-primary/5"
                            >
                                {area.length > 20 ? area.substring(0, 20) + "..." : area}
                            </Badge>
                        ))}
                        {faculty.research_areas.length > 3 && (
                            <Badge variant="outline" className="text-[10px] px-2 py-0.5">
                                +{faculty.research_areas.length - 3}
                            </Badge>
                        )}
                    </div>
                )}
            </CardContent>
        </Card>
    );
};

export default FacultyCard;
