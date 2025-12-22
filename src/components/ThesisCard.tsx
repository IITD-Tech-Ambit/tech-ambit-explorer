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
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Card */}
      <div className="relative w-full max-w-2xl mx-4 bg-background border border-border rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="gradient-primary p-6 text-primary-foreground">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <BookOpen className="h-5 w-5 flex-shrink-0" />
                <span className="text-sm font-medium opacity-90">Thesis Details</span>
              </div>
              <h2 className="text-xl font-bold leading-tight">
                {thesis.dc_title || 'Untitled Thesis'}
              </h2>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="text-primary-foreground hover:bg-white/20 flex-shrink-0"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <ScrollArea className="max-h-[60vh]">
          <div className="p-6 space-y-5">
            {/* Author */}
            {thesis.dc_contributor_author && (
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <GraduationCap className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground font-medium">Author</p>
                  <p className="text-base font-semibold">{thesis.dc_contributor_author}</p>
                </div>
              </div>
            )}

            {/* Advisor */}
            {thesis.dc_contributor_advisor && (
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-purple-500/10 flex items-center justify-center flex-shrink-0">
                  <User className="h-5 w-5 text-purple-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground font-medium">Advisor</p>
                  <p className="text-base font-semibold">{thesis.dc_contributor_advisor}</p>
                </div>
              </div>
            )}

            {/* Date */}
            {thesis.dc_date_issued && (
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                  <Calendar className="h-5 w-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground font-medium">Date Issued</p>
                  <p className="text-base font-semibold">{formatDate(thesis.dc_date_issued)}</p>
                </div>
              </div>
            )}

            {/* Type */}
            {thesis.dc_type && (
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center flex-shrink-0">
                  <FileText className="h-5 w-5 text-green-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground font-medium">Type</p>
                  <p className="text-base font-semibold">{thesis.dc_type}</p>
                </div>
              </div>
            )}

            {/* Subjects */}
            {thesis.dc_subject && (
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-orange-500/10 flex items-center justify-center flex-shrink-0">
                  <Tag className="h-5 w-5 text-orange-500" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground font-medium mb-2">Subjects</p>
                  <div className="flex flex-wrap gap-2">
                    {formatSubjects(thesis.dc_subject).map((subject, index) => (
                      <Badge key={index} variant="secondary" className="text-xs">
                        {subject}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* URI Link */}
            {thesis.dc_identifier_uri && (
              <div className="pt-4 border-t border-border">
                <a
                  href={thesis.dc_identifier_uri}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-primary hover:underline font-medium"
                >
                  <ExternalLink className="h-4 w-4" />
                  View Full Thesis
                </a>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Footer */}
        <div className="p-4 border-t border-border bg-muted/30">
          <div className="flex justify-end">
            <Button onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ThesisCard;
