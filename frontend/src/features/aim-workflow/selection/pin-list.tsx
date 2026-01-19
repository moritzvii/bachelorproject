"use client";

import * as React from "react";
import { BadgeCheck, BadgeX } from "lucide-react";
import DetailsOnDemandPDF from "@/features/aim-workflow/documents/details-on-demand-pdf";
import { motion, LayoutGroup, type HTMLMotionProps, type Transition } from "motion/react";
import { cn } from "@/lib/utils";
import { ScoreBadge } from "@/features/aim-workflow/badges/score-badge";
import { updatePairStatus } from "@/lib/api";

type PinStatus = "pinned" | "below" | "default";


type PinListItem = {
    id: number;
    pair_id?: string;
    name: string;
    info: string;
    percent: number;
    entailment: number;
    contradiction: number;
    combinedScore?: number;
    detailsSrc: string;
    page?: number;
    pinned?: boolean;
    below?: boolean;
};

type PinListProps = {
    items: PinListItem[];
    labels?: {
        pinned?: string;
        unpinned?: string;
        below?: string;
    };
    transition?: Transition;
    labelMotionProps?: HTMLMotionProps<"p">;
    className?: string;
    labelClassName?: string;
    pinnedSectionClassName?: string;
    unpinnedSectionClassName?: string;
    belowSectionClassName?: string;
    pinnedHeaderClassName?: string;
    unpinnedHeaderClassName?: string;
    belowHeaderClassName?: string;
    zIndexResetDelay?: number;
    instanceId?: string;
    onAllItemsEmptyChange?: (isEmpty: boolean) => void;
    sourceType?: "forecast" | "risk";
} & HTMLMotionProps<"div">;

const truncateText = (text: string, length = 120): string => {
    if (!text) return "";
    if (text.length <= length) return text;
    return `${text.slice(0, length).trimEnd()}...`;
};

function PinList2({
                      items,
                      labels = { pinned: "Pinned Items", unpinned: "All Items", below: "Below" },
                      transition = { stiffness: 320, damping: 20, mass: 0.8, type: "spring" },
                      labelMotionProps = {
                          initial: { opacity: 0 },
                          animate: { opacity: 1 },
                          exit: { opacity: 0 },
                          transition: { duration: 0.22, ease: "easeInOut" },
                      },
                      className,
                      labelClassName,
                      pinnedSectionClassName,
                      unpinnedSectionClassName,
                      belowSectionClassName,
                      pinnedHeaderClassName,
                      unpinnedHeaderClassName,
                      belowHeaderClassName,
                      zIndexResetDelay = 500,
                      instanceId = "pinlist",
                      onAllItemsEmptyChange,
                      sourceType,
                      ...props
                  }: PinListProps) {
    const [listItems, setListItems] = React.useState(() =>
        items.map((item) => ({ ...item, pinned: item.pinned ?? false, below: item.below ?? false })),
    );

    React.useEffect(() => {
        setListItems((prev) =>
            items.map((item) => {
                const prevMatch = prev.find(
                    (p) => (p.pair_id && p.pair_id === item.pair_id) || p.id === item.id,
                );
                return {
                    ...item,
                    pinned: prevMatch?.pinned ?? item.pinned ?? false,
                    below: prevMatch?.below ?? item.below ?? false,
                };
            }),
        );
    }, [items]);
    const [togglingGroup, setTogglingGroup] = React.useState<"pinned" | "unpinned" | null>(null);

    const sortedItems = [...listItems].sort(
        (a, b) => (b.combinedScore ?? Math.max(b.entailment, b.contradiction)) - (a.combinedScore ?? Math.max(a.entailment, a.contradiction)),
    );
    const pinned = sortedItems.filter((u) => u.pinned);
    const belowSectionItems = sortedItems.filter((u) => u.below);
    const unpinned = sortedItems.filter((u) => !u.pinned && !u.below);
    const isAllItemsEmpty = unpinned.length === 0;

    React.useEffect(() => {
        onAllItemsEmptyChange?.(isAllItemsEmpty);
    }, [isAllItemsEmpty, onAllItemsEmptyChange]);

    const setItemStatus = (id: number, status: PinStatus) => {
        setListItems((prev) =>
            prev.map((item) =>
                item.id === id
                    ? {
                        ...item,
                        pinned: status === "pinned",
                        below: status === "below",
                    }
                    : item,
            ),
        );
        setTogglingGroup(status === "pinned" ? "pinned" : "unpinned");
        setTimeout(() => setTogglingGroup(null), zIndexResetDelay);

        const updateStatus = async () => {
            const backendStatus = status === "pinned" ? "accepted" : status === "below" ? "declined" : "pending";

            const item = listItems.find((entry) => entry.id === id);
            const actualPairId = item?.pair_id || id.toString();

            try {
                await updatePairStatus({
                    pair_id: actualPairId,
                    status: backendStatus
                });
            } catch (error) {
                console.error("Failed to update pair status:", error);
            }
        };

        updateStatus();
    };

    const moveUp = (id: number) => {
        const item = listItems.find((entry) => entry.id === id);
        if (!item) return;
        if (item.pinned) return;
        const nextStatus: PinStatus = item.below ? "default" : "pinned";
        setItemStatus(id, nextStatus);
    };

    const moveDown = (id: number) => {
        const item = listItems.find((entry) => entry.id === id);
        if (!item) return;
        if (item.below) return;
        const nextStatus: PinStatus = item.pinned ? "default" : "below";
        setItemStatus(id, nextStatus);
    };

    const renderActionButtons = (
        id: number,
        entailment: number,
        contradiction: number,
        combinedScore?: number,
        options?: { pinned?: boolean; below?: boolean; showAlways?: boolean; tone?: "light" | "dark" },
    ) => {
        const isDark = options?.tone === "dark";
        const visibility = options?.showAlways ? "opacity-100" : "opacity-0 group-hover:opacity-100";

        return (
            <div className="flex flex-col items-center gap-1">
                <button
                    type="button"
                    aria-label="Move up"
                    onClick={(event) => {
                        event.stopPropagation();
                        moveUp(id);
                    }}
                    className={cn(
                        "flex h-7 w-7 items-center justify-center rounded-full text-white transition-opacity",
                        isDark ? "bg-white/25" : "bg-neutral-500",
                        options?.pinned && !isDark && "bg-neutral-700",
                        visibility,
                    )}
                >
                    <BadgeCheck className="size-3.5" />
                </button>
                <ScoreBadge
                    entailment={entailment}
                    contradiction={contradiction}
                    combinedScore={combinedScore}
                    sourceType={sourceType}
                    className="z-10"
                    mode={combinedScore !== undefined ? "combined" : sourceType === "risk" ? "contradiction" : "entailment"}
                />
                <button
                    type="button"
                    aria-label="Move down"
                    onClick={(event) => {
                        event.stopPropagation();
                        moveDown(id);
                    }}
                    className={cn(
                        "flex h-7 w-7 items-center justify-center rounded-full text-white transition-opacity",
                        isDark ? "bg-white/25" : "bg-neutral-400",
                        options?.below && !isDark && "bg-neutral-600",
                        visibility,
                    )}
                >
                    <BadgeX className="size-3.5" />
                </button>
            </div>
        );
    };

    const renderDetailsLink = (detailsSrc?: string, page?: number, tone: "light" | "dark" = "light") => {
        if (!detailsSrc) return null;
        return (
            <DetailsOnDemandPDF
                src={detailsSrc}
                triggerLabel="More Details – Read Report"
                buttonVariant="link"
                showTriggerIcon={false}
                pageShortcuts={page ? [{ page, label: "Page " + page }]: undefined}
                className={cn(
                    "h-auto px-0 text-[11px] font-semibold underline decoration-dotted",
                    tone === "dark"
                        ? "text-white/80 hover:text-white"
                        : "text-[hsl(var(--chart-4))] hover:text-[hsl(var(--chart-4))]/80",
                )}
            />
        );
    };

    const getLayoutId = (suffix: string) => `${instanceId}-${suffix}`;

    return (
        <motion.div className={cn("space-y-10", className)} {...props}>
            <LayoutGroup id={instanceId}>
                {(!isAllItemsEmpty || pinned.length > 0) && (
                <div>
                    <motion.p
                        layout
                        key="pinned-label"
                        className={cn(
                            "font-medium px-3 text-neutral-500 dark:text-neutral-300 text-sm mb-2",
                            labelClassName,
                            pinnedHeaderClassName,
                        )}
                        {...labelMotionProps}
                    >
                        {labels.pinned}
                    </motion.p>
                    <div
                        className={cn(
                            "space-y-3 relative rounded-xl border border-[hsl(var(--input))]/25 bg-[hsl(var(--input))]/10 p-3",
                            togglingGroup === "pinned" ? "z-5" : "z-10",
                            pinned.length > 0 && pinnedSectionClassName,
                        )}
                    >
                        {pinned.length > 0 ? (
                            pinned.map((item) => {
                                return (
                                    <motion.div
                                        key={`${instanceId}-pinned-${item.id}`}
                                        layoutId={getLayoutId(`pinned-${item.id}`)}
                                        transition={transition}
                                        className="group flex items-center gap-4 rounded-2xl bg-white p-2 shadow-sm"
                                    >
                                        {renderActionButtons(item.id, item.entailment, item.contradiction, item.combinedScore, { pinned: true, showAlways: true, tone: "light" })}
                                        <div className="flex flex-1 flex-col gap-1">
                                            <div className="text-sm font-semibold text-[hsl(var(--chart-3))]">{item.name}</div>
                                            <div className="text-xs text-muted-foreground font-medium">{truncateText(item.info)}</div>
                                            <div className="text-xs">{renderDetailsLink(item.detailsSrc, item.page, "light")}</div>
                                        </div>
                                    </motion.div>
                                );
                            })
                        ) : (
                            <div className="py-4" aria-hidden="true" />
                        )}
                    </div>
                </div>
                )}

                {unpinned.length > 0 ? (
                    <div>
                        <motion.p
                            layout
                            key="all-label"
                            className={cn(
                                "font-medium px-3 text-neutral-500 dark:text-neutral-300 text-sm mb-2",
                                labelClassName,
                                unpinnedHeaderClassName,
                            )}
                            {...labelMotionProps}
                        >
                            {labels.unpinned}
                        </motion.p>
                        <div
                            className={cn(
                                "space-y-3 relative rounded-xl border border-[hsl(var(--input))]/60 bg-[hsl(var(--input))]/30 p-3",
                                togglingGroup === "unpinned" ? "z-5" : "z-10",
                                unpinnedSectionClassName,
                            )}
                        >
                            {unpinned.map((item) => (
                                <motion.div
                                    key={`${instanceId}-unpinned-${item.id}`}
                                    layoutId={getLayoutId(`unpinned-${item.id}`)}
                                    transition={transition}
                                    className="group flex items-center gap-4 rounded-2xl bg-white p-2"
                                >
                                    {renderActionButtons(item.id, item.entailment, item.contradiction, item.combinedScore, { tone: "light" })}
                                    <div className="flex flex-1 flex-col gap-1">
                                        <div className="text-sm font-semibold text-[hsl(var(--chart-3))]">{item.name}</div>
                                        <div className="text-xs text-muted-foreground font-medium">{truncateText(item.info)}</div>
                                        <div className="text-xs text-[hsl(var(--chart-4))]">
                                            {renderDetailsLink(item.detailsSrc, item.page, "light")}
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </div>
                ) : null}

                {(!isAllItemsEmpty || belowSectionItems.length > 0) && (
                <div>
                    <motion.p
                        layout
                        key="below-label"
                        className={cn(
                            "font-medium px-3 text-neutral-500 dark:text-neutral-300 text-sm mb-2",
                            labelClassName,
                            belowHeaderClassName,
                        )}
                        {...labelMotionProps}
                    >
                        {labels.below}
                    </motion.p>
                    <div className={cn("space-y-3 relative rounded-xl border border-[hsl(var(--input))]/25 bg-[hsl(var(--input))]/10 p-3", belowSectionItems.length > 0 && belowSectionClassName)}>
                        {belowSectionItems.length > 0 ? (
                            belowSectionItems.map((item) => (
                                <motion.div
                                    key={`${instanceId}-below-${item.id}`}
                                    layoutId={getLayoutId(`below-${item.id}`)}
                                    transition={transition}
                                    className="group flex items-center gap-4 rounded-2xl bg-white p-2 shadow-sm"
                                >
                                    {renderActionButtons(item.id, item.entailment, item.contradiction, item.combinedScore, { below: true, showAlways: true, tone: "light" })}
                                    <div className="flex flex-1 flex-col gap-1">
                                        <div className="text-sm font-semibold text-[hsl(var(--chart-3))]">{item.name}</div>
                                        <div className="text-xs text-muted-foreground font-medium">{truncateText(item.info)}</div>
                                        <div className="text-xs">{renderDetailsLink(item.detailsSrc, item.page, "light")}</div>
                                    </div>
                                </motion.div>
                            ))
                        ) : (
                            <div className="py-4" aria-hidden="true" />
                        )}
                    </div>
                </div>
                )}
            </LayoutGroup>
        </motion.div>
    );
}

export { PinList2, type PinListProps, type PinListItem };
