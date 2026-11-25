import { NextResponse, type NextRequest } from "next/server";

import { searchStops, VvoError } from "@/lib/vvo/client";

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
 * 200 { stops: Stop[] }   search worked (also for too-short queries: empty list)
 * 400 { error: string }   query is too long
 * 502 { error: string }   VVO is unreachable or sent something unusable
 * 500 { error: string }   unexpected bug in our code
 */
export async function GET(request: NextRequest) {
    // 1. Read and clean the input. Missing "q" becomes "".
    const query = request.nextUrl.searchParams.get("q")?.trim() ?? "";

    // 2. Validate: reject absurd input...
    if (query.length > MAX_QUERY_LENGTH) {
        return NextResponse.json(
            { error: `The search text can be at most ${MAX_QUERY_LENGTH} characters long.` },
            { status: 400 },
        );
    }

    // ...and treat "too short to search" as a normal, empty result.
    if (query.length < MIN_QUERY_LENGTH) {
        return NextResponse.json({ stops: [] }, { headers: CACHE_HEADERS });
    }

    // 3. Do the real work and translate failures into HTTP responses.
    try {
        const stops = await searchStops(query);
        return NextResponse.json({ stops }, { headers: CACHE_HEADERS });
    } catch (error) {
        if (error instanceof VvoError) {
            // VVO's problem: tell the user kindly, log the details for us.
            console.error(`[api/stops] VVO problem for "${query}":`, error.message, error.cause ?? "");
            return NextResponse.json(
                { error: "Transit data is unavailable right now. Please try again in a moment." },
                { status: 502 },
            );
        }

        // Anything else is a bug in our code.
        console.error(`[api/stops] Unexpected error for "${query}":`, error);
        return NextResponse.json(
            { error: "Something went wrong on our side." },
            { status: 500 },
        );
    }
}