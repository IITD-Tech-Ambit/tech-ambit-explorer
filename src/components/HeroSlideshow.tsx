import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

const SLIDE_INTERVAL_MS = 3000;

export interface HeroSlide {
  src: string;
  alt: string;
}

interface HeroSlideshowProps {
  slides: HeroSlide[];
  intervalMs?: number;
}

const HeroSlideshow = ({ slides, intervalMs = SLIDE_INTERVAL_MS }: HeroSlideshowProps) => {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (slides.length <= 1) return;
    const timer = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % slides.length);
    }, intervalMs);
    return () => window.clearInterval(timer);
  }, [slides.length, intervalMs]);

  return (
    <>
      {slides.map((slide, index) => (
        <div
          key={slide.src}
          className={cn(
            "absolute inset-0 bg-cover bg-center bg-no-repeat transition-opacity duration-1000 ease-in-out",
            index === activeIndex ? "opacity-100 z-0" : "opacity-0 z-0",
          )}
          style={{ backgroundImage: `url('${slide.src}')` }}
          role="img"
          aria-label={slide.alt}
          aria-hidden={index !== activeIndex}
        />
      ))}

      {slides.length > 1 && (
        <div className="absolute bottom-6 right-6 z-10 flex items-center gap-2">
          {slides.map((slide, index) => (
            <button
              key={slide.src}
              type="button"
              aria-label={`Show slide ${index + 1}: ${slide.alt}`}
              aria-current={index === activeIndex ? "true" : undefined}
              onClick={() => setActiveIndex(index)}
              className={cn(
                "h-2 rounded-full transition-all duration-300",
                index === activeIndex
                  ? "w-6 bg-white"
                  : "w-2 bg-white/40 hover:bg-white/70",
              )}
            />
          ))}
        </div>
      )}
    </>
  );
};

export default HeroSlideshow;
