import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
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
    <div className="min-h-screen flex flex-col page-bg">
      <Navigation />

      <main className="flex flex-col shrink-0">
        <div className="container mx-auto px-4 pt-24 pb-4 flex flex-col h-[calc(100vh-5rem)]">
          <h1 className="text-4xl md:text-5xl font-bold mb-6 shrink-0">Mind Map</h1>
          <div className="flex-1 min-h-0 relative">
            <MindMap
              navigationPath={navigationPath}
              onNavigationComplete={handleNavigationComplete}
            />
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Mindmap;
