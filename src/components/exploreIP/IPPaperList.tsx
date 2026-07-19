import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Globe2, Hash, ShieldCheck } from "lucide-react";
import type { IPDocument } from "@/lib/api/types";
import { formatAbstract, highlightTerms } from "@/lib/utils";

type Props = {
  results: IPDocument[];
  highlightTokens: string[];
  onSelectDocument: (doc: IPDocument) => void;
  onInventorClick: (name: string, kerberos: string) => void;
};

function primaryInventor(doc: IPDocument) {
  return doc.inventors?.[0] ?? null;
}

function IPPaperCard({
  item,
  highlightTokens,
  onSelect,
  onInventorClick,
}: {
  item: IPDocument;
  highlightTokens: string[];
  onSelect: (doc: IPDocument) => void;
  onInventorClick: (name: string, kerberos: string) => void;
}) {
  const pi = primaryInventor(item);
  const extraInventors = Math.max(0, (item.inventors?.length ?? 0) - 1);

  return (
    <Card
      className="hover:shadow-elegant transition-smooth cursor-pointer border-border"
      onClick={() => onSelect(item)}
    >
      <CardHeader>
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge variant="secondary" className="uppercase text-[10px] tracking-wide">
              {item.type_of_ip}
            </Badge>
            {item.field_of_invention && (
              <Badge variant="outline" className="text-xs">
                {item.field_of_invention}
              </Badge>
            )}
          </div>
          {item.country && (
            <span className="flex items-center gap-1 text-xs font-medium text-muted-foreground shrink-0">
              <Globe2 className="h-3.5 w-3.5" />
              {item.country}
            </span>
          )}
        </div>
        <CardTitle className="text-base sm:text-xl mb-2 leading-snug">
          {highlightTerms(item.title, highlightTokens)}
        </CardTitle>

        {pi && (
          <div
            className="text-sm text-muted-foreground"
            onClick={(e) => e.stopPropagation()}
            role="presentation"
          >
            <span className="font-semibold text-primary/80 mr-1">Inventor:</span>
            {pi.is_faculty && pi.kerberos ? (
              <button
                type="button"
                onClick={() => onInventorClick(pi.name, pi.kerberos!)}
                className="inline underline underline-offset-2 decoration-primary/60 hover:decoration-primary text-primary/80 hover:text-primary font-semibold transition-colors"
              >
                {pi.name}
              </button>
            ) : (
              <span>{pi.name}</span>
            )}
            {pi.is_faculty && (
              <Badge variant="default" className="ml-2 text-[10px] px-1.5 py-0 align-middle">
                Faculty
              </Badge>
            )}
            {extraInventors > 0 && <span className="text-muted-foreground"> +{extraInventors} more</span>}
          </div>
        )}
      </CardHeader>
      <CardContent>
        {item.abstract && (
          <p className="text-muted-foreground mb-4 line-clamp-3">
            {highlightTerms(formatAbstract(item.abstract), highlightTokens)}
          </p>
        )}

        <div className="flex flex-wrap items-center justify-between gap-2 pt-4 border-t border-border">
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              <span>{item.publication_year || "N/A"}</span>
            </div>
            <div className="flex items-center gap-1">
              <Hash className="h-4 w-4" />
              <span className="truncate max-w-[140px] sm:max-w-none">{item.application_number}</span>
            </div>
            {item.applicants?.length > 0 && (
              <div className="hidden sm:flex items-center gap-1">
                <ShieldCheck className="h-4 w-4" />
                <span className="truncate max-w-[220px]">{item.applicants[0]}</span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function IPPaperList({ results, highlightTokens, onSelectDocument, onInventorClick }: Props) {
  if (results.length === 0) return null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {results.map((item, index) => (
        <IPPaperCard
          key={item._id || index}
          item={item}
          highlightTokens={highlightTokens}
          onSelect={onSelectDocument}
          onInventorClick={onInventorClick}
        />
      ))}
    </div>
  );
}