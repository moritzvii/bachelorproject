import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

type HeaderStep = {
  label: string;
  helperText?: string;
};

type HeaderProps = {
  steps: ReadonlyArray<HeaderStep>;
  currentStep: number;
  className?: string;
};

export default function Header({ steps, currentStep, className }: HeaderProps) {
  const safeStep = Math.min(Math.max(currentStep, 0), Math.max(steps.length - 1, 0));

  return (
      <div
          className={cn(
              "flex h-full w-full items-center justify-center px-3 py-1 text-center",
              className
          )}
      >
        <nav aria-label="Workflow progress" className="flex h-full w-full items-center">
          <ol className="flex w-full items-center justify-between gap-2">
            {steps.map((step, index) => {
              const state =
                  index < safeStep ? "complete" : index === safeStep ? "current" : "upcoming";

              const circleClasses = cn(
                  "relative z-10 flex size-4 items-center justify-center rounded-full text-[10px] font-semibold transition-colors duration-150",
                  state === "complete" && "bg-[hsl(var(--chart-2))] text-[hsl(var(--background))]",
                  state === "current" &&
                    "bg-[hsl(var(--chart-3))] text-[hsl(var(--background))]",
                  state === "upcoming" && "bg-border/60 text-muted-foreground"
              );

              const connectorLeft = cn(
                  "hidden h-px flex-1 bg-border/60 transition-colors duration-150 md:block",
                  index === 0 && "bg-transparent",
                  index > 0 && index <= safeStep && "bg-[hsl(var(--chart-3))]"
              );

              const connectorRight = cn(
                  "hidden h-px flex-1 bg-border/60 transition-colors duration-150 md:block",
                  index === steps.length - 1 && "bg-transparent",
                  index < safeStep && "bg-[hsl(var(--chart-3))]",
                  index === safeStep && "bg-[hsl(var(--chart-3))]"
              );

              return (
                  <li
                      key={step.label}
                      className="flex flex-1 flex-col items-center justify-center gap-1 text-center"
                  >
                    <div className="flex w-full items-center gap-1">
                      <span className={connectorLeft} aria-hidden />
                      <span className={circleClasses} aria-current={state === "current"}>
                    {state === "complete" ? (
                        <Check className="size-3" />
                    ) : (
                        index + 1
                    )}
                  </span>
                      <span className={connectorRight} aria-hidden />
                    </div>
                    <div className="space-y-0">
                      <span
                          className={cn(
                          "text-[10px] text-muted-foreground",
                          state === "current" &&
                          "text-[hsl(var(--chart-3))]"
                          )}
                      >
                    {step.label}
                  </span>
                      {step.helperText && (
                          <span className="block text-[9px] text-white/40">
                      {step.helperText}
                    </span>
                      )}
                    </div>
                  </li>
              );
            })}
          </ol>
        </nav>
      </div>
  );
}
