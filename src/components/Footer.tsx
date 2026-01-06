import { Link } from "react-router-dom";
import { Mail, Phone, MapPin } from "lucide-react";

const Footer = () => {
  return (
    <footer className="bg-card border-t border-border mt-20">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* About */}
          <div>
            <div className="flex items-center space-x-2 mb-4">
              <div className="w-8 h-8 gradient-primary rounded-lg flex items-center justify-center text-primary-foreground font-bold">
                TA
              </div>
              <span className="font-bold">Tech Ambit</span>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Central research repository connecting departments, labs, and innovative projects at IIT Delhi.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="font-semibold mb-4">Quick Links</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to="/explore" className="text-muted-foreground hover:text-primary transition-smooth">
                  Explore Research
                </Link>
              </li>
              <li>
                <Link to="/directory" className="text-muted-foreground hover:text-primary transition-smooth">
                  Directory
                </Link>
              </li>
              <li>
                <Link to="/magazines" className="text-muted-foreground hover:text-primary transition-smooth">
                  Magazines
                </Link>
              </li>
              <li>
                <Link to="/sustainability" className="text-muted-foreground hover:text-primary transition-smooth">
                  Sustainability
                </Link>
              </li>
            </ul>
          </div>

          {/* Research Areas */}
          <div>
            <h3 className="font-semibold mb-4">Research Areas</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>Artificial Intelligence</li>
              <li>Sustainable Energy</li>
              <li>Biotechnology</li>
              <li>Quantum Computing</li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="font-semibold mb-4">Contact</h3>
            <ul className="space-y-3 text-sm">
              <li className="flex items-start space-x-2 text-muted-foreground">
                <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <span>IIT Delhi, Hauz Khas, New Delhi - 110016</span>
              </li>
              <li className="flex items-center space-x-2 text-muted-foreground">
                <Mail className="h-4 w-4 flex-shrink-0" />
                <span>research@iitd.ac.in</span>
              </li>
              <li className="flex items-center space-x-2 text-muted-foreground">
                <Phone className="h-4 w-4 flex-shrink-0" />
                <span>+91-11-2659-1234</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-border mt-8 pt-8 text-center text-sm text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} Tech Ambit, IIT Delhi. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
