import { describe, expect, it } from "vitest";

import { expectedTime, parseDeparture, parseDepartures, parseMode, parsePoint, parsePoints } from "./parse";

describe("parsePoint", () => {
  it("turns a Dresden stop into a Stop with city null and GPS coordinates", () => {
    const stop = parsePoint("33000742|||Helmholtzstraße|5655922|4621087|0||");
    expect(stop).toMatchObject({
      id: "33000742",
      name: "Helmholtzstraße",
      city: null,
      gk4: { up: 5655922, right: 4621087 },
    });
    expect(stop?.location.lat).toBeCloseTo(51.0257, 3);
    expect(stop?.location.lng).toBeCloseTo(13.7245, 3);
  });

  it("keeps the city for stops outside the VVO area", () => {
    expect(parsePoint("36030083||Chemnitz|Helmholtzstr|5635839|4566835|0||")?.city).toBe("Chemnitz");
  });

  it.each([
    ["a coordinate result", "coord:4621022.70:504065.41:NAV4:Nöthnitzer Straße 46|c|(Dresden)|Nöthnitzer Straße 46|5655935|4621022|0||"],
    ["a street (type a)", "12345|a|Dresden|Prager Straße|5657000|4621000|0||"],
    ["an empty string", ""],
    ["a missing name", "33000742||||5655922|4621087|0||"],
    ["coordinates of 0", "33000742|||X|0|0|0||"],
    ["text instead of coordinates", "33000742|||X|abc|4621087|0||"],
  ])("rejects %s", (_label, raw) => {
    expect(parsePoint(raw)).toBeNull();
  });
});

describe("parsePoints", () => {
  it("keeps only valid stops and removes duplicates", () => {
    const stops = parsePoints([
      "33000742|||Helmholtzstraße|5655922|4621087|0||",
      "broken",
      "33000742|||Helmholtzstraße|5655922|4621087|0||",
      "33000028|||Hauptbahnhof|5657497|4621685|0||",
    ]);
    expect(stops.map((s) => s.name)).toEqual(["Helmholtzstraße", "Hauptbahnhof"]);
  });
});

describe("parseMode", () => {
  it("groups VVO's modes of transport", () => {
    expect(parseMode("Tram")).toBe("tram");
    expect(parseMode("CityBus")).toBe("bus");
    expect(parseMode("IntercityBus")).toBe("bus");
    expect(parseMode("SuburbanRailway")).toBe("suburban");
    expect(parseMode("Ferry")).toBe("ferry");
    expect(parseMode("SomethingNew")).toBe("other");
    expect(parseMode(undefined)).toBe("other");
  });
});

describe("parseDeparture", () => {
  // Example from the community documentation: scheduled 15:41:00, expected 15:43:50 (CET).
  const delayed = {
    Id: "voe:11003: :H:j26",
    LineName: "3",
    Direction: "Wilder Mann",
    Platform: { Name: "3", Type: "Platform" },
    Mot: "Tram",
    RealTime: "/Date(1487778230000+0100)/",
    ScheduledTime: "/Date(1487778060000+0100)/",
    State: "Delayed",
  };

  it("parses a delayed tram", () => {
    expect(parseDeparture(delayed)).toEqual({
      id: "voe:11003: :H:j26",
      line: "3",
      direction: "Wilder Mann",
      mode: "tram",
      platform: { name: "3", type: "Platform" },
      scheduledTime: "2017-02-22T15:41:00.000Z",
      realTime: "2017-02-22T15:43:50.000Z",
      delayMinutes: 3,
      state: "Delayed",
    });
  });

  it("has no live time or delay when cancelled", () => {
    const cancelled = parseDeparture({ ...delayed, State: "Cancelled" });
    expect(cancelled).toMatchObject({ state: "Cancelled", realTime: null, delayMinutes: null });
  });

  it("marks departures without live data as Unknown", () => {
    const planned = parseDeparture({ ...delayed, RealTime: undefined, State: undefined });
    expect(planned).toMatchObject({ state: "Unknown", realTime: null, delayMinutes: null });
  });

  it("recognises railway tracks and missing platforms", () => {
    expect(parseDeparture({ ...delayed, Platform: { Name: "2", Type: "Railtrack" } })?.platform).toEqual({ name: "2", type: "Railtrack" });
    expect(parseDeparture({ ...delayed, Platform: undefined })?.platform).toBeNull();
  });

  it("builds a stable id when VVO sends none", () => {
    expect(parseDeparture({ ...delayed, Id: undefined })?.id).toBe("3-Wilder Mann-1487778060000");
  });

  it.each(["LineName", "Direction", "ScheduledTime"] as const)("rejects a departure without %s", (field) => {
    expect(parseDeparture({ ...delayed, [field]: undefined })).toBeNull();
  });
});

describe("parseDepartures", () => {
  it("sorts by the time a vehicle actually leaves, live time first", () => {
    const base = { Direction: "X", Mot: "Tram", State: "InTime" };
    const departures = parseDepartures([
      { ...base, LineName: "late", ScheduledTime: "/Date(1000000)/", RealTime: "/Date(9000000)/" },
      { ...base, LineName: "early", ScheduledTime: "/Date(2000000)/", RealTime: "/Date(2000000)/" },
      { ...base, LineName: "broken" },
    ]);
    expect(departures.map((d) => d.line)).toEqual(["early", "late"]);
    expect(expectedTime(departures[1])).toBe(9_000_000);
  });
});
