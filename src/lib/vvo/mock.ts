import type { Stop } from "./types";

/**
 * Fallback stops, used when VVO_MOCK=1 (offline, VVO down, automated tests).
 * Real IDs and coordinates, so later features (departures, map) behave realistically.
 */
export const MOCK_STOPS: readonly Stop[] = [
  { id: "33000028", name: "Hauptbahnhof", city: null, gk4: { up: 5657497, right: 4621685 } },
  { id: "33000016", name: "Bahnhof Neustadt", city: null, gk4: { up: 5660412, right: 4622148 } },
  { id: "33000293", name: "Waldschlößchen", city: null, gk4: { up: 5660652, right: 4624656 } },
  { id: "33000294", name: "Angelikastraße", city: null, gk4: { up: 5660615, right: 4625079 } },
  { id: "33000742", name: "Helmholtzstraße", city: null, gk4: { up: 5655922, right: 4621087 } },
];

/**
 * Searches the mock stops the way a user expects:
 * case-insensitive, matching any part of the name.
 */
export function searchMockStops(query: string, limit = 10): Stop[] {
  const q = query.trim().toLowerCase();
  if (q === "") return [];

  return MOCK_STOPS
    .filter((stop) => stop.name.toLowerCase().includes(q))
    .slice(0, limit);
}
