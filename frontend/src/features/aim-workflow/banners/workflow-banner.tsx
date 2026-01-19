import { type ReactNode} from "react";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { cn } from "@/lib/utils";
import { Brain, Info } from "lucide-react";

type TerminalHeroPanelProps = {
  step?: string;
  title?: string;
  description?: string;
  prompt?: string;
  icon?: ReactNode;
  className?: string;
  backgroundTone?: string;
};

type TerminalPanelFrameProps = {
  children: ReactNode;
  className?: string;
  backgroundTone?: string;
};

export function TerminalPanelFrame({
  children,
  className,
  backgroundTone = "--secondary",
}: TerminalPanelFrameProps) {
  return (
    <div
      className={cn(
        "relative w-full rounded-xl px-6 py-6 font-sans text-sm text-[hsl(var(--sidebar-foreground))]",
        className,
      )}
      style={{ backgroundColor: `hsl(var(${backgroundTone}))` }}
    >
      {children}
    </div>
  );
}

export function TerminalHeroPanel({
  step = "Step 3",
  title = "Human Factors",
  description = "Balance **Strategy-Fit**, **Risk**, and **Forecast** signals. Tune **human oversight** per cycle. Keep plans **auditable** and **repeatable**.",
  icon = <Brain className="h-6 w-6" strokeWidth={1.75} />,
  className,
  backgroundTone = "--secondary",
}: TerminalHeroPanelProps) {

  return (
    <TerminalPanelFrame className={className} backgroundTone={backgroundTone}>
      <div className="mb-4">
        <div className="mb-3 flex items-center gap-3 leading-none">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[hsl(var(--chart-3))] text-[hsl(var(--background))]">
            {icon}
          </div>
          <div>
            <div className="text-[10px] font-semibold uppercase leading-none tracking-widest text-[hsl(var(--sidebar-foreground))]">
              {step}
            </div>
            <div className="text-[27px] font-semibold leading-none text-[hsl(var(--sidebar-primary))]">{title}</div>
          </div>
        </div>
      </div>

      <div className="mb-1 max-w-3xl text-[13px] leading-relaxed text-[hsl(var(--foreground))]">
        <Colorized text={description} />
      </div>
    </TerminalPanelFrame>
  );
}

function Colorized({ text }: { text: string }) {
  const tokens = text.split("**");

  const keywordHints: Record<string, string> = {
    "Strategy-Fit": "Strategic alignment with company strategies",
    "one measurable outcome": "The single clear result this aim should deliver, phrased so success is unambiguous.",
    scope: "The boundaries of the work: what is included, what is excluded, and who is involved.",
    segment: "The customer or user slice this aim targets (e.g., SMB, enterprise, role).",
    region: "The geography where this aim applies (e.g., EMEA, NAMER, APAC).",
    "knowledge base": "Evidence and sources backing the recommendation and risk calls.",
    "pinned evidence": "Sources you explicitly keep so calibration and dashboards stay grounded.",
    contradictions: "Signals that conflict with the plan and should be removed or quarantined.",
    citations: "Reference details to back each kept source for auditability.",
    "strategy plan": "The prioritized path you are aiming to execute and defend.",
    "human oversight": "The review and control level you apply before decisions move forward.",
    "audit trail": "The record of your adjustments and kept evidence for later review.",
    "GE-McKinsey matrix": "The 2x2 view of market **attractiveness** vs. **competitive strength**.",
    "AI baseline": "The model-generated recommendation before human calibration.",
    "calibrated scenario": "The adjusted recommendation after human judgment updates.",
    "forecast intervals": "Ranges that express uncertainty in the forecast dimension.",
    "risk intervals": "Ranges that express uncertainty in the risk dimension.",
    "original aim": "The initial strategy you captured in Specify Aim.",
  "recommendation strategy": "The prioritized plan derived from the GE-McKinsey assessment.",
  "Strategic Plan": "Your strategic intention (e.g., expand Asia-Pacific revenue) used as the reference point for all later evaluations.",
  Segments: "Business areas such as iPhone, iPad, Mac, Wearables, Services, or Accessories.",
  Region: "Geographic markets such as Americas, Europe, Greater China, Japan, or Rest of Asia Pacific.",
  "predefined plan": "A ready-made option you can select without writing a plan yourself.",
  Knowledgebase: "Your curated set of evidence items that will be used to evaluate your Strategic Plan.",
  "Potential Hits": "Items retrieved because they semantically match your Strategic Plan based on vector similarity and NLI scoring.",
  Forecast: "A forward-looking statement indicating expected market, demand, or segment developments.",
  Risk: "A statement describing potential threats or vulnerabilities that could negatively impact your plan.",
  "NLI score": "A score indicating how strongly an item supports (entailment) or contradicts (contradiction) your Strategic Plan.",
  "Forecast Alignment": "How strongly the forecast evidence supports this strategy in your view.",
  "Risk Alignment": "How strongly the risk evidence threatens this strategy in your view.",
  "Forecast Confidence": "How complete and reliable the forecast evidence set feels to you.",
  "Risk Confidence": "How complete and reliable the risk evidence set feels to you.",
  "Forecast Stability": "Forecast Stability reflects how consistently the selected forecast evidence points in a similar direction for this strategy.",
  "Risk Stability": "Risk Stability reflects how consistently the selected risk evidence points to a similar threat level for this strategy.",
  Stability: "Stability describes how well the selected pieces of evidence fit together overall. The more they point in a similar direction, the higher the stability.",
  Alignment: "Alignment is a semantic evidence-strength score: how strongly the selected statements support or threaten the strategy. It is a normalized NLI-based index, not a probability.",
  Coverage: "How much you believe the system over- or underestimates how completely this evidence reflects the real world, given that it only sees a closed evidence corpus - this slider is your way to correct for important information that may exist outside it (e.g., recent reports, internal insights, or risks the system has not ingested).",
  "Forecast Alignment (matrix)": "Mean support score across all included forecast evidence.",
  "Risk Alignment (matrix)": "Mean contradiction score across all included risk evidence.",
  "Forecast Coverage": "How well the selected forecast evidence covers the relevant market outlook for this strategy in your view.",
  "Risk Coverage": "How well the selected risk evidence covers the relevant threats to this strategy in your view.",
  Uncertainty: "How wide the evidence scores vary; larger intervals indicate lower confidence.",
  direction: "The plotted point in the matrix defined by the mean Risk and Forecast scores.",
  "Position": "The placement in the matrix derived from forecast and risk alignment and their uncertainty.",
  "Evidence Base": "All included evidence items that support or contradict the strategic plan.",
  "Recommendations": "Strategy suggestions inferred from the matrix fields associated with the plan’s evidence-based position.",
  "Evidence Foundation": "All included evidence items supportive or contradictory that informed the position and shaped the recommendations.",
  };
  const primaryKeywords = new Set([
    "Strategy-Fit",
    "Risk",
    "Forecast",
    "one measurable outcome",
    "scope",
    "segment",
    "region",
    "knowledge base",
    "pinned evidence",
    "contradictions",
    "citations",
    "strategy plan",
    "human oversight",
    "audit trail",
    "GE-McKinsey matrix",
    "AI baseline",
    "calibrated scenario",
    "forecast intervals",
    "risk intervals",
    "original aim",
    "recommendation strategy",
    "Strategic Plan",
    "Segments",
    "Region",
    "predefined plan",
    "Knowledgebase",
    "Potential Hits",
    "NLI score",
    "Forecast Alignment",
    "Risk Alignment",
    "Forecast Confidence",
    "Risk Confidence",
    "Forecast Stability",
    "Risk Stability",
    "Stability",
    "Alignment",
    "Confidence",
    "Forecast Alignment (matrix)",
    "Risk Alignment (matrix)",
    "Uncertainty",
    "direction",
    "Position",
    "Evidence Base",
    "Recommendations",
    "Evidence Foundation",
  ]);

  return (
    <>
      {tokens.map((t, idx) => {
        if (idx % 2 === 1) {
          const color = primaryKeywords.has(t) ? "hsl(var(--chart-3))" : "hsl(var(--chart-2))";
          return (
            <HoverCard key={idx}>
              <HoverCardTrigger asChild>
                <span
                  className={cn(
                    "group inline-flex cursor-text items-center gap-1 rounded-sm px-1 py-0.5 font-semibold underline decoration-dotted transition-colors hover:bg-[hsl(var(--sidebar-accent))]",
                  )}
                  style={{ color }}
                >
                  {t}
                  <Info className="h-3 w-3 opacity-70 transition-opacity duration-200 group-hover:opacity-100" aria-hidden />
                </span>
              </HoverCardTrigger>
              <HoverCardContent
                className="w-64 text-xs bg-[hsl(var(--sidebar-background))] border border-[hsl(var(--sidebar-border))]"
                style={{ color }}
              >
                <div className="text-sm font-semibold">{t}</div>
                <p className="mt-1 text-[hsl(var(--foreground))]">
                  {keywordHints[t] || "No description available."}
                </p>
              </HoverCardContent>
            </HoverCard>
          );
        }
        return <span key={idx}>{t}</span>;
      })}
    </>
  );
}
