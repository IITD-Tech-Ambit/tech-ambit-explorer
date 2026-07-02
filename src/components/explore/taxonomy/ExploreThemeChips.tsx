import { useNavigate } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { useTaxonomyThemes } from "@/lib/api/hooks/useTaxonomy";
import { rankByPaperCount } from "@/lib/api/services/taxonomyService";

/**
 * Compact "quick-start" tag grid for the Explore empty state: one uniform
 * tag per Thematic Area, wrapping to fill the available width — no icons,
 * no per-category colors, no stats. Deliberately restrained (after
 * university "browse by field" reference pages) so it reads as a calm list
 * of starting points, not a second product surface competing with search.
 */
const ExploreThemeChips = () => {
    const navigate = useNavigate();
    const themesQuery = useTaxonomyThemes();
    const themes = rankByPaperCount(themesQuery.data?.themes);

    if (themesQuery.isLoading) {
        return (
            <div className="flex flex-wrap justify-center gap-2 max-w-2xl mx-auto">
                {Array.from({ length: 9 }).map((_, i) => (
                    <div key={i} className="h-9 w-36 rounded-md bg-muted animate-pulse" />
                ))}
            </div>
        );
    }

    if (!themes || themes.length === 0) return null;

    return (
        <div className="flex flex-wrap justify-center gap-2 max-w-2xl mx-auto">
            {themes.map((theme) => (
                <button
                    key={theme.id}
                    onClick={() => navigate(`/explore/browse?theme=${theme.slug}`)}
                    className="px-4 py-2 rounded-md bg-primary/10 text-primary text-sm font-medium border border-primary/10 hover:bg-primary/20 hover:border-primary/20 transition-colors"
                >
                    {theme.name}
                </button>
            ))}
            <button
                onClick={() => navigate("/explore/browse")}
                className="inline-flex items-center gap-1 px-4 py-2 rounded-md text-sm font-medium text-muted-foreground hover:text-primary transition-colors"
            >
                All areas
                <ArrowRight className="w-3.5 h-3.5" />
            </button>
        </div>
    );
};

export default ExploreThemeChips;
