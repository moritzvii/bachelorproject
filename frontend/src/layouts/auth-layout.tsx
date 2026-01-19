import { useState, type ReactNode } from "react";
import { Preheader } from "@/components/headers/preheader";

type AuthLayoutProps = {
    children: ReactNode;
};

export default function AuthLayout({ children }: AuthLayoutProps) {
    const [showMore, setShowMore] = useState(false);

    return (
        <div className="relative flex min-h-dvh flex-col bg-white text-slate-900">
            <Preheader />
            <div className="relative grid flex-1 min-h-0 lg:mt-12 lg:grid-cols-2">
                
                <div className="flex items-center justify-center p-6 md:p-10">
                    <div className="w-full max-w-xs lg:mt-0">{children}</div>
                </div>

                
                <div className="relative hidden overflow-hidden bg-zinc-900 lg:flex">
                    <div className="relative z-10 flex w-full flex-col items-center justify-center gap-6 px-12 text-center text-white">
                        <div className="space-y-4 md:space-y-5">
                            <span className="inline-flex items-center justify-center rounded-full bg-white/15 px-3 py-1 text-[0.7rem] font-semibold tracking-[0.08em] text-white ring-1 ring-white/25">
                                /hybridintelligence.dev
                            </span>
                            <h2 className="text-[28px] font-semibold leading-tight tracking-[-0.01em] text-white md:text-[32px] text-balance">
                                Hybrid Intelligence Dashboard for Strategic Planning
                            </h2>
                            <p className="text-[0.68rem] leading-5 text-white/90 md:text-[0.78rem]">
                                <span className="font-semibold">Bachelor project</span> at the Chair of Information Systems and Digital Transformation (<span className="font-semibold">SAP-Stiftungsprofessur</span>)
                            </p>
                            {showMore && (
                                <>
                                    <p className="text-[0.68rem] leading-5 md:text-[0.78rem] text-white/90">
                                        This bachelor project automatically constructs its own <span className="font-semibold">structured data foundation</span>, retrieves all <span className="font-semibold">strategy-relevant evidence</span>, and evaluates it through precise <span className="font-semibold">entailment and contradiction scoring</span>.
                                    </p>
                                    <p className="text-[0.68rem] leading-5 md:text-[0.78rem] text-white/90">
                                        After enriching these AI insights with human judgments, it fuses both into a <span className="font-semibold">GE-Matrix-based strategic position</span> and delivers a clear, <span className="font-semibold">action-ready decision dashboard</span>.
                                    </p>
                                </>
                            )}
                            <button
                                type="button"
                                className="text-[0.68rem] font-semibold text-white underline underline-offset-4 transition hover:text-white/80"
                                onClick={() => setShowMore((prev) => !prev)}
                            >
                                {showMore ? "Show less" : "Read more"}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <footer className="pointer-events-none fixed bottom-4 right-4">
                <div className="pointer-events-auto inline-flex items-center gap-2 rounded-full border border-border/60 bg-primary/80 px-4 py-2 text-[0.6rem] font-semibold uppercase tracking-[0.24em] text-primary-foreground shadow-lg shadow-primary/20 backdrop-blur-sm">
                    <span>© {new Date().getFullYear()} Moritz von B&#xfc;ren</span>
                    <span className="h-2 w-px bg-primary-foreground/30" />
                    <span>Confidential</span>
                </div>
            </footer>
        </div>
    );
}
