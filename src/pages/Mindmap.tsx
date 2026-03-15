import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import Navigation from "@/components/Navigation";
import MindMap from "@/components/MindMap";
import { OpenPathResponse } from "@/lib/api";

const Mindmap = () => {
  const location = useLocation();
  const [navigationPath, setNavigationPath] = useState<OpenPathResponse | null>(null);

  // Check if navigation path was passed from Explore page
  useEffect(() => {
    if (location.state?.navigationPath) {
      setNavigationPath(location.state.navigationPath);
      // Clear the location state to prevent re-triggering on component updates
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  const handleNavigationComplete = () => {
    setNavigationPath(null);
  };

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <Navigation />
      
      <main className="flex-1 pt-20 overflow-hidden">
        <div className="h-full flex flex-col px-4 py-8">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-4xl md:text-5xl font-bold">Mind Map</h1>
          </div>
          <div className="flex-1 overflow-hidden">
            <MindMap 
              navigationPath={navigationPath}
              onNavigationComplete={handleNavigationComplete}
            />
          </div>
        </div>
      </main>
    </div>
  );
};

export default Mindmap;
