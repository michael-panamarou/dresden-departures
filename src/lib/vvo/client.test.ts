import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { findNearbyStops, getDepartureBoard, searchStops, StopNotFoundError, VvoError } from "./client";

/**
 * The client against a fake `fetch`: every failure type from Lesson 1 must end up
 * as a VvoError (or StopNotFoundError), and successful answers must be parsed.
 */
function respondWith(body: unknown, init: ResponseInit = { status: 200 }) {
  const response = new Response(typeof body === "string" ? body : JSON.stringify(body), init);
  return vi.fn().mockResolvedValue(response);
}

beforeEach(() => vi.stubEnv("VVO_MOCK", "0"));
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("searchStops", () => {
  it("sends the right query and parses the stops", async () => {
    const fetchMock = respondWith({ PointStatus: "List", Status: { Code: "Ok" }, Points: ["33000742|||Helmholtzstraße|5655922|4621087|0||"] });
    vi.stubGlobal("fetch", fetchMock);

    const stops = await searchStops("helmholtz", 5);

    expect(stops.map((s) => s.name)).toEqual(["Helmholtzstraße"]);
    const url = new URL(fetchMock.mock.calls[0][0]);
    expect(url.pathname).toBe("/tr/pointfinder");
    expect(Object.fromEntries(url.searchParams)).toMatchObject({ query: "helmholtz", limit: "5", stopsOnly: "true", regionalOnly: "true", format: "json" });
  });

  it("returns an empty list when VVO finds nothing", async () => {
    vi.stubGlobal("fetch", respondWith({ PointStatus: "NotIdentified", Status: { Code: "Ok" } }));
    expect(await searchStops("xyzxyz")).toEqual([]);
  });

  it("failure ❶: no answer at all", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("fetch failed")));
    const error = await searchStops("post").catch((e: unknown) => e);
    expect(error).toBeInstanceOf(VvoError);
    expect((error as VvoError).cause).toBeInstanceOf(TypeError);
  });

  it("failure ❷: an HTTP error", async () => {
    vi.stubGlobal("fetch", respondWith("Service Unavailable", { status: 503 }));
    await expect(searchStops("post")).rejects.toThrow(new VvoError("VVO responded with HTTP 503"));
  });

  it("failure ④: a body that isn't JSON", async () => {
    vi.stubGlobal("fetch", respondWith("<html>debug page</html>"));
    await expect(searchStops("post")).rejects.toThrow(/isn't valid JSON/);
  });

  it("failure ❸: HTTP 200 with an error status", async () => {
    vi.stubGlobal("fetch", respondWith({ Status: { Code: "ServiceError", Message: "something broke" } }));
    await expect(searchStops("post")).rejects.toThrow(new VvoError("VVO status ServiceError: something broke"));
  });

  it("uses the sample data in mock mode, without any request", async () => {
    vi.stubEnv("VVO_MOCK", "1");
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    expect((await searchStops("bahn")).length).toBe(2);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("findNearbyStops", () => {
  it("asks VVO with Gauss-Krüger coordinates and sorts by distance", async () => {
    const fetchMock = respondWith({
      Status: { Code: "Ok" },
      Points: [
        "coord:4621685:5657497:NAV4:x|c|Dresden|x|5657497|4621685|0||",
        "33000016|||Bahnhof Neustadt|5660412|4622148|0||",
        "33000028|||Hauptbahnhof|5657497|4621685|0||",
      ],
    });
    vi.stubGlobal("fetch", fetchMock);

    const stops = await findNearbyStops({ lat: 51.0397, lng: 13.7335 });

    expect(new URL(fetchMock.mock.calls[0][0]).searchParams.get("query")).toMatch(/^coord:46216\d\d:56574\d\d$/);
    expect(stops.map((s) => s.name)).toEqual(["Hauptbahnhof", "Bahnhof Neustadt"]);
    expect(stops[0].distance).toBeLessThan(20);
  });
});

describe("getDepartureBoard", () => {
  it("POSTs to the departure monitor and parses the answer", async () => {
    const fetchMock = respondWith({
      Status: { Code: "Ok" },
      Name: "Hauptbahnhof",
      Place: "Dresden",
      Departures: [{ Id: "1", LineName: "3", Direction: "Wilder Mann", Mot: "Tram", ScheduledTime: "/Date(1487778060000+0100)/", RealTime: "/Date(1487778230000+0100)/", State: "Delayed" }],
    });
    vi.stubGlobal("fetch", fetchMock);

    const board = await getDepartureBoard("33000028");

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://webapi.vvo-online.de/dm");
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body)).toMatchObject({ stopid: "33000028", format: "json" });
    expect(board).toMatchObject({ stop: { id: "33000028", name: "Hauptbahnhof", city: null }, source: "vvo" });
    expect(board.departures[0]).toMatchObject({ line: "3", delayMinutes: 3 });
  });

  it("reports unknown stops as StopNotFoundError", async () => {
    vi.stubGlobal("fetch", respondWith({ Status: { Code: "ServiceError", Message: "stop invalid" } }));
    await expect(getDepartureBoard("99999999")).rejects.toBeInstanceOf(StopNotFoundError);
  });
});
