import { Link } from "react-router-dom";
import { ArrowRight, BookOpen, Check, Lightbulb, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type Mode = "papers" | "ip";

const MODES: {
  key: Mode;
  to: string;
  title: string;
  description: string;
  icon: LucideIcon;
  isNew?: boolean;
}[] = [
  {
    key: "papers",
    to: "/explore",
    title: "Research Papers",
    description: "Publications, faculty and research areas",
    icon: BookOpen,
  },
  {
    key: "ip",
    to: "/explore/ip",
    title: "Patents & IP",
    description: "Filed patents, designs and inventors",
    icon: Lightbulb,
    isNew: true,
  },
];

/** Card pair switching between Scopus papers and IP/Patents explore. */
export function ExploreModeSwitch({ active }: { active: Mode }) {
  return (
    <div className="animate-fade-in">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        What do you want to explore?
      </p>
      <div role="tablist" aria-label="Explore mode" className="grid grid-cols-2 gap-2 sm:gap-3">
        {MODES.map(({ key, to, title, description, icon: Icon, isNew }) => {
          const isActive = active === key;
          return (
            <Link
              key={key}
              to={to}
              role="tab"
              aria-selected={isActive}
              className={cn(
                "group relative flex items-center gap-3 rounded-xl border-2 p-3 sm:p-4 text-left transition-all duration-200",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
                isActive
                  ? "border-primary bg-primary text-primary-foreground shadow-md"
                  : "border-border bg-card text-foreground hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-md",
              )}
            >
              <div
                className={cn(
                  "flex h-10 w-10 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-lg",
                  isActive ? "bg-primary-foreground/15" : "bg-primary/10 text-primary",
                )}
              >
                <Icon className="h-5 w-5 sm:h-6 sm:w-6" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-sm sm:text-base font-semibold">{title}</span>
                  {isNew && (
                    <span
                      className={cn(
                        "inline-flex items-center rounded-full px-1.5 py-[1px] text-[9px] font-bold uppercase tracking-wide leading-normal",
                        isActive ? "bg-primary-foreground/20 text-primary-foreground" : "bg-accent/20 text-accent",
                      )}
                    >
                      New
                    </span>
                  )}
                </div>
                <p
                  className={cn(
                    "hidden sm:block text-xs mt-0.5 truncate",
                    isActive ? "text-primary-foreground/80" : "text-muted-foreground",
                  )}
                >
                  {description}
                </p>
              </div>
              {isActive ? (
                <Check className="hidden sm:block h-5 w-5 shrink-0" aria-hidden />
              ) : (
                <ArrowRight
                  className="hidden sm:block h-5 w-5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary"
                  aria-hidden
                />
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
