import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

/** Tab pair switching between Scopus papers and IP/Patents explore. */
export function ExploreModeSwitch({ active }: { active: "papers" | "ip" }) {
  return (
    <div role="tablist" aria-label="Explore mode" className="inline-flex items-center gap-1.5 animate-fade-in">
      <Link
        to="/explore"
        role="tab"
        aria-selected={active === "papers"}
        className={cn(
          "relative px-3 py-1.5 rounded-lg text-sm sm:text-base font-semibold transition-all duration-200",
          "text-primary hover:bg-primary/10",
          active === "papers" && "bg-primary/10",
        )}
      >
        Research Papers
        {active === "papers" && (
          <span className="absolute bottom-0 left-2 right-2 h-0.5 bg-primary rounded-full" />
        )}
      </Link>
      <span className="text-primary/30 font-medium select-none" aria-hidden>
        /
      </span>
      <Link
        to="/explore/ip"
        role="tab"
        aria-selected={active === "ip"}
        className={cn(
          "relative inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm sm:text-base font-semibold transition-all duration-200",
          "text-primary hover:bg-primary/10",
          active === "ip" && "bg-primary/10",
        )}
      >
        Patents &amp; IP
        <span className="inline-flex items-center rounded-full bg-accent/20 px-1.5 py-[1px] text-[9px] font-bold uppercase tracking-wide text-accent leading-normal">
          New
        </span>
        {active === "ip" && (
          <span className="absolute bottom-0 left-2 right-2 h-0.5 bg-primary rounded-full" />
        )}
      </Link>
    </div>
  );
}
