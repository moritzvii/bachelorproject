export type ActionWeightKey = "forecast" | "risk" | "strategyFit"

export type ActionWeightConfig = Record<ActionWeightKey, number>


export const DEFAULT_ACTION_WEIGHTS: ActionWeightConfig = {
  forecast: 34,
  risk: 33,
  strategyFit: 33,
}
