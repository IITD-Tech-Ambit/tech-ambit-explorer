import { useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { cn } from "@/lib/utils";

interface HoverSlideTextProps {
  /** Full wording, also used for the hover tooltip when the line is clipped. */
  text: string;
  className?: string;
  children?: ReactNode;
}

/** `--slide` is the overflow in px; the placeholder-slide keyframes read it. */
export function HoverSlideText({ text, className, children }: HoverSlideTextProps) {
  const clipRef = useRef<HTMLSpanElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);
  const [overflow, setOverflow] = useState(0);

  useLayoutEffect(() => {
    const clip = clipRef.current;
    const el = textRef.current;
    if (!clip || !el) return;
    const measure = () => setOverflow(Math.max(0, Math.ceil(el.scrollWidth - clip.clientWidth)));
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(clip);
    return () => observer.disconnect();
  }, [text]);

  return (
    <span
      ref={clipRef}
      title={overflow > 0 ? text : undefined}
      className={cn(
        "block min-w-0 max-w-full overflow-hidden",
        overflow > 0 &&
          "[mask-image:linear-gradient(to_right,black_78%,transparent)] group-hover/slide:[mask-image:none] group-focus-within/slide:[mask-image:none]",
        className,
      )}
    >
      <span
        ref={textRef}
        style={{ "--slide": `-${overflow}px` } as CSSProperties}
        className={cn(
          "inline-block whitespace-nowrap",
          overflow > 0 &&
            "group-hover/slide:animate-placeholder-slide group-focus-within/slide:animate-placeholder-slide motion-reduce:animate-none",
        )}
      >
        {children ?? text}
      </span>
    </span>
  );
}
