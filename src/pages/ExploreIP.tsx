import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Filter, Lightbulb, Loader2, X, ChevronDown, ChevronRight } from "lucide-react";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import ExploreSearchLoader from "@/components/ExploreSearchLoader";
import { ExploreModeSwitch } from "@/components/explore/ExploreModeSwitch";
import { IPPaperList } from "@/components/exploreIP/IPPaperList";
import { IPDocumentModal } from "@/components/exploreIP/IPDocumentModal";
import { IPFilterPanel } from "@/components/exploreIP/IPFilterPanel";
import { IPPagination } from "@/components/exploreIP/IPPagination";
import { IPInventorsSidebar } from "@/components/exploreIP/IPInventorsSidebar";
import { IPSearchSuggestions } from "@/components/exploreIP/IPSearchSuggestions";
import { useIPExploreState } from "@/hooks/explore/useIPExploreState";
import { useState } from "react";

/** Real, verified example queries — pulled from indexed patent titles/abstracts so the empty state is never a dead end. */
const EXAMPLE_IP_SEARCHES = ["microgrid", "battery storage", "solar cell", "biodegradable materials", "wireless sensor", "machine learning"];

/** Top real `field_of_invention` facet values (by volume) with a natural-language query that pairs with the filter for a relevant, filtered result set. */
const IP_FIELD_SHORTCUTS = [
  { label: "Electrical", value: "ELECTRICAL", query: "electrical" },
  { label: "Chemical", value: "CHEMICAL", query: "chemical" },
  { label: "Mechanical", value: "MECHANICAL ENGINEERING", query: "mechanical engineering" },
  { label: "Physics", value: "PHYSICS", query: "physics" },
  { label: "Electronics", value: "ELECTRONICS", query: "electronics" },
  { label: "Computer Science", value: "COMPUTER SCIENCE", query: "computer science" },
];

const ExploreIP = () => {
  const {
    searchQuery, setSearchQuery, refinementChain, activeQuery, highlightTokens, currentPage,
    mode, showFilters, setShowFilters,
    yearFrom, setYearFrom, yearTo, setYearTo,
    typeOfIp, setTypeOfIp, fieldOfInvention, setFieldOfInvention,
    country, setCountry,
    selectedInventor, selectInventor, selectedDocument, setSelectedDocument,
    hasSearched, isLoading, results, pagination, relatedFaculty, facets,
    showSuggestions, setShowSuggestions, suggestionsRef, searchBoxRef,
    suggestData, isSuggestFetching, selectInventorSuggestion, selectDocumentSuggestion,
    performSearch, startFreshSearch, handleSearchKeyDown, goToPage, changeMode,
    applyFilters, clearFilters, activeFilterCount, goToChainLevel, removeRefinementTerm, clearAll,
  } = useIPExploreState();

  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  /** Faculty inventor names always navigate straight to their profile — same as author names on the Scopus explore page. */
  const openFacultyProfile = (kerberos: string) => {
    window.open(`/faculty/${kerberos}`, "_blank", "noopener");
  };

  const handleInventorProfileClick = (_name: string, kerberos: string) => {
    openFacultyProfile(kerberos);
  };

  return (
    <div className="min-h-screen page-bg flex flex-col">
      <Navigation />

      <section className="gradient-subtle pt-16 sm:pt-20 pb-6 sm:pb-10 section-bg">
        <div className="container mx-auto px-4">
          <div className="mb-1.5 sm:mb-2">
            <ExploreModeSwitch active="ip" />
          </div>

          <h1 className="text-2xl sm:text-4xl font-bold mb-2 sm:mb-3 animate-fade-in">
            Explore Patents &amp; IP
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground mb-4 sm:mb-6 max-w-2xl animate-slide-up">
            Search IIT Delhi's filed patents, designs, and other intellectual property, with the faculty inventors
            behind them.
          </p>

          <div className="flex flex-col gap-3 items-start animate-slide-up max-w-[800px]">
            <div className="flex flex-col sm:flex-row gap-3 items-center w-full">
              <div className="relative flex-1 w-full" ref={searchBoxRef}>
                <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none z-10">
                  <Search className="w-5 h-5 text-foreground/60" />
                </div>
                <Input
                  type="text"
                  placeholder="Search by title, abstract, inventor, or classification..."
                  className="pl-12 pr-24 h-14 text-base rounded-xl border-2 focus:border-primary bg-background backdrop-blur-sm"
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
                    <IPSearchSuggestions
                      ref={suggestionsRef}
                      query={searchQuery}
                      data={suggestData}
                      isLoading={isSuggestFetching}
                      onSelectInventor={selectInventorSuggestion}
                      onSelectDocument={selectDocumentSuggestion}
                      onClose={() => setShowSuggestions(false)}
                    />
                  </div>
                )}
              </div>

              <div className="flex items-center shrink-0 w-full sm:w-auto">
                <div className="flex bg-muted rounded-xl p-1 shadow-sm border border-border h-14 items-center w-full sm:w-auto">
                  <button
                    onClick={() => changeMode("basic")}
                    className={`flex-1 sm:flex-none px-4 py-2 text-sm rounded-lg font-medium transition-all duration-200 ${
                      mode === "basic" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                    }`}
                    title="BM25 Keyword matching only"
                  >
                    Basic
                  </button>
                  <button
                    onClick={() => changeMode("advanced")}
                    className={`flex-1 sm:flex-none px-4 py-2 text-sm rounded-lg font-medium transition-all duration-200 ${
                      mode === "advanced" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
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
                  {activeFilterCount > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center shadow-sm">
                      {activeFilterCount}
                    </span>
                  )}
                  <ChevronDown className={`h-4 w-4 transition-transform ${showFilters ? "rotate-180" : ""}`} />
                </Button>

                {showFilters && (
                  <IPFilterPanel
                    facets={facets}
                    yearFrom={yearFrom}
                    setYearFrom={setYearFrom}
                    yearTo={yearTo}
                    setYearTo={setYearTo}
                    typeOfIp={typeOfIp}
                    setTypeOfIp={setTypeOfIp}
                    fieldOfInvention={fieldOfInvention}
                    setFieldOfInvention={setFieldOfInvention}
                    country={country}
                    setCountry={setCountry}
                    onApply={applyFilters}
                    onClear={clearFilters}
                  />
                )}
              </div>
            </div>

            {hasSearched && (
              <div className="flex flex-wrap items-center gap-1.5 w-full">
                <span className="text-xs font-semibold tracking-wider uppercase text-muted-foreground shrink-0 mr-0.5">
                  {refinementChain.length > 1 ? "Narrowing:" : "Searching:"}
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
                              ? "bg-primary text-primary-foreground"
                              : "bg-secondary text-secondary-foreground hover:bg-secondary/70 cursor-pointer"
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
                          <button
                            type="button"
                            onClick={() => removeRefinementTerm(i)}
                            title={`Remove "${term}" from the search`}
                            aria-label={`Remove refinement "${term}"`}
                            className={`ml-0.5 rounded-full p-0.5 transition-colors ${
                              isNewest ? "hover:bg-white/20" : "hover:bg-background/60"
                            }`}
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
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

            {selectedInventor && (
              <div className="flex items-center gap-2 bg-primary/5 border border-primary/20 rounded-lg px-3 py-2 animate-slide-up">
                <span className="text-sm text-foreground">
                  Scoped to inventor <span className="font-semibold text-primary">{selectedInventor.name}</span>
                </span>
                <button
                  onClick={() => selectInventor(null)}
                  className="rounded-full p-0.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                  aria-label="Clear inventor scope"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>
      </section>

      {showFilters && <div className="fixed inset-0 z-40" onClick={() => setShowFilters(false)} />}

      <section className="container mx-auto px-4 pt-4 pb-16 flex-1">
        {isLoading && <ExploreSearchLoader query={hasSearched ? activeQuery : undefined} />}

        {!hasSearched && !isLoading && (
          <div className="flex flex-col items-center justify-center text-center pt-10 pb-10 sm:pt-14 sm:pb-14">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/15 to-accent/15 ring-1 ring-primary/10 flex items-center justify-center mb-4 shadow-sm">
              <Lightbulb className="h-7 w-7 text-primary" />
            </div>
            <h3 className="text-lg font-semibold mb-1.5 text-foreground">Search Patents &amp; IP</h3>
            <p className="text-sm text-muted-foreground max-w-sm mb-8">
              Enter a keyword, inventor name, or technology area — or jump in with an example below.
            </p>

            <div className="w-full max-w-2xl">
              <p className="text-sm font-medium text-foreground mb-3">Try a search</p>
              <div className="flex flex-wrap justify-center gap-2 mb-7">
                {EXAMPLE_IP_SEARCHES.map((term) => (
                  <button
                    key={term}
                    type="button"
                    onClick={() => startFreshSearch(term)}
                    className="px-4 py-2 rounded-md bg-primary/10 text-primary text-sm font-medium border border-primary/10 hover:bg-primary/20 hover:border-primary/20 transition-colors"
                  >
                    {term}
                  </button>
                ))}
              </div>

              <p className="text-sm font-medium text-foreground mb-3">Or browse by field</p>
              <div className="flex flex-wrap justify-center gap-2">
                {IP_FIELD_SHORTCUTS.map((f) => (
                  <button
                    key={f.value}
                    type="button"
                    onClick={() => startFreshSearch(f.query, { fieldOfInvention: f.value })}
                    className="px-4 py-2 rounded-md bg-background text-muted-foreground text-sm font-medium border border-border hover:text-foreground hover:border-primary/40 hover:bg-primary/5 transition-colors"
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {hasSearched && !isLoading && results.length === 0 && (
          <div className="flex flex-col items-center justify-center text-center pt-10 pb-8 sm:pt-16 sm:pb-12">
            <div className="w-14 h-14 rounded-2xl bg-muted/60 flex items-center justify-center mb-4 border border-border/40">
              <Lightbulb className="h-7 w-7 text-muted-foreground/60" />
            </div>
            <h3 className="text-lg font-semibold mb-1.5">No Results Found</h3>
            <p className="text-sm text-muted-foreground">Try different keywords or adjust your filters</p>
          </div>
        )}

        {hasSearched && !isLoading && results.length > 0 && (
          <div className="flex flex-col xl:flex-row items-start gap-4">
            <div
              className={`relative shrink-0 flex items-stretch transition-all duration-300 ease-in-out w-full ${
                isSidebarOpen ? "xl:w-[26%]" : "xl:w-8"
              }`}
            >
              <IPInventorsSidebar
                relatedFaculty={relatedFaculty}
                selectedInventor={selectedInventor}
                onSelectInventor={selectInventor}
                onViewProfile={openFacultyProfile}
                isOpen={isSidebarOpen}
                onToggle={() => setIsSidebarOpen(!isSidebarOpen)}
              />
            </div>

            <div
              className={`transition-all duration-300 w-full flex-1 ${
                isSidebarOpen ? "xl:pl-8" : "xl:pl-4"
              } border-t xl:border-t-0 xl:border-l border-border pt-6 sm:pt-8 xl:pt-0 space-y-4 sm:space-y-6`}
            >
              <div className="flex items-center gap-2 mb-2 border-b border-border pb-4">
                <Lightbulb className="h-5 w-5 text-primary" />
                <h2 className="text-2xl font-bold text-foreground">Patents &amp; IP</h2>
              </div>

              {pagination && (
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-muted-foreground">
                    Found <span className="font-semibold text-primary">{pagination.total.toLocaleString()}</span>{" "}
                    result{pagination.total === 1 ? "" : "s"}
                  </p>
                </div>
              )}

              <IPPaperList
                results={results}
                highlightTokens={highlightTokens}
                onSelectDocument={setSelectedDocument}
                onInventorClick={handleInventorProfileClick}
              />

              {pagination && (
                <IPPagination currentPage={currentPage} totalPages={pagination.total_pages} onGoToPage={goToPage} />
              )}
            </div>
          </div>
        )}
      </section>

      {selectedDocument && (
        <IPDocumentModal
          document={selectedDocument}
          highlightTokens={highlightTokens}
          onClose={() => setSelectedDocument(null)}
          onInventorClick={handleInventorProfileClick}
        />
      )}

      <Footer />
    </div>
  );
};

export default ExploreIP;
