import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, Globe } from "lucide-react";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import HeroSlideshow from "@/components/HeroSlideshow";
import heroSlide1 from "@/assets/hero-slide-1.png";
import heroSlide2 from "@/assets/hero-slide-2.png";
import heroSlide3 from "@/assets/hero-slide-3.png";
import heroSlide4 from "@/assets/hero-slide-4.png";
import heroSlide5 from "@/assets/hero-slide-5.png";
import researchCollage from "@/assets/iit-delhi-aerial.png";

const CAMPUS_VIDEO_SRC = "/videos/campus-research.mp4";

const HERO_SLIDES = [
  { src: heroSlide1, alt: "IIT Delhi campus architecture" },
  { src: heroSlide2, alt: "Aerial view of IIT Delhi with solar panels" },
  { src: heroSlide3, alt: "IIT Delhi main building and Diamond Jubilee display" },
  { src: heroSlide4, alt: "IIT Delhi main entrance signage" },
  { src: heroSlide5, alt: "IIT Delhi academic block and courtyard" },
];

const Home = () => {
  return (
    <div className="min-h-screen home-page-bg">
      <Navigation />

      
      <section className="relative min-h-[60vh] sm:min-h-[70vh] md:min-h-[80vh] lg:h-[90vh] flex items-center justify-center overflow-hidden pt-24 pb-12 sm:pt-28 sm:pb-16 md:pt-20 md:pb-0">
        
        <div className="absolute inset-0">
          <HeroSlideshow slides={HERO_SLIDES} />
          
          <div className="absolute inset-0 z-[1] bg-gradient-to-r from-slate-900/80 via-slate-900/50 to-slate-900/30 dark:from-slate-950/90 dark:via-slate-950/70 dark:to-slate-950/50" />
          <div className="absolute inset-0 z-[1] bg-gradient-to-t from-slate-900/60 via-transparent to-slate-900/20 dark:from-slate-950/80" />
          
          <div className="absolute inset-0 z-[1] bg-gradient-to-br from-primary/10 via-transparent to-accent/10" />
        </div>

        
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-10 w-64 h-64 bg-primary/10 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-1/4 right-10 w-80 h-80 bg-accent/10 rounded-full blur-3xl animate-pulse delay-1000" />
        </div>

        <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="max-w-xs sm:max-w-xl md:max-w-2xl lg:max-w-3xl animate-fade-in">
            
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white/90 text-sm mb-6">
              <span>Discover Research Excellence</span>
            </div>
            
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold mb-4 sm:mb-6 leading-tight text-white">
              Exploring Innovation and Research at{" "}
              <span className="bg-gradient-to-r from-blue-400 via-cyan-400 to-teal-400 bg-clip-text text-transparent">
                IIT Delhi
              </span>
            </h1>
            <p className="text-base sm:text-lg md:text-xl lg:text-2xl text-white/80 mb-8 sm:mb-10 leading-relaxed">
              Your gateway to cutting-edge interdisciplinary research, sustainability initiatives,
              and breakthrough innovations from India's premier engineering institution.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link to="/explore" className="w-full sm:w-auto">
                <Button size="lg" className="w-full sm:w-auto group text-sm sm:text-base bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-all duration-300">
                  Explore Research
                  <ArrowRight className="ml-2 h-4 w-4 sm:h-5 sm:w-5 group-hover:translate-x-1 transition-transform duration-300" />
                </Button>
              </Link>
              <Link to="/knowledge-graph" className="w-full sm:w-auto">
                <Button size="lg" className="w-full sm:w-auto group text-sm sm:text-base bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-all duration-300">
                  Explore Knowledge Graph
                  <Globe className="ml-2 h-4 w-4 sm:h-5 sm:w-5 group-hover:rotate-12 transition-transform duration-300" />
                </Button>
              </Link>
            </div>
          </div>
        </div>

        
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 hidden md:flex flex-col items-center gap-2 text-white/60 z-10 pointer-events-none">
          <span className="text-xs uppercase tracking-widest">Scroll to explore</span>
          <div className="w-6 h-10 rounded-full border-2 border-white/30 flex items-start justify-center p-2">
            <div className="w-1.5 h-1.5 bg-white/60 rounded-full animate-bounce" />
          </div>
        </div>
      </section>

      
      <section className="relative py-16 sm:py-20 md:py-24 overflow-hidden">
        
        <div className="absolute inset-0 bg-gradient-to-b from-muted/30 via-muted/50 to-background dark:from-slate-900/50 dark:via-slate-800/30 dark:to-background" />
        <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-border to-transparent" />
        <div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-border to-transparent" />
        
        
        <div className="absolute top-20 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-20 left-0 w-80 h-80 bg-accent/5 rounded-full blur-3xl" />
        
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 sm:gap-12 lg:gap-16 items-center">
            <div className="order-2 lg:order-1">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
                <span>Research Excellence</span>
              </div>
              <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-6 text-foreground leading-tight">
                Pioneering Research{" "}
                <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                  Across Disciplines
                </span>
              </h2>
              <p className="text-base sm:text-lg text-muted-foreground mb-8 leading-relaxed">
                From artificial intelligence and quantum computing to sustainable energy
                and biotechnology, IIT Delhi researchers are pushing the boundaries of
                human knowledge and creating solutions for tomorrow's challenges.
              </p>
              
              
              <ul className="space-y-4 mb-8">
                {[
                  { text: "500+ Active Research Projects", color: "from-blue-500 to-indigo-500" },
                  { text: "50+ Interdisciplinary Research Centers", color: "from-emerald-500 to-teal-500" },
                  { text: "1000+ Research Publications Annually", color: "from-purple-500 to-pink-500" },
                ].map((item, index) => (
                  <li key={index} className="flex items-center space-x-4">
                    <div className={`w-2.5 h-2.5 rounded-full bg-gradient-to-r ${item.color} shadow-lg`} />
                    <span className="text-foreground font-medium">{item.text}</span>
                  </li>
                ))}
              </ul>
              
              <Link to="/explore" className="inline-block">
                <Button size="lg" className="group bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 transition-all duration-300">
                  View All Research
                  <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform duration-300" />
                </Button>
              </Link>
            </div>
            
            <div className="order-1 lg:order-2 campus-video-wrap">
              <div className="campus-video-glow" aria-hidden="true" />
              <div className="campus-video-frame">
                <video
                  className="campus-video-player"
                  src={CAMPUS_VIDEO_SRC}
                  poster={researchCollage}
                  autoPlay
                  muted
                  loop
                  playsInline
                  preload="metadata"
                  aria-label="Research at IIT Delhi campus"
                >
                  Your browser does not support embedded video.
                </video>
                <div className="campus-video-vignette" aria-hidden="true" />
                <div className="campus-video-footer">
                  <span className="campus-video-footer-title">Research Ambit</span>
                  <span className="campus-video-footer-sub">IIT Delhi</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Home;
