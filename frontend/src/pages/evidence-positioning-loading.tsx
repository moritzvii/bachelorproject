"use client";

import React, { useEffect, useState, useRef, forwardRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import WorkflowLayout from "@/layouts/workflow-layout";
import { Spinner } from "@/components/ui/spinner";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { AnimatedBeam } from "@/components/ui/shadcn-io/animated-beam-og/animated-beam-og";
import { AIM_WORKFLOW_STEPS } from "@/lib/workflow-steps";
import { Bot, Brain } from "lucide-react";
import { recomputeScores } from "@/lib/api";
const LOADER_MESSAGES = [
  "Blending human alignment with AI scores",
  "Stabilizing uncertainty intervals",
  "Reconciling forecast and risk evidence",
  "Allocating confidence bands",
  "Building the GE strategy matrix",
  "Publishing calibrated strategy profile",
];

export default function EvidencePositioningLoadingPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const presetSelected = Boolean(
    (location.state as { presetSelected?: boolean } | null)?.presetSelected,
  );
  const MIN_LOADER_MS = presetSelected ? 3000 : 3000;
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [currentStage, setCurrentStage] = useState<string>(
    "Blending human alignment with AI scores",
  );
  const [progress, setProgress] = useState<number>(0);
  const [displayProgress, setDisplayProgress] = useState<number>(0);
  const [estimatedSecondsRemaining, setEstimatedSecondsRemaining] = useState<number>(0);
  const startTimeRef = useRef<number>(Date.now());
  const didNavigateRef = useRef(false);

  
  useEffect(() => {
    setProgress(0);
    setEstimatedSecondsRemaining(0);
  }, []);

  useEffect(() => {
    if (status !== "loading") return;

    const interval = setInterval(() => {
      setDisplayProgress((prev) => {
        const elapsed = Date.now() - startTimeRef.current;
        const timeProgress = Math.min(95, (elapsed / MIN_LOADER_MS) * 95);
        const serverProgress = Math.min(progress || 0, 95);
        const desired = Math.max(timeProgress, Math.min(serverProgress, timeProgress + 15));
        return Math.max(prev, desired);
      });
    }, 200);

    return () => clearInterval(interval);
  }, [status, MIN_LOADER_MS, progress]);

  useEffect(() => {
    if (status === "success") {
      setDisplayProgress(100);
    }
  }, [status]);

  useEffect(() => {
    if (status !== "loading") return;

    let idx = 0;
    setCurrentStage(LOADER_MESSAGES[idx % LOADER_MESSAGES.length]);

    const interval = setInterval(() => {
      idx += 1;
      setCurrentStage(LOADER_MESSAGES[idx % LOADER_MESSAGES.length]);
    }, 1200);

    return () => clearInterval(interval);
  }, [status]);

  const formatRemainingTime = (seconds: number): string => {
    if (seconds === 0) return "";
    const minutes = Math.ceil(seconds / 60);
    if (minutes === 1) return "~ 1 min remaining";
    return `~ ${minutes} min remaining`;
  };

  useEffect(() => {
    const startTime = Date.now();
    startTimeRef.current = startTime;
    didNavigateRef.current = false;

    const controller = new AbortController();
    const fetchTimeout = setTimeout(() => {
      controller.abort();
    }, 5000);

    recomputeScores({ signal: controller.signal })
      .then(() => {
        clearTimeout(fetchTimeout);
      })
      .catch((error) => {
        if ((error as { name?: string })?.name !== "AbortError") {
          console.error("Failed to recompute scores:", error);
          setErrorMessage("Some updates may be stale (recompute failed).");
        }
        clearTimeout(fetchTimeout);
      });

    const elapsed = Date.now() - startTime;
    const remainingTime = Math.max(0, MIN_LOADER_MS - elapsed);

    const timer = setTimeout(() => {
      if (didNavigateRef.current) return;
      setStatus("success");
      didNavigateRef.current = true;
      navigate("/positioning");
    }, remainingTime);

    return () => {
      controller.abort();
      clearTimeout(fetchTimeout);
      clearTimeout(timer);
    };
  }, [navigate, MIN_LOADER_MS]);

  return (
    <WorkflowLayout steps={AIM_WORKFLOW_STEPS} currentStep={3}>
      <div className="flex min-h-[70vh] w-full flex-col items-center justify-center gap-6 px-2 py-8 lg:py-16">
        <div className="flex w-full max-w-[560px] items-center justify-center pt-8 lg:pt-14">
          <BeamLoader />
        </div>
        {status === "loading" && (
          <div className="flex w-full max-w-[560px] flex-col items-center gap-4">
            <div className="flex items-center gap-3">
              <Spinner className="text-foreground" />
              <p className="text-center text-sm font-medium text-foreground">
                {currentStage}
              </p>
            </div>
            <div className="w-full space-y-2">
              <Progress value={displayProgress} className="h-2" />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{Math.round(displayProgress)}%</span>
                <span>{formatRemainingTime(estimatedSecondsRemaining)}</span>
              </div>
            </div>
          </div>
        )}
        {status === "success" && (
          <p className="text-center text-sm font-medium text-green-600">
            Hybrid fusion complete. Redirecting...
          </p>
        )}
        {status === "error" && (
          <div className="w-full max-w-[560px] rounded-xl border border-destructive bg-destructive/10 px-6 py-4">
            <p className="text-center text-lg font-semibold text-destructive">
              Pipeline Error
            </p>
            <p className="mt-2 text-center text-sm text-destructive/80">
              {errorMessage}
            </p>
            <button
              onClick={() => navigate("/human-factors")}
              className="mt-4 w-full rounded-lg bg-destructive px-4 py-2 text-white hover:bg-destructive/90"
            >
              Back to Human Factors
            </button>
          </div>
        )}
      </div>
    </WorkflowLayout>
  );
}

const Circle = forwardRef<
  HTMLDivElement,
  { className?: string; children?: React.ReactNode }
>(({ className, children }, ref) => {
  return (
    <div
      ref={ref}
      className={cn(
        "z-10 flex size-12 items-center justify-center rounded-full border-2 bg-white p-3 shadow-[0_0_20px_-12px_rgba(0,0,0,0.8)]",
        className,
      )}
    >
      {children}
    </div>
  );
});
Circle.displayName = "Circle";

function BeamLoader() {
  const containerRef = useRef<HTMLDivElement>(null);
  const humanRef = useRef<HTMLDivElement>(null);
  const aiRef = useRef<HTMLDivElement>(null);
  return (
    <div
      className="relative flex w-full max-w-[500px] items-center justify-center overflow-hidden p-10"
      ref={containerRef}
    >
      <div className="flex size-full flex-col items-stretch justify-between gap-10">
        <div className="flex flex-row justify-between">
          <div className="flex flex-col items-center gap-1">
            <Circle ref={humanRef}>
              <Icons.human />
            </Circle>
            <span className="text-[11px] font-semibold text-zinc-900">Human Judgment</span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <Circle ref={aiRef}>
              <Icons.ai />
            </Circle>
            <span className="text-[11px] font-semibold text-zinc-900">Artificial Intelligence</span>
          </div>
        </div>
      </div>
      <AnimatedBeam
        containerRef={containerRef}
        fromRef={humanRef}
        toRef={aiRef}
        startYOffset={10}
        endYOffset={10}
        curvature={-20}
      />
      <AnimatedBeam
        containerRef={containerRef}
        fromRef={humanRef}
        toRef={aiRef}
        startYOffset={-10}
        endYOffset={-10}
        curvature={20}
        reverse
      />
    </div>
  );
}

const Icons = {
  human: () => <Brain className="h-6 w-6 text-zinc-900" strokeWidth={2} />,
  ai: () => <Bot className="h-6 w-6 text-zinc-900" strokeWidth={2} />,
};
