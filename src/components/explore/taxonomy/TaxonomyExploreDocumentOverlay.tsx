import { useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { ExploreDocumentModal } from "@/components/explore/ExploreDocumentModal";
import { useSearchDocument } from "@/lib/api/hooks/useSearch";
import { getFacultyByScopusId } from "@/lib/api/services/directoryService";

function kerberosFromEmail(email?: string | null): string | null {
    if (!email) return null;
    const local = String(email).split("@")[0]?.trim().toLowerCase();
    return local || null;
}

type Props = {
    paperId: string | null;
    onClose: () => void;
};

/** Loads a SearchDocument by id and shows the Explore paper detail modal. */
const TaxonomyExploreDocumentOverlay = ({ paperId, onClose }: Props) => {
    const documentQuery = useSearchDocument(paperId ?? "", { enabled: !!paperId });

    const handleAuthorClick = useCallback(async (scopusAuthorId: string, _name: string) => {
        try {
            const full = await getFacultyByScopusId(scopusAuthorId);
            const k = kerberosFromEmail(full.email);
            if (k) window.open(`/faculty/${k}`, "_blank", "noopener");
        } catch {
            /* ignore */
        }
    }, []);

    if (!paperId) return null;

    if (documentQuery.isLoading) {
        return (
            <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40">
                <div className="rounded-2xl border border-border/60 bg-background px-6 py-5 flex items-center gap-3 shadow-xl">
                    <Loader2 className="w-5 h-5 animate-spin text-primary" />
                    <span className="text-sm text-muted-foreground">Loading paper…</span>
                </div>
            </div>
        );
    }

    if (documentQuery.isError) {
        return (
            <div
                className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4"
                onClick={onClose}
            >
                <div
                    className="rounded-2xl border border-border/60 bg-background px-6 py-5 max-w-sm w-full shadow-xl space-y-3"
                    onClick={(e) => e.stopPropagation()}
                >
                    <p className="text-sm text-foreground">Could not load this paper’s details.</p>
                    <Button size="sm" variant="outline" onClick={onClose}>
                        Close
                    </Button>
                </div>
            </div>
        );
    }

    if (!documentQuery.data) return null;

    return (
        <ExploreDocumentModal
            document={documentQuery.data}
            selectedAuthor={null}
            highlightTokens={[]}
            onClose={onClose}
            onAuthorClick={handleAuthorClick}
            overlayClassName="!z-[60]"
        />
    );
};

export default TaxonomyExploreDocumentOverlay;
