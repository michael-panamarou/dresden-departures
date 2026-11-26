"use client";

import Link from "next/link";
import { useState } from "react";

import { StopsMap } from "@/components/stops-map";
import { useNearbyStops } from "@/lib/queries";
import { formatDistance } from "@/lib/time";
import { DRESDEN_CENTRE, isInVvoArea } from "@/lib/vvo/geo";
import type { LatLng } from "@/lib/vvo/types";

type Locating = "idle" | "locating" | "denied" | "unavailable" | "outside";

const MESSAGES: Record<Exclude<Locating, "idle" | "locating">, string> = {
  denied: "Location access is blocked. Allow it in your browser's site settings, or search by name instead.",
  unavailable: "Your location couldn't be found. Check that location services are on and try again.",
  outside: "You seem to be outside the Dresden transit area, so the map shows the city centre instead.",
};

export function NearbyView() {
  // Until the user shares their position, show stops around Postplatz in the city centre.
  const [position, setPosition] = useState<LatLng | null>(null);
  const [locating, setLocating] = useState<Locating>("idle");
  const centre = position ?? DRESDEN_CENTRE;
  const { data, isPending, isError, error } = useNearbyStops(centre);

  function locate() {
    if (!("geolocation" in navigator)) {
      setLocating("unavailable");
      return;
    }
    setLocating("locating");
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const here = { lat: coords.latitude, lng: coords.longitude };
        if (isInVvoArea(here)) {
          setPosition(here);
          setLocating("idle");
        } else {
          setPosition(null);
          setLocating("outside");
        }
      },
      (failure) => setLocating(failure.code === failure.PERMISSION_DENIED ? "denied" : "unavailable"),
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 60_000 },
    );
  }

  const stops = data?.stops ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl font-bold leading-none tracking-tight sm:text-5xl">Stops near you</h1>
          <p className="mt-2 text-muted">
            {position ? "Nearest stops to your location." : "Showing stops around Postplatz in the city centre."}
          </p>
        </div>
        <button
          type="button"
          onClick={locate}
          disabled={locating === "locating"}
          className="flex items-center gap-2 rounded-md bg-action px-4 py-2.5 font-semibold text-action-ink hover:opacity-90 disabled:opacity-60"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
            <circle cx="12" cy="12" r="3" />
            <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
            <circle cx="12" cy="12" r="7" />
          </svg>
          {locating === "locating" ? "Finding you …" : position ? "Update my location" : "Use my location"}
        </button>
      </div>

      {locating !== "idle" && locating !== "locating" && (
        <p role="alert" className="rounded-md border-l-4 border-action bg-surface px-4 py-3">
          {MESSAGES[locating]}
        </p>
      )}

      {data?.source === "mock" && (
        <p className="rounded-md border border-dashed border-muted px-4 py-2 text-sm text-muted">
          Offline mode: only the five sample stops are available.
        </p>
      )}

      <StopsMap centre={centre} stops={stops} showPosition={position !== null} />

      <section aria-labelledby="nearby-list-heading">
        <h2 id="nearby-list-heading" className="mb-3 font-display text-2xl font-semibold">
          Nearest stops
        </h2>
        {isPending ? (
          <p className="text-muted" role="status">
            Looking for stops …
          </p>
        ) : isError ? (
          <p className="text-muted" role="alert">
            {error.message}
          </p>
        ) : stops.length === 0 ? (
          <p className="text-muted">No stops found nearby. Try searching by name on the home page.</p>
        ) : (
          <ul className="divide-y divide-rule overflow-hidden rounded-lg border border-rule bg-surface">
            {stops.map((stop) => (
              <li key={stop.id}>
                <Link href={`/stops/${stop.id}`} className="flex items-baseline justify-between gap-4 px-4 py-3 hover:bg-page">
                  <span lang="de" className="text-lg font-medium">
                    {stop.name}
                  </span>
                  <span className="text-sm text-muted tabular">{formatDistance(stop.distance)}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
