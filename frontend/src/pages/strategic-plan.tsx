import WorkflowLayout from "@/layouts/workflow-layout";
import { AIM_WORKFLOW_STEPS } from "@/lib/workflow-steps";
import { TerminalHeroPanel } from "@/features/aim-workflow/banners/workflow-banner";
import { Crosshair } from "lucide-react";
import { InputGroupCard } from "@/features/aim-workflow/forms/input-group-card";

export default function StrategicPlanPage() {
  return (
    <WorkflowLayout steps={AIM_WORKFLOW_STEPS} currentStep={0}>
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-2 sm:px-0">
        <TerminalHeroPanel
          step="Step 1 — Strategic Plan"
          title="Enter a Strategic Intent"
          description="Create a **Strategic Plan** by selecting one or more **Segments** and an optional **Region**. You can use a **predefined plan** or enter your own."
          icon={<Crosshair className="h-6 w-6" strokeWidth={1.75} />}
        />
        <InputGroupCard />
      </div>
    </WorkflowLayout>
  );
}
