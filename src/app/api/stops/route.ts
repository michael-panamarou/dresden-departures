import { NextResponse, type NextRequest } from "next/server";

import { failureResponse, jsonError } from "@/lib/api";
import { cachedSearchStops } from "@/lib/vvo/cached";
import { isMockMode } from "@/lib/vvo/client";

const MIN_QUERY_LENGTH = 2;
const MAX_QUERY_LENGTH = 100;

/**
 * Stop names rarely change: let shared caches (Vercel's CDN) reuse a successful
 * answer for 1 hour, and serve it stale for up to 1 day while refreshing.
 * Never used for error responses.
 */
const CACHE_HEADERS = {
  "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
};

/**
 * GET /api/stops?q=postplatz
 *
 * 200 { stops: Stop[], source }   search worked (also for too-short queries: empty list)
 * 400 { error: string }           query is too long
 * 502 { error: string }           VVO is unreachable or sent something unusable
 * 500 { error: string }           unexpected bug in our code
 */
export async function GET(request: NextRequest) {
  // 1. Read and clean the input. Missing "q" becomes "".
  const query = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  const source = isMockMode() ? "mock" : "vvo";

  // 2. Validate: reject absurd input...
  if (query.length > MAX_QUERY_LENGTH) {
    return jsonError(`The search text can be at most ${MAX_QUERY_LENGTH} characters long.`, 400);
  }

  // ...and treat "too short to search" as a normal, empty result.
  if (query.length < MIN_QUERY_LENGTH) {
    return NextResponse.json({ stops: [], source }, { headers: CACHE_HEADERS });
  }

  // 3. Do the real work and translate failures into HTTP responses.
  // Lower-case the cache key so "Post" and "post" share one entry.
  const result = await cachedSearchStops(query.toLowerCase());
  if (!result.ok) return failureResponse(result);
  return NextResponse.json({ stops: result.data, source }, { headers: CACHE_HEADERS });
}
