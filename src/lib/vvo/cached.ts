import "server-only";

import { cacheLife } from "next/cache";

import { findNearbyStops, getDepartureBoard, searchStops } from "./client";
import type { DepartureBoard, NearbyStop, Stop } from "./types";

/**
 * Server-side caches in front of the VVO client ("use cache", Next.js Cache Components).
 * Same arguments → same cache entry, shared by every visitor.
 *
 * cacheLife: after `revalidate` seconds, the next request gets the stored answer immediately
 * and triggers a refresh in the background; after `expire` seconds it waits for fresh data.
 *
 * Why return results instead of throwing: in production builds, Next.js replaces errors thrown
 * inside "use cache" with a generic error (to avoid leaking details), so the routes could no
 * longer tell "VVO is down" from "stop not found". Failures are kept for 2 seconds at most.
 *
 * On Vercel, each server instance has its own in-memory cache; the Cache-Control headers set
 * by the routes let Vercel's CDN share answers across all of them.
 */
export type CacheResult<T> =
  | { ok: true; data: T }
  | { ok: false; reason: "not-found" | "unavailable" | "bug"; message: string };

/** Turns a thrown error into a failure result and logs the technical details once. */
function toFailure(label: string, error: unknown): CacheResult<never> {
  const name = error instanceof Error ? error.name : "";
  const message = error instanceof Error ? error.message : String(error);
  if (name === "StopNotFoundError") return { ok: false, reason: "not-found", message };
  if (name === "VvoError") {
    console.error(`[vvo] ${label}: ${message}`, (error as Error).cause ?? "");
    return { ok: false, reason: "unavailable", message };
  }
  console.error(`[vvo] Unexpected error in ${label}:`, error);
  return { ok: false, reason: "bug", message };
}

/** Stop names rarely change: reuse search results for an hour. */
export async function cachedSearchStops(query: string): Promise<CacheResult<Stop[]>> {
  "use cache";
  try {
    const data = await searchStops(query);
    cacheLife("hours");
    return { ok: true, data };
  } catch (error) {
    cacheLife({ revalidate: 1, expire: 2 });
    return toFailure(`search "${query}"`, error);
  }
}

/** The stops around a position don't change either. */
export async function cachedNearbyStops(lat: number, lng: number): Promise<CacheResult<NearbyStop[]>> {
  "use cache";
  try {
    const data = await findNearbyStops({ lat, lng });
    cacheLife("hours");
    return { ok: true, data };
  } catch (error) {
    cacheLife({ revalidate: 1, expire: 2 });
    return toFailure(`nearby ${lat},${lng}`, error);
  }
}

/**
 * Departures change every few seconds, so they are only shared for a short moment.
 * Many people watching the same stop then cause one VVO request instead of many.
 */
export async function cachedDepartureBoard(stopId: string): Promise<CacheResult<DepartureBoard>> {
  "use cache";
  try {
    const data = await getDepartureBoard(stopId);
    cacheLife({ revalidate: 10, expire: 30 });
    return { ok: true, data };
  } catch (error) {
    cacheLife({ revalidate: 1, expire: 2 });
    return toFailure(`departures for stop ${stopId}`, error);
  }
}
