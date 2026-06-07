import { Loader2 } from "lucide-react";
import FacultyCard from "@/components/directory/FacultyCard";
import {
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";
import { useDepartmentGroupFaculties } from "@/lib/api/hooks/useDirectory";
import type { DirectoryFaculty, GroupedDepartment, GroupedDepartmentFaculty } from "@/lib/api/types";

interface DepartmentGroupAccordionItemProps {
    category: string;
    deptGroup: GroupedDepartment;
    isOpen: boolean;
    icon: React.ElementType;
    onFacultyClick: (faculty: GroupedDepartmentFaculty, department: GroupedDepartment["department"]) => void;
}

const DepartmentGroupAccordionItem = ({
    category,
    deptGroup,
    isOpen,
    icon: Icon,
    onFacultyClick,
}: DepartmentGroupAccordionItemProps) => {
    const { data, isLoading, isError } = useDepartmentGroupFaculties(category, deptGroup._id, {
        enabled: isOpen,
    });

    return (
        <AccordionItem
            value={deptGroup.department.name}
            className="border border-border rounded-xl overflow-hidden bg-card/50 backdrop-blur-sm"
        >
            <AccordionTrigger className="px-6 py-4 hover:no-underline hover:bg-muted/50 transition-colors">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Icon className="w-5 h-5 text-primary" />
                    </div>
                    <div className="text-left">
                        <h3 className="font-semibold text-base">{deptGroup.department.name}</h3>
                        <p className="text-xs text-muted-foreground">
                            {deptGroup.stats.totalFaculty} faculty member{deptGroup.stats.totalFaculty !== 1 ? "s" : ""}
                        </p>
                    </div>
                </div>
            </AccordionTrigger>
            <AccordionContent className="px-6 pb-6">
                {isLoading ? (
                    <div className="flex items-center justify-center py-10">
                        <Loader2 className="w-6 h-6 animate-spin text-primary" />
                    </div>
                ) : isError ? (
                    <p className="text-sm text-muted-foreground py-6 text-center">
                        Failed to load faculty members. Please try again.
                    </p>
                ) : data?.faculties && data.faculties.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-2">
                        {data.faculties.map((faculty) => (
                            <FacultyCard
                                key={faculty._id}
                                faculty={{
                                    ...faculty,
                                    department: deptGroup.department,
                                } as DirectoryFaculty}
                                onClick={() => onFacultyClick(faculty, deptGroup.department)}
                            />
                        ))}
                    </div>
                ) : (
                    <p className="text-sm text-muted-foreground py-6 text-center">
                        No faculty members found.
                    </p>
                )}
            </AccordionContent>
        </AccordionItem>
    );
};

export default DepartmentGroupAccordionItem;
