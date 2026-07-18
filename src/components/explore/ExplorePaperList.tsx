import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, Users, Building, ChevronDown } from "lucide-react";
import type { SearchDocument } from "@/lib/api";
import { formatAbstract, highlightTerms } from "@/lib/utils";
import { ExploreCardAuthorsLine } from "@/components/explore/exploreAuthors";

type SelectedAuthor = { name: string; author_id: string } | null;

type PaperCardProps = {
  item: SearchDocument;
  index: number;
  selectedAuthor: SelectedAuthor;
  highlightTokens: string[];
  showFieldBadge?: boolean;
  onSelect: (doc: SearchDocument) => void;
  onAuthorClick: (scopusAuthorId: string, name: string) => void;
};

function ExplorePaperCard({
  item,
  index,
  selectedAuthor,
  highlightTokens,
  showFieldBadge = true,
  onSelect,
  onAuthorClick,
}: PaperCardProps) {
  return (
    <Card
      key={item._id || index}
      className="hover:shadow-elegant transition-smooth cursor-pointer border-border"
      onClick={() => onSelect(item)}
    >
      <CardHeader>
        <div className="flex items-start justify-between mb-2">
          <Badge variant="secondary">{item.document_type}</Badge>
          {showFieldBadge && item.field_associated && (
            <Badge variant="outline" className="text-xs">
              {item.field_associated}
            </Badge>
          )}
        </div>
        <CardTitle className="text-base sm:text-xl mb-2 leading-snug">
          {highlightTerms(item.title, highlightTokens)}
        </CardTitle>
        <ExploreCardAuthorsLine
          authors={item.authors}
          selectedAuthor={selectedAuthor}
          onAuthorClick={onAuthorClick}
        />
      </CardHeader>
      <CardContent>
        {item.abstract && (
          <p className="text-muted-foreground mb-4 line-clamp-3">
            {highlightTerms(formatAbstract(item.abstract), highlightTokens)}
          </p>
        )}

        <div className="flex items-center justify-between pt-4 border-t border-border">
          <div className="flex items-center space-x-4 text-sm text-muted-foreground">
            <div className="flex items-center space-x-1">
              <FileText className="h-4 w-4" />
              <span>{item.publication_year || "N/A"}</span>
            </div>
            <div className="flex items-center space-x-1">
              <Users className="h-4 w-4" />
              <span>{item.citation_count || 0} citations</span>
            </div>
          </div>
        </div>

        {item.subject_area && item.subject_area.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-3">
            {item.subject_area.slice(0, 3).map((area, idx) => (
              <Badge key={idx} variant="outline" className="text-xs">
                {area}
              </Badge>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

type ExplorePaperListProps = {
  results: SearchDocument[];
  groupByDepartment: boolean;
  selectedAuthor: SelectedAuthor;
  highlightTokens: string[];
  isDeptExpanded: (dept: string) => boolean;
  toggleDepartment: (dept: string) => void;
  onSelectDocument: (doc: SearchDocument) => void;
  onAuthorClick: (scopusAuthorId: string, name: string) => void;
};

export function ExplorePaperList({
  results,
  groupByDepartment,
  selectedAuthor,
  highlightTokens,
  isDeptExpanded,
  toggleDepartment,
  onSelectDocument,
  onAuthorClick,
}: ExplorePaperListProps) {
  if (results.length === 0) return null;

  if (!groupByDepartment) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {results.map((item, index) => (
          <ExplorePaperCard
            key={item._id || index}
            item={item}
            index={index}
            selectedAuthor={selectedAuthor}
            highlightTokens={highlightTokens}
            onSelect={onSelectDocument}
            onAuthorClick={onAuthorClick}
          />
        ))}
      </div>
    );
  }

  const groupedByDept = results.reduce(
    (groups, item) => {
      const dept = item.field_associated || "Other";
      if (!groups[dept]) groups[dept] = [];
      groups[dept].push(item);
      return groups;
    },
    {} as Record<string, SearchDocument[]>
  );

  const sortedDepartments = Object.keys(groupedByDept).sort((a, b) => {
    if (a === "Other") return 1;
    if (b === "Other") return -1;
    return a.localeCompare(b);
  });

  return (
    <div className="space-y-6">
      {sortedDepartments.map((department) => (
        <div
          key={department}
          className="rounded-xl border border-border/50 bg-card/50 overflow-hidden shadow-sm hover:shadow-md transition-shadow"
        >
          <button
            onClick={() => toggleDepartment(department)}
            className="w-full flex items-center gap-3 p-4 hover:bg-muted/50 transition-colors"
          >
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Building className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 text-left">
              <h2 className="text-lg font-bold text-foreground">{department}</h2>
              <p className="text-xs text-muted-foreground">
                {groupedByDept[department].length} research papers
              </p>
            </div>
            <Badge variant="secondary" className="mr-2">
              {groupedByDept[department].length}
            </Badge>
            <ChevronDown
              className={`h-5 w-5 text-muted-foreground transition-transform duration-300 ${
                isDeptExpanded(department) ? "rotate-180" : ""
              }`}
            />
          </button>

          <div
            className={`transition-all duration-300 ease-in-out overflow-hidden ${
              isDeptExpanded(department) ? "max-h-[5000px] opacity-100" : "max-h-0 opacity-0"
            }`}
          >
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 p-4 pt-0">
              {groupedByDept[department].map((item, index) => (
                <ExplorePaperCard
                  key={item._id || index}
                  item={item}
                  index={index}
                  selectedAuthor={selectedAuthor}
                  highlightTokens={highlightTokens}
                  showFieldBadge={false}
                  onSelect={onSelectDocument}
                  onAuthorClick={onAuthorClick}
                />
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
