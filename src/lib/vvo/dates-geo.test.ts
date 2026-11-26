import { describe, expect, it } from "vitest";

import { delayInMinutes, parseVvoDate } from "./dates";
import { distanceInMetres, gk4ToLatLng, isInVvoArea, latLngToGk4 } from "./geo";

describe("parseVvoDate", () => {
  it("reads Microsoft JSON dates and ignores the informational offset", () => {
    expect(parseVvoDate("/Date(1487778230000+0100)/")?.toISOString()).toBe("2017-02-22T15:43:50.000Z");
    expect(parseVvoDate("/Date(1487778230000-0000)/")?.toISOString()).toBe("2017-02-22T15:43:50.000Z");
    expect(parseVvoDate("/Date(1487778230000)/")?.toISOString()).toBe("2017-02-22T15:43:50.000Z");
  });

  it.each([undefined, "", "2017-02-22T15:43:50Z", "/Date(abc)/", "Date(1487778230000)"])("returns null for %s", (value) => {
    expect(parseVvoDate(value)).toBeNull();
  });
});

describe("delayInMinutes", () => {
  it("rounds to whole minutes and can be negative", () => {
    const scheduled = new Date("2026-11-26T10:00:00Z");
    expect(delayInMinutes(scheduled, new Date("2026-11-26T10:02:50Z"))).toBe(3);
    expect(delayInMinutes(scheduled, new Date("2026-11-26T10:00:20Z"))).toBe(0);
    expect(delayInMinutes(scheduled, new Date("2026-11-26T09:59:00Z"))).toBe(-1);
  });
});

describe("coordinates", () => {
  it("places Dresden Hauptbahnhof in front of the station", () => {
    const { lat, lng } = gk4ToLatLng({ up: 5657497, right: 4621685 });
    expect(lat).toBeCloseTo(51.0397, 3);
    expect(lng).toBeCloseTo(13.7335, 3);
  });

  it("converts GPS back to the same Gauss-Krüger metres", () => {
    const gk4 = { up: 5660412, right: 4622148 };
    expect(latLngToGk4(gk4ToLatLng(gk4))).toEqual(gk4);
  });

  it("measures distances in metres", () => {
    // Postplatz → Hauptbahnhof is a little over a kilometre.
    expect(distanceInMetres({ lat: 51.0505, lng: 13.7344 }, { lat: 51.0397, lng: 13.7335 })).toBeGreaterThan(1150);
    expect(distanceInMetres({ lat: 51.0505, lng: 13.7344 }, { lat: 51.0505, lng: 13.7344 })).toBe(0);
  });

  it("knows the rough extent of the VVO area", () => {
    expect(isInVvoArea({ lat: 51.05, lng: 13.73 })).toBe(true); // Dresden
    expect(isInVvoArea({ lat: 52.52, lng: 13.4 })).toBe(false); // Berlin
  });
});
