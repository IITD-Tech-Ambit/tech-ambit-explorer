import { useState, useEffect, useRef, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { getFacultyByScopusId, searchFaculties } from "@/lib/api/services/directoryService";
import { normalizeName } from "@/components/explore/exploreAuthorUtils";
import type { SelectedAuthor } from "./useExploreSearchState";

const PEOPLE_PER_PAGE = 20;

const kerberosFromEmail = (email?: string) =>
  email ? email.split("@")[0]?.toLowerCase() : "";

async function kerberosByScopusId(scopusAuthorId: string): Promise<string | null> {
  try {
    const faculty = await getFacultyByScopusId(scopusAuthorId);
    return kerberosFromEmail(faculty.email) || null;
  } catch {
    return null;
  }
}

async function kerberosByName(name: string, department?: string): Promise<string | null> {
  const target = normalizeName(name);
  if (target.length < 2) return null;
  try {
    const { faculties } = await searchFaculties(name, 20);
    const sameName = faculties.filter((f) => normalizeName(f.name) === target);
    const sameDept = department ? sameName.filter((f) => f.department?.name === department) : [];
    const pick = sameDept.length === 1 ? sameDept[0] : sameName.length === 1 ? sameName[0] : null;
    return pick ? kerberosFromEmail(pick.email) || null : null;
  } catch {
    return null;
  }
}

type UseExplorePeopleArgs = {
  allFacultyData:
    | {
        total_faculty: number;
        total_matching_papers: number;
        departments: Array<{
          name: string;
          faculty: Array<{ author_id: string; kerberos?: string | null; name: string; paper_count: number; citation_count?: number }>;
        }>;
      }
    | undefined;
  isAllFacultyLoading: boolean;
  selectedAuthor: SelectedAuthor | null;
  setSelectedAuthor: (author: SelectedAuthor | null) => void;
  setAuthorScopedPage: (page: number | ((p: number) => number)) => void;
};

export function useExplorePeople({
  allFacultyData,
  isAllFacultyLoading,
  selectedAuthor,
  setSelectedAuthor,
  setAuthorScopedPage,
}: UseExplorePeopleArgs) {
  const [searchParams] = useSearchParams();
  // A deep link (?groupdept=1 from the chatbot button) wins over the saved
  // preference on arrival; otherwise fall back to the user's last choice.
  const [groupByDepartment, setGroupByDepartment] = useState<boolean>(() => {
    const fromUrl = searchParams.get("groupdept");
    if (fromUrl === "1") return true;
    if (fromUrl === "0") return false;
    return localStorage.getItem("explore-group-by-dept") === "true";
  });

  useEffect(() => {
    localStorage.setItem("explore-group-by-dept", String(groupByDepartment));
  }, [groupByDepartment]);

  const [expandedDepts, setExpandedDepts] = useState<Record<string, boolean>>({});

  const [isPeopleSidebarOpen, setIsPeopleSidebarOpen] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(min-width: 1280px)").matches;
  });
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
  }, [allFacultyData, isPeopleSidebarOpen, isPeopleLoadingMore]);

  const peopleTotalCount = allFacultyData?.total_faculty ?? 0;

  const toggleDepartment = (dept: string) => {
    setExpandedDepts((prev) => ({
      ...prev,
      [dept]: prev[dept] === undefined ? false : !prev[dept],
    }));
  };

  const isDeptExpanded = (dept: string) => expandedDepts[dept] !== false;

  // The tab must be opened synchronously inside the click; opening it after
  // the await gets it blocked as a popup.
  const openFacultyTab = useCallback(async (resolveKerberos: () => Promise<string | null>) => {
    const tab = window.open("", "_blank");
    try {
      const k = await resolveKerberos();
      if (!k) throw new Error("Faculty profile not found");
      if (tab) {
        tab.opener = null;
        tab.location.href = `/faculty/${k}`;
      } else {
        window.location.assign(`/faculty/${k}`);
      }
    } catch {
      tab?.close();
      toast.error("Faculty profile not found");
    }
  }, []);

  // People sidebar author_id is the Faculty expert_id (not a Scopus id) and no API
  // resolves expert_id, so look the person up by name, disambiguated by department.
  const openAggregatedFacultyProfile = (author: {
    author_id: string;
    name: string;
    department?: string;
    kerberos?: string | null;
  }) => {
    if (author.kerberos) {
      window.open(`/faculty/${author.kerberos}`, "_blank", "noopener");
      return;
    }
    void openFacultyTab(async () =>
      (await kerberosByName(author.name, author.department)) ?? (await kerberosByScopusId(author.author_id)),
    );
  };

  const handleAuthorClickByScopus = useCallback(
    (scopusAuthorId: string, authorName: string) =>
      openFacultyTab(async () =>
        (await kerberosByScopusId(scopusAuthorId)) ?? (await kerberosByName(authorName)),
      ),
    [openFacultyTab],
  );

  return {
    PEOPLE_PER_PAGE,
    groupByDepartment,
    setGroupByDepartment,
    isPeopleSidebarOpen,
    setIsPeopleSidebarOpen,
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
    openAggregatedFacultyProfile,
    handleAuthorClickByScopus,
    allFacultyData,
    isAllFacultyLoading,
    selectedAuthor,
  };
}
