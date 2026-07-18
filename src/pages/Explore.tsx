import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Filter, FileText, Users, Loader2, X, ChevronDown, ChevronRight, Building } from "lucide-react";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import ExploreSearchLoader from "@/components/ExploreSearchLoader";
import ExploreThemeChips from "@/components/explore/taxonomy/ExploreThemeChips";
import { SearchSuggestions } from "@/components/SearchSuggestions";
import {
  PeopleSectionHeader,
  PeopleFacultyRow,
  PeopleDepartmentBlock,
  PeopleListContainer,
  PeopleLoadingState,
  PeopleEmptyState,
  PeopleLoadMoreSentinel,
} from "@/components/explore/PeopleSectionUI";
import { ExploreDocumentModal } from "@/components/explore/ExploreDocumentModal";
import { ExplorePaperList } from "@/components/explore/ExplorePaperList";
import { useExploreSearchState } from "@/hooks/explore/useExploreSearchState";
import { useExplorePeople } from "@/hooks/explore/useExplorePeople";
import { useExploreResults } from "@/hooks/explore/useExploreResults";

const Explore = () => {
  const search = useExploreSearchState();
  const {
    searchQuery, setSearchQuery, refinementChain, currentPage,
    showSuggestions, setShowSuggestions, suggestionsRef, searchBoxRef,
    selectedAuthor, setSelectedAuthor, authorScopedPage, setAuthorScopedPage,
    activeFilter, setActiveFilter, showFilters, setShowFilters,
    searchMode, clientSort, setClientSort,
    baseQuery, activeQuery, hasSearched,
    searchHistory, removeSearchLog, clearSearchLog,
    suggestData, isSuggestFetching, recentQueries,
    yearFrom, setYearFrom, yearTo, setYearTo, perPage, setPerPage, searchIn,
    searchData, isLoading, authorScopedData, isAuthorScopedLoading, isAuthorScopedFetching,
    allFacultyData, isAllFacultyLoading, results, pagination, relatedFaculty,
    clearAll, goToChainLevel, popRefinement, changeMode, goToPage, performSearch,
    handleSearchKeyDown, selectAuthorSuggestion, selectPaperSuggestion, selectRecentSuggestion,
    applyFilters, clearFilters, replayRecentSearch,
  } = search;

  const people = useExplorePeople({
    relatedFaculty,
    allFacultyData,
    isAllFacultyLoading,
    selectedAuthor,
    setSelectedAuthor,
    setAuthorScopedPage,
  });
  const {
    PEOPLE_PER_PAGE, groupByDepartment, setGroupByDepartment,
    isPeopleSidebarOpen, setIsPeopleSidebarOpen,
    showAllFaculty, setShowAllFaculty, isPeopleLoadingMore,
    peoplePage, setPeoplePage, sidebarWidth, isResizingState,
    leftColRef, containerRef, peopleSentinelRef, peopleHasMoreRef,
    startResizing, peopleTotalCount, toggleDepartment, isDeptExpanded,
    openRelatedFacultyProfile, openAggregatedFacultyProfile,
    handleAuthorClickByScopus,
  } = people;

  const { selectedDocument, setSelectedDocument, filteredResults, sortedResults, highlightTokens } =
    useExploreResults({
      results,
      activeFilter,
      clientSort,
      selectedAuthor,
      authorScopedData,
      refinementChain,
    });


  return (
    <div className="min-h-screen page-bg flex flex-col">
      <Navigation />

      
      <section className="gradient-subtle pt-16 sm:pt-20 pb-6 sm:pb-10 section-bg">
        <div className="container mx-auto px-4">
          <h1 className="text-2xl sm:text-4xl font-bold mb-2 sm:mb-3 animate-fade-in">
            Explore Research
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground mb-4 sm:mb-6 max-w-2xl animate-slide-up">
            Browse faculty, publications, departments and interdisciplinary initiatives at IIT Delhi.
          </p>

          
          <div className="flex flex-col gap-3 items-start animate-slide-up max-w-[800px]">
            
            <div className="flex flex-col sm:flex-row gap-3 items-center w-full">
              
              <div className="relative flex-1 w-full" ref={searchBoxRef}>
                <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none z-10">
                  {searchIn.length === 1 && searchIn[0] === 'author'
                    ? <Users className="w-5 h-5 text-primary/70" />
                    : <Search className="w-5 h-5 text-foreground/60" />}
                </div>
                <Input
                  type="text"
                  placeholder={
                    searchIn.length === 1 && searchIn[0] === 'author'
                      ? "Search by author name..."
                      : hasSearched
                        ? `Narrow within "${activeQuery}"... (step ${refinementChain.length + 1})`
                        : "Search by department, project, faculty, or keywords..."
                  }
                  className={`pl-12 pr-24 h-14 text-base rounded-xl border-2 focus:border-primary bg-background backdrop-blur-sm ${
                    searchIn.length === 1 && searchIn[0] === 'author' ? 'border-primary/30' : ''
                  }`}
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); setShowSuggestions(true); }}
                  onFocus={() => setShowSuggestions(true)}
                  onKeyDown={handleSearchKeyDown}
                  autoComplete="off"
                  role="combobox"
                  aria-expanded={showSuggestions}
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-16 top-1/2 -translate-y-1/2 p-1.5 rounded-full hover:bg-muted transition-colors"
                    aria-label="Clear input"
                  >
                    <X className="w-4 h-4 text-muted-foreground" />
                  </button>
                )}
                <Button
                  onClick={() => { setShowSuggestions(false); performSearch(1); }}
                  className="absolute right-2 top-1/2 -translate-y-1/2"
                  disabled={isLoading}
                  size="icon"
                >
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                </Button>

                
                {showSuggestions && (
                  <div className="absolute left-0 right-0 top-full mt-2 z-50">
                    <SearchSuggestions
                      ref={suggestionsRef}
                      query={searchQuery}
                      data={suggestData}
                      isLoading={isSuggestFetching}
                      recent={recentQueries}
                      onSelectAuthor={selectAuthorSuggestion}
                      onSelectPaper={selectPaperSuggestion}
                      onSelectRecent={selectRecentSuggestion}
                      onClose={() => setShowSuggestions(false)}
                    />
                  </div>
                )}
              </div>

              
              <div className="flex items-center shrink-0 w-full sm:w-auto">
                <div className="flex bg-muted rounded-xl p-1 shadow-sm border border-border h-14 items-center w-full sm:w-auto">
                  <button
                    onClick={() => changeMode('basic')}
                    className={`flex-1 sm:flex-none px-4 py-2 text-sm rounded-lg font-medium transition-all duration-200 ${
                      searchMode === 'basic'
                        ? 'bg-primary text-primary-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                    title="BM25 Keyword matching only"
                  >
                    Basic
                  </button>
                  <button
                    onClick={() => changeMode('advanced')}
                    className={`flex-1 sm:flex-none px-4 py-2 text-sm rounded-lg font-medium transition-all duration-200 ${
                      searchMode === 'advanced'
                        ? 'bg-primary text-primary-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                    title="Hybrid Keyword + AI Semantic matching"
                  >
                    Advanced
                  </button>
                </div>
              </div>

              
              <div className="relative w-full sm:w-auto">
                <Button
                  variant={showFilters ? "default" : "outline"}
                  onClick={() => setShowFilters(!showFilters)}
                  className="gap-2 h-14 px-6 w-full sm:w-auto rounded-xl border-2 relative"
                >
                  <Filter className="h-5 w-5" />
                  <span className="font-medium text-base">Filters</span>
                  {(() => {
                    const count = (yearFrom ? 1 : 0) + (yearTo ? 1 : 0) + (activeFilter !== 'All' ? 1 : 0) + (perPage !== 20 ? 1 : 0);
                    return count > 0 ? (
                      <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center shadow-sm">{count}</span>
                    ) : null;
                  })()}
                  <ChevronDown className={`h-4 w-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
                </Button>

                
                {showFilters && (
                  <div className="absolute left-0 sm:left-auto sm:right-0 top-full mt-2 z-50 w-[calc(100vw-2rem)] sm:w-[420px] bg-card border border-border rounded-xl shadow-xl p-5 space-y-4 animate-slide-up">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-muted-foreground">Year From</label>
                        <Input
                          type="number"
                          placeholder="2020"
                          value={yearFrom}
                          onChange={(e) => setYearFrom(e.target.value)}
                          min="1900"
                          max="2025"
                          className="h-9"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-muted-foreground">Year To</label>
                        <Input
                          type="number"
                          placeholder="2024"
                          value={yearTo}
                          onChange={(e) => setYearTo(e.target.value)}
                          min="1900"
                          max="2025"
                          className="h-9"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-muted-foreground">Per Page</label>
                        <select
                          className="w-full px-3 py-2 h-9 text-sm border border-input rounded-md bg-background"
                          value={perPage}
                          onChange={(e) => setPerPage(parseInt(e.target.value))}
                        >
                          <option value="10">10</option>
                          <option value="20">20</option>
                          <option value="50">50</option>
                        </select>
                      </div>
                    </div>

                    <div className="flex gap-2 pt-1">
                      <Button onClick={() => { applyFilters(); setShowFilters(false); }} size="sm">Apply</Button>
                      <Button variant="outline" onClick={clearFilters} size="sm">Clear</Button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            
            {!hasSearched && searchHistory.length > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold tracking-wider uppercase text-muted-foreground shrink-0">
                  Recent:
                </span>
                {searchHistory.slice(0, 5).map((entry) => (
                  <button
                    key={entry.timestamp}
                    type="button"
                    onClick={() => replayRecentSearch(entry)}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-background text-foreground border border-border hover:border-primary/40 hover:bg-primary/5 transition-colors"
                    title={
                      entry.refineWithin
                        ? `Refined "${entry.refineWithin}" to match "${entry.query}"`
                        : `Search "${entry.query}"`
                    }
                  >
                    <Search className="w-3 h-3 text-muted-foreground" />
                    <span className="truncate max-w-[180px]">{entry.query}</span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeSearchLog(entry.timestamp);
                      }}
                      aria-label={`Remove "${entry.query}" from recent searches`}
                      className="ml-0.5 rounded-full p-0.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </button>
                ))}
                <button
                  type="button"
                  onClick={clearSearchLog}
                  className="text-[11px] text-muted-foreground hover:text-destructive underline-offset-2 hover:underline transition-colors"
                >
                  Clear history
                </button>
              </div>
            )}

            
            {hasSearched && (
              <div className="flex flex-wrap items-center gap-1.5 w-full">
                <span className="text-xs font-semibold tracking-wider uppercase text-muted-foreground shrink-0 mr-0.5">
                  {refinementChain.length > 1 ? 'Narrowing:' : 'Searching:'}
                </span>
                <nav aria-label="Refinement steps" className="flex flex-wrap items-center gap-1.5 min-w-0">
                  {refinementChain.map((term, i) => {
                    const isNewest = i === refinementChain.length - 1;
                    return (
                      <div key={`${term}-${i}`} className="flex items-center gap-1.5 animate-fade-in">
                        {i > 0 && <ChevronRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />}
                        <span
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-sm font-medium shadow-sm transition-colors ${
                            isNewest
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-secondary text-secondary-foreground hover:bg-secondary/70 cursor-pointer'
                          }`}
                        >
                          {isNewest ? (
                            <span className="truncate max-w-[220px]">{term}</span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => goToChainLevel(i)}
                              title={`Back to results for "${term}"`}
                              aria-label={`Go back to step ${i + 1}: ${term}`}
                              className="truncate max-w-[220px] focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
                            >
                              {term}
                            </button>
                          )}
                          {isNewest && refinementChain.length > 1 && (
                            <button
                              type="button"
                              onClick={popRefinement}
                              aria-label={`Remove last refinement "${term}"`}
                              className="ml-0.5 rounded-full hover:bg-white/20 p-0.5 transition-colors"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </span>
                      </div>
                    );
                  })}
                </nav>
                <button
                  type="button"
                  onClick={clearAll}
                  className="ml-1 text-[11px] text-muted-foreground hover:text-destructive underline-offset-2 hover:underline transition-colors shrink-0"
                >
                  Clear all
                </button>
              </div>
            )}

            
            {(activeFilter !== 'All' || yearFrom || yearTo) && (
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-xs text-muted-foreground mr-0.5">Active:</span>
                {activeFilter !== 'All' && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-secondary text-secondary-foreground border border-border">
                    {activeFilter}
                    <button onClick={() => setActiveFilter('All')} className="hover:text-destructive"><X className="w-3 h-3" /></button>
                  </span>
                )}
                {(yearFrom || yearTo) && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-secondary text-secondary-foreground border border-border">
                    {yearFrom || '...'} – {yearTo || '...'}
                    <button onClick={() => { setYearFrom(''); setYearTo(''); }} className="hover:text-destructive"><X className="w-3 h-3" /></button>
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        
        {hasSearched && !isLoading && refinementChain.length > 1 && (() => {
          const total = selectedAuthor && authorScopedData
            ? (authorScopedData.pagination?.total ?? 0)
            : (pagination?.total ?? 0);
          return (
            <div className="container mx-auto px-4 mt-6 max-w-[800px] animate-slide-up">
              <div className="flex items-center justify-between bg-primary/5 border border-primary/20 rounded-lg px-4 py-2.5">
                <p className="text-xs text-muted-foreground">
                  Narrowed through <span className="font-semibold text-foreground">{refinementChain.length}</span> steps
                  {selectedAuthor && <> within <span className="font-semibold text-primary">{selectedAuthor.name}</span>'s papers</>}
                  {' — '}
                  <span className="font-semibold text-foreground">{total}</span> result{total === 1 ? '' : 's'}
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={popRefinement}
                  className="ml-3 shrink-0 text-muted-foreground hover:text-foreground hover:bg-muted"
                >
                  <X className="h-4 w-4 mr-1" />
                  Undo last step
                </Button>
              </div>
            </div>
          );
        })()}
      </section>

      
      {showFilters && (
        <div className="fixed inset-0 z-40" onClick={() => setShowFilters(false)} />
      )}

      
      <section className="container mx-auto px-4 pt-4 pb-16 flex-1">
        
        {isLoading && <ExploreSearchLoader query={activeQuery} />}

        
        {!hasSearched && !isLoading && (
          <div className="flex flex-col items-center justify-center text-center pt-10 pb-10 sm:pt-16 sm:pb-14">
            <div className="w-14 h-14 rounded-2xl bg-muted/60 flex items-center justify-center mb-4 border border-border/40">
              <Search className="h-7 w-7 text-muted-foreground/60" />
            </div>
            <h3 className="text-lg font-semibold mb-1.5 text-foreground">Start Your Search</h3>
            <p className="text-sm text-muted-foreground max-w-xs">Enter a keyword, faculty name, or topic above to explore IIT Delhi's research</p>

            <div className="mt-10 w-full">
              <p className="text-sm font-medium text-foreground mb-3">Or browse by research area</p>
              <ExploreThemeChips />
            </div>
          </div>
        )}

        
        {hasSearched && !isLoading && filteredResults.length === 0 && (
          <div className="flex flex-col items-center justify-center text-center pt-10 pb-8 sm:pt-16 sm:pb-12">
            <div className="w-14 h-14 rounded-2xl bg-muted/60 flex items-center justify-center mb-4 border border-border/40">
              <FileText className="h-7 w-7 text-muted-foreground/60" />
            </div>
            <h3 className="text-lg font-semibold mb-1.5">No Results Found</h3>
            <p className="text-sm text-muted-foreground">Try different keywords or adjust your filters</p>
          </div>
        )}

        
        {hasSearched && !isLoading && (filteredResults.length > 0 || relatedFaculty.length > 0 || (allFacultyData?.total_faculty ?? 0) > 0) && (
          <div 
            ref={containerRef}
            className={`flex flex-col xl:flex-row items-start ${isPeopleSidebarOpen ? 'gap-0' : 'gap-4'}`}
            style={{ '--sidebar-width': `${sidebarWidth}%` } as React.CSSProperties}
          >
            
            
            <div 
              className={`relative shrink-0 flex items-stretch ${!isResizingState ? 'transition-all duration-300 ease-in-out' : ''} ${isPeopleSidebarOpen ? 'w-full xl:w-[var(--sidebar-width)]' : 'w-full xl:w-8'}`}
            >
        <div
          ref={leftColRef}
          className={`w-full flex flex-col gap-4 pt-1 xl:sticky xl:top-6 xl:max-h-[calc(100vh-3rem)]`}
        >
          <PeopleSectionHeader
            count={peopleTotalCount}
            isOpen={isPeopleSidebarOpen}
            onToggle={() => setIsPeopleSidebarOpen(!isPeopleSidebarOpen)}
          />

          <div className={`flex flex-col xl:flex-1 xl:min-h-0 transition-all duration-300 overflow-hidden pr-0 sm:pr-4 ${isPeopleSidebarOpen ? 'opacity-100' : 'opacity-0 hidden'}`}>
          <>
            
            {(showAllFaculty || relatedFaculty.length === 0) ? (() => {
              if (isAllFacultyLoading) {
                return <PeopleLoadingState />;
              }

              if (!allFacultyData || allFacultyData.total_faculty === 0) {
                return (
                  <PeopleEmptyState
                    title="No Authors Found"
                    description="No matched faculty found across all results"
                  />
                );
              }

              const allFacultyFlat = allFacultyData.departments.flatMap(dept =>
                dept.faculty.map(f => ({ ...f, department: dept.name, deptCount: allFacultyData.departments.find(d => d.name === dept.name)?.faculty.length || 0 }))
              );
              const visibleCount = peoplePage * PEOPLE_PER_PAGE;
              const visibleFaculty = allFacultyFlat.slice(0, visibleCount);
              const hasMore = visibleCount < allFacultyFlat.length;

              const deptOrder: string[] = [];
              const groupedVisible: Record<string, { items: typeof visibleFaculty; totalInDept: number }> = {};
              visibleFaculty.forEach(f => {
                if (!groupedVisible[f.department]) {
                  groupedVisible[f.department] = { items: [], totalInDept: f.deptCount };
                  deptOrder.push(f.department);
                }
                groupedVisible[f.department].items.push(f);
              });

              return (
                <>
                  <div className="shrink-0 mb-4 mt-2">
                    <p className="text-muted-foreground">
                      Found <span className="font-semibold text-primary">{allFacultyData.total_faculty}</span> faculty across all {allFacultyData.total_matching_papers.toLocaleString()} matching papers{' '}
                      {relatedFaculty.length > 0 && (
                        <button
                          className="text-primary hover:underline font-medium text-sm"
                          onClick={() => { setShowAllFaculty(false); setPeoplePage(1); }}
                        >
                          (Show results from this page)
                        </button>
                      )}
                    </p>
                  </div>
                  <PeopleListContainer>
                    {(() => { peopleHasMoreRef.current = hasMore; return null; })()}
                    {deptOrder.map(department => (
                      <PeopleDepartmentBlock
                        key={department}
                        department={department}
                        count={groupedVisible[department].totalInDept}
                      >
                        {groupedVisible[department].items.map((faculty) => {
                          const isSelected = selectedAuthor?.author_id === faculty.author_id;
                          return (
                            <PeopleFacultyRow
                              key={faculty.author_id}
                              name={faculty.name}
                              paperCount={faculty.paper_count}
                              isSelected={isSelected}
                              onSelect={() => {
                                setSelectedAuthor(isSelected ? null : { name: faculty.name, author_id: faculty.author_id });
                                setAuthorScopedPage(1);
                              }}
                              onViewProfile={() => void openAggregatedFacultyProfile(faculty.author_id, faculty.name)}
                            />
                          );
                        })}
                      </PeopleDepartmentBlock>
                    ))}

                    {hasMore && (
                      <PeopleLoadMoreSentinel sentinelRef={peopleSentinelRef} isLoading={isPeopleLoadingMore} />
                    )}
                    {!hasMore && allFacultyFlat.length > PEOPLE_PER_PAGE && (
                      <p className="text-xs text-center text-muted-foreground py-2">All {allFacultyFlat.length} faculty shown</p>
                    )}
                  </PeopleListContainer>
                </>
              );
            })() : (() => {
              /* From Results mode - uses related_faculty from search response + expert_id */

              if (relatedFaculty.length === 0) {
                return (
                  <PeopleEmptyState
                    title="No Authors Found"
                    description="No IIT Delhi affiliated authors found in the current page results"
                  />
                );
              }

              // Enrich related_faculty with precise paper counts from allFacultyData.
              // Use the higher of (From Results) vs (Show All) count — the "From Results"
              // count is kerberos-aware (MongoDB hydrated) while "Show All" relies on
              // OpenSearch aggregations which may not have kerberos indexed yet.
              const enrichedFaculty = relatedFaculty.map(f => {
                let preciseCount = f.paperCount;
                if (allFacultyData?.departments) {
                  for (const dept of allFacultyData.departments) {
                    const found = dept.faculty.find(af => af.author_id === f.expert_id);
                    if (found) {
                      preciseCount = Math.max(preciseCount, found.paper_count);
                      break;
                    }
                  }
                }
                return { ...f, paperCount: preciseCount };
              });

              const deptGroups: Record<string, { faculty: typeof enrichedFaculty; totalCount: number }> = {};
              enrichedFaculty.forEach(faculty => {
                const dept = faculty.department?.name || 'Unknown';
                if (!deptGroups[dept]) deptGroups[dept] = { faculty: [], totalCount: 0 };
                deptGroups[dept].faculty.push(faculty);
                deptGroups[dept].totalCount += faculty.paperCount;
              });

              const sortedDepts = Object.keys(deptGroups).sort((a, b) => {
                const countDiff = deptGroups[b].totalCount - deptGroups[a].totalCount;
                if (countDiff !== 0) return countDiff;
                return a.localeCompare(b);
              });

              const allFacultyFlat = sortedDepts.flatMap(dept =>
                deptGroups[dept].faculty.map(f => ({ faculty: f, department: dept }))
              );
              const visibleCount = peoplePage * PEOPLE_PER_PAGE;
              const visibleItems = allFacultyFlat.slice(0, visibleCount);
              const hasMore = visibleCount < allFacultyFlat.length;

              const deptOrder: string[] = [];
              const groupedVisible: Record<string, typeof enrichedFaculty> = {};
              visibleItems.forEach(item => {
                if (!groupedVisible[item.department]) {
                  groupedVisible[item.department] = [];
                  deptOrder.push(item.department);
                }
                groupedVisible[item.department].push(item.faculty);
              });

              return (
                <>
                  <div className="shrink-0 mb-4 mt-2">
                    <p className="text-muted-foreground">
                      Found <span className="font-semibold text-primary">{enrichedFaculty.length}</span> faculty on this page{' '}
                      <button
                        className="text-primary hover:underline font-medium text-sm"
                        onClick={() => { setShowAllFaculty(true); setPeoplePage(1); }}
                      >
                        (show all)
                      </button>
                    </p>
                  </div>
                  <PeopleListContainer>
                    {(() => { peopleHasMoreRef.current = hasMore; return null; })()}
                    {deptOrder.map(department => (
                      <PeopleDepartmentBlock
                        key={department}
                        department={department}
                        count={deptGroups[department].faculty.length}
                      >
                        {groupedVisible[department].map((faculty) => {
                          const facultyAuthorId = faculty.expert_id || '';
                          const isSelected = selectedAuthor?.author_id === facultyAuthorId;
                          return (
                            <PeopleFacultyRow
                              key={faculty._id}
                              name={faculty.name}
                              paperCount={faculty.paperCount}
                              isSelected={isSelected}
                              onSelect={() => {
                                setSelectedAuthor(isSelected ? null : { name: faculty.name, author_id: facultyAuthorId });
                                setAuthorScopedPage(1);
                              }}
                              onViewProfile={() => void openRelatedFacultyProfile(faculty)}
                            />
                          );
                        })}
                      </PeopleDepartmentBlock>
                    ))}

                    {hasMore && (
                      <PeopleLoadMoreSentinel sentinelRef={peopleSentinelRef} isLoading={isPeopleLoadingMore} />
                    )}
                    {!hasMore && allFacultyFlat.length > PEOPLE_PER_PAGE && (
                      <p className="text-xs text-center text-muted-foreground py-2">All {allFacultyFlat.length} faculty shown</p>
                    )}
                  </PeopleListContainer>
                </>
              );
            })()}
        </>
          </div>
        </div>

        {isPeopleSidebarOpen && (
          <div
            onMouseDown={startResizing}
            className="group w-4 cursor-col-resize hidden xl:flex justify-center z-10 shrink-0 py-4"
            style={{ marginRight: '-8px', marginLeft: '-8px' }}
          >
            <div className="h-full w-[2px] bg-border/60 group-hover:bg-primary/50 group-active:bg-primary transition-colors rounded-full" />
          </div>
        )}
        </div>

        
            <div className={`transition-all duration-300 w-full flex-1 ${isPeopleSidebarOpen ? 'xl:pl-8' : 'xl:pl-4'} border-t xl:border-t-0 xl:border-l border-border pt-6 sm:pt-8 xl:pt-0 space-y-4 sm:space-y-6`}>
              <div className="flex items-center gap-2 mb-2 border-b border-border pb-4">
                <FileText className="h-5 w-5 text-primary" />
                <h2 className="text-2xl font-bold text-foreground">Research Papers</h2>
              </div>

              
              {selectedAuthor && (
                <div className="flex items-center justify-between bg-primary/5 border border-primary/20 rounded-lg px-4 py-3 animate-slide-up">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground">
                      {refinementChain.length > 1 ? (
                        <>Showing <span className="font-semibold text-primary">{selectedAuthor.name}</span>'s papers matching "<span className="text-primary">{activeQuery}</span>" within "<span className="text-primary">{baseQuery}</span>" <span className="text-muted-foreground ml-1">({searchMode} mode)</span></>
                      ) : (
                        <>Showing results for "<span className="text-primary">{baseQuery}</span>" matched with <span className="font-semibold text-primary">{selectedAuthor.name}</span>'s works <span className="text-muted-foreground ml-1">({searchMode} mode)</span></>
                      )}
                    </p>
                    {authorScopedData && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {authorScopedData.author.total_papers} total papers by this author · {authorScopedData.pagination?.total ?? 0} relevant to your query
                      </p>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedAuthor(null)}
                    className="ml-3 shrink-0"
                  >
                    <X className="h-4 w-4 mr-1" />
                    Clear
                  </Button>
                </div>
              )}

              
              {selectedAuthor && (isAuthorScopedLoading || isAuthorScopedFetching) && (
                <div className="flex flex-col items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary mb-3" />
                  <p className="text-sm text-muted-foreground">
                    {refinementChain.length > 1 ? `Refining within ${selectedAuthor.name}'s papers...` : `Searching ${selectedAuthor.name}'s papers...`}
                  </p>
                </div>
              )}
              
              
              {sortedResults.length > 0 && (
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-muted-foreground">
                    {selectedAuthor && authorScopedData ? (
                      <>Found <span className="font-semibold text-primary">{authorScopedData.pagination?.total ?? 0}</span> matching papers</>
                    ) : pagination ? (
                      searchData?.fuzzy_fallback ? (
                        // Fuzzy-fallback state: no papers cleared the relevance bar, so this count is
                        // the APPROXIMATE (lexical) corpus — labelled distinctly so it doesn't read as
                        // the relevant total the People sidebar describes.
                        <>No exact matches — showing <span className="font-semibold text-primary">{pagination.total.toLocaleString()}</span> approximate results</>
                      ) : (
                        <>Found <span className="font-semibold text-primary">{pagination.total.toLocaleString()}</span> results</>
                      )
                    ) : null}
                  </p>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">Sort by:</span>
                      <select
                        value={clientSort}
                        onChange={(e) => setClientSort(e.target.value as 'relevance' | 'citations')}
                        className="h-9 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                      >
                        <option value="relevance">{selectedAuthor ? 'Similarity' : 'Relevance'}</option>
                        <option value="citations">Citations</option>
                      </select>
                    </div>
                    {!selectedAuthor && (
                      <Button
                        variant={groupByDepartment ? "default" : "outline"}
                        size="sm"
                        onClick={() => setGroupByDepartment(!groupByDepartment)}
                        className="gap-2 hidden md:flex"
                      >
                        <Building className="h-4 w-4" />
                        {groupByDepartment ? "Grouped by Dept" : "Group by Dept"}
                      </Button>
                    )}
                  </div>
                </div>
              )}

              
              {selectedAuthor && authorScopedData && authorScopedData.results.length === 0 && !isAuthorScopedLoading && !isAuthorScopedFetching && (
                <div className="text-center py-12 bg-accent-light border border-accent rounded-lg">
                  <FileText className="h-10 w-10 mx-auto text-muted-foreground mb-3 opacity-50" />
                  <h3 className="text-lg font-semibold mb-1">No Matching Papers</h3>
                  <p className="text-sm text-muted-foreground px-4">
                    {selectedAuthor.name} has {authorScopedData.author.total_papers} papers, but none closely match "{activeQuery}"
                  </p>
                </div>
              )}

              
              {sortedResults.length > 0 && (
                <ExplorePaperList
                  results={sortedResults}
                  groupByDepartment={groupByDepartment && !selectedAuthor}
                  selectedAuthor={selectedAuthor}
                  highlightTokens={highlightTokens}
                  isDeptExpanded={isDeptExpanded}
                  toggleDepartment={toggleDepartment}
                  onSelectDocument={setSelectedDocument}
                  onAuthorClick={handleAuthorClickByScopus}
                />
              )}

              {!selectedAuthor && pagination && pagination.total_pages > 1 && (
          <div className="flex flex-wrap justify-center items-center gap-2 mt-8 mb-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => goToPage(1)}
              disabled={currentPage === 1}
              className="hidden sm:inline-flex"
            >
              First
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => goToPage(currentPage - 1)}
              disabled={currentPage === 1}
            >
              ‹ Prev
            </Button>

            
            {Array.from(
              { length: Math.min(5, pagination.total_pages) },
              (_, i) => {
                const startPage = Math.max(1, currentPage - 2);
                const pageNum = startPage + i;
                if (pageNum <= pagination.total_pages) {
                  return (
                    <Button
                      key={pageNum}
                      size="sm"
                      variant={pageNum === currentPage ? "default" : "outline"}
                      onClick={() => goToPage(pageNum)}
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
              size="sm"
              onClick={() => goToPage(currentPage + 1)}
              disabled={currentPage === pagination.total_pages}
            >
              Next ›
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => goToPage(pagination.total_pages)}
              disabled={currentPage === pagination.total_pages}
              className="hidden sm:inline-flex"
            >
              Last
            </Button>

            <span className="text-sm text-muted-foreground ml-4 hidden sm:inline-block">
              Page {currentPage} of {pagination.total_pages}
            </span>
          </div>
        )}

        
        {selectedAuthor && authorScopedData && (authorScopedData.pagination?.total_pages ?? 0) > 1 && (
          <div className="flex flex-wrap justify-center items-center gap-2 mt-8 mb-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAuthorScopedPage(1)}
              disabled={authorScopedPage === 1}
              className="hidden sm:inline-flex"
            >
              First
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAuthorScopedPage(p => p - 1)}
              disabled={authorScopedPage === 1}
            >
              ‹ Prev
            </Button>

            {Array.from(
              { length: Math.min(5, authorScopedData.pagination?.total_pages ?? 0) },
              (_, i) => {
                const startPage = Math.max(1, authorScopedPage - 2);
                const pageNum = startPage + i;
                const scopedTotalPages = authorScopedData.pagination?.total_pages ?? 0;
                if (pageNum <= scopedTotalPages) {
                  return (
                    <Button
                      key={pageNum}
                      size="sm"
                      variant={pageNum === authorScopedPage ? "default" : "outline"}
                      onClick={() => setAuthorScopedPage(pageNum)}
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
              size="sm"
              onClick={() => setAuthorScopedPage(p => p + 1)}
              disabled={authorScopedPage === (authorScopedData.pagination?.total_pages ?? 0)}
            >
              Next ›
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAuthorScopedPage(authorScopedData.pagination?.total_pages ?? 1)}
              disabled={authorScopedPage === (authorScopedData.pagination?.total_pages ?? 0)}
              className="hidden sm:inline-flex"
            >
              Last
            </Button>

            <span className="text-sm text-muted-foreground ml-4 hidden sm:inline-block">
              Page {authorScopedPage} of {authorScopedData.pagination?.total_pages ?? 0}
            </span>
          </div>
        )}
        </div> 
        
        </div>
        )}

      </section>

      
      {selectedDocument && (
        <ExploreDocumentModal
          document={selectedDocument}
          selectedAuthor={selectedAuthor}
          highlightTokens={highlightTokens}
          onClose={() => setSelectedDocument(null)}
          onAuthorClick={handleAuthorClickByScopus}
        />
      )}

      <Footer />
    </div>
  );
};

export default Explore;
