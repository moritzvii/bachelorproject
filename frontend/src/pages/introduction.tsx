import { useNavigate } from "react-router-dom";
import { useState } from "react";

import DualColorLayoutEightyTwenty from "@/layouts/dual-color-layout-80-20";
import { AIM_WORKFLOW_STEPS } from "@/lib/workflow-steps";
import { AppleSegmentsSimpleMap } from "@/features/aim-workflow/maps/apple-segments-simple-map";
import { ChartRadarLinesOnly } from "@/components/ui/shadcn-io/radar-chart-03";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { cleanPipelineWorkdir } from "@/lib/api";

export default function IntroductionPage() {
  const navigate = useNavigate();
  const [isResetting, setIsResetting] = useState(false);

  const handleCreate = async () => {
    setIsResetting(true);
    try {
      await cleanPipelineWorkdir();
    } catch (err) {
      console.error("Failed to reset pipeline workdir", err);
    } finally {
      setIsResetting(false);
      navigate("/strategic-plan");
    }
  };

  return (
    <DualColorLayoutEightyTwenty
      steps={AIM_WORKFLOW_STEPS}
      currentStep={0}
      left={
        <div className="flex w-full flex-col gap-8 px-6 py-8 sm:px-8 lg:px-12">
          <header className="flex flex-col items-center space-y-2 text-center">
            <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
              Apple Region & Segment Overview
            </h1>
            <div className="max-w-2xl rounded-xl bg-[linear-gradient(135deg,_hsl(var(--chart-2)),_hsl(var(--chart-3)))] px-4 py-3 text-[11px] font-medium text-white ring-1 ring-white/10">
              This page offers a <strong className="font-semibold">short, optional overview</strong> of
              <strong className="font-semibold"> Apple’s segment and region reporting</strong>. Helping you quickly align
              with how Apple structures its public disclosures.
            </div>
          </header>

          <section className="space-y-4">
            <AppleSegmentsSimpleMap className="w-full shadow-none"/>
          </section>

          <section className="space-y-4">
            <ChartRadarLinesOnly/>
          </section>
        </div>
      }
      right={
        <div className="space-y-5 text-sm text-muted-foreground">
          <Button className="w-full" disabled={isResetting} onClick={handleCreate}>
            {isResetting ? "RESETTING..." : "GET STARTED"}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      }
    />
  );
}
