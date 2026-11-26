"use client";

import { signIn } from "next-auth/react";

import { useFeatures } from "@/app/providers";
import { useFavorites, useSession, useToggleFavorite } from "@/lib/queries";

function Star({ filled }: { filled: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinejoin="round" aria-hidden="true">
      <path d="m12 3 2.8 5.8 6.2.9-4.5 4.4 1.1 6.2L12 17.4l-5.6 2.9 1.1-6.2L3 9.7l6.2-.9z" />
    </svg>
  );
}

/** "Save stop" / "Saved". Signed-out visitors are asked to sign in first. */
export function FavoriteButton({ stopId, stopName }: { stopId: string; stopName: string }) {
  const features = useFeatures();
  const session = useSession(features.favorites);
  const signedIn = Boolean(session.data);
  const favorites = useFavorites(features.favorites && signedIn);
  const toggle = useToggleFavorite();

  if (!features.favorites || session.isPending) return null;

  const saved = favorites.data?.some((f) => f.stopId === stopId) ?? false;
  const base = "flex shrink-0 items-center gap-2 rounded-md border-2 px-3 py-2 font-semibold";

  if (!signedIn) {
    return (
      <button type="button" onClick={() => signIn("github")} className={`${base} border-rule text-muted hover:border-ink hover:text-ink`}>
        <Star filled={false} />
        Sign in to save
      </button>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        aria-pressed={saved}
        disabled={favorites.isPending}
        onClick={() => toggle.mutate({ stop: { stopId, stopName }, save: !saved })}
        className={`${base} ${saved ? "border-ink bg-ink text-page" : "border-ink hover:bg-ink hover:text-page"} disabled:opacity-50`}
      >
        <Star filled={saved} />
        {saved ? "Saved" : "Save stop"}
      </button>
      {toggle.isError && <span className="text-sm text-muted">Couldn&apos;t save. Try again.</span>}
    </div>
  );
}
