import rawCells from "@/data/strategy-matrix-cells.json";
import {
  CircleArrowDown,
  Shield,
  TrendingUp,
  Hammer,
  Wrench,
  BarChart3,
  Factory,
  ShieldCheck,
  PiggyBank,
  Scissors,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type StrategyCell = {
  id: string;
  title: string;
  description: string;
  icon: string;
  row: number;
  col: number;
};

export const STRATEGY_CELLS = rawCells as StrategyCell[][];

const ICON_MAP: Record<string, LucideIcon> = {
  CircleArrowDown,
  Shield,
  TrendingUp,
  Hammer,
  Wrench,
  BarChart3,
  Factory,
  ShieldCheck,
  PiggyBank,
  Scissors,
};

export const getStrategyIcon = (name?: string): LucideIcon => {
  if (!name) {
    return CircleArrowDown;
  }
  return ICON_MAP[name] ?? CircleArrowDown;
};
