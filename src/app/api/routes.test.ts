import { NextRequest } from "next/server";
import { describe, expect, it, vi } from "vitest";

// "use cache" only works inside Next.js. In tests the cached functions run directly,
// so cacheLife (which tells Next.js how long to cache) can be a no-op.
vi.mock("next/cache", () => ({ cacheLife: () => {} }));
// Auth.js only runs inside Next.js; these tests never sign anyone in.
vi.mock("@/auth", () => ({ auth: async () => null }));

const { GET: searchStops } = await import("./stops/route");
const { GET: nearbyStops } = await import("./stops/nearby/route");
const { GET: departures } = await import("./departures/route");
const { GET: favorites } = await import("./favorites/route");

function request(path: string) {
  return new NextRequest(`http://localhost${path}`);
}

/** These tests run in mock mode (see vitest.config.ts), so no network is used. */
describe("GET /api/stops", () => {
  it("returns matching stops with cache headers", async () => {
    const response = await searchStops(request("/api/stops?q=bahn"));
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toContain("s-maxage=3600");
    const body = await response.json();
    expect(body.source).toBe("mock");
    expect(body.stops.map((s: { name: string }) => s.name)).toEqual(["Hauptbahnhof", "Bahnhof Neustadt"]);
  });

  it("treats too-short and missing queries as an empty result", async () => {
    for (const path of ["/api/stops?q=p", "/api/stops", "/api/stops?q=%20%20"]) {
      const response = await searchStops(request(path));
      expect(response.status).toBe(200);
      expect((await response.json()).stops).toEqual([]);
    }
  });

  it("rejects queries longer than 100 characters", async () => {
    const response = await searchStops(request(`/api/stops?q=${"a".repeat(101)}`));
    expect(response.status).toBe(400);
  });
});

describe("GET /api/stops/nearby", () => {
  it("returns stops sorted by distance", async () => {
    const response = await nearbyStops(request("/api/stops/nearby?lat=51.0397&lng=13.7335"));
    expect(response.status).toBe(200);
    expect((await response.json()).stops[0].name).toBe("Hauptbahnhof");
  });

  it.each([
    ["no position", "/api/stops/nearby"],
    ["text", "/api/stops/nearby?lat=abc&lng=13.7"],
    ["a position in Berlin", "/api/stops/nearby?lat=52.52&lng=13.40"],
  ])("rejects %s with 400", async (_label, path) => {
    expect((await nearbyStops(request(path))).status).toBe(400);
  });
});

describe("GET /api/departures", () => {
  it("returns the board for a known stop", async () => {
    const response = await departures(request("/api/departures?stopId=33000028"));
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toContain("s-maxage=10");
    const board = await response.json();
    expect(board.stop.name).toBe("Hauptbahnhof");
    expect(board.departures.length).toBeGreaterThan(0);
  });

  it("answers 404 for an unknown stop and 400 for a malformed ID", async () => {
    expect((await departures(request("/api/departures?stopId=12345"))).status).toBe(404);
    expect((await departures(request("/api/departures?stopId=%3Cscript%3E"))).status).toBe(400);
    expect((await departures(request("/api/departures"))).status).toBe(400);
  });
});

describe("GET /api/favorites", () => {
  it("answers 404 when sign-in isn't configured", async () => {
    expect((await favorites()).status).toBe(404);
  });
});
