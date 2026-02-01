import { useState } from 'react';
import { X, Navigation } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface NavigateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: string) => void;
}

const NavigateModal = ({ isOpen, onClose, onSubmit }: NavigateModalProps) => {
  const [inputData, setInputData] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = () => {
    // Validate JSON
    try {
      if (!inputData.trim()) {
        setError('Please paste document data');
        return;
      }
      JSON.parse(inputData);
      setError(null);
      onSubmit(inputData);
    } catch (e) {
      setError('Invalid JSON format. Please check your input.');
    }
  };

  const handleClose = () => {
    setInputData('');
    setError(null);
    onClose();
  };

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
        onClick={handleClose}
      />
      
      {/* Card */}
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[90vw] max-w-4xl max-h-[85vh] overflow-auto bg-gradient-to-br from-background to-muted/30 rounded-xl shadow-2xl border-2 border-primary/20">
        <div className="sticky top-0 bg-gradient-to-r from-primary/10 via-primary/5 to-background/95 backdrop-blur-sm border-b-2 border-primary/20 z-10">
          <div className="flex items-start justify-between p-6">
            <div className="flex-1 pr-8">
              <div className="flex items-center gap-3 mb-3">
                <div className="h-8 w-1 bg-gradient-to-b from-primary to-primary/50 rounded-full" />
                <span className="text-sm font-semibold text-primary uppercase tracking-wider">Navigate to Document</span>
              </div>
              <h2 className="text-2xl font-bold tracking-tight leading-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">
                Paste Document Data
              </h2>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleClose}
              className="shrink-0 hover:bg-primary/10 rounded-full"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>

        <div className="p-8 space-y-6">
          {/* Text Area */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-foreground">
              Document JSON Data
            </label>
            <textarea
              value={inputData}
              onChange={(e) => {
                setInputData(e.target.value);
                setError(null);
              }}
              placeholder={`{
  "_id": {"$oid": "..."},
  "contributor": {...},
  "title": "...",
  ...
}`}
              className="w-full h-64 p-4 rounded-lg border-2 border-primary/20 bg-background/50 text-sm font-mono resize-none focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all"
            />
            {error && (
              <p className="text-sm text-red-500 font-medium">{error}</p>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <Button
              variant="outline"
              onClick={handleClose}
              className="px-6"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              className="px-6 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
            >
              <Navigation className="w-4 h-4 mr-2" />
              Navigate
            </Button>
          </div>
        </div>
      </div>
    </>
  );
};

export default NavigateModal;
