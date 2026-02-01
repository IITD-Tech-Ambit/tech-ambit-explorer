import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { PhdThesisData } from '@/lib/api';

interface PhdThesisCardProps {
  thesis: PhdThesisData;
  onClose: () => void;
}

const PhdThesisCard = ({ thesis, onClose }: PhdThesisCardProps) => {
  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
        onClick={onClose}
      />
      
      {/* Card */}
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[90vw] max-w-4xl max-h-[85vh] overflow-auto bg-background rounded-xl shadow-2xl border-2 border-primary/20">
        <div className="sticky top-0 bg-background border-b-2 border-primary/20 z-10">
          <div className="flex items-start justify-between p-6">
            <div className="flex-1 pr-8">
              <div className="flex items-center gap-3 mb-3">
                <div className="h-8 w-1 bg-gradient-to-b from-primary to-primary/50 rounded-full" />
                <span className="text-sm font-semibold text-primary uppercase tracking-wider">PhD Thesis</span>
              </div>
              <h2 className="text-2xl font-bold tracking-tight leading-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">
                {thesis.title}
              </h2>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="shrink-0 hover:bg-primary/10 rounded-full"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>

        <div className="p-8 space-y-6">
          {/* Author */}
          {thesis.contributor.author && (
            <div className="space-y-2 bg-muted/30 p-4 rounded-lg border border-primary/10">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-gradient-to-r from-primary to-primary/50" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-primary">
                  Author
                </h3>
              </div>
              <div className="pl-4">
                <p className="text-lg font-semibold">{thesis.contributor.author}</p>
              </div>
            </div>
          )}

          {/* Advisor */}
          {thesis.contributor.advisor.name && (
            <div className="space-y-2 bg-muted/30 p-4 rounded-lg border border-primary/10">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-gradient-to-r from-primary to-primary/50" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-primary">
                  Advisor
                </h3>
              </div>
              <div className="pl-4">
                <p className="text-lg font-semibold">{thesis.contributor.advisor.name}</p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Publication Year */}
            {thesis.publication_year && (
              <div className="space-y-2 bg-muted/20 p-4 rounded-lg border border-border">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary/70" />
                  <h3 className="text-xs font-semibold uppercase tracking-wider opacity-70">
                    Publication Year
                  </h3>
                </div>
                <div className="pl-3.5">
                  <p className="text-base font-bold text-primary">{thesis.publication_year}</p>
                </div>
              </div>
            )}

            {/* Department */}
            {thesis.department_name && (
              <div className="space-y-2 bg-muted/20 p-4 rounded-lg border border-border">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary/70" />
                  <h3 className="text-xs font-semibold uppercase tracking-wider opacity-70">
                    Department
                  </h3>
                </div>
                <div className="pl-3.5">
                  <p className="text-base font-semibold">{thesis.department_name}</p>
                </div>
              </div>
            )}
          </div>

          {/* Document Type */}
          {thesis.document_type && (
            <div className="space-y-2 bg-muted/20 p-4 rounded-lg border border-border">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-primary/70" />
                <h3 className="text-xs font-semibold uppercase tracking-wider opacity-70">
                  Document Type
                </h3>
              </div>
              <div className="pl-3.5">
                <p className="text-base font-semibold">{thesis.document_type}</p>
              </div>
            </div>
          )}

          {/* Subject Areas */}
          {thesis.subject_area && thesis.subject_area.length > 0 && (
            <div className="space-y-3 bg-muted/20 p-4 rounded-lg border border-border">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-primary/70" />
                <h3 className="text-xs font-semibold uppercase tracking-wider opacity-70">
                  Subject Areas
                </h3>
              </div>
              <div className="pl-3.5">
                <div className="flex flex-wrap gap-2">
                  {thesis.subject_area.map((subject, index) => (
                    <span
                      key={index}
                      className="px-3 py-1.5 bg-gradient-to-r from-primary/20 to-primary/10 text-primary rounded-full text-sm font-semibold border border-primary/20 hover:border-primary/40 transition-colors"
                    >
                      {subject}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Link */}
          {thesis.link && (
            <div className="space-y-2 bg-primary/5 p-4 rounded-lg border-2 border-primary/20">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-primary">
                  View Thesis
                </h3>
              </div>
              <div className="pl-3.5">
                <a
                  href={thesis.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-base font-semibold text-primary hover:text-primary/80 underline decoration-2 underline-offset-4 break-all transition-colors"
                >
                  {thesis.link}
                </a>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default PhdThesisCard;
