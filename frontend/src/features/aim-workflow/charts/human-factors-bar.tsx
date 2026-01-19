"use client";

import { Bar, BarChart, Cell, LabelList, XAxis, YAxis } from "recharts";

import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { ScoreBadge } from "@/features/aim-workflow/badges/score-badge";

type HumanFactorsBarDatum = {
  metric: string;
  ai: number; 
  final: number; 
};

const chartConfig: ChartConfig = {
  barValue: {
    label: "Score",
  },
};

type HumanJudgmentGradientBarChartProps = {
  data: HumanFactorsBarDatum[];
  
  barColors?: string[];
  
  deltaColors?: [string, string];
};

export function HumanJudgmentGradientBarChart({ data, barColors, deltaColors }: HumanJudgmentGradientBarChartProps) {
  const chartData = data.map((row, index) => {
    const ai = Math.round(row.ai);
    const final = Math.round(row.final);
    const barValue = Math.max(ai, final);
    const delta = final - ai;
    const deltaLabel = delta === 0 ? "" : `${delta > 0 ? "+" : ""}${delta} PP`;
    return {
      id: index,
      metric: row.metric,
      ai,
      final,
      barValue,
      deltaLabel,
    };
  });

  const barSize = 48;
  const barGap = 12;
  const chartHeight = chartData.length * (barSize + barGap) + 16;

  return (
    <div className="flex h-full w-full flex-col">
      <div className="flex min-h-0 flex-1 items-start justify-start">
        <ChartContainer
          config={chartConfig}
          className="w-full"
          style={{ height: chartHeight }}
        >
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ left: 0, right: 140, top: 0, bottom: 0 }}
            barCategoryGap="10%"
            barGap={barGap}
          >
            <YAxis
              dataKey="metric"
              type="category"
              tickLine={false}
              axisLine={false}
              hide
            />
            <XAxis
              type="number"
              domain={[0, 100]}
              tickLine={false}
              axisLine={false}
              tickMargin={6}
              tickFormatter={(value) => `${value}%`}
              hide
            />

            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent
                  hideLabel
                  formatter={(_, __, props: any) => {
                    const metric = props?.payload?.metric as string | undefined;
                    const final = props?.payload?.final as number;
                    if (typeof final === "number" && Number.isFinite(final)) {
                      return [`${metric ?? "Score"} — ${Math.round(final)}%`, ""];
                    }
                    return ["", ""];
                  }}
                />
              }
            />

            <Bar dataKey="barValue" barSize={barSize} radius={[0, 8, 8, 0]}>
              {chartData.map((row, index) => {
                if (row.barValue === 0) {
                  return <Cell key={`cell-${index}`} fill="#4b5563" />;
                }
                const gradientId = `hj-gradient-${index}`;
                return <Cell key={`cell-${index}`} fill={`url(#${gradientId})`} />;
              })}
              <LabelList
                dataKey="metric"
                position="insideLeft"
                offset={8}
                fontSize={11}
                content={(props: any) => {
                  const { x, y, value, height } = props;
                  if (!value) return null;

                  const words = value.split(' ');
                  const line1 = words[0];
                  const line2 = words.slice(1).join(' ');

                  const centerY = y + height / 2;

                  return (
                    <text fill="rgb(255 255 255 / 0.8)" fontSize={11} textAnchor="start" dominantBaseline="middle">
                      <tspan x={x + 8} y={centerY - 6}>{line1}</tspan>
                      {line2 && <tspan x={x + 8} y={centerY + 6}>{line2}</tspan>}
                    </text>
                  );
                }}
              />
              <LabelList
                dataKey="deltaLabel"
                position="insideRight"
                offset={8}
                className="fill-white font-semibold"
                fontSize={11}
              />
              <LabelList
                dataKey="final"
                position="right"
                offset={10}
                content={(props: any) => {
                  const { x, y, value, index, viewBox, width, height } = props ?? {};
                  if (typeof x !== "number" || typeof y !== "number") return null;
                  const safeValue = typeof value === "number" ? value : Number(value);
                  if (!Number.isFinite(safeValue)) return null;

                  if (typeof index === "number" && index < 2) {
                    const sourceTypeMap: Array<"forecast" | "risk"> = ["forecast", "risk", "forecast", "risk"];
                    const sourceType = sourceTypeMap[index] ?? "forecast";
                    const vbX = typeof viewBox?.x === "number" ? viewBox.x : x;
                    const vbW = typeof viewBox?.width === "number" ? viewBox.width : width ?? 0;
                    const vbY = typeof viewBox?.y === "number" ? viewBox.y : y;
                    const vbH = typeof viewBox?.height === "number" ? viewBox.height : height ?? 0;
                    const badgeWidth = 68;
                    const badgeHeight = 26;
                    const baseX = vbX + vbW + 12;
                    const centerY = vbY + vbH / 2;
                    const badgeX = baseX;
                    const badgeY = centerY - badgeHeight / 2;
                    return (
                      <foreignObject x={badgeX} y={badgeY} width={badgeWidth} height={badgeHeight} overflow="visible">
                        <ScoreBadge
                          entailment={safeValue}
                          contradiction={safeValue}
                          combinedScore={safeValue}
                          sourceType={sourceType}
                          className="border-white/15 bg-black text-white"
                        />
                      </foreignObject>
                    );
                  }

                  return (
                    <text
                      x={(typeof width === "number" ? x + width : x) + 8}
                      y={typeof height === "number" ? y + height / 2 : y}
                      fill="currentColor"
                      fontSize={12}
                      fontWeight={600}
                      textAnchor="start"
                      dominantBaseline="middle"
                    >
                      {`${safeValue}%`}
                    </text>
                  );
                }}
              />
            </Bar>

            <defs>
              {chartData.map((row, index) => {
                const ai = row.ai;
                const final = row.final;
                const max = row.barValue;
                if (max === 0) return null;

                const min = Math.min(ai, final);
                const ratio = min / max;
                const increased = final > ai;
                const colorDelta = increased
                  ? deltaColors?.[0] || "#22c55e"
                  : deltaColors?.[1] || "#ef4444";
                const gradientId = `hj-gradient-${index}`;
                const base = barColors?.[index] || "#4b5563";

                return (
                  <linearGradient key={gradientId} id={gradientId} x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor={base} />
                    <stop offset={`${ratio * 100}%`} stopColor={base} />
                    <stop offset={`${ratio * 100}%`} stopColor={colorDelta} />
                    <stop offset="100%" stopColor={colorDelta} />
                  </linearGradient>
                );
              })}
            </defs>
          </BarChart>
        </ChartContainer>
      </div>

      <div className="mt-4 text-xs text-muted-foreground">
        <p>
        </p>
      </div>
    </div>
  );
}
