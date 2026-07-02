import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface TaxonomyNodePaginationProps {
    page: number;
    totalPages: number;
    onPageChange: (page: number) => void;
}

/**
 * Prev/Next pager for the Domains and Sub-domains node grids, styled to
 * match TaxonomyFacultySection's pagination so browsing feels consistent
 * across every level of the drill-down.
 */
const TaxonomyNodePagination = ({ page, totalPages, onPageChange }: TaxonomyNodePaginationProps) => {
    if (totalPages <= 1) return null;

    return (
        <div className="mt-8 flex items-center justify-center gap-3">
            <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => onPageChange(page - 1)}
            >
                <ChevronLeft className="w-4 h-4 mr-1" />
                Previous
            </Button>
            <span className="px-4 py-1.5 rounded-full bg-muted text-sm font-medium">
                {page} / {totalPages}
            </span>
            <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => onPageChange(page + 1)}
            >
                Next
                <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
        </div>
    );
};

export default TaxonomyNodePagination;
