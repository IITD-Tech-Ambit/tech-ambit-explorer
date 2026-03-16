import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search, Filter, FileText, Users, Building, Loader2, X, ExternalLink, Compass, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import FacultyModal from "@/components/directory/FacultyModal";
import { useSearchResearch, fetchOpenPath, fetchFullResearchDocument, type SearchRequest, type SearchDocument, type RelatedFaculty } from "@/lib/api";
import type { DirectoryFaculty } from "@/lib/api/types";

const Explore = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Initialize search state from URL params for persistence across navigation
  const [searchQuery, setSearchQuery] = useState(() => searchParams.get('q') || "");
  const [submittedQuery, setSubmittedQuery] = useState(() => searchParams.get('q') || "");
  const [isNavigating, setIsNavigating] = useState(false);
  const [currentPage, setCurrentPage] = useState(() => {
    const page = searchParams.get('page');
    return page ? parseInt(page, 10) : 1;
  });
  const [selectedDocument, setSelectedDocument] = useState<SearchDocument | null>(null);

  // State for filtering papers by author
  const [selectedAuthor, setSelectedAuthor] = useState<string | null>(null);

  // Faculty modal state for People tab
  const [selectedPeopleFaculty, setSelectedPeopleFaculty] = useState<DirectoryFaculty | null>(null);
  const [facultyModalOpen, setFacultyModalOpen] = useState(false);

  // Filter state - initialize from URL params
  const [activeFilter, setActiveFilter] = useState(() => searchParams.get('filter') || "All");
  const [showFilters, setShowFilters] = useState(false);

  // Group by department toggle - persisted in localStorage
  const [groupByDepartment, setGroupByDepartment] = useState<boolean>(() => {
    const saved = localStorage.getItem('explore-group-by-dept');
    return saved === 'true'; // Default is false (API order)
  });

  // Save groupByDepartment preference to localStorage
  useEffect(() => {
    localStorage.setItem('explore-group-by-dept', String(groupByDepartment));
  }, [groupByDepartment]);

  // Client-side sort state
  const [clientSort, setClientSort] = useState<'relevance' | 'citations'>('relevance');

  // Collapsible department sections state (by default all expanded)
  const [expandedDepts, setExpandedDepts] = useState<Record<string, boolean>>({});

  // Sidebar toggle state
  const [isPeopleSidebarOpen, setIsPeopleSidebarOpen] = useState(true);
  const [peopleSortBy, setPeopleSortBy] = useState("Departments");
  const [sidebarWidth, setSidebarWidth] = useState(24); // percentage width
  const isResizing = useRef(false);
  const [isResizingState, setIsResizingState] = useState(false);
  const leftColRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const startResizing = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isResizing.current = true;
    setIsResizingState(true);
    document.body.style.cursor = 'col-resize';
    // Disable user selection while dragging
    document.body.style.userSelect = 'none';
  }, []);

  const stopResizing = useCallback(() => {
    isResizing.current = false;
    setIsResizingState(false);
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  }, []);

  const resize = useCallback((mouseMoveEvent: MouseEvent) => {
    if (isResizing.current && leftColRef.current && containerRef.current) {
      const containerWidth = containerRef.current.clientWidth;
      const rect = leftColRef.current.getBoundingClientRect();
      // Mouse X relative to the left edge of the sidebar
      const newWidthPx = mouseMoveEvent.clientX - rect.left;
      const newWidth = (newWidthPx / containerWidth) * 100;

      if (newWidth >= 16 && newWidth <= 32) {
        setSidebarWidth(newWidth);
      }
    }
  }, []);

  useEffect(() => {
    window.addEventListener("mousemove", resize);
    window.addEventListener("mouseup", stopResizing);
    return () => {
      window.removeEventListener("mousemove", resize);
      window.removeEventListener("mouseup", stopResizing);
    };
  }, [resize, stopResizing]);

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
  // Initialize sortBy from URL params
  const [sortBy, setSortBy] = useState<"relevance" | "date" | "citations">(() => {
    const sort = searchParams.get('sort');
    return (sort === 'date' || sort === 'citations') ? sort : 'relevance';
  });
  const [perPage, setPerPage] = useState(20);
  const [searchIn, setSearchIn] = useState<Array<'title' | 'abstract' | 'author' | 'subject_area' | 'field'>>([]);

  const filters = [
    "All",
    "Article",
    "Review",
    "Conference Paper",
    "Book Chapter",
  ];

  // Build search request - only when submittedQuery is set
  const searchRequest = useMemo<SearchRequest | null>(() => {
    if (!submittedQuery.trim()) return null;
    
    const request: SearchRequest = {
      query: submittedQuery,
      page: currentPage,
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

    console.log('Built searchRequest:', request);
    return request;
  }, [submittedQuery, currentPage, perPage, sortBy, yearFrom, yearTo, activeFilter, searchIn]);

  // Use React Query for search
  const { data: searchData, isLoading, isFetching } = useSearchResearch(searchRequest);

  // Derived state from query
  const results = searchData?.results || [];
  const pagination = searchData?.pagination || null;
  const relatedFaculty = searchData?.related_faculty || [];
  const hasSearched = !!submittedQuery.trim();

  // Perform search - update query and reset page, sync to URL
  const performSearch = (page: number = 1) => {
    if (!searchQuery.trim()) return;
    console.log('performSearch called:', { searchQuery, page });
    setSubmittedQuery(searchQuery);
    setCurrentPage(page);
    setSelectedAuthor(null);
    
    // Sync to URL params for persistence across navigation
    const newParams = new URLSearchParams();
    newParams.set('q', searchQuery);
    newParams.set('page', String(page));
    if (activeFilter !== 'All') newParams.set('filter', activeFilter);
    if (sortBy !== 'relevance') newParams.set('sort', sortBy);
    setSearchParams(newParams, { replace: true });
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

  // Toggle department expansion (default is expanded)
  const toggleDepartment = (dept: string) => {
    setExpandedDepts(prev => ({
      ...prev,
      [dept]: prev[dept] === undefined ? false : !prev[dept]
    }));
  };

  // Check if department is expanded (default true)
  const isDeptExpanded = (dept: string) => expandedDepts[dept] !== false;

  // Handle faculty click in People tab - convert to DirectoryFaculty format
  const handleFacultyClick = (faculty: RelatedFaculty) => {
    const directoryFaculty: DirectoryFaculty = {
      _id: faculty._id,
      name: faculty.name,
      email: faculty.email,
      citationCount: 0, // Will be fetched by modal
      hIndex: 0,        // Will be fetched by modal
      research_areas: [],
      department: {
        _id: faculty.department?._id || '',
        name: faculty.department?.name || 'Unknown',
        code: ''
      }
    };
    setSelectedPeopleFaculty(directoryFaculty);
    setFacultyModalOpen(true);
  };

  // Handle navigate to mind map
  const handleNavigateToMindMap = async (documentId: string) => {
    setIsNavigating(true);
    try {
      // Step 1: Fetch full research document
      const fullDocument = await fetchFullResearchDocument(documentId);
      
      // Step 2: Fetch open path
      const pathResponse = await fetchOpenPath(fullDocument);
      
      // Step 3: Navigate to mind map with path
      navigate('/mindmap', { state: { navigationPath: pathResponse } });
    } catch (error) {
      console.error('Error navigating to mind map:', error);
      alert('Failed to navigate to mind map. Please ensure the research paper has a matched IIT Delhi faculty profile.');
    } finally {
      setIsNavigating(false);
    }
  };


  // Filter results based on activeFilter (for display purposes)
  const filteredResults = useMemo(() => {
    const base = activeFilter === "All"
      ? results
      : results.filter((item) => item.document_type === activeFilter);
    return base;
  }, [activeFilter, results]);

  // Sort results client-side based on clientSort and selectedAuthor filter
  const sortedResults = useMemo(() => {
    // Determine the list of papers to display (filter by selected author if any)
    const finalResults = selectedAuthor 
      ? filteredResults.filter(item => 
          item.authors?.some(a => {
             // Comparing lowercased names since author_name is the field
             const paperAuthorName = (a.author_name || a.name || '').toLowerCase();
             const filterName = selectedAuthor.toLowerCase();
             // Partial match in case of slight formatting differences, or strict equality
             return paperAuthorName.includes(filterName) || filterName.includes(paperAuthorName);
          })
        )
      : [...filteredResults];
      
    if (clientSort === 'citations') {
      return finalResults.sort((a, b) => (b.citation_count || 0) - (a.citation_count || 0));
    }
    // For 'relevance', keep original API order
    return finalResults;
  }, [filteredResults, clientSort, selectedAuthor]);

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
            <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none z-10">
              <Search className="w-5 h-5 text-foreground/60" />
            </div>
            <Input
              type="text"
              placeholder="Search by department, project, faculty, or keywords..."
              className="pl-12 pr-24 h-14 text-base rounded-xl border-2 focus:border-primary bg-background backdrop-blur-sm"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={handleKeyPress}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-16 top-1/2 -translate-y-1/2 p-1.5 rounded-full hover:bg-muted transition-colors"
              >
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            )}
            <Button
              onClick={() => performSearch(1)}
              className="absolute right-2 top-1/2 -translate-y-1/2"
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

      {/* Research Items Grid Layout */}
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

        {/* Results Layout Grid */}
        {hasSearched && !isLoading && (filteredResults.length > 0 || relatedFaculty.length > 0) && (
          <div 
            ref={containerRef}
            className={`flex flex-col xl:flex-row items-start ${isPeopleSidebarOpen ? 'gap-0' : 'gap-4'}`}
            style={{ '--sidebar-width': `${sidebarWidth}%` } as React.CSSProperties}
          >
            
            {/* Left Column - People Section */}
            <div 
              className={`relative shrink-0 flex items-stretch ${!isResizingState ? 'transition-all duration-300 ease-in-out' : ''} ${isPeopleSidebarOpen ? 'w-full xl:w-[var(--sidebar-width)]' : 'w-full xl:w-8'}`}
            >
        <div 
          ref={leftColRef}
          className={`w-full space-y-6 pt-1`}
        >
          <div className={`flex items-center gap-2 mb-2 border-b border-border pb-4 ${isPeopleSidebarOpen ? 'justify-between pr-4' : 'justify-center border-transparent xl:border-border'}`}>
            <div className={`flex items-center gap-2 ${!isPeopleSidebarOpen && 'xl:hidden'}`}>
              <Users className="h-5 w-5 text-primary" />
              <h2 className="text-2xl font-bold text-foreground">People</h2>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="shrink-0"
              onClick={() => setIsPeopleSidebarOpen(!isPeopleSidebarOpen)}
              title={isPeopleSidebarOpen ? "Collapse People Sidebar" : "Expand People Sidebar"}
            >
              {isPeopleSidebarOpen ? <ChevronLeft className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
            </Button>
          </div>
          
          <div className={`transition-all duration-300 overflow-hidden pr-4 ${isPeopleSidebarOpen ? 'opacity-100 max-h-[5000px]' : 'opacity-0 max-h-0'}`}>
          <>
            <div className="mb-4 mt-2 flex items-center justify-start gap-3">
              <label className="text-sm font-medium text-muted-foreground whitespace-nowrap">Sort By</label>
              <select
                className="px-3 py-1.5 border border-input rounded-md bg-background text-sm w-[130px] shrink-0"
                value={peopleSortBy}
                onChange={(e) => setPeopleSortBy(e.target.value)}
              >
                <option value="Departments">Departments</option>
                <option value="Relevance">Relevance</option>
              </select>
            </div>

            {peopleSortBy === "Relevance" ? (() => {
              const allowedAffiliations = [
                'Indian Institute of Technology Delhi',
                'Indian Institute of Technology Delhi, New Delhi, India',
                'Indian Institute of Technology Delhi-Abu Dhabi',
                'Indian Institute of Technology Delhi-Abu Dhabi, Abu Dhabi, United Arab Emirates'
              ];

              // Track IITD author frequencies
              const authorCounts = new Map<string, {name: string; count: number}>();

              filteredResults.forEach(item => {
                if (item.authors) {
                  item.authors.forEach(a => {
                    const affiliation = a.author_affiliation || a.affiliation || '';
                    if (allowedAffiliations.includes(affiliation)) {
                      // Normalize the original name strictly to ensure we group properly
                      const rawName = a.author_name || a.name || '';
                      if (!rawName) return;
                      // Just taking a simple title-case formatting to avoid duplicated random casings
                      const formattedName = rawName.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ');
                      
                      const existing = authorCounts.get(formattedName);
                      if (existing) {
                        existing.count += 1;
                      } else {
                        authorCounts.set(formattedName, { name: formattedName, count: 1 });
                      }
                    }
                  });
                }
              });

              const sortedAuthors = Array.from(authorCounts.values()).sort((a, b) => {
                if (b.count !== a.count) {
                  return b.count - a.count; // Decending count
                }
                return a.name.localeCompare(b.name); // Alphabetical fallback
              });

              if (sortedAuthors.length > 0) {
                return (
                  <div className="space-y-2">
                    <div className="mb-4">
                      <p className="text-muted-foreground">
                        Found <span className="font-semibold text-primary">{sortedAuthors.length}</span> related IITD authors
                      </p>
                    </div>
                    <ul className="space-y-3 pl-2">
                      {sortedAuthors.map((author) => {
                        const isSelected = selectedAuthor === author.name;
                        return (
                          <li key={author.name}>
                            <button
                              onClick={() => setSelectedAuthor(isSelected ? null : author.name)}
                              className={`text-sm text-left flex items-start justify-between w-full transition-colors ${
                                isSelected 
                                  ? "text-primary font-semibold" 
                                  : "text-muted-foreground hover:text-primary"
                              }`}
                            >
                              <div className="flex items-start">
                                <span className="shrink-0 mr-2 mt-[2px]">•</span>
                                <span>{author.name}</span>
                              </div>
                              <span className={`text-xs ml-2 rounded-full px-2 py-0.5 ${isSelected ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>{author.count}</span>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                );
              }

              return (
                <div className="text-center py-10 bg-accent-light border border-accent rounded-lg">
                  <Users className="h-10 w-10 mx-auto text-muted-foreground mb-3 opacity-50" />
                  <h3 className="text-lg font-semibold mb-1">No IITD Authors Found</h3>
                  <p className="text-sm text-muted-foreground px-4">No IIT Delhi affiliated authors found in the current search results</p>
                </div>
              );

            })() : (() => {
              const allowedAffiliations = [
                'Indian Institute of Technology Delhi',
                'Indian Institute of Technology Delhi, New Delhi, India',
                'Indian Institute of Technology Delhi-Abu Dhabi',
                'Indian Institute of Technology Delhi-Abu Dhabi, Abu Dhabi, United Arab Emirates'
              ];
              // Map all valid IITD faculty names explicitly stated on the papers
              const iitdAuthorsMap = new Map<string, string>();
              filteredResults.forEach(item => {
                if (item.authors) {
                  item.authors.forEach(a => {
                    if (allowedAffiliations.includes(a.author_affiliation || a.affiliation || '')) {
                      const rawName = a.author_name || a.name || '';
                      if (rawName) {
                        const formattedName = rawName.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ');
                        iitdAuthorsMap.set(rawName.toLowerCase(), formattedName);
                      }
                    }
                  });
                }
              });

              // Intersect related faculty subset
              const filteredRelatedFaculty = relatedFaculty.filter(faculty => 
                iitdAuthorsMap.has((faculty.name || '').toLowerCase())
              );

              // Gather names already included in the official faculty directory
              const matchedFacultyNames = new Set(filteredRelatedFaculty.map(f => (f.name || '').toLowerCase()));

              // Add the authors from papers that weren't in the official faculty list
              const unmatchedAuthors: typeof relatedFaculty = [];
              iitdAuthorsMap.forEach((formattedName, lowerName) => {
                if (!matchedFacultyNames.has(lowerName)) {
                  unmatchedAuthors.push({
                    _id: 'unmatched-' + lowerName,
                    name: formattedName,
                    department: { name: 'Other', _id: 'other' },
                    email: '',
                    paperCount: 0,
                  });
                }
              });

              const allFacultyToRender = [...filteredRelatedFaculty, ...unmatchedAuthors];

              if (allFacultyToRender.length > 0) {
                // Group faculty by department
                const groupedByDepartment = allFacultyToRender.reduce((groups, faculty) => {
                const dept = faculty.department?.name || 'Other';
                if (!groups[dept]) {
                  groups[dept] = [];
                }
                groups[dept].push(faculty);
                return groups;
              }, {} as Record<string, typeof relatedFaculty>);

              // Sort departments by number of professors (descending), then alphabetically
              const sortedDepartments = Object.keys(groupedByDepartment).sort((a, b) => {
                if (a === 'Other') return 1;
                if (b === 'Other') return -1;
                const countDiff = groupedByDepartment[b].length - groupedByDepartment[a].length;
                if (countDiff !== 0) return countDiff;
                return a.localeCompare(b);
              });

              return (
                <>
                  <div className="mb-6">
                    <p className="text-muted-foreground">
                      Found <span className="font-semibold text-primary">{allFacultyToRender.length}</span> related IITD authors
                    </p>
                  </div>
                  <div className="space-y-6">
                    {sortedDepartments.map((department) => (
                      <div key={department} className="mb-2">
                        {/* Department Header */}
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="text-sm font-semibold text-foreground">
                            {department} <span className="text-xs font-normal text-muted-foreground ml-1">({groupedByDepartment[department].length})</span>
                          </h3>
                        </div>

                        {/* Faculty List */}
                        <ul className="space-y-2 pl-4">
                          {[...groupedByDepartment[department]].sort((a, b) => (a.name || '').localeCompare(b.name || '')).map((faculty) => {
                            const isSelected = selectedAuthor === faculty.name;
                            return (
                            <li key={faculty._id}>
                              <button
                                onClick={() => setSelectedAuthor(isSelected ? null : faculty.name)}
                                className={`text-sm text-left flex items-start w-full transition-colors ${
                                  isSelected 
                                    ? "text-primary font-semibold" 
                                    : "text-muted-foreground hover:text-primary"
                                }`}
                              >
                                <span className="shrink-0 mr-2">•</span>
                                <span>{faculty.name}</span>
                              </button>
                            </li>
                            );
                          })}
                        </ul>
                      </div>
                    ))}
                  </div>
                </>
              );
            }

            return (
              <div className="text-center py-10 bg-accent-light border border-accent rounded-lg">
                <Users className="h-10 w-10 mx-auto text-muted-foreground mb-3 opacity-50" />
                <h3 className="text-lg font-semibold mb-1">No Faculty Found</h3>
                <p className="text-sm text-muted-foreground px-4">No matched IIT Delhi faculty profiles for these search results</p>
              </div>
            );
          })()}
        </>
          </div>
        </div>
        
        {/* Resizer Handle */}
        {isPeopleSidebarOpen && (
          <div
            onMouseDown={startResizing}
            className="group w-4 cursor-col-resize hidden xl:flex justify-center z-10 shrink-0 py-4"
            style={{ marginRight: '-8px', marginLeft: '-8px' }}
          >
            <div className="h-full w-[2px] bg-border/60 group-hover:bg-primary/50 group-active:bg-primary transition-colors rounded-full" />
          </div>
        )}
        </div> {/* End Left Column */}

        {/* Right Column - Research Papers */}
            <div className={`transition-all duration-300 w-full flex-1 ${isPeopleSidebarOpen ? 'xl:pl-8' : 'xl:pl-4'} border-t xl:border-t-0 xl:border-l border-border pt-8 xl:pt-0 space-y-6`}>
              <div className="flex items-center gap-2 mb-2 border-b border-border pb-4">
                <FileText className="h-5 w-5 text-primary" />
                <h2 className="text-2xl font-bold text-foreground">Research Papers</h2>
              </div>
              
              {/* Results Header - Websites Tab */}
              {filteredResults.length > 0 && pagination && (
                <div className="flex items-center justify-between">
                  <p className="text-muted-foreground">
                    Found <span className="font-semibold text-primary">{pagination.total.toLocaleString()}</span> results
                  </p>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">Sort by:</span>
                      <select
                        value={clientSort}
                        onChange={(e) => setClientSort(e.target.value as 'relevance' | 'citations')}
                        className="h-9 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                      >
                        <option value="relevance">Relevance</option>
                        <option value="citations">Citations</option>
                      </select>
                    </div>
                    <Button
                      variant={groupByDepartment ? "default" : "outline"}
                      size="sm"
                      onClick={() => setGroupByDepartment(!groupByDepartment)}
                      className="gap-2 hidden md:flex"
                    >
                      <Building className="h-4 w-4" />
                      {groupByDepartment ? "Grouped by Dept" : "Group by Dept"}
                    </Button>
                  </div>
                </div>
              )}

              {/* Results Grid - Websites Tab - Flat List (Sorted by clientSort) */}
              {sortedResults.length > 0 && !groupByDepartment && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {sortedResults.map((item, index) => (
              <Card
                key={item._id || index}
                className="hover:shadow-elegant transition-smooth cursor-pointer border-border"
                onClick={() => setSelectedDocument(item)}
              >
                <CardHeader>
                  <div className="flex items-start justify-between mb-2">
                    <Badge variant="secondary">{item.document_type}</Badge>
                    {item.field_associated && (
                      <Badge variant="outline" className="text-xs">
                        {item.field_associated}
                      </Badge>
                    )}
                  </div>
                  <CardTitle className="text-xl mb-2">{item.title}</CardTitle>
                  {item.authors && item.authors.length > 0 && (() => {
                    const allowedAffiliations = [
                      'Indian Institute of Technology Delhi',
                      'Indian Institute of Technology Delhi, New Delhi, India',
                      'Indian Institute of Technology Delhi-Abu Dhabi',
                      'Indian Institute of Technology Delhi-Abu Dhabi, Abu Dhabi, United Arab Emirates'
                    ];
                    const iitdAuthors = item.authors.filter(a =>
                      allowedAffiliations.includes(a.author_affiliation || a.affiliation || '')
                    );
                    
                    if (iitdAuthors.length === 0) return null;
                    
                    return (
                      <p className="text-sm text-muted-foreground">
                        <span className="font-semibold text-primary/80 mr-1">IITD Authors:</span>
                        {iitdAuthors.slice(0, 3).map(a => a.author_name || a.name).join(", ")}
                        {iitdAuthors.length > 3 && ` +${iitdAuthors.length - 3} more`}
                      </p>
                    );
                  })()}
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
        )}

        {/* Results Grid - Websites Tab - Grouped by Department */}
        {sortedResults.length > 0 && groupByDepartment && (() => {
          // Group results by department (field_associated)
          const groupedByDept = sortedResults.reduce((groups, item) => {
            const dept = item.field_associated || 'Other';
            if (!groups[dept]) {
              groups[dept] = [];
            }
            groups[dept].push(item);
            return groups;
          }, {} as Record<string, typeof sortedResults>);

          // Sort departments alphabetically
          const sortedDepartments = Object.keys(groupedByDept).sort((a, b) => {
            if (a === 'Other') return 1;
            if (b === 'Other') return -1;
            return a.localeCompare(b);
          });

          return (
            <div className="space-y-6">
              {sortedDepartments.map((department) => (
                <div key={department} className="rounded-xl border border-border/50 bg-card/50 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                  {/* Department Header - Clickable */}
                  <button
                    onClick={() => toggleDepartment(department)}
                    className="w-full flex items-center gap-3 p-4 hover:bg-muted/50 transition-colors"
                  >
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Building className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 text-left">
                      <h2 className="text-lg font-bold text-foreground">{department}</h2>
                      <p className="text-xs text-muted-foreground">{groupedByDept[department].length} research papers</p>
                    </div>
                    <Badge variant="secondary" className="mr-2">
                      {groupedByDept[department].length}
                    </Badge>
                    <ChevronDown 
                      className={`h-5 w-5 text-muted-foreground transition-transform duration-300 ${
                        isDeptExpanded(department) ? 'rotate-180' : ''
                      }`} 
                    />
                  </button>

                  {/* Papers Grid for this Department - Collapsible */}
                  <div
                    className={`transition-all duration-300 ease-in-out overflow-hidden ${
                      isDeptExpanded(department) ? 'max-h-[5000px] opacity-100' : 'max-h-0 opacity-0'
                    }`}
                  >
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 p-4 pt-0">
                      {groupedByDept[department].map((item, index) => (
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
                            {item.authors && item.authors.length > 0 && (() => {
                              const allowedAffiliations = [
                                'Indian Institute of Technology Delhi',
                                'Indian Institute of Technology Delhi, New Delhi, India',
                                'Indian Institute of Technology Delhi-Abu Dhabi',
                                'Indian Institute of Technology Delhi-Abu Dhabi, Abu Dhabi, United Arab Emirates'
                              ];
                              const iitdAuthors = item.authors.filter(a =>
                                allowedAffiliations.includes(a.author_affiliation || a.affiliation || '')
                              );
                              
                              if (iitdAuthors.length === 0) return null;
                              
                              return (
                                <p className="text-sm text-muted-foreground">
                                  <span className="font-semibold text-primary/80 mr-1">IITD Authors:</span>
                                  {iitdAuthors.slice(0, 3).map(a => a.author_name || a.name).join(", ")}
                                  {iitdAuthors.length > 3 && ` +${iitdAuthors.length - 3} more`}
                                </p>
                              );
                            })()}
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
                </div>
              ))}
            </div>
          );
        })()}

        {/* Pagination - Websites Tab */}
        {pagination && pagination.total_pages > 1 && (
          <div className="flex justify-center items-center gap-2 mt-8 mb-4">
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

            <span className="text-sm text-muted-foreground ml-4 hidden sm:inline-block">
              Page {currentPage} of {pagination.total_pages}
            </span>
          </div>
        )}
        </div> {/* End Right Column */}
        
        </div> /* End Full Grid */
        )}

      </section>

      {/* Document Detail Modal */}
      {selectedDocument && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedDocument(null)}
        >
          <div
            className="bg-background rounded-lg shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header - Fixed */}
            <div className="flex items-start justify-between p-6 border-b border-border shrink-0">
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
              {selectedDocument.authors && selectedDocument.authors.length > 0 && (() => {
                const allowedAffiliations = [
                  'Indian Institute of Technology Delhi',
                  'Indian Institute of Technology Delhi, New Delhi, India',
                  'Indian Institute of Technology Delhi-Abu Dhabi',
                  'Indian Institute of Technology Delhi-Abu Dhabi, Abu Dhabi, United Arab Emirates'
                ];
                const iitdAuthors = selectedDocument.authors.filter(a =>
                  allowedAffiliations.includes(a.author_affiliation || a.affiliation || '')
                );
                
                if (iitdAuthors.length === 0) return null;
                
                return (
                  <div>
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase mb-3">IITD Authors</h3>
                    <div className="flex flex-wrap gap-2">
                      {iitdAuthors.map((author, idx) => (
                        <div key={idx} className="bg-accent-light border border-accent rounded-md px-3 py-2">
                          <div className="font-medium text-sm">{author.author_name || author.name}</div>
                          {(author.author_affiliation || author.affiliation) && (
                            <div className="text-xs text-muted-foreground">{author.author_affiliation || author.affiliation}</div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}

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
            <div className="flex justify-end gap-2 p-6 border-t border-border shrink-0 bg-background">
              <Button
                onClick={() => handleNavigateToMindMap(selectedDocument._id)}
                disabled={isNavigating}
                className="gap-2"
                variant="default"
              >
                {isNavigating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Navigating...
                  </>
                ) : (
                  <>
                    <Compass className="h-4 w-4" />
                    Navigate to Mind Map
                  </>
                )}
              </Button>
              {selectedDocument.link && (
                <Button
                  onClick={() => window.open(selectedDocument.link, '_blank', 'noopener,noreferrer')}
                  className="gap-2"
                  variant="secondary"
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

      {/* Faculty Detail Modal for People Tab */}
      <FacultyModal
        faculty={selectedPeopleFaculty}
        open={facultyModalOpen}
        onClose={() => {
          setFacultyModalOpen(false);
          setSelectedPeopleFaculty(null);
        }}
      />

      <Footer />
    </div>
  );
};

export default Explore;
