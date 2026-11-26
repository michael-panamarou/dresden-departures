import { NextResponse, type NextRequest } from "next/server";

import { failureResponse, jsonError } from "@/lib/api";
import { cachedDepartureBoard } from "@/lib/vvo/cached";

/** Numeric VVO IDs ("33000028") or nationwide DHIDs ("de:14612:28"). */
const STOP_ID_PATTERN = /^(\d{1,12}|de:\d{1,6}:\d{1,8}(:\d{1,4}){0,2})$/;

/**
 * GET /api/departures?stopId=33000028
 *
 * 200 DepartureBoard     { stop, departures, fetchedAt, source }
 * 400 { error }          missing or malformed stopId
 * 404 { error }          VVO doesn't know this stop
 * 502 / 500              VVO problem / bug
 *
 * The browser asks again every 30 seconds. Shared caches may reuse an answer
 * for 10 seconds, so a busy stop causes few VVO requests.
 */
export async function GET(request: NextRequest) {
  const stopId = request.nextUrl.searchParams.get("stopId")?.trim() ?? "";

  if (!STOP_ID_PATTERN.test(stopId)) {
    return jsonError("Please provide a valid stopId, e.g. ?stopId=33000028.", 400);
  }

  const result = await cachedDepartureBoard(stopId);
  if (!result.ok) return failureResponse(result);
  return NextResponse.json(result.data, {
    headers: { "Cache-Control": "public, s-maxage=10, stale-while-revalidate=20" },
  });
}
