import { Card, CardContent } from "@/components/ui/card";
import { FileText, Users, ChevronRight, type LucideIcon } from "lucide-react";
import type { TaxonomyNode } from "@/lib/api/services/taxonomyService";
import { cn } from "@/lib/utils";

interface TaxonomyNodeCardProps {
    node: TaxonomyNode;
    icon: LucideIcon;
    onClick: () => void;
    /** Extra line under the name, e.g. "12 sub-domains" */
    detail?: string;
    /** Fixed-identity accent color (themes only) — hex string */
    accentColor?: string;
    /** node.paper_count as a fraction of the max in the currently visible set, 0-1 */
    magnitude: number;
}

const formatCount = (n: number) =>
    n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k` : String(n);

/**
 * One browsable taxonomy node (thematic area / domain / subdomain) as a card
 * with paper/faculty counts and a relative-magnitude bar. Pure presentational.
 */
const TaxonomyNodeCard = ({ node, icon: Icon, onClick, detail, accentColor, magnitude }: TaxonomyNodeCardProps) => (
    <Card
        role="button"
        tabIndex={0}
        onClick={onClick}
        onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onClick();
            }
        }}
        className={cn(
            "group relative h-full cursor-pointer overflow-hidden border-border/70 bg-card/60 backdrop-blur",
            "transition duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-elegant",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
        )}
    >
        {accentColor && (
            <span
                aria-hidden
                className="absolute inset-y-0 left-0 w-1 opacity-80"
                style={{ backgroundColor: accentColor }}
            />
        )}
        <CardContent className={cn("p-5 flex flex-col gap-4 h-full", accentColor && "pl-6")}>
            <div className="flex items-start gap-3">
                <div
                    className={cn(
                        "w-10 h-10 shrink-0 rounded-xl flex items-center justify-center",
                        !accentColor && "bg-gradient-to-br from-primary/15 to-accent/15 text-primary"
                    )}
                    style={accentColor ? { backgroundColor: `${accentColor}1a`, color: accentColor } : undefined}
                >
                    <Icon className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                    <h3 className="text-base font-semibold leading-snug line-clamp-2">
                        {node.name}
                    </h3>
                    {detail && (
                        <p className="text-xs text-muted-foreground mt-0.5">{detail}</p>
                    )}
                </div>
                <ChevronRight className="w-4 h-4 shrink-0 text-muted-foreground transition-transform duration-300 group-hover:translate-x-1 group-hover:text-primary" />
            </div>

            <div className="mt-auto space-y-2.5">
                <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                    <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                            width: `${Math.max(magnitude * 100, 3)}%`,
                            backgroundColor: accentColor ?? "hsl(var(--primary))",
                        }}
                    />
                </div>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span className="inline-flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5 text-primary/70" />
                        <span className="font-medium text-foreground">{formatCount(node.paper_count)}</span>
                        papers
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-accent" />
                        <span className="font-medium text-foreground">{formatCount(node.faculty_count)}</span>
                        faculty
                    </span>
                </div>
            </div>
        </CardContent>
    </Card>
);

export default TaxonomyNodeCard;
