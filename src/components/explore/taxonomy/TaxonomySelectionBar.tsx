import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { X, FileText, Users, RotateCcw } from "lucide-react";

export interface SelectionChip {
    key: string;
    label: string;
    value: string;
    onRemove: () => void;
}

interface TaxonomySelectionBarProps {
    chips: SelectionChip[];
    paperCount?: number;
    facultyCount?: number;
    isCountLoading: boolean;
    onClearAll: () => void;
}

/**
 * Sticky bar summarizing the current browse configuration: removable filter
 * chips plus live paper/faculty counts for the exact combination.
 */
const TaxonomySelectionBar = ({ chips, paperCount, facultyCount, isCountLoading, onClearAll }: TaxonomySelectionBarProps) => {
    if (chips.length === 0) return null;

    return (
        <div className="sticky top-16 z-30 -mx-4 px-4 py-3 bg-background/85 backdrop-blur border-b border-border/60 animate-fade-in">
            <div className="container mx-auto flex flex-wrap items-center gap-2">
                {chips.map((chip) => (
                    <Badge
                        key={chip.key}
                        variant="secondary"
                        className="pl-2.5 pr-1 py-1 gap-1.5 bg-primary/10 text-primary hover:bg-primary/15 text-xs font-medium"
                    >
                        <span className="text-muted-foreground font-normal">{chip.label}:</span>
                        <span className="max-w-[180px] truncate" title={chip.value}>{chip.value}</span>
                        <button
                            onClick={chip.onRemove}
                            aria-label={`Remove ${chip.label} filter`}
                            className="ml-0.5 rounded-full p-0.5 hover:bg-primary/20 transition-colors"
                        >
                            <X className="w-3 h-3" />
                        </button>
                    </Badge>
                ))}

                <div className="ml-auto flex items-center gap-3 text-sm text-muted-foreground">
                    {isCountLoading ? (
                        <span className="text-xs">Counting…</span>
                    ) : (
                        <>
                            <span className="inline-flex items-center gap-1.5">
                                <FileText className="w-3.5 h-3.5 text-primary/70" />
                                <strong className="text-foreground">{paperCount ?? 0}</strong>
                                <span className="hidden sm:inline">papers</span>
                            </span>
                            <span className="inline-flex items-center gap-1.5">
                                <Users className="w-3.5 h-3.5 text-accent" />
                                <strong className="text-foreground">{facultyCount ?? 0}</strong>
                                <span className="hidden sm:inline">faculty</span>
                            </span>
                        </>
                    )}
                    <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={onClearAll}>
                        <RotateCcw className="w-3 h-3 mr-1" />
                        Reset
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default TaxonomySelectionBar;
