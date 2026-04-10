import { X, FileText, Users, Calendar, Quote, BookMarked, Tag, ExternalLink, AlignLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { ResearchData } from '@/lib/api';
import { formatAbstract } from '@/lib/utils';

interface ResearchCardProps {
  research: ResearchData;
  onClose: () => void;
}

const ResearchCard = ({ research, onClose }: ResearchCardProps) => {
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

            {/* Authors */}
            {research.authors && research.authors.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-foreground/80">
                  <Users className="h-4 w-4" />
                  <h3 className="text-xs font-bold uppercase tracking-wider">Authors</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pl-1">
                  {research.authors.map((author, index) => (
                    <div key={author._id || index} className="flex flex-col p-2.5 rounded-lg bg-card border border-border shadow-sm">
                      <span className="text-sm font-semibold text-foreground leading-tight">{author.author_name}</span>
                      {author.author_affiliation && (
                        <span className="text-xs text-muted-foreground mt-0.5 line-clamp-1" title={author.author_affiliation}>
                          {author.author_affiliation}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
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
          {research.link ? (
            <>
              <div className="flex items-center gap-2 text-muted-foreground mr-auto">
                <ExternalLink className="w-4 h-4" />
                <span className="text-sm font-medium">Source Link</span>
              </div>
              <a
                href={research.link}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2 bg-primary text-primary-foreground hover:bg-primary/90 text-sm font-medium rounded-md transition-all shadow-sm"
              >
                Open Paper
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
