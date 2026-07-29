import { useState, useEffect, useMemo, useCallback, useRef, type KeyboardEvent } from "react";
import { useSearchParams } from "react-router-dom";
import { useIPSearch, useAllIPFacultyForQuery } from "@/lib/api/hooks/useIPSearch";
import { useIPSuggest } from "@/lib/api/hooks/useIPSuggest";
import type { IPSearchRequest, IPSearchFilters, IPDocument, SuggestIPInventor, SuggestIPDocument } from "@/lib/api/types";
import type { IPSearchSuggestionsHandle } from "@/components/exploreIP/IPSearchSuggestions";

type IPMode = "basic" | "advanced";
type IPSort = "relevance" | "date" | "normalized";

export type SelectedInventor = { name: string; kerberos: string };

/**
 * URL + refinement chain + search/filter state for IP/Patents Explore.
 * Multi-step refinement: newest term drives ranking; prior terms narrow via refine_chain.
 * Inventor scope uses filters.kerberos (no author-scoped endpoint).
 * URL shape: ?q=<base>&refine=<r1>&refine=<r2>...
 */
export function useIPExploreState() {
  const [searchParams, setSearchParams] = useSearchParams();

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
  const [mode, setMode] = useState<IPMode>(() => (searchParams.get("mode") === "advanced" ? "advanced" : "basic"));
  const [sort, setSort] = useState<IPSort>(() => {
    const s = searchParams.get("sort");
    return s === "date" || s === "normalized" ? s : "relevance";
  });
  const [perPage, setPerPage] = useState(20);

  const [showFilters, setShowFilters] = useState(false);
  const [yearFrom, setYearFrom] = useState(() => searchParams.get("year_from") || "");
  const [yearTo, setYearTo] = useState(() => searchParams.get("year_to") || "");
  const [typeOfIp, setTypeOfIp] = useState(() => searchParams.get("type_of_ip") || "");
  const [department, setDepartment] = useState(() => searchParams.get("department") || "");
  const [country, setCountry] = useState(() => searchParams.get("country") || "");

  const [selectedInventor, setSelectedInventor] = useState<SelectedInventor | null>(null);
  const [selectedDocument, setSelectedDocument] = useState<IPDocument | null>(null);
  // True when the chain's newest term is a facet label (e.g. "browse by department" chip),
  // not real query text — the request sends an empty query so the backend runs a filter-only
  // browse (no text-relevance gate) instead of matching the label against title/abstract.
  const [isBrowse, setIsBrowse] = useState(false);

  const [showSuggestions, setShowSuggestions] = useState(false);
  const suggestionsRef = useRef<IPSearchSuggestionsHandle>(null);
  const searchBoxRef = useRef<HTMLDivElement>(null);

  const activeQuery = refinementChain[refinementChain.length - 1] ?? "";
  const priorChain = refinementChain.slice(0, -1);
  const hasSearched = refinementChain.length > 0;

  const skipUrlEffect = useRef(false);
  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    if (skipUrlEffect.current) {
      skipUrlEffect.current = false;
      return;
    }
    const q = searchParams.get("q") || "";
    const refines = searchParams.getAll("refine");
    const page = searchParams.get("page");
    const modeParam = searchParams.get("mode");
    const sortParam = searchParams.get("sort");
    setSearchQuery("");
    setRefinementChain(q ? [q, ...refines] : []);
    setCurrentPage(page ? parseInt(page, 10) : 1);
    setMode(modeParam === "advanced" ? "advanced" : "basic");
    setSort(sortParam === "date" || sortParam === "normalized" ? sortParam : "relevance");
    setYearFrom(searchParams.get("year_from") || "");
    setYearTo(searchParams.get("year_to") || "");
    setTypeOfIp(searchParams.get("type_of_ip") || "");
    setDepartment(searchParams.get("department") || "");
    setCountry(searchParams.get("country") || "");
    setSelectedInventor(null);
    setIsBrowse(false);
    setShowSuggestions(false);
  }, [searchParams]);

  const writeUrl = useCallback(
    (chain: string[], opts?: { page?: number; mode?: IPMode }) => {
      const params = new URLSearchParams();
      const base = chain[0];
      if (base) params.set("q", base);
      chain.slice(1).forEach((t) => params.append("refine", t));
      const page = opts?.page ?? currentPage;
      if (page && page > 1) params.set("page", String(page));
      const m = opts?.mode ?? mode;
      params.set("mode", m);
      if (sort !== "relevance") params.set("sort", sort);
      if (yearFrom) params.set("year_from", yearFrom);
      if (yearTo) params.set("year_to", yearTo);
      if (typeOfIp) params.set("type_of_ip", typeOfIp);
      if (department) params.set("department", department);
      if (country) params.set("country", country);
      skipUrlEffect.current = true;
      setSearchParams(params);
    },
    [currentPage, mode, sort, yearFrom, yearTo, typeOfIp, department, country, setSearchParams]
  );

  const filters = useMemo<IPSearchFilters>(() => {
    const f: IPSearchFilters = {};
    if (yearFrom) f.year_from = parseInt(yearFrom, 10);
    if (yearTo) f.year_to = parseInt(yearTo, 10);
    if (typeOfIp) f.type_of_ip = typeOfIp;
    if (department) f.department = department;
    if (country) f.country = country;
    if (selectedInventor?.kerberos) f.kerberos = selectedInventor.kerberos;
    return f;
  }, [yearFrom, yearTo, typeOfIp, department, country, selectedInventor]);

  // Newest term is `query`; prior terms are `refine_chain`. In browse mode the newest term is
  // only a facet label for the breadcrumb UI — the backend gets an empty query so it runs a
  // filter-only browse instead of matching the label as text.
  const searchRequest = useMemo<IPSearchRequest | null>(() => {
    if (!isBrowse && !activeQuery.trim()) return null;
    return {
      query: isBrowse ? "" : activeQuery,
      page: currentPage,
      per_page: perPage,
      sort,
      mode,
      filters,
      ...(priorChain.length > 0 ? { refine_chain: priorChain } : {}),
    };
  }, [isBrowse, activeQuery, priorChain, currentPage, perPage, sort, mode, filters]);

  const { data: searchData, isLoading, isFetching, error } = useIPSearch(searchRequest);

  const { data: suggestData, isFetching: isSuggestFetching } = useIPSuggest(searchQuery, {
    enabled: showSuggestions,
  });

  const { data: allFacultyData, isLoading: isAllFacultyLoading } = useAllIPFacultyForQuery(
    isBrowse ? "" : activeQuery,
    mode,
    {
      enabled: hasSearched && (isBrowse || !!activeQuery.trim()),
      refine_chain: priorChain.length > 0 ? priorChain : undefined,
      filters,
    }
  );

  const results = searchData?.results ?? [];
  const pagination = searchData?.pagination ?? null;
  const relatedFaculty = searchData?.related_faculty ?? [];
  const facets = searchData?.facets ?? {};

  // First submission sets base topic; subsequent submissions append a narrowing step.
  // A prior browse-by-department chain (isBrowse) has a facet label as its only term, not real
  // query text — appending onto it via refine_chain would wrongly text-match that label, so a
  // new real query starts a fresh chain instead (the department filter itself stays pinned).
  const performSearch = useCallback(
    (page: number = 1) => {
      const q = searchQuery.trim();
      if (!q) return;

      if (refinementChain.length > 0 && !isBrowse) {
        const next = [...refinementChain, q];
        setRefinementChain(next);
        setSearchQuery("");
        setCurrentPage(1);
        setSelectedInventor(null);
        writeUrl(next, { page: 1 });
        return;
      }

      const next = [q];
      setRefinementChain(next);
      setCurrentPage(page);
      setSelectedInventor(null);
      setIsBrowse(false);
      writeUrl(next, { page });
      setSearchQuery("");
    },
    [searchQuery, refinementChain, isBrowse, writeUrl]
  );

  /** Fresh single-step search from a term (empty-state chips); optionally pins department. */
  const startFreshSearch = useCallback(
    (term: string, opts?: { department?: string }) => {
      const trimmed = term.trim();
      if (!trimmed) return;
      setSearchQuery("");
      setRefinementChain([trimmed]);
      setCurrentPage(1);
      setSelectedInventor(null);
      setIsBrowse(false);
      if (opts?.department !== undefined) {
        setDepartment(opts.department);
      }
      writeUrl([trimmed], { page: 1 });
    },
    [writeUrl]
  );

  /**
   * "Browse by department" chip: the department name is only a breadcrumb label, not real
   * query text — the actual request sends an empty query (see `searchRequest`) so every patent
   * in the department is returned, not just the ones whose title/abstract happen to repeat the
   * department's own name.
   */
  const startDepartmentBrowse = useCallback(
    (deptName: string) => {
      const trimmed = deptName.trim();
      if (!trimmed) return;
      setSearchQuery("");
      setRefinementChain([trimmed]);
      setCurrentPage(1);
      setSelectedInventor(null);
      setDepartment(trimmed);
      setIsBrowse(true);
      writeUrl([trimmed], { page: 1 });
    },
    [writeUrl]
  );

  const handleSearchKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
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

  const selectInventor = useCallback((inventor: SelectedInventor | null) => {
    setSelectedInventor(inventor);
    setCurrentPage(1);
  }, []);

  /**
   * Faculty inventors are always scoped by exact kerberos filter (never free-text name), so a
   * clicked suggestion can't fuzzy-match unrelated patents. The kerberos filter needs an active
   * query to attach to (searchRequest requires non-empty activeQuery), so a fresh search seeds
   * the inventor's name as the base query and selectInventor immediately narrows it to their
   * exact filings via filters.kerberos.
   */
  const selectInventorSuggestion = useCallback(
    (inventor: SuggestIPInventor) => {
      setShowSuggestions(false);
      setSearchQuery("");
      if (!inventor.kerberos) {
        startFreshSearch(inventor.name);
        return;
      }
      if (!hasSearched) {
        startFreshSearch(inventor.name);
      }
      selectInventor({ name: inventor.name, kerberos: inventor.kerberos });
    },
    [hasSearched, startFreshSearch, selectInventor]
  );

  const selectDocumentSuggestion = useCallback(
    (document: SuggestIPDocument) => {
      setShowSuggestions(false);
      startFreshSearch(document.title);
    },
    [startFreshSearch]
  );

  const goToPage = useCallback(
    (page: number) => {
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
    },
    [hasSearched, pagination, currentPage, refinementChain, writeUrl]
  );

  const changeMode = useCallback(
    (m: IPMode) => {
      setMode(m);
      setCurrentPage(1);
      if (hasSearched) writeUrl(refinementChain, { mode: m, page: 1 });
    },
    [hasSearched, refinementChain, writeUrl]
  );

  const applyFilters = useCallback(() => {
    setCurrentPage(1);
    if (hasSearched) writeUrl(refinementChain, { page: 1 });
    setShowFilters(false);
  }, [hasSearched, refinementChain, writeUrl]);

  const clearFilters = useCallback(() => {
    setYearFrom("");
    setYearTo("");
    setTypeOfIp("");
    setDepartment("");
    setCountry("");
    setCurrentPage(1);
  }, []);

  const goToChainLevel = useCallback(
    (index: number) => {
      if (index < 0 || index >= refinementChain.length - 1) return;
      const next = refinementChain.slice(0, index + 1);
      setRefinementChain(next);
      setCurrentPage(1);
      setSearchQuery("");
      writeUrl(next, { page: 1 });
    },
    [refinementChain, writeUrl]
  );

  const clearAll = useCallback(() => {
    setSearchQuery("");
    setRefinementChain([]);
    setCurrentPage(1);
    setSelectedInventor(null);
    setYearFrom("");
    setYearTo("");
    setTypeOfIp("");
    setDepartment("");
    setCountry("");
    setIsBrowse(false);
    skipUrlEffect.current = true;
    setSearchParams(new URLSearchParams());
  }, [setSearchParams]);

  /** Remove a term at any index; empty chain clears the search. */
  const removeRefinementTerm = useCallback(
    (index: number) => {
      if (index < 0 || index >= refinementChain.length) return;
      const next = refinementChain.filter((_, i) => i !== index);
      if (next.length === 0) {
        clearAll();
        return;
      }
      setRefinementChain(next);
      setCurrentPage(1);
      setSearchQuery("");
      writeUrl(next, { page: 1 });
    },
    [refinementChain, writeUrl, clearAll]
  );

  const activeFilterCount =
    (yearFrom ? 1 : 0) +
    (yearTo ? 1 : 0) +
    (typeOfIp ? 1 : 0) +
    (department ? 1 : 0) +
    (country ? 1 : 0);

  return {
    searchQuery,
    setSearchQuery,
    refinementChain,
    activeQuery,
    priorChain,
    currentPage,
    showSuggestions,
    setShowSuggestions,
    suggestionsRef,
    searchBoxRef,
    suggestData,
    isSuggestFetching,
    selectInventorSuggestion,
    selectDocumentSuggestion,
    mode,
    sort,
    setSort,
    perPage,
    setPerPage,
    showFilters,
    setShowFilters,
    yearFrom,
    setYearFrom,
    yearTo,
    setYearTo,
    typeOfIp,
    setTypeOfIp,
    department,
    setDepartment,
    country,
    setCountry,
    selectedInventor,
    selectInventor,
    selectedDocument,
    setSelectedDocument,
    hasSearched,
    searchData,
    isLoading,
    isFetching,
    error,
    results,
    pagination,
    relatedFaculty,
    facets,
    allFacultyData,
    isAllFacultyLoading,
    performSearch,
    startFreshSearch,
    startDepartmentBrowse,
    isBrowse,
    handleSearchKeyDown,
    goToPage,
    changeMode,
    applyFilters,
    clearFilters,
    clearAll,
    goToChainLevel,
    removeRefinementTerm,
    activeFilterCount,
  };
}

export type { IPMode, IPSort };
