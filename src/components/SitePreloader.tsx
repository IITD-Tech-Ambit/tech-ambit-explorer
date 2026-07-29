import { useEffect, useState } from "react";
import instituteSeal from "@/assets/logo2-transparent.png";

type SitePreloaderProps = {
  minDurationMs?: number;
  onComplete?: () => void;
};

const SitePreloader = ({
  minDurationMs = 2200,
  onComplete,
}: SitePreloaderProps) => {
  const [visible, setVisible] = useState(true);
  const [fadingOut, setFadingOut] = useState(false);

  useEffect(() => {
    document.body.classList.toggle("preloader-active", visible);
    return () => document.body.classList.remove("preloader-active");
  }, [visible]);

  useEffect(() => {
    const start = window.performance.now();
    let fadeTimer = 0;
    let completeTimer = 0;

    const finish = () => {
      const elapsed = window.performance.now() - start;
      const remaining = Math.max(0, minDurationMs - elapsed);

      fadeTimer = window.setTimeout(() => {
        setFadingOut(true);
        completeTimer = window.setTimeout(() => {
          setVisible(false);
          onComplete?.();
        }, 420);
      }, remaining);
    };

    if (document.readyState === "complete") {
      finish();
      return;
    }

    window.addEventListener("load", finish, { once: true });
    return () => {
      window.removeEventListener("load", finish);
      window.clearTimeout(fadeTimer);
      window.clearTimeout(completeTimer);
    };
  }, [minDurationMs, onComplete]);

  if (!visible) return null;

  return (
    <div
      className={`site-preloader${fadingOut ? " site-preloader--fade" : ""}`}
      aria-label="Loading Research Ambit"
      role="status"
    >
      <div className="site-preloader__backdrop" />
      <div className="site-preloader__content">
        <div className="site-preloader__seal-wrap">
          <div className="site-preloader__halo site-preloader__halo--one" />
          <div className="site-preloader__halo site-preloader__halo--two" />
          <div className="site-preloader__ring" />
          <img
            src={instituteSeal}
            alt="Indian Institute of Technology Delhi"
            className="site-preloader__seal"
          />
        </div>

        <div className="site-preloader__copy">
          <p className="site-preloader__eyebrow">Indian Institute of Technology Delhi</p>
          <h1 className="site-preloader__title">Research Ambit</h1>
          <p className="site-preloader__subtitle">
            Preparing a guided view of research, people, ideas, and innovation.
          </p>
        </div>

        <div className="site-preloader__progress" aria-hidden="true">
          <span className="site-preloader__progress-bar" />
        </div>
      </div>
    </div>
  );
};

export default SitePreloader;
