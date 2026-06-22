import Navigation from "@/components/Navigation";
import ResearchAtlas from "@/components/knowledge-graph/ResearchAtlas";

const KnowledgeGraph = () => {
  return (
    <div className="h-screen relative overflow-hidden page-bg">
      <Navigation />
      <main className="absolute top-20 left-0 right-0 bottom-0 flex flex-col overflow-hidden">
        <ResearchAtlas />
      </main>
    </div>
  );
};

export default KnowledgeGraph;
