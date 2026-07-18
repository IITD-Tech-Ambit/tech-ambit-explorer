import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { useSearchResearch, type SearchRequest } from "@/lib/api";
import { useAuthorScopedSearch, useAllFacultyForQuery } from "@/lib/api/hooks/useSearch";
import { useSuggest } from "@/lib/api/hooks/useSuggest";
import type {
  AuthorScopedSearchRequest,
  SuggestAuthor,
  SuggestPaper,
  SearchFilters,
} from "@/lib/api/types";
import { useSearchHistory } from "@/hooks/use-search-history";
import type { SearchSuggestionsHandle } from "@/components/SearchSuggestions";

export type SearchInField = "title" | "abstract" | "author" | "subject_area" | "field";
export type SelectedAuthor = { name: string; author_id: string };

/**
 * URL + refinement chain + search/filter state for Explore.
 * Multi-step refinement: newest term drives ranking; prior terms narrow via refine_chain.
 * URL shape: ?q=<base>&refine=<r1>&refine=<r2>...
 */
export function useExploreSearchState() {
  const [searchParams, setSearchParams] = useSearchParams();

  // Input stays empty even if a topic is already active — so the user can immediately
  // type a deep-search query against it.
  const [searchQuery, setSearchQuery] = useState("");
  // Multi-step refinement chain (oldest -> newest). chain[0] is the base topic.
  const [refinementChain, setRefinementChain] = useState<string[]>(() => {
    const base = searchParams.get("q") || "";
    const refines = searchParams.getAll("refine");
    return base ? [base, ...refines] : [];
  });
  const [currentPage, setCurrentPage] = useState(() => {
    const page = searchParams.get("page");
    return page ? parseInt(page, 10) : 1;
  });

  const [showSuggestions, setShowSuggestions] = useState(false);
  const suggestionsRef = useRef<SearchSuggestionsHandle>(null);
  const searchBoxRef = useRef<HTMLDivElement>(null);

  const [selectedAuthor, setSelectedAuthor] = useState<SelectedAuthor | null>(null);
  const [authorScopedPage, setAuthorScopedPage] = useState(1);

  const [activeFilter, setActiveFilter] = useState(() => searchParams.get("filter") || "All");
  const [showFilters, setShowFilters] = useState(false);

  const [searchMode, setSearchMode] = useState<"basic" | "advanced">(() => {
    const mode = searchParams.get("mode");
    return mode === "advanced" ? "advanced" : "basic";
  });

  const [clientSort, setClientSort] = useState<"relevance" | "citations">("relevance");

  useEffect(() => {
    setClientSort("relevance");
  }, [searchMode]);

  const baseQuery = refinementChain[0] ?? "";
  const activeQuery = refinementChain[refinementChain.length - 1] ?? "";
  const priorChain = refinementChain.slice(0, -1);
  const hasSearched = refinementChain.length > 0;

  // Guard so our own programmatic URL writes don't trip the back/forward restore effect
  // (which would otherwise reset selectedAuthor / mode mid-chain).
  const skipUrlEffect = useRef(false);

  const {
    history: searchHistory,
    addEntry: addSearchLog,
    removeEntry: removeSearchLog,
    clear: clearSearchLog,
  } = useSearchHistory();

  const { data: suggestData, isFetching: isSuggestFetching } = useSuggest(searchQuery, {
    enabled: showSuggestions,
  });
  const recentQueries = useMemo(() => searchHistory.map((h) => h.query), [searchHistory]);

  const [yearFrom, setYearFrom] = useState("");
  const [yearTo, setYearTo] = useState("");
  const [sortBy, setSortBy] = useState<"relevance" | "date" | "citations">(() => {
    const sort = searchParams.get("sort");
    return sort === "date" || sort === "citations" ? sort : "relevance";
  });
  const [perPage, setPerPage] = useState(20);
  const [searchIn, setSearchIn] = useState<SearchInField[]>(() => {
    const si = searchParams.get("search_in");
    if (si === "author") return ["author"];
    return [];
  });

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
    const q = searchParams.get("q") || "";
    const refines = searchParams.getAll("refine");
    const page = searchParams.get("page");
    const filter = searchParams.get("filter") || "All";
    const sort = searchParams.get("sort");
    const mode = searchParams.get("mode");
    const si = searchParams.get("search_in");

    setSearchQuery("");
    setRefinementChain(q ? [q, ...refines] : []);
    setCurrentPage(page ? parseInt(page, 10) : 1);
    setActiveFilter(filter);
    setSortBy(sort === "date" || sort === "citations" ? sort : "relevance");
    setSearchMode(mode === "advanced" ? "advanced" : "basic");
    setSearchIn(si === "author" ? ["author"] : si === "all" ? [] : []);
    setSelectedAuthor(null);
    setAuthorScopedPage(1);
  }, [searchParams]);

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

  const writeUrl = useCallback(
    (
      chain: string[],
      opts?: {
        page?: number;
        mode?: "basic" | "advanced";
        searchIn?: SearchInField[];
        sort?: "relevance" | "date" | "citations";
        filter?: string;
      }
    ) => {
      const params = new URLSearchParams();
      const base = chain[0];
      if (base) params.set("q", base);
      chain.slice(1).forEach((t) => params.append("refine", t));
      const page = opts?.page ?? currentPage;
      if (page && page > 1) params.set("page", String(page));
      const mode = opts?.mode ?? searchMode;
      params.set("mode", mode);
      const si = opts?.searchIn ?? searchIn;
      params.set("search_in", si.length === 1 && si[0] === "author" ? "author" : "all");
      const filter = opts?.filter ?? activeFilter;
      if (filter !== "All") params.set("filter", filter);
      const sort = opts?.sort ?? sortBy;
      if (sort !== "relevance") params.set("sort", sort);
      skipUrlEffect.current = true;
      setSearchParams(params);
    },
    [currentPage, searchMode, searchIn, activeFilter, sortBy, setSearchParams]
  );

  // Build search request: newest term is `query`, prior terms are `refine_chain`.
  const searchRequest = useMemo<SearchRequest | null>(() => {
    const active = refinementChain[refinementChain.length - 1] ?? "";
    if (!active.trim()) return null;
    const prior = refinementChain.slice(0, -1);

    return {
      query: active,
      page: currentPage,
      per_page: perPage,
      sort: sortBy,
      filters: searchFilters,
      search_in: searchIn.length > 0 ? searchIn : undefined,
      mode: searchMode,
      ...(prior.length > 0 ? { refine_chain: prior } : {}),
    };
  }, [refinementChain, currentPage, perPage, sortBy, searchFilters, searchIn, searchMode]);

  const { data: searchData, isLoading, isFetching } = useSearchResearch(searchRequest);

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
      ...(Object.keys(searchFilters).length > 0 ? { filters: searchFilters } : {}),
    };
  }, [selectedAuthor, refinementChain, authorScopedPage, searchMode, searchIn, searchFilters]);

  const {
    data: authorScopedData,
    isLoading: isAuthorScopedLoading,
    isFetching: isAuthorScopedFetching,
  } = useAuthorScopedSearch(authorScopedRequest);

  useEffect(() => {
    setAuthorScopedPage(1);
  }, [searchFilters, refinementChain]);

  const { data: allFacultyData, isLoading: isAllFacultyLoading } = useAllFacultyForQuery(
    activeQuery,
    searchMode,
    {
      enabled: hasSearched,
      search_in: searchIn.length > 0 ? searchIn : undefined,
      refine_chain: priorChain.length > 0 ? priorChain : undefined,
      filters: searchFilters,
    }
  );

  const results = searchData?.results || [];
  const pagination = searchData?.pagination || null;
  const relatedFaculty = searchData?.related_faculty || [];

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

  const goToChainLevel = useCallback(
    (index: number) => {
      if (index < 0 || index >= refinementChain.length - 1) return;
      const next = refinementChain.slice(0, index + 1);
      setRefinementChain(next);
      setCurrentPage(1);
      setAuthorScopedPage(1);
      setSearchQuery("");
      writeUrl(next, { page: 1 });
    },
    [refinementChain, writeUrl]
  );

  const popRefinement = useCallback(() => {
    if (refinementChain.length <= 1) return;
    goToChainLevel(refinementChain.length - 2);
  }, [refinementChain, goToChainLevel]);

  const changeMode = useCallback(
    (mode: "basic" | "advanced") => {
      setSearchMode(mode);
      if (refinementChain.length > 0) writeUrl(refinementChain, { mode });
    },
    [refinementChain, writeUrl]
  );

  // Pagination uses refinementChain (not the cleared input box) as the active search.
  const goToPage = (page: number) => {
    if (!hasSearched) return;
    const totalPages = pagination?.total_pages ?? 1;
    const clamped = Math.min(Math.max(1, page), Math.max(1, totalPages));
    if (clamped === currentPage) return;
    setCurrentPage(clamped);
    writeUrl(refinementChain, { page: clamped });
    try {
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {
      /* jsdom */
    }
  };

  // First submission sets base topic; subsequent submissions append a narrowing step.
  const performSearch = (page: number = 1) => {
    const query = searchQuery.trim();
    if (!query) return;

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

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (showSuggestions && suggestionsRef.current?.handleKeyDown(e)) return;
    if (e.key === "Enter") {
      setShowSuggestions(false);
      performSearch(1);
    }
  };

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

  const runAuthorNameSearch = useCallback(
    (name: string) => {
      const nextSearchIn: SearchInField[] = ["author"];
      setSearchIn(nextSearchIn);
      setRefinementChain([name]);
      setCurrentPage(1);
      setSelectedAuthor(null);
      setAuthorScopedPage(1);
      addSearchLog({ query: name, mode: searchMode, searchIn: nextSearchIn });
      writeUrl([name], { page: 1, searchIn: nextSearchIn });
    },
    [searchMode, addSearchLog, writeUrl]
  );

  const selectAuthorSuggestion = useCallback(
    (author: SuggestAuthor) => {
      setShowSuggestions(false);
      setSearchQuery("");
      if (hasSearched && author.scopus_id) {
        setSelectedAuthor({ name: author.name, author_id: author.scopus_id });
        setAuthorScopedPage(1);
        return;
      }
      runAuthorNameSearch(author.name);
    },
    [hasSearched, runAuthorNameSearch]
  );

  const startFreshSearch = useCallback(
    (term: string) => {
      const trimmed = term.trim();
      if (!trimmed) return;
      setShowSuggestions(false);
      setSearchQuery("");
      setRefinementChain([trimmed]);
      setCurrentPage(1);
      setSelectedAuthor(null);
      setAuthorScopedPage(1);
      addSearchLog({ query: trimmed, mode: searchMode, searchIn });
      writeUrl([trimmed], { page: 1 });
    },
    [searchMode, searchIn, addSearchLog, writeUrl]
  );

  const selectPaperSuggestion = useCallback(
    (paper: SuggestPaper) => {
      startFreshSearch(paper.title);
    },
    [startFreshSearch]
  );

  const selectRecentSuggestion = useCallback(
    (q: string) => {
      startFreshSearch(q);
    },
    [startFreshSearch]
  );

  const applyFilters = () => {
    if (searchQuery.trim()) {
      performSearch(1);
    }
  };

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

  const toggleSearchIn = (field: SearchInField) => {
    setSearchIn((prev) => {
      if (prev.includes(field)) {
        return prev.filter((f) => f !== field);
      }
      return [...prev, field];
    });
  };

  const replayRecentSearch = useCallback(
    (entry: (typeof searchHistory)[number]) => {
      const nextSearchIn = (entry.searchIn || []).filter((f): f is SearchInField =>
        ["title", "abstract", "author", "subject_area", "field"].includes(f)
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
    },
    [writeUrl, addSearchLog]
  );

  return {
    searchQuery,
    setSearchQuery,
    refinementChain,
    currentPage,
    setCurrentPage,
    showSuggestions,
    setShowSuggestions,
    suggestionsRef,
    searchBoxRef,
    selectedAuthor,
    setSelectedAuthor,
    authorScopedPage,
    setAuthorScopedPage,
    activeFilter,
    setActiveFilter,
    showFilters,
    setShowFilters,
    searchMode,
    clientSort,
    setClientSort,
    baseQuery,
    activeQuery,
    priorChain,
    hasSearched,
    searchHistory,
    addSearchLog,
    removeSearchLog,
    clearSearchLog,
    suggestData,
    isSuggestFetching,
    recentQueries,
    yearFrom,
    setYearFrom,
    yearTo,
    setYearTo,
    sortBy,
    setSortBy,
    perPage,
    setPerPage,
    searchIn,
    setSearchIn,
    searchFilters,
    writeUrl,
    searchData,
    isLoading,
    isFetching,
    authorScopedData,
    isAuthorScopedLoading,
    isAuthorScopedFetching,
    allFacultyData,
    isAllFacultyLoading,
    results,
    pagination,
    relatedFaculty,
    clearAll,
    goToChainLevel,
    popRefinement,
    changeMode,
    goToPage,
    performSearch,
    handleSearchKeyDown,
    selectAuthorSuggestion,
    selectPaperSuggestion,
    selectRecentSuggestion,
    applyFilters,
    clearFilters,
    toggleSearchIn,
    replayRecentSearch,
  };
}
