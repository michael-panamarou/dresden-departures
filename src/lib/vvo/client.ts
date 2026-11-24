import "server-only"; // build fails if this file is ever imported into browser code

import { searchMockStops } from "./mock";
import { parsePoints } from "./parse";
import type { RawPointfinderResponse, Stop } from "./types";

const BASE_URL = "https://webapi.vvo-online.de";
const TIMEOUT_MS = 8_000;
/** Tells VVO who is calling, as a courtesy to an unofficial, free service. */
const USER_AGENT = "dresden-departures (learning project; github.com/YOUR-USERNAME/dresden-departures)";

/**
 * Thrown when VVO can't be reached or sends something unusable.
 * Lets callers tell "VVO has a problem" apart from "our code has a bug".
 */
export class VvoError extends Error {
    name = "VvoError";
}

/** Mock mode is on only for exactly VVO_MOCK=1 (see .env.example). */
function isMockMode(): boolean {
    return process.env.VVO_MOCK === "1";
}

/**
 * Searches stops by name, e.g. "postplatz".
 * Resolves with clean Stop objects, or rejects with a VvoError.
 */
export async function searchStops(query: string, limit = 10): Promise<Stop[]> {
    if (isMockMode()) {
        return searchMockStops(query, limit);
    }

    const params = new URLSearchParams({
        query,
        limit: String(limit),
        stopsOnly: "true",
        regionalOnly: "true", // skip "Helmholtzstraße, Berlin" and friends
        format: "json",       // without it, VVO returns an HTML page
    });

    // Failure ❶: no answer at all (network down, DNS error, timeout)
    let response: Response;
    try {
        response = await fetch(`${BASE_URL}/tr/pointfinder?${params}`, {
            headers: { "User-Agent": USER_AGENT },
            signal: AbortSignal.timeout(TIMEOUT_MS),
        });
    } catch (error) {
        throw new VvoError("Could not reach VVO", { cause: error });
    }

    // Failure ❷: an answer, but an HTTP error (404, 500, 503 ...)
    if (!response.ok) {
        throw new VvoError(`VVO responded with HTTP ${response.status}`);
    }

    // Failure ④: the body isn't valid JSON (e.g. an HTML error page)
    let data: RawPointfinderResponse;
    try {
        data = (await response.json()) as RawPointfinderResponse;
    } catch (error) {
        throw new VvoError("VVO sent a response that isn't valid JSON", { cause: error });
    }

    // Failure ❸: HTTP 200, but VVO reports an error in its Status object
    if (data.Status?.Code !== "Ok") {
        const code = data.Status?.Code ?? "missing";
        const message = data.Status?.Message ?? "";
        throw new VvoError(`VVO status ${code}: ${message}`);
    }

    // Success: turn pipe strings into Stops. Points is missing when nothing matched.
    return parsePoints(data.Points ?? []);
}