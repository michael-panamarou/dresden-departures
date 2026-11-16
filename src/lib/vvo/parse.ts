import type { Stop } from "./types";

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
 * Output: { id: "33000742", name: "Helmholtzstraße", city: null,
 *           gk4: { up: 5655922, right: 4621087 } }
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

    return {
        id,
        name,
        city: city || null, // VVO sends "" for stops inside the VVO area
        gk4: { up: upValue, right: rightValue },
    };
}

/**
 * Turns a whole list of PointFinder results into Stops,
 * silently skipping everything that isn't a valid stop.
 */
export function parsePoints(points: string[]): Stop[] {
    const stops: Stop[] = [];

    for (const raw of points) {
        const stop = parsePoint(raw);
        if (stop !== null) {
            stops.push(stop);
        }
    }

    return stops;
}