import { distanceInMetres, gk4ToLatLng } from "./geo";
import type { Departure, DepartureBoard, LatLng, Mode, NearbyStop, Stop } from "./types";

/**
 * Sample data, used when VVO_MOCK=1: offline, when VVO is down, and in automated tests.
 * Stop IDs and coordinates are real; the departures are generated and only look realistic.
 */
function stop(id: string, name: string, up: number, right: number): Stop {
  const gk4 = { up, right };
  return { id, name, city: null, gk4, location: gk4ToLatLng(gk4) };
}

export const MOCK_STOPS: readonly Stop[] = [
  stop("33000028", "Hauptbahnhof", 5657497, 4621685),
  stop("33000016", "Bahnhof Neustadt", 5660412, 4622148),
  stop("33000293", "Waldschlößchen", 5660652, 4624656),
  stop("33000294", "Angelikastraße", 5660615, 4625079),
  stop("33000742", "Helmholtzstraße", 5655922, 4621087),
];

/**
 * Searches the mock stops the way a user expects:
 * case-insensitive, matching any part of the name.
 */
export function searchMockStops(query: string, limit = 10): Stop[] {
  const q = query.trim().toLowerCase();
  if (q === "") return [];

  return MOCK_STOPS.filter((s) => s.name.toLowerCase().includes(q)).slice(0, limit);
}

/** Mock stops sorted by distance from a position. */
export function findMockNearbyStops(position: LatLng, limit = 10): NearbyStop[] {
  return MOCK_STOPS.map((s) => ({ ...s, distance: distanceInMetres(position, s.location) }))
    .sort((a, b) => a.distance - b.distance)
    .slice(0, limit);
}

// ─── Generated departures ───────────────────────────────────────────────

type MockLine = { line: string; direction: string; mode: Mode; platform: string; every: number; offset: number };

/** Which lines leave from which stop, and how often (every N minutes). */
const MOCK_LINES: Record<string, MockLine[]> = {
  "33000028": [
    { line: "3", direction: "Wilder Mann", mode: "tram", platform: "1", every: 10, offset: 2 },
    { line: "3", direction: "Coschütz", mode: "tram", platform: "2", every: 10, offset: 7 },
    { line: "8", direction: "Hellerau", mode: "tram", platform: "1", every: 10, offset: 4 },
    { line: "8", direction: "Südvorstadt", mode: "tram", platform: "2", every: 10, offset: 9 },
    { line: "66", direction: "Lockwitz", mode: "bus", platform: "5", every: 15, offset: 3 },
    { line: "S1", direction: "Meißen Triebischtal", mode: "suburban", platform: "2", every: 30, offset: 12 },
  ],
  "33000016": [
    { line: "3", direction: "Coschütz", mode: "tram", platform: "1", every: 10, offset: 1 },
    { line: "6", direction: "Wölfnitz", mode: "tram", platform: "2", every: 10, offset: 5 },
    { line: "11", direction: "Bühlau", mode: "tram", platform: "3", every: 10, offset: 8 },
    { line: "S2", direction: "Pirna", mode: "suburban", platform: "4", every: 30, offset: 16 },
  ],
  "33000293": [
    { line: "11", direction: "Bühlau", mode: "tram", platform: "1", every: 10, offset: 3 },
    { line: "11", direction: "Zschertnitz", mode: "tram", platform: "2", every: 10, offset: 6 },
    { line: "64", direction: "Kaditz", mode: "bus", platform: "3", every: 20, offset: 10 },
  ],
  "33000294": [
    { line: "11", direction: "Bühlau", mode: "tram", platform: "1", every: 10, offset: 4 },
    { line: "11", direction: "Zschertnitz", mode: "tram", platform: "2", every: 10, offset: 5 },
  ],
  "33000742": [
    { line: "61", direction: "Löbtau", mode: "bus", platform: "1", every: 10, offset: 2 },
    { line: "61", direction: "Fernsehturm", mode: "bus", platform: "2", every: 10, offset: 6 },
    { line: "66", direction: "Mockritz", mode: "bus", platform: "1", every: 15, offset: 9 },
  ],
};

/** A small, repeatable pseudo-random number (0–99) from a string, so delays don't jump around. */
function hash(text: string): number {
  let h = 0;
  for (const char of text) h = (h * 31 + char.charCodeAt(0)) % 9973;
  return h % 100;
}

/**
 * Generates a believable departure board for a mock stop, relative to `now`.
 * Returns null for unknown stop IDs, like VVO's "stop invalid" error.
 */
export function getMockDepartureBoard(stopId: string, now: Date = new Date(), limit = 12): DepartureBoard | null {
  const stopInfo = MOCK_STOPS.find((s) => s.id === stopId);
  const lines = MOCK_LINES[stopId];
  if (!stopInfo || !lines) return null;

  const nowMinute = Math.floor(now.getTime() / 60_000);
  const departures: Departure[] = [];

  for (const l of lines) {
    // The first timetable minute at or after now, then the following ones.
    const first = nowMinute + ((l.offset - (nowMinute % l.every)) % l.every + l.every) % l.every;
    for (let minute = first; minute < nowMinute + 75; minute += l.every) {
      const key = `${stopId}-${l.line}-${l.direction}-${minute}`;
      const roll = hash(key);
      const state = roll < 3 ? "Cancelled" : roll < 30 ? "Delayed" : "InTime";
      const delay = state === "Delayed" ? 1 + (roll % 6) : 0;
      const scheduled = new Date(minute * 60_000);
      const real = state === "Cancelled" ? null : new Date((minute + delay) * 60_000);

      departures.push({
        id: key,
        line: l.line,
        direction: l.direction,
        mode: l.mode,
        platform: { name: l.platform, type: l.mode === "suburban" ? "Railtrack" : "Platform" },
        scheduledTime: scheduled.toISOString(),
        realTime: real ? real.toISOString() : null,
        delayMinutes: real ? delay : null,
        state,
      });
    }
  }

  departures.sort((a, b) => new Date(a.realTime ?? a.scheduledTime).getTime() - new Date(b.realTime ?? b.scheduledTime).getTime());

  return {
    stop: { id: stopInfo.id, name: stopInfo.name, city: stopInfo.city },
    departures: departures.slice(0, limit),
    fetchedAt: now.toISOString(),
    source: "mock",
  };
}
