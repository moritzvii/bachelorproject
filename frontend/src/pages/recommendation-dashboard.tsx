import React from "react";
import { FileText, Flag, FileCheck } from "lucide-react";
import { BookPlus } from "lucide-react";
import DetailsOnDemandPDF from "@/features/aim-workflow/documents/details-on-demand-pdf";
import { HelpBanner } from "@/features/aim-workflow/banners/help-banner";
import { TerminalHeroPanel } from "@/features/aim-workflow/banners/workflow-banner";
import DualColorLayout from "@/layouts/dual-color-layout-60-40";
import { AIM_WORKFLOW_STEPS } from "@/lib/workflow-steps";
import {
  fetchAcceptedPairs,
  fetchMergedPairs,
  fetchPairStatuses,
  fetchSelectedStrategy,
  fetchStrategyDistribution,
} from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";

type QuadrantDistribution = {
  row: number;
  col: number;
  area: number;
  percentage: number;
  label: string;
  cell?: {
    id: string;
    title: string;
    description: string;
    icon: string;
    row: number;
    col: number;
    display_row?: number;
    display_col?: number;
    matrix_row?: number;
    matrix_col?: number;
  };
};

type SelectedSource = {
  id: number;
  name: string;
  info: string;
  percent: number;
  detailsSrc: string;
  page?: number;
  pdfName?: string;
  pdfPath?: string;
  type: "forecast" | "risk";
};

export default function RecommendationDashboardPage() {
  const [distribution, setDistribution] = React.useState<QuadrantDistribution[]>([]);
  const [sources, setSources] = React.useState<SelectedSource[]>([]);
  const [isStrategyLoading, setIsStrategyLoading] = React.useState(true);
  const [strategyError, setStrategyError] = React.useState<string | null>(null);
  const [strategy, setStrategy] = React.useState<{
    title?: string;
  paraphrased_strategy?: string;
  raw?: string;
  strategy_id?: string;
  segment?: string;
  region?: string;
  focus?: string;
  direction?: string;
} | null>(null);
  const [presetStrategy, setPresetStrategy] = React.useState<{
    title?: string;
    paraphrased_strategy?: string;
    segment?: string;
    region?: string;
    focus?: string;
    direction?: string;
  } | null>(null);

  type StrategyResponse = {
    strategy_name?: string;
    title?: string;
    strategy_info?: string;
    paraphrased_strategy?: string;
    strategy_id?: string;
    strategy_data?: {
      strategy_id?: string;
      raw?: string;
      segment?: string;
      region?: string;
      focus?: string;
      direction?: string;
    };
    raw?: string;
    segment?: string;
    region?: string;
    focus?: string;
    direction?: string;
  };

  React.useEffect(() => {
    const fetchData = async () => {
      try {
        
        try {
          setIsStrategyLoading(true);
          setStrategyError(null);
          const strategyData = (await fetchSelectedStrategy()) as StrategyResponse;
          setStrategy({
            strategy_id: strategyData?.strategy_id || strategyData?.strategy_data?.strategy_id,
            title: strategyData?.strategy_name || strategyData?.title || strategyData?.strategy_data?.raw || strategyData?.raw,
            paraphrased_strategy: strategyData?.strategy_info || strategyData?.paraphrased_strategy || undefined,
            raw: strategyData?.strategy_data?.raw || strategyData?.raw || undefined,
            segment: strategyData?.strategy_data?.segment || strategyData?.segment,
            region: strategyData?.strategy_data?.region || strategyData?.region,
            focus: strategyData?.strategy_data?.focus || strategyData?.focus,
            direction: strategyData?.strategy_data?.direction || strategyData?.direction,
          });

          
          const strategyId = strategyData?.strategy_id || strategyData?.strategy_data?.strategy_id;
          if (strategyId) {
            try {
              const res = await fetch("/presets/strategy-presets.json");
              if (res.ok) {
                const presets = (await res.json()) as Array<{
                  id?: string;
                  parseResult?: {
                    title?: string;
                    paraphrased_strategy?: string;
                    segment?: string;
                    region?: string;
                    focus?: string;
                    direction?: string;
                  };
                }>;
                const match = Array.isArray(presets)
                  ? presets.find((p) => p?.id === strategyId)
                  : null;
                if (match?.parseResult) {
                  setPresetStrategy({
                    title: match.parseResult.title,
                    paraphrased_strategy: match.parseResult.paraphrased_strategy,
                    segment: match.parseResult.segment,
                    region: match.parseResult.region,
                    focus: match.parseResult.focus,
                    direction: match.parseResult.direction,
                  });
                } else {
                  setPresetStrategy(null);
                }
              }
            } catch (err) {
              console.error("Failed to load preset strategy metadata:", err);
              setPresetStrategy(null);
            }
          } else {
            setPresetStrategy(null);
          }
        } catch (err) {
          setStrategy(null);
          setStrategyError(err instanceof Error ? err.message : "Failed to load strategic aim");
        } finally {
          setIsStrategyLoading(false);
        }

        
        const loadDistribution = async () => {
          try {
            const data = await fetchStrategyDistribution();
            const nextDistribution = Array.isArray((data as any)?.distribution)
              ? (data as any).distribution
              : Array.isArray(data)
                ? data
                : [];
            setDistribution(nextDistribution);
          } catch (err) {
            console.error("Failed to load strategy distribution:", err);
          }
        };
        await loadDistribution();

        
        const toSource = (pair: any, idx: number): SelectedSource => {
          const isRisk = pair.pair_type === "risk";
          const displayName = pair.risk_name || pair.hypothesis || pair.source || "Unknown";
          const pdfName = pair.pdf_name || "";
          const buildPdfPath = () => {
            if (!pdfName) return "";
            const file = pdfName.trim().replace(/^\/+/, "");
            if (isRisk) return `/pdfs/risks/${file}`;
            const lower = file.toLowerCase();
            if (lower.endsWith(".pdf") && file.includes("-")) {
              return `/pdfs/forecasts-statista/${file}`;
            }
            return `/pdfs/forecasts/${file}`;
          };
          return {
            id: parseInt(pair.pair_id) || idx,
            name: displayName,
            info: pair.premise_text || "",
            percent: Math.round((pair.combined_score ?? 0) * 100),
            detailsSrc: pair.source || "",
            pdfName,
            pdfPath: buildPdfPath(),
            page: pair.page,
            type: isRisk ? "risk" : "forecast",
          };
        };

        let acceptedPairs: any[] = [];
        try {
          const pairsData = await fetchAcceptedPairs();
          acceptedPairs = (pairsData as any)?.combined_pairs || [];
        } catch (err) {
          console.error("Failed to load accepted pairs:", err);
        }

        if (acceptedPairs.length === 0) {
          try {
            const [statuses, merged] = await Promise.all([fetchPairStatuses(), fetchMergedPairs()]);
            const statusMap = new Map<string, string>();
            (Array.isArray(statuses) ? statuses : []).forEach((s: any) => {
              if (s?.pair_id && s?.status) {
                statusMap.set(String(s.pair_id), String(s.status));
              }
            });
            acceptedPairs = ((merged as any)?.combined_pairs || []).filter(
              (pair: any) => statusMap.get(String(pair.pair_id)) === "accepted",
            );
          } catch (err) {
            console.error("Failed to reconcile accepted pairs:", err);
          }
        }

        setSources(acceptedPairs.map(toSource));
      } catch (error) {
        console.error("Failed to load data:", error);
      }
    };

    fetchData();
  }, []);

  const forecastSources = sources.filter((s) => s.type === "forecast");
  const riskSources = sources.filter((s) => s.type === "risk");
  const renderSourceSection = (label: string, items: typeof sources) => (
      <div className="space-y-2">
        <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[linear-gradient(115deg,_hsl(var(--chart-3)),_hsl(var(--chart-2)))]">
          <FileText className="h-4 w-4 text-white" />
        </div>
        <h3 className="text-sm font-bold text-slate-900">{label}</h3>
      </div>
      <div className="space-y-2">
        {items.map((source) => (
          <div
            key={source.id}
            className="rounded-lg bg-white p-3"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-900">
                    {source.name}
                  </span>
                </div>
                <p className="mt-1 line-clamp-2 text-xs text-slate-600">
                  {source.info}
                </p>
                {source.pdfPath ? (
                  <div className="mt-1 flex items-center gap-1">
                    <DetailsOnDemandPDF
                      src={source.pdfPath}
                      triggerLabel="Read Report"
                      buttonVariant="link"
                      showTriggerIcon={false}
                      pageShortcuts={source.page ? [{ page: source.page, label: `Page ${source.page}` }] : undefined}
                      className="self-start px-0 text-[11px] font-semibold text-[hsl(var(--chart-3))] underline underline-offset-2"
                    />
                    <BookPlus className="h-3.5 w-3.5 text-[hsl(var(--chart-3))]" aria-hidden="true" />
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const leftContent = (
    <div className="flex w-full max-w-4xl flex-col gap-6 px-2">
      <TerminalHeroPanel
        step="Step 5 — Recommendation Dashboard"
        title="Strategic Insights"
        description="This dashboard shows your **Strategic Plan**, the resulting **Recommendations**, and the full **Evidence Foundation** used to derive them. The relevant matrix fields are determined by the area covered by the plan’s evidence rectangle."
        icon={<FileCheck className="h-6 w-6" strokeWidth={1.75} />}
      />

      <div className="flex w-full flex-col gap-6">
        
        <div className="rounded-2xl bg-[linear-gradient(115deg,_hsl(var(--chart-3)),_hsl(var(--chart-2)))] p-5">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/15">
              <Flag className="h-5 w-5 text-white" />
            </div>
            <div className="flex flex-col leading-tight">
              {isStrategyLoading ? (
                <>
                  <Skeleton className="h-4 w-40 bg-white/30" />
                  <Skeleton className="mt-1 h-3 w-60 bg-white/25" />
                </>
              ) : strategyError ? (
                <p className="text-sm font-semibold text-white">
                  Failed to load strategic aim: {strategyError}
                </p>
              ) : (
                <>
                  <h3 className="text-base font-semibold text-white">
                    {presetStrategy?.title || strategy?.title || "Strategic Aim"}
                  </h3>
                  {presetStrategy?.paraphrased_strategy ? (
                    <p className="text-sm text-white/80">{presetStrategy.paraphrased_strategy}</p>
                  ) : strategy?.paraphrased_strategy ? (
                    <p className="text-sm text-white/80">{strategy.paraphrased_strategy}</p>
                  ) : strategy?.raw ? (
                    <p className="text-sm text-white/70">{strategy.raw}</p>
                  ) : null}
                </>
              )}
            </div>
            {!isStrategyLoading && !strategyError && (
              <div className="flex flex-wrap items-center gap-2 text-[11px]">
                {strategy?.segment ? (
                  <span className="rounded-full bg-[hsl(var(--chart-5))] px-2 py-1 text-black">
                    Segment: {presetStrategy?.segment || strategy.segment}
                  </span>
                ) : presetStrategy?.segment ? (
                  <span className="rounded-full bg-[hsl(var(--chart-5))] px-2 py-1 text-black">
                    Segment: {presetStrategy.segment}
                  </span>
                ) : null}
                {strategy?.region ? (
                  <span className="rounded-full bg-[hsl(var(--chart-5))] px-2 py-1 text-black">
                    Region: {presetStrategy?.region || strategy.region}
                  </span>
                ) : presetStrategy?.region ? (
                  <span className="rounded-full bg-[hsl(var(--chart-5))] px-2 py-1 text-black">
                    Region: {presetStrategy.region}
                  </span>
                ) : null}
              </div>
            )}
          </div>
        </div>

        
        {distribution.length > 0 && (
          <div className="space-y-3">
            <h3 className="mb-2 text-lg font-bold text-slate-900 text-center underline decoration-[hsl(var(--chart-3))] decoration-2">
              GE-McKinsey-Matrix Strategic Coverage
            </h3>
            {distribution.map((item, idx) => {
              const title = item.cell?.title ?? item.label;
              const description = item.cell?.description ?? "Strategy focus";
              return (
                <div
                  key={`${item.row}-${item.col}`}
                  className="group relative overflow-hidden rounded-lg border border-slate-200 bg-zinc-900 p-4 transition-all"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-[hsl(var(--chart-5))] to-[hsl(var(--chart-4))] text-base font-bold text-black">
                        {idx + 1}
                      </span>
                      <div>
                        <p className="text-sm font-bold text-white">{title}</p>
                        <p className="text-xs text-slate-200">{description}</p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className="text-2xl font-extrabold text-white">
                        {item.percentage.toFixed(1)}%
                      </span>
                      <div className="h-1.5 w-24 overflow-hidden rounded-full bg-white/20">
                        <div
                          className="h-full bg-gradient-to-r from-[hsl(var(--chart-5))] to-[hsl(var(--chart-4))] transition-all"
                          style={{ width: `${item.percentage}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );

  const rightContent = (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 px-2 text-foreground">
      <HelpBanner
        step=""
        title="Evidence Foundation"
        description=""
      />

      
      <div className="space-y-4">
        {[{ label: `Forecast Sources (${forecastSources.length})`, items: forecastSources },
          { label: `Risk Sources (${riskSources.length})`, items: riskSources }].map(
          ({ label, items }) => (items.length > 0 ? renderSourceSection(label, items) : null)
        )}

        
        {sources.length === 0 && (
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-8 text-center">
            <p className="text-sm text-slate-600">
              No sources selected. Please pin items in the Details on Demand step.
            </p>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <DualColorLayout
      steps={AIM_WORKFLOW_STEPS}
      currentStep={4}
      left={leftContent}
      right={rightContent}
      leftClassName="items-start justify-center"
      rightClassName="static h-auto min-h-full items-start justify-start pb-12"
    />
  );
}
