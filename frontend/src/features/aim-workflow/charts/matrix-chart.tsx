"use client";

import React from "react";
import {
  CartesianGrid,
  ReferenceArea,
  ReferenceLine,
  Scatter,
  ScatterChart,
  XAxis,
  YAxis,
  Customized,
} from "recharts";

import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { cn } from "@/lib/utils";
import { STRATEGY_CELLS, getStrategyIcon, type StrategyCell } from "@/data/strategy-matrix";
import { matrixGridCells } from "./matrix-grid";

const CHART_CONFIG = {
  range: {
    label: "Matrix range",
    color: "#111827", 
  },
  center: {
    label: "Central tendency",
    color: "#d7c2a4", 
  },
} satisfies ChartConfig;

const AXIS_LABELS = {
  x: ["Low Risk Exposure", "Medium Risk Exposure", "High Risk Exposure"],
  y: ["High", "Medium", "Low"],
};
const Y_BUCKET_LABELS = ["High", "Medium", "Low"];

const MARGINS = {
  top: 20,
  right: 20,
  bottom: 28,
  left: 28,
};

const IMPORTANCE_ALPHA = 0.6; 
export const MAX_BANDWIDTH = 100; 
const HALF_WIDTH_MAX = 1; 
const SECONDARY_OFFSET = 0.12; 

const wrapText = (value: string, maxLength = 14): string[] => {
  if (!value) return [];
  const words = value.split(" ");
  const lines: string[] = [];
  let currentLine = "";
  words.forEach((word) => {
    const tentative = currentLine ? `${currentLine} ${word}` : word;
    if (tentative.length > maxLength && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else if (tentative.length > maxLength) {
      lines.push(word);
      currentLine = "";
    } else {
      currentLine = tentative;
    }
  });
  if (currentLine) {
    lines.push(currentLine);
  }
  return lines;
};

export type MatrixChartProps = {
  className?: string;
  forecastMin: number;
  forecastMax: number;
  forecastMode?: number;
  riskMin: number;
  riskMax: number;
  riskMode?: number;
  label?: string;
  controlsPlacement?: "below" | "right";
  showControls?: boolean;
  showDescription?: boolean;
  stateOverrides?: Partial<MatrixState>;
};

type MatrixState = {
  centerX: number;
  centerY: number;
  bandWidthX: number;
  bandWidthY: number;
  comparisonCenterX: number;
  comparisonCenterY: number;
  comparisonBandWidthX: number;
  comparisonBandWidthY: number;
  showImportanceCore: boolean;
  hideBandWidth?: boolean;
  hideBadge?: boolean;
  hideBaseline?: boolean;
};

type MatrixInterval = {
  min: number;
  mode: number;
  max: number;
};
const clamp01 = (value: number) => Math.max(0, Math.min(1, value));

const computeMatrixInterval = (
  mode: number,
  bandWidth: number
): MatrixInterval => {
  const safeMode = clamp01(mode);
  const halfWidth = Math.min(HALF_WIDTH_MAX, bandWidth / 100);

  return {
    min: clamp01(safeMode - halfWidth),
    mode: safeMode,
    max: clamp01(safeMode + halfWidth),
  };
};

const computeCoreInterval = (
  interval: MatrixInterval,
  alpha: number
): { min: number; max: number } => {
  const scale = 1 - clamp01(alpha);
  const leftSpan = interval.mode - interval.min;
  const rightSpan = interval.max - interval.mode;

  return {
    min: clamp01(interval.mode - leftSpan * scale),
    max: clamp01(interval.mode + rightSpan * scale),
  };
};

export const MatrixChart: React.FC<MatrixChartProps> = ({
  className,
  forecastMin,
  forecastMax,
  forecastMode,
  riskMin,
  riskMax,
  riskMode,
  label,
  controlsPlacement = "below",
  showControls = true,
  showDescription = true,
  stateOverrides,
}) => {
  const forecastModeBase = clamp01(
    forecastMode ?? (clamp01(forecastMin) + clamp01(forecastMax)) / 2
  );
  const riskModeBase = clamp01(
    riskMode ?? (clamp01(riskMin) + clamp01(riskMax)) / 2
  );
  const comparisonForecastModeBase = clamp01(forecastModeBase + SECONDARY_OFFSET);
  const comparisonRiskModeBase = clamp01(riskModeBase - SECONDARY_OFFSET);

  const [centerX, setCenterX] = React.useState(forecastModeBase);
  const [centerY, setCenterY] = React.useState(riskModeBase);
  const [bandWidthX] = React.useState(12);
  const [bandWidthY] = React.useState(12);
  const [comparisonCenterX, setComparisonCenterX] = React.useState(
    comparisonForecastModeBase
  );
  const [comparisonCenterY, setComparisonCenterY] = React.useState(
    comparisonRiskModeBase
  );
  const [comparisonBandWidthX] = React.useState(12);
  const [comparisonBandWidthY] = React.useState(8);
  const [showImportanceCore] = React.useState(false);
  const [hideBandWidth] = React.useState(false);
  const [hideBadge] = React.useState(false);
  const [hideBaseline] = React.useState(false);

  React.useEffect(() => setCenterX(forecastModeBase), [forecastModeBase]);
  React.useEffect(() => setCenterY(riskModeBase), [riskModeBase]);
  React.useEffect(
    () => setComparisonCenterX(comparisonForecastModeBase),
    [comparisonForecastModeBase]
  );
  React.useEffect(
    () => setComparisonCenterY(comparisonRiskModeBase),
    [comparisonRiskModeBase]
  );

  const effective: MatrixState = {
    centerX: stateOverrides?.centerX ?? centerX,
    centerY: stateOverrides?.centerY ?? centerY,
    bandWidthX: stateOverrides?.bandWidthX ?? bandWidthX,
    bandWidthY: stateOverrides?.bandWidthY ?? bandWidthY,
    comparisonCenterX: stateOverrides?.comparisonCenterX ?? comparisonCenterX,
    comparisonCenterY: stateOverrides?.comparisonCenterY ?? comparisonCenterY,
    comparisonBandWidthX:
      stateOverrides?.comparisonBandWidthX ?? comparisonBandWidthX,
    comparisonBandWidthY:
      stateOverrides?.comparisonBandWidthY ?? comparisonBandWidthY,
    showImportanceCore: stateOverrides?.showImportanceCore ?? showImportanceCore,
    hideBandWidth: stateOverrides?.hideBandWidth ?? hideBandWidth,
    hideBadge: stateOverrides?.hideBadge ?? hideBadge,
    hideBaseline: stateOverrides?.hideBaseline ?? hideBaseline,
  };
  const showBandGuides = !effective.hideBandWidth;
  const showBaseline = !effective.hideBaseline;

  const forecastMatrix = computeMatrixInterval(effective.centerX, effective.bandWidthX);
  const riskMatrix = computeMatrixInterval(effective.centerY, effective.bandWidthY);
  const comparisonForecastMatrix = computeMatrixInterval(
    effective.comparisonCenterX,
    effective.comparisonBandWidthX
  );
  const comparisonRiskMatrix = computeMatrixInterval(
    effective.comparisonCenterY,
    effective.comparisonBandWidthY
  );

  const coreForecast = computeCoreInterval(forecastMatrix, IMPORTANCE_ALPHA);
  const coreRisk = computeCoreInterval(riskMatrix, IMPORTANCE_ALPHA);
  const comparisonCoreForecast = computeCoreInterval(
    comparisonForecastMatrix,
    IMPORTANCE_ALPHA
  );
  const comparisonCoreRisk = computeCoreInterval(
    comparisonRiskMatrix,
    IMPORTANCE_ALPHA
  );

  const centerPoint = {
    x: forecastMatrix.mode,
    y: riskMatrix.mode,
    name: "Mode (AI)",
  };
  const comparisonCenterPoint = {
    x: comparisonForecastMatrix.mode,
    y: comparisonRiskMatrix.mode,
    name: "Mode (Scenario B)",
  };
  const cornerArrows = [
    {
      from: { x: forecastMatrix.min, y: riskMatrix.min },
      to: { x: comparisonForecastMatrix.min, y: comparisonRiskMatrix.min },
    },
    {
      from: { x: forecastMatrix.max, y: riskMatrix.min },
      to: { x: comparisonForecastMatrix.max, y: comparisonRiskMatrix.min },
    },
    {
      from: { x: forecastMatrix.min, y: riskMatrix.max },
      to: { x: comparisonForecastMatrix.min, y: comparisonRiskMatrix.max },
    },
    {
      from: { x: forecastMatrix.max, y: riskMatrix.max },
      to: { x: comparisonForecastMatrix.max, y: comparisonRiskMatrix.max },
    },
  ];

  const squareStyle = {
    width: "min(100%, calc(100vh - 160px))",
    height: "min(80vh, calc(100vh - 160px))",
  };
  const showInlineControls = controlsPlacement === "right" && showControls;

  return (
    <div className={cn("flex w-full flex-col gap-6", className)}>
      
      {showDescription && (
        <div className="flex flex-col gap-2">
          {label && <div className="text-lg font-semibold text-zinc-400">{label}</div>}
          <div className="text-sm text-slate-600">
            AI provides the <span className="font-semibold text-slate-900">mode</span>{" "}
            (central point); you shape the{" "}
            <span className="font-semibold text-slate-900">uncertainty interval</span>{" "}
            (bandwidth). Both scenarios can be adjusted independently; optionally, an
            inner importance band highlights the core around each mode.
          </div>
        </div>
      )}

      <div
        className={cn(
          "w-full",
          showInlineControls
            ? "grid gap-6 items-start lg:grid-cols-[minmax(0,1fr)_360px]"
            : "flex flex-col gap-6"
        )}
      >
        
        <div
          className="relative mx-auto flex h-full w-full max-w-full items-center justify-center p-4 lg:p-6"
          style={squareStyle}
        >
          <ChartContainer
            config={CHART_CONFIG}
            className="h-full w-full [&_.recharts-surface]:overflow-visible"
          >
            <ScatterChart margin={MARGINS}>
              <CartesianGrid
                stroke="#3f3f46"
                strokeWidth={0.5}
                strokeOpacity={0.3}
                strokeDasharray="1 3"
              />

            <XAxis
              type="number"
              dataKey="x"
              domain={[0, 1]}
              ticks={[0, 0.5, 1]}
              tickLine={false}
              axisLine={{ stroke: "hsl(var(--chart-5))", strokeWidth: 1 }}
              tickFormatter={(value: number) => {
                if (value <= 0.01) return AXIS_LABELS.x[0];
                if (value >= 0.99) return AXIS_LABELS.x[2];
                return AXIS_LABELS.x[1];
              }}
              tick={false}
            />

            <YAxis
              type="number"
              dataKey="y"
              domain={[0, 1]}
              ticks={[0, 0.5, 1]}
              tickLine={false}
              axisLine={{ stroke: "hsl(var(--chart-5))", strokeWidth: 1 }}
              tickFormatter={(value: number) => {
                if (value <= 0.01) return AXIS_LABELS.y[2];
                if (value >= 0.99) return AXIS_LABELS.y[0];
                return AXIS_LABELS.y[1];
              }}
              tick={false}
            />

            <ChartTooltip
              cursor={{ strokeDasharray: "3 3", stroke: "#71717a" }}
              content={
                <ChartTooltipContent
                  hideIndicator
                  formatter={(value, name) => {
                    const labelMap: Record<string, string> = {
                      x: "Risk (X)",
                      y: "Forecast (Y)",
                    };
                    const friendly = name && labelMap[name] ? labelMap[name] : name || "";
                    const safeVal = `${Math.round(Number(value) * 100)}% ${friendly}`.trim();
                    return [safeVal, ""];
                  }}
                  className="bg-zinc-800/95 border-white/10 text-white backdrop-blur-sm"
                />
              }
            />

            
            {matrixGridCells}

            
            <Customized
              component={(props: any) => {
                const offset = props?.offset || { left: 0, top: 0, width: 0, height: 0 };
                const width = offset?.width ?? 0;
                const height = offset?.height ?? 0;
                const clampNum = (val: number, min: number, max: number) =>
                  Math.max(min, Math.min(max, val));
                const iconSize = clampNum(width / 40, 12, 20);
                const labelFontSize = clampNum(width / 50, 10, 13);
                const bucketFontSize = clampNum(width / 60, 10, 12);
                const axisTitleSize = clampNum(width / 20, 14, 20);

                const xPositions = [width * (1 / 6), width * 0.5, width * (5 / 6)];
                const yPositions = [height * (1 / 6), height * 0.5, height * (5 / 6)];
                const percentTicks = [0, 0.25, 0.5, 0.75, 1];

                return (
                  <g className="pointer-events-none select-none">
                    
                    {AXIS_LABELS.x.map((label, idx) => (
                      <text
                        key={`x-label-${label}`}
                        x={offset.left + xPositions[idx]}
                        y={offset.top - 8}
                        textAnchor="middle"
                        fill="#e2e8f0"
                        fontSize={bucketFontSize}
                        fontWeight={700}
                      >
                        {label}
                      </text>
                    ))}

                    
                    {Y_BUCKET_LABELS.map((label, idx) => (
                      <text
                        key={`y-label-${label}`}
                        x={offset.left + width + 12}
                        y={offset.top + yPositions[idx] + 4}
                        textAnchor="start"
                        fill="#e2e8f0"
                        fontSize={bucketFontSize}
                        fontWeight={700}
                      >
                        {label}
                      </text>
                    ))}

                    
                    <text
                      x={offset.left + width / 2}
                      y={offset.top + height + 72}
                      textAnchor="middle"
                      fill="#d7c2a4"
                      fontSize={axisTitleSize - 4}
                      fontWeight={800}
                    >
                      Strength of Business Unit (Risk Exposure)
                    </text>
                    <text
                      x={offset.left - 80}
                      y={offset.top + height / 2}
                      textAnchor="middle"
                      fill="#d7c2a4"
                      fontSize={axisTitleSize - 4}
                      fontWeight={800}
                      transform={`rotate(-90 ${offset.left - 80} ${offset.top + height / 2})`}
                    >
                      Market Attractiveness (Forecast-based)
                    </text>

                    
                    {percentTicks.map((t) => (
                      <text
                        key={`x-tick-${t}`}
                        x={offset.left + width * t}
                        y={offset.top + height + 16}
                        textAnchor="middle"
                        fill="#cbd5e1"
                        fontSize={9}
                        fontWeight={600}
                        opacity={0.7}
                      >
                        {Math.round(t * 100)}%
                      </text>
                    ))}
                    {percentTicks.map((t) => (
                      <text
                        key={`y-tick-${t}`}
                        x={offset.left - 20}
                        y={offset.top + height - height * t}
                        textAnchor="end"
                        fill="#cbd5e1"
                        fontSize={9}
                        fontWeight={600}
                        opacity={0.7}
                        dominantBaseline="middle"
                      >
                        {Math.round(t * 100)}%
                      </text>
                    ))}

                    
                    {yPositions.map((yPos, rowIdx) =>
                      xPositions.map((xPos, colIdx) => {
                        const cell: StrategyCell | undefined =
                          STRATEGY_CELLS[rowIdx]?.[colIdx];
                        const IconComponent = getStrategyIcon(cell?.icon);
                        const titleLines = wrapText(cell?.title ?? "");
                        return (
                          <g
                            key={`quad-${rowIdx}-${colIdx}`}
                            transform={`translate(${offset.left + xPos}, ${offset.top + yPos})`}
                          >
                            <IconComponent
                              size={iconSize}
                              stroke="#ffffff"
                              strokeWidth={2}
                              fill="none"
                              transform={`translate(${-iconSize / 2}, ${-iconSize * 0.75})`}
                            />
                            <text
                              x={0}
                              y={12}
                              textAnchor="middle"
                              fill="#ffffff"
                              fontSize={labelFontSize}
                              fontWeight={700}
                              dominantBaseline="middle"
                            >
                              {titleLines.map((line, idx) => (
                                <tspan key={idx} x={0} dy={idx === 0 ? 0 : labelFontSize + 2}>
                                  {line}
                                </tspan>
                              ))}
                            </text>
                          </g>
                        );
                      })
                    )}
                  </g>
                );
              }}
            />

            
            <defs>
              <marker
                id="arrowhead"
                markerWidth="6"
                markerHeight="6"
                refX="5"
                refY="3"
                orient="auto"
                markerUnits="strokeWidth"
              >
                <path
                  d="M1 1 L5 3 L1 5"
                  fill="none"
                  stroke="#e5e7eb"
                  strokeWidth="1.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  opacity={0.6}
                />
              </marker>
            </defs>

            {showBaseline && (
              <>
                <ReferenceArea
                  x1={forecastMatrix.min}
                  x2={forecastMatrix.max}
                  y1={riskMatrix.min}
                  y2={riskMatrix.max}
                  fill="rgba(17, 24, 39, 0.04)"
                  stroke="#111827"
                  strokeWidth={1.5}
                  strokeOpacity={0.35}
                />
                <ReferenceLine
                  x={forecastMatrix.min}
                  stroke="#111827"
                  strokeDasharray="4 6"
                  strokeWidth={1.5}
                  strokeOpacity={showBandGuides ? 0.35 : 0}
                />
                <ReferenceLine
                  x={forecastMatrix.max}
                  stroke="#111827"
                  strokeDasharray="4 6"
                  strokeWidth={1.5}
                  strokeOpacity={showBandGuides ? 0.45 : 0}
                />
                <ReferenceLine
                  y={riskMatrix.min}
                  stroke="#111827"
                  strokeDasharray="4 6"
                  strokeWidth={1.5}
                  strokeOpacity={showBandGuides ? 0.45 : 0}
                />
                <ReferenceLine
                  y={riskMatrix.max}
                  stroke="#111827"
                  strokeDasharray="4 6"
                  strokeWidth={1.5}
                  strokeOpacity={showBandGuides ? 0.45 : 0}
                />
                <Scatter name="Scenario A" data={[centerPoint]} fill="#111827" opacity={0.7} />
              </>
            )}

            {showBandGuides && showImportanceCore && (
              <>
                <ReferenceArea
                  x1={coreForecast.min}
                  x2={coreForecast.max}
                  y1={coreRisk.min}
                  y2={coreRisk.max}
                  fill="rgba(168, 85, 247, 0.35)"
                  stroke="#a78bfa"
                  strokeDasharray="3 3"
                  strokeWidth={2}
                />
                <ReferenceLine
                  x={coreForecast.min}
                  stroke="#a78bfa"
                  strokeDasharray="3 3"
                  strokeWidth={1.8}
                />
                <ReferenceLine
                  x={coreForecast.max}
                  stroke="#a78bfa"
                  strokeDasharray="3 3"
                  strokeWidth={1.8}
                />
                <ReferenceLine
                  y={coreRisk.min}
                  stroke="#a78bfa"
                  strokeDasharray="3 3"
                  strokeWidth={1.8}
                />
                <ReferenceLine
                  y={coreRisk.max}
                  stroke="#a78bfa"
                  strokeDasharray="3 3"
                  strokeWidth={1.8}
                />
              </>
            )}


            
            <ReferenceArea
              x1={comparisonForecastMatrix.min}
              x2={comparisonForecastMatrix.max}
              y1={comparisonRiskMatrix.min}
              y2={comparisonRiskMatrix.max}
              fill="rgba(215, 194, 164, 0.6)"
              stroke="#d7c2a4"
              strokeWidth={2.6}
              strokeOpacity={0.9}
            />
            <Scatter name="Scenario B" data={[comparisonCenterPoint]} fill="#d7c2a4" opacity={1} />
            <ReferenceLine
              x={comparisonForecastMatrix.min}
              stroke="#d7c2a4"
              strokeDasharray="6 6"
              strokeWidth={2.2}
              strokeOpacity={showBandGuides ? 0.8 : 0}
            />
            <ReferenceLine
              x={comparisonForecastMatrix.max}
              stroke="#d7c2a4"
              strokeDasharray="6 6"
              strokeWidth={2.2}
              strokeOpacity={showBandGuides ? 0.8 : 0}
            />
            <ReferenceLine
              y={comparisonRiskMatrix.min}
              stroke="#d7c2a4"
              strokeDasharray="6 6"
              strokeWidth={2.2}
              strokeOpacity={showBandGuides ? 0.8 : 0}
            />
            <ReferenceLine
              y={comparisonRiskMatrix.max}
              stroke="#d7c2a4"
              strokeDasharray="6 6"
              strokeWidth={2.2}
              strokeOpacity={showBandGuides ? 0.8 : 0}
            />

            
            {showBaseline && (
              <ReferenceArea
                x1={forecastMatrix.min}
                x2={forecastMatrix.max}
                y1={riskMatrix.min}
                y2={riskMatrix.max}
                fill="none"
                stroke="#111827"
                strokeWidth={2}
                strokeOpacity={0.65}
              />
            )}
            {showBaseline && (
              <>
                <ReferenceLine
                  x={forecastMatrix.min}
                  stroke="#111827"
                  strokeDasharray="6 6"
                  strokeWidth={1.8}
                  strokeOpacity={showBandGuides ? 0.55 : 0}
                />
                <ReferenceLine
                  x={forecastMatrix.max}
                  stroke="#111827"
                  strokeDasharray="6 6"
                  strokeWidth={1.8}
                  strokeOpacity={showBandGuides ? 0.6 : 0}
                />
                <ReferenceLine
                  y={riskMatrix.min}
                  stroke="#111827"
                  strokeDasharray="6 6"
                  strokeWidth={1.8}
                  strokeOpacity={showBandGuides ? 0.6 : 0}
                />
                <ReferenceLine
                  y={riskMatrix.max}
                  stroke="#111827"
                  strokeDasharray="6 6"
                  strokeWidth={1.8}
                  strokeOpacity={showBandGuides ? 0.6 : 0}
                />
              </>
            )}

            
            {showBaseline &&
              cornerArrows.map(({ from, to }) => (
                <ReferenceLine
                  key={`corner-arrow-${from.x}-${from.y}-${to.x}-${to.y}`}
                  segment={[from, to]}
                  stroke="#e5e7eb"
                  strokeWidth={3.2}
                  strokeOpacity={0.8}
                  strokeDasharray="2 4"
                  markerEnd="url(#arrowhead)"
                />
              ))}

            {showBandGuides && showImportanceCore && (
              <>
                <ReferenceArea
                  x1={comparisonCoreForecast.min}
                  x2={comparisonCoreForecast.max}
                  y1={comparisonCoreRisk.min}
                  y2={comparisonCoreRisk.max}
                  fill="rgba(244, 114, 182, 0.35)"
                  stroke="#f472b6"
                  strokeDasharray="3 3"
                  strokeWidth={2}
                />
                <ReferenceLine
                  x={comparisonCoreForecast.min}
                  stroke="#f472b6"
                  strokeDasharray="3 3"
                  strokeWidth={1.8}
                />
                <ReferenceLine
                  x={comparisonCoreForecast.max}
                  stroke="#f472b6"
                  strokeDasharray="3 3"
                  strokeWidth={1.8}
                />
                <ReferenceLine
                  y={comparisonCoreRisk.min}
                  stroke="#f472b6"
                  strokeDasharray="3 3"
                  strokeWidth={1.8}
                />
                <ReferenceLine
                  y={comparisonCoreRisk.max}
                  stroke="#f472b6"
                  strokeDasharray="3 3"
                  strokeWidth={1.8}
                />
              </>
            )}
            </ScatterChart>
          </ChartContainer>
        </div>

      </div>
    </div>
  );
};

export default MatrixChart;
