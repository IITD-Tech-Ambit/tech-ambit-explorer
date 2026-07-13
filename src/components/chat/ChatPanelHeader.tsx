import { ChevronDown, LogOut, Maximize2, Minimize2, Sparkles, Trash2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { AuthUser } from "@/lib/api/services/authService";

interface ChatPanelHeaderProps {
  hasMessages: boolean;
  onClear: () => void;
  onClose: () => void;
  showDragHandle?: boolean;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
  user?: AuthUser | null;
  onLogout?: () => void;
}

const actionBtn = (size: "sm" | "md") =>
  cn(
    "flex items-center justify-center rounded-xl transition-all duration-150",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 touch-manipulation",
    size === "md" ? "w-9 h-9" : "w-8 h-8",
  );

export default function ChatPanelHeader({
  hasMessages,
  onClear,
  onClose,
  showDragHandle = false,
  isExpanded = false,
  onToggleExpand,
  user,
  onLogout,
}: ChatPanelHeaderProps) {
  const btnSize = isExpanded || showDragHandle ? "md" : "sm";
  const avatarSize = isExpanded || showDragHandle ? "w-8 h-8" : "w-7 h-7";
  const initial = user?.name?.trim()?.[0]?.toUpperCase() || user?.kerberos?.[0]?.toUpperCase() || "?";

  return (
    <header className="flex-shrink-0 sticky top-0 z-10 w-full select-none">
      
      {showDragHandle && (
        <div className="flex justify-center pt-3 pb-1.5 md:hidden" aria-hidden>
          <div className="w-10 h-[3px] rounded-full bg-foreground/10" />
        </div>
      )}

      
      <div
        className={cn(
          "flex items-center gap-3 min-w-0",
          "px-4 py-3",
          isExpanded ? "md:px-5 md:py-3.5" : "md:px-4",
          "bg-background",
        )}
      >
        
        <div
          className={cn(
            "relative flex items-center justify-center flex-shrink-0 rounded-[14px]",
            showDragHandle ? "w-9 h-9" : isExpanded ? "w-10 h-10" : "w-8 h-8 md:w-9 md:h-9",
          )}
          style={{
            background: "linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--accent)) 100%)",
            boxShadow:
              "0 4px 16px -4px hsl(var(--primary)/0.5), 0 1px 0 rgba(255,255,255,0.18) inset",
          }}
        >
          <Sparkles
            className={cn(
              "text-white drop-shadow-sm",
              isExpanded ? "w-4.5 h-4.5" : showDragHandle ? "w-4 h-4" : "w-3.5 h-3.5",
            )}
          />
        </div>

        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <h2
              className={cn(
                "font-bold text-foreground tracking-tight leading-none",
                isExpanded
                  ? "text-[15px] md:text-base"
                  : showDragHandle
                  ? "text-[15px]"
                  : "text-[13px] md:text-[14px]",
              )}
            >
              Research Assistant
            </h2>
            <span className="text-[9px] font-bold uppercase tracking-widest px-1.5 py-[3px] rounded-md bg-primary/10 text-primary border border-primary/20 leading-none flex-shrink-0">
              Beta
            </span>
          </div>
          <div
            className={cn(
              "flex items-center gap-1.5 mt-1 min-w-0",
              isExpanded ? "text-[11px]" : "text-[10px]",
            )}
          >
            <span className="relative flex h-[6px] w-[6px] flex-shrink-0">
              <span className="absolute inset-0 rounded-full bg-emerald-400 animate-ping opacity-50" />
              <span className="relative h-[6px] w-[6px] rounded-full bg-emerald-500" />
            </span>
            <span className="text-muted-foreground/70 truncate">
              <span className="sm:hidden">IIT Delhi Research</span>
              <span className="hidden sm:inline">IIT Delhi · RAG-powered</span>
            </span>
          </div>
        </div>

        
        <div className="flex items-center gap-0.5 flex-shrink-0">
          {user && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  aria-label="Account menu"
                  title={user.name}
                  className={cn(
                    "flex items-center justify-center rounded-full flex-shrink-0 mr-0.5",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 touch-manipulation",
                    "transition-transform duration-150 active:scale-90",
                  )}
                >
                  <Avatar className={avatarSize}>
                    <AvatarFallback
                      className="text-white text-[11px] font-semibold"
                      style={{ background: "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--accent)))" }}
                    >
                      {initial}
                    </AvatarFallback>
                  </Avatar>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 z-[170]">
                <DropdownMenuLabel className="flex flex-col gap-0.5">
                  <span className="text-[13px] font-semibold text-foreground truncate">{user.name}</span>
                  <span className="text-[11px] font-normal text-muted-foreground truncate">{user.kerberos}</span>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={onLogout}
                  className="text-red-500 focus:text-red-500 focus:bg-red-500/8 cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5 mr-2" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {hasMessages && (
            <button
              type="button"
              onClick={onClear}
              aria-label="Clear conversation"
              title="Clear conversation"
              className={cn(
                actionBtn(btnSize),
                "text-muted-foreground/40 hover:text-red-500 hover:bg-red-500/8",
              )}
            >
              <Trash2 className="w-[14px] h-[14px]" />
            </button>
          )}

          {onToggleExpand && (
            <button
              type="button"
              onClick={onToggleExpand}
              aria-label={isExpanded ? "Collapse panel" : "Expand to full view"}
              title={isExpanded ? "Collapse" : "Expand"}
              className={cn(
                actionBtn(btnSize),
                "hidden md:flex text-muted-foreground/40 hover:text-foreground hover:bg-muted/60",
              )}
            >
              {isExpanded ? (
                <Minimize2 className="w-[15px] h-[15px]" />
              ) : (
                <Maximize2 className="w-[15px] h-[15px]" />
              )}
            </button>
          )}

          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            title="Close"
            className={cn(
              actionBtn(btnSize),
              "text-muted-foreground/40 hover:text-foreground hover:bg-muted/60",
            )}
          >
            {isExpanded ? (
              <X className="w-4 h-4" />
            ) : (
              <>
                <X className="w-4 h-4 md:hidden" />
                <ChevronDown className="hidden md:block w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </div>

      
      <div
        className="h-px w-full flex-shrink-0"
        style={{
          background: isExpanded
            ? "linear-gradient(90deg, transparent 0%, hsl(var(--primary)/0.35) 25%, hsl(var(--accent)/0.4) 75%, transparent 100%)"
            : "hsl(var(--border)/0.5)",
        }}
      />
    </header>
  );
}
