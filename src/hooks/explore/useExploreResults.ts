import { useState, useEffect, useMemo } from "react";
import type { SearchDocument } from "@/lib/api";
import type { AuthorScopedSearchResponse } from "@/lib/api/types";
import type { SelectedAuthor } from "./useExploreSearchState";

type UseExploreResultsArgs = {
  results: SearchDocument[];
  activeFilter: string;
  clientSort: "relevance" | "citations";
  selectedAuthor: SelectedAuthor | null;
  authorScopedData: AuthorScopedSearchResponse | undefined;
  refinementChain: string[];
};

export function useExploreResults({
  results,
  activeFilter,
  clientSort,
  selectedAuthor,
  authorScopedData,
  refinementChain,
}: UseExploreResultsArgs) {
  const [selectedDocument, setSelectedDocument] = useState<SearchDocument | null>(null);

  useEffect(() => {
    if (selectedDocument) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [selectedDocument]);

  const filteredResults = useMemo(() => {
    if (activeFilter === "All") return results;
    return results.filter((item) => item.document_type === activeFilter);
  }, [activeFilter, results]);

  const sortedResults = useMemo(() => {
    if (selectedAuthor && authorScopedData?.results) {
      const authorResults = [...authorScopedData.results];
      if (clientSort === "citations") {
        return authorResults.sort((a, b) => (b.citation_count || 0) - (a.citation_count || 0));
      }
      return authorResults;
    }

    const finalResults = [...filteredResults];
    if (clientSort === "citations") {
      return finalResults.sort((a, b) => (b.citation_count || 0) - (a.citation_count || 0));
    }
    return finalResults;
  }, [filteredResults, clientSort, selectedAuthor, authorScopedData]);

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

  return {
    selectedDocument,
    setSelectedDocument,
    filteredResults,
    sortedResults,
    highlightTokens,
  };
}
