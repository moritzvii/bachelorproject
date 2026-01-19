export const formatMillionUSD = (value?: number) =>
  value == null
    ? "—"
    : `$${value.toLocaleString("en-US", { maximumFractionDigits: 0 })}M`

export const formatYoY = (current?: number, previous?: number) => {
  if (current == null || previous == null || previous === 0) return "n/a"
  const diff = ((current - previous) / previous) * 100
  const formatted = diff.toFixed(1)
  return `${diff >= 0 ? "+" : ""}${formatted}%`
}
