import { useState } from "react";
import Navigation from "@/components/Navigation";
import ResearchAtlas, { type AtlasMode } from "@/components/knowledge-graph/ResearchAtlas";
import { cn } from "@/lib/utils";

const KnowledgeGraph = () => {
  const [atlasMode, setAtlasMode] = useState<AtlasMode>("interactive");
  const isViewMode = atlasMode === "view";

  return (
    <div className="h-screen relative overflow-hidden bg-black">
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
        <ResearchAtlas onModeChange={setAtlasMode} />
      </main>
    </div>
  );
};

export default KnowledgeGraph;
