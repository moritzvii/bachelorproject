"use client";

import { SliderWhite } from "@/components/ui/slider-white";
import { LikertSlider } from "@/components/ui/likert-slider";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";
import { DEFAULT_HUMAN_FACTOR_COLOR, HUMAN_FACTOR_COLORS } from "@/features/aim-workflow/constants/human-factors";

type FactorSimpleCardProps = {
    icon: LucideIcon;
    label: string;
    description: string;
    value: number;
    onChange: (value: number) => void;
    onCommit?: (value: number) => void;
    className?: string;
    style?: React.CSSProperties;
    useLikertScale?: boolean;
    likertLabels?: string[];
    titleColor?: string;
    disabled?: boolean;
    sliderVariant?: "light" | "dark";
};

export function FactorSimpleCard({
                                     icon: Icon,
                                     label,
                                     description,
                                     value,
                                     onChange,
                                    onCommit,
                                    className,
                                    style,
                                    useLikertScale = false,
                                     likertLabels,
                                    titleColor,
                                    disabled = false,
                                    sliderVariant = "light",
                                 }: FactorSimpleCardProps) {
    const color = titleColor || HUMAN_FACTOR_COLORS[label] || DEFAULT_HUMAN_FACTOR_COLOR;

    const getLikertLabel = (value: number) => {
        const labels =
            likertLabels && likertLabels.length > 0
                ? likertLabels
                : [
                    "1 — Very low",
                    "2 — Low",
                    "3 — Slightly low",
                    "4 — Neutral",
                    "5 — Slightly high",
                    "6 — High",
                    "7 — Very high",
                ];
        return labels[value] || labels[3] || "Neutral";
    };

    return (
        <div
            className={cn(
                "relative h-full w-full rounded-xl border border-white/15 px-6 py-6 text-white shadow-inner text-sm",
                className
            )}
            style={style}
        >
            
            <div className="mb-3 flex items-center gap-3">
        <span className="inline-flex h-7 w-7 items-center justify-center rounded-sm border border-white/20 bg-white/5">
          <Icon className="h-4 w-4 text-white/70" />
        </span>
                <span
                    className="text-[13px] font-semibold"
                    style={{ color }}
                >
          {label}
        </span>
            </div>

            
            {description && (() => {
                const suffixPattern = /\s*\((Evidence ↔ [^)]+)\)\s*$/;
                const match = description.match(suffixPattern);
                const suffix = match ? match[1] : null;
                const mainText = match ? description.slice(0, match.index).trimEnd() : description;

                return (
                    <p className="mb-4 text-[12px] text-white/70 leading-snug">
                        {mainText}
                        {suffix && (
                            <>
                                <br />
                                <span className="text-white/20">({suffix})</span>
                            </>
                        )}
                    </p>
                );
            })()}

            
            <div className="mb-4 flex items-baseline justify-between">
                <span className="text-[13px] text-white/60">
                    {useLikertScale ? "" : "Weight"}
                </span>
                <span className="text-lg font-semibold text-white">
                    {useLikertScale ? getLikertLabel(value) : `${Math.round(value * 100)}%`}
                </span>
            </div>

            
            {useLikertScale ? (
                <LikertSlider
                    value={[value]}
                    variant={sliderVariant}
                    onValueChange={([next]) => {
                        if (typeof next === "number" && !disabled) {
                            onChange(next);
                        }
                    }}
                    onValueCommit={([next]) => {
                        if (typeof next === "number" && !disabled && onCommit) {
                            onCommit(next);
                        }
                    }}
                    disabled={disabled}
                />
            ) : (
                <SliderWhite
                    value={[value]}
                    onValueChange={([next]) => {
                        if (typeof next === "number" && !disabled) {
                            onChange(next);
                        }
                    }}
                    onValueCommit={([next]) => {
                        if (typeof next === "number" && !disabled && onCommit) {
                            onCommit(next);
                        }
                    }}
                    min={0}
                    max={1}
                    step={0.01}
                    disabled={disabled}
                />
            )}

            
            <div className="mt-2 flex justify-between text-[10px] uppercase tracking-wide text-white/40">
                {useLikertScale ? (
                    <>
                        <span>{(likertLabels && likertLabels[0]) || "Very low"}</span>
                        <span>{(likertLabels && likertLabels[likertLabels.length - 1]) || "Very high"}</span>
                    </>
                ) : (
                    <>
                        <span>Low</span>
                        <span>High</span>
                    </>
                )}
            </div>

        </div>
    );
}
