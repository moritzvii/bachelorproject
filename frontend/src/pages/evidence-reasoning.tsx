"use client";

import {LineChart, ShieldAlert } from "lucide-react";
import { useState, useEffect, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";

import { ContinueButton } from "@/features/aim-workflow/buttons/continue-button";
import { HumanJudgmentGradientBarChart } from "@/features/aim-workflow/charts/human-factors-bar";
import { ScoreDebugDialog } from "@/features/aim-workflow/debug/score-debug-dialog";
import { FactorSimpleCard } from "@/features/aim-workflow/cards/factor-card";
import { HelpBanner } from "@/features/aim-workflow/banners/help-banner";
import { TerminalHeroPanel } from "@/features/aim-workflow/banners/workflow-banner";
import AlertTaskDemo from "@/components/ui/shadcn-studio/alert-09";
import DualColorLayout from "@/layouts/dual-color-layout";
import { fetchScoreSummary, saveHumanFactors, type ScoreInterval, type ScoreSummaryResponse } from "@/lib/api";
import { AIM_WORKFLOW_STEPS } from "@/lib/workflow-steps";

const FACTOR_CONFIGS = [
  {
    key: "forecastAlignment",
    label: "Forecast Alignment",
    description: "Perceived accuracy of the mean forecast support score (Evidence ↔ Strategy)",
    icon: LineChart,
    useLikert: true,
  },
  {
    key: "riskAlignment",
    label: "Risk Alignment",
    description: "Perceived accuracy of the mean risk threat score (Evidence ↔ Strategy)",
    icon: ShieldAlert,
    useLikert: true,
  },
  {
    key: "forecastConfidence",
    label: "Forecast Stability",
    description: "Perceived stability among the selected evidence (Evidence ↔ Evidence)",
    icon: LineChart,
    useLikert: true,
  },
  {
    key: "riskConfidence",
    label: "Risk Stability",
    description: "Perceived stability among the selected evidence (Evidence ↔ Evidence)",
    icon: ShieldAlert,
    useLikert: true,
  },
] as const;

type FactorKey = (typeof FACTOR_CONFIGS)[number]["key"];

const ALIGNMENT_LIKERT = [
  "1 — Overestimated",
  "2 — Somewhat overestimated",
  "3 — Slightly overestimated",
  "4 — Accurate",
  "5 — Slightly underestimated",
  "6 — Somewhat underestimated",
  "7 — Underestimated",
];

const COVERAGE_LIKERT = [
  "1 — Overestimates stability",
  "2 — Somewhat overestimates stability",
  "3 — Slightly overestimates stability",
  "4 — Accurate",
  "5 — Slightly underestimates stability",
  "6 — Somewhat underestimates stability",
  "7 — Underestimates stability",
];

const createEmptyWeights = () =>
  FACTOR_CONFIGS.reduce(
    (acc, factor) => {
      
      acc[factor.key] = 3;
      return acc;
    },
    {} as Record<FactorKey, number>,
  );

const DEFAULT_CONFIDENCE = 40; 
const MAX_ADJUSTMENT = 0.4; 

const toNumber = (value: unknown, fallback = 0): number => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

const clampPercent = (value: number, fallback = 0): number => {
  if (!Number.isFinite(value)) return fallback;
  return Math.max(0, Math.min(100, value));
};

export default function EvidenceReasoningPage() {
  const navigate = useNavigate();
  const [weights, setWeights] = useState<Record<FactorKey, number>>(createEmptyWeights);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [intervalWarning, setIntervalWarning] = useState<ReactNode | null>(null);
  const [baselineState, setBaselineState] = useState<{
    forecastAlignment: number;
    riskAlignment: number;
    forecastConfidence: number;
    riskConfidence: number;
  } | null>(null);
  const isComplete = Object.values(weights).every((weight) => weight >= 0);

  
  useEffect(() => {
    const run = async () => {
      try {
        let summary: ScoreSummaryResponse | null = null;
        try {
          summary = await fetchScoreSummary();
        } catch (err) {
          console.error("Failed to load score summary:", err);
        }

        let forecastPercent = 50;
        let riskPercent = 50;
        let forecastVarPercent = DEFAULT_CONFIDENCE;
        let riskVarPercent = DEFAULT_CONFIDENCE;

        if (summary?.stats) {
          if (summary.stats.forecast?.mean != null) {
            forecastPercent = Math.round(toNumber(summary.stats.forecast.mean) * 100);
          }
          if (summary.stats.risk?.mean != null) {
            riskPercent = Math.round(toNumber(summary.stats.risk.mean) * 100);
          }
        }

        const intervalWidthPercent = (interval?: ScoreInterval) => {
          if (!interval) return null;
          const widthPct = toNumber((interval as any).width_percent, NaN);
          if (!Number.isNaN(widthPct)) return widthPct;
          const lower = toNumber(interval.lower, NaN);
          const upper = toNumber(interval.upper, NaN);
          if (Number.isNaN(lower) || Number.isNaN(upper)) return null;
          return Math.max(0, (upper - lower) * 100);
        };

        const forecastWidth = intervalWidthPercent(summary?.intervals?.forecast);
        const riskWidth = intervalWidthPercent(summary?.intervals?.risk);

        const widthToConfidence = (width?: number | null) => {
          if (width == null) return null;
          const clampedWidth = Math.max(0, Math.min(100, width));
          return Math.max(0, Math.min(100, Math.round(100 - clampedWidth)));
        };

        const forecastConf = widthToConfidence(forecastWidth);
        const riskConf = widthToConfidence(riskWidth);

        if (forecastConf != null) {
          forecastVarPercent = forecastConf;
        }
        if (riskConf != null) {
          riskVarPercent = riskConf;
        }

        const forecastCount = toNumber(summary?.stats?.forecast?.count, 0);
        const riskCount = toNumber(summary?.stats?.risk?.count, 0);
        let warning: ReactNode | null = null;
        if (forecastCount <= 1 && riskCount <= 1) {
          warning = (
            <span>
              Thin evidence on <span className="font-semibold underline">forecasts</span> and{" "}
              <span className="font-semibold underline">risks</span> (Stability fallback ±10%).
            </span>
          );
        } else if (forecastCount <= 1) {
          warning = (
            <span>
              Thin evidence on <span className="font-semibold underline">forecasts</span> (Stability fallback ±10%).
            </span>
          );
        } else if (riskCount <= 1) {
          warning = (
            <span>
              Thin evidence on <span className="font-semibold underline">risks</span> (Stability fallback ±10%).
            </span>
          );
        }

        setWeights({
          forecastAlignment: 3,
          riskAlignment: 3,
          forecastConfidence: 3,
          riskConfidence: 3,
        });
        setBaselineState({
          forecastAlignment: clampPercent(forecastPercent, 50),
          riskAlignment: clampPercent(riskPercent, 50),
          forecastConfidence: clampPercent(forecastVarPercent, DEFAULT_CONFIDENCE),
          riskConfidence: clampPercent(riskVarPercent, DEFAULT_CONFIDENCE),
        });
        setIntervalWarning(warning);
        setIsLoading(false);
      } catch (err) {
        console.error("Failed to load score summary:", err);
        setIsLoading(false);
      }
    };

    run();
  }, []);

  
  

  const updateWeight = (
    key: FactorKey,
    nextValue: number,
  ) => {
    setWeights((prev) => {
      const safe = Math.min(Math.max(0, nextValue), 6); 
      if (prev[key] === safe) {
        return prev;
      }
      return { ...prev, [key]: safe };
    });
  };

  const handleWeightChange =
    (key: FactorKey) =>
    (nextValue: number) => {
      updateWeight(key, nextValue);
    };

  const handleWeightCommit =
    (key: FactorKey) =>
    (nextValue: number) => {
      updateWeight(key, nextValue);
    };

  const baselineStatic = baselineState ?? {
    forecastAlignment: 50,
    riskAlignment: 50,
    forecastConfidence: DEFAULT_CONFIDENCE,
    riskConfidence: DEFAULT_CONFIDENCE,
  };

  const clampUnit = (value: number) => Math.max(-1, Math.min(1, value));
  const barData = [
    {
      metric: "Forecast Alignment (Ø)",
      ai: baselineStatic.forecastAlignment,
      final: (() => {
        const base = baselineStatic.forecastAlignment;
        const delta = clampUnit((weights.forecastAlignment - 3) / 3) * MAX_ADJUSTMENT;
        return Math.max(0, Math.min(100, Math.round(base * (1 + delta))));
      })(),
    },
    {
      metric: "Risk Alignment (Ø)",
      ai: baselineStatic.riskAlignment,
      final: (() => {
        const base = baselineStatic.riskAlignment;
        const delta = clampUnit((weights.riskAlignment - 3) / 3) * MAX_ADJUSTMENT;
        return Math.max(0, Math.min(100, Math.round(base * (1 + delta))));
      })(),
    },
    {
      metric: "Forecast Stability",
      ai: baselineStatic.forecastConfidence,
      final: (() => {
        const base = baselineStatic.forecastConfidence;
        const delta = clampUnit((weights.forecastConfidence - 3) / 3) * MAX_ADJUSTMENT;
        return Math.max(0, Math.min(100, Math.round(base * (1 + delta))));
      })(),
    },
    {
      metric: "Risk Stability",
      ai: baselineStatic.riskConfidence,
      final: (() => {
        const base = baselineStatic.riskConfidence;
        const delta = clampUnit((weights.riskConfidence - 3) / 3) * MAX_ADJUSTMENT;
        return Math.max(0, Math.min(100, Math.round(base * (1 + delta))));
      })(),
    },
  ];

  const barColors = ["rgb(24,24,27)", "rgb(24,24,27)", "hsl(var(--chart-2))", "hsl(var(--chart-2))"];

  const handleContinue = async () => {
    if (!isComplete) {
      return;
    }

    if (isSaving) {
      return; 
    }

    setIsSaving(true);

    try {
      
      await saveHumanFactors({
        forecast_alignment: weights.forecastAlignment / 6,
        risk_alignment: weights.riskAlignment / 6,
        forecast_confidence: weights.forecastConfidence / 6,
        risk_confidence: weights.riskConfidence / 6,
      });

      
      navigate("/loading/2");
    } catch (error) {
      console.error("Failed to save human factors:", error);
      alert(`Error saving calibration: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again.`);
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <DualColorLayout
        steps={AIM_WORKFLOW_STEPS}
        currentStep={2}
        left={
          <div className="flex w-full flex-col items-center justify-center gap-4 px-2 py-8">
            <p className="text-lg font-medium">Loading alignment scores...</p>
          </div>
        }
        right={null}
      />
    );
  }

  const leftContent = (
    <div className="flex w-full max-w-4xl flex-col gap-6 px-2">
      <TerminalHeroPanel
        step="Step 3 — Evidence Reasoning"
        title="Assess the Scoring"
        description="Use the sliders to adjust **Forecast Alignment**, **Risk Alignment**, **Forecast Stability** and **Risk Stability** based on your own view of the evidence. This chart displays the **Alignment** of all included evidence and the perceived **Stability** of these scores."
      />
      <div className="flex w-full flex-col gap-4">
        <div className="grid w-full grid-cols-1 gap-4 md:grid-cols-2">
          {FACTOR_CONFIGS.map(({ icon, label, description, key }, index) => (
            <FactorSimpleCard
              key={key}
              icon={icon}
              label={label}
              description={description}
              value={weights[key]}
              onChange={handleWeightChange(key)}
              onCommit={handleWeightCommit(key)}
              likertLabels={key === "forecastConfidence" || key === "riskConfidence" ? COVERAGE_LIKERT : ALIGNMENT_LIKERT}
              className="h-full"
              style={
                index < 2
                  ? { backgroundColor: '#0a0a0a' }
                  : { backgroundColor: 'hsl(var(--chart-2))' }
              }
              titleColor={index < 2 ? 'white' : 'white'}
              useLikertScale
              sliderVariant={index < 2 ? "light" : "dark"}
              disabled={false}
            />
          ))}
        </div>
        <div className="flex items-center justify-between">
          <ScoreDebugDialog />
          <ContinueButton
            disabledMessage={isSaving ? "Saving..." : "Adjust the sliders to continue."}
            onClick={handleContinue}
            disabled={isSaving}
          />
        </div>
      </div>
    </div>
  );

  const rightContent = (
    <div className="flex w-full max-w-2xl flex-col gap-6 px-2 text-foreground">
      <HelpBanner
        step=""
        title="Evidence Chart"
        description=""
      />
      {intervalWarning && <AlertTaskDemo message={intervalWarning} />}
      <HumanJudgmentGradientBarChart data={barData} barColors={barColors} />
    </div>
  );

  return (
    <DualColorLayout
      steps={AIM_WORKFLOW_STEPS}
      currentStep={2}
      left={leftContent}
      right={rightContent}
      leftClassName="items-start justify-center"
      rightClassName="items-start justify-center"
    />
  );
}
