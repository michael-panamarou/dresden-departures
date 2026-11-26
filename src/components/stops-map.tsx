"use client";

import "maplibre-gl/dist/maplibre-gl.css";

import type { Map as MapLibreMap, Marker } from "maplibre-gl";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import type { LatLng, NearbyStop } from "@/lib/vvo/types";

/**
 * Free vector map tiles from OpenFreeMap (no API key, OpenStreetMap data).
 * The style includes the required "© OpenStreetMap" attribution.
 */
const MAP_STYLE = "https://tiles.openfreemap.org/styles/liberty";

/** Copied into public/ on install by scripts/copy-map-worker.mjs. */
const WORKER_URL = "/maplibre-gl-worker.mjs";

function stopMarker(stop: NearbyStop, onSelect: () => void): HTMLElement {
  const element = document.createElement("button");
  element.type = "button";
  element.setAttribute("aria-label", `${stop.name}: show departures`);
  element.title = stop.name;
  element.className =
    "grid h-7 w-7 place-items-center rounded-full border-2 border-[var(--sign-green)] bg-[var(--sign-yellow)] font-bold text-[var(--sign-green)] text-sm shadow-md";
  element.textContent = "H";
  element.addEventListener("click", onSelect);
  return element;
}

function positionMarker(): HTMLElement {
  const element = document.createElement("div");
  element.setAttribute("aria-hidden", "true");
  element.className = "h-4 w-4 rounded-full border-[3px] border-white bg-[var(--action)] shadow-[0_0_0_6px_rgb(29_79_134/0.25)]";
  return element;
}

/**
 * The interactive map. MapLibre draws with WebGL in the browser only, so it is loaded
 * with a dynamic import inside useEffect (it can't run on the server).
 */
export function StopsMap({ centre, stops, showPosition }: { centre: LatLng; stops: NearbyStop[]; showPosition: boolean }) {
  const router = useRouter();
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<MapLibreMap | null>(null);
  const markers = useRef<Marker[]>([]);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);

  // Create the map once.
  useEffect(() => {
    let cancelled = false;
    import("maplibre-gl").then((maplibregl) => {
      if (cancelled || !container.current) return;
      maplibregl.setWorkerUrl(WORKER_URL);
      const instance = new maplibregl.Map({
        container: container.current,
        style: MAP_STYLE,
        center: [centre.lng, centre.lat],
        zoom: 15,
        attributionControl: { compact: true },
      });
      instance.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
      instance.on("error", () => setFailed(true));
      instance.on("load", () => setFailed(false));
      map.current = instance;
      setReady(true);
    });
    return () => {
      cancelled = true;
      map.current?.remove();
      map.current = null;
    };
    // The map is created once; position changes are handled by the effect below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Show the stops (and the user's position), and zoom so that all of them fit.
  useEffect(() => {
    const instance = map.current;
    if (!ready || !instance) return;

    import("maplibre-gl").then((maplibregl) => {
      markers.current.forEach((m) => m.remove());
      markers.current = stops.map((stop) =>
        new maplibregl.Marker({ element: stopMarker(stop, () => router.push(`/stops/${stop.id}`)) })
          .setLngLat([stop.location.lng, stop.location.lat])
          .addTo(instance),
      );
      if (showPosition) {
        markers.current.push(new maplibregl.Marker({ element: positionMarker() }).setLngLat([centre.lng, centre.lat]).addTo(instance));
      }

      const bounds = new maplibregl.LngLatBounds([centre.lng, centre.lat], [centre.lng, centre.lat]);
      stops.slice(0, 6).forEach((s) => bounds.extend([s.location.lng, s.location.lat]));
      instance.fitBounds(bounds, { padding: 56, maxZoom: 16, duration: 0 });
    });
  }, [ready, stops, centre, showPosition, router]);

  return (
    <div className="relative h-[52vh] min-h-72 overflow-hidden rounded-xl border border-rule bg-rule/40 sm:h-[28rem]">
      {/* h-full/w-full, not absolute: MapLibre gives its container position: relative */}
      <div ref={container} className="h-full w-full" />
      {failed && (
        <p className="absolute inset-x-3 bottom-3 rounded-md bg-surface/95 px-3 py-2 text-sm text-muted">
          Parts of the map couldn&apos;t load. The list of stops still works.
        </p>
      )}
    </div>
  );
}
