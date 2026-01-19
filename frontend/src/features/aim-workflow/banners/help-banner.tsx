import { type ReactNode } from "react";
import { BadgeInfo } from "lucide-react";

type HelpBannerProps = {
  step?: string;
  title?: string;
  description?: string;
  className?: string;
  icon?: ReactNode;
};

export function HelpBanner({
  step = "Help",
  title = "Evidence Summary",
  description = "",
  className,
  icon,
}: HelpBannerProps) {
  return (
    <div className={className}>
      <div className="mb-4">
        <div className="mb-3 flex items-center gap-3 leading-none">
          <div className="flex h-10 w-10 items-center justify-center text-[hsl(var(--background))]">
            {icon ?? <BadgeInfo className="size-8 text-[#000]" />}
          </div>
          <div>
            <div className="text-[10px] font-semibold uppercase leading-none tracking-widest text-[hsl(var(--sidebar-foreground))]">
              {step}
            </div>
            <div className="text-[27px] font-semibold leading-none text-[hsl(var(--sidebar-primary))]">{title}</div>
          </div>
        </div>
      </div>

      {description ? (
        <div className="max-w-3xl text-[13px] leading-relaxed text-muted-foreground">
          {description}
        </div>
      ) : null}
    </div>
  );
}
