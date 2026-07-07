import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search, Filter, FileText, Users, Building, Loader2, X, ExternalLink, ChevronDown, ChevronRight } from "lucide-react";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import ExploreSearchLoader from "@/components/ExploreSearchLoader";
import ExploreThemeChips from "@/components/explore/taxonomy/ExploreThemeChips";

import { useSearchResearch, type SearchRequest, type SearchDocument, type RelatedFaculty } from "@/lib/api";
import { useAuthorScopedSearch, useAllFacultyForQuery } from "@/lib/api/hooks/useSearch";
import { useSuggest } from "@/lib/api/hooks/useSuggest";
import type { AuthorScopedSearchRequest, SearchAuthor, SuggestAuthor, SuggestPaper, SearchFilters } from "@/lib/api/types";
import { getFacultyByScopusId, getFacultyById } from "@/lib/api/services/directoryService";
import { formatAbstract, highlightTerms } from "@/lib/utils";
import { useSearchHistory } from "@/hooks/use-search-history";
import { SearchSuggestions, type SearchSuggestionsHandle } from "@/components/SearchSuggestions";
import { useToast } from "@/hooks/use-toast";
import {
  PeopleSectionHeader,
  PeopleFacultyRow,
  PeopleDepartmentBlock,
  PeopleListContainer,
  PeopleLoadingState,
  PeopleEmptyState,
  PeopleLoadMoreSentinel,
} from "@/components/explore/PeopleSectionUI";

/**
 * Paper `authors` from the search API are already limited to IIT Delhi Faculty roster (Scopus id on Faculty).
 * Names for Explore result cards: when a faculty member is selected, they are listed first.
 *
 * NOTE: People sidebar uses `expert_id` while paper authors carry Scopus `author_id`.
 * Matching must fall back to name comparison when IDs don't match across systems.
 */
type ExploreCardAuthorEntry = { name: string; author_id: string };

const TITLE_PREFIXES = /^(prof\.?\s+|dr\.?\s+|mr\.?\s+|ms\.?\s+|mrs\.?\s+)/i;
function normalizeName(raw: string): string {
  return raw.replace(TITLE_PREFIXES, "").replace(/\s+/g, " ").trim().toLowerCase();
}

function findAuthorMatch(
  roster: SearchAuthor[],
  selectedAuthor: { name: string; author_id: string }
): SearchAuthor | undefined {
  const id = String(selectedAuthor.author_id);
  const byId = roster.find((a) => a.author_id != null && String(a.author_id) === id);
  if (byId) return byId;
  const norm = normalizeName(selectedAuthor.name);
  if (!norm) return undefined;
  return roster.find((a) => {
    const n = normalizeName((a.author_name || a.name || "").trim());
    return n && n === norm;
  });
}

function dedupeByNormalizedName<T extends { name: string; author_id: string }>(entries: T[]): T[] {
  const seenIds = new Set<string>();
  const seenNames = new Set<string>();
  return entries.filter((e) => {
    if (seenIds.has(e.author_id)) return false;
    const norm = normalizeName(e.name);
    if (seenNames.has(norm)) return false;
    seenIds.add(e.author_id);
    if (norm) seenNames.add(norm);
    return true;
  });
}

function getExploreCardAuthorEntries(
  authors: SearchAuthor[] | undefined,
  selectedAuthor: { name: string; author_id: string } | null
): ExploreCardAuthorEntry[] {
  const roster = authors || [];

  if (selectedAuthor) {
    const match = findAuthorMatch(roster, selectedAuthor);
    const matchId = match ? String(match.author_id) : String(selectedAuthor.author_id);
    const headName =
      (match?.author_name || match?.name || selectedAuthor.name).trim() || selectedAuthor.name;
    const head: ExploreCardAuthorEntry = { name: headName, author_id: matchId };
    const headNorm = normalizeName(headName);
    const others = roster
      .filter((a) => {
        if (a.author_id == null) return false;
        if (String(a.author_id) === matchId) return false;
        const n = normalizeName((a.author_name || a.name || "").trim());
        return n !== headNorm;
      })
      .map((a) => ({
        name: (a.author_name || a.name || "").trim(),
        author_id: String(a.author_id),
      }))
      .filter((e) => e.name);
    const merged = dedupeByNormalizedName([head, ...others]);
    return merged.length ? merged : [{ name: selectedAuthor.name, author_id: matchId }];
  }

  return dedupeByNormalizedName(
    roster
      .filter((a) => a.author_id != null)
      .map((a) => ({
        name: (a.author_name || a.name || "").trim(),
        author_id: String(a.author_id),
      }))
      .filter((e) => e.name)
  );
}

type ExploreModalAuthorRow = {
  name: string;
  affiliation?: string;
  highlight?: boolean;
  author_id: string;
};

function getExploreModalAuthorRows(
  authors: SearchAuthor[] | undefined,
  selectedAuthor: { name: string; author_id: string } | null
): ExploreModalAuthorRow[] | null {
  const roster = (authors || []).filter((a) => a.author_id != null);

  if (roster.length === 0) return null;

  if (!selectedAuthor) {
    return dedupeByNormalizedName(
      roster
        .map((a) => ({
          name: (a.author_name || a.name || "").trim(),
          affiliation: a.author_affiliation || a.affiliation,
          author_id: String(a.author_id),
        }))
        .filter((r) => r.name)
    );
  }

  const match = findAuthorMatch(roster, selectedAuthor);
  const matchId = match ? String(match.author_id) : String(selectedAuthor.author_id);
  const scoped: ExploreModalAuthorRow = {
    name: (match?.author_name || match?.name || selectedAuthor.name).trim() || selectedAuthor.name,
    affiliation: match?.author_affiliation || match?.affiliation,
    highlight: true,
    author_id: matchId,
  };
  const scopedNorm = normalizeName(scoped.name);
  const rest: ExploreModalAuthorRow[] = roster
    .filter((a) => {
      if (String(a.author_id) === matchId) return false;
      const n = normalizeName((a.author_name || a.name || "").trim());
      return n !== scopedNorm;
    })
    .map((a) => ({
      name: (a.author_name || a.name || "").trim(),
      affiliation: a.author_affiliation || a.affiliation,
      author_id: String(a.author_id),
    }))
    .filter((r) => r.name);

  const rows = dedupeByNormalizedName([scoped, ...rest]).filter((r) => r.name);
  return rows.length ? rows : [{ name: selectedAuthor.name, highlight: true, author_id: matchId }];
}

function ExploreCardAuthorsLine({
  authors,
  selectedAuthor,
  onAuthorClick,
}: {
  authors: SearchAuthor[] | undefined;
  selectedAuthor: { name: string; author_id: string } | null;
  onAuthorClick: (scopusAuthorId: string, name: string) => void;
}) {
  const entries = getExploreCardAuthorEntries(authors, selectedAuthor);
  if (entries.length === 0) return null;
  const label = "Authors";
  const shown = entries.slice(0, 3);
  const more = entries.length - shown.length;
  return (
    <div
      className="text-sm text-muted-foreground"
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
      role="presentation"
    >
      <span className="font-semibold text-primary/80 mr-1">{label}:</span>
      {shown.map((entry, i) => (
        <span key={`${entry.author_id}-${i}`}>
          {i > 0 && ", "}
          <button
            type="button"
            className={`inline p-0 bg-transparent border-0 cursor-pointer text-left underline underline-offset-2 decoration-primary/60 hover:decoration-primary transition-colors ${
              selectedAuthor && i === 0 ? "font-semibold text-primary" : "text-primary/80 hover:text-primary"
            }`}
            onClick={() => onAuthorClick(entry.author_id, entry.name)}
          >
            {entry.name}
          </button>
        </span>
      ))}
      {more > 0 && <span className="text-muted-foreground"> +{more} more</span>}
    </div>
  );
}

const Explore = () => {
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Initialize search state from URL params for persistence across navigation.
  // Input stays empty even if a topic is already active — so the user can immediately
  // type a deep-search query against it.
  const [searchQuery, setSearchQuery] = useState("");
  // Multi-step refinement chain (oldest -> newest). The newest term drives ranking; all prior
  // terms narrow the result set. chain[0] is the base topic. Derived from URL: ?q=<base>&refine=<r1>&refine=<r2>...
  const [refinementChain, setRefinementChain] = useState<string[]>(() => {
    const base = searchParams.get('q') || "";
    const refines = searchParams.getAll('refine');
    return base ? [base, ...refines] : [];
  });
  const [currentPage, setCurrentPage] = useState(() => {
    const page = searchParams.get('page');
    return page ? parseInt(page, 10) : 1;
  });
  const [selectedDocument, setSelectedDocument] = useState<SearchDocument | null>(null);

  // Typeahead suggestions (blended authors + papers)
  const [showSuggestions, setShowSuggestions] = useState(false);
  const suggestionsRef = useRef<SearchSuggestionsHandle>(null);
  const searchBoxRef = useRef<HTMLDivElement>(null);

  // State for filtering papers by author (now includes author_id for API call)
  const [selectedAuthor, setSelectedAuthor] = useState<{ name: string; author_id: string } | null>(null);
  const [authorScopedPage, setAuthorScopedPage] = useState(1);

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

  // Search mode: basic (BM25 only) or advanced (hybrid BM25 + k-NN)
  const [searchMode, setSearchMode] = useState<'basic' | 'advanced'>(() => {
    const mode = searchParams.get('mode');
    return mode === 'advanced' ? 'advanced' : 'basic';
  });

  // Client-side sort state — both modes default to relevance
  const [clientSort, setClientSort] = useState<'relevance' | 'citations'>('relevance');

  // Reset to relevance when switching search mode
  useEffect(() => {
    setClientSort('relevance');
  }, [searchMode]);

  // Collapsible department sections state (by default all expanded)
  const [expandedDepts, setExpandedDepts] = useState<Record<string, boolean>>({});

  // Sidebar toggle state — default closed on mobile/tablet (< xl = 1280px), open on desktop
  const [isPeopleSidebarOpen, setIsPeopleSidebarOpen] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(min-width: 1280px)").matches;
  });
  const [showAllFaculty, setShowAllFaculty] = useState(false);
  const [isPeopleLoadingMore, setIsPeopleLoadingMore] = useState(false);
  const [peoplePage, setPeoplePage] = useState(1);
  const PEOPLE_PER_PAGE = 20;

  // Derived chain values (cheap; computed each render from the canonical refinementChain).
  const baseQuery = refinementChain[0] ?? "";
  const activeQuery = refinementChain[refinementChain.length - 1] ?? "";
  const priorChain = refinementChain.slice(0, -1);
  const hasSearched = refinementChain.length > 0;

  // Guard so our own programmatic URL writes don't trip the back/forward restore effect
  // (which would otherwise reset selectedAuthor / mode mid-chain).
  const skipUrlEffect = useRef(false);

  // Persistent client-side search log (localStorage)
  const { history: searchHistory, addEntry: addSearchLog, removeEntry: removeSearchLog, clear: clearSearchLog } = useSearchHistory();

  // Blended typeahead — debounced + abortable inside the hook. Reflects the input box text.
  const { data: suggestData, isFetching: isSuggestFetching } = useSuggest(searchQuery, {
    enabled: showSuggestions,
  });
  const recentQueries = useMemo(() => searchHistory.map((h) => h.query), [searchHistory]);

  // Sync state from URL when the user navigates with browser back/forward
  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    // Skip restores triggered by our own writeUrl() so mid-chain mode switches and
    // author drill-downs aren't clobbered. Genuine back/forward navigations fall through.
    if (skipUrlEffect.current) {
      skipUrlEffect.current = false;
      return;
    }
    const q = searchParams.get('q') || '';
    const refines = searchParams.getAll('refine');
    const page = searchParams.get('page');
    const filter = searchParams.get('filter') || 'All';
    const sort = searchParams.get('sort');
    const mode = searchParams.get('mode');
    const si = searchParams.get('search_in');

    // Always reset the input to empty — if a chain is active, the next query becomes a deep search.
    setSearchQuery("");
    setRefinementChain(q ? [q, ...refines] : []);
    setCurrentPage(page ? parseInt(page, 10) : 1);
    setActiveFilter(filter);
    setSortBy(sort === 'date' || sort === 'citations' ? sort : 'relevance');
    setSearchMode(mode === 'advanced' ? 'advanced' : 'basic');
    setSearchIn(si === 'author' ? ['author'] : si === 'all' ? [] : []);
    setSelectedAuthor(null);
    setAuthorScopedPage(1);
  }, [searchParams]); // eslint-disable-line react-hooks/exhaustive-deps
  const [sidebarWidth, setSidebarWidth] = useState(24); // percentage width
  const isResizing = useRef(false);
  const [isResizingState, setIsResizingState] = useState(false);
  const leftColRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const peopleSentinelRef = useRef<HTMLDivElement>(null);
  const peopleHasMoreRef = useRef(false);


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
  const [searchIn, setSearchIn] = useState<Array<'title' | 'abstract' | 'author' | 'subject_area' | 'field'>>(() => {
    const si = searchParams.get('search_in');
    if (si === 'author') return ['author'];
    return [];
  });

  const filters = [
    "All",
    "Article",
    "Review",
    "Conference Paper",
    "Book Chapter",
  ];

  // Single source of truth for facet filters, shared by BOTH the papers query
  // (POST /search) and the People sidebar query (GET /search/faculty-for-query) so
  // their paper totals always describe the identical filtered corpus.
  const searchFilters = useMemo<SearchFilters>(() => {
    const f: SearchFilters = {};
    if (yearFrom) f.year_from = parseInt(yearFrom);
    if (yearTo) f.year_to = parseInt(yearTo);
    if (activeFilter !== "All") f.document_type = activeFilter;
    return f;
  }, [yearFrom, yearTo, activeFilter]);

  // Write the current refinement chain (+ mode/sort/filter/search_in/page) to the URL so refresh,
  // back/forward, and link sharing restore the exact narrowed state. Uses repeated `refine` params.
  const writeUrl = useCallback((chain: string[], opts?: {
    page?: number;
    mode?: 'basic' | 'advanced';
    searchIn?: Array<'title' | 'abstract' | 'author' | 'subject_area' | 'field'>;
    sort?: 'relevance' | 'date' | 'citations';
    filter?: string;
  }) => {
    const params = new URLSearchParams();
    const base = chain[0];
    if (base) params.set('q', base);
    chain.slice(1).forEach((t) => params.append('refine', t));
    const page = opts?.page ?? currentPage;
    if (page && page > 1) params.set('page', String(page));
    const mode = opts?.mode ?? searchMode;
    params.set('mode', mode);
    const si = opts?.searchIn ?? searchIn;
    params.set('search_in', si.length === 1 && si[0] === 'author' ? 'author' : 'all');
    const filter = opts?.filter ?? activeFilter;
    if (filter !== 'All') params.set('filter', filter);
    const sort = opts?.sort ?? sortBy;
    if (sort !== 'relevance') params.set('sort', sort);
    skipUrlEffect.current = true;
    setSearchParams(params);
  }, [currentPage, searchMode, searchIn, activeFilter, sortBy, setSearchParams]);

  // Build search request from the chain: newest term is `query`, prior terms are `refine_chain`.
  const searchRequest = useMemo<SearchRequest | null>(() => {
    const active = refinementChain[refinementChain.length - 1] ?? "";
    if (!active.trim()) return null;
    const prior = refinementChain.slice(0, -1);

    const request: SearchRequest = {
      query: active,
      page: currentPage,
      per_page: perPage,
      sort: sortBy,
      filters: searchFilters,
      // Always send explicit field list when any toggle is selected (all 5 is valid).
      search_in: searchIn.length > 0 ? searchIn : undefined,
      mode: searchMode,
      ...(prior.length > 0 ? { refine_chain: prior } : {}),
    };

    return request;
  }, [refinementChain, currentPage, perPage, sortBy, searchFilters, searchIn, searchMode]);

  // Use React Query for search
  const { data: searchData, isLoading, isFetching } = useSearchResearch(searchRequest);

  // Author-scoped search request (fires when an author is selected)
  const authorScopedRequest = useMemo<AuthorScopedSearchRequest | null>(() => {
    const active = refinementChain[refinementChain.length - 1] ?? "";
    if (!selectedAuthor || !active.trim()) return null;
    const prior = refinementChain.slice(0, -1);
    // Same contract as POST /search: main `query` is the newest term; `refine_chain` is the prior chain.
    return {
      query: active,
      author_id: selectedAuthor.author_id,
      page: authorScopedPage,
      per_page: 20,
      mode: searchMode,
      ...(prior.length > 0 ? { refine_chain: prior } : {}),
      ...(searchIn.length > 0 ? { search_in: searchIn } : {}),
      // Same facet filters as the papers list / People sidebar so the opened faculty's
      // count equals the per-faculty count shown in the sidebar list.
      ...(Object.keys(searchFilters).length > 0 ? { filters: searchFilters } : {}),
    };
  }, [selectedAuthor, refinementChain, authorScopedPage, searchMode, searchIn, searchFilters]);

  const { data: authorScopedData, isLoading: isAuthorScopedLoading, isFetching: isAuthorScopedFetching } = useAuthorScopedSearch(authorScopedRequest);

  // Reset the faculty drill-down to page 1 whenever the facet filters or the active query
  // change, so a filtered/changed refetch never requests a stale page offset into a different
  // corpus. (Selecting a faculty already resets the page at the click sites.)
  useEffect(() => {
    setAuthorScopedPage(1);
  }, [searchFilters, refinementChain]);

  // All faculty for query — same body shape as POST /search (newest query, prior refine_chain, search_in)
  const { data: allFacultyData, isLoading: isAllFacultyLoading } = useAllFacultyForQuery(
    activeQuery,
    searchMode,
    {
      enabled: hasSearched,
      search_in: searchIn.length > 0 ? searchIn : undefined,
      refine_chain: priorChain.length > 0 ? priorChain : undefined,
      // Same facet filters as POST /search so total_matching_papers == pagination.total.
      filters: searchFilters,
    }
  );

  // IntersectionObserver for infinite scroll in People sidebar
  useEffect(() => {
    const sentinel = peopleSentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && peopleHasMoreRef.current && !isPeopleLoadingMore) {
          setIsPeopleLoadingMore(true);
          setTimeout(() => {
            setPeoplePage(p => p + 1);
            setIsPeopleLoadingMore(false);
          }, 500); // 500ms artificial delay to show loader
        }
      },
      { threshold: 0.1 }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [showAllFaculty, allFacultyData, isPeopleSidebarOpen, isPeopleLoadingMore]);

  // Derived state from query
  const results = searchData?.results || [];
  const pagination = searchData?.pagination || null;
  const relatedFaculty = searchData?.related_faculty || [];

  const peopleTotalCount =
    (showAllFaculty || relatedFaculty.length === 0)
      ? (allFacultyData?.total_faculty ?? 0)
      : relatedFaculty.length;

  // Tokens to highlight in result titles / abstracts — drawn from every term in the chain.
  const highlightTokens = useMemo(() => {
    const src = refinementChain.join(' ').trim();
    if (!src) return [] as string[];
    return Array.from(
      new Set(
        src
          .toLowerCase()
          .split(/\s+/)
          .filter((t) => t.length >= 2)
      )
    );
  }, [refinementChain]);

  // Clear the entire chain and reset the search state (shared with input X button / "Clear all").
  const clearAll = useCallback(() => {
    setSearchQuery("");
    setRefinementChain([]);
    setSelectedAuthor(null);
    setSearchIn([]);
    setCurrentPage(1);
    setAuthorScopedPage(1);
    skipUrlEffect.current = true;
    setSearchParams(new URLSearchParams());
  }, [setSearchParams]);

  // Jump back to a given step in the chain (truncate to that level). Guarantees re-narrowing
  // from that point forward.
  const goToChainLevel = useCallback((index: number) => {
    if (index < 0 || index >= refinementChain.length - 1) return; // no-op for the newest chip
    const next = refinementChain.slice(0, index + 1);
    setRefinementChain(next);
    setCurrentPage(1);
    setAuthorScopedPage(1);
    setSearchQuery("");
    writeUrl(next, { page: 1 });
  }, [refinementChain, writeUrl]);

  // Remove the newest refinement step (one level up).
  const popRefinement = useCallback(() => {
    if (refinementChain.length <= 1) return;
    goToChainLevel(refinementChain.length - 2);
  }, [refinementChain, goToChainLevel]);

  // Switch search mode; re-runs the current chain unchanged and persists mode to the URL.
  const changeMode = useCallback((mode: 'basic' | 'advanced') => {
    setSearchMode(mode);
    if (refinementChain.length > 0) writeUrl(refinementChain, { mode });
  }, [refinementChain, writeUrl]);

  // Navigate to a specific page of the ALREADY-submitted search.
  // This is what the First / Prev / numbered / Next / Last buttons call.
  // It deliberately does NOT read from `searchQuery` (the input box), which is
  // cleared after each submission so the user can immediately type a deep-search
  // query. `refinementChain` holds the active search; `currentPage` drives the
  // useSearchResearch fetch via the `searchRequest` useMemo.
  const goToPage = (page: number) => {
    if (!hasSearched) return;
    const totalPages = pagination?.total_pages ?? 1;
    const clamped = Math.min(Math.max(1, page), Math.max(1, totalPages));
    if (clamped === currentPage) return;
    setCurrentPage(clamped);
    writeUrl(refinementChain, { page: clamped });
    try { window.scrollTo({ top: 0, behavior: 'smooth' }); } catch { /* jsdom */ }
  };

  // Perform search — first submission sets the base topic; subsequent submissions while a chain
  // is active append a narrowing step (the new term becomes the newest = `query`, all prior terms
  // become `refine_chain`). The input is cleared so the user can immediately queue the next step.
  const performSearch = (page: number = 1) => {
    const query = searchQuery.trim();
    if (!query) return;

    // A chain is already active → append a narrowing step.
    if (refinementChain.length > 0) {
      const next = [...refinementChain, query];
      setRefinementChain(next);
      setSearchQuery("");
      setCurrentPage(1);
      setAuthorScopedPage(1);
      addSearchLog({
        query,
        mode: searchMode,
        searchIn: searchIn,
        refineWithin: refinementChain[refinementChain.length - 1],
      });
      writeUrl(next, { page: 1 });
      return;
    }

    // Otherwise, this is the initial (base topic) search.
    const next = [query];
    setRefinementChain(next);
    setCurrentPage(page);
    setSelectedAuthor(null);
    setAuthorScopedPage(1);

    addSearchLog({
      query,
      mode: searchMode,
      searchIn: searchIn,
    });

    writeUrl(next, { page });
    setSearchQuery("");
  };

  // Key handling for the search box: let the suggestions dropdown consume
  // Arrow/Enter/Esc first; otherwise Enter runs the normal search.
  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (showSuggestions && suggestionsRef.current?.handleKeyDown(e)) return;
    if (e.key === "Enter") {
      setShowSuggestions(false);
      performSearch(1);
    }
  };

  // Close the suggestions dropdown on outside click.
  useEffect(() => {
    if (!showSuggestions) return;
    const handler = (e: MouseEvent) => {
      if (searchBoxRef.current && !searchBoxRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showSuggestions]);

  // Run an author-name search through the existing pipeline (no active chain case).
  const runAuthorNameSearch = useCallback((name: string) => {
    const nextSearchIn: Array<'title' | 'abstract' | 'author' | 'subject_area' | 'field'> = ['author'];
    setSearchIn(nextSearchIn);
    setRefinementChain([name]);
    setCurrentPage(1);
    setSelectedAuthor(null);
    setAuthorScopedPage(1);
    addSearchLog({ query: name, mode: searchMode, searchIn: nextSearchIn });
    writeUrl([name], { page: 1, searchIn: nextSearchIn });
  }, [searchMode, addSearchLog, writeUrl]);

  // Selecting an author from typeahead → existing author flow.
  // With an active chain: scope within it (author-scope). Otherwise: author-name search.
  const selectAuthorSuggestion = useCallback((author: SuggestAuthor) => {
    setShowSuggestions(false);
    setSearchQuery('');
    if (hasSearched && author.scopus_id) {
      setSelectedAuthor({ name: author.name, author_id: author.scopus_id });
      setAuthorScopedPage(1);
      return;
    }
    runAuthorNameSearch(author.name);
  }, [hasSearched, runAuthorNameSearch]);

  // Start a fresh search at the base level from a given term (paper title / recent query).
  const startFreshSearch = useCallback((term: string) => {
    const trimmed = term.trim();
    if (!trimmed) return;
    setShowSuggestions(false);
    setSearchQuery('');
    setRefinementChain([trimmed]);
    setCurrentPage(1);
    setSelectedAuthor(null);
    setAuthorScopedPage(1);
    addSearchLog({ query: trimmed, mode: searchMode, searchIn });
    writeUrl([trimmed], { page: 1 });
  }, [searchMode, searchIn, addSearchLog, writeUrl]);

  // Selecting a paper from typeahead → run a normal search on its title.
  const selectPaperSuggestion = useCallback((paper: SuggestPaper) => {
    startFreshSearch(paper.title);
  }, [startFreshSearch]);

  // Selecting a recent query → re-run that search.
  const selectRecentSuggestion = useCallback((q: string) => {
    startFreshSearch(q);
  }, [startFreshSearch]);

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

  const kerberosFromEmail = (email?: string) =>
    email ? email.split("@")[0]?.toLowerCase() : "";

  /** People sidebar: navigate to faculty profile page in new tab. */
  const openRelatedFacultyProfile = async (faculty: RelatedFaculty) => {
    try {
      const full = await getFacultyById(faculty._id);
      const k = kerberosFromEmail(full.email);
      if (k) window.open(`/faculty/${k}`, "_blank", "noopener");
    } catch { /* ignore */ }
  };

  /** Show-all faculty list only has Scopus author_id — resolve then open in new tab. */
  const openAggregatedFacultyProfile = async (scopusAuthorId: string, _fallbackName?: string) => {
    try {
      const full = await getFacultyByScopusId(scopusAuthorId);
      const k = kerberosFromEmail(full.email);
      if (k) window.open(`/faculty/${k}`, "_blank", "noopener");
    } catch { /* ignore */ }
  };

  /** Open faculty profile from a paper author line in new tab. */
  const handleAuthorClickByScopus = useCallback(
    async (scopusAuthorId: string, _authorName: string) => {
      try {
        const full = await getFacultyByScopusId(scopusAuthorId);
        const k = kerberosFromEmail(full.email);
        if (k) window.open(`/faculty/${k}`, "_blank", "noopener");
      } catch { /* ignore */ }
    },
    []
  );

  // Filter results based on activeFilter (for display purposes)
  const filteredResults = useMemo(() => {
    const base = activeFilter === "All"
      ? results
      : results.filter((item) => item.document_type === activeFilter);
    return base;
  }, [activeFilter, results]);

  // Sort results client-side based on clientSort
  // When an author is selected, use author-scoped search results from the API
  const sortedResults = useMemo(() => {
    // If author-scoped search is active, use those results
    if (selectedAuthor && authorScopedData?.results) {
      const authorResults = [...authorScopedData.results];
      if (clientSort === 'citations') {
        return authorResults.sort((a, b) => (b.citation_count || 0) - (a.citation_count || 0));
      }
      return authorResults; // Already sorted by similarity_score from API
    }

    const finalResults = [...filteredResults];
    if (clientSort === 'citations') {
      return finalResults.sort((a, b) => (b.citation_count || 0) - (a.citation_count || 0));
    }
    // For 'relevance', keep original API order
    return finalResults;
  }, [filteredResults, clientSort, selectedAuthor, authorScopedData]);

  return (
    <div className="min-h-screen page-bg flex flex-col">
      <Navigation />

      {/* Header */}
      <section className="gradient-subtle pt-16 sm:pt-20 pb-6 sm:pb-10 section-bg">
        <div className="container mx-auto px-4">
          <h1 className="text-2xl sm:text-4xl font-bold mb-2 sm:mb-3 animate-fade-in">
            Explore Research
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground mb-4 sm:mb-6 max-w-2xl animate-slide-up">
            Browse faculty, publications, departments and interdisciplinary initiatives at IIT Delhi.
          </p>

          {/* Search and Filters Container */}
          <div className="flex flex-col gap-3 items-start animate-slide-up max-w-[800px]">
            {/* Search Bar Row — always visible so users can refine queries, switch modes, or adjust filters after a search. */}
            <div className="flex flex-col sm:flex-row gap-3 items-center w-full">
              {/* Search Bar */}
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

                {/* Blended typeahead dropdown */}
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

              {/* Basic vs Advanced Search Mode Toggle */}
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

              {/* Filters button */}
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

                {/* Floating Filters Modal */}
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


            {/* Recent searches strip (localStorage log) — only visible when no active search */}
            {!hasSearched && searchHistory.length > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold tracking-wider uppercase text-muted-foreground shrink-0">
                  Recent:
                </span>
                {searchHistory.slice(0, 5).map((entry) => (
                  <button
                    key={entry.timestamp}
                    type="button"
                    onClick={() => {
                      const nextSearchIn = (entry.searchIn || []).filter((f): f is 'title' | 'abstract' | 'author' | 'subject_area' | 'field' =>
                        ['title', 'abstract', 'author', 'subject_area', 'field'].includes(f)
                      );
                      setSearchQuery("");
                      setRefinementChain([entry.query]);
                      setCurrentPage(1);
                      setSelectedAuthor(null);
                      setAuthorScopedPage(1);
                      setSearchMode(entry.mode);
                      setSearchIn(nextSearchIn);
                      writeUrl([entry.query], { page: 1, mode: entry.mode, searchIn: nextSearchIn });
                      addSearchLog({
                        query: entry.query,
                        mode: entry.mode,
                        searchIn: entry.searchIn,
                      });
                    }}
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

            {/* Refinement breadcrumb trail: each step narrows the result set. Intermediate chips
                jump back to that step; the newest chip can be removed; "Clear all" resets. */}
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

            {/* Active filters summary chips */}
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

        {/* Narrowing context line (shown once a chain has >= 2 steps) reinforces that the result
            set shrinks with each step. */}
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

      {/* Click-away overlay for filters */}
      {showFilters && (
        <div className="fixed inset-0 z-40" onClick={() => setShowFilters(false)} />
      )}

      {/* Research Items Grid Layout */}
      <section className="container mx-auto px-4 pt-4 pb-16 flex-1">
        {/* Loading State */}
        {isLoading && <ExploreSearchLoader query={activeQuery} />}

        {/* No Search Yet — fills the open space with a search prompt plus a
            quick-start row into taxonomy browsing, instead of sitting empty. */}
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

        {/* No Results */}
        {hasSearched && !isLoading && filteredResults.length === 0 && (
          <div className="flex flex-col items-center justify-center text-center pt-10 pb-8 sm:pt-16 sm:pb-12">
            <div className="w-14 h-14 rounded-2xl bg-muted/60 flex items-center justify-center mb-4 border border-border/40">
              <FileText className="h-7 w-7 text-muted-foreground/60" />
            </div>
            <h3 className="text-lg font-semibold mb-1.5">No Results Found</h3>
            <p className="text-sm text-muted-foreground">Try different keywords or adjust your filters</p>
          </div>
        )}

        {/* Results Layout Grid */}
        {hasSearched && !isLoading && (filteredResults.length > 0 || relatedFaculty.length > 0 || (allFacultyData?.total_faculty ?? 0) > 0) && (
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
          className={`w-full flex flex-col gap-4 pt-1 xl:sticky xl:top-6 xl:max-h-[calc(100vh-3rem)]`}
        >
          <PeopleSectionHeader
            count={peopleTotalCount}
            isOpen={isPeopleSidebarOpen}
            onToggle={() => setIsPeopleSidebarOpen(!isPeopleSidebarOpen)}
          />

          <div className={`flex flex-col xl:flex-1 xl:min-h-0 transition-all duration-300 overflow-hidden pr-0 sm:pr-4 ${isPeopleSidebarOpen ? 'opacity-100' : 'opacity-0 hidden'}`}>
          <>
            {/* Show All mode - server-side; also used as auto-fallback when current page has no IITD faculty */}
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

              // Flatten all faculty for scroll-based loading
              const allFacultyFlat = allFacultyData.departments.flatMap(dept =>
                dept.faculty.map(f => ({ ...f, department: dept.name, deptCount: allFacultyData.departments.find(d => d.name === dept.name)?.faculty.length || 0 }))
              );
              const visibleCount = peoplePage * PEOPLE_PER_PAGE;
              const visibleFaculty = allFacultyFlat.slice(0, visibleCount);
              const hasMore = visibleCount < allFacultyFlat.length;

              // Regroup visible items by department (preserving server relevance order)
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

              // Group by department with relevance-based ordering
              const deptGroups: Record<string, { faculty: typeof enrichedFaculty; totalCount: number }> = {};
              enrichedFaculty.forEach(faculty => {
                const dept = faculty.department?.name || 'Unknown';
                if (!deptGroups[dept]) deptGroups[dept] = { faculty: [], totalCount: 0 };
                deptGroups[dept].faculty.push(faculty);
                deptGroups[dept].totalCount += faculty.paperCount;
              });

              // Sort departments by total paper count (relevance)
              const sortedDepts = Object.keys(deptGroups).sort((a, b) => {
                const countDiff = deptGroups[b].totalCount - deptGroups[a].totalCount;
                if (countDiff !== 0) return countDiff;
                return a.localeCompare(b);
              });

              // Flatten for scroll-based loading
              const allFacultyFlat = sortedDepts.flatMap(dept =>
                deptGroups[dept].faculty.map(f => ({ faculty: f, department: dept }))
              );
              const visibleCount = peoplePage * PEOPLE_PER_PAGE;
              const visibleItems = allFacultyFlat.slice(0, visibleCount);
              const hasMore = visibleCount < allFacultyFlat.length;

              // Regroup visible items by department
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
            <div className={`transition-all duration-300 w-full flex-1 ${isPeopleSidebarOpen ? 'xl:pl-8' : 'xl:pl-4'} border-t xl:border-t-0 xl:border-l border-border pt-6 sm:pt-8 xl:pt-0 space-y-4 sm:space-y-6`}>
              <div className="flex items-center gap-2 mb-2 border-b border-border pb-4">
                <FileText className="h-5 w-5 text-primary" />
                <h2 className="text-2xl font-bold text-foreground">Research Papers</h2>
              </div>

              {/* Author-scoped search banner */}
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

              {/* Author-scoped loading state */}
              {selectedAuthor && (isAuthorScopedLoading || isAuthorScopedFetching) && (
                <div className="flex flex-col items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary mb-3" />
                  <p className="text-sm text-muted-foreground">
                    {refinementChain.length > 1 ? `Refining within ${selectedAuthor.name}'s papers...` : `Searching ${selectedAuthor.name}'s papers...`}
                  </p>
                </div>
              )}
              
              {/* Results Header */}
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

              {/* No results for author-scoped search */}
              {selectedAuthor && authorScopedData && authorScopedData.results.length === 0 && !isAuthorScopedLoading && !isAuthorScopedFetching && (
                <div className="text-center py-12 bg-accent-light border border-accent rounded-lg">
                  <FileText className="h-10 w-10 mx-auto text-muted-foreground mb-3 opacity-50" />
                  <h3 className="text-lg font-semibold mb-1">No Matching Papers</h3>
                  <p className="text-sm text-muted-foreground px-4">
                    {selectedAuthor.name} has {authorScopedData.author.total_papers} papers, but none closely match "{activeQuery}"
                  </p>
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
                  <CardTitle className="text-base sm:text-xl mb-2 leading-snug">{highlightTerms(item.title, highlightTokens)}</CardTitle>
                  <ExploreCardAuthorsLine
                    authors={item.authors}
                    selectedAuthor={selectedAuthor}
                    onAuthorClick={handleAuthorClickByScopus}
                  />
                </CardHeader>
                <CardContent>
                  {item.abstract && (
                    <p className="text-muted-foreground mb-4 line-clamp-3">{highlightTerms(formatAbstract(item.abstract), highlightTokens)}</p>
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
                            <CardTitle className="text-base sm:text-xl mb-2 leading-snug">{highlightTerms(item.title, highlightTokens)}</CardTitle>
                            <ExploreCardAuthorsLine
                    authors={item.authors}
                    selectedAuthor={selectedAuthor}
                    onAuthorClick={handleAuthorClickByScopus}
                  />
                          </CardHeader>
                          <CardContent>
                            {item.abstract && (
                              <p className="text-muted-foreground mb-4 line-clamp-3">{highlightTerms(formatAbstract(item.abstract), highlightTokens)}</p>
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

        {/* Pagination - main search */}
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

        {/* Pagination - author-scoped search */}
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
            className="bg-background border border-border/50 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header - Glassy Gradient Fixed */}
            <div className="relative flex items-start justify-between p-6 border-b border-white/10 overflow-hidden bg-gradient-to-br from-indigo-500/10 via-background to-primary/5 shrink-0">
               <div className="absolute inset-0 bg-grid-white/10 [mask-image:linear-gradient(0deg,transparent,black)] pointer-events-none" />
              <div className="relative flex-1 pr-4">
                <div className="flex flex-wrap gap-2 mb-3">
                  <Badge variant="secondary" className="px-3 py-0.5 font-bold rounded-full uppercase tracking-wider text-[10px] bg-secondary/80 text-secondary-foreground">{selectedDocument.document_type}</Badge>
                  {selectedDocument.field_associated && (
                    <Badge variant="outline" className="px-3 py-0.5 bg-background/50 backdrop-blur-sm rounded-full uppercase tracking-wider text-[10px] text-muted-foreground border-border/50">{selectedDocument.field_associated}</Badge>
                  )}
                </div>
                <h2 className="text-lg sm:text-2xl font-bold text-foreground leading-tight">{highlightTerms(selectedDocument.title, highlightTokens)}</h2>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSelectedDocument(null)}
                className="relative shrink-0 rounded-full hover:bg-background/80"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            {/* Modal Content */}
            <div className="overflow-y-auto flex-1 min-h-0 p-6 space-y-7">
              {/* Authors */}
              {(() => {
                const rows = getExploreModalAuthorRows(selectedDocument.authors, selectedAuthor);
                if (!rows || rows.length === 0) return null;
                return (
                  <div onClick={(e) => e.stopPropagation()} className="space-y-3">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Author(s)
                    </h3>
                    <div className="flex flex-wrap gap-3">
                      {rows.map((row, idx) => (
                        <button
                          key={`${row.author_id}-${idx}`}
                          type="button"
                          onClick={() => handleAuthorClickByScopus(row.author_id, row.name)}
                          className={`rounded-xl px-4 py-2 border text-left transition-smooth hover:-translate-y-0.5 hover:shadow-md ${
                            row.highlight
                              ? "bg-primary/5 border-primary/30 ring-1 ring-primary/20 shadow-sm"
                              : "bg-card border-border shadow-sm hover:border-primary/30"
                          }`}
                        >
                          <div
                            className={`text-sm leading-tight ${row.highlight ? "font-bold text-foreground" : "font-semibold text-foreground/90"}`}
                          >
                            {row.name}
                          </div>
                          {row.affiliation && (
                            <div className="text-[10px] font-medium text-muted-foreground mt-1 tracking-wide uppercase line-clamp-1">{row.affiliation}</div>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })()}

              {/* Abstract */}
              {selectedDocument.abstract && (
                <div className="space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Abstract</h3>
                  <div className="p-5 rounded-xl bg-muted/30 border border-border/50 leading-relaxed text-foreground/80 text-sm shadow-inner">
                    {highlightTerms(formatAbstract(selectedDocument.abstract), highlightTokens)}
                  </div>
                </div>
              )}

              {/* Metadata */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Publication Details</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="flex flex-col p-4 rounded-xl bg-blue-500/5 border border-blue-500/10">
                    <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Publication Year</div>
                    <div className="text-xl font-bold text-foreground leading-tight">{selectedDocument.publication_year || "N/A"}</div>
                  </div>
                  <div className="flex flex-col p-4 rounded-xl bg-orange-500/5 border border-orange-500/10">
                    <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Citations</div>
                    <div className="text-xl font-bold text-foreground leading-tight">{selectedDocument.citation_count || 0}</div>
                  </div>
                  <div className="flex flex-col p-4 rounded-xl bg-green-500/5 border border-green-500/10">
                    <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Document Type</div>
                    <div className="text-sm font-bold text-foreground leading-tight mt-1 line-clamp-1">{selectedDocument.document_type}</div>
                  </div>
                  {selectedDocument.field_associated && (
                    <div className="flex flex-col p-4 rounded-xl bg-purple-500/5 border border-purple-500/10">
                      <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Field</div>
                      <div className="text-sm font-bold text-foreground leading-tight mt-1 line-clamp-2">{selectedDocument.field_associated}</div>
                    </div>
                  )}
                </div>
              </div>

              {/* Subject Areas */}
              {selectedDocument.subject_area && selectedDocument.subject_area.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Subject Areas</h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedDocument.subject_area.map((area, idx) => (
                      <Badge key={idx} variant="secondary" className="px-3 py-1 font-medium bg-secondary/50 hover:bg-secondary border border-border/50 transition-colors">
                        {area}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer - Fixed at bottom */}
            <div className="flex flex-col-reverse sm:flex-row items-center justify-between gap-3 p-5 border-t border-border bg-background/80 backdrop-blur-md shrink-0">
               <Button variant="outline" onClick={() => setSelectedDocument(null)} className="w-full sm:w-auto font-semibold">
                 Close
               </Button>
               <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
                 {(() => {
                   const link = selectedDocument.link ?? '';
                   const scopusId = selectedDocument.document_scopus_id ?? '';
                   const eid = selectedDocument.document_eid ?? '';

                   // Scholar-origin papers use a synthetic "scholar_<hash>" as both IDs.
                   const isScholarId = (id: string) => id.startsWith('scholar_');

                   // 1. Google Scholar link from DB — always correct for GS papers
                   if (link.includes('scholar.google.com')) {
                     return (
                       <a href={link} target="_blank" rel="noopener noreferrer"
                         className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-primary/10 text-primary hover:bg-primary/20 text-sm font-bold rounded-lg transition-all border border-primary/20">
                         <ExternalLink className="h-4 w-4" />
                         View on Google Scholar
                       </a>
                     );
                   }

                   // 2. Real Scopus ID → public paper page
                   if (scopusId && !isScholarId(scopusId)) {
                     return (
                       <a href={`https://www.scopus.com/pages/publications/${scopusId}?origin=resultslist`}
                         target="_blank" rel="noopener noreferrer"
                         className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-primary/10 text-primary hover:bg-primary/20 text-sm font-bold rounded-lg transition-all border border-primary/20">
                         <ExternalLink className="h-4 w-4" />
                         View Original Paper
                       </a>
                     );
                   }

                   // 3. Fallback: EID-based Scopus URL (also real Scopus papers)
                   if (eid && !isScholarId(eid)) {
                     return (
                       <a href={`https://www.scopus.com/record/display.uri?eid=${encodeURIComponent(eid)}&origin=resultslist`}
                         target="_blank" rel="noopener noreferrer"
                         className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-primary/10 text-primary hover:bg-primary/20 text-sm font-bold rounded-lg transition-all border border-primary/20">
                         <ExternalLink className="h-4 w-4" />
                         View Original Paper
                       </a>
                     );
                   }

                   // 4. Any other non-API link stored in DB
                   if (link && !/\/api\/documents\//i.test(link)) {
                     return (
                       <a href={link} target="_blank" rel="noopener noreferrer"
                         className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-primary/10 text-primary hover:bg-primary/20 text-sm font-bold rounded-lg transition-all border border-primary/20">
                         <ExternalLink className="h-4 w-4" />
                         View Original Paper
                       </a>
                     );
                   }

                   return null;
                 })()}
               </div>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
};

export default Explore;
