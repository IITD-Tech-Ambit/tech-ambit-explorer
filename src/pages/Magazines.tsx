import { Card, CardContent } from "@/components/ui/card";
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

      {/* Header */}
      <section className="gradient-subtle pt-32 pb-16">
        <div className="container mx-auto px-4">
          <h1 className="text-5xl font-bold mb-4 animate-fade-in">
            Tech Ambit Magazine
          </h1>
          <p className="text-xl text-muted-foreground mb-4 max-w-3xl animate-slide-up">
            Our quarterly publication showcasing the latest research stories, 
            breakthroughs, and innovations from across IIT Delhi's research ecosystem.
          </p>
          <Badge variant="secondary" className="text-base px-4 py-2">
            Published Quarterly
          </Badge>
        </div>
      </section>

      {/* Magazines Grid */}
      <section className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {magazines.map((magazine, index) => (
            <Card
              key={index}
              className="overflow-hidden hover:shadow-elegant transition-smooth border-border group"
            >
              <div className="relative overflow-hidden">
                <img
                  src={magazine.cover}
                  alt={magazine.title}
                  className="w-full h-80 object-cover group-hover:scale-105 transition-smooth"
                />
                <div className="absolute top-4 right-4">
                  <Badge className="bg-primary text-primary-foreground">
                    {magazine.pages} Pages
                  </Badge>
                </div>
              </div>

              <CardContent className="p-6">
                <div className="flex items-center space-x-2 text-sm text-muted-foreground mb-2">
                  <Calendar className="h-4 w-4" />
                  <span>{magazine.date}</span>
                </div>

                <h3 className="text-xl font-semibold mb-1">{magazine.volume}</h3>
                <h4 className="text-lg text-primary font-medium mb-3">
                  {magazine.title}
                </h4>
                <p className="text-sm text-muted-foreground mb-6">
                  {magazine.description}
                </p>

                <div className="flex space-x-2">
                  <Button className="flex-1">
                    <Eye className="h-4 w-4 mr-2" />
                    View Online
                  </Button>
                  <Button variant="outline">
                    <Download className="h-4 w-4" />
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
