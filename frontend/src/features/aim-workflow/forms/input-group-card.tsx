"use client";

import { useEffect, useMemo, useState } from "react";
import { BadgeCheck, BadgeX, UserIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
} from "@/components/ui/input-group";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ContinueButton } from "@/features/aim-workflow/buttons/continue-button";
import { useNavigate } from "react-router-dom";
import { createStrategy, selectStrategy } from "@/lib/api";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type StrategyParseResult = {
  valid: boolean;
  raw: string;
  timestamp: string;
  title?: string | null;
  paraphrased_strategy?: string | null;
  segment?: string | null;
  region?: string | null;
  focus?: string | null;
  direction?: string | null;
  error?: string | null;
  pipeline_triggered: boolean;
  pipeline_error?: string | null;
};

type PresetStrategy = {
  id: string;
  label: string;
  strategy: string;
  parseResult: Omit<StrategyParseResult, "raw" | "timestamp">;
};

export function InputGroupCard({ className }: { className?: string }) {
  const navigate = useNavigate();
  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedText, setSubmittedText] = useState<string | null>(null);
  const [isAccepted, setIsAccepted] = useState(false);
  const [parseResult, setParseResult] = useState<StrategyParseResult | null>(null);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [selectedPresetId, setSelectedPresetId] = useState<string | null>(null);
  const [presets, setPresets] = useState<PresetStrategy[]>([]);
  const maxLength = 240;
  const formattedTimestamp = useMemo(() => {
    if (!parseResult?.timestamp) return null;
    try {
      return new Date(parseResult.timestamp).toLocaleString();
    } catch {
      return parseResult.timestamp;
    }
  }, [parseResult?.timestamp]);

  const handleSubmit = async () => {
    if (!comment.trim()) {
      return;
    }
    const pending = comment.trim();
    
    setSelectedPresetId(null);
    setIsSubmitting(true);
    setSubmissionError(null);
    setSubmittedText(null);
    setParseResult(null);
    setIsAccepted(false);
    setComment("");

    const minimumDelay = 2000;
    const startTime = Date.now();

    try {
      const payload = await createStrategy(pending);
      setSubmittedText(pending);
      setParseResult(payload as StrategyParseResult);
    } catch (error) {
      setSubmittedText(pending);
      setSubmissionError(
        error instanceof Error ? error.message : "Strategy submission failed.",
      );
    } finally {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, minimumDelay - elapsed);
      window.setTimeout(() => setIsSubmitting(false), remaining);
    }
  };

  const handleReset = () => {
    setSubmittedText(null);
    setComment("");
    setIsAccepted(false);
    setParseResult(null);
    setSubmissionError(null);
    setSelectedPresetId(null);
  };

  const handleAccept = () => {
    if (!parseResult?.valid) {
      setSubmissionError("Only valid strategies can be accepted.");
      return;
    }
    setSubmissionError(null);

    const persistSelectedStrategy = async (result: StrategyParseResult) => {
      try {
        await selectStrategy({
          strategy_id: selectedPresetId ?? "custom",
          strategy_name: result.title ?? result.raw ?? "Strategy",
          strategy_info: result.paraphrased_strategy ?? result.raw ?? "",
          strategy_data: result,
        });
      } catch (err) {
        console.error("Failed to persist selected strategy:", err);
      }
    };

    
    if (selectedPresetId) {
      if (!submittedText) {
        setSubmissionError("No strategy text to submit.");
        return;
      }
      setIsSubmitting(true);
      setIsAccepted(false);
      const minimumDelay = 2000;
      const startTime = Date.now();

      const run = async () => {
        try {
          const payload = await createStrategy(submittedText);
          const parsed = payload as StrategyParseResult;
          setParseResult((prev) =>
            prev
              ? {
                  ...prev,
                  
                  timestamp: parsed.timestamp ?? prev.timestamp,
                  pipeline_triggered: parsed.pipeline_triggered,
                  pipeline_error: parsed.pipeline_error,
                  valid: parsed.valid,
                  error: parsed.error,
                  segment: parsed.segment ?? prev.segment,
                  region: parsed.region ?? prev.region,
                  focus: parsed.focus ?? prev.focus,
                  direction: parsed.direction ?? prev.direction,
                }
              : parsed,
          );
          await persistSelectedStrategy(parsed);
        } catch (error) {
          setSubmissionError(
            error instanceof Error ? error.message : "Strategy submission failed.",
          );
        } finally {
          const elapsed = Date.now() - startTime;
          const remaining = Math.max(0, minimumDelay - elapsed);
          window.setTimeout(() => {
            setIsSubmitting(false);
            setIsAccepted(true);
          }, remaining);
        }
      };

      run();
      return;
    }

    
    persistSelectedStrategy(parseResult);
    setIsAccepted(true);
  };

  const handlePresetSelect = (value: string) => {
    const preset = presets.find((item) => item.id === value);
    if (!preset) {
      setSelectedPresetId(null);
      setParseResult(null);
      setSubmittedText(null);
      setIsAccepted(false);
      setSubmissionError(null);
      return;
    }
    const now = new Date().toISOString();
    setSelectedPresetId(preset.id);
    setSubmissionError(null);
    setIsSubmitting(false);
    setComment("");
    setSubmittedText(preset.strategy);
    setParseResult({
      ...preset.parseResult,
      raw: preset.strategy,
      timestamp: now,
    });
    setIsAccepted(false);
  };

  useEffect(() => {
    const loadPresets = async () => {
      try {
        const res = await fetch("/presets/strategy-presets.json");
        if (!res.ok) {
          throw new Error(`Failed to load strategy-presets.json (${res.status})`);
        }
        const payload = (await res.json()) as PresetStrategy[];
        const filtered = Array.isArray(payload)
          ? payload.filter((item): item is PresetStrategy => Boolean(item?.id && item?.strategy))
          : [];
        setPresets(filtered);
      } catch (err) {
        console.error("Failed to load presets", err);
        setPresets([]);
      }
    };
    loadPresets();
  }, []);

  return (
      <div className={cn("w-full space-y-4", className)}>
      <div
        className={cn(
          "rounded-2xl border border-transparent p-[3px]",
          isAccepted && "bg-gradient-to-r from-[hsl(var(--chart-3))] via-[hsl(var(--chart-3))] to-[hsl(var(--chart-3))]"
        )}
      >
        <InputGroup
          className={cn(
            "relative w-full flex-col rounded-xl border px-0 text-white shadow-inner !bg-zinc-900 dark:!bg-zinc-900",
            isAccepted ? "border-[hsl(var(--chart-3))]" : "border-white/15",
          )}
          style={{ minHeight: "172px" }}
        >
      <InputGroupAddon
        align="block-start"
        className="w-full border-b border-white/10 px-6 text-white/70"
      >
        {isSubmitting ? (
          <div className="flex w-full items-center justify-between">
            <Skeleton className="h-4 w-24 bg-white/20" />
            <Skeleton className="h-4 w-16 bg-white/20" />
          </div>
        ) : (
          <div className="flex w-full items-center justify-between">
            <Label className="text-white" htmlFor="strategy-input">
              Strategy
            </Label>
            <span className="text-xs text-white/70">
              {(submittedText ?? comment).length}/{maxLength}
            </span>
          </div>
        )}
      </InputGroupAddon>

      <div className="w-full px-6 py-4 space-y-5">
        <div className="relative w-full min-h-[120px]">
          <div className={cn("flex w-full flex-col items-center gap-3 text-center", isSubmitting && "opacity-0")}>
            <div className="text-white/60">
              <UserIcon className="h-6 w-6" aria-hidden />
              <span className="sr-only">User</span>
            </div>
            <div className="w-full">
              {!isSubmitting && parseResult?.valid ? (
                <div className="text-center text-white">
                  {parseResult.title ? (
                    <p className="text-base font-semibold text-white">{parseResult.title}</p>
                  ) : null}
                  {parseResult.paraphrased_strategy ? (
                    <p className="mt-1 text-sm text-white/80">{parseResult.paraphrased_strategy}</p>
                  ) : null}
                </div>
              ) : submittedText && !isSubmitting ? (
                <div className={cn("text-lg", parseResult && !parseResult.valid ? "text-destructive" : "text-[hsl(var(--chart-4))]")}>
                  {submittedText}
                </div>
            ) : (
              <Input
              id="strategy-input"
              className="h-auto border-none bg-transparent px-0 py-0 text-center text-lg text-white placeholder:text-white/40 shadow-none caret-[hsl(var(--chart-4))] focus-visible:ring-0"
                placeholder="Enter your Strategic Plan"
                value={comment}
                onChange={(event) => setComment(event.target.value.slice(0, maxLength))}
              />
            )}
        </div>
          {parseResult ? (
            <StrategyMetadataPills result={parseResult} timestamp={formattedTimestamp} />
          ) : null}
        </div>
          {isSubmitting && (
            <div className="absolute inset-0 flex w-full flex-col items-center gap-3 !bg-zinc-900 dark:!bg-zinc-900 px-0 py-4">
              <Skeleton className="h-6 w-6 rounded-full bg-white/10" />
              <Skeleton className="h-5 w-full bg-white/15" />
            </div>
          )}
        </div>

        {isSubmitting ? (
          <div className="space-y-3">
            <Skeleton className="h-3 w-20 bg-white/15" />
            <Skeleton className="h-20 w-full rounded-xl bg-white/15" />
            <Skeleton className="h-12 w-full rounded-xl bg-white/15" />
          </div>
        ) : (
          <>
            <div className="relative flex items-center gap-3">
              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/30 to-transparent" />
              <span className="text-xs uppercase tracking-[0.18em] text-white/60">OR</span>
              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/30 to-transparent" />
            </div>

            <div className="relative rounded-[12px] border border-white/20 bg-white/5 p-4">
              <div className="absolute right-4 top-4 rounded-full border border-[hsl(var(--chart-3))] bg-[hsl(var(--chart-3))] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[hsl(var(--background))]">
                Recommended
              </div>
              <div className="space-y-2">
                <div className="text-sm font-semibold text-white">Use a Predefined Strategy</div>
                <p className="text-xs text-white/70">
                  Pick a validated strategy and continue without typing a custom strategy.
                </p>
              </div>
              <div className="mt-3">
                <Select
                  value={selectedPresetId ?? ""}
                  onValueChange={handlePresetSelect}
                >
                  <SelectTrigger className="w-full border-white/30 bg-white/10 text-white">
            <SelectValue placeholder="Select from history" />
          </SelectTrigger>
          <SelectContent className="border-white/10 bg-zinc-900 text-white">
            <SelectGroup>
              <SelectLabel className="text-white/70">History</SelectLabel>
              {presets.map((preset) => (
                <SelectItem key={preset.id} value={preset.id}>
                  {preset.label}
                </SelectItem>
              ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </>
        )}
      </div>

        <InputGroupAddon align="block-end" className="w-full justify-end px-6 pt-0">
          {!isSubmitting && (
            submittedText ? (
              <div className="ml-auto flex items-center gap-3">
                <InputGroupButton
                  className="gap-2"
                  size="sm"
                  variant="secondary"
                  onClick={handleReset}
                >
                  <BadgeX className="size-4" />
                  Rewrite
                </InputGroupButton>
              <InputGroupButton
                className="gap-2 border-[hsl(var(--chart-3))] text-[hsl(var(--background))]"
                size="sm"
                variant="default"
                style={{ backgroundColor: "hsl(var(--chart-3))" }}
                onClick={handleAccept}
                disabled={!parseResult?.valid}
              >
                <BadgeCheck className="size-4" />
                Accept
              </InputGroupButton>
              </div>
            ) : (
              <InputGroupButton
                className="ml-auto"
                size="sm"
                variant="default"
                onClick={handleSubmit}
                disabled={!comment.trim()}
              >
                Enter Strategic Plan
              </InputGroupButton>
            )
          )}
        </InputGroupAddon>
        </InputGroup>
      </div>

      {submissionError ? (
        <div className="rounded-xl border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {submissionError}
        </div>
      ) : null}

      {isAccepted ? (
        <div className="flex justify-end">
          <ContinueButton
            disabled={false}
            onClick={() =>
              navigate("/loading/1", {
                state: { presetSelected: Boolean(selectedPresetId) },
              })
            }
          />
        </div>
      ) : null}

    </div>
  );
}

function StrategyMetadataPills({
  result,
  timestamp,
}: {
  result: StrategyParseResult;
  timestamp: string | null;
}) {
  return (
    <div className="flex flex-wrap justify-center gap-2 text-xs">
      {timestamp ? (
        <span className="rounded-full border border-white/20 px-3 py-1 text-white/70">
          {timestamp}
        </span>
      ) : null}
      {[
        { label: "Segment", value: result.segment },
        { label: "Region", value: result.region },
        { label: "Focus", value: result.focus },
        { label: "Direction", value: result.direction },
      ]
        .filter((item) => Boolean(item.value))
        .slice(0, 2)
        .map((item) => (
          <span
            key={item.label}
            className="rounded-full border border-white/30 bg-white/10 px-3 py-1 text-white"
          >
            {item.value}
          </span>
        ))}
      {!result.valid && result.error ? (
        <span className="rounded-full border border-destructive/50 bg-destructive/10 px-3 py-1 text-destructive">
          {result.error}
        </span>
      ) : null}
    </div>
  );
}
