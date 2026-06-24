import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

interface LegalLinksProps {
  className?: string;
}

/** Inline Privacy Policy and Terms of Service links for footers and compact layouts. */
const LegalLinks = ({ className }: LegalLinksProps) => (
  <div className={cn("flex items-center flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground", className)}>
    <Link to="/privacy-policy" className="hover:text-primary transition-colors duration-300">
      Privacy Policy
    </Link>
    <Link to="/terms-of-service" className="hover:text-primary transition-colors duration-300">
      Terms of Service
    </Link>
  </div>
);

export default LegalLinks;
