import "server-only";

import { getDb } from "@/lib/db";

/** Data access for favourites. Every query is limited to one user's rows. */

export type FavoriteStop = { stopId: string; stopName: string };

export const MAX_FAVORITES = 50;
const STOP_ID_PATTERN = /^(\d{1,12}|de:\d{1,6}:\d{1,8}(:\d{1,4}){0,2})$/;

/** Checks a request body; returns a clean favourite or a message explaining what's wrong. */
export function validateFavorite(body: unknown): FavoriteStop | string {
  if (typeof body !== "object" || body === null) return "Send a JSON body like { \"stopId\": \"33000028\", \"stopName\": \"Hauptbahnhof\" }.";
  const { stopId, stopName } = body as Record<string, unknown>;
  if (typeof stopId !== "string" || !STOP_ID_PATTERN.test(stopId)) return "stopId must be a VVO stop ID like \"33000028\".";
  if (typeof stopName !== "string" || stopName.trim().length === 0 || stopName.length > 120)
    return "stopName must be between 1 and 120 characters.";
  return { stopId, stopName: stopName.trim() };
}

export async function listFavorites(userId: string): Promise<FavoriteStop[]> {
  return getDb().favorite.findMany({
    where: { userId },
    orderBy: { createdAt: "asc" },
    select: { stopId: true, stopName: true },
  });
}

/** Saves a favourite. Saving the same stop twice just updates its name. */
export async function addFavorite(userId: string, stop: FavoriteStop): Promise<"saved" | "limit"> {
  const db = getDb();
  const exists = await db.favorite.findUnique({ where: { userId_stopId: { userId, stopId: stop.stopId } } });
  if (!exists && (await db.favorite.count({ where: { userId } })) >= MAX_FAVORITES) return "limit";

  await db.favorite.upsert({
    where: { userId_stopId: { userId, stopId: stop.stopId } },
    create: { userId, ...stop },
    update: { stopName: stop.stopName },
  });
  return "saved";
}

export async function removeFavorite(userId: string, stopId: string): Promise<void> {
  // deleteMany doesn't fail when the row is already gone.
  await getDb().favorite.deleteMany({ where: { userId, stopId } });
}
