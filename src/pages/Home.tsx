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
    <div className="min-h-screen home-bg">
      <Navigation />

      {/* Hero Section - Responsive height for all devices */}
      <section className="relative min-h-[60vh] sm:min-h-[70vh] md:min-h-[80vh] lg:h-[90vh] flex items-center justify-center overflow-hidden pt-24 pb-12 sm:pt-28 sm:pb-16 md:pt-20 md:pb-0">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: `url('${heroImage}')`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            backgroundRepeat: "no-repeat",
            filter: "brightness(0.66) contrast(1.05) saturate(1.05)",
          }}
        >
          {/* soft gradient overlay + subtle vignette for better text contrast */}
          <div className="absolute inset-0 bg-gradient-to-r from-black/50 sm:from-black/40 via-black/25 sm:via-black/18 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/10 sm:via-black/6 to-black/40 sm:to-black/30" />
        </div>

        <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="max-w-xs sm:max-w-xl md:max-w-2xl lg:max-w-3xl animate-fade-in">
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold mb-4 sm:mb-6 leading-tight">
              Exploring Innovation and Research at{" "}
              <span className="bg-clip-text">
                IIT Delhi
              </span>
            </h1>
            <p className="text-base sm:text-lg md:text-xl lg:text-2xl text-muted-foreground mb-6 sm:mb-8">
              Your gateway to cutting-edge interdisciplinary research, sustainability initiatives,
              and breakthrough innovations from India's premier engineering institution.
            </p>
            <div className="flex flex-col gap-3 sm:gap-4">
              <Link to="/explore" className="w-full sm:w-auto">
                <Button size="lg" className="w-full sm:w-auto group text-sm sm:text-base">
                  Explore Research
                  <ArrowRight className="ml-2 h-4 w-4 sm:h-5 sm:w-5 group-hover:translate-x-1 transition-smooth" />
                </Button>
              </Link>

            </div>
          </div>
        </div>
      </section>

      {/* Highlights Section - Responsive grid and spacing */}
      <section className="container mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 md:py-20">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 md:gap-6">
          {highlights.map((item, index) => (
            <Link key={index} to={item.link} className="block">
              <Card className="h-full hover:shadow-elegant transition-smooth group cursor-pointer border-border">
                <CardContent className="p-4 sm:p-5 md:p-6">
                  <div className="w-10 h-10 sm:w-11 sm:h-11 md:w-12 md:h-12 gradient-primary rounded-lg flex items-center justify-center mb-3 sm:mb-4 group-hover:scale-110 transition-smooth">
                    <item.icon className="h-5 w-5 sm:h-5 sm:w-5 md:h-6 md:w-6 text-primary-foreground" />
                  </div>
                  <h3 className="text-lg sm:text-xl font-semibold mb-1.5 sm:mb-2 group-hover:text-primary transition-smooth">
                    {item.title}
                  </h3>
                  <p className="text-muted-foreground text-xs sm:text-sm">
                    {item.description}
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      {/* Featured Research Section - Responsive layout */}
      <section className="gradient-subtle py-12 sm:py-16 md:py-20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 sm:gap-10 lg:gap-12 items-center">
            <div className="animate-slide-up order-2 lg:order-1">
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4 sm:mb-6">
                Pioneering Research Across Disciplines
              </h2>
              <p className="text-base sm:text-lg text-muted-foreground mb-4 sm:mb-6">
                From artificial intelligence and quantum computing to sustainable energy
                and biotechnology, IIT Delhi researchers are pushing the boundaries of
                human knowledge and creating solutions for tomorrow's challenges.
              </p>
              <ul className="space-y-2 sm:space-y-3 mb-6 sm:mb-8">
                <li className="flex items-center space-x-2 sm:space-x-3 text-sm sm:text-base">
                  <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-primary rounded-full flex-shrink-0" />
                  <span>500+ Active Research Projects</span>
                </li>
                <li className="flex items-center space-x-2 sm:space-x-3 text-sm sm:text-base">
                  <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-primary rounded-full flex-shrink-0" />
                  <span>50+ Interdisciplinary Research Centers</span>
                </li>
                <li className="flex items-center space-x-2 sm:space-x-3 text-sm sm:text-base">
                  <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-primary rounded-full flex-shrink-0" />
                  <span>1000+ Research Publications Annually</span>
                </li>
              </ul>
              <Link to="/explore" className="inline-block w-full sm:w-auto">
                <Button variant="outline" size="lg" className="w-full sm:w-auto group text-sm sm:text-base">
                  View All Research
                  <ArrowRight className="ml-2 h-4 w-4 sm:h-5 sm:w-5 group-hover:translate-x-1 transition-smooth" />
                </Button>
              </Link>
            </div>
            <div className="animate-fade-in order-1 lg:order-2">
              <img
                src={researchCollage}
                alt="Research at IIT Delhi"
                className="rounded-lg sm:rounded-xl shadow-elegant w-full h-auto"
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
