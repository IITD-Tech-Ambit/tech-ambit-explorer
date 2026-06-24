import { useEffect } from "react";
import { useLocation } from "react-router-dom";

/** Scroll to top on every client-side route change. */
const ScrollToTop = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [pathname]);

  return null;
};

export default ScrollToTop;
