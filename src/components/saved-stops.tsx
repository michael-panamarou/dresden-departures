"use client";

import Link from "next/link";
import { signIn } from "next-auth/react";

import { useFeatures } from "@/app/providers";
import { clearRecentStops, useRecentStops } from "@/lib/browser-store";
import { useFavorites, useSession, type Favorite } from "@/lib/queries";

function StopLinks({ stops }: { stops: Favorite[] }) {
  return (
    <ul className="divide-y divide-rule overflow-hidden rounded-lg border border-rule bg-surface">
      {stops.map((stop) => (
        <li key={stop.stopId}>
          <Link
            href={`/stops/${stop.stopId}`}
            className="flex items-center justify-between px-4 py-3 text-lg font-medium hover:bg-page"
          >
            <span lang="de">{stop.stopName}</span>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true" className="text-muted">
              <path d="m9 6 6 6-6 6" />
            </svg>
          </Link>
        </li>
      ))}
    </ul>
  );
}

/** "Your stops" (favourites, if signed in) and "Recently viewed" (kept in this browser). */
export function SavedStops() {
  const features = useFeatures();
  const session = useSession(features.favorites);
  const signedIn = Boolean(session.data);
  const favorites = useFavorites(features.favorites && signedIn);
  const recent = useRecentStops();

  return (
    <div className="space-y-10">
      {features.favorites && (
        <section aria-labelledby="favorites-heading">
          <h2 id="favorites-heading" className="mb-3 font-display text-2xl font-semibold">
            Your stops
          </h2>
          {session.isPending ? null : !signedIn ? (
            <p className="text-muted">
              <button type="button" onClick={() => signIn("github")} className="font-semibold text-action underline underline-offset-2">
                Sign in with GitHub
              </button>{" "}
              to save the stops you use most and find them here on any device.
            </p>
          ) : favorites.isError ? (
            <p className="text-muted">Your saved stops couldn&apos;t be loaded. Reload the page to try again.</p>
          ) : favorites.data && favorites.data.length > 0 ? (
            <StopLinks stops={favorites.data} />
          ) : favorites.data ? (
            <p className="text-muted">Open a stop and select “Save stop” to keep it here.</p>
          ) : (
            <p className="text-muted" role="status">
              Loading your stops …
            </p>
          )}
        </section>
      )}

      {recent.length > 0 && (
        <section aria-labelledby="recent-heading">
          <div className="mb-3 flex items-baseline justify-between gap-4">
            <h2 id="recent-heading" className="font-display text-2xl font-semibold">
              Recently viewed
            </h2>
            <button type="button" onClick={clearRecentStops} className="text-sm text-muted underline underline-offset-2 hover:text-ink">
              Clear
            </button>
          </div>
          <StopLinks stops={recent.map((s) => ({ stopId: s.id, stopName: s.name }))} />
        </section>
      )}
    </div>
  );
}
