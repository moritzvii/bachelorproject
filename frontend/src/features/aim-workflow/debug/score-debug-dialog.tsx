"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { fetchScoreSummary, type ScoreInterval } from "@/lib/api";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

type ScoreIntervals = {
  forecast?: ScoreInterval;
  risk?: ScoreInterval;
};

const formatPct = (value?: number | null) =>
  typeof value === "number" && Number.isFinite(value) ? `${Math.round(value * 100)}%` : "—";

const formatRange = (interval?: ScoreInterval) => {
  if (!interval) return "—";
  const lower = formatPct(interval.lower);
  const upper = formatPct(interval.upper);
  return `${lower} to ${upper}`;
};

const formatWidth = (interval?: ScoreInterval) => {
  if (!interval) return "—";
  const raw = interval.width_percent ?? interval.width;
  const percent = Number(raw);
  if (Number.isFinite(percent)) {
    const value = percent > 1 ? percent : percent * 100;
    return `${Math.round(value * 100) / 100}%`;
  }
  return "—";
};

export function ScoreDebugDialog() {
  const [intervals, setIntervals] = useState<ScoreIntervals | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchIntervals = async () => {
      try {
        const data = await fetchScoreSummary();
        setIntervals(data?.intervals ?? null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load score intervals");
      }
    };
    fetchIntervals();
  }, []);

  const forecast = intervals?.forecast;
  const risk = intervals?.risk;

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="text-gray-200">
          Debug
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Score Intervals</DialogTitle>
          <DialogDescription>
            Snapshot from score_intervals.json (forecast & risk).
          </DialogDescription>
        </DialogHeader>
        <DialogClose asChild>
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground"
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </Button>
        </DialogClose>
        <div className="py-4 text-sm text-foreground">
          {error ? (
            <p className="text-destructive">{error}</p>
          ) : (
            <div className="space-y-3">
              <div>
                <p className="font-semibold">Forecast</p>
                <p>Mean: {formatPct(forecast?.mean)}</p>
                <p>Interval: {formatRange(forecast)}</p>
                <p>Width: {formatWidth(forecast)}</p>
                <p>Half width: {formatPct(forecast?.half_width)}</p>
                <p>Count: {forecast?.count ?? "—"}</p>
              </div>
              <div className="border-t border-border pt-3">
                <p className="font-semibold">Risk</p>
                <p>Mean: {formatPct(risk?.mean)}</p>
                <p>Interval: {formatRange(risk)}</p>
                <p>Width: {formatWidth(risk)}</p>
                <p>Half width: {formatPct(risk?.half_width)}</p>
                <p>Count: {risk?.count ?? "—"}</p>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
