import { useState, useEffect, useRef, useCallback } from "react";
import type { RelatedFaculty } from "@/lib/api";
import { getFacultyByScopusId, getFacultyById } from "@/lib/api/services/directoryService";
import type { SelectedAuthor } from "./useExploreSearchState";

const PEOPLE_PER_PAGE = 20;

const kerberosFromEmail = (email?: string) =>
  email ? email.split("@")[0]?.toLowerCase() : "";

type UseExplorePeopleArgs = {
  relatedFaculty: RelatedFaculty[];
  allFacultyData:
    | {
        total_faculty: number;
        total_matching_papers: number;
        departments: Array<{
          name: string;
          faculty: Array<{ author_id: string; name: string; paper_count: number }>;
        }>;
      }
    | undefined;
  isAllFacultyLoading: boolean;
  selectedAuthor: SelectedAuthor | null;
  setSelectedAuthor: (author: SelectedAuthor | null) => void;
  setAuthorScopedPage: (page: number | ((p: number) => number)) => void;
};

export function useExplorePeople({
  relatedFaculty,
  allFacultyData,
  isAllFacultyLoading,
  selectedAuthor,
  setSelectedAuthor,
  setAuthorScopedPage,
}: UseExplorePeopleArgs) {
  const [groupByDepartment, setGroupByDepartment] = useState<boolean>(() => {
    const saved = localStorage.getItem("explore-group-by-dept");
    return saved === "true";
  });

  useEffect(() => {
    localStorage.setItem("explore-group-by-dept", String(groupByDepartment));
  }, [groupByDepartment]);

  const [expandedDepts, setExpandedDepts] = useState<Record<string, boolean>>({});

  const [isPeopleSidebarOpen, setIsPeopleSidebarOpen] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(min-width: 1280px)").matches;
  });
  const [showAllFaculty, setShowAllFaculty] = useState(false);
  const [isPeopleLoadingMore, setIsPeopleLoadingMore] = useState(false);
  const [peoplePage, setPeoplePage] = useState(1);

  const [sidebarWidth, setSidebarWidth] = useState(24);
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
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  }, []);

  const stopResizing = useCallback(() => {
    isResizing.current = false;
    setIsResizingState(false);
    document.body.style.cursor = "";
    document.body.style.userSelect = "";
  }, []);

  const resize = useCallback((mouseMoveEvent: MouseEvent) => {
    if (isResizing.current && leftColRef.current && containerRef.current) {
      const containerWidth = containerRef.current.clientWidth;
      const rect = leftColRef.current.getBoundingClientRect();
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

  useEffect(() => {
    const sentinel = peopleSentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && peopleHasMoreRef.current && !isPeopleLoadingMore) {
          setIsPeopleLoadingMore(true);
          setTimeout(() => {
            setPeoplePage((p) => p + 1);
            setIsPeopleLoadingMore(false);
          }, 500);
        }
      },
      { threshold: 0.1 }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [showAllFaculty, allFacultyData, isPeopleSidebarOpen, isPeopleLoadingMore]);

  const peopleTotalCount =
    showAllFaculty || relatedFaculty.length === 0
      ? (allFacultyData?.total_faculty ?? 0)
      : relatedFaculty.length;

  const toggleDepartment = (dept: string) => {
    setExpandedDepts((prev) => ({
      ...prev,
      [dept]: prev[dept] === undefined ? false : !prev[dept],
    }));
  };

  const isDeptExpanded = (dept: string) => expandedDepts[dept] !== false;

  const openRelatedFacultyProfile = async (faculty: RelatedFaculty) => {
    try {
      const full = await getFacultyById(faculty._id);
      const k = kerberosFromEmail(full.email);
      if (k) window.open(`/faculty/${k}`, "_blank", "noopener");
    } catch {
      /* ignore */
    }
  };

  const openAggregatedFacultyProfile = async (scopusAuthorId: string, _fallbackName?: string) => {
    try {
      const full = await getFacultyByScopusId(scopusAuthorId);
      const k = kerberosFromEmail(full.email);
      if (k) window.open(`/faculty/${k}`, "_blank", "noopener");
    } catch {
      /* ignore */
    }
  };

  const handleAuthorClickByScopus = useCallback(async (scopusAuthorId: string, _authorName: string) => {
    try {
      const full = await getFacultyByScopusId(scopusAuthorId);
      const k = kerberosFromEmail(full.email);
      if (k) window.open(`/faculty/${k}`, "_blank", "noopener");
    } catch {
      /* ignore */
    }
  }, []);

  return {
    PEOPLE_PER_PAGE,
    groupByDepartment,
    setGroupByDepartment,
    isPeopleSidebarOpen,
    setIsPeopleSidebarOpen,
    showAllFaculty,
    setShowAllFaculty,
    isPeopleLoadingMore,
    peoplePage,
    setPeoplePage,
    sidebarWidth,
    isResizingState,
    leftColRef,
    containerRef,
    peopleSentinelRef,
    peopleHasMoreRef,
    startResizing,
    peopleTotalCount,
    toggleDepartment,
    isDeptExpanded,
    openRelatedFacultyProfile,
    openAggregatedFacultyProfile,
    handleAuthorClickByScopus,
    relatedFaculty,
    allFacultyData,
    isAllFacultyLoading,
    selectedAuthor,
  };
}
