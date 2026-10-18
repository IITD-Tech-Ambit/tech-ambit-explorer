import { Sparkles } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

const ChatbotComingSoon = () => (
  <Popover>
    <PopoverTrigger asChild>
      <button
        aria-label="Research assistant (coming soon)"
        className="group/fab fixed z-[150] flex items-center justify-center text-white active:scale-90 touch-manipulation rounded-2xl w-14 h-14 right-4 transition-all duration-200 bottom-[calc(1.25rem+env(safe-area-inset-bottom,0px))] md:w-12 md:h-12 md:right-6 md:bottom-20"
        style={{
          background: "linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--accent)) 100%)",
          boxShadow: "0 8px 32px -6px hsl(var(--primary)/0.55), 0 2px 8px -2px rgba(0,0,0,0.2)",
        }}
      >
        <span className="fab-hover-label">Chatbot · Coming soon</span>
        <Sparkles className="w-5 h-5 md:w-4 md:h-4" />
        <span className="absolute -top-1.5 -right-1.5 rounded-full bg-amber-400 px-1.5 py-[1px] text-[8px] font-bold uppercase tracking-wide text-amber-950 ring-[1.5px] ring-background">
          Soon
        </span>
      </button>
    </PopoverTrigger>
    <PopoverContent side="top" align="end" sideOffset={12} className="z-[170] w-80 max-w-[calc(100vw-2rem)] rounded-2xl p-4">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Sparkles className="h-4 w-4" />
        </div>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <p className="whitespace-nowrap text-sm font-semibold text-foreground">Research Assistant</p>
            <span className="whitespace-nowrap rounded-full bg-amber-100 px-2 py-[2px] text-[10px] font-bold uppercase tracking-wide text-amber-800 dark:bg-amber-400/15 dark:text-amber-300">
              Coming soon
            </span>
          </div>
          <p className="text-xs leading-relaxed text-muted-foreground">
            An AI assistant for exploring IIT Delhi faculty, publications, research trends and patents is on its way.
          </p>
        </div>
      </div>
    </PopoverContent>
  </Popover>
);

export default ChatbotComingSoon;
