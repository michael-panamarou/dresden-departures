import "server-only";

import { NextResponse } from "next/server";

import type { CacheResult } from "@/lib/vvo/cached";

/**
 * Helpers shared by the API routes, so every endpoint answers errors the same way:
 * a friendly message for people, technical details only in the server log.
 */

export function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

/** The response for a failed VVO call: 404 for unknown stops, 502 when VVO has a problem, 500 for bugs. */
export function failureResponse(failure: Extract<CacheResult<unknown>, { ok: false }>) {
  switch (failure.reason) {
    case "not-found":
      return jsonError("This stop doesn't exist. Search for it by name instead.", 404);
    case "unavailable":
      return jsonError("Transit data is unavailable right now. Please try again in a moment.", 502);
    case "bug":
      return jsonError("Something went wrong on our side.", 500);
  }
}
