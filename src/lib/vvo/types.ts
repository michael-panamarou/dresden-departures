// ─── Our app's own types ────────────────────────────────────────────────
// The rest of the app (API routes, UI) only ever works with these.

/** A GPS position (WGS84), the system used by phones and web maps. */
export type LatLng = { lat: number; lng: number };

/** A public transport stop, e.g. "Hauptbahnhof". */
export type Stop = {
  /** VVO stop ID, e.g. "33000028". A string because we never calculate with it. */
  id: string;
  /** Display name, e.g. "Hauptbahnhof". */
  name: string;
  /** Only set for stops outside the Dresden area, otherwise null. */
  city: string | null;
  /** Raw Gauss-Krüger zone 4 coordinates, as VVO sends them. */
  gk4: { up: number; right: number };
  /** The same position converted to GPS, for maps and distances. */
  location: LatLng;
};

/** A stop found near a position, with its distance in metres. */
export type NearbyStop = Stop & { distance: number };

/** Simplified mode of transport, used for line colours and labels. */
export type Mode = "tram" | "bus" | "suburban" | "train" | "ferry" | "cableway" | "taxi" | "other";

/** Whether a departure runs as planned. "Unknown" means no live data. */
export type DepartureState = "InTime" | "Delayed" | "Cancelled" | "Unknown";

/** One upcoming departure at a stop. */
export type Departure = {
  /** VVO's ID for this trip, used as a React list key. */
  id: string;
  /** Line name, e.g. "3" or "61". */
  line: string;
  /** Final destination shown on the vehicle, e.g. "Wilder Mann". */
  direction: string;
  mode: Mode;
  /** Platform or track, if VVO knows it. */
  platform: { name: string; type: "Platform" | "Railtrack" } | null;
  /** Timetable time, ISO 8601 (e.g. "2026-11-26T09:40:00.000Z"). */
  scheduledTime: string;
  /** Live, expected time, or null if there is no live data or it is cancelled. */
  realTime: string | null;
  /** Minutes late (negative = early), or null without live data. */
  delayMinutes: number | null;
  state: DepartureState;
};

/** Where the data came from: the live API or the built-in sample data. */
export type DataSource = "vvo" | "mock";

/** Everything the departure board needs for one stop. */
export type DepartureBoard = {
  stop: { id: string; name: string; city: string | null };
  departures: Departure[];
  /** When this data was fetched, ISO 8601. */
  fetchedAt: string;
  source: DataSource;
};

// ─── Raw types: what VVO actually sends ─────────────────────────────────
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

/** One departure as VVO sends it. Fields are optional because VVO omits some. */
export type RawDeparture = {
  Id?: string;
  LineName?: string;
  Direction?: string;
  Mot?: string;
  Platform?: { Name?: string; Type?: string };
  /** Microsoft JSON date, e.g. "/Date(1487778230000+0100)/". Missing if cancelled. */
  RealTime?: string;
  ScheduledTime?: string;
  State?: string;
};

/** Response of POST /dm (departure monitor). */
export type RawDepartureMonitorResponse = {
  Status: VvoStatus;
  /** Stop name, e.g. "Hauptbahnhof". */
  Name?: string;
  /** Town, e.g. "Dresden". */
  Place?: string;
  Departures?: RawDeparture[];
};
