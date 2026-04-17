import { useEffect, useMemo, useState } from 'react';
import { X, FileText, Users, Calendar, Quote, BookMarked, Tag, ExternalLink, AlignLeft, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { ResearchData } from '@/lib/api';
import type { DirectoryFaculty } from '@/lib/api/types';
import { formatAbstract } from '@/lib/utils';
import { resolveFacultiesByScopusIds } from '@/lib/api/services/directoryService';

interface ResearchCardProps {
  research: ResearchData;
  onClose: () => void;
  /** Click an IITD author chip → open their FacultyModal. */
  onAuthorClick?: (scopusAuthorId: string) => void;
}

/**
 * Build a public Scopus URL for the paper.
 * `research.link` stored in the DB is the Scopus *API* endpoint
 * (`https://www.scopus.com/api/documents/<EID>`) which returns JSON, not the paper
 * page — so prefer the public publication URL built from `document_scopus_id`
 * (or EID as a fallback). Only use the stored link if it's already a non-API URL.
 */
const getPublicScopusUrl = (research: ResearchData): string | null => {
  if (research.document_scopus_id) {
    return `https://www.scopus.com/pages/publications/${research.document_scopus_id}?origin=resultslist`;
  }
  if (research.document_eid) {
    return `https://www.scopus.com/record/display.uri?eid=${encodeURIComponent(
      research.document_eid
    )}&origin=resultslist`;
  }
  if (research.link && !/\/api\/documents\//i.test(research.link)) {
    return research.link;
  }
  return null;
};

const ResearchCard = ({ research, onClose, onAuthorClick }: ResearchCardProps) => {
  const sourceUrl = getPublicScopusUrl(research);

  // Batch-resolve which authors are IITD Faculty, then show only those — mirroring
  // the Explore modal's IIT Delhi roster filter.
  const scopusIds = useMemo(
    () =>
      (research.authors || [])
        .map((a) => (a?.author_id == null ? '' : String(a.author_id).trim()))
        .filter((v) => v.length > 0),
    [research.authors]
  );

  const [iitdMatches, setIitdMatches] = useState<Record<string, DirectoryFaculty>>({});
  const [authorsLoading, setAuthorsLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (scopusIds.length === 0) {
      setIitdMatches({});
      return;
    }
    setAuthorsLoading(true);
    resolveFacultiesByScopusIds(scopusIds)
      .then((m) => {
        if (!cancelled) setIitdMatches(m);
      })
      .catch((err) => {
        console.error('Failed to resolve IITD authors for paper', err);
        if (!cancelled) setIitdMatches({});
      })
      .finally(() => {
        if (!cancelled) setAuthorsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [scopusIds]);

  const iitdAuthors = useMemo(() => {
    const seen = new Set<string>();
    const rows: Array<{
      scopusId: string;
      name: string;
      departmentName?: string | null;
      designation?: string | null;
    }> = [];
    for (const a of research.authors || []) {
      const sid = a?.author_id ? String(a.author_id).trim() : '';
      if (!sid) continue;
      const faculty = iitdMatches[sid];
      if (!faculty) continue;
      if (seen.has(sid)) continue;
      seen.add(sid);
      rows.push({
        scopusId: sid,
        name: faculty.name || a.author_name || 'Unknown',
        departmentName: faculty.department?.name,
        designation: faculty.designation,
      });
    }
    return rows;
  }, [research.authors, iitdMatches]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-md"
        onClick={onClose}
      />
      
      {/* Card */}
      <div className="relative w-full max-w-2xl mx-4 bg-background border border-border/50 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header (Glassy gradient) */}
        <div className="relative p-5 border-b border-white/10 overflow-hidden bg-gradient-to-br from-indigo-500/10 via-background to-primary/5">
          <div className="absolute inset-0 bg-grid-white/10 [mask-image:linear-gradient(0deg,transparent,black)] pointer-events-none" />
          <div className="relative flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-3">
                <div className="bg-indigo-500/20 p-1.5 rounded-md">
                  <FileText className="h-4 w-4 text-indigo-500" />
                </div>
                <span className="text-sm font-semibold tracking-wide text-indigo-500/80 uppercase">Research Paper</span>
              </div>
              <h2 className="text-2xl font-bold tracking-tight leading-tight text-foreground">
                {research.title || 'Untitled Research'}
              </h2>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="text-foreground/60 hover:text-foreground hover:bg-foreground/10 flex-shrink-0 rounded-full"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Content area */}
        <div className="max-h-[55vh] overflow-y-auto">
          <div className="p-5 space-y-6">
            
            {/* Abstract */}
            {research.abstract && (
              <div className="space-y-2.5">
                <div className="flex items-center gap-2 text-primary">
                  <AlignLeft className="h-4 w-4" />
                  <h3 className="text-xs font-bold uppercase tracking-wider">Abstract</h3>
                </div>
                <div className="p-4 rounded-xl bg-muted/30 border border-border/50 leading-relaxed text-muted-foreground text-sm">
                  {formatAbstract(research.abstract)}
                </div>
              </div>
            )}

            {/* IITD Authors only (mirrors Explore modal: paper authors filtered to the IITD Faculty roster) */}
            {(authorsLoading || iitdAuthors.length > 0) && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-foreground/80">
                    <Users className="h-4 w-4" />
                    <h3 className="text-xs font-bold uppercase tracking-wider">Author(s)</h3>
                  </div>
                  {authorsLoading && (
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                  )}
                </div>
                {iitdAuthors.length > 0 ? (
                  <div className="flex flex-wrap gap-3">
                    {iitdAuthors.map((row) => (
                      <button
                        key={row.scopusId}
                        type="button"
                        onClick={() => onAuthorClick?.(row.scopusId)}
                        disabled={!onAuthorClick}
                        className="group rounded-xl px-4 py-2 border text-left transition-smooth bg-card border-border shadow-sm hover:border-primary/40 hover:-translate-y-0.5 hover:shadow-md disabled:hover:translate-y-0 disabled:hover:shadow-sm disabled:cursor-default"
                      >
                        <div className="text-sm font-semibold text-foreground leading-tight group-hover:text-primary transition-colors">
                          {row.name}
                        </div>
                        <div className="text-[10px] font-medium text-muted-foreground mt-1 tracking-wide uppercase line-clamp-1">
                          {row.departmentName || row.designation || 'IIT Delhi'}
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  !authorsLoading && (
                    <p className="text-xs text-muted-foreground italic pl-1">
                      No IIT Delhi authors matched for this paper.
                    </p>
                  )
                )}
              </div>
            )}

            {/* Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {research.publication_year && (
                <div className="flex flex-col p-3 rounded-xl bg-blue-500/5 border border-blue-500/10">
                  <div className="flex items-center justify-center w-7 h-7 rounded-full bg-blue-500/10 mb-2">
                    <Calendar className="h-3.5 w-3.5 text-blue-500" />
                  </div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-0.5">Year</p>
                  <p className="text-lg font-bold text-foreground leading-tight">{research.publication_year}</p>
                </div>
              )}

              <div className="flex flex-col p-3 rounded-xl bg-orange-500/5 border border-orange-500/10">
                <div className="flex items-center justify-center w-7 h-7 rounded-full bg-orange-500/10 mb-2">
                  <Quote className="h-3.5 w-3.5 text-orange-500" />
                </div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-0.5">Citations</p>
                <p className="text-lg font-bold text-foreground leading-tight">{research.citation_count ?? 0}</p>
              </div>

              <div className="flex flex-col p-3 rounded-xl bg-purple-500/5 border border-purple-500/10">
                <div className="flex items-center justify-center w-7 h-7 rounded-full bg-purple-500/10 mb-2">
                  <BookMarked className="h-3.5 w-3.5 text-purple-500" />
                </div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-0.5">References</p>
                <p className="text-lg font-bold text-foreground leading-tight">{research.reference_count ?? 0}</p>
              </div>

              {research.document_type && (
                <div className="flex flex-col p-3 rounded-xl bg-green-500/5 border border-green-500/10">
                  <div className="flex items-center justify-center w-7 h-7 rounded-full bg-green-500/10 mb-2">
                    <FileText className="h-3.5 w-3.5 text-green-500" />
                  </div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-0.5">Type</p>
                  <p className="text-xs font-bold text-foreground line-clamp-1 leading-tight" title={research.document_type}>{research.document_type}</p>
                </div>
              )}
            </div>

            {/* Subject Areas */}
            {research.subject_area && research.subject_area.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Tag className="h-4 w-4 text-muted-foreground" />
                  <h3 className="text-sm font-semibold text-muted-foreground">Subject Areas</h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  {research.subject_area.map((subject, index) => (
                    <Badge 
                      key={index}
                      variant="secondary" 
                      className="px-3 py-1 bg-secondary/50 hover:bg-secondary border border-border/50 font-normal transition-colors"
                    >
                      {subject}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            
          </div>
        </div>

        {/* Footer / Action */}
        <div className="p-4 border-t border-border bg-background flex flex-col sm:flex-row items-center justify-between gap-3">
          {sourceUrl ? (
            <>
              <div className="flex items-center gap-2 text-muted-foreground mr-auto">
                <ExternalLink className="w-4 h-4" />
                <span className="text-sm font-medium">Source Link</span>
              </div>
              <a
                href={sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2 bg-primary text-primary-foreground hover:bg-primary/90 text-sm font-medium rounded-md transition-all shadow-sm"
              >
                <ExternalLink className="w-4 h-4" />
                Open on Scopus
              </a>
            </>
          ) : (
            <div className="ml-auto"></div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ResearchCard;
