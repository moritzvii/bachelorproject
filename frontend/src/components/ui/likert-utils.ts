export const LIKERT_STEPS = 7
export const STEP_VALUES = [0, 1, 2, 3, 4, 5, 6] 

export const likertToPercent = (likertValue: number): number =>
  Math.round((likertValue / 6) * 100)

export const percentToLikert = (percent: number): number =>
  Math.round((percent / 100) * 6)
