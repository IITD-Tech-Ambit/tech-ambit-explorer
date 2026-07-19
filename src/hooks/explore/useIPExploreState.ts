import { useState, useEffect, useMemo, useCallback, useRef, type KeyboardEvent } from "react";
import { useSearchParams } from "react-router-dom";
import { useIPSearch } from "@/lib/api/hooks/useIPSearch";
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
  const [sort, setSort] = useState<IPSort>("relevance");
  const [perPage, setPerPage] = useState(20);

  const [showFilters, setShowFilters] = useState(false);
  const [yearFrom, setYearFrom] = useState("");
  const [yearTo, setYearTo] = useState("");
  const [typeOfIp, setTypeOfIp] = useState("");
  const [fieldOfInvention, setFieldOfInvention] = useState("");
  const [country, setCountry] = useState("");

  const [selectedInventor, setSelectedInventor] = useState<SelectedInventor | null>(null);
  const [selectedDocument, setSelectedDocument] = useState<IPDocument | null>(null);

  const [showSuggestions, setShowSuggestions] = useState(false);
  const suggestionsRef = useRef<IPSearchSuggestionsHandle>(null);
  const searchBoxRef = useRef<HTMLDivElement>(null);

  const activeQuery = refinementChain[refinementChain.length - 1] ?? "";
  const priorChain = refinementChain.slice(0, -1);
  const hasSearched = refinementChain.length > 0;

  // Highlight every word across the whole chain (not just the newest term).
  const highlightTokens = useMemo(() => {
    const src = refinementChain.join(" ").trim();
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
    setSearchQuery("");
    setRefinementChain(q ? [q, ...refines] : []);
    setCurrentPage(page ? parseInt(page, 10) : 1);
    setMode(modeParam === "advanced" ? "advanced" : "basic");
    setSelectedInventor(null);
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
      skipUrlEffect.current = true;
      setSearchParams(params);
    },
    [currentPage, mode, setSearchParams]
  );

  const filters = useMemo<IPSearchFilters>(() => {
    const f: IPSearchFilters = {};
    if (yearFrom) f.year_from = parseInt(yearFrom, 10);
    if (yearTo) f.year_to = parseInt(yearTo, 10);
    if (typeOfIp) f.type_of_ip = typeOfIp;
    if (fieldOfInvention) f.field_of_invention = fieldOfInvention;
    if (country) f.country = country;
    if (selectedInventor?.kerberos) f.kerberos = selectedInventor.kerberos;
    return f;
  }, [yearFrom, yearTo, typeOfIp, fieldOfInvention, country, selectedInventor]);

  // Newest term is `query`; prior terms are `refine_chain`.
  const searchRequest = useMemo<IPSearchRequest | null>(() => {
    if (!activeQuery.trim()) return null;
    return {
      query: activeQuery,
      page: currentPage,
      per_page: perPage,
      sort,
      mode,
      filters,
      ...(priorChain.length > 0 ? { refine_chain: priorChain } : {}),
    };
  }, [activeQuery, priorChain, currentPage, perPage, sort, mode, filters]);

  const { data: searchData, isLoading, isFetching, error } = useIPSearch(searchRequest);

  const { data: suggestData, isFetching: isSuggestFetching } = useIPSuggest(searchQuery, {
    enabled: showSuggestions,
  });

  const results = searchData?.results ?? [];
  const pagination = searchData?.pagination ?? null;
  const relatedFaculty = searchData?.related_faculty ?? [];
  const facets = searchData?.facets ?? {};

  // First submission sets base topic; subsequent submissions append a narrowing step.
  const performSearch = useCallback(
    (page: number = 1) => {
      const q = searchQuery.trim();
      if (!q) return;

      if (refinementChain.length > 0) {
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
      writeUrl(next, { page });
      setSearchQuery("");
    },
    [searchQuery, refinementChain, writeUrl]
  );

  /** Fresh single-step search from a term (empty-state chips); optionally pins field_of_invention. */
  const startFreshSearch = useCallback(
    (term: string, opts?: { fieldOfInvention?: string }) => {
      const trimmed = term.trim();
      if (!trimmed) return;
      setSearchQuery("");
      setRefinementChain([trimmed]);
      setCurrentPage(1);
      setSelectedInventor(null);
      if (opts?.fieldOfInvention !== undefined) {
        setFieldOfInvention(opts.fieldOfInvention);
      }
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

  /** Mid-search faculty inventors scope via kerberos; otherwise start a fresh name search. */
  const selectInventorSuggestion = useCallback(
    (inventor: SuggestIPInventor) => {
      setShowSuggestions(false);
      setSearchQuery("");
      if (hasSearched && inventor.kerberos) {
        selectInventor({ name: inventor.name, kerberos: inventor.kerberos });
        return;
      }
      startFreshSearch(inventor.name);
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
    setFieldOfInvention("");
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
    setFieldOfInvention("");
    setCountry("");
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
    (fieldOfInvention ? 1 : 0) +
    (country ? 1 : 0);

  return {
    searchQuery,
    setSearchQuery,
    refinementChain,
    activeQuery,
    priorChain,
    highlightTokens,
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
    fieldOfInvention,
    setFieldOfInvention,
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
    performSearch,
    startFreshSearch,
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
