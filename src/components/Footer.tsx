import { Link } from "react-router-dom";
import { Mail, Phone, MapPin, Github, Twitter, Linkedin, ExternalLink } from "lucide-react";
import { useRef, useState, useEffect } from "react";

const Footer = () => {
  const footerRef = useRef<HTMLElement>(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isHovering, setIsHovering] = useState(false);

  useEffect(() => {
    const footer = footerRef.current;
    if (!footer) return;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = footer.getBoundingClientRect();
      setMousePosition({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
    };

    const handleMouseEnter = () => setIsHovering(true);
    const handleMouseLeave = () => setIsHovering(false);

    footer.addEventListener('mousemove', handleMouseMove);
    footer.addEventListener('mouseenter', handleMouseEnter);
    footer.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      footer.removeEventListener('mousemove', handleMouseMove);
      footer.removeEventListener('mouseenter', handleMouseEnter);
      footer.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, []);

  return (
    <footer 
      ref={footerRef}
      className="relative bg-gradient-to-b from-muted/30 via-card to-background dark:from-slate-900 dark:via-slate-900/95 dark:to-slate-950 border-t border-border/50 mt-20 overflow-hidden"
    >
      {/* Animated glow cursor effect */}
      <div
        className="pointer-events-none absolute transition-opacity duration-300"
        style={{
          left: mousePosition.x - 200,
          top: mousePosition.y - 200,
          width: 400,
          height: 400,
          background: `radial-gradient(circle, hsl(222 78% 48% / 0.12) 0%, hsl(178 70% 45% / 0.06) 40%, transparent 70%)`,
          borderRadius: '50%',
          opacity: isHovering ? 1 : 0,
          filter: 'blur(40px)',
        }}
      />
      
      {/* Decorative top border gradient */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
      
      <div className="container mx-auto px-4 py-16 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
          {/* Brand Section */}
          <div className="lg:col-span-1">
            <div className="flex items-center space-x-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg shadow-primary/20">
                <span className="text-white font-bold text-lg">R</span>
              </div>
              <div>
                <span className="font-bold text-lg text-foreground">Research Ambit</span>
                <p className="text-xs text-muted-foreground">IIT Delhi</p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
              Central research repository connecting departments, labs, and innovative projects at IIT Delhi.
            </p>
            {/* Social Links */}
            <div className="flex items-center space-x-3">
              <a 
                href="#" 
                className="w-9 h-9 rounded-full bg-muted/80 dark:bg-slate-800 hover:bg-primary/10 hover:text-primary flex items-center justify-center transition-all duration-300 hover:scale-110 text-muted-foreground hover:shadow-lg"
                aria-label="Twitter"
              >
                <Twitter className="h-4 w-4" />
              </a>
              <a 
                href="#" 
                className="w-9 h-9 rounded-full bg-muted/80 dark:bg-slate-800 hover:bg-primary/10 hover:text-primary flex items-center justify-center transition-all duration-300 hover:scale-110 text-muted-foreground hover:shadow-lg"
                aria-label="LinkedIn"
              >
                <Linkedin className="h-4 w-4" />
              </a>
              <a 
                href="#" 
                className="w-9 h-9 rounded-full bg-muted/80 dark:bg-slate-800 hover:bg-primary/10 hover:text-primary flex items-center justify-center transition-all duration-300 hover:scale-110 text-muted-foreground hover:shadow-lg"
                aria-label="GitHub"
              >
                <Github className="h-4 w-4" />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="font-semibold mb-6 text-sm uppercase tracking-wider text-foreground">Quick Links</h3>
            <ul className="space-y-3 text-sm">
              {[
                { to: "/explore", label: "Explore Research" },
                { to: "/directory", label: "Directory" },
                { to: "/magazines", label: "Magazines" },
                { to: "/mindmap", label: "Mind Map" },
              ].map((link) => (
                <li key={link.to}>
                  <Link 
                    to={link.to} 
                    className="group flex items-center text-muted-foreground hover:text-primary transition-all duration-300"
                  >
                    <span className="w-0 group-hover:w-2 h-px bg-primary mr-0 group-hover:mr-2 transition-all duration-300" />
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Research Areas */}
          <div>
            <h3 className="font-semibold mb-6 text-sm uppercase tracking-wider text-foreground">Research Areas</h3>
            <ul className="space-y-3 text-sm">
              {[
                "Artificial Intelligence",
                "Sustainable Energy",
                "Biotechnology",
                "Quantum Computing",
                "Materials Science",
              ].map((area, index) => (
                <li 
                  key={area}
                  className="flex items-center text-muted-foreground"
                >
                  <span 
                    className="w-1.5 h-1.5 rounded-full mr-3"
                    style={{
                      background: `hsl(${222 + index * 20} 70% 55%)`,
                    }}
                  />
                  {area}
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="font-semibold mb-6 text-sm uppercase tracking-wider text-foreground">Contact</h3>
            <ul className="space-y-4 text-sm">
              <li className="group">
                <a 
                  href="https://maps.google.com" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-start space-x-3 text-muted-foreground hover:text-foreground transition-colors duration-300"
                >
                  <div className="w-8 h-8 rounded-lg bg-primary/10 dark:bg-primary/20 flex items-center justify-center flex-shrink-0 group-hover:bg-primary/20 dark:group-hover:bg-primary/30 transition-colors">
                    <MapPin className="h-4 w-4 text-primary" />
                  </div>
                  <span className="pt-1">IIT Delhi, Hauz Khas,<br />New Delhi - 110016</span>
                </a>
              </li>
              <li className="group">
                <a 
                  href="mailto:iitdambit@iitd.ac.in"
                  className="flex items-center space-x-3 text-muted-foreground hover:text-foreground transition-colors duration-300"
                >
                  <div className="w-8 h-8 rounded-lg bg-accent/10 dark:bg-accent/20 flex items-center justify-center flex-shrink-0 group-hover:bg-accent/20 dark:group-hover:bg-accent/30 transition-colors">
                    <Mail className="h-4 w-4 text-accent" />
                  </div>
                  <span>iitdambit@iitd.ac.in</span>
                </a>
              </li>
              <li className="group">
                <a 
                  href="tel:+911126591234"
                  className="flex items-center space-x-3 text-muted-foreground hover:text-foreground transition-colors duration-300"
                >
                  <div className="w-8 h-8 rounded-lg bg-primary/10 dark:bg-primary/20 flex items-center justify-center flex-shrink-0 group-hover:bg-primary/20 dark:group-hover:bg-primary/30 transition-colors">
                    <Phone className="h-4 w-4 text-primary" />
                  </div>
                  <span>+91-011-2659-7135</span>
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-border/30 dark:border-slate-800 mt-12 pt-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} <span className="text-foreground font-medium">Research Ambit</span>, IIT Delhi. All rights reserved.
            </p>
            <div className="flex items-center space-x-6 text-sm text-muted-foreground">
              <a href="#" className="hover:text-primary transition-colors duration-300">Privacy Policy</a>
              <a href="#" className="hover:text-primary transition-colors duration-300">Terms of Service</a>
              <a 
                href="https://iitd.ac.in" 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-1 hover:text-primary transition-colors duration-300"
              >
                IIT Delhi <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </div>
        </div>
      </div>
      
      {/* Decorative corner gradients - Enhanced for dark mode */}
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-gradient-to-tr from-primary/5 dark:from-primary/10 to-transparent pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-64 h-64 bg-gradient-to-tl from-accent/5 dark:from-accent/10 to-transparent pointer-events-none" />
    </footer>
  );
};

export default Footer;
