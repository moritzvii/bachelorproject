const DEFAULT_API_BASE_URL = "http://localhost:8000";

export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? DEFAULT_API_BASE_URL).replace(
  /\/$/,
  "",
);

export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers ?? {}),
    },
    ...options,
  });

  const text = await response.text();
  if (!response.ok) {
    throw new Error(`API error ${response.status}: ${text || response.statusText}`);
  }

  if (!text) {
    return null as T;
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    return text as unknown as T;
  }
}

export type ScoreInterval = {
  mean?: number | null;
  lower?: number | null;
  upper?: number | null;
  half_width?: number | null;
  width?: number | null;
  width_percent?: number | null;
  count?: number | null;
  variance?: number | null;
  stddev?: number | null;
  stderr?: number | null;
  z?: number | null;
};

export type ScoreSummaryResponse = {
  stats?: {
    forecast?: { count?: number; mean?: number | null; variance?: number | null };
    risk?: { count?: number; mean?: number | null; variance?: number | null };
  };
  intervals?: {
    forecast?: ScoreInterval;
    risk?: ScoreInterval;
  };
};

export type CalibratedScoresResponse = {
  calibrated?: {
    forecast?: ScoreInterval;
    risk?: ScoreInterval;
  };
  ai?: {
    forecast?: ScoreInterval;
    risk?: ScoreInterval;
  };
};

export function runHybrid(payload: unknown) {
  return apiFetch("/hybrid/pipeline/run", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function fetchSelectedStrategy() {
  return apiFetch("/hybrid/strategy/selected");
}

export async function fetchStrategyDistribution() {
  try {
    return await apiFetch("/hybrid/strategy/distribution");
  } catch (err) {
    return apiFetch("/hybrid/strategy-distribution");
  }
}

export function fetchAcceptedPairs() {
  return apiFetch("/hybrid/pairs/accepted");
}

export function fetchPairStatuses() {
  return apiFetch("/hybrid/pairs/status");
}

export function fetchMergedPairs() {
  return apiFetch("/hybrid/pairs/merged");
}

export function fetchScoreSummary() {
  return apiFetch<ScoreSummaryResponse>("/hybrid/scores/summary");
}

export function saveHumanFactors(payload: {
  forecast_alignment: number;
  risk_alignment: number;
  forecast_confidence: number;
  risk_confidence: number;
}) {
  return apiFetch("/hybrid/human-factors", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function fetchCalibratedScores() {
  return apiFetch<CalibratedScoresResponse>("/hybrid/scores/calibrated");
}

export function overrideCalibratedScores(payload: {
  risk_mean: number;
  risk_width_percent: number;
  forecast_mean: number;
  forecast_width_percent: number;
}) {
  return apiFetch("/hybrid/scores/calibrated/override", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function runStrategyDistribution() {
  return apiFetch("/hybrid/strategy/distribution/run", {
    method: "POST",
  });
}

export function recomputeScores(options: RequestInit = {}) {
  return apiFetch("/hybrid/scores/recompute", {
    method: "POST",
    ...options,
  });
}

export function fetchPipelineStatus() {
  return apiFetch("/hybrid/pipeline/status");
}

export function cleanPipelineWorkdir() {
  return apiFetch("/hybrid/pipeline/clean", {
    method: "POST",
  });
}

export function runPipeline() {
  return apiFetch("/hybrid/pipeline/run", {
    method: "POST",
  });
}

export function saveMatrixAdjustments(payload: unknown) {
  return apiFetch("/hybrid/matrix-adjustments", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function saveStrategyDistribution(payload: unknown) {
  return apiFetch("/hybrid/strategy-distribution", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updatePairStatus(payload: { pair_id: string; status: string }) {
  return apiFetch("/hybrid/pairs/status", {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function createStrategy(strategy: string) {
  return apiFetch("/hybrid/strategies", {
    method: "POST",
    body: JSON.stringify({ strategy }),
  });
}

export function selectStrategy(payload: {
  strategy_id: string;
  strategy_name: string;
  strategy_info: string;
  strategy_data: unknown;
}) {
  return apiFetch("/hybrid/strategy/select", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function logout() {
  return apiFetch("/auth/logout", {
    method: "POST",
    credentials: "include",
  });
}
