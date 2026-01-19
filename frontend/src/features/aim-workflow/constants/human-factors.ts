export const HUMAN_FACTOR_COLORS: Record<string, string> = {
  "Strategic Alignment": "hsl(var(--chart-4))",
  "Risk Alignment": "hsl(var(--chart-5))",
  "Forecast Alignment": "hsl(var(--chart-3))",
  "Oversight Alignment": "hsl(var(--chart-2))",
};

export const DEFAULT_HUMAN_FACTOR_COLOR =
  HUMAN_FACTOR_COLORS["Strategic Alignment"];

export type HumanFactorLabel = keyof typeof HUMAN_FACTOR_COLORS;
