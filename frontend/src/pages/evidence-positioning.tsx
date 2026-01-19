"use client";

import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { MatrixChart, MAX_BANDWIDTH } from "@/features/aim-workflow/charts/matrix-chart";
import { MatrixControls } from "@/features/aim-workflow/charts/matrix-controls";
import { TerminalHeroPanel } from "@/features/aim-workflow/banners/workflow-banner";
import { Grid3x3 } from "lucide-react";
import { HelpBanner } from "@/features/aim-workflow/banners/help-banner";
import DualColorLayout from "@/layouts/dual-color-layout";
import {
  fetchCalibratedScores,
  fetchScoreSummary,
  overrideCalibratedScores,
  runStrategyDistribution,
  type ScoreInterval,
} from "@/lib/api";
import { AIM_WORKFLOW_STEPS } from "@/lib/workflow-steps";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Collapsible, CollapsibleContent } from "@/components/ui/collapsible";
import { ChevronsUpDown } from "lucide-react";

export default function EvidencePositioningPage() {
  const clampBandwidth = (value: number) => Math.max(0, Math.min(MAX_BANDWIDTH, value));
  const navigate = useNavigate();

  type Interval = ScoreInterval;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const persistTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  
  const [centerX, setCenterX] = useState<number | null>(null);
  const [centerY, setCenterY] = useState<number | null>(null);
  const [bandWidthX, setBandWidthX] = useState<number | null>(null);
  const [bandWidthY, setBandWidthY] = useState<number | null>(null);
  
  const [comparisonCenterX, setComparisonCenterX] = useState<number | null>(null);
  const [comparisonCenterY, setComparisonCenterY] = useState<number | null>(null);
  const [comparisonBandWidthX, setComparisonBandWidthX] = useState<number | null>(null);
  const [comparisonBandWidthY, setComparisonBandWidthY] = useState<number | null>(null);
  const skipPersistCalibrated = useRef(true);
  const [hideIntervals, setHideIntervals] = useState(false);
  const [hideBaselineArea, setHideBaselineArea] = useState(true);
  const [isGeneratingDashboard, setIsGeneratingDashboard] = useState(false);

  useEffect(() => {
    const fetchCalibrated = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await fetchCalibratedScores();
        let calForecast: Interval = data?.calibrated?.forecast ?? {};
        let calRisk: Interval = data?.calibrated?.risk ?? {};
        let aiForecast: Interval = data?.ai?.forecast ?? {};
        let aiRisk: Interval = data?.ai?.risk ?? {};

        const hasMean = (interval?: Interval) =>
          typeof interval?.mean === "number" && Number.isFinite(interval.mean);

        
        if (!hasMean(calForecast) || !hasMean(calRisk) || !hasMean(aiForecast) || !hasMean(aiRisk)) {
          try {
            const summary = await fetchScoreSummary();
            const intervals = summary?.intervals;
            if (intervals) {
              calForecast = intervals.forecast ?? calForecast;
              calRisk = intervals.risk ?? calRisk;
              aiForecast = intervals.forecast ?? aiForecast;
              aiRisk = intervals.risk ?? aiRisk;
            }
          } catch (fallbackErr) {
            console.error("Failed to load fallback intervals:", fallbackErr);
          }
        }

        const toUnit = (value: unknown) =>
          typeof value === "number" && Number.isFinite(value) ? value : null;
        const toBandwidth = (interval: Interval) => {
          if (typeof interval?.width_percent === "number" && Number.isFinite(interval.width_percent)) {
            return clampBandwidth(interval.width_percent / 2); 
          }
          if (
            typeof interval?.lower === "number" &&
            typeof interval?.upper === "number" &&
            Number.isFinite(interval.lower) &&
            Number.isFinite(interval.upper)
          ) {
            const span = interval.upper - interval.lower;
            return clampBandwidth(span * 50); 
          }
          return null;
        };

        
        const nextCenterX = toUnit(aiRisk.mean);
        const nextCenterY = toUnit(aiForecast.mean);
        const nextBandWidthX = toBandwidth(aiRisk);
        const nextBandWidthY = toBandwidth(aiForecast);

        
        const nextComparisonCenterX = toUnit(calRisk.mean);
        const nextComparisonCenterY = toUnit(calForecast.mean);
        const nextComparisonBandWidthX = toBandwidth(calRisk);
        const nextComparisonBandWidthY = toBandwidth(calForecast);

        setCenterX(nextCenterX);
        setCenterY(nextCenterY);
        setBandWidthX(nextBandWidthX);
        setBandWidthY(nextBandWidthY);

        setComparisonCenterX(nextComparisonCenterX);
        setComparisonCenterY(nextComparisonCenterY);
        setComparisonBandWidthX(nextComparisonBandWidthX);
        setComparisonBandWidthY(nextComparisonBandWidthY);

      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load calibrated scores");
      } finally {
        setLoading(false);
      }
    };

    fetchCalibrated();
  }, []);

  

  
  useEffect(() => {
    if (
      comparisonCenterX == null ||
      comparisonCenterY == null ||
      comparisonBandWidthX == null ||
      comparisonBandWidthY == null
    ) {
      return;
    }
    if (skipPersistCalibrated.current) {
      skipPersistCalibrated.current = false;
      return;
    }
    if (persistTimer.current) {
      clearTimeout(persistTimer.current);
    }
    persistTimer.current = setTimeout(async () => {
      try {
        await overrideCalibratedScores({
          risk_mean: comparisonCenterX,
          risk_width_percent: comparisonBandWidthX * 2,
          forecast_mean: comparisonCenterY,
          forecast_width_percent: comparisonBandWidthY * 2,
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to persist calibrated intervals");
      }
    }, 400);
    return () => {
      if (persistTimer.current) {
        clearTimeout(persistTimer.current);
      }
    };
  }, [comparisonCenterX, comparisonCenterY, comparisonBandWidthX, comparisonBandWidthY]);

  

  const hasPrimaryData =
    centerX !== null &&
    centerY !== null &&
    bandWidthX !== null &&
    bandWidthY !== null;
  const hasComparisonData =
    comparisonCenterX !== null &&
    comparisonCenterY !== null &&
    comparisonBandWidthX !== null &&
    comparisonBandWidthY !== null;
  const hasChartData = hasPrimaryData && hasComparisonData;

  const handleCreateDashboard = async () => {
    if (isGeneratingDashboard) {
      return;
    }
    try {
      setIsGeneratingDashboard(true);
      setError(null);
      await runStrategyDistribution();
      navigate("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create dashboard");
    } finally {
      setIsGeneratingDashboard(false);
    }
  };

  const [showDebugInfo, setShowDebugInfo] = useState(false);

  const leftContent = (
    <div className="flex w-full max-w-7xl flex-col gap-6 px-2 lg:px-4">
      <TerminalHeroPanel
        step="Step 4 — Evidence Positioning"
        title="GE-McKinsey-Matrix"
        description="Your selected evidence is placed in the matrix based on its **Forecast Alignment** and **Risk Alignment**. The mean score of all included evidence sets the overall **direction**. The **Uncertainty** of these scores defines the size of the displayed rectangle."
        icon={<Grid3x3 className="h-6 w-6" strokeWidth={1.75} />}
      />
      <div className="relative h-[96vh] max-h-[96vh] overflow-hidden rounded-3xl border border-slate-200/70 bg-zinc-900 p-4 shadow-xl md:h-[calc(100vh-120px)] md:max-h-[calc(100vh-120px)]">
        <div className="pointer-events-none absolute inset-0 bg-[hsl(var(--chart-3)/0.6)]" aria-hidden />
        <div className="relative h-full">
          {hasChartData ? (
            <MatrixChart
              className="h-full w-full"
              controlsPlacement="right"
              showControls={false}
              showDescription={false}
              stateOverrides={{
                centerX: centerX!,
                centerY: centerY!,
                bandWidthX: bandWidthX!,
                bandWidthY: bandWidthY!,
                comparisonCenterX: comparisonCenterX!,
                comparisonCenterY: comparisonCenterY!,
                comparisonBandWidthX: comparisonBandWidthX!,
                comparisonBandWidthY: comparisonBandWidthY!,
                hideBandWidth: hideIntervals,
                hideBaseline: hideBaselineArea,
              }}
              forecastMin={centerX!}
              forecastMode={centerX!}
              forecastMax={centerX!}
              riskMin={centerY!}
              riskMode={centerY!}
              riskMax={centerY!}
              label="Debug · Dual scenarios"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-xs text-slate-300">
              {loading ? "Loading calibrated values…" : "No calibrated values to display."}
            </div>
          )}
        </div>
      </div>

    </div>
  );

  const rightContent = (
    <div className="flex w-full max-w-md flex-col gap-4 px-2">
      <HelpBanner
        step=""
        title="Visualization Controls"
        description=""
      />
      <div className="space-y-3">
        <ToggleRow label="Hide Interval Bands" checked={hideIntervals} onChange={setHideIntervals} />
        <ToggleRow
          label="Hide AI Baseline Square"
          checked={hideBaselineArea}
          onChange={setHideBaselineArea}
        />
      </div>
      <Button
        className="w-full bg-zinc-900 px-4 py-4 text-base font-semibold text-white hover:bg-zinc-900/90"
        onClick={handleCreateDashboard}
        disabled={isGeneratingDashboard}
      >
        {isGeneratingDashboard ? "Creating..." : "Create Final Dashboard"}
      </Button>
      <Collapsible open={showDebugInfo} onOpenChange={setShowDebugInfo}>
        <div className="flex justify-center">
          <Button
            variant="link"
            size="sm"
            className="px-0 text-slate-500 hover:text-slate-700 border-none shadow-none bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0"
            onClick={() => setShowDebugInfo((prev) => !prev)}
          >
            {showDebugInfo ? "Hide Debug Metrics (Dev-Mode)" : "Show Debug Metrics (Dev-Mode)"}
            <ChevronsUpDown className="ml-1 h-3.5 w-3.5" />
          </Button>
        </div>
        <CollapsibleContent className="pt-2">
          {!loading && !error && hasChartData ? (
            <MatrixControls
              showBaseline={false}
              calibrated={{
                label: "Calibrated",
                riskMean: comparisonCenterX,
                forecastMean: comparisonCenterY,
                riskWidth: comparisonBandWidthX,
                forecastWidth: comparisonBandWidthY,
                onRiskMeanChange: setComparisonCenterX,
                onForecastMeanChange: setComparisonCenterY,
                onRiskWidthChange: setComparisonBandWidthX,
                onForecastWidthChange: setComparisonBandWidthY,
              }}
              disabled={!hasChartData}
            />
          ) : (
            <p className="text-xs text-slate-500">
              {loading ? "Loading calibrated scores…" : error || "No calibrated values to display."}
            </p>
          )}
        </CollapsibleContent>
      </Collapsible>
    </div>
  );

  return (
    <DualColorLayout
      steps={AIM_WORKFLOW_STEPS}
      currentStep={3}
      variant="fixed"
      sidebarWidth="280px"
      leftClassName="items-start justify-center max-w-none"
      left={leftContent}
      right={rightContent}
    />
);
}

function ToggleRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div>
        <p className="text-sm font-semibold text-slate-900">{label}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}
