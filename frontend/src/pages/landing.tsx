import WorkflowLayout from "@/layouts/workflow-layout";

export default function LandingPage() {
  return (
    <WorkflowLayout steps={[]} currentStep={0}>
      <div className="flex min-h-[70vh] w-full items-center justify-center px-4">
        <div className="flex max-w-3xl flex-col items-center gap-5 text-center">
          <span className="inline-flex items-center gap-2 rounded-full bg-foreground/5 px-3 py-1.5 text-[9px] font-semibold uppercase tracking-wide text-foreground/80 ring-1 ring-foreground/10 sm:text-[10px]">
            This page provides access to the evaluation for my bachelor thesis.
          </span>
          <h1 className="text-[2.5rem] font-semibold tracking-tight text-foreground sm:text-[2.75rem]">
            Bachelor Thesis Evaluation
          </h1>
          <a
            href="/introduction"
            className="text-sm font-semibold text-[hsl(var(--chart-3))] underline underline-offset-4"
          >
            Start Evaluation
          </a>
        </div>
      </div>
    </WorkflowLayout>
  );
}
