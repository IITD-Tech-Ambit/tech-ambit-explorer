import Navigation from "@/components/Navigation";
import KnowledgeGraphShell from "@/components/knowledge-graph/KnowledgeGraphShell";

const KnowledgeGraph = () => {
  return (
    <div className="h-screen relative overflow-hidden page-bg">
      <Navigation />
      {/* Pin content directly under the fixed h-20 nav — no pt-20 gap */}
      <main className="absolute top-20 left-0 right-0 bottom-0 flex flex-col overflow-hidden">
        <KnowledgeGraphShell />
      </main>
    </div>
  );
};

export default KnowledgeGraph;
