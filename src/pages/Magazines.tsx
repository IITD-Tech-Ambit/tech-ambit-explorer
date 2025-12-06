import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Eye, Download, Calendar } from "lucide-react";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import magazineCover from "@/assets/magazine-cover-1.jpg";

const Magazines = () => {
  const magazines = [
    {
      volume: "Vol. 12, Issue 1",
      title: "Artificial Intelligence Revolution",
      date: "March 2024",
      description: "Exploring the latest advances in AI research and applications at IIT Delhi.",
      cover: magazineCover,
      pages: 48,
    },
    {
      volume: "Vol. 11, Issue 4",
      title: "Sustainable Future",
      date: "December 2023",
      description: "Highlighting groundbreaking sustainability research and green technology innovations.",
      cover: magazineCover,
      pages: 52,
    },
    {
      volume: "Vol. 11, Issue 3",
      title: "Quantum Computing Era",
      date: "September 2023",
      description: "Deep dive into quantum research and its potential to transform computing.",
      cover: magazineCover,
      pages: 44,
    },
    {
      volume: "Vol. 11, Issue 2",
      title: "Biotechnology Breakthroughs",
      date: "June 2023",
      description: "Latest developments in biomedical engineering and molecular research.",
      cover: magazineCover,
      pages: 50,
    },
    {
      volume: "Vol. 11, Issue 1",
      title: "Smart Cities & IoT",
      date: "March 2023",
      description: "Research on urban innovation and Internet of Things applications.",
      cover: magazineCover,
      pages: 46,
    },
    {
      volume: "Vol. 10, Issue 4",
      title: "Energy Systems",
      date: "December 2022",
      description: "Exploring renewable energy solutions and power system innovations.",
      cover: magazineCover,
      pages: 48,
    },
  ];

  return (
    <div className="min-h-screen">
      <Navigation />

      {/* Header / Hero */}
      <section className="pt-28 pb-10">
        <div className="container mx-auto px-4">
          <div className="magazine-hero">
            <div className="magazine-cover">
              <img src={magazineCover} alt="Tech Ambit" className="w-full h-full object-cover" />
            </div>
            <div>
              <h1 className="text-4xl md:text-5xl font-bold mb-3">Tech Ambit Magazine</h1>
              <p className="text-lg text-muted-foreground mb-4 max-w-2xl">
                Our quarterly publication showcasing the latest research stories, breakthroughs, and innovations from across IIT Delhi's research ecosystem.
              </p>
              <div className="flex items-center gap-3">
                <Badge variant="secondary" className="text-base px-4 py-2">Published Quarterly</Badge>
                <Button className="mag-button-primary">Subscribe</Button>
                <Button variant="ghost" className="mag-button-ghost">Contribute</Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Magazines Grid */}
      <section className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {magazines.map((magazine, index) => (
            <Card key={index} className={`magazine-card group flex flex-col h-full`}> 
              <div className="relative overflow-hidden">
                <img
                  src={magazine.cover}
                  alt={magazine.title}
                  className={`w-full h-72 object-cover group-hover:scale-105 transition-smooth`}
                />
                <div className="absolute top-4 right-4">
                  <Badge className="bg-primary text-primary-foreground">
                    {magazine.pages} Pages
                  </Badge>
                </div>
                <div className="absolute left-4 bottom-4 bg-background/80 backdrop-blur-sm px-3 py-2 rounded-md">
                  <div className="text-xs text-muted-foreground">{magazine.volume}</div>
                  <div className="text-sm font-semibold text-primary">{magazine.title}</div>
                </div>
              </div>

              <CardContent className="p-6 flex-1 flex flex-col justify-between">
                <div className="magazine-meta mb-3">
                  <Calendar className="h-4 w-4" />
                  <span>{magazine.date}</span>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-6">{magazine.description}</p>
                </div>

                <div className="flex items-center gap-3 mt-4">
                  <Button className="mag-button-primary flex items-center gap-2">
                    <Eye className="h-4 w-4" />
                    View Online
                  </Button>
                  <Button className=" flex items-center gap-2">
                    <Download className="h-4 w-4" />
                    Download
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* About Magazine Section */}
      <section className="gradient-subtle py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl font-bold mb-6">About Tech Ambit Magazine</h2>
            <p className="text-lg text-muted-foreground mb-6">
              Tech Ambit Magazine is the official research publication of IIT Delhi, 
              featuring in-depth articles, interviews with leading researchers, and 
              comprehensive coverage of breakthrough discoveries across all disciplines.
            </p>
            <p className="text-lg text-muted-foreground">
              Each issue is carefully curated to bring you the most impactful research 
              stories, making complex scientific concepts accessible to a broader audience.
            </p>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Magazines;
