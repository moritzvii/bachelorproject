import * as React from "react"
import * as SliderPrimitive from "@radix-ui/react-slider"

import { cn } from "@/lib/utils"
import { LIKERT_STEPS, STEP_VALUES } from "@/components/ui/likert-utils"

type LikertVariant = "light" | "dark";

type LikertSliderProps = Omit<
  React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root>,
  "min" | "max" | "step"
> & { variant?: LikertVariant };

const LikertSlider = React.forwardRef<
  React.ElementRef<typeof SliderPrimitive.Root>,
  LikertSliderProps
>(({ className, variant = "light", ...props }, ref) => {
  const styles =
    variant === "dark"
      ? {
          marker: "bg-black/30",
          track: "bg-black/25",
          range: "bg-black",
          thumb: "border-white/50 bg-white",
        }
      : {
          marker: "bg-white/30",
          track: "bg-white/20",
          range: "bg-white",
          thumb: "border-white/70 bg-white",
        };

  return (
    <div className="relative w-full">
      
      <div className="absolute left-0 top-0 z-0 flex h-1.5 w-full items-center justify-between pointer-events-none">
        {STEP_VALUES.map((step) => (
          <div
            key={step}
            className={cn("h-3 w-[2px]", styles.marker)}
            style={{
              position: "absolute",
              left: `${(step / (LIKERT_STEPS - 1)) * 100}%`,
              transform: "translateX(-50%)",
            }}
          />
        ))}
      </div>

      <SliderPrimitive.Root
        ref={ref}
        min={0}
        max={6}
        step={1}
        className={cn("relative z-10 flex w-full select-none items-center touch-none", className)}
        {...props}
      >
        <SliderPrimitive.Track
          className={cn(
            "relative h-1.5 w-full grow overflow-hidden rounded-full",
            styles.track,
          )}
        >
          <SliderPrimitive.Range className={cn("absolute h-full", styles.range)} />
        </SliderPrimitive.Track>
        <SliderPrimitive.Thumb
          className={cn(
            "block h-4 w-4 rounded-full shadow transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/80 disabled:pointer-events-none disabled:opacity-60",
            styles.thumb,
          )}
        />
      </SliderPrimitive.Root>
    </div>
  );
})
LikertSlider.displayName = "LikertSlider"

export { LikertSlider, LIKERT_STEPS }
export type { LikertVariant }
