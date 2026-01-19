import { Preheader } from "@/components/headers/preheader";
import { AppSidebar } from "@/components/navigation/app-sidebar";
import { Separator } from "@/components/ui/separator";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

type AppLayoutProps = {
    children: React.ReactNode;
    header?: React.ReactNode;
    variant?: "fixed" | "inset";
    sidebarWidth?: string; 
};

export default function AppLayout({
                                      children,
                                      header,
                                      variant = "fixed",
                                      sidebarWidth = "280px",
                                  }: AppLayoutProps) {
    return (
        <div className="flex min-h-dvh flex-col">
            <Preheader isFixed={false} />
            <SidebarProvider
                className="flex-1 min-h-0"
                style={
                    { "--sidebar-width": sidebarWidth, "--header-height": "48px" } as React.CSSProperties
                }
            >
                {variant === "inset" ? (
                    <div className="grid min-h-0 flex-1 max-w-full lg:grid-cols-[var(--sidebar-width),1fr]">
                        <AppSidebar variant="inset" />
                        <section className="flex min-h-0 flex-1 flex-col">
                            {header ?? <DefaultHeader />}
                            <main className="flex-1 w-full overflow-visible px-3 pb-6 pt-4 sm:overflow-y-auto sm:px-4 sm:pb-8 lg:px-6">
                                {children}
                            </main>
                        </section>
                    </div>
                ) : (
                    <div className="flex min-h-0 flex-1 max-w-full">
                        <AppSidebar /> 
                        <SidebarInset className="flex flex-1 min-h-0 flex-col">
                            {header ?? <DefaultHeader />}
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

function DefaultHeader() {
    const navigate = useNavigate();

    const handleNewDecision = () => {
        navigate("/empty");
    };

    return (
        <header className="sticky top-0 z-30 flex h-[var(--header-height)] shrink-0 items-center gap-2 border-b bg-background/95 px-3 shadow-sm backdrop-blur supports-[backdrop-filter]:backdrop-blur sm:px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 data-[orientation=vertical]:h-4" />
            <div className="text-sm text-muted-foreground">Dashboard</div>
            <div className="ml-auto flex items-center gap-2">
                <Button variant={"destructive"} onClick={handleNewDecision}>
                    New Decision
                </Button>
            </div>
        </header>
    );
}
