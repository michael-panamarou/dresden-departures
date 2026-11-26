import { NextResponse, type NextRequest } from "next/server";

import { auth } from "@/auth";
import { jsonError } from "@/lib/api";
import { isFavoritesEnabled } from "@/lib/features";
import { addFavorite, listFavorites, MAX_FAVORITES, removeFavorite, validateFavorite } from "@/lib/favorites";

/**
 * GET    /api/favorites              → 200 { favorites: [{ stopId, stopName }] }
 * POST   /api/favorites  { stopId, stopName } → 201 { favorite }
 * DELETE /api/favorites?stopId=…     → 204
 *
 * 401 when not signed in, 404 when the feature isn't configured, 500 on database errors.
 * Responses are personal, so they are never stored by shared caches.
 */
const PRIVATE = { "Cache-Control": "private, no-store" };

/** Returns the signed-in user's ID, or a ready-made error response. */
async function requireUser(): Promise<string | NextResponse> {
  if (!isFavoritesEnabled()) return jsonError("Favourites are not configured on this deployment.", 404);
  const session = await auth();
  return session?.user?.id ?? jsonError("Sign in to use favourites.", 401);
}

function serverError(action: string, error: unknown) {
  console.error(`[api/favorites] Could not ${action}:`, error);
  return jsonError("Your favourites couldn't be updated. Please try again.", 500);
}

export async function GET() {
  const userId = await requireUser();
  if (userId instanceof NextResponse) return userId;
  try {
    return NextResponse.json({ favorites: await listFavorites(userId) }, { headers: PRIVATE });
  } catch (error) {
    return serverError("list favourites", error);
  }
}

export async function POST(request: NextRequest) {
  const userId = await requireUser();
  if (userId instanceof NextResponse) return userId;

  const favorite = validateFavorite(await request.json().catch(() => null));
  if (typeof favorite === "string") return jsonError(favorite, 400);

  try {
    const result = await addFavorite(userId, favorite);
    if (result === "limit") return jsonError(`You can save up to ${MAX_FAVORITES} stops.`, 409);
    return NextResponse.json({ favorite }, { status: 201, headers: PRIVATE });
  } catch (error) {
    return serverError("save a favourite", error);
  }
}

export async function DELETE(request: NextRequest) {
  const userId = await requireUser();
  if (userId instanceof NextResponse) return userId;

  const stopId = request.nextUrl.searchParams.get("stopId") ?? "";
  if (!stopId) return jsonError("Add ?stopId=… to choose which favourite to remove.", 400);

  try {
    await removeFavorite(userId, stopId);
    return new NextResponse(null, { status: 204, headers: PRIVATE });
  } catch (error) {
    return serverError("remove a favourite", error);
  }
}
