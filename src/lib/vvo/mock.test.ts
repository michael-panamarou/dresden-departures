import { describe, expect, it } from "vitest";

import { findMockNearbyStops, getMockDepartureBoard, searchMockStops } from "./mock";

describe("searchMockStops", () => {
  it("matches any part of the name, ignoring case and spaces", () => {
    expect(searchMockStops("  BAHN ").map((s) => s.name)).toEqual(["Hauptbahnhof", "Bahnhof Neustadt"]);
  });

  it("respects the limit and returns nothing for an empty query", () => {
    expect(searchMockStops("bahn", 1)).toHaveLength(1);
    expect(searchMockStops("")).toEqual([]);
  });
});

describe("findMockNearbyStops", () => {
  it("sorts stops by distance from the position", () => {
    const stops = findMockNearbyStops({ lat: 51.0658, lng: 13.741 }); // at Bahnhof Neustadt
    expect(stops[0].name).toBe("Bahnhof Neustadt");
    expect(stops[0].distance).toBeLessThan(50);
    const distances = stops.map((s) => s.distance);
    expect(distances).toEqual([...distances].sort((a, b) => a - b));
  });
});

describe("getMockDepartureBoard", () => {
  const now = new Date("2026-11-26T10:00:30Z");

  it("returns null for stops without sample data", () => {
    expect(getMockDepartureBoard("12345", now)).toBeNull();
  });

  it("generates upcoming departures, sorted, and the same every time", () => {
    const board = getMockDepartureBoard("33000028", now);
    expect(board?.stop.name).toBe("Hauptbahnhof");
    expect(board?.source).toBe("mock");
    expect(board?.departures).toHaveLength(12);

    const times = board!.departures.map((d) => new Date(d.realTime ?? d.scheduledTime).getTime());
    expect(times).toEqual([...times].sort((a, b) => a - b));
    expect(Math.min(...board!.departures.map((d) => new Date(d.scheduledTime).getTime()))).toBeGreaterThanOrEqual(
      new Date("2026-11-26T10:00:00Z").getTime(),
    );
    expect(getMockDepartureBoard("33000028", now)).toEqual(board);
  });

  it("keeps cancelled departures consistent", () => {
    for (const stopId of ["33000028", "33000016", "33000293", "33000294", "33000742"]) {
      for (const departure of getMockDepartureBoard(stopId, now, 50)!.departures) {
        if (departure.state === "Cancelled") expect(departure.realTime).toBeNull();
        else expect(departure.delayMinutes).toBeGreaterThanOrEqual(0);
      }
    }
  });
});
