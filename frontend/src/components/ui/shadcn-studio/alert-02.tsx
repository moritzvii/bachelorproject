import { cn } from "@/lib/utils";

type AlertSummaryProps = {
  title: string;
  description?: string;
  className?: string;
  titleBadgeClassName?: string;
};

const AlertSummary = ({ title, className, titleBadgeClassName }: AlertSummaryProps) => {
  const highlightValue = title.match(/\d+/)?.[0] ?? null;
  const titleRemainder = highlightValue ? title.replace(highlightValue, "").trim() : title;

  return (
    <div
      className={cn(
        "mx-auto inline-flex max-w-md flex-col items-center justify-center gap-1 rounded-full border border-white/15 bg-black px-4 py-2 text-[11px] text-white text-center shadow-inner",
        className,
      )}
    >
      <div className="inline-flex items-center gap-2">
        {highlightValue ? (
          <span
            className={cn(
              "rounded-full border border-white/20 bg-white/10 px-2 py-0.5 text-[10px] font-semibold text-[hsl(var(--chart-3))]",
              titleBadgeClassName,
            )}
          >
            {highlightValue}
          </span>
        ) : null}
        <span className="text-xs font-semibold text-white">{titleRemainder}</span>
      </div>
    </div>
  );
};

export default AlertSummary;
