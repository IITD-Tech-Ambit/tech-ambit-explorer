import { X, User, GraduationCap, Calendar, Tag, FileText, ExternalLink, BookOpen } from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { ScrollArea } from './ui/scroll-area';
import type { ThesisData } from '@/lib/api';

interface ThesisCardProps {
  thesis: ThesisData;
  onClose: () => void;
}

const ThesisCard = ({ thesis, onClose }: ThesisCardProps) => {
  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
    } catch {
      return dateString;
    }
  };

  const formatSubjects = (subjects: string | undefined) => {
    if (!subjects) return [];
    return subjects.split('||').map(s => s.trim()).filter(Boolean);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-md"
        onClick={onClose}
      />
      
      {/* Card */}
      <div className="relative w-full max-w-2xl mx-4 bg-background border border-border/50 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="relative p-5 border-b border-white/10 overflow-hidden bg-gradient-to-br from-amber-500/10 via-background to-primary/5">
           <div className="absolute inset-0 bg-grid-white/10 [mask-image:linear-gradient(0deg,transparent,black)] pointer-events-none" />
           <div className="relative flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-3">
                <div className="bg-amber-500/20 p-1.5 rounded-md">
                  <BookOpen className="h-4 w-4 text-amber-500" />
                </div>
                <span className="text-sm font-semibold tracking-wide text-amber-600 dark:text-amber-400 uppercase">Thesis Details</span>
              </div>
              <h2 className="text-2xl font-bold tracking-tight leading-tight text-foreground">
                {thesis.dc_title || 'Untitled Thesis'}
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

        {/* Content */}
        <div className="max-h-[55vh] overflow-y-auto">
          <div className="p-5 space-y-5">
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Author */}
              {thesis.dc_contributor_author && (
                <div className="flex flex-col gap-2 p-3 rounded-xl bg-card border border-border shadow-sm">
                  <div className="flex items-center gap-2">
                     <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 border border-primary/20">
                      <GraduationCap className="h-4 w-4 text-primary" />
                    </div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Author</p>
                  </div>
                  <p className="text-sm font-semibold text-foreground px-1 leading-tight">{thesis.dc_contributor_author}</p>
                </div>
              )}

              {/* Advisor */}
              {thesis.dc_contributor_advisor && (
                <div className="flex flex-col gap-2 p-3 rounded-xl bg-card border border-border shadow-sm">
                  <div className="flex items-center gap-2">
                     <div className="w-8 h-8 rounded-full bg-purple-500/10 flex items-center justify-center flex-shrink-0 border border-purple-500/20">
                      <User className="h-4 w-4 text-purple-500" />
                    </div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Advisor</p>
                  </div>
                  <p className="text-sm font-semibold text-foreground px-1 leading-tight">{thesis.dc_contributor_advisor}</p>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Date */}
              {thesis.dc_date_issued && (
                <div className="flex flex-col p-3 rounded-xl bg-muted/40 border border-border/50">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Calendar className="h-3.5 w-3.5 text-blue-500" />
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Date Issued</p>
                  </div>
                  <p className="text-base font-bold text-foreground leading-tight">{formatDate(thesis.dc_date_issued)}</p>
                </div>
              )}

              {/* Type */}
              {thesis.dc_type && (
                <div className="flex flex-col p-3 rounded-xl bg-muted/40 border border-border/50">
                  <div className="flex items-center gap-1.5 mb-1">
                    <FileText className="h-3.5 w-3.5 text-green-500" />
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Type</p>
                  </div>
                  <p className="text-base font-bold text-foreground leading-tight">{thesis.dc_type}</p>
                </div>
              )}
            </div>

            {/* Subjects */}
            {thesis.dc_subject && (
              <div className="space-y-2.5">
                <div className="flex items-center gap-2">
                  <Tag className="h-4 w-4 text-orange-500" />
                  <p className="text-sm font-semibold text-muted-foreground">Subjects</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {formatSubjects(thesis.dc_subject).map((subject, index) => (
                    <Badge key={index} variant="secondary" className="px-3 py-1 bg-secondary/50 hover:bg-secondary border border-border/50 transition-colors">
                      {subject}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border bg-muted/30 flex items-center justify-between gap-3 flex-row-reverse sm:flex-row">
          <Button variant="outline" onClick={onClose} className="hidden sm:inline-flex">
            Close
          </Button>
          {thesis.dc_identifier_uri && (
            <a
              href={thesis.dc_identifier_uri}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto inline-flex items-center justify-center flex-1 sm:flex-none gap-2 px-5 py-2 bg-primary text-primary-foreground hover:bg-primary/90 text-sm font-medium rounded-md transition-all shadow-sm"
            >
              <ExternalLink className="h-4 w-4" />
              View Full Thesis
            </a>
          )}
        </div>
      </div>
    </div>
  );
};

export default ThesisCard;
