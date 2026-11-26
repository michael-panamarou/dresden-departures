import { delayInMinutes, parseVvoDate } from "./dates";
import { gk4ToLatLng } from "./geo";
import type { Departure, DepartureState, Mode, RawDeparture, Stop } from "./types";

// ─── Stops (PointFinder) ────────────────────────────────────────────────

/** A stop ID consists only of digits: "33000742" ✅, "coord:4621022.70:..." ❌ */
const STOP_ID_PATTERN = /^\d+$/;

/**
 * Turns a coordinate string into a number.
 * Returns null if the value is missing, not a number, or 0 (VVO's "unknown location").
 */
function parseCoordinate(value: string | undefined): number | null {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/**
 * Turns one PointFinder result string into a Stop.
 *
 * Input:  "33000742|||Helmholtzstraße|5655922|4621087|0||"
 *          id      |type|city|name    |up     |right  |distance|lines|shortcut
 *
 * Returns null for anything that isn't a valid stop
 * (streets, POIs, coordinates, broken data).
 */
export function parsePoint(raw: string): Stop | null {
  const [id, type, city, name, up, right] = raw.split("|");

  // 1. Real stops have a purely numeric ID and an empty type field.
  if (!id || !STOP_ID_PATTERN.test(id)) return null;
  if (type) return null;

  // 2. A stop without a name is useless for our UI.
  if (!name) return null;

  // 3. Both coordinates must be real, positive numbers.
  const upValue = parseCoordinate(up);
  const rightValue = parseCoordinate(right);
  if (upValue === null || rightValue === null) return null;

  const gk4 = { up: upValue, right: rightValue };
  return {
    id,
    name,
    city: city || null, // VVO sends "" for stops inside the VVO area
    gk4,
    location: gk4ToLatLng(gk4),
  };
}

/**
 * Turns a whole list of PointFinder results into Stops,
 * skipping everything that isn't a valid stop and any duplicates.
 */
export function parsePoints(points: string[]): Stop[] {
  const stops: Stop[] = [];
  const seen = new Set<string>();

  for (const raw of points) {
    const stop = parsePoint(raw);
    if (stop !== null && !seen.has(stop.id)) {
      seen.add(stop.id);
      stops.push(stop);
    }
  }

  return stops;
}

// ─── Departures (departure monitor) ─────────────────────────────────────

/** VVO's many "Mot" (mode of transport) values, grouped into the few the UI distinguishes. */
const MODES: Record<string, Mode> = {
  Tram: "tram",
  CityBus: "bus",
  IntercityBus: "bus",
  Bus: "bus",
  RegioBus: "bus",
  PlusBus: "bus",
  SuburbanRailway: "suburban",
  RapidTransit: "suburban",
  Train: "train",
  Ferry: "ferry",
  Cableway: "cableway",
  HailedSharedTaxi: "taxi",
};

export function parseMode(mot: string | undefined): Mode {
  return (mot && MODES[mot]) || "other";
}

const KNOWN_STATES: readonly DepartureState[] = ["InTime", "Delayed", "Cancelled"];

function parseState(state: string | undefined): DepartureState {
  return KNOWN_STATES.find((known) => known === state) ?? "Unknown";
}

/**
 * Turns one raw VVO departure into our Departure type.
 * Returns null if essential fields (line, direction, scheduled time) are missing.
 */
export function parseDeparture(raw: RawDeparture): Departure | null {
  const scheduled = parseVvoDate(raw.ScheduledTime);
  if (!raw.LineName || !raw.Direction || scheduled === null) return null;

  const state = parseState(raw.State);
  // A cancelled trip has no meaningful expected time, even if VVO still sends one.
  const real = state === "Cancelled" ? null : parseVvoDate(raw.RealTime);

  const platformName = raw.Platform?.Name?.trim();
  const platform = platformName
    ? { name: platformName, type: raw.Platform?.Type === "Railtrack" ? ("Railtrack" as const) : ("Platform" as const) }
    : null;

  return {
    // Fall back to line + time, so React always has a unique, stable key.
    id: raw.Id || `${raw.LineName}-${raw.Direction}-${scheduled.getTime()}`,
    line: raw.LineName,
    direction: raw.Direction,
    mode: parseMode(raw.Mot),
    platform,
    scheduledTime: scheduled.toISOString(),
    realTime: real ? real.toISOString() : null,
    delayMinutes: real ? delayInMinutes(scheduled, real) : null,
    state,
  };
}

/** Parses all departures, skipping broken ones, sorted by the time they actually leave. */
export function parseDepartures(raws: RawDeparture[]): Departure[] {
  const departures: Departure[] = [];
  for (const raw of raws) {
    const departure = parseDeparture(raw);
    if (departure) departures.push(departure);
  }
  return departures.sort((a, b) => expectedTime(a) - expectedTime(b));
}

/** When a departure will actually leave: live time if known, otherwise timetable time. */
export function expectedTime(departure: Departure): number {
  return new Date(departure.realTime ?? departure.scheduledTime).getTime();
}
