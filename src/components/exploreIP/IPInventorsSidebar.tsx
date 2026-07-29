import {
  PeopleSectionHeader,
  PeopleFacultyRow,
  PeopleDepartmentBlock,
  PeopleListContainer,
  PeopleEmptyState,
  PeopleLoadingState,
} from "@/components/explore/PeopleSectionUI";
import type { IPRelatedFaculty, IPAllFacultyForQueryResponse } from "@/lib/api/types";
import type { SelectedInventor } from "@/hooks/explore/useIPExploreState";

type Props = {
  relatedFaculty: IPRelatedFaculty[];
  allFacultyData?: IPAllFacultyForQueryResponse;
  isAllFacultyLoading?: boolean;
  selectedInventor: SelectedInventor | null;
  onSelectInventor: (inventor: SelectedInventor | null) => void;
  onViewProfile: (kerberos: string) => void;
  isOpen: boolean;
  onToggle: () => void;
};

type FacultyRow = { _id: string; name: string; kerberos?: string | null; ipCount: number };
type DeptGroup = { name: string; faculty: FacultyRow[] };

export function IPInventorsSidebar({
  relatedFaculty,
  allFacultyData,
  isAllFacultyLoading = false,
  selectedInventor,
  onSelectInventor,
  onViewProfile,
  isOpen,
  onToggle,
}: Props) {
  // allFacultyData is the true full-corpus aggregation (OpenSearch), including each person's
  // real total ipCount — relatedFaculty is only the current page's preview, so a person's count
  // there is capped to however many of their docs happen to be on this page. Using relatedFaculty
  // for the row counts was the bug: the number shown next to someone before clicking (page-capped)
  // could wildly disagree with the actual total once you scoped to them (full-corpus). Prefer the
  // full aggregation for both the header total and every row; fall back to the page-scoped data
  // only while the aggregation is still loading.
  const totalFacultyCount = allFacultyData?.total_faculty ?? relatedFaculty.length;
  const isEmpty = allFacultyData ? allFacultyData.total_faculty === 0 : relatedFaculty.length === 0;

  const departments: DeptGroup[] = allFacultyData
    ? allFacultyData.departments.map((d) => ({ name: d.name, faculty: d.faculty }))
    : (() => {
        const groups: Record<string, DeptGroup> = {};
        for (const faculty of relatedFaculty) {
          const dept = faculty.department?.name || "Unknown Department";
          if (!groups[dept]) groups[dept] = { name: dept, faculty: [] };
          groups[dept].faculty.push(faculty);
        }
        return Object.values(groups).sort((a, b) => {
          const totalA = a.faculty.reduce((s, f) => s + f.ipCount, 0);
          const totalB = b.faculty.reduce((s, f) => s + f.ipCount, 0);
          return totalB - totalA || a.name.localeCompare(b.name);
        });
      })();

  return (
    <div className="w-full flex flex-col gap-4 pt-1 xl:sticky xl:top-6 xl:max-h-[calc(100vh-3rem)]">
      <PeopleSectionHeader count={totalFacultyCount} isOpen={isOpen} onToggle={onToggle} />

      <div
        className={`flex flex-col xl:flex-1 xl:min-h-0 transition-all duration-300 overflow-hidden pr-0 sm:pr-4 ${
          isOpen ? "opacity-100" : "opacity-0 hidden"
        }`}
      >
        {isAllFacultyLoading ? (
          <PeopleLoadingState />
        ) : isEmpty ? (
          <PeopleEmptyState
            title="No Inventors Found"
            description="No IIT Delhi faculty inventors found for this search"
          />
        ) : (
          <>
            <div className="shrink-0 mb-4 mt-2">
              <p className="text-muted-foreground">
                Found <span className="font-semibold text-primary">{totalFacultyCount}</span> faculty inventor
                {totalFacultyCount === 1 ? "" : "s"}
                {!allFacultyData && totalFacultyCount !== relatedFaculty.length && (
                  <> ({relatedFaculty.length} on this page)</>
                )}
              </p>
            </div>
            <PeopleListContainer>
              {departments.map((dept) => (
                <PeopleDepartmentBlock key={dept.name} department={dept.name} count={dept.faculty.length}>
                  {dept.faculty.map((faculty) => {
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
