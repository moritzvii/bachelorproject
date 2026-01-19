import appleNetSales from "./apple-net-sales.json";

export type Segment =
  | "Americas"
  | "Europe"
  | "Greater China"
  | "Japan"
  | "Rest of Asia Pacific";

export type Year = `${number}`;

export type SegmentDataset = Record<Year, Partial<Record<Segment, number>>>;

export const APPLE_SEGMENTS_DATA: SegmentDataset = appleNetSales.regions
  .millions as SegmentDataset;

export const APPLE_SEGMENTS = APPLE_SEGMENTS_DATA;

export const SEGMENT_YEARS = Object.keys(APPLE_SEGMENTS_DATA)
  .map((y) => Number(y))
  .sort((a, b) => a - b)
  .map(String) as Year[];
