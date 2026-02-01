import { useState } from "react";
import Navigation from "@/components/Navigation";
import MindMap from "@/components/MindMap";
import NavigateModal from "@/components/NavigateModal";
import { Button } from "@/components/ui/button";
import { Compass, Loader2 } from "lucide-react";
import { OpenPathResponse, fetchOpenPath } from "@/lib/api";

const Mindmap = () => {
  const [isNavigateModalOpen, setIsNavigateModalOpen] = useState(false);
  const [navigationPath, setNavigationPath] = useState<OpenPathResponse | null>(null);
  const [isLoadingPath, setIsLoadingPath] = useState(false);

  const handleNavigate = async (documentJson: string) => {
    setIsLoadingPath(true);
    try {
      // Parse the JSON string to object
      const documentData = JSON.parse(documentJson);
      const pathResponse = await fetchOpenPath(documentData);
      setNavigationPath(pathResponse);
      setIsNavigateModalOpen(false);
    } catch (error) {
      console.error('Error fetching open path:', error);
      alert('Failed to fetch navigation path. Please check the document data.');
    } finally {
      setIsLoadingPath(false);
    }
  };

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
            <Button 
              onClick={() => setIsNavigateModalOpen(true)}
              className="flex items-center gap-2"
            >
              <Compass className="h-4 w-4" />
              Navigate
            </Button>
          </div>
          <div className="flex-1 overflow-hidden">
            <MindMap 
              navigationPath={navigationPath}
              onNavigationComplete={handleNavigationComplete}
            />
          </div>
        </div>
      </main>

      <NavigateModal
        isOpen={isNavigateModalOpen}
        onClose={() => setIsNavigateModalOpen(false)}
        onSubmit={handleNavigate}
      />

      {/* Loading overlay for path fetching */}
      {isLoadingPath && (
        <div className="fixed inset-0 bg-background/50 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="flex items-center gap-2 bg-background p-4 rounded-lg shadow-lg border">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            <span className="text-sm font-medium">Fetching navigation path...</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default Mindmap;
