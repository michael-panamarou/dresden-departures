import { describe, expect, it } from "vitest";

import { parseRecent } from "./browser-store";
import { validateFavorite } from "./favorites";
import { formatClock, formatCountdown, formatDistance } from "./time";

describe("formatCountdown", () => {
  const now = new Date("2026-11-26T09:00:00Z").getTime();

  it("shows 'now', minutes, and clock times for later departures", () => {
    expect(formatCountdown("2026-11-26T09:00:40Z", now)).toBe("now");
    expect(formatCountdown("2026-11-26T08:59:00Z", now)).toBe("now");
    expect(formatCountdown("2026-11-26T09:04:59Z", now)).toBe("4 min");
    expect(formatCountdown("2026-11-26T10:15:00Z", now)).toBe("11:15");
  });
});

describe("formatClock", () => {
  it("always uses Dresden's time zone, including summer time", () => {
    expect(formatClock("2026-11-26T09:00:00Z")).toBe("10:00"); // CET, UTC+1
    expect(formatClock("2026-07-01T09:00:00Z")).toBe("11:00"); // CEST, UTC+2
  });
});

describe("formatDistance", () => {
  it("uses metres below a kilometre", () => {
    expect(formatDistance(64)).toBe("60 m");
    expect(formatDistance(999)).toBe("1000 m");
    expect(formatDistance(1234)).toBe("1.2 km");
  });
});

describe("validateFavorite", () => {
  it("accepts a clean favourite and trims the name", () => {
    expect(validateFavorite({ stopId: "33000028", stopName: "  Hauptbahnhof " })).toEqual({ stopId: "33000028", stopName: "Hauptbahnhof" });
  });

  it.each([null, "text", {}, { stopId: "<b>", stopName: "x" }, { stopId: "33000028", stopName: "" }, { stopId: "33000028", stopName: "x".repeat(121) }])(
    "rejects %j",
    (body) => {
      expect(typeof validateFavorite(body)).toBe("string");
    },
  );
});

describe("parseRecent", () => {
  it("ignores broken or tampered storage", () => {
    expect(parseRecent(null)).toEqual([]);
    expect(parseRecent("not json")).toEqual([]);
    expect(parseRecent('{"id":1}')).toEqual([]);
    expect(parseRecent('[{"id":"1","name":"A"},{"id":2}]')).toEqual([{ id: "1", name: "A" }]);
  });
});
