import { cn } from "@/lib/utils";

type ScoreBadgeProps = {
  entailment: number;
  contradiction: number;
  combinedScore?: number;
  sourceType?: "forecast" | "risk";
  className?: string;
  mode?: "combined" | "entailment" | "contradiction";
};







function interpolateColor(percent: number, fromColor: string, toColor: string): string {
  
  const from = {
    r: parseInt(fromColor.slice(1, 3), 16),
    g: parseInt(fromColor.slice(3, 5), 16),
    b: parseInt(fromColor.slice(5, 7), 16),
  };
  const to = {
    r: parseInt(toColor.slice(1, 3), 16),
    g: parseInt(toColor.slice(3, 5), 16),
    b: parseInt(toColor.slice(5, 7), 16),
  };

  const ratio = Math.min(100, Math.max(0, percent)) / 100;
  const r = Math.round(from.r + (to.r - from.r) * ratio);
  const g = Math.round(from.g + (to.g - from.g) * ratio);
  const b = Math.round(from.b + (to.b - from.b) * ratio);

  return `rgb(${r}, ${g}, ${b})`;
}

export function ScoreBadge({
  entailment,
  contradiction,
  combinedScore,
  sourceType,
  className,
  mode = "combined",
}: ScoreBadgeProps) {
  const lightGray = "#d1d5db";
  const green = "#22c55e";
  const red = "#ef4444";

  let color: string;
  let displayValue: number;

  let baseScore: number;
  let targetColor: string;

  if (mode === "entailment") {
    baseScore = entailment;
    targetColor = green;
  } else if (mode === "contradiction") {
    baseScore = contradiction;
    targetColor = red;
  } else {
    baseScore =
      typeof combinedScore === "number" && Number.isFinite(combinedScore)
        ? combinedScore
        : sourceType === "forecast"
          ? entailment
          : sourceType === "risk"
            ? contradiction
            : 0;
    targetColor = sourceType === "risk" ? red : green;
  }
  color = interpolateColor(baseScore, lightGray, targetColor);
  displayValue = baseScore;

  return (
    <span
      className={cn(
        "inline-flex rounded-full border border-zinc-800 bg-black px-3 py-1 text-xs font-bold",
        className
      )}
      style={{ color }}
    >
      {displayValue}%
    </span>
  );
}
