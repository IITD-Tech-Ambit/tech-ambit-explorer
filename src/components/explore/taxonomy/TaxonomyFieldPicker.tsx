import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useTaxonomyThemes, useTaxonomyDomains, useTaxonomyFaculty } from "@/lib/api/hooks/useTaxonomy";
import { rankByPaperCount, type TaxonomyNode } from "@/lib/api/services/taxonomyService";

interface TaxonomyFieldPickerProps {
    department?: string;
    selectedTheme?: string;
    selectedDomain?: string;
    onSelectTheme: (theme: TaxonomyNode) => void;
    onClearTheme: () => void;
    onSelectDomain: (domain: TaxonomyNode) => void;
    onClearDomain: () => void;
    onBrowse: () => void;
}

/** A chosen field as a solid pill with a remove control — UQ's "Browse by fields of research" picker. */
const FieldPill = ({ label, onRemove }: { label: string; onRemove: () => void }) => (
    <div className="inline-flex items-center gap-2 rounded-lg bg-primary text-primary-foreground pl-4 pr-2 py-2.5 text-sm font-medium">
        <span>{label}</span>
        <button
            type="button"
            onClick={onRemove}
            aria-label={`Remove ${label}`}
            className="rounded-md p-1 hover:bg-primary-foreground/20 transition-colors"
        >
            <X className="w-4 h-4" />
        </button>
    </div>
);

/** One not-yet-chosen option, shown alongside every sibling at this level. */
const FieldOption = ({ label, onSelect }: { label: string; onSelect: () => void }) => (
    <button
        type="button"
        onClick={onSelect}
        className="rounded-lg bg-primary/10 text-primary hover:bg-primary/15 px-4 py-2.5 text-sm font-medium text-left transition-colors"
    >
        {label}
    </button>
);

const OptionsSkeleton = () => (
    <div className="flex flex-wrap gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-32 rounded-lg" />
        ))}
    </div>
);

/**
 * Cascading field picker: Thematic Area → Domain, one step revealed at a
 * time. A chosen level collapses into a pill. The single "Browse N experts"
 * button at the bottom updates in place as the selection deepens; N is the
 * recommended (Pareto-coverage cutoff) count, not the raw faculty_count.
 */
const TaxonomyFieldPicker = ({
    department, selectedTheme, selectedDomain,
    onSelectTheme, onClearTheme, onSelectDomain, onClearDomain, onBrowse,
}: TaxonomyFieldPickerProps) => {
    const themesQuery = useTaxonomyThemes(department);
    const themes = rankByPaperCount(themesQuery.data?.themes);
    const themeNode = themes?.find((t) => t.slug === selectedTheme);

    const domainsQuery = useTaxonomyDomains(selectedTheme, department, !!selectedTheme);
    const domains = rankByPaperCount(domainsQuery.data?.domains);
    const domainNode = domains?.find((d) => d.slug === selectedDomain);

    // Reflects the deepest level picked — domain once chosen, theme alone before that.
    const browseFilters = themeNode
        ? { theme: themeNode.slug, domain: domainNode?.slug, department }
        : undefined;
    const recommendedQuery = useTaxonomyFaculty(browseFilters ?? {}, 1, 1, !!browseFilters);
    const recommendedCount = recommendedQuery.data?.recommended_count;

    return (
        <div className="rounded-2xl border border-border/60 bg-card/60 backdrop-blur p-6 md:p-8 space-y-6">
            <div>
                <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                    Thematic Area
                </h3>
                {themeNode ? (
                    <FieldPill label={themeNode.name} onRemove={onClearTheme} />
                ) : themesQuery.isLoading ? (
                    <OptionsSkeleton />
                ) : (
                    <div className="flex flex-wrap gap-3">
                        {themes?.map((t) => (
                            <FieldOption key={t.id} label={t.name} onSelect={() => onSelectTheme(t)} />
                        ))}
                    </div>
                )}
            </div>

            {themeNode && (
                <div>
                    <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                        Domain
                    </h3>
                    {domainNode ? (
                        <FieldPill label={domainNode.name} onRemove={onClearDomain} />
                    ) : domainsQuery.isLoading ? (
                        <OptionsSkeleton />
                    ) : (
                        <div className="flex flex-wrap gap-3">
                            {domains?.map((d) => (
                                <FieldOption key={d.id} label={d.name} onSelect={() => onSelectDomain(d)} />
                            ))}
                        </div>
                    )}
                </div>
            )}

            {browseFilters && (
                <div className="pt-2 border-t border-border/60">
                    <Button
                        size="lg"
                        className="rounded-xl"
                        onClick={onBrowse}
                        disabled={recommendedQuery.isLoading}
                    >
                        Browse {recommendedQuery.isLoading ? "…" : (recommendedCount ?? 0)} expert{recommendedCount === 1 ? "" : "s"}
                    </Button>
                </div>
            )}
        </div>
    );
};

export default TaxonomyFieldPicker;
