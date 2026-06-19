import { User, Compass } from "lucide-react";
import type { AppMode } from "./types";
import { cn } from "@/lib/utils";

const TABS: { id: AppMode; icon: typeof User; label: string }[] = [
  { id: "faculty", icon: User, label: "Faculty Explorer" },
  { id: "topic", icon: Compass, label: "Topic Explorer" },
];

export default function ModeToggle({
  mode,
  setMode,
}: {
  mode: AppMode;
  setMode: (m: AppMode) => void;
}) {
  return (
    <div className="inline-flex items-center gap-1 p-1 rounded-full border-2 border-border bg-background">
      {TABS.map((t) => {
        const active = mode === t.id;
        const Icon = t.icon;
        return (
          <button
            key={t.id}
            type="button"
            onClick={() => setMode(t.id)}
            className={cn(
              "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200",
              active
                ? "bg-primary text-primary-foreground shadow-md"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/60",
            )}
          >
            <Icon className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{t.label}</span>
          </button>
        );
      })}
    </div>
  );
}
