import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";
import type { IPDocument } from "@/lib/api/types";
import { formatAbstract, highlightTerms } from "@/lib/utils";

type Props = {
  document: IPDocument;
  highlightTokens: string[];
  onClose: () => void;
  onInventorClick: (name: string, kerberos: string) => void;
  /** Extra classes for the full-screen overlay (e.g. higher z-index when stacked). */
  overlayClassName?: string;
};

function formatDate(value?: string) {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("en-IN", { year: "numeric", month: "short", day: "numeric" });
}

export function IPDocumentModal({
  document: doc,
  highlightTokens,
  onClose,
  onInventorClick,
  overlayClassName,
}: Props) {
  return (
    <div
      className={`fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 ${overlayClassName ?? ""}`}
      onClick={onClose}
    >
      <div
        className="bg-background border border-border/50 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative flex items-start justify-between p-6 border-b border-white/10 overflow-hidden bg-gradient-to-br from-indigo-500/10 via-background to-primary/5 shrink-0">
          <div className="absolute inset-0 bg-grid-white/10 [mask-image:linear-gradient(0deg,transparent,black)] pointer-events-none" />
          <div className="relative flex-1 pr-4">
            <div className="flex flex-wrap gap-2 mb-3">
              <Badge
                variant="secondary"
                className="px-3 py-0.5 font-bold rounded-full uppercase tracking-wider text-[10px] bg-secondary/80 text-secondary-foreground"
              >
                {doc.type_of_ip}
              </Badge>
              {doc.field_of_invention && (
                <Badge
                  variant="outline"
                  className="px-3 py-0.5 bg-background/50 backdrop-blur-sm rounded-full uppercase tracking-wider text-[10px] text-muted-foreground border-border/50"
                >
                  {doc.field_of_invention}
                </Badge>
              )}
              {doc.country && (
                <Badge
                  variant="outline"
                  className="px-3 py-0.5 bg-background/50 backdrop-blur-sm rounded-full uppercase tracking-wider text-[10px] text-muted-foreground border-border/50"
                >
                  {doc.country}
                </Badge>
              )}
            </div>
            <h2 className="text-lg sm:text-2xl font-bold text-foreground leading-tight">
              {highlightTerms(doc.title, highlightTokens)}
            </h2>
            <p className="text-xs text-muted-foreground mt-2 font-mono">App. No. {doc.application_number}</p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="relative shrink-0 rounded-full hover:bg-background/80">
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="overflow-y-auto flex-1 min-h-0 p-6 space-y-7">
          {doc.inventors && doc.inventors.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Inventor(s)
              </h3>
              <div className="flex flex-wrap gap-3">
                {doc.inventors.map((inv, idx) => {
                  const clickable = inv.is_faculty && !!inv.kerberos;
                  const Row = (
                    <div
                      className={`rounded-xl px-4 py-2 border text-left transition-smooth ${
                        inv.is_faculty
                          ? "bg-primary/5 border-primary/30 ring-1 ring-primary/20 shadow-sm"
                          : "bg-card border-border shadow-sm"
                      } ${clickable ? "hover:-translate-y-0.5 hover:shadow-md cursor-pointer" : ""}`}
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-sm leading-tight ${
                            inv.is_faculty ? "font-bold text-foreground" : "font-semibold text-foreground/90"
                          }`}
                        >
                          {idx === 0 && (
                            <span className="text-[9px] font-bold uppercase tracking-wider text-primary/70 mr-1.5 align-middle">
                              PI
                            </span>
                          )}
                          {inv.name}
                        </span>
                        {inv.is_faculty && (
                          <Badge variant="default" className="text-[9px] px-1.5 py-0">
                            Faculty
                          </Badge>
                        )}
                      </div>
                      {inv.is_faculty && inv.kerberos && (
                        <div className="text-[10px] font-medium text-muted-foreground mt-1 tracking-wide uppercase">
                          {inv.kerberos}
                        </div>
                      )}
                      {inv.address && (
                        <div className="text-[10px] text-muted-foreground mt-1 line-clamp-1 max-w-xs">
                          {inv.address}
                        </div>
                      )}
                    </div>
                  );
                  return clickable ? (
                    <button key={`${inv.kerberos}-${idx}`} type="button" onClick={() => onInventorClick(inv.name, inv.kerberos!)}>
                      {Row}
                    </button>
                  ) : (
                    <div key={`${inv.name}-${idx}`}>{Row}</div>
                  );
                })}
              </div>
            </div>
          )}

          {doc.abstract && (
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Abstract</h3>
              <div className="p-5 rounded-xl bg-muted/30 border border-border/50 leading-relaxed text-foreground/80 text-sm shadow-inner">
                {highlightTerms(formatAbstract(doc.abstract), highlightTokens)}
              </div>
            </div>
          )}

          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Filing Details</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="flex flex-col p-4 rounded-xl bg-blue-500/5 border border-blue-500/10">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                  Publication Year
                </div>
                <div className="text-xl font-bold text-foreground leading-tight">{doc.publication_year || "N/A"}</div>
              </div>
              <div className="flex flex-col p-4 rounded-xl bg-orange-500/5 border border-orange-500/10">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                  Filing Date
                </div>
                <div className="text-sm font-bold text-foreground leading-tight mt-1">{formatDate(doc.filing_date) || "N/A"}</div>
              </div>
              <div className="flex flex-col p-4 rounded-xl bg-green-500/5 border border-green-500/10">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                  Publication Date
                </div>
                <div className="text-sm font-bold text-foreground leading-tight mt-1">{formatDate(doc.publication_date) || "N/A"}</div>
              </div>
              <div className="flex flex-col p-4 rounded-xl bg-purple-500/5 border border-purple-500/10">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                  Application Status
                </div>
                <div className="text-sm font-bold text-foreground leading-tight mt-1 line-clamp-1">
                  {doc.application_status || "Not available"}
                </div>
              </div>
            </div>
          </div>

          {doc.applicants && doc.applicants.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Applicant(s)</h3>
              <div className="flex flex-wrap gap-2">
                {doc.applicants.map((a, idx) => (
                  <Badge key={idx} variant="secondary" className="px-3 py-1 font-medium bg-secondary/50 border border-border/50">
                    {a}
                  </Badge>
                ))}
              </div>
            </div>
          )}

        </div>

        <div className="flex items-center justify-end p-5 border-t border-border bg-background/80 backdrop-blur-md shrink-0">
          <Button variant="outline" onClick={onClose} className="font-semibold">
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
