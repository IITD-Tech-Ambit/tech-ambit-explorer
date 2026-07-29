import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  BookOpen,
  FolderSearch,
  Globe,
  GraduationCap,
  Lightbulb,
  Network,
  Search,
} from "lucide-react";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import HeroSlideshow from "@/components/HeroSlideshow";
import heroSlide1 from "@/assets/hero-slide-1.png";
import heroSlide2 from "@/assets/hero-slide-2.png";
import heroSlide3 from "@/assets/hero-slide-3.png";
import heroSlide4 from "@/assets/hero-slide-4.png";
import heroSlide5 from "@/assets/hero-slide-5.png";
import researchCollage from "@/assets/iit-delhi-aerial.png";
import instituteSeal from "@/assets/logo2-transparent.png";
import { cn } from "@/lib/utils";

const CAMPUS_VIDEO_SRC = "/videos/campus-research.mp4";

const HERO_SLIDES = [
  { src: heroSlide1, alt: "IIT Delhi campus architecture" },
  { src: heroSlide2, alt: "Aerial view of IIT Delhi with solar panels" },
  { src: heroSlide3, alt: "IIT Delhi main building and Diamond Jubilee display" },
  { src: heroSlide4, alt: "IIT Delhi main entrance signage" },
  { src: heroSlide5, alt: "IIT Delhi academic block and courtyard" },
];

const FEATURES = [
  {
    title: "Explore Research",
    description:
      "Search publications, themes, and faculty expertise across IIT Delhi.",
    detail:
      "Semantic and keyword search over the institute research corpus. Refine by theme, author, or filter so the most relevant papers and expertise surface first.",
    capabilities: [
      "Find papers and themes by topic or keyword",
      "Connect results to faculty profiles",
      "Filter and refine large result sets quickly",
    ],
    to: "/explore",
    icon: Search,
    accent: "from-sky-500/15 to-blue-600/5",
  },
  {
    title: "Intellectual Property",
    description:
      "Browse patents and IP records from campus research.",
    detail:
      "Track how laboratory work becomes protected innovation. Search patents and IP records linked to IIT Delhi research and inventors.",
    capabilities: [
      "Search patents and related IP records",
      "See invention trails beyond publications",
      "Link IP back to people and research themes",
    ],
    to: "/explore/ip",
    icon: Lightbulb,
    accent: "from-amber-500/15 to-orange-500/5",
  },
  {
    title: "Research Areas",
    description:
      "Browse fields and subfields in a structured taxonomy.",
    detail:
      "Walk a hierarchical map of research domains. Open any area to see related faculty and documents without guessing department names.",
    capabilities: [
      "Navigate fields → subfields systematically",
      "Open faculty and documents per area",
      "Orient yourself before a deep search",
    ],
    to: "/research-areas",
    icon: Network,
    accent: "from-teal-500/15 to-cyan-500/5",
  },
  {
    title: "Faculty Directory",
    description:
      "Find people by department, school, or centre.",
    detail:
      "Browse the institute directory with profiles that include expertise, metrics, and publication links — then open a full faculty page for deeper detail.",
    capabilities: [
      "Browse departments, schools, and centres",
      "Open profiles with h-index and expertise",
      "Jump from people to their research outputs",
    ],
    to: "/directory",
    icon: GraduationCap,
    accent: "from-indigo-500/15 to-blue-500/5",
  },
  {
    title: "Research Atlas",
    description:
      "Explore a visual map of themes and papers.",
    detail:
      "Move from institute-wide clusters into specific themes and papers. Use the atlas when you want orientation in space, not only ranked search results.",
    capabilities: [
      "See campus research as a visual landscape",
      "Zoom from clusters into individual papers",
      "Spot related work you might miss in text search",
    ],
    to: "/atlas",
    icon: Globe,
    accent: "from-emerald-500/15 to-teal-500/5",
  },
  {
    title: "Magazines",
    description:
      "Read curated institute research stories.",
    detail:
      "Institute magazines and narratives that explain breakthroughs in context — useful when you want the story behind a paper title.",
    capabilities: [
      "Browse curated research magazines",
      "Read institute narratives and highlights",
      "Share approachable summaries of hard science",
    ],
    to: "/magazines",
    icon: BookOpen,
    accent: "from-rose-500/15 to-pink-500/5",
  },
] as const;

type Feature = (typeof FEATURES)[number];

const NAV_CLEARANCE_PX = 76;
const POPUP_GAP_PX = 12;

function FeatureCard({
  feature,
  index,
}: {
  feature: Feature;
  index: number;
}) {
  const { title, description, detail, capabilities, to, icon: Icon, accent } = feature;
  const wrapRef = useRef<HTMLDivElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const [placement, setPlacement] = useState<"above" | "below">("below");
  const [ready, setReady] = useState(false);

  const showPopup = () => {
    const wrap = wrapRef.current;
    const popup = popupRef.current;
    if (wrap && popup) {
      const rect = wrap.getBoundingClientRect();
      const popupHeight = popup.offsetHeight || 220;
      const spaceAbove = rect.top - NAV_CLEARANCE_PX;
      setPlacement(spaceAbove < popupHeight + POPUP_GAP_PX ? "below" : "above");
    }
    setReady(true);
  };

  const hidePopup = () => setReady(false);

  return (
    <div
      ref={wrapRef}
      className={cn(
        "home-feature-card-wrap",
        placement === "below" && "home-feature-card-wrap--below",
        ready && "home-feature-card-wrap--ready",
      )}
      style={{ animationDelay: `${index * 60}ms` }}
      onMouseEnter={showPopup}
      onMouseLeave={hidePopup}
      onFocus={showPopup}
      onBlur={(e) => {
        if (!wrapRef.current?.contains(e.relatedTarget as Node)) hidePopup();
      }}
    >
      <div ref={popupRef} className="home-feature-popup" role="tooltip">
        <p className="home-feature-popup-kicker">What this unlocks</p>
        <p className="home-feature-popup-detail">{detail}</p>
        <ul className="home-feature-popup-list">
          {capabilities.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>
      <Link to={to} className="home-feature-tile">
        <div className={`absolute inset-0 bg-gradient-to-br ${accent} opacity-80 transition-opacity`} />
        <div className="relative z-[1] flex h-full flex-col">
          <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-xl bg-background/80 text-primary shadow-sm ring-1 ring-border/60">
            <Icon className="h-5 w-5" />
          </div>
          <h3 className="text-lg font-semibold mb-2 text-foreground">{title}</h3>
          <p className="text-sm text-muted-foreground leading-relaxed flex-1">{description}</p>
          <span className="mt-5 inline-flex items-center text-sm font-medium text-primary">
            Open
            <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
          </span>
        </div>
      </Link>
    </div>
  );
}

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
              and breakthrough innovations from India&apos;s premier engineering institution.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link to="/explore" className="w-full sm:w-auto">
                <Button size="lg" className="w-full sm:w-auto group text-sm sm:text-base bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-all duration-300">
                  Explore Research
                  <ArrowRight className="ml-2 h-4 w-4 sm:h-5 sm:w-5 group-hover:translate-x-1 transition-transform duration-300" />
                </Button>
              </Link>
              <Link to="/atlas" className="w-full sm:w-auto">
                <Button size="lg" className="w-full sm:w-auto group text-sm sm:text-base bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-all duration-300">
                  Explore Atlas
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

      <section className="relative py-16 sm:py-20 md:py-24">
        <div className="absolute inset-0 bg-gradient-to-b from-background via-muted/40 to-background" />
        <div className="absolute -top-24 right-0 w-[28rem] h-[28rem] rounded-full bg-primary/8 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-80 h-80 rounded-full bg-accent/8 blur-3xl pointer-events-none" />

        <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="max-w-2xl mb-10 sm:mb-14 home-section-intro">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-semibold tracking-tight text-foreground mb-3">
              What you can do here
            </h2>
            <p className="text-base sm:text-lg text-muted-foreground leading-relaxed">
              Research Ambit is the institute&apos;s research discovery surface — not a single tool, but a set of ways to find people, papers, IP, and themes.
              Hover a card for a quick preview — click to open it.
            </p>
          </div>

          <div className="home-features-stage">
            <img
              src={instituteSeal}
              alt=""
              className="home-features-stage-logo"
              aria-hidden
            />
            <div className="relative z-[1] grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-5 pt-2">
              {FEATURES.map((feature, index) => (
                <FeatureCard key={feature.to} feature={feature} index={index} />
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="relative py-16 sm:py-20 md:py-24 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-muted/30 via-muted/50 to-background dark:from-slate-900/50 dark:via-slate-800/30 dark:to-background" />
        <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-border to-transparent" />

        <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 sm:gap-12 lg:gap-16 items-center">
            <div className="order-2 lg:order-1">
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-semibold tracking-tight mb-5 text-foreground leading-tight">
                Built around IIT Delhi research — searchable end to end
              </h2>
              <p className="text-base sm:text-lg text-muted-foreground mb-8 leading-relaxed">
                Whether you are looking for a collaborator, a paper, a patent trail, or the shape of a research area, start from one of the tools above and follow the links into faculty profiles and documents.
              </p>

              <ul className="space-y-4 mb-8">
                {[
                  { icon: FolderSearch, text: "Search across publications and intellectual property" },
                  { icon: GraduationCap, text: "Browse departments, schools, and centres" },
                  { icon: Globe, text: "See themes spatially in the Research Atlas" },
                ].map(({ icon: Icon, text }) => (
                  <li key={text} className="flex items-start gap-3">
                    <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="text-foreground font-medium pt-1">{text}</span>
                  </li>
                ))}
              </ul>

              <Link to="/atlas" className="inline-block">
                <Button size="lg" className="group shadow-lg shadow-primary/20">
                  Open the Atlas
                  <Globe className="ml-2 h-5 w-5 group-hover:rotate-12 transition-transform" />
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

      <section className="relative py-14 sm:py-16 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-accent/10" />
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="max-w-3xl mx-auto text-center home-cta-band">
            <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground mb-3">
              Ready to look something up?
            </h2>
            <p className="text-muted-foreground mb-8 leading-relaxed">
              Jump into search, open the faculty directory, or start from a research area.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-3">
              <Link to="/explore">
                <Button size="lg" className="w-full sm:w-auto group">
                  Explore research
                  <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
              <Link to="/research-areas">
                <Button size="lg" variant="outline" className="w-full sm:w-auto">
                  Browse research areas
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Home;
