import Header from "@/components/headers/header";
import { Preheader } from "@/components/headers/preheader";
import { AppSidebar } from "@/components/navigation/app-sidebar";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";

type WorkflowLayoutProps = {
    children: React.ReactNode;
    steps: React.ComponentProps<typeof Header>["steps"];
    currentStep: number;
    header?: React.ReactNode;
    variant?: "fixed" | "inset";
    sidebarWidth?: string;
};

export default function WorkflowLayout({
                                           children,
                                           steps,
                                           currentStep,
                                           header,
                                           variant = "fixed",
                                           sidebarWidth = "280px",
                                       }: WorkflowLayoutProps) {
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
                            <main className="flex-1 w-full overflow-visible px-3 pb-6 pt-4 sm:overflow-y-auto sm:px-4 sm:pb-8 lg:px-6">
                                {children}
                            </main>
                        </section>
                    </div>
                ) : (
                    <div className="flex min-h-0 flex-1 max-w-full">
                        <AppSidebar />
                        <SidebarInset className="flex flex-1 min-h-0 flex-col">
                            {header ?? <DefaultWorkflowHeader steps={steps} currentStep={currentStep} />}
                            <main className="flex-1 w-full overflow-visible px-3 pb-6 pt-4 sm:overflow-y-auto sm:px-4 sm:pb-8 lg:px-6">
                                {children}
                            </main>
                        </SidebarInset>
                    </div>
                )}
            </SidebarProvider>
        </div>
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
