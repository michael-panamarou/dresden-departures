"use client";

import Link from "next/link";
import { useParams } from "next/navigation";

import { DepartureBoardView } from "@/components/departure-board";

export function StopPageContent() {
  const { id } = useParams<{ id: string }>();
  const stopId = decodeURIComponent(id);

  return (
    <div className="space-y-6">
      <Link href="/" className="inline-flex items-center gap-1 text-muted hover:text-ink">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
          <path d="m15 6-6 6 6 6" />
        </svg>
        Search another stop
      </Link>
      {/* key: switching stops starts with a fresh board instead of showing the old stop's data */}
      <DepartureBoardView key={stopId} stopId={stopId} />
    </div>
  );
}
