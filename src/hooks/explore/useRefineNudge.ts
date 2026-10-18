import { useCallback, useEffect, useState } from "react";

const DWELL_MS = 20_000;
const DEEP_PAGE = 3;
const MAX_DISMISSALS = 2;
const DISMISS_KEY = "explore-refine-nudge-dismissals";

function readDismissals(): number {
  try {
    return Number(sessionStorage.getItem(DISMISS_KEY)) || 0;
  } catch {
    return 0;
  }
}

interface UseRefineNudgeOptions {
  /** Identifies the search being looked at; the dwell timer restarts when it changes. */
  searchKey: string;
  eligible: boolean;
  engaged: boolean;
  page: number;
}

export function useRefineNudge({ searchKey, eligible, engaged, page }: UseRefineNudgeOptions) {
  const [dwelledKey, setDwelledKey] = useState<string | null>(null);
  const [engagedKey, setEngagedKey] = useState<string | null>(null);
  const [dismissedKey, setDismissedKey] = useState<string | null>(null);
  const [dismissals, setDismissals] = useState(readDismissals);

  useEffect(() => {
    if (engaged) setEngagedKey(searchKey);
  }, [engaged, searchKey]);

  useEffect(() => {
    if (!eligible || engaged || dwelledKey === searchKey) return;
    let visibleMs = 0;
    const tick = 1000;
    const id = window.setInterval(() => {
      if (document.visibilityState !== "visible") return;
      visibleMs += tick;
      if (visibleMs >= DWELL_MS) {
        setDwelledKey(searchKey);
        window.clearInterval(id);
      }
    }, tick);
    return () => window.clearInterval(id);
  }, [eligible, engaged, searchKey, dwelledKey]);

  const dismiss = useCallback(() => {
    setDismissedKey(searchKey);
    setDismissals((n) => {
      const next = n + 1;
      try {
        sessionStorage.setItem(DISMISS_KEY, String(next));
      } catch {
        /* storage unavailable */
      }
      return next;
    });
  }, [searchKey]);

  const visible =
    eligible &&
    !engaged &&
    engagedKey !== searchKey &&
    dismissedKey !== searchKey &&
    dismissals < MAX_DISMISSALS &&
    (dwelledKey === searchKey || page >= DEEP_PAGE);

  return { visible, dismiss };
}
