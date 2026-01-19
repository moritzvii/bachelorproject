"use client"
import { useMemo, useState, type ComponentType } from "react"
import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
} from "recharts"

import type { ChartConfig } from "@/components/ui/chart"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import appleNetSales from "@/data/apple-net-sales.json"
import { segmentIcons } from "./legend-icons"

export const description = "Apple segment radar chart"

const GRID_COLOR = "#cbd5e1"
const TICK_COLOR = "#475569"

const productNetSales = appleNetSales.products.millions
const PRODUCT_YEARS = Object.keys(productNetSales)
  .map((year) => Number(year))
  .sort((a, b) => a - b)
  .map(String) as Array<keyof typeof productNetSales>

type ProductYear = (typeof PRODUCT_YEARS)[number]
type ProductSegment = keyof (typeof productNetSales)[ProductYear]

const PRODUCT_SEGMENTS = appleNetSales.products.segments as ProductSegment[]
const PREVIOUS_YEAR_BY_YEAR: Record<ProductYear, ProductYear | null> =
  PRODUCT_YEARS.reduce((acc, year, index) => {
    acc[year] = PRODUCT_YEARS[index - 1] ?? null
    return acc
  }, {} as Record<ProductYear, ProductYear | null>)

const yearColorOrder = ["2", "3", "4"]
const yearColorMap: Record<ProductYear, string> = PRODUCT_YEARS.reduce(
  (acc, year, index) => {
    const paletteIndex =
      yearColorOrder[index] ?? yearColorOrder[yearColorOrder.length - 1]
    acc[year] = `hsl(var(--chart-${paletteIndex}))`
    return acc
  },
  {} as Record<ProductYear, string>
)

const chartConfig = PRODUCT_YEARS.reduce((acc, year) => {
  const prev = PREVIOUS_YEAR_BY_YEAR[year]
  acc[year] = {
    label: prev ? `FY${year} YoY vs FY${prev}` : `FY${year} baseline`,
    color: yearColorMap[year],
  }
  return acc
}, {} as ChartConfig)

const toBillions = (value: number) =>
  Number((value / 1000).toFixed(1))

const percentChange = (current: number, previous: number) =>
  previous ? Number((((current - previous) / previous) * 100).toFixed(1)) : 0

const chartData = PRODUCT_SEGMENTS.map((segment) => {
  const row: Record<string, string | number> = { segment }
  let index = 100
  PRODUCT_YEARS.forEach((year) => {
    const previousYear = PREVIOUS_YEAR_BY_YEAR[year]
    const current = productNetSales[year][segment]
    const previous = previousYear ? productNetSales[previousYear][segment] : null
    const change = previous ? percentChange(current, previous) : 0
    index = index * (1 + change / 100)
    row[year] = Math.round(index - 100)
  })
  return row as Record<"segment" | ProductYear, string | number>
})

type LegendEntry = {
  segment: string
  value: number
  yoy: number | null
}

const legendDataByYear: Record<ProductYear, LegendEntry[]> = PRODUCT_YEARS.reduce(
  (acc, year) => {
    const previousYear = PREVIOUS_YEAR_BY_YEAR[year]
    acc[year] = PRODUCT_SEGMENTS.map((segment) => ({
      segment,
      value: toBillions(productNetSales[year][segment]),
      yoy: previousYear
        ? percentChange(productNetSales[year][segment], productNetSales[previousYear][segment])
        : null,
    }))
    return acc
  },
  {} as Record<ProductYear, LegendEntry[]>
)

const formatBillionUSD = (value: number) =>
  `$${value.toLocaleString("en-US", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })}B`

const formatDelta = (value: number) =>
  `${value > 0 ? "+" : ""}${value.toLocaleString("en-US", {
    maximumFractionDigits: 1,
    minimumFractionDigits: 0,
  })}%`

const formatYoYLine = (_year: ProductYear, yoy: number | null) => {
  if (yoy == null) return "—"
  return formatDelta(yoy)
}

const SEGMENT_LABELS: Record<string, string[]> = {
  "Wearables, Home & Accessories": ["Wearables,", "Home & Accessories"],
}

type SegmentTickProps = {
  payload: { value: string }
  x: number
  y: number
  cx?: number
  cy?: number
}

function SegmentTick({ payload, x, y, cx = 0, cy = 0 }: SegmentTickProps) {
  const lines = SEGMENT_LABELS[payload.value] ?? [payload.value]
  const dx = x - cx
  const dy = y - cy
  const len = Math.sqrt(dx * dx + dy * dy) || 1
  const pushOut = 22
  const factor = (len + pushOut) / len
  const labelX = cx + dx * factor
  const labelY = cy + dy * factor - (lines.length - 1) * 6
  return (
    <text x={labelX} y={labelY} textAnchor="middle" fill={TICK_COLOR} fontSize={11}>
      {lines.map((line, idx) => (
        <tspan key={`${line}-${idx}`} x={labelX} dy={idx === 0 ? 0 : 12}>
          {line}
        </tspan>
      ))}
    </text>
  )
}

export function ChartRadarLinesOnly() {
  const [legendYear, setLegendYear] = useState<ProductYear>(
    PRODUCT_YEARS[PRODUCT_YEARS.length - 1]
  )
  const yearOptions = useMemo(() => [...PRODUCT_YEARS].reverse(), [])
  const legendData = legendDataByYear[legendYear]
  const indexDomain = useMemo(() => {
    const values = chartData.flatMap((entry) =>
      PRODUCT_YEARS.map((year) => entry[year] as number)
    )
    const minVal = Math.min(...values)
    const maxVal = Math.max(...values)
    const pad = 5
    const start = Math.floor((minVal - pad) / 5) * 5
    const end = Math.ceil((maxVal + pad) / 5) * 5
    const ticks: number[] = []
    for (let t = start; t <= end; t += 5) {
      ticks.push(t)
    }
    return { domain: [start, end] as [number, number], ticks }
  }, [])

  return (
    <Card className="relative overflow-hidden border-slate-200 bg-white shadow-none">
      <CardHeader className="flex flex-col gap-4 border-b border-slate-200 pb-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-1">
          <CardTitle className="text-xl font-bold text-slate-900">
            Apple Segments by Revenue
          </CardTitle>
        </div>
        <Select
          value={legendYear}
          onValueChange={(value) => setLegendYear(value as ProductYear)}
        >
          <SelectTrigger className="w-32">
            <SelectValue placeholder="Select year" />
          </SelectTrigger>
          <SelectContent side="top">
            {yearOptions.map((yearOption) => (
              <SelectItem key={yearOption} value={yearOption}>
                {yearOption}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent className="flex flex-col gap-5 p-6 lg:flex-row lg:items-center lg:max-w-5xl">
        <div className="relative w-full flex-[3] min-w-0">
          <div className="relative w-full overflow-hidden rounded-2xl bg-[hsl(var(--secondary))] from-slate-50 to-white">
              <div className="flex flex-col items-center gap-1 p-4">
                <ChartContainer
                  config={chartConfig}
                  className="aspect-square w-full max-w-[400px] text-xs"
                >
                <RadarChart
                  data={chartData}
                  innerRadius={32}
                  outerRadius="70%"
                  margin={{ top: 24, right: 24, bottom: 24, left: 24 }}
                >
                <ChartTooltip
                  cursor={false}
                  content={
                    <ChartTooltipContent
                      indicator="line"
                      formatter={(value, name, payload) => {
                        if (typeof value !== "number") return value
                        const dataKey = (payload && payload.dataKey) || name
                        const yearLabel = `${dataKey}` as ProductYear
                          const segment = (payload?.payload?.segment ||
                            "") as ProductSegment
                          const absoluteMillions = productNetSales[yearLabel]?.[segment]
                          const previousYear = PREVIOUS_YEAR_BY_YEAR[yearLabel]
                          const previousMillions = previousYear
                            ? productNetSales[previousYear]?.[segment]
                            : null
                          const delta =
                            previousYear != null &&
                            absoluteMillions != null &&
                            previousMillions != null
                              ? percentChange(absoluteMillions, previousMillions)
                              : null
                          const deltaLabel = delta != null ? formatDelta(delta) : null
                          const absoluteLabel =
                            absoluteMillions != null
                              ? `${toBillions(absoluteMillions).toLocaleString("en-US", {
                                  minimumFractionDigits: 1,
                                  maximumFractionDigits: 1,
                                })} Billion USD`
                              : "n/a"
                          return (
                            <div className="flex flex-col gap-1 text-xs">
                              <div className="flex items-center gap-2">
                                <span
                                  className="h-2.5 w-2.5 rounded-full"
                                  style={{ backgroundColor: yearColorMap[yearLabel] }}
                                  aria-hidden="true"
                                />
                                <span className="font-semibold text-foreground">{yearLabel}</span>
                              </div>
                              <span className="text-foreground">{absoluteLabel}</span>
                              <span className="text-[11px] text-muted-foreground">
                                {deltaLabel ? deltaLabel : "—"}
                              </span>
                            </div>
                          )
                      }}
                    />
                  }
                  />
                  <PolarAngleAxis
                    dataKey="segment"
                    tickLine={false}
                    axisLine={false}
                    tick={(props) => <SegmentTick {...(props as SegmentTickProps)} />}
                  />
                  <PolarGrid stroke={GRID_COLOR} radialLines={false} />
                  <PolarRadiusAxis
                    angle={90}
                    tickLine={false}
                    axisLine={false}
                    domain={indexDomain.domain}
                    tick={false}
                  />
                  {PRODUCT_YEARS.map((year, idx) => {
                    const stroke = yearColorMap[year]
                    const strokeWidth = Math.max(2, 3 - idx * 0.25)
                    return (
                      <Radar
                        key={year}
                        dataKey={year}
                        name={year}
                        fill="none"
                        stroke={stroke}
                        strokeWidth={strokeWidth}
                        fillOpacity={0}
                      />
                    )
                  })}
                </RadarChart>
              </ChartContainer>
              <div className="flex w-full flex-wrap items-center justify-center gap-3 text-xs text-muted-foreground">
                {PRODUCT_YEARS.map((year) => (
                  <span
                    key={year}
                  className="flex h-7 w-7 items-center justify-center rounded-full text-[9px] font-semibold text-white ring-1 ring-slate-200/60"
                    style={{ backgroundColor: yearColorMap[year] }}
                    aria-label={`FY${year}`}
                  >
                    {year}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
        <div className="flex w-full flex-col gap-2 text-xs text-slate-500 lg:w-80 lg:flex-[2] lg:self-center lg:overflow-y-auto">
          <div className="flex w-full flex-col gap-1.5">
            {legendData.map((entry) => {
              const IconComponent = segmentIcons[entry.segment as ProductSegment] as
                | ComponentType<{ className?: string }>
                | undefined
              return (
                <div key={entry.segment} className="flex w-full flex-col">
                  <div className="flex w-full items-center justify-between rounded-md bg-card/90 px-2.5 py-1.5 text-[10px]">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[hsl(var(--secondary))] text-foreground">
                        {IconComponent ? (
                          <IconComponent className="h-3.5 w-3.5" aria-hidden="true" />
                        ) : (
                          <svg
                            aria-hidden="true"
                            className="h-3.5 w-3.5"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.4"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <circle cx="12" cy="12" r="8" />
                          </svg>
                        )}
                      </span>
                      <span className="text-sm font-semibold text-foreground break-words leading-tight">
                        {entry.segment}
                      </span>
                    </div>
                    <div className="flex flex-col items-end gap-0.5 text-[10px] font-medium text-muted-foreground min-w-[7.5rem]">
                      <span className="text-[11px] font-semibold text-foreground">
                        {formatBillionUSD(entry.value)}
                      </span>
                      <span className="text-[9px] text-muted-foreground">
                        {formatYoYLine(legendYear, entry.yoy)}
                      </span>
                    </div>
                  </div>
                  <div className="mx-2 border-b border-slate-200/70" />
                </div>
              )
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
