import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import { MAX_BANDWIDTH } from "./matrix-chart";

type IntervalControls = {
  riskMean: number | null;
  forecastMean: number | null;
  riskWidth: number | null;
  forecastWidth: number | null;
  onRiskMeanChange: (value: number) => void;
  onForecastMeanChange: (value: number) => void;
  onRiskWidthChange: (value: number) => void;
  onForecastWidthChange: (value: number) => void;
  label: string;
  accent?: string;
};

type MatrixControlsProps = {
  baseline?: IntervalControls;
  calibrated?: IntervalControls;
  showBaseline?: boolean;
  disabled?: boolean;
  className?: string;
};

const CompactSlider = ({
  label,
  value,
  min,
  max,
  step,
  onChange,
  suffix = "",
  disabled = false,
}: {
  label: string;
  value: number | null;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
  suffix?: string;
  disabled?: boolean;
}) => {
  const safeValue = value ?? min;
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">
        <span>{label}</span>
        <span className="rounded-full bg-slate-900 px-2 py-0.5 text-[10px] text-white">
          {Math.round(safeValue * (suffix ? 1 : 100))}
          {suffix || "%"}
        </span>
      </div>
      <Slider
        value={[safeValue]}
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        onValueChange={(vals) => onChange(vals[0] ?? safeValue)}
      />
    </div>
  );
};

export function MatrixControls({
  baseline,
  calibrated,
  showBaseline = true,
  disabled = false,
  className,
}: MatrixControlsProps) {
  const groups: Array<{ key: string; title: string; color: string; data: IntervalControls }> = [];

  if (showBaseline && baseline) {
    groups.push({
      key: "ai",
      title: baseline.label,
      color: "border-slate-200/80",
      data: baseline,
    });
  }

  if (calibrated) {
    groups.push({
      key: "calibrated",
      title: calibrated.label,
      color: "border-slate-200/80",
      data: calibrated,
    });
  }

  if (!groups.length) {
    return null;
  }

  return (
    <div className={cn("space-y-3", className)}>
      {groups.map(({ key, title, color, data }) => (
        <div
          key={key}
          className={cn(
            "rounded-xl border bg-white/80 p-3 shadow-none backdrop-blur-0",
            color
          )}
        >
          <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-600">
            {title}
          </div>
          <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600">
            <span>Risk μ: {data.riskMean != null ? Math.round(data.riskMean * 100) + "%" : "—"}</span>
            <span>Risk ±: {data.riskWidth != null ? Math.round(data.riskWidth) + "%" : "—"}</span>
            <span>Forecast μ: {data.forecastMean != null ? Math.round(data.forecastMean * 100) + "%" : "—"}</span>
            <span>Forecast ±: {data.forecastWidth != null ? Math.round(data.forecastWidth) + "%" : "—"}</span>
          </div>
          <div className="space-y-3">
            <CompactSlider
              label="Risk μ"
              value={data.riskMean}
              min={0}
              max={1}
              step={0.01}
              onChange={data.onRiskMeanChange}
              disabled={disabled}
            />
            <CompactSlider
              label="Risk ±"
              value={data.riskWidth}
              min={0}
              max={MAX_BANDWIDTH}
              step={1}
              onChange={data.onRiskWidthChange}
              suffix="%"
              disabled={disabled}
            />
            <CompactSlider
              label="Forecast μ"
              value={data.forecastMean}
              min={0}
              max={1}
              step={0.01}
              onChange={data.onForecastMeanChange}
              disabled={disabled}
            />
            <CompactSlider
              label="Forecast ±"
              value={data.forecastWidth}
              min={0}
              max={MAX_BANDWIDTH}
              step={1}
              onChange={data.onForecastWidthChange}
              suffix="%"
              disabled={disabled}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
