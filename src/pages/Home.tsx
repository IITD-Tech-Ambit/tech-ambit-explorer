import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Search, ArrowRight, Microscope, Users, BookOpen } from "lucide-react";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import heroImage from "@/assets/iit-delhi-main.png";
import researchCollage from "@/assets/iit-delhi-aerial.png";

const Home = () => {
  const highlights = [
    {
      icon: Microscope,
      title: "Research Repository",
      description: "Access comprehensive database of research projects across departments",
      link: "/explore",
    },
    {
      icon: Users,
      title: "Faculty Directory",
      description: "Connect with leading researchers and faculty members",
      link: "/directory",
    },
    {
      icon: BookOpen,
      title: "Tech Ambit Magazine",
      description: "Explore our quarterly research publications and stories",
      link: "/magazines",
    },
  ];

  return (
    <div className="min-h-screen">
      <Navigation />
      
      {/* Hero Section */}
      <section className="relative h-[90vh] flex items-center justify-center overflow-hidden">
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${heroImage})` }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-background/95 via-background/80 to-background/50" />
        </div>
        
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-3xl animate-fade-in">
            <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight">
              Exploring Innovation and Research at{" "}
              <span className="gradient-primary bg-clip-text text-transparent">
                IIT Delhi
              </span>
            </h1>
            <p className="text-xl md:text-2xl text-muted-foreground mb-8">
              Your gateway to cutting-edge interdisciplinary research, sustainability initiatives, 
              and breakthrough innovations from India's premier engineering institution.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link to="/explore">
                <Button size="lg" className="w-full sm:w-auto group">
                  Explore Research
                  <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-smooth" />
                </Button>
              </Link>
              <div className="relative w-full sm:w-auto">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search research, people, publications..."
                  className="w-full pl-10 pr-4 py-3 rounded-lg bg-background/50 backdrop-blur-sm border border-border focus:outline-none focus:ring-2 focus:ring-primary transition-smooth"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Highlights Section */}
      <section className="container mx-auto px-4 py-20">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {highlights.map((item, index) => (
            <Link key={index} to={item.link}>
              <Card className="h-full hover:shadow-elegant transition-smooth group cursor-pointer border-border">
                <CardContent className="p-6">
                  <div className="w-12 h-12 gradient-primary rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-smooth">
                    <item.icon className="h-6 w-6 text-primary-foreground" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2 group-hover:text-primary transition-smooth">
                    {item.title}
                  </h3>
                  <p className="text-muted-foreground text-sm">
                    {item.description}
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      {/* Featured Research Section */}
      <section className="gradient-subtle py-20">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="animate-slide-up">
              <h2 className="text-4xl font-bold mb-6">
                Pioneering Research Across Disciplines
              </h2>
              <p className="text-lg text-muted-foreground mb-6">
                From artificial intelligence and quantum computing to sustainable energy 
                and biotechnology, IIT Delhi researchers are pushing the boundaries of 
                human knowledge and creating solutions for tomorrow's challenges.
              </p>
              <ul className="space-y-3 mb-8">
                <li className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-primary rounded-full" />
                  <span>500+ Active Research Projects</span>
                </li>
                <li className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-primary rounded-full" />
                  <span>50+ Interdisciplinary Research Centers</span>
                </li>
                <li className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-primary rounded-full" />
                  <span>1000+ Research Publications Annually</span>
                </li>
              </ul>
              <Link to="/explore">
                <Button variant="outline" size="lg" className="group">
                  View All Research
                  <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-smooth" />
                </Button>
              </Link>
            </div>
            <div className="animate-fade-in">
              <img
                src={researchCollage}
                alt="Research at IIT Delhi"
                className="rounded-xl shadow-elegant w-full h-auto"
              />
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Home;
