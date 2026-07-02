import { useMemo } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { SearchX, type LucideIcon } from "lucide-react";
import type { TaxonomyNode } from "@/lib/api/services/taxonomyService";
import TaxonomyNodeCard from "./TaxonomyNodeCard";
import { getThemeAccent } from "./themeAccent";

interface TaxonomyNodeGridProps {
    nodes: TaxonomyNode[] | undefined;
    isLoading: boolean;
    icon: LucideIcon;
    onSelect: (node: TaxonomyNode) => void;
    detailFor?: (node: TaxonomyNode) => string | undefined;
    emptyMessage: string;
    /** Themes have a fixed, validated categorical color identity; domains/sub-domains don't. */
    useThemeAccents?: boolean;
    /** Denser, narrower-card grid for high-cardinality levels (domains: 35, sub-domains: up to ~11 per domain) */
    density?: "spacious" | "dense";
}

const GridSkeleton = ({ density }: { density: "spacious" | "dense" }) => (
    <div
        className={
            density === "dense"
                ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3"
                : "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
        }
    >
        {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-border/70 p-5 space-y-4">
                <div className="flex items-start gap-3">
                    <Skeleton className="w-10 h-10 rounded-xl" />
                    <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-3 w-1/2" />
                    </div>
                </div>
                <Skeleton className="h-4 w-2/3" />
            </div>
        ))}
    </div>
);

/**
 * Responsive grid of taxonomy node cards with loading and empty states. Each
 * card's paper-count bar is scaled relative to the max in this set, so scale
 * (14 papers vs 14,000) reads visually, not just as small print.
 */
const TaxonomyNodeGrid = ({
    nodes, isLoading, icon, onSelect, detailFor, emptyMessage,
    useThemeAccents = false, density = "spacious",
}: TaxonomyNodeGridProps) => {
    const maxPaperCount = useMemo(
        () => Math.max(1, ...(nodes ?? []).map((n) => n.paper_count)),
        [nodes]
    );

    if (isLoading) return <GridSkeleton density={density} />;

    if (!nodes || nodes.length === 0) {
        return (
            <div className="text-center py-16">
                <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
                    <SearchX className="w-6 h-6 text-muted-foreground" />
                </div>
                <p className="text-muted-foreground">{emptyMessage}</p>
            </div>
        );
    }

    return (
        <div
            className={
                density === "dense"
                    ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 animate-fade-in"
                    : "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 animate-fade-in"
            }
        >
            {nodes.map((node, index) => {
                const accent = useThemeAccents ? getThemeAccent(node.name, index) : null;
                return (
                    <TaxonomyNodeCard
                        key={node.id}
                        node={node}
                        icon={accent?.icon ?? icon}
                        accentColor={accent?.color}
                        magnitude={node.paper_count / maxPaperCount}
                        detail={detailFor?.(node)}
                        onClick={() => onSelect(node)}
                    />
                );
            })}
        </div>
    );
};

export default TaxonomyNodeGrid;
