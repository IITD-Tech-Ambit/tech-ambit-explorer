import { useCallback, useEffect, useRef, useState } from "react";
import Navigation from "@/components/Navigation";
import ResearchAtlas, { type AtlasMode } from "@/components/atlas/ResearchAtlas";
import ResearchAtlasTiles from "@/components/atlas/ResearchAtlasTiles";
import { cn } from "@/lib/utils";

// Fast octree LOD streaming renderer (MongoDB-backed tiles) is the default.
// Set VITE_ATLAS_TILES=false to use the legacy full-payload renderer.
const USE_TILES = import.meta.env.VITE_ATLAS_TILES !== "false";

const Atlas = () => {
  const [atlasMode, setAtlasMode] = useState<AtlasMode>("interactive");
  const isViewMode = atlasMode === "view";
  const rootRef = useRef<HTMLDivElement>(null);

  const handleModeChange = useCallback((next: AtlasMode) => {
    setAtlasMode(next);
    const root = rootRef.current;
    if (!root) return;

    // Must run in the same user-gesture turn as the View/Explore click.
    if (next === "view" && !document.fullscreenElement) {
      void root.requestFullscreen().catch(() => {});
    } else if (next === "interactive" && document.fullscreenElement === root) {
      void document.exitFullscreen().catch(() => {});
    }
  }, []);

  useEffect(() => {
    const onFullscreenChange = () => {
      if (!document.fullscreenElement) {
        setAtlasMode("interactive");
      }
    };
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", onFullscreenChange);
  }, []);

  return (
    <div ref={rootRef} className="h-screen relative overflow-hidden bg-black">
      <div
        className={cn(
          "fixed top-0 left-0 right-0 z-50 transition-all duration-500 ease-in-out",
          isViewMode
            ? "-translate-y-full opacity-0 pointer-events-none"
            : "translate-y-0 opacity-100",
        )}
        aria-hidden={isViewMode}
      >
        <Navigation />
      </div>

      <main
        className={cn(
          "absolute inset-x-0 bottom-0 flex flex-col overflow-hidden transition-[top] duration-500 ease-in-out",
          isViewMode ? "top-0" : "top-20",
        )}
      >
        {USE_TILES ? (
          <ResearchAtlasTiles mode={atlasMode} onModeChange={handleModeChange} />
        ) : (
          <ResearchAtlas mode={atlasMode} onModeChange={handleModeChange} />
        )}
      </main>
    </div>
  );
};

export default Atlas;
