import { useState, useEffect, type ReactNode } from "react";
import DualColorLayout from "@/layouts/dual-color-layout-60-40";
import { AIM_WORKFLOW_STEPS } from "@/lib/workflow-steps";
import { TerminalHeroPanel } from "@/features/aim-workflow/banners/workflow-banner";
import { ContinueButton } from "@/features/aim-workflow/buttons/continue-button";
import { PinList2 } from "@/features/aim-workflow/selection/pin-list";
import AlertSummary from "@/components/ui/shadcn-studio/alert-02";
import { LineChart, ShieldAlert } from "lucide-react";
import { Database } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { HelpBanner } from "@/features/aim-workflow/banners/help-banner";
import { fetchMergedPairs, recomputeScores } from "@/lib/api";

const PIN_LIST_IDS = ["alpha", "beta"] as const;

type PremisePair = {
  pair_id: string;
  pair_type: string;
  pair_source?: string;
  hypothesis: string;
  strategy_title: string;
  strategy_segment: string;
  strategy_region: string;
  strategy_focus: string;
  strategy_direction: string;
  premise_id: string;
  premise_text: string;
  premise_type: string;
  segment: string;
  region: string;
  source: string;
  verdict: string;
  combined_score?: number;
  entailment: number;
  contradiction: number;
  neutral: number;
  status?: string;
  pairs?: PremisePair[]; 
  pdf_name?: string;
  page?: number;
  year?: number;
  risk_name?: string;
  risk_type?: string;
  quote?: string;
  risk_text_quote?: string;
  text?: string;
};

type PinListItem = {
  id: number;
  pair_id: string;
  name: string;
  info: string;
  percent: number;
  entailment: number;
  contradiction: number;
  combinedScore?: number;
  detailsSrc: string;
  page?: number;
  pinned: boolean;
  below?: boolean;
};



const PIN_LIST_STYLES: Record<
  typeof PIN_LIST_IDS[number],
  { title: string; wrapperClass: string; icon: ReactNode; accentColor: string }
> = {
  alpha: {
    title: "Potential Forecast Hits",
    wrapperClass:
      "rounded-2xl shadow-xl border-0 bg-zinc-900 text-white px-5 pt-6 pb-5",
    icon: <LineChart className="h-4 w-4 text-chart-3" strokeWidth={1.5} />,
    accentColor: "bg-[hsl(var(--chart-1))]",
  },
  beta: {
    title: "Potential Risk Threats",
    wrapperClass:
      "rounded-2xl shadow-xl border-0 bg-zinc-900 text-white px-5 pt-6 pb-5",
    icon: <ShieldAlert className="h-4 w-4 text-rose-300" strokeWidth={1.5} />,
    accentColor: "bg-[hsl(var(--chart-2))]",
  },
};

const extractPairs = (data: any): PremisePair[] => {
  if (!data) return [];
  if (Array.isArray(data.combined_pairs)) return data.combined_pairs;
  if (Array.isArray(data.results)) return data.results;
  if (Array.isArray(data.pairs)) return data.pairs;
  return [];
};

const toNumber = (value: unknown, fallback = 0): number => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

const toClampedPercent = (value: number): number =>
  Math.min(99, Math.max(0, Math.round(value * 100)));

const buildPdfPath = (pair: PremisePair): string => {
  const fileName = (pair.pdf_name || pair.source || "").trim().replace(/^\/+/, "");
  if (!fileName) return "";
  const label = (pair.pair_type || pair.pair_source || "").toLowerCase();

  if (label === "risk") {
    return `/pdfs/risks/${fileName}`;
  }

  const isStatista = fileName.toLowerCase().endsWith(".pdf") && fileName.includes("-");
  if (isStatista) {
    return `/pdfs/forecasts-statista/${fileName}`;
  }
  return fileName ? `/pdfs/forecasts/${fileName}` : "";
};

const passthrough = (pairs: PremisePair[]): PremisePair[] => pairs;

const selectInfoText = (pair: PremisePair): string => {
  return (
    pair.quote ||
    pair.risk_text_quote ||
    pair.text ||
    pair.premise_text ||
    ""
  );
};

const transformPairToItem = (pair: PremisePair, index: number): PinListItem => {
    const source = pair.source || "";
    const pageMatch = source.match(/page[:\s]*(\d+)/i);
    const page = pageMatch ? parseInt(pageMatch[1], 10) : pair.page || 1;

    const isRisk = (pair.pair_type || pair.pair_source) === "risk";
    const strategyTitle = !isRisk ? (pair.strategy_title || "").trim() : "";
    const defaultName =
      (pair.segment && pair.strategy_focus && pair.region)
        ? `${pair.segment} ${pair.strategy_focus} in ${pair.region}`
        : undefined;
    const name =
      (isRisk ? pair.risk_name : strategyTitle) ||
      (isRisk ? "Risk Evidence" : undefined) ||
      defaultName ||
      "Forecast Evidence";

  const status = pair.status || "pending";
  const pinned = status === "accepted";
  const below = status === "declined";

    return {
      id: index,
      pair_id: pair.pair_id,
      name,
      info: selectInfoText(pair),
      percent: toClampedPercent(toNumber(pair.combined_score)),
      entailment: toClampedPercent(toNumber(pair.entailment)),
      contradiction: toClampedPercent(toNumber(pair.contradiction)),
      combinedScore: toClampedPercent(toNumber(pair.combined_score)),
      detailsSrc: buildPdfPath(pair),
      page,
      pinned,
      below,
    };
};

export default function EvidenceSelectionPage() {
  const navigate = useNavigate();
  const [listEmptyState, setListEmptyState] = useState<Record<typeof PIN_LIST_IDS[number], boolean>>({
    alpha: false,
    beta: false,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [forecastItems, setForecastItems] = useState<PinListItem[]>([]);
  const [riskItems, setRiskItems] = useState<PinListItem[]>([]);
  const [isRecomputing, setIsRecomputing] = useState(false);

  useEffect(() => {
    const fetchPairs = async () => {
      try {
        const data = await fetchMergedPairs();
        const pairs: PremisePair[] = passthrough(extractPairs(data));

        const forecasts = pairs
          .filter((p) => (p.pair_type || p.pair_source) === "forecast")
          .map((p, idx) => transformPairToItem(p, idx));

        const risks = pairs
          .filter((p) => (p.pair_type || p.pair_source) === "risk")
          .map((p, idx) => transformPairToItem(p, idx + forecasts.length));

        setForecastItems(forecasts);
        setRiskItems(risks);
        setIsLoading(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load data");
        setIsLoading(false);
      }
    };

    fetchPairs();
  }, []);

  const handleListEmptyChange = (listId: typeof PIN_LIST_IDS[number], isEmpty: boolean) => {
    setListEmptyState((prev) => (prev[listId] === isEmpty ? prev : { ...prev, [listId]: isEmpty }));
  };

  const canContinue = PIN_LIST_IDS.every((id) => listEmptyState[id]);
  const continueDisabled = !canContinue || isRecomputing;
  const totalMatchCount = forecastItems.length + riskItems.length;

  const handleContinue = () => {
    if (isRecomputing) {
      return;
    }

    const recomputeAndContinue = async () => {
      try {
        setIsRecomputing(true);
        setError(null);

        await recomputeScores();

        navigate("/reasoning");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to recompute scoring summary");
      } finally {
        setIsRecomputing(false);
      }
    };

    void recomputeAndContinue();
  };

  if (isLoading) {
    return (
      <DualColorLayout
        steps={AIM_WORKFLOW_STEPS}
        currentStep={0}
        left={
          <div className="flex w-full flex-col items-center justify-center gap-4 px-2 py-8">
            <p className="text-lg font-medium">Loading merged pairs...</p>
          </div>
        }
        right={null}
      />
    );
  }

  if (error) {
    return (
      <DualColorLayout
        steps={AIM_WORKFLOW_STEPS}
        currentStep={0}
        left={
          <div className="flex w-full flex-col items-center justify-center gap-4 px-2 py-8">
            <div className="max-w-lg rounded-xl border border-destructive bg-destructive/10 px-6 py-4">
              <p className="text-center text-lg font-semibold text-destructive">Error</p>
              <p className="mt-2 text-center text-sm text-destructive/80">{error}</p>
            </div>
          </div>
        }
        right={null}
      />
    );
  }

  const leftContent = (
    <div className="flex w-full flex-col gap-6">
      <TerminalHeroPanel
        step="Step 2 — Evidence Selection"
        title="Build Your Knowledgebase"
        description="Review all **Potential Hits** that match your **Strategic Plan**. Add relevant **Forecast** or **Risk** items to your **Knowledgebase** or exclude those that do not apply."
        icon={<Database className="h-6 w-6" strokeWidth={1.75} />}
      />

      <div className="flex justify-center">
        <AlertSummary
          title={`${totalMatchCount} Identified Matches to your Strategic Plan`}
          titleBadgeClassName="text-[hsl(var(--chart-3))]"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
          
          <div className={PIN_LIST_STYLES.alpha.wrapperClass}>
            <div className="flex items-center justify-between pb-2 mb-5">
              <div className="flex items-center gap-3">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-sm bg-zinc-800">
                  {PIN_LIST_STYLES.alpha.icon}
                </span>
                <h3 className="text-lg font-semibold text-zinc-400">
                  {PIN_LIST_STYLES.alpha.title}
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold text-white">{forecastItems.length}</span>
              </div>
            </div>
            <div className="border-b border-zinc-700 mb-5" />
            {forecastItems.length > 0 ? (
              <PinList2
                items={forecastItems}
                className="w-full bg-transparent"
                instanceId="pinlist-alpha"
                labels={{
                  pinned: "Include to Knowledgebase",
                  unpinned: "All Potential Hits",
                  below: "Exclude from Knowledgebase",
                }}
                onAllItemsEmptyChange={(isEmpty) => handleListEmptyChange("alpha", isEmpty)}
                pinnedSectionClassName="border-0 shadow-none bg-[#22c55e]"
                unpinnedSectionClassName="border-0 bg-transparent shadow-none"
                belowSectionClassName="border-0 shadow-none bg-[#ef4444]"
                pinnedHeaderClassName="text-white"
                unpinnedHeaderClassName="text-white"
                belowHeaderClassName="text-white"
                sourceType="forecast"
              />
            ) : (
              <p className="text-center text-zinc-400 text-sm">No forecast pairs found</p>
            )}
          </div>

          
          <div className={PIN_LIST_STYLES.beta.wrapperClass}>
            <div className="flex items-center justify-between pb-2 mb-5">
              <div className="flex items-center gap-3">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-sm bg-zinc-800">
                  {PIN_LIST_STYLES.beta.icon}
                </span>
                <h3 className="text-lg font-semibold text-zinc-400">
                  {PIN_LIST_STYLES.beta.title}
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold text-white">{riskItems.length}</span>
              </div>
            </div>
            <div className="border-b border-zinc-700 mb-5" />
            {riskItems.length > 0 ? (
              <PinList2
                items={riskItems}
                className="w-full bg-transparent"
                instanceId="pinlist-beta"
                labels={{
                  pinned: "Include to Knowledgebase",
                  unpinned: "All Potential Hits",
                  below: "Exclude from Knowledgebase",
                }}
                onAllItemsEmptyChange={(isEmpty) => handleListEmptyChange("beta", isEmpty)}
                pinnedSectionClassName="border-0 shadow-none bg-[#22c55e]"
                unpinnedSectionClassName="border-0 bg-transparent shadow-none"
                belowSectionClassName="border-0 shadow-none bg-[#ef4444]"
                pinnedHeaderClassName="text-white"
                unpinnedHeaderClassName="text-white"
                belowHeaderClassName="text-white"
                sourceType="risk"
              />
            ) : (
              <p className="text-center text-zinc-400 text-sm">No risk pairs found</p>
            )}
          </div>
        </div>

      <div className="flex justify-end">
        <ContinueButton
          onClick={handleContinue}
          disabled={continueDisabled}
          disabledMessage={isRecomputing ? "Recomputing scores..." : "Clear every remaining item from All Items to proceed."}
        />
      </div>
    </div>
  );

  const rightContent = (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-2 text-foreground">
      <HelpBanner
        step=""
        title="Understand the Evidence Scores"
        description="The Score shows how strongly an item semantically aligns with your Strategic Plan. It is not a prediction or probability, only a measure of textual alignment."
      />

      <div className="space-y-6">
        
        <div className="rounded-xl p-6">
          <h3 className="mb-4 text-base font-bold text-zinc-900">
            Entailment Score (0–100%)
          </h3>
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <span className="inline-flex rounded-full border border-zinc-800 bg-black px-3 py-1 text-xs font-bold text-[#22c55e]">
                100%
              </span>
              <span className="text-sm text-zinc-900/70">Strong Entailment to your Strategic Plan</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="inline-flex rounded-full border border-zinc-800 bg-black px-3 py-1 text-xs font-bold" style={{ color: "#77b987" }}>
                50%
              </span>
              <span className="text-sm text-zinc-900/70">Moderate Entailment to your Strategic Plan</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="inline-flex rounded-full border border-zinc-800 bg-black px-3 py-1 text-xs font-bold text-[#d1d5db]">
                0%
              </span>
              <span className="text-sm text-zinc-900/70">Low Entailment to your Strategic Plan</span>
            </div>
          </div>
        </div>

        
        <div className="rounded-xl  p-6">
          <h3 className="mb-4 text-base font-bold text-zinc-900">
            Contradiction Score (0–100%)
          </h3>
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <span className="inline-flex rounded-full border border-zinc-800 bg-black px-3 py-1 text-xs font-bold text-[#ef4444]">
                100%
              </span>
              <span className="text-sm text-zinc-900/70">Strong Contradiction to your Strategic Plan</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="inline-flex rounded-full border border-zinc-800 bg-black px-3 py-1 text-xs font-bold" style={{ color: "#f08c8c" }}>
                50%
              </span>
              <span className="text-sm text-zinc-900/70">Moderate Contradiction to your Strategic Plan</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="inline-flex rounded-full border border-zinc-800 bg-black px-3 py-1 text-xs font-bold text-[#d1d5db]">
                0%
              </span>
              <span className="text-sm text-zinc-900/70">Low Contradiction to your Strategic Plan</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <DualColorLayout
      steps={AIM_WORKFLOW_STEPS}
      currentStep={1}
      left={leftContent}
      right={rightContent}
      leftClassName="items-start justify-start"
      rightClassName="items-start justify-center"
    />
  );
}
