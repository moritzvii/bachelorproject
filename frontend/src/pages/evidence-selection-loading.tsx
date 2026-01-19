"use client";

import React, { useEffect, useState, useRef, forwardRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import WorkflowLayout from "@/layouts/workflow-layout";
import { Spinner } from "@/components/ui/spinner";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { AnimatedBeam } from "@/components/ui/shadcn-io/animated-beam-og/animated-beam-og";
import { AIM_WORKFLOW_STEPS } from "@/lib/workflow-steps";
import { LineChart, ShieldAlert } from "lucide-react";
import { fetchPipelineStatus, runPipeline } from "@/lib/api";
const LOADER_MESSAGES = [
  "Loading strategic objective",
  "Syncing forecast evidence",
  "Linking risk dossiers",
  "Calibrating human factors",
  "Scoring knowledge base pairs",
  "Writing review status cache",
];

export default function EvidenceSelectionLoadingPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const presetSelected = Boolean(
    (location.state as { presetSelected?: boolean } | null)?.presetSelected,
  );
  const MIN_LOADER_MS = presetSelected ? 15000 : 10000;
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [currentStage, setCurrentStage] = useState<string>("Loading strategic objective");
  const [progress, setProgress] = useState<number>(0);
  const [displayProgress, setDisplayProgress] = useState<number>(0);
  const [estimatedSecondsRemaining, setEstimatedSecondsRemaining] = useState<number>(0);
  const startTimeRef = useRef<number>(Date.now());

  
  useEffect(() => {
    if (status !== "loading") return;

    const pollStatus = async () => {
      try {
        const data = await fetchPipelineStatus();
        setProgress((data as any)?.progress || 0);
        setEstimatedSecondsRemaining((data as any)?.estimated_seconds_remaining || 0);
      } catch (error) {
        
        console.error("Failed to poll status:", error);
      }
    };

    
    const interval = setInterval(pollStatus, 1000);
    pollStatus(); 

    return () => clearInterval(interval);
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

  
  const formatRemainingTime = (seconds: number): string => {
    if (seconds === 0) return "";
    const minutes = Math.ceil(seconds / 60);
    if (minutes === 1) return "~ 1 min remaining";
    return `~ ${minutes} min remaining`;
  };

  useEffect(() => {
    const startTime = Date.now();
    startTimeRef.current = startTime;

    const executePipeline = async () => {
      try {
        const data = await runPipeline();

        if ((data as any)?.status === "success") {
          const elapsed = Date.now() - startTime;
          const remaining = Math.max(0, MIN_LOADER_MS - elapsed);
          setTimeout(() => {
            setStatus("success");
            setTimeout(() => navigate("/selection"), 800);
          }, remaining);
        } else {
          setStatus("error");
          setErrorMessage((data as any)?.error || "Pipeline failed");
        }
      } catch (error) {
        setStatus("error");
        setErrorMessage(
          error instanceof Error ? error.message : "Failed to run pipeline"
        );
      }
    };

    executePipeline();
  }, [navigate]);

  return (
    <WorkflowLayout steps={AIM_WORKFLOW_STEPS} currentStep={1}>
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
            Analysis complete. Redirecting...
          </p>
        )}
        {status === "error" && (
          <div className="w-full max-w-[560px] rounded-xl border border-slate-200 bg-white px-6 py-5 shadow-lg">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-900 text-white">
                <ShieldAlert className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <p className="text-base font-semibold text-slate-900">Pipeline-Fehler</p>
                <p className="mt-1 text-sm text-slate-600">
                  {errorMessage || "Etwas ist schiefgelaufen. Versuche es erneut."}
                </p>
                <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                  <button
                    onClick={() => navigate("/")}
                    className="w-full rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-slate-800 sm:w-auto"
                  >
                    Zur Startseite
                  </button>
                  <button
                    onClick={() => navigate("/strategic-plan")}
                    className="w-full rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-900 transition hover:-translate-y-0.5 hover:border-slate-400 sm:w-auto"
                  >
                    Neu starten
                  </button>
                </div>
              </div>
            </div>
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
  const div1Ref = useRef<HTMLDivElement>(null);
  const div2Ref = useRef<HTMLDivElement>(null);
  return (
    <div
      className="relative flex w-full max-w-[500px] items-center justify-center overflow-hidden p-10"
      ref={containerRef}
    >
      <div className="flex size-full flex-col items-stretch justify-between gap-10">
        <div className="flex flex-row justify-between">
          <div className="flex flex-col items-center gap-1">
            <Circle ref={div1Ref}>
              <Icons.risk />
            </Circle>
            <span className="text-[11px] font-semibold text-zinc-900">Risk Evidence</span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <Circle ref={div2Ref}>
              <Icons.forecast />
            </Circle>
            <span className="text-[11px] font-semibold text-zinc-900">Forecast Evidence</span>
          </div>
        </div>
      </div>
      <AnimatedBeam
        containerRef={containerRef}
        fromRef={div1Ref}
        toRef={div2Ref}
        startYOffset={10}
        endYOffset={10}
        curvature={-20}
      />
      <AnimatedBeam
        containerRef={containerRef}
        fromRef={div1Ref}
        toRef={div2Ref}
        startYOffset={-10}
        endYOffset={-10}
        curvature={20}
        reverse
      />
    </div>
  );
}

const Icons = {
  forecast: () => <LineChart className="h-6 w-6 text-zinc-900" strokeWidth={2} />,
  risk: () => <ShieldAlert className="h-6 w-6 text-zinc-900" strokeWidth={2} />,
};
