import proj4 from "proj4";

import type { LatLng } from "./types";

/**
 * VVO uses Gauss-Krüger zone 4 (EPSG:31468), a German surveying system measured in metres.
 * Web maps and phones use GPS coordinates (WGS84, EPSG:4326). proj4 converts between them.
 * The definition below is the official one for EPSG:31468, including the datum shift
 * from the old German "Bessel" ellipsoid to WGS84.
 */
const GK4 =
  "+proj=tmerc +lat_0=0 +lon_0=12 +k=1 +x_0=4500000 +y_0=0 +ellps=bessel " +
  "+towgs84=598.1,73.7,418.2,0.202,0.045,-2.455,6.7 +units=m +no_defs";
const WGS84 = "EPSG:4326";

const converter = proj4(WGS84, GK4);

/** GK4 → GPS. Note: proj4 works with [x, y] = [right, up] and [longitude, latitude]. */
export function gk4ToLatLng(gk4: { up: number; right: number }): LatLng {
  const [lng, lat] = converter.inverse([gk4.right, gk4.up]);
  return { lat, lng };
}

/** GPS → GK4, rounded to whole metres. */
export function latLngToGk4({ lat, lng }: LatLng): { up: number; right: number } {
  const [right, up] = converter.forward([lng, lat]);
  return { up: Math.round(up), right: Math.round(right) };
}

/** Straight-line distance in metres between two GPS positions (haversine formula). */
export function distanceInMetres(a: LatLng, b: LatLng): number {
  const R = 6_371_000; // Earth's mean radius in metres
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(h)));
}

/** Rough bounding box of the VVO network, used to reject positions far outside it. */
export const VVO_AREA = { minLat: 50.6, maxLat: 51.6, minLng: 13.0, maxLng: 14.8 } as const;

export function isInVvoArea({ lat, lng }: LatLng): boolean {
  return lat >= VVO_AREA.minLat && lat <= VVO_AREA.maxLat && lng >= VVO_AREA.minLng && lng <= VVO_AREA.maxLng;
}

/** Postplatz, the centre of Dresden. Default map position when we don't know where the user is. */
export const DRESDEN_CENTRE: LatLng = { lat: 51.0505, lng: 13.7344 };
