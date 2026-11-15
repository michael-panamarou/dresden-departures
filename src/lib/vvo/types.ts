// ─── Our app's own types ────────────────────────────────────────────────
// The rest of the app (API routes, UI) only ever works with these.

/** A public transport stop, e.g. "Hauptbahnhof". */
export type Stop = {
    /** VVO stop ID, e.g. "33000028". A string because we never calculate with it. */
    id: string;
    /** Display name, e.g. "Hauptbahnhof". */
    name: string;
    /** Only set for stops outside the VVO area, otherwise null. */
    city: string | null;
    /** Raw Gauss-Krüger zone 4 coordinates */
    gk4: { up: number; right: number };
};

// Raw types: what VVO actually sends
// Only the fields we use. Never pass these to the UI.

/** Every VVO response contains a status object. */
export type VvoStatus = {
    /** "Ok" on success; "ValidationError" or "ServiceError" on failure. */
    Code: string;
    /** Only present when something went wrong. */
    Message?: string;
};

/** Response of GET /tr/pointfinder (stop search). */
export type RawPointfinderResponse = {
    PointStatus: string;
    Status: VvoStatus;
    /** Pipe-separated strings like "33000742|||Helmholtzstraße|5655922|4621087|0||".
     *  Missing entirely when nothing was found. */
    Points?: string[];
};