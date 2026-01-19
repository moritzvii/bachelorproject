import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

type CardAspectRatio = `${number}:${number}` | number

const cardVariants = cva("rounded-xl border shadow", {
  variants: {
    variant: {
      default: "border-border bg-card text-card-foreground",
      muted: "border-transparent bg-muted/50 text-card-foreground",
    },
  },
  defaultVariants: {
    variant: "default",
  },
})

type CardProps = React.HTMLAttributes<HTMLDivElement> &
  VariantProps<typeof cardVariants> & {
    aspectRatio?: CardAspectRatio
  }

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, aspectRatio, style, variant, ...props }, ref) => {
    const normalizedAspectRatio = normalizeAspectRatio(aspectRatio)
    const ratioStyle: React.CSSProperties | undefined =
      normalizedAspectRatio !== undefined
        ? { aspectRatio: normalizedAspectRatio }
        : undefined
    const mergedStyle = style
      ? { ...(ratioStyle ?? {}), ...style }
      : ratioStyle

    return (
      <div
        ref={ref}
        data-slot="card"
        className={cn(cardVariants({ variant, className }))}
        style={mergedStyle}
        {...props}
      />
    )
  }
)
Card.displayName = "Card"

const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    data-slot="card-header"
    className={cn("flex flex-col space-y-1.5 p-6", className)}
    {...props}
  />
))
CardHeader.displayName = "CardHeader"

const CardTitle = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    data-slot="card-title"
    className={cn("font-semibold leading-none tracking-tight", className)}
    {...props}
  />
))
CardTitle.displayName = "CardTitle"

const CardDescription = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    data-slot="card-description"
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
))
CardDescription.displayName = "CardDescription"

const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    data-slot="card-content"
    className={cn("p-6 pt-0", className)}
    {...props}
  />
))
CardContent.displayName = "CardContent"

const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    data-slot="card-footer"
    className={cn("flex items-center p-6 pt-0", className)}
    {...props}
  />
))
CardFooter.displayName = "CardFooter"

function normalizeAspectRatio(aspectRatio?: CardAspectRatio) {
  if (aspectRatio === undefined) {
    return undefined
  }

  if (typeof aspectRatio === "number") {
    return aspectRatio > 0 ? aspectRatio : undefined
  }

  const [rawWidth, rawHeight] = aspectRatio.split(":").map(Number)
  if (
    Number.isFinite(rawWidth) &&
    Number.isFinite(rawHeight) &&
    rawWidth > 0 &&
    rawHeight > 0
  ) {
    return `${rawWidth} / ${rawHeight}`
  }

  return undefined
}

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent }

export type { CardAspectRatio }
