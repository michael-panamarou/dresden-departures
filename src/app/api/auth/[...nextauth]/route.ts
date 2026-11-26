import type { NextRequest } from "next/server";

import { handlers } from "@/auth";
import { jsonError } from "@/lib/api";
import { isFavoritesEnabled } from "@/lib/features";

/**
 * Auth.js endpoints: /api/auth/signin, /api/auth/callback/github, /api/auth/session, ...
 * Without the required settings they answer 404 instead of crashing with "missing secret".
 */
const NOT_CONFIGURED = () => jsonError("Sign-in is not configured on this deployment.", 404);

export function GET(request: NextRequest) {
  return isFavoritesEnabled() ? handlers.GET(request) : NOT_CONFIGURED();
}

export function POST(request: NextRequest) {
  return isFavoritesEnabled() ? handlers.POST(request) : NOT_CONFIGURED();
}
