import type { ReactNode } from "react";
import Header from "@/components/headers/header";
import { Preheader } from "@/components/headers/preheader";
import { AppSidebar } from "@/components/navigation/app-sidebar";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

type DualColorLayoutSixtyFortyProps = {
    left?: ReactNode;
    right?: ReactNode;
    steps: React.ComponentProps<typeof Header>["steps"];
    currentStep: number;
    header?: ReactNode;
    variant?: "fixed" | "inset";
    sidebarWidth?: string;
    leftClassName?: string;
    rightClassName?: string;
};

export default function DualColorLayoutSixtyForty({
                                                     left,
                                                     right,
                                                     steps,
                                                     currentStep,
                                                     header,
                                                     variant = "fixed",
                                                     sidebarWidth = "280px",
                                                     leftClassName,
                                                     rightClassName,
                                                 }: DualColorLayoutSixtyFortyProps) {
    return (
        <div className="flex min-h-dvh flex-col">
            <Preheader isFixed={false} />
            <SidebarProvider
                defaultOpen={false}
                className="flex-1 min-h-0"
                style={
                    { "--sidebar-width": sidebarWidth, "--header-height": "36px" } as React.CSSProperties
                }
            >
                {variant === "inset" ? (
                    <div className="grid min-h-0 flex-1 max-w-full lg:grid-cols-[var(--sidebar-width),1fr]">
                        <AppSidebar variant="inset" />
                        <section className="flex min-h-0 flex-1 flex-col">
                            {header ?? <DefaultWorkflowHeader steps={steps} currentStep={currentStep} />}
                            <DualSplitContent left={left} right={right} leftClassName={leftClassName} rightClassName={rightClassName} />
                        </section>
                    </div>
                ) : (
                    <div className="flex min-h-0 flex-1 max-w-full">
                        <AppSidebar />
                        <SidebarInset className="flex flex-1 min-h-0 flex-col">
                            {header ?? <DefaultWorkflowHeader steps={steps} currentStep={currentStep} />}
                            <DualSplitContent left={left} right={right} leftClassName={leftClassName} rightClassName={rightClassName} />
                        </SidebarInset>
                    </div>
                )}
            </SidebarProvider>
        </div>
    );
}

function DualSplitContent({
                              left,
                              right,
                              leftClassName,
                              rightClassName,
                          }: {
    left?: ReactNode;
    right?: ReactNode;
    leftClassName?: string;
    rightClassName?: string;
}) {
    return (
        <main className="relative flex-1 w-full overflow-visible px-0 pb-0 pt-0">
            <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-r from-white via-white to-[#cad2c5]" />
            <div className="grid min-h-[calc(100vh-var(--header-height))] w-full grid-cols-1 lg:grid-cols-[minmax(0,0.6fr)_minmax(0,0.4fr)]">
                <section className="relative flex h-full min-h-[320px] items-start justify-center overflow-y-auto">
                    <div
                        className={cn(
                            "relative z-10 flex w-full items-start justify-start bg-transparent p-8 text-slate-900",
                            !leftClassName?.includes("max-w") && "max-w-4xl",
                            leftClassName,
                        )}
                    >
                        {left ?? null}
                    </div>
                </section>
                <section
                    className={cn(
                        "sticky top-[calc(var(--header-height)+20px)] flex h-[calc(100vh-var(--header-height)-20px)] min-h-[320px] items-center justify-center bg-[hsl(var(--secondary))] p-8 text-slate-900",
                        rightClassName,
                    )}
                >
                    <div className="w-full max-w-2xl">
                        {right ?? null}
                    </div>
                </section>
            </div>
        </main>
    );
}

function DefaultWorkflowHeader({
                                   steps,
                                   currentStep,
                               }: {
    steps: React.ComponentProps<typeof Header>["steps"];
    currentStep: number;
}) {
    return (
        <div className="sticky top-0 z-30 border-b border-border/60 bg-background">
            <div className="flex min-h-[36px] w-full items-center gap-1 px-3 py-1 sm:px-4 lg:px-6">
                <SidebarTrigger className="shrink-0" />
                <div className="flex flex-1 items-center justify-center">
                    <Header steps={steps} currentStep={currentStep} className="mx-auto w-full max-w-4xl" />
                </div>
            </div>
        </div>
    );
}
