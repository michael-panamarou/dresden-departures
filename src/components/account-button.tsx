"use client";

import { signIn, signOut } from "next-auth/react";

import { useFeatures } from "@/app/providers";
import { useSession } from "@/lib/queries";

/** "Sign in with GitHub" / avatar + "Sign out". Hidden when favourites aren't configured. */
export function AccountButton() {
  const { favorites } = useFeatures();
  const { data: session, isPending } = useSession(favorites);

  if (!favorites) return null;
  if (isPending) return <span className="h-8 w-20" aria-hidden="true" />;

  if (!session) {
    return (
      <button
        type="button"
        // Return to the page the user was on. Read at click time, so the header stays static.
        onClick={() => signIn("github", { redirectTo: window.location.pathname })}
        className="rounded-md bg-action px-3 py-1.5 text-sm font-semibold text-action-ink hover:opacity-90"
      >
        Sign in
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      {session.user.image && (
        // A plain <img>: GitHub avatars are tiny and already optimised.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={session.user.image} alt="" width={28} height={28} className="rounded-full" />
      )}
      <button
        type="button"
        onClick={() => signOut({ redirectTo: "/" })}
        className="rounded-md px-2.5 py-1.5 text-sm font-medium text-muted hover:bg-rule/60 hover:text-ink"
      >
        Sign out
      </button>
    </div>
  );
}
