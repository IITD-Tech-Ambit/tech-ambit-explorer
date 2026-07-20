import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import siteLogo from "@/assets/IITD-LOGO-preview.png";
import { Menu, X, Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";

const Navigation = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [logoError, setLogoError] = useState(false);
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const location = useLocation();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    handleScroll();
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [location.pathname]);

  useEffect(() => {
    setIsOpen(false);
  }, [location.pathname]);

  const toggleTheme = () => {
    setTheme(resolvedTheme === "dark" ? "light" : "dark");
  };

  const isDark = mounted && resolvedTheme === "dark";

  const navItems = [
    { name: "Explore", path: "/explore" },
    { name: "Research Areas", path: "/research-areas" },
    { name: "Directory", path: "/directory" },
    { name: "Atlas", path: "/atlas" },
    { name: "Magazines", path: "/magazines" },
    { name: "Contributors", path: "/contributors" },
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav
      className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-300 text-foreground",
        "bg-background/85 backdrop-blur-md border-b border-border/70",
        isScrolled && "bg-background/95 shadow-card border-border",
      )}
    >
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-20">
          <Link to="/" className="flex items-center space-x-3 group">
            {!logoError ? (
              <img
                src={siteLogo}
                alt="Research Ambit"
                className="logo-img"
                onError={() => setLogoError(true)}
              />
            ) : (
              <div className="logo-fallback" aria-hidden>
                RA
              </div>
            )}
            <div className="flex flex-col">
              <span className="font-bold text-lg leading-tight bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                Research Ambit
              </span>
              <span className="text-xs text-muted-foreground">IIT Delhi</span>
            </div>
          </Link>

          <div className="hidden md:flex items-center space-x-1">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "relative px-3 lg:px-4 py-2 rounded-lg font-medium transition-all duration-200 text-sm lg:text-base",
                  isActive(item.path)
                    ? "text-primary bg-primary/8"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/60",
                )}
                aria-current={isActive(item.path) ? "page" : undefined}
              >
                {item.name}
                {isActive(item.path) && (
                  <span className="absolute bottom-0 left-2 right-2 h-0.5 bg-primary rounded-full" />
                )}
              </Link>
            ))}
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              className="ml-1 lg:ml-2 text-muted-foreground hover:text-foreground hover:bg-muted/60"
            >
              {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </Button>
          </div>

          <div className="md:hidden flex items-center space-x-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              className="text-muted-foreground hover:text-foreground hover:bg-muted/60"
            >
              {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsOpen(!isOpen)}
              className="text-muted-foreground hover:text-foreground hover:bg-muted/60"
            >
              {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </Button>
          </div>
        </div>

        {isOpen && (
          <div className="md:hidden py-4 space-y-2 animate-fade-in bg-background/98 backdrop-blur-md rounded-b-lg border-t border-border">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setIsOpen(false)}
                className={cn(
                  "block px-4 py-3 rounded-lg font-medium transition-all duration-200",
                  isActive(item.path)
                    ? "text-primary bg-primary/10 border-l-2 border-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/60",
                )}
              >
                {item.name}
              </Link>
            ))}
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navigation;
