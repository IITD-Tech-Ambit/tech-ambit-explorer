import Navigation from "@/components/Navigation";

const Mindmap = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />
      
      <main className="flex-1 pt-20">
        <div className="container mx-auto px-4 py-8">
          <h1 className="text-4xl md:text-5xl font-bold mb-6">Mind Map</h1>
        </div>
      </main>
    </div>
  );
};

export default Mindmap;
