import { ExternalLink, Loader2, UserCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import FacultyCard from "@/components/directory/FacultyCard";
import {
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";
import { useDepartmentGroupFaculties } from "@/lib/api/hooks/useDirectory";
import type { DirectoryFaculty, GroupedDepartment, GroupedDepartmentFaculty } from "@/lib/api/types";
import { DEPT_URLS } from "@/lib/deptUrls";

/** Current Heads of Department (HOD), keyed by department name. */
const DEPT_HODS: Record<string, string> = {
    "Applied Mechanics":                           "Sawan S. Sinha",
    "Biochemical Engineering & Biotechnology":     "Preeti Srivastava",
    "Chemical Engineering":                        "Anurag S. Rathore",
    "Chemistry Department":                        "S. Nagendran",
    "Civil Engineering":                           "Vasant Matsagar",
    "Computer Science & Engineering":              "Naveen Garg",
    "Department of Design":                        "Sumer Singh",
    "Department of Energy Science & Engineering":  "Ramesh Narayanan",
    "Department of Management Studies":            "Surya Prakash Singh",
    "Electrical Engineering":                      "Shankar Prakriya",
    "Humanities & Social Sciences":                "Abhijit Banerji",
    "Materials Science & Engineering":             "Leena Nebhani",
    "Mathematics Department":                      "Mani Mehra",
    "Mechanical Engineering":                      "Subbarao P M V",
    "Physics Department":                          "Sujeet Chaudhary",
    "Textile & Fibre Engineering":                 "Deepti Gupta",
};

/** Kerberos (email prefix) for each HOD — avoids ambiguous search results. */
const DEPT_HOD_KERBEROS: Record<string, string> = {
    "Applied Mechanics":                           "sawan",
    "Biochemical Engineering & Biotechnology":     "preeti",
    "Chemical Engineering":                        "arathore",
    "Chemistry Department":                        "sisn",
    "Civil Engineering":                           "matsagar",
    "Computer Science & Engineering":              "naveen",
    "Department of Design":                        "sumer",
    "Department of Energy Science & Engineering":  "rams",
    "Department of Management Studies":            "sprsingh",
    "Humanities & Social Sciences":                "a_banerji",
    "Materials Science & Engineering":             "lnebhani",
    "Mathematics Department":                      "mmehra",
    "Mechanical Engineering":                      "pmvs",
    "Physics Department":                          "sujeetc",
    "Textile & Fibre Engineering":                 "deepti",
};

async function resolveHodKerberos(departmentName: string, hodName: string): Promise<string | null> {
    const direct = DEPT_HOD_KERBEROS[departmentName];
    if (direct) return direct;

    const { searchFaculties } = await import("@/lib/api/services/directoryService");
    const result = await searchFaculties(hodName, 15);
    const inDept = result.faculties?.find((f) => f.department?.name === departmentName);
    const match = inDept ?? result.faculties?.[0];
    return match?.email?.split("@")[0]?.toLowerCase() ?? null;
}

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
    const navigate = useNavigate();
    const { data, isLoading, isError } = useDepartmentGroupFaculties(category, deptGroup._id, {
        enabled: isOpen,
    });

    const deptUrl = DEPT_URLS[deptGroup.department.name];
    const hodName = DEPT_HODS[deptGroup.department.name];

    return (
        <AccordionItem
            value={deptGroup.department.name}
            className="border border-border rounded-xl overflow-hidden bg-card/50 backdrop-blur-sm"
        >
            <AccordionTrigger className="px-6 py-4 hover:no-underline hover:bg-muted/50 transition-colors">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <Icon className="w-5 h-5 text-primary" />
                    </div>
                    <div className="text-left min-w-0 flex-1">
                        {/* Department name + Website pill */}
                        <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-semibold text-base">{deptGroup.department.name}</h3>
                            {deptUrl && (
                                <a
                                    href={deptUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={(e) => e.stopPropagation()}
                                    title={`Visit ${deptGroup.department.name} website`}
                                    className="inline-flex items-center gap-1 text-[11px] font-medium text-primary/70 hover:text-primary bg-primary/8 hover:bg-primary/15 border border-primary/20 hover:border-primary/40 rounded-full px-2 py-0.5 transition-all whitespace-nowrap"
                                >
                                    <ExternalLink className="w-2.5 h-2.5" />
                                    Website
                                </a>
                            )}
                        </div>

                        {/* Faculty count + HOD chip */}
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                            <p className="text-xs text-muted-foreground">
                                {deptGroup.stats.totalFaculty} faculty member{deptGroup.stats.totalFaculty !== 1 ? "s" : ""}
                            </p>
                            {hodName && (
                                <button
                                    type="button"
                                    onClick={async (e) => {
                                        e.stopPropagation();
                                        try {
                                            const k = await resolveHodKerberos(
                                                deptGroup.department.name,
                                                hodName,
                                            );
                                            if (k) navigate(`/faculty/${k}`);
                                        } catch { /* ignore */ }
                                    }}
                                    title={`View profile of HOD: ${hodName}`}
                                    className="inline-flex items-center gap-1 text-[11px] font-medium text-foreground/70 hover:text-primary bg-muted/60 hover:bg-primary/10 border border-border/60 hover:border-primary/30 rounded-full px-2 py-0.5 transition-all whitespace-nowrap"
                                >
                                    <UserCircle className="w-2.5 h-2.5" />
                                    HOD: {hodName}
                                </button>
                            )}
                        </div>
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
