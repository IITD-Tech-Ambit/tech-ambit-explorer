import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Leaf, Users, FileText, Award, Download, ExternalLink } from "lucide-react";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import sustainabilityImage from "@/assets/sustainability.jpg";

const Sustainability = () => {
  const initiatives = [
    {
      title: "Solar Energy Research",
      description: "Developing next-generation photovoltaic cells with improved efficiency",
      status: "Ongoing",
      impact: "30% increase in energy conversion",
    },
    {
      title: "Waste Management Solutions",
      description: "Smart waste processing and recycling technologies for urban areas",
      status: "Phase 2",
      impact: "40% reduction in landfill waste",
    },
    {
      title: "Green Building Materials",
      description: "Sustainable construction materials from recycled and bio-based sources",
      status: "Ongoing",
      impact: "25% carbon footprint reduction",
    },
    {
      title: "Water Conservation Systems",
      description: "Innovative water purification and recycling technologies",
      status: "Phase 3",
      impact: "50% water usage reduction",
    },
  ];

  const editors = [
    { name: "Dr. Ramesh Patel", role: "Programme Director" },
    { name: "Dr. Sunita Verma", role: "Research Coordinator" },
    { name: "Dr. Arun Kumar", role: "Technical Advisor" },
  ];

  const publications = [
    {
      title: "White Paper: Carbon Neutrality Roadmap",
      type: "White Paper",
      date: "January 2024",
      pages: 45,
    },
    {
      title: "Policy Brief: Renewable Energy Integration",
      type: "Policy Brief",
      date: "December 2023",
      pages: 28,
    },
    {
      title: "Annual Report: Sustainability Initiatives 2023",
      type: "Report",
      date: "November 2023",
      pages: 120,
    },
  ];

  return (
    <div className="min-h-screen">
      <Navigation />

      {/* Hero Section */}
      <section className="relative h-[60vh] flex items-center justify-center overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${sustainabilityImage})` }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-background/95 via-background/80 to-background/60" />
        </div>

        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-3xl animate-fade-in">
            <Badge className="mb-4 bg-green-600 text-white">
              <Leaf className="h-4 w-4 mr-2" />
              Flagship Programme
            </Badge>
            <h1 className="text-5xl md:text-6xl font-bold mb-4">
              Sustainability Programme
            </h1>
            <p className="text-xl text-muted-foreground">
              Leading research in environmental sustainability, renewable energy, 
              and green technologies for a sustainable future.
            </p>
          </div>
        </div>
      </section>

      {/* Overview Section */}
      <section className="container mx-auto px-4 py-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
          <Card className="border-border">
            <CardContent className="p-6 text-center">
              <div className="w-12 h-12 gradient-primary rounded-full flex items-center justify-center mx-auto mb-4">
                <FileText className="h-6 w-6 text-primary-foreground" />
              </div>
              <div className="text-3xl font-bold mb-2">50+</div>
              <p className="text-muted-foreground">Active Projects</p>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardContent className="p-6 text-center">
              <div className="w-12 h-12 gradient-primary rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="h-6 w-6 text-primary-foreground" />
              </div>
              <div className="text-3xl font-bold mb-2">200+</div>
              <p className="text-muted-foreground">Researchers</p>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardContent className="p-6 text-center">
              <div className="w-12 h-12 gradient-primary rounded-full flex items-center justify-center mx-auto mb-4">
                <Award className="h-6 w-6 text-primary-foreground" />
              </div>
              <div className="text-3xl font-bold mb-2">25+</div>
              <p className="text-muted-foreground">Awards & Recognition</p>
            </CardContent>
          </Card>
        </div>

        {/* Programme Overview */}
        <div className="max-w-4xl mx-auto mb-16">
          <h2 className="text-3xl font-bold mb-6">Programme Overview</h2>
          <p className="text-lg text-muted-foreground mb-4">
            The IIT Delhi Flagship Sustainability Programme brings together researchers 
            from diverse disciplines to address critical environmental challenges through 
            innovative research and practical solutions.
          </p>
          <p className="text-lg text-muted-foreground">
            Our focus areas include renewable energy systems, sustainable materials, 
            water conservation, waste management, and climate change mitigation strategies.
          </p>
        </div>
      </section>

      {/* Initiatives */}
      <section className="gradient-subtle py-16">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold mb-8 text-center">Ongoing Initiatives</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-6xl mx-auto">
            {initiatives.map((initiative, index) => (
              <Card key={index} className="border-border hover:shadow-elegant transition-smooth">
                <CardHeader>
                  <div className="flex items-start justify-between mb-2">
                    <CardTitle className="text-xl">{initiative.title}</CardTitle>
                    <Badge variant="secondary">{initiative.status}</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-4">{initiative.description}</p>
                  <div className="flex items-center space-x-2">
                    <Award className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium">{initiative.impact}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Editorial Team */}
      <section className="container mx-auto px-4 py-16">
        <h2 className="text-3xl font-bold mb-8 text-center">Editorial Team</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          {editors.map((editor, index) => (
            <Card key={index} className="border-border text-center">
              <CardContent className="p-6">
                <div className="w-20 h-20 rounded-full bg-primary-light flex items-center justify-center mx-auto mb-4 text-3xl">
                  👨‍🔬
                </div>
                <h3 className="font-semibold text-lg mb-1">{editor.name}</h3>
                <p className="text-sm text-muted-foreground">{editor.role}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Publications */}
      <section className="gradient-subtle py-16">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold mb-8 text-center">
            Publications & Reports
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {publications.map((pub, index) => (
              <Card key={index} className="border-border">
                <CardContent className="p-6">
                  <Badge variant="outline" className="mb-4">
                    {pub.type}
                  </Badge>
                  <h3 className="font-semibold text-lg mb-2">{pub.title}</h3>
                  <p className="text-sm text-muted-foreground mb-1">{pub.date}</p>
                  <p className="text-sm text-muted-foreground mb-4">
                    {pub.pages} pages
                  </p>
                  <div className="flex space-x-2">
                    <Button size="sm" className="flex-1">
                      <Download className="h-4 w-4 mr-2" />
                      Download
                    </Button>
                    <Button size="sm" variant="outline">
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Sustainability;
