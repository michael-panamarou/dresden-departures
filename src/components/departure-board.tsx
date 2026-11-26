"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { rememberStop } from "@/lib/browser-store";
import { ApiError, DEPARTURES_REFRESH_MS, useDepartures } from "@/lib/queries";
import { formatClock, formatClockWithSeconds, formatCountdown } from "@/lib/time";
import type { Departure } from "@/lib/vvo/types";

import { FavoriteButton } from "./favorite-button";
import { LineBadge } from "./line-badge";

/** Re-renders every 10 seconds, so "4 min" becomes "3 min" between data refreshes. */
function useNow(intervalMs = 10_000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(timer);
  }, [intervalMs]);
  return now;
}

function DelayNote({ departure }: { departure: Departure }) {
  if (departure.state === "Cancelled") return null;
  if (departure.delayMinutes === null) return <span className="text-board-off">no live data</span>;
  if (departure.delayMinutes > 0) return <span className="font-semibold text-board-late">+{departure.delayMinutes} min late</span>;
  if (departure.delayMinutes < 0) return <span>{-departure.delayMinutes} min early</span>;
  return null;
}

function DepartureRow({ departure, now }: { departure: Departure; now: number }) {
  const cancelled = departure.state === "Cancelled";
  const leaves = departure.realTime ?? departure.scheduledTime;
  const platform = departure.platform
    ? `${departure.platform.type === "Railtrack" ? "Track" : "Platform"} ${departure.platform.name}`
    : null;

  return (
    <li className="grid grid-cols-[auto_1fr_auto] items-center gap-x-3 px-4 py-3 sm:gap-x-4 sm:px-5" data-state={departure.state}>
      <LineBadge line={departure.line} mode={departure.mode} />
      <div className="min-w-0">
        <p lang="de" className={`truncate font-display text-xl font-semibold leading-tight sm:text-2xl ${cancelled ? "text-board-off line-through" : "text-board-ink"}`}>
          {departure.direction}
        </p>
        <p className="mt-0.5 flex flex-wrap gap-x-3 text-sm text-board-dim">
          {platform && <span>{platform}</span>}
          <DelayNote departure={departure} />
        </p>
      </div>
      <div className="text-right">
        {cancelled ? (
          <p className="font-display text-lg font-semibold text-board-late">Cancelled</p>
        ) : (
          <p className="font-display text-2xl font-semibold leading-tight text-board-ink tabular sm:text-3xl">
            {formatCountdown(leaves, now)}
          </p>
        )}
        <p className={`text-sm tabular ${cancelled ? "text-board-off line-through" : "text-board-dim"}`}>
          <span className="sr-only">Scheduled </span>
          {formatClock(departure.scheduledTime)}
        </p>
      </div>
    </li>
  );
}

function BoardFrame({ children, footer }: { children: React.ReactNode; footer?: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-xl bg-board shadow-[inset_0_0_0_1px_var(--board-rule)]">
      {children}
      {footer}
    </div>
  );
}

function BoardSkeleton() {
  return (
    <BoardFrame>
      <ul aria-hidden="true" className="divide-y divide-board-rule">
        {Array.from({ length: 5 }, (_, i) => (
          <li key={i} className="flex items-center gap-4 px-5 py-4">
            <span className="h-9 w-11 rounded-[3px] bg-board-rule" />
            <span className="h-5 flex-1 rounded bg-board-rule" />
            <span className="h-6 w-14 rounded bg-board-rule" />
          </li>
        ))}
      </ul>
      <p className="sr-only" role="status">
        Loading departures …
      </p>
    </BoardFrame>
  );
}

export function DepartureBoardView({ stopId }: { stopId: string }) {
  const { data, error, isPending, isError, isFetching, dataUpdatedAt, refetch } = useDepartures(stopId);
  const now = useNow();

  // Remember the stop for "Recently viewed" on the home page.
  useEffect(() => {
    if (data) rememberStop({ id: data.stop.id, name: data.stop.name });
  }, [data]);

  if (isPending) {
    return (
      <div className="space-y-6">
        <div className="h-12 w-2/3 rounded-md bg-rule" aria-hidden="true" />
        <BoardSkeleton />
      </div>
    );
  }

  if (isError && !data) {
    const notFound = error instanceof ApiError && (error.status === 404 || error.status === 400);
    return (
      <div className="space-y-4 rounded-xl border-2 border-ink p-6" role="alert">
        <h1 className="font-display text-3xl font-bold">{notFound ? "Stop not found" : "Departures unavailable"}</h1>
        <p className="text-muted">{error.message}</p>
        <div className="flex gap-3">
          {!notFound && (
            <button type="button" onClick={() => refetch()} className="rounded-md bg-action px-4 py-2 font-semibold text-action-ink">
              Try again
            </button>
          )}
          <Link href="/" className="rounded-md border-2 border-ink px-4 py-2 font-semibold">
            Search for a stop
          </Link>
        </div>
      </div>
    );
  }

  const { stop, departures, source } = data;

  return (
    <div className="space-y-6">
      <title>{`${stop.name} departures · Dresden Departures`}</title>

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 lang="de" className="font-display text-4xl font-bold leading-none tracking-tight sm:text-5xl">
            {stop.name}
          </h1>
          {stop.city && <p className="mt-1 text-lg text-muted">{stop.city}</p>}
        </div>
        <FavoriteButton stopId={stop.id} stopName={stop.name} />
      </div>

      {source === "mock" && (
        <p className="rounded-md border border-dashed border-muted px-4 py-2 text-sm text-muted">
          Showing generated sample data (offline mode). The lines and times are not real.
        </p>
      )}

      <BoardFrame
        footer={
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-board-rule px-5 py-3 text-sm text-board-dim">
            <p role="status" className="tabular">
              {isError
                ? `Couldn't refresh. Showing departures from ${formatClockWithSeconds(dataUpdatedAt)}.`
                : `Updated ${formatClockWithSeconds(dataUpdatedAt)}. Refreshes every ${DEPARTURES_REFRESH_MS / 1000} seconds.`}
            </p>
            <button
              type="button"
              onClick={() => refetch()}
              disabled={isFetching}
              className="rounded px-2 py-1 font-semibold text-board-ink hover:bg-board-rule disabled:opacity-60"
            >
              {isFetching ? "Refreshing …" : "Refresh now"}
            </button>
          </div>
        }
      >
        {departures.length > 0 ? (
          <ul aria-label={`Next departures from ${stop.name}`} className="divide-y divide-board-rule">
            {departures.map((departure) => (
              <DepartureRow key={departure.id} departure={departure} now={now} />
            ))}
          </ul>
        ) : (
          <p className="px-5 py-10 text-center font-display text-xl text-board-ink">
            No departures in the next hours. Service may have ended for today.
          </p>
        )}
      </BoardFrame>
    </div>
  );
}
