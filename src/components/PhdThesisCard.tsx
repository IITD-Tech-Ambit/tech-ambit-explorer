import { X, User, GraduationCap, Calendar, Building2, Tag, FileText, ExternalLink, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { PhdThesisData } from '@/lib/api';

interface PhdThesisCardProps {
  thesis: PhdThesisData;
  onClose: () => void;
}

const PhdThesisCard = ({ thesis, onClose }: PhdThesisCardProps) => {
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
        <div className="relative p-5 border-b border-white/10 overflow-hidden bg-gradient-to-br from-primary/10 via-background to-primary/5">
          <div className="absolute inset-0 bg-grid-white/10 [mask-image:linear-gradient(0deg,transparent,black)] pointer-events-none" />
          <div className="relative flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-3">
                <div className="bg-primary/20 p-1.5 rounded-md">
                  <BookOpen className="h-4 w-4 text-primary" />
                </div>
                <span className="text-sm font-semibold tracking-wide text-primary/80 uppercase">PhD Thesis</span>
              </div>
              <h2 className="text-2xl font-bold tracking-tight leading-tight text-foreground">
                {thesis.title || 'Untitled Thesis'}
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
          <div className="p-5 space-y-5">
            
            {/* Primary Actors */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {thesis.contributor.author && (
                <div className="flex items-start gap-3 p-3 rounded-xl bg-card border border-border shadow-sm">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 border border-primary/20">
                    <GraduationCap className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex flex-col justify-center">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-0.5">Author</p>
                    <p className="text-sm font-semibold text-foreground leading-tight">{thesis.contributor.author}</p>
                  </div>
                </div>
              )}

              {thesis.contributor.advisor.name && (
                <div className="flex items-start gap-3 p-3 rounded-xl bg-card border border-border shadow-sm">
                  <div className="w-10 h-10 rounded-full bg-purple-500/10 flex items-center justify-center flex-shrink-0 border border-purple-500/20">
                    <User className="h-5 w-5 text-purple-500" />
                  </div>
                  <div className="flex flex-col justify-center">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-0.5">Advisor</p>
                    <p className="text-sm font-semibold text-foreground leading-tight">{thesis.contributor.advisor.name}</p>
                  </div>
                </div>
              )}
            </div>

            {/* General Meta Data */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {thesis.publication_year && (
                <div className="flex flex-col p-3 rounded-xl bg-muted/40 border border-border/50">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Calendar className="h-3.5 w-3.5 text-blue-500" />
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Year</p>
                  </div>
                  <p className="text-base font-bold text-foreground leading-tight">{thesis.publication_year}</p>
                </div>
              )}

              {thesis.department_name && (
                <div className="flex flex-col p-3 rounded-xl bg-muted/40 border border-border/50 md:col-span-2">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Building2 className="h-3.5 w-3.5 text-orange-500" />
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Department</p>
                  </div>
                  <p className="text-sm font-semibold text-foreground leading-tight">{thesis.department_name}</p>
                </div>
              )}
            </div>

            {/* Document Details & Subjects */}
            <div className="space-y-4">
              {thesis.document_type && (
                <div className="flex items-center gap-4">
                  <div className="w-8 h-8 rounded-full bg-green-500/10 flex items-center justify-center border border-green-500/20">
                    <FileText className="h-4 w-4 text-green-500" />
                  </div>
                  <div>
                    <span className="text-sm font-medium text-muted-foreground mr-2">Type:</span>
                    <span className="font-semibold">{thesis.document_type}</span>
                  </div>
                </div>
              )}

              {thesis.subject_area && thesis.subject_area.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Tag className="h-4 w-4 text-muted-foreground" />
                    <h3 className="text-sm font-semibold text-muted-foreground">Subject Areas</h3>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {thesis.subject_area.map((subject, index) => (
                      <Badge 
                        key={index}
                        variant="secondary" 
                        className="px-3 py-1 bg-secondary/50 hover:bg-secondary border border-border/50 transition-colors"
                      >
                        {subject}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
            
          </div>
        </div>

        {/* Footer / Action */}
        <div className="p-4 border-t border-border bg-background flex flex-col sm:flex-row items-center justify-between gap-3">
          {thesis.link ? (
            <>
              <div className="flex items-center gap-2 text-muted-foreground mr-auto">
                <ExternalLink className="w-4 h-4" />
                <span className="text-sm font-medium">Repository Link</span>
              </div>
              <a
                href={thesis.link}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2 bg-primary text-primary-foreground hover:bg-primary/90 text-sm font-medium rounded-md transition-all shadow-sm"
              >
                Open Thesis
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

export default PhdThesisCard;
