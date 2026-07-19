import { Loader2, TriangleAlert } from "lucide-react";
import { IPDocumentModal } from "@/components/exploreIP/IPDocumentModal";
import { useIPDocument } from "@/lib/api/hooks/useIPSearch";

type Props = {
  /** IP document `_id` from a chat source card, or null when the modal is closed. */
  sourceId: string | null;
  onClose: () => void;
};

/**
 * Chat-specific adapter: fetches the full IP document behind a chat source card
 * (the SSE payload only carries flattened inventor names, no faculty/kerberos data)
 * and renders it through the same IPDocumentModal used by the Explore IP section.
 */
export function ChatIPSourceModal({ sourceId, onClose }: Props) {
  const { data: document, isLoading, isError } = useIPDocument(sourceId ?? "", {
    enabled: !!sourceId,
  });

  if (!sourceId) return null;

  const openFacultyProfile = (_name: string, kerberos: string) => {
    window.open(`/faculty/${kerberos}`, "_blank", "noopener");
  };

  if (document) {
    return (
      <IPDocumentModal
        document={document}
        highlightTokens={[]}
        onClose={onClose}
        onInventorClick={openFacultyProfile}
        overlayClassName="!z-[170]"
      />
    );
  }

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[170] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-background border border-border/50 rounded-2xl shadow-2xl p-8 flex flex-col items-center gap-3 min-w-[220px]"
        onClick={(e) => e.stopPropagation()}
      >
        {isLoading && (
          <>
            <Loader2 className="h-6 w-6 text-primary animate-spin" />
            <p className="text-sm text-muted-foreground">Loading patent details…</p>
          </>
        )}
        {isError && !isLoading && (
          <>
            <TriangleAlert className="h-6 w-6 text-destructive" />
            <p className="text-sm text-muted-foreground text-center">
              Couldn't load this patent's details. Please try again.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
