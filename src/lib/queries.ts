"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { DataSource, DepartureBoard, NearbyStop, Stop } from "@/lib/vvo/types";

/**
 * Everything the browser fetches goes through these hooks (TanStack Query).
 * TanStack Query caches answers, removes duplicate requests, retries failures
 * and refreshes data on a timer, so components only describe *what* they need.
 */

/** An error from our own API, carrying its friendly message and HTTP status. */
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  const body = (await response.json().catch(() => null)) as (T & { error?: string }) | null;
  if (!response.ok) {
    throw new ApiError(body?.error ?? `Request failed (HTTP ${response.status})`, response.status);
  }
  return body as T;
}

/** Don't retry answers that won't change on a second try (bad input, unknown stop, not signed in). */
function shouldRetry(failureCount: number, error: Error): boolean {
  if (error instanceof ApiError && error.status >= 400 && error.status < 500) return false;
  return failureCount < 2;
}

// ─── Stops ──────────────────────────────────────────────────────────────

export function useStopSearch(query: string) {
  const q = query.trim();
  return useQuery({
    queryKey: ["stops", q.toLowerCase()],
    queryFn: ({ signal }) =>
      fetchJson<{ stops: Stop[]; source: DataSource }>(`/api/stops?q=${encodeURIComponent(q)}`, { signal }),
    enabled: q.length >= 2,
    // While typing, keep showing the previous suggestions instead of flashing an empty list.
    placeholderData: keepPreviousData,
    staleTime: 5 * 60_000,
    retry: shouldRetry,
  });
}

export function useNearbyStops(position: { lat: number; lng: number } | null) {
  return useQuery({
    queryKey: ["nearby", position?.lat.toFixed(3), position?.lng.toFixed(3)],
    queryFn: ({ signal }) =>
      fetchJson<{ stops: NearbyStop[]; source: DataSource }>(
        `/api/stops/nearby?lat=${position!.lat}&lng=${position!.lng}`,
        { signal },
      ),
    enabled: position !== null,
    staleTime: 10 * 60_000,
    retry: shouldRetry,
  });
}

// ─── Departures ─────────────────────────────────────────────────────────

export const DEPARTURES_REFRESH_MS = 30_000;

export function useDepartures(stopId: string) {
  return useQuery({
    queryKey: ["departures", stopId],
    queryFn: ({ signal }) =>
      fetchJson<DepartureBoard>(`/api/departures?stopId=${encodeURIComponent(stopId)}`, { signal }),
    // The heart of the board: ask again every 30 seconds, but only while the tab is visible.
    refetchInterval: DEPARTURES_REFRESH_MS,
    refetchIntervalInBackground: false,
    staleTime: 10_000,
    retry: shouldRetry,
  });
}

// ─── Session and favourites ─────────────────────────────────────────────

export type Session = { user: { id?: string; name?: string | null; image?: string | null } } | null;

/** Asks Auth.js who is signed in. Only enabled when the favourites feature is configured. */
export function useSession(enabled: boolean) {
  return useQuery({
    queryKey: ["session"],
    queryFn: async () => {
      const session = await fetchJson<Session | Record<string, never>>("/api/auth/session");
      return session && "user" in session ? session : null;
    },
    enabled,
    staleTime: 5 * 60_000,
    retry: shouldRetry,
  });
}

export type Favorite = { stopId: string; stopName: string };

export function useFavorites(enabled: boolean) {
  return useQuery({
    queryKey: ["favorites"],
    queryFn: () => fetchJson<{ favorites: Favorite[] }>("/api/favorites").then((r) => r.favorites),
    enabled,
    retry: shouldRetry,
  });
}

/** Adds or removes a favourite. The list updates immediately and rolls back if the server says no. */
export function useToggleFavorite() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ stop, save }: { stop: Favorite; save: boolean }) => {
      if (save) {
        await fetchJson("/api/favorites", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(stop),
        });
      } else {
        await fetchJson(`/api/favorites?stopId=${encodeURIComponent(stop.stopId)}`, { method: "DELETE" });
      }
    },
    onMutate: async ({ stop, save }) => {
      await queryClient.cancelQueries({ queryKey: ["favorites"] });
      const previous = queryClient.getQueryData<Favorite[]>(["favorites"]);
      queryClient.setQueryData<Favorite[]>(["favorites"], (list = []) =>
        save ? [...list.filter((f) => f.stopId !== stop.stopId), stop] : list.filter((f) => f.stopId !== stop.stopId),
      );
      return { previous };
    },
    onError: (_error, _variables, context) => {
      queryClient.setQueryData(["favorites"], context?.previous);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["favorites"] }),
  });
}
