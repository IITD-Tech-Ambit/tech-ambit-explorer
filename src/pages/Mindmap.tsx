import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";

const Mindmap = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />
      
      <main className="flex-1 pt-20">
        <div className="container mx-auto px-4 py-12">
          <h1 className="text-4xl md:text-5xl font-bold mb-8">Mind map</h1>
          
          <div className="bg-muted/30 rounded-lg p-8 border border-border">
            <p className="text-muted-foreground">
              Mind map content will be displayed here.
            </p>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Mindmap;
