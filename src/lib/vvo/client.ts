import "server-only"; // build fails if this file is ever imported into browser code

import { distanceInMetres, latLngToGk4 } from "./geo";
import { findMockNearbyStops, getMockDepartureBoard, searchMockStops } from "./mock";
import { parseDepartures, parsePoints } from "./parse";
import type {
  DepartureBoard,
  LatLng,
  NearbyStop,
  RawDepartureMonitorResponse,
  RawPointfinderResponse,
  Stop,
  VvoStatus,
} from "./types";

const BASE_URL = "https://webapi.vvo-online.de";
const TIMEOUT_MS = 8_000;
/** Tells VVO who is calling, as a courtesy to an unofficial, free service. */
const USER_AGENT = "dresden-departures (learning project; github.com/michael-panamarou/dresden-departures)";

/**
 * Thrown when VVO can't be reached or sends something unusable.
 * Lets callers tell "VVO has a problem" apart from "our code has a bug".
 */
export class VvoError extends Error {
  name = "VvoError";
}

/** Thrown when VVO says the requested stop doesn't exist. */
export class StopNotFoundError extends Error {
  name = "StopNotFoundError";
}

/** Mock mode is on only for exactly VVO_MOCK=1 (see .env.example). */
export function isMockMode(): boolean {
  return process.env.VVO_MOCK === "1";
}

type VvoRequest = { query: Record<string, string> } | { body: Record<string, unknown> };

/**
 * Sends one request to VVO and runs the four checks every response needs.
 * GET with query parameters, or POST with a JSON body.
 */
async function vvoRequest<T extends { Status?: VvoStatus }>(path: string, request: VvoRequest): Promise<T> {
  const isGet = "query" in request;
  const url = isGet ? `${BASE_URL}${path}?${new URLSearchParams({ ...request.query, format: "json" })}` : `${BASE_URL}${path}`;

  // Failure ❶: no answer at all (network down, DNS error, timeout)
  let response: Response;
  try {
    response = await fetch(url, {
      method: isGet ? "GET" : "POST",
      headers: isGet
        ? { "User-Agent": USER_AGENT }
        : { "User-Agent": USER_AGENT, "Content-Type": "application/json" },
      body: isGet ? undefined : JSON.stringify({ ...request.body, format: "json" }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
      cache: "no-store", // caching is handled in cached.ts, not by fetch
    });
  } catch (error) {
    throw new VvoError("Could not reach VVO", { cause: error });
  }

  // Failure ❷: an answer, but an HTTP error (404, 500, 503 ...)
  if (!response.ok) {
    throw new VvoError(`VVO responded with HTTP ${response.status}`);
  }

  // Failure ④: the body isn't valid JSON (e.g. an HTML error page)
  let data: T;
  try {
    data = (await response.json()) as T;
  } catch (error) {
    throw new VvoError("VVO sent a response that isn't valid JSON", { cause: error });
  }

  // Failure ❸: HTTP 200, but VVO reports an error in its Status object
  if (data.Status?.Code !== "Ok") {
    const code = data.Status?.Code ?? "missing";
    const message = data.Status?.Message ?? "";
    if (/stop invalid|haltestelle/i.test(message)) {
      throw new StopNotFoundError(message);
    }
    throw new VvoError(`VVO status ${code}: ${message}`);
  }

  return data;
}

/**
 * Searches stops by name, e.g. "postplatz".
 * Resolves with clean Stop objects, or rejects with a VvoError.
 */
export async function searchStops(query: string, limit = 10): Promise<Stop[]> {
  if (isMockMode()) return searchMockStops(query, limit);

  const data = await vvoRequest<RawPointfinderResponse>("/tr/pointfinder", {
    query: {
      query,
      limit: String(limit),
      stopsOnly: "true",
      regionalOnly: "true", // skip "Helmholtzstraße, Berlin" and friends
    },
  });
  // Success: turn pipe strings into Stops. Points is missing when nothing matched.
  return parsePoints(data.Points ?? []);
}

/**
 * Finds stops near a GPS position, nearest first.
 * VVO expects the position as "coord:<right>:<up>" in Gauss-Krüger coordinates.
 */
export async function findNearbyStops(position: LatLng, limit = 10): Promise<NearbyStop[]> {
  if (isMockMode()) return findMockNearbyStops(position, limit);

  const { up, right } = latLngToGk4(position);
  const data = await vvoRequest<RawPointfinderResponse>("/tr/pointfinder", {
    query: {
      query: `coord:${right}:${up}`,
      assignedstops: "true", // include the stops assigned to this position
      limit: String(limit),
    },
  });

  // The list also contains the coordinate itself and streets; parsePoints keeps only stops.
  return parsePoints(data.Points ?? [])
    .map((s) => ({ ...s, distance: distanceInMetres(position, s.location) }))
    .sort((a, b) => a.distance - b.distance)
    .slice(0, limit);
}

/**
 * Loads the next departures at a stop.
 * Rejects with StopNotFoundError for unknown stops and VvoError for other problems.
 */
export async function getDepartureBoard(stopId: string, limit = 12): Promise<DepartureBoard> {
  if (isMockMode()) {
    const board = getMockDepartureBoard(stopId, new Date(), limit);
    if (!board) throw new StopNotFoundError(`No sample data for stop ${stopId}`);
    return board;
  }

  const data = await vvoRequest<RawDepartureMonitorResponse>("/dm", {
    body: { stopid: stopId, limit, shorttermchanges: true },
  });

  return {
    stop: {
      id: stopId,
      name: data.Name ?? "Unknown stop",
      city: data.Place && data.Place !== "Dresden" ? data.Place : null,
    },
    departures: parseDepartures(data.Departures ?? []),
    fetchedAt: new Date().toISOString(),
    source: "vvo",
  };
}
