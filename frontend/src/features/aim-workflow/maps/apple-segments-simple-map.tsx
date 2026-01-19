"use client"

import * as React from "react"
import {
  ComposableMap,
  Geographies,
  Geography,
  Graticule,
} from "react-simple-maps"
import { feature } from "topojson-client"
import type {
  Feature,
  FeatureCollection,
  Geometry,
  GeoJsonProperties,
} from "geojson"
import type { GeometryCollection, Topology } from "topojson-specification"

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"
import type { Segment, Year } from "@/data/segments-apple-region"
import {
  APPLE_SEGMENTS_DATA,
  SEGMENT_YEARS,
} from "@/data/segments-apple-region"
import { formatMillionUSD, formatYoY } from "./formatters"
import worldAtlas from "world-atlas/countries-110m.json"
import countriesMetaRaw from "world-countries"

type TooltipState = {
  segment: Segment
  value?: number
  year: Year
  label: string
  position: { x: number; y: number }
}

type CountriesObject = {
  countries: GeometryCollection & { geometries: Array<{ id?: number | string }> }
}

type WorldTopology = Topology &
  Record<"objects", Topology["objects"] & CountriesObject>

const SEGMENTS: Segment[] = [
  "Americas",
  "Europe",
  "Greater China",
  "Japan",
  "Rest of Asia Pacific",
]


const SEGMENT_COLORS_LIGHT: Record<Segment, string> = {
  Americas: "hsl(var(--chart-1))",
  Europe: "hsl(var(--chart-2))",
  "Greater China": "hsl(var(--chart-3))",
  Japan: "hsl(var(--chart-4))",
  "Rest of Asia Pacific": "hsl(var(--chart-5))",
}

const FALLBACK_FILL_LIGHT = "#e2e8f0"
const GRATICULE_STROKE_LIGHT = "#94a3b8"

type CountryMeta = {
  cca3?: string
  name?: { common?: string; official?: string }
  region?: string
  subregion?: string
  altSpellings?: string[]
}
const NAME_ALIAS: Record<string, string> = {
  "United States of America": "United States",
  "Korea, Republic of": "South Korea",
  "Viet Nam": "Vietnam",
  "Czech Republic": "Czechia",
  "Russian Federation": "Russia",
  "Iran, Islamic Republic of": "Iran",
  "Tanzania, United Republic of": "Tanzania",
  "Hong Kong SAR China": "Hong Kong",
  "Taiwan, Province of China": "Taiwan",
  "Syrian Arab Republic": "Syria",
  "Republic of Moldova": "Moldova",
  "Lao People's Democratic Republic": "Laos",
  "Côte d’Ivoire": "Cote d'Ivoire",
  "Côte d'Ivoire": "Cote d'Ivoire",
  "Bosnia and Herz.": "Bosnia and Herzegovina",
  "Central African Rep.": "Central African Republic",
  "Dem. Rep. Congo": "DR Congo",
  "Dominican Rep.": "Dominican Republic",
  "Eq. Guinea": "Equatorial Guinea",
  "Falkland Is.": "Falkland Islands",
  "Fr. S. Antarctic Lands": "French Southern and Antarctic Lands",
  "N. Cyprus": "Cyprus",
  "S. Sudan": "South Sudan",
  "Solomon Is.": "Solomon Islands",
  "W. Sahara": "Western Sahara",
  Turkey: "Türkiye",
}

const GREATER_CHINA_ISOS = new Set(["CHN", "HKG", "TWN", "MAC"])
const JAPAN_ISO = "JPN"
const INDIA_ISO = "IND"
const WESTERN_ASIA_LABEL = "Western Asia"

type CountrySegmentEntry = {
  segment: Segment
  displayName: string
}

function resolveSegmentFromMeta(country: CountryMeta): Segment | undefined {
  const iso = country.cca3?.toUpperCase()
  if (!iso) return undefined

  if (GREATER_CHINA_ISOS.has(iso)) {
    return "Greater China"
  }
  if (iso === JAPAN_ISO) {
    return "Japan"
  }

  const region = country.region ?? ""
  const subregion = country.subregion ?? ""
  const commonName = country.name?.common ?? ""

  if (iso === INDIA_ISO || commonName === "India") {
    return "Europe"
  }

  switch (region) {
    case "Americas":
      return "Americas"
    case "Europe":
      return "Europe"
    case "Africa":
      return "Europe"
    case "Oceania":
      return "Rest of Asia Pacific"
    case "Asia":
      if (subregion === WESTERN_ASIA_LABEL) {
        return "Europe"
      }
      return "Rest of Asia Pacific"
    default:
      return undefined
  }
}

const COUNTRY_SEGMENT_LOOKUP: Map<string, CountrySegmentEntry> = (() => {
  const countries = countriesMetaRaw as unknown as CountryMeta[]
  const map = new Map<string, CountrySegmentEntry>()

  const register = (key: string | undefined, entry: CountrySegmentEntry) => {
    if (!key) return
    map.set(key.toUpperCase(), entry)
  }

  for (const country of countries) {
    const segment = resolveSegmentFromMeta(country)
    const iso = country.cca3?.toUpperCase()
    if (!segment || !iso) continue

    const displayName =
      country.name?.common ?? country.name?.official ?? iso
    const entry = { segment, displayName }

    register(iso, entry)
    register(country.name?.common, entry)
    register(country.name?.official, entry)
    if (Array.isArray(country.altSpellings)) {
      for (const alt of country.altSpellings) {
        register(alt, entry)
      }
    }
  }

  for (const [alias, canonical] of Object.entries(NAME_ALIAS)) {
    const canonicalEntry = map.get(canonical.toUpperCase())
    if (canonicalEntry) {
      register(alias, canonicalEntry)
    }
  }

  return map
})()

function tryGetFeatureId(geo: Feature<Geometry, GeoJsonProperties>) {
  const props = geo.properties || {}
  const isoA3 =
    typeof props.iso_a3 === "string"
      ? props.iso_a3.toUpperCase()
      : typeof props.ISO_A3 === "string"
        ? props.ISO_A3.toUpperCase()
        : undefined
  const countryName =
    typeof props.name === "string"
      ? props.name
      : typeof props.NAME === "string"
        ? props.NAME
        : undefined
  const id =
    typeof geo.id === "string" || typeof geo.id === "number"
      ? String(geo.id).toUpperCase()
      : undefined

  return {
    isoA3,
    countryName,
    id,
  }
}

function isTopology(value: unknown): value is WorldTopology {
  return (
    typeof value === "object" &&
    value !== null &&
    "type" in value &&
    (value as { type?: unknown }).type === "Topology" &&
    "objects" in value &&
    typeof (value as { objects?: unknown }).objects === "object"
  )
}

function resolveCountriesTopology(payload: unknown): WorldTopology {
  if (isTopology(payload)) {
    return payload
  }
  if (
    typeof payload === "object" &&
    payload !== null &&
    "default" in payload &&
    isTopology((payload as { default?: unknown }).default)
  ) {
    return (payload as { default: WorldTopology }).default
  }
  throw new Error("Invalid world atlas topology payload")
}

const WORLD_TOPO = resolveCountriesTopology(worldAtlas)
function resolveCountriesFeatures(
  topology: WorldTopology
): FeatureCollection<Geometry, GeoJsonProperties> {
  const countries = topology.objects.countries
  if (!countries || countries.type !== "GeometryCollection") {
    throw new Error("Invalid countries geometry collection")
  }

  const result = feature(
    topology as Topology,
    countries as GeometryCollection
  )

  if (result.type !== "FeatureCollection") {
    throw new Error("World countries topology did not yield a FeatureCollection")
  }

  return result
}

const WORLD_FEATURES = resolveCountriesFeatures(WORLD_TOPO)

export type AppleSegmentsSimpleMapProps = {
  className?: string
  initialYear?: Year
}

export function AppleSegmentsSimpleMap({
  className,
  initialYear,
}: AppleSegmentsSimpleMapProps) {
  const segmentBaseColors = SEGMENT_COLORS_LIGHT
  const fallbackFill = FALLBACK_FILL_LIGHT
  const graticuleStroke = GRATICULE_STROKE_LIGHT

  const yearsDesc = React.useMemo(
    () => [...SEGMENT_YEARS].sort((a, b) => Number(b) - Number(a)),
    []
  )
  const [year, setYear] = React.useState<Year>(
    initialYear && SEGMENT_YEARS.includes(initialYear)
      ? initialYear
      : (yearsDesc[0] as Year)
  )

  const yearData = React.useMemo(() => APPLE_SEGMENTS_DATA[year] ?? {}, [year])

  const previousYear = React.useMemo(() => {
    const index = yearsDesc.indexOf(year)
    return index >= 0 ? (yearsDesc[index + 1] as Year | undefined) : undefined
  }, [year, yearsDesc])

  const previousYearData = React.useMemo(
    () => (previousYear ? APPLE_SEGMENTS_DATA[previousYear] : undefined),
    [previousYear]
  )

  const segmentValues = React.useMemo(() => {
    return SEGMENTS.map((segment) => ({
      segment,
      value: yearData[segment],
      previous: previousYearData?.[segment],
    }))
  }, [yearData, previousYearData])

  const flatColorMap = React.useMemo(
    () =>
      new Map<Segment, string>(
        SEGMENTS.map((segment) => [segment, segmentBaseColors[segment]])
      ),
    [segmentBaseColors]
  )
  const [tooltip, setTooltip] = React.useState<TooltipState | null>(null)

  const entries = React.useMemo(() => {
    const map = new Map<string, { segment: Segment; value?: number; label: string }>()
    for (const [key, entry] of COUNTRY_SEGMENT_LOOKUP.entries()) {
      const segment = entry.segment
      map.set(key, {
        segment,
        value: yearData[segment],
        label: `${entry.displayName} (${segment})`,
      })
    }
    return map
  }, [yearData])

  return (
    <Card className={cn("relative overflow-hidden border-slate-200 bg-white shadow-sm", className)}>
      <CardHeader className="flex flex-col gap-4 border-b border-slate-200 pb-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-1">
          <CardTitle className="text-xl font-bold text-slate-900">Apple Regions by Revenue</CardTitle>
        </div>
        <Select value={year} onValueChange={(value) => setYear(value as Year)}>
          <SelectTrigger className="w-32">
            <SelectValue placeholder="Select year" />
          </SelectTrigger>
          <SelectContent side="top">
            {yearsDesc.map((option) => (
              <SelectItem key={option} value={option}>
                {option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent className="flex flex-col gap-5 p-6 lg:flex-row lg:items-center">
        <div className="relative w-full flex-[4] min-w-0">
          <div
            className="relative w-full overflow-hidden rounded-2xl bg-[hsl(var(--secondary))] from-slate-50 to-white"
            style={{ aspectRatio: "2.3/1" }}
          >
            <ComposableMap
              projectionConfig={{ scale: 260 }}
              width={1500}
              height={680}
              style={{ width: "100%", height: "100%" }}
            >
              <Graticule stroke={graticuleStroke} strokeWidth={0.35} />
              <Geographies geography={WORLD_FEATURES}>
                {({ geographies }) =>
                geographies.map((geo) => {
                  const { isoA3, countryName, id } =
                    tryGetFeatureId(geo as Feature<Geometry, GeoJsonProperties>)

                  const lookupCandidates = [
                    isoA3?.toUpperCase(),
                    countryName?.toUpperCase(),
                    id,
                  ].filter(Boolean) as string[]

                  let entry: { segment: Segment; value?: number; label: string } | undefined
                  for (const candidate of lookupCandidates) {
                    entry = entries.get(candidate)
                    if (entry) break
                  }

                  const segment = entry?.segment
                  const value = entry?.value
                  const displayLabel = entry?.label ?? countryName ?? isoA3 ?? "Unknown"
                  const fill = segment
                    ? flatColorMap.get(segment) ?? segmentBaseColors[segment]
                    : fallbackFill

                  return (
                    <Geography
                      key={geo.rsmKey}
                      geography={geo}
                      onMouseEnter={(event) => {
                        if (!segment) {
                          setTooltip(null)
                          return
                        }
                        setTooltip({
                          segment,
                          value,
                          year,
                          label: displayLabel,
                          position: { x: event.clientX, y: event.clientY },
                        })
                      }}
                      onMouseMove={(event) => {
                        setTooltip((current) =>
                          current
                            ? {
                                ...current,
                                position: { x: event.clientX, y: event.clientY },
                              }
                            : current
                        )
                      }}
                      onMouseLeave={() => setTooltip(null)}
                      style={{
                        default: {
                          fill,
                          stroke: "none",
                          strokeWidth: 0,
                          outline: "none",
                        },
                        hover: {
                          fill,
                          stroke: "none",
                          strokeWidth: 0,
                          outline: "none",
                        },
                        pressed: {
                          fill,
                          stroke: "none",
                          strokeWidth: 0,
                          outline: "none",
                        },
                      }}
                      tabIndex={-1}
                      aria-label={
                        segment
                          ? `${displayLabel}${
                              value != null ? ` ${formatMillionUSD(value)}` : ""
                            }`
                          : undefined
                      }
                    />
                  )
                })
              }
            </Geographies>
            </ComposableMap>
              {tooltip ? (
                <div
                  className="pointer-events-none fixed z-50 min-w-[10rem] rounded-md border border-slate-200 bg-white/95 px-3 py-2 text-sm shadow-lg backdrop-blur"
                  style={{
                    left: tooltip.position.x + 12,
                    top: tooltip.position.y + 12,
                  }}
                >
                  <div className="font-semibold text-slate-900">{tooltip.label}</div>
                  <div className="text-slate-600">
                    {formatMillionUSD(tooltip.value)} in {tooltip.year}
                  </div>
                </div>
              ) : null}
          </div>
        </div>
        <div className="flex w-full flex-col gap-2 text-xs text-slate-500 lg:w-56 lg:flex-[1] lg:self-center lg:overflow-y-auto">
          <div className="flex w-full flex-col divide-y divide-slate-200/80">
            {segmentValues.map(({ segment, value, previous }) => {
              const color = flatColorMap.get(segment) ?? segmentBaseColors[segment]
              const yoyLabel = formatYoY(value, previous)
              return (
                <div key={segment} className="flex w-full items-center justify-between py-2 text-xs">
                  <div className="flex items-center gap-2">
                    <span
                      className="inline-flex size-3 shrink-0 rounded-full"
                      style={{ backgroundColor: color }}
                      aria-hidden="true"
                    />
                    <span className="font-semibold text-foreground">{segment}</span>
                  </div>
                  <div className="flex flex-col items-end text-[11px] font-semibold text-foreground">
                    <span>{formatMillionUSD(value)}</span>
                    <span className="text-[10px] font-medium text-muted-foreground">{yoyLabel}</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

AppleSegmentsSimpleMap.displayName = "AppleSegmentsSimpleMap"
