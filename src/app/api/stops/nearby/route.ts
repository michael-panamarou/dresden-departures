import { NextResponse, type NextRequest } from "next/server";

import { failureResponse, jsonError } from "@/lib/api";
import { cachedNearbyStops } from "@/lib/vvo/cached";
import { isMockMode } from "@/lib/vvo/client";
import { isInVvoArea } from "@/lib/vvo/geo";

/** Positions are rounded to ~100 m: enough for "stops near me", and nearby users share a cache entry. */
function roundCoordinate(value: number): number {
  return Math.round(value * 1000) / 1000;
}

/**
 * GET /api/stops/nearby?lat=51.05&lng=13.73
 *
 * 200 { stops: NearbyStop[], source }   nearest first, with distance in metres
 * 400 { error: string }                 missing/invalid position, or outside the VVO area
 * 502 / 500                             as in /api/stops
 */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const lat = Number(params.get("lat"));
  const lng = Number(params.get("lng"));

  // Number(null) is 0 and Number("abc") is NaN: both must be rejected.
  if (!params.get("lat") || !params.get("lng") || !Number.isFinite(lat) || !Number.isFinite(lng)) {
    return jsonError("Please provide a position as lat and lng, e.g. ?lat=51.05&lng=13.73.", 400);
  }
  if (!isInVvoArea({ lat, lng })) {
    return jsonError("This position is outside the Dresden transit area.", 400);
  }

  const position = { lat: roundCoordinate(lat), lng: roundCoordinate(lng) };
  const result = await cachedNearbyStops(position.lat, position.lng);
  if (!result.ok) return failureResponse(result);
  return NextResponse.json(
    { stops: result.data, source: isMockMode() ? "mock" : "vvo" },
    { headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" } },
  );
}
