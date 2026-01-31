import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search, Filter, FileText, Users, Building, Loader2, X, ExternalLink } from "lucide-react";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { searchResearch, type SearchRequest, type SearchDocument, type SearchResponse, type RelatedFaculty } from "@/lib/api";

const Explore = () => {
  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<SearchDocument[]>([]);
  const [pagination, setPagination] = useState<SearchResponse['pagination'] | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasSearched, setHasSearched] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<SearchDocument | null>(null);
  const [relatedFaculty, setRelatedFaculty] = useState<RelatedFaculty[]>([]);

  // Tab state
  const [activeTab, setActiveTab] = useState<'websites' | 'people'>('websites');

  // Filter state
  const [activeFilter, setActiveFilter] = useState("All");
  const [showFilters, setShowFilters] = useState(false);

  // Disable body scroll when modal is open
  useEffect(() => {
    if (selectedDocument) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    // Cleanup on unmount
    return () => {
      document.body.style.overflow = '';
    };
  }, [selectedDocument]);
  const [yearFrom, setYearFrom] = useState("");
  const [yearTo, setYearTo] = useState("");
  const [sortBy, setSortBy] = useState<"relevance" | "date" | "citations">("relevance");
  const [perPage, setPerPage] = useState(20);
  const [searchIn, setSearchIn] = useState<Array<'title' | 'abstract' | 'author' | 'subject_area' | 'field'>>([]);

  const filters = [
    "All",
    "Article",
    "Review",
    "Conference Paper",
    "Book Chapter",
  ];

  // Perform search
  const performSearch = async (page: number = 1) => {
    if (!searchQuery.trim()) return;

    setIsLoading(true);
    setHasSearched(true);

    try {
      const request: SearchRequest = {
        query: searchQuery,
        page,
        per_page: perPage,
        sort: sortBy,
        filters: {},
        search_in: searchIn.length > 0 && searchIn.length < 5 ? searchIn : undefined,
      };

      // Add year filters
      if (yearFrom) request.filters!.year_from = parseInt(yearFrom);
      if (yearTo) request.filters!.year_to = parseInt(yearTo);

      // Add document type filter
      if (activeFilter !== "All") {
        request.filters!.document_type = activeFilter;
      }

      const response = await searchResearch(request);
      console.log('Search response:', response);
      console.log('Related faculty:', response.related_faculty);
      // DEBUG: Log faculty department data
      if (response.related_faculty?.length > 0) {
        console.log('First faculty department:', response.related_faculty[0].department);
        console.log('Faculty with departments:', response.related_faculty.filter(f => f.department).length);
      }
      setResults(response.results);
      setRelatedFaculty(response.related_faculty || []);
      setPagination(response.pagination);
      setCurrentPage(page);
    } catch (error) {
      console.error("Search error:", error);
      setResults([]);
      setPagination(null);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle search on Enter key
  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      performSearch(1);
    }
  };

  // Handle filter change
  const handleFilterChange = (filter: string) => {
    setActiveFilter(filter);
  };

  // Apply filters
  const applyFilters = () => {
    if (searchQuery.trim()) {
      performSearch(1);
    }
  };

  // Clear filters
  const clearFilters = () => {
    setYearFrom("");
    setYearTo("");
    setSortBy("relevance");
    setPerPage(20);
    setSearchIn([]);
    setActiveFilter("All");
    if (searchQuery.trim()) {
      performSearch(1);
    }
  };

  // Toggle search field chips
  const toggleSearchIn = (field: 'title' | 'abstract' | 'author' | 'subject_area' | 'field') => {
    setSearchIn(prev => {
      if (prev.includes(field)) {
        return prev.filter(f => f !== field);
      } else {
        return [...prev, field];
      }
    });
  };

  // Filter results based on activeFilter (for display purposes)
  const filteredResults = activeFilter === "All"
    ? results
    : results.filter((item) => item.document_type === activeFilter);

  return (
    <div className="min-h-screen page-bg">
      <Navigation />

      {/* Header */}
      <section className="gradient-subtle pt-32 pb-16 section-bg">
        <div className="container mx-auto px-4">
          <h1 className="text-5xl font-bold mb-4 animate-fade-in">
            Explore Research
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-3xl animate-slide-up">
            Browse through our comprehensive repository of research projects, departments,
            centers, and interdisciplinary initiatives at IIT Delhi.
          </p>

          {/* Search Bar */}
          <div className="relative max-w-2xl animate-slide-up">
            <Input
              type="text"
              placeholder="Search by department, project, faculty, or keywords..."
              className="h-12 text-base search-input pr-16"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={handleKeyPress}
            />
            <Button
              onClick={() => performSearch(1)}
              className="absolute right-2 top-1/2 transform -translate-y-1/2"
              disabled={isLoading}
              size="icon"
            >
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </section>

      {/* Filters */}
      <section className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-2">
            <Button
              variant={showFilters ? "default" : "outline"}
              onClick={() => setShowFilters(!showFilters)}
              className="gap-2"
            >
              <Filter className="h-5 w-5" />
              <span className="font-medium">Filter by</span>
            </Button>
          </div>
        </div>

        {/* Advanced Filters Panel */}
        {showFilters && (
          <div className="bg-card border border-border rounded-lg p-4 space-y-4 animate-slide-up">
            {/* Year and Sort Filters */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Year From</label>
                <Input
                  type="number"
                  placeholder="2020"
                  value={yearFrom}
                  onChange={(e) => setYearFrom(e.target.value)}
                  min="1900"
                  max="2025"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Year To</label>
                <Input
                  type="number"
                  placeholder="2024"
                  value={yearTo}
                  onChange={(e) => setYearTo(e.target.value)}
                  min="1900"
                  max="2025"
                />
              </div>
              {/* <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Sort By</label>
                <select
                  className="w-full px-3 py-2 border border-input rounded-md bg-background"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                >
                  <option value="relevance">Relevance</option>
                  <option value="date">Date</option>
                  <option value="citations">Citations</option>
                </select>
              </div>/ */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Per Page</label>
                <select
                  className="w-full px-3 py-2 border border-input rounded-md bg-background"
                  value={perPage}
                  onChange={(e) => setPerPage(parseInt(e.target.value))}
                >
                  <option value="10">10</option>
                  <option value="20">20</option>
                  <option value="50">50</option>
                </select>
              </div>
            </div>

            {/* Search In Fields */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Search In</label>
              <div className="flex flex-wrap gap-2">
                {[
                  { field: 'title' as const, label: '📝 Title' },
                  { field: 'abstract' as const, label: '📄 Abstract' },
                  { field: 'author' as const, label: '👤 Author' },
                  { field: 'subject_area' as const, label: '🏷️ Subject Area' },
                  { field: 'field' as const, label: '🔬 Field' },
                ].map(({ field, label }) => (
                  <Button
                    key={field}
                    variant={searchIn.includes(field) ? "default" : "outline"}
                    size="sm"
                    onClick={() => toggleSearchIn(field)}
                    className="rounded-full"
                  >
                    {label}
                  </Button>
                ))}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2">
              <Button onClick={applyFilters}>Apply Filters</Button>
              <Button variant="outline" onClick={clearFilters}>Clear Filters</Button>
            </div>
          </div>
        )}
      </section>

      {/* Tabs - Only show after search */}
      {hasSearched && !isLoading && (
        <section className="container mx-auto px-4">
          <div className="flex items-center gap-1 mb-6">
            <button
              onClick={() => setActiveTab('websites')}
              className={`px-6 py-2 text-sm font-medium rounded-t-lg transition-colors ${activeTab === 'websites'
                ? 'bg-[#1e3a5f] text-white'
                : 'bg-[#1e3a5f]/80 text-white/80 hover:bg-[#1e3a5f]/90'
                }`}
            >
              Research Papers
            </button>
            <button
              onClick={() => setActiveTab('people')}
              className={`px-6 py-2 text-sm font-medium rounded-t-lg transition-colors ${activeTab === 'people'
                ? 'bg-[#1e3a5f] text-white'
                : 'bg-[#1e3a5f]/80 text-white/80 hover:bg-[#1e3a5f]/90'
                }`}
            >
              People
            </button>
          </div>
        </section>
      )}

      {/* Research Items Grid */}
      <section className="container mx-auto px-4 pb-20">
        {/* Loading State */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">Searching research papers...</p>
          </div>
        )}

        {/* No Search Yet */}
        {!hasSearched && !isLoading && (
          <div className="text-center py-20">
            <Search className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">Start Your Search</h3>
            <p className="text-muted-foreground">Enter a query above to find research papers</p>
          </div>
        )}

        {/* No Results */}
        {hasSearched && !isLoading && filteredResults.length === 0 && (
          <div className="text-center py-20">
            <FileText className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">No Results Found</h3>
            <p className="text-muted-foreground">Try different keywords or adjust your filters</p>
          </div>
        )}

        {/* Results Header - Websites Tab */}
        {hasSearched && !isLoading && activeTab === 'websites' && filteredResults.length > 0 && pagination && (
          <div className="mb-6">
            <p className="text-muted-foreground">
              Found <span className="font-semibold text-primary">{pagination.total.toLocaleString()}</span> results
            </p>
          </div>
        )}

        {/* Results Grid - Websites Tab - Grouped by Department */}
        {!isLoading && activeTab === 'websites' && filteredResults.length > 0 && (() => {
          // Group results by department (field_associated)
          const groupedByDepartment = filteredResults.reduce((groups, item) => {
            const dept = item.field_associated || 'Other';
            if (!groups[dept]) {
              groups[dept] = [];
            }
            groups[dept].push(item);
            return groups;
          }, {} as Record<string, typeof filteredResults>);

          // Sort departments alphabetically
          const sortedDepartments = Object.keys(groupedByDepartment).sort((a, b) => {
            if (a === 'Other') return 1;
            if (b === 'Other') return -1;
            return a.localeCompare(b);
          });

          return (
            <div className="space-y-8">
              {sortedDepartments.map((department) => (
                <div key={department} className="space-y-4">
                  {/* Department Header */}
                  <div className="flex items-center gap-3 pb-2 border-b-2 border-primary/20">
                    <Building className="h-6 w-6 text-primary" />
                    <h2 className="text-xl font-bold text-primary">{department}</h2>
                    <Badge variant="secondary" className="ml-auto">
                      {groupedByDepartment[department].length} papers
                    </Badge>
                  </div>

                  {/* Papers Grid for this Department */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {groupedByDepartment[department].map((item, index) => (
                      <Card
                        key={item._id || index}
                        className="hover:shadow-elegant transition-smooth cursor-pointer border-border"
                        onClick={() => setSelectedDocument(item)}
                      >
                        <CardHeader>
                          <div className="flex items-start justify-between mb-2">
                            <Badge variant="secondary">{item.document_type}</Badge>
                          </div>
                          <CardTitle className="text-xl mb-2">{item.title}</CardTitle>
                          {item.authors && item.authors.length > 0 && (
                            <p className="text-sm text-muted-foreground">
                              {item.authors.slice(0, 3).map(a => a.author_name || a.name).join(", ")}
                              {item.authors.length > 3 && ` +${item.authors.length - 3} more`}
                            </p>
                          )}
                        </CardHeader>
                        <CardContent>
                          {item.abstract && (
                            <p className="text-muted-foreground mb-4 line-clamp-3">{item.abstract}</p>
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
                              {item.subject_area && item.subject_area.length > 0 && (
                                <div className="flex items-center space-x-1">
                                  <Building className="h-4 w-4" />
                                  <span className="line-clamp-1">{item.subject_area[0]}</span>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Subject Area Tags */}
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
                    ))}
                  </div>
                </div>
              ))}
            </div>
          );
        })()}

        {/* Pagination - Websites Tab */}
        {pagination && pagination.total_pages > 1 && !isLoading && activeTab === 'websites' && (
          <div className="flex justify-center items-center gap-2 mt-8">
            <Button
              variant="outline"
              onClick={() => performSearch(1)}
              disabled={currentPage === 1}
            >
              First
            </Button>
            <Button
              variant="outline"
              onClick={() => performSearch(currentPage - 1)}
              disabled={currentPage === 1}
            >
              ‹ Prev
            </Button>

            {/* Page numbers */}
            {Array.from(
              { length: Math.min(5, pagination.total_pages) },
              (_, i) => {
                const startPage = Math.max(1, currentPage - 2);
                const pageNum = startPage + i;
                if (pageNum <= pagination.total_pages) {
                  return (
                    <Button
                      key={pageNum}
                      variant={pageNum === currentPage ? "default" : "outline"}
                      onClick={() => performSearch(pageNum)}
                    >
                      {pageNum}
                    </Button>
                  );
                }
                return null;
              }
            )}

            <Button
              variant="outline"
              onClick={() => performSearch(currentPage + 1)}
              disabled={currentPage === pagination.total_pages}
            >
              Next ›
            </Button>
            <Button
              variant="outline"
              onClick={() => performSearch(pagination.total_pages)}
              disabled={currentPage === pagination.total_pages}
            >
              Last
            </Button>

            <span className="text-sm text-muted-foreground ml-4">
              Page {currentPage} of {pagination.total_pages}
            </span>
          </div>
        )}

        {/* People Tab - Faculty Cards - Grouped by Department */}
        {hasSearched && !isLoading && activeTab === 'people' && (
          <>
            {relatedFaculty.length > 0 ? (() => {
              // Group faculty by department
              const groupedByDepartment = relatedFaculty.reduce((groups, faculty) => {
                const dept = faculty.department?.name || 'Other';
                if (!groups[dept]) {
                  groups[dept] = [];
                }
                groups[dept].push(faculty);
                return groups;
              }, {} as Record<string, typeof relatedFaculty>);

              // Sort departments alphabetically
              const sortedDepartments = Object.keys(groupedByDepartment).sort((a, b) => {
                if (a === 'Other') return 1;
                if (b === 'Other') return -1;
                return a.localeCompare(b);
              });

              return (
                <>
                  <div className="mb-6">
                    <p className="text-muted-foreground">
                      Found <span className="font-semibold text-primary">{relatedFaculty.length}</span> related faculty members
                    </p>
                  </div>
                  <div className="space-y-8">
                    {sortedDepartments.map((department) => (
                      <div key={department} className="space-y-4">
                        {/* Department Header */}
                        <div className="flex items-center gap-3 pb-2 border-b-2 border-primary/20">
                          <Building className="h-6 w-6 text-primary" />
                          <h2 className="text-xl font-bold text-primary">{department}</h2>
                          <Badge variant="secondary" className="ml-auto">
                            {groupedByDepartment[department].length} faculty
                          </Badge>
                        </div>

                        {/* Faculty Grid for this Department */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {groupedByDepartment[department].map((faculty) => (
                            <Card key={faculty._id} className="hover:shadow-elegant transition-smooth border-border">
                              <CardContent className="p-4">
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                                    <Users className="h-5 w-5 text-primary" />
                                  </div>
                                  <div>
                                    <h3 className="font-semibold">{faculty.name}</h3>
                                    <a href={`mailto:${faculty.email}`} className="text-sm text-primary hover:underline">
                                      {faculty.email}
                                    </a>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              );
            })() : (
              <div className="text-center py-20">
                <Users className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-xl font-semibold mb-2">No Faculty Found</h3>
                <p className="text-muted-foreground">No matched faculty profiles for the current search results</p>
              </div>
            )}
          </>
        )}
      </section>

      {/* Document Detail Modal */}
      {selectedDocument && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedDocument(null)}
        >
          <div
            className="bg-background rounded-lg shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header - Fixed */}
            <div className="flex items-start justify-between p-6 border-b border-border flex-shrink-0 shrink-0">
              <div className="flex-1 pr-4">
                <h2 className="text-2xl font-bold mb-2">{selectedDocument.title}</h2>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary">{selectedDocument.document_type}</Badge>
                  {selectedDocument.field_associated && (
                    <Badge variant="outline">{selectedDocument.field_associated}</Badge>
                  )}
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSelectedDocument(null)}
                className="shrink-0"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            {/* Modal Content */}
            <div className="overflow-y-auto flex-1 min-h-0 p-6 space-y-6">
              {/* Authors */}
              {selectedDocument.authors && selectedDocument.authors.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase mb-3">Authors</h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedDocument.authors.map((author, idx) => (
                      <div key={idx} className="bg-accent-light border border-accent rounded-md px-3 py-2">
                        <div className="font-medium text-sm">{author.author_name || author.name}</div>
                        {(author.author_affiliation || author.affiliation) && (
                          <div className="text-xs text-muted-foreground">{author.author_affiliation || author.affiliation}</div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Abstract */}
              {selectedDocument.abstract && (
                <div>
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase mb-3">Abstract</h3>
                  <p className="text-sm leading-relaxed">{selectedDocument.abstract}</p>
                </div>
              )}

              {/* Metadata */}
              <div>
                <h3 className="text-sm font-semibold text-muted-foreground uppercase mb-3">Publication Details</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">Publication Year</div>
                    <div className="font-medium">{selectedDocument.publication_year || "N/A"}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">Citations</div>
                    <div className="font-medium">{selectedDocument.citation_count || 0}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">Document Type</div>
                    <div className="font-medium">{selectedDocument.document_type}</div>
                  </div>
                  {selectedDocument.field_associated && (
                    <div>
                      <div className="text-xs text-muted-foreground mb-1">Field</div>
                      <div className="font-medium">{selectedDocument.field_associated}</div>
                    </div>
                  )}
                </div>
              </div>

              {/* Subject Areas */}
              {selectedDocument.subject_area && selectedDocument.subject_area.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase mb-3">Subject Areas</h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedDocument.subject_area.map((area, idx) => (
                      <Badge key={idx} variant="outline">{area}</Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer - Fixed at bottom */}
            <div className="flex justify-end gap-2 p-6 border-t border-border flex-shrink-0 bg-background shrink-0">
              {selectedDocument.link && (
                <Button
                  onClick={() => window.open(selectedDocument.link, '_blank', 'noopener,noreferrer')}
                  className="gap-2"
                >
                  <ExternalLink className="h-4 w-4" />
                  View Original Paper
                </Button>
              )}
              <Button variant="outline" onClick={() => setSelectedDocument(null)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
};

export default Explore;
