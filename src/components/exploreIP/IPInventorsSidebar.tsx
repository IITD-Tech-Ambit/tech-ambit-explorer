import {
  PeopleSectionHeader,
  PeopleFacultyRow,
  PeopleDepartmentBlock,
  PeopleListContainer,
  PeopleEmptyState,
} from "@/components/explore/PeopleSectionUI";
import type { IPRelatedFaculty } from "@/lib/api/types";
import type { SelectedInventor } from "@/hooks/explore/useIPExploreState";

type Props = {
  relatedFaculty: IPRelatedFaculty[];
  selectedInventor: SelectedInventor | null;
  onSelectInventor: (inventor: SelectedInventor | null) => void;
  onViewProfile: (kerberos: string) => void;
  isOpen: boolean;
  onToggle: () => void;
};

export function IPInventorsSidebar({
  relatedFaculty,
  selectedInventor,
  onSelectInventor,
  onViewProfile,
  isOpen,
  onToggle,
}: Props) {
  const deptGroups: Record<string, { faculty: IPRelatedFaculty[]; totalCount: number }> = {};
  relatedFaculty.forEach((faculty) => {
    const dept = faculty.department?.name || "Unknown Department";
    if (!deptGroups[dept]) deptGroups[dept] = { faculty: [], totalCount: 0 };
    deptGroups[dept].faculty.push(faculty);
    deptGroups[dept].totalCount += faculty.ipCount;
  });

  const sortedDepts = Object.keys(deptGroups).sort((a, b) => {
    const diff = deptGroups[b].totalCount - deptGroups[a].totalCount;
    return diff !== 0 ? diff : a.localeCompare(b);
  });

  return (
    <div className="w-full flex flex-col gap-4 pt-1 xl:sticky xl:top-6 xl:max-h-[calc(100vh-3rem)]">
      <PeopleSectionHeader count={relatedFaculty.length} isOpen={isOpen} onToggle={onToggle} />

      <div
        className={`flex flex-col xl:flex-1 xl:min-h-0 transition-all duration-300 overflow-hidden pr-0 sm:pr-4 ${
          isOpen ? "opacity-100" : "opacity-0 hidden"
        }`}
      >
        {relatedFaculty.length === 0 ? (
          <PeopleEmptyState
            title="No Inventors Found"
            description="No IIT Delhi faculty inventors found in the current page results"
          />
        ) : (
          <>
            <div className="shrink-0 mb-4 mt-2">
              <p className="text-muted-foreground">
                Found <span className="font-semibold text-primary">{relatedFaculty.length}</span> faculty inventor
                {relatedFaculty.length === 1 ? "" : "s"} on this page
              </p>
            </div>
            <PeopleListContainer>
              {sortedDepts.map((dept) => (
                <PeopleDepartmentBlock key={dept} department={dept} count={deptGroups[dept].faculty.length}>
                  {deptGroups[dept].faculty.map((faculty) => {
                    const isSelected = selectedInventor?.kerberos === faculty.kerberos;
                    return (
                      <PeopleFacultyRow
                        key={faculty._id}
                        name={faculty.name}
                        paperCount={faculty.ipCount}
                        isSelected={isSelected}
                        onSelect={() => {
                          if (!faculty.kerberos) return;
                          onSelectInventor(isSelected ? null : { name: faculty.name, kerberos: faculty.kerberos });
                        }}
                        onViewProfile={() => {
                          if (faculty.kerberos) onViewProfile(faculty.kerberos);
                        }}
                      />
                    );
                  })}
                </PeopleDepartmentBlock>
              ))}
            </PeopleListContainer>
          </>
        )}
      </div>
    </div>
  );
}
