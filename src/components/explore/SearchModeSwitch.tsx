import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export type SearchMode = "basic" | "advanced";

/** Display names. API still sends `basic` / `advanced`. */
export const SEARCH_MODE_LABEL: Record<SearchMode, string> = {
  basic: "Exact",
  advanced: "Nearest",
};

const SEARCH_MODE_HINT: Record<SearchMode, string> = {
  basic:
    "Shows only results that contain the words you typed — nothing extra. Use this when you already know the term and want a tight list.",
  advanced:
    "Also finds the closest matching work, even if it uses different words for the same idea. Use this when you want related results, not just an exact phrase.",
};

interface SearchModeSwitchProps {
  mode: SearchMode;
  onChange: (mode: SearchMode) => void;
}

export function SearchModeSwitch({ mode, onChange }: SearchModeSwitchProps) {
  return (
    <TooltipProvider delayDuration={200} skipDelayDuration={0}>
      <div
        role="group"
        aria-label="How results are matched"
        className="flex bg-muted rounded-xl p-1 shadow-sm border border-border h-14 items-center w-full sm:w-auto"
      >
        {(["basic", "advanced"] as const).map((value) => (
          <Tooltip key={value}>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={() => onChange(value)}
                aria-pressed={mode === value}
                className={cn(
                  "flex-1 sm:flex-none px-4 py-2 text-sm rounded-lg font-medium transition-all duration-200",
                  mode === value
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {SEARCH_MODE_LABEL[value]}
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="max-w-[260px] text-left leading-snug">
              {SEARCH_MODE_HINT[value]}
            </TooltipContent>
          </Tooltip>
        ))}
      </div>
    </TooltipProvider>
  );
}
