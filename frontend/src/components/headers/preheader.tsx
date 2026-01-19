import { cn } from "@/lib/utils"

type PreheaderProps = {
  className?: string
  isFixed?: boolean
}

export const PREHEADER_HEIGHT = 48

export function Preheader({ className, isFixed = true }: PreheaderProps) {
  const outerClasses = cn(
    "hidden w-full border-b border-[hsl(var(--sidebar-border))] bg-sidebar text-sidebar-foreground lg:flex",
    isFixed ? "pointer-events-none fixed inset-x-0 top-0 z-50" : "relative"
  )

  const innerClasses = cn(
    "mx-auto flex w-full max-w-6xl items-center justify-center gap-3 px-6 py-2 text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-sidebar-foreground text-center",
    isFixed && "pointer-events-auto"
  )

  return (
    <header className={cn(outerClasses, className)}>
      <div className={innerClasses} style={{ minHeight: `${PREHEADER_HEIGHT}px` }}>
        <span className="flex items-center justify-center gap-2 text-sidebar-foreground">
          <span>Hybrid Intelligence</span>
          <span className="h-3 w-px bg-[hsl(var(--sidebar-border))]" />
          <span>Bachelor Thesis Pilot</span>
          <span className="h-3 w-px bg-[hsl(var(--sidebar-border))]" />
          <span>Moritz von Büren</span>
        </span>
      </div>
    </header>
  )
}
