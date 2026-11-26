/**
 * Time formatting for the departure board. Always in Dresden's time zone,
 * so a visitor abroad sees the times printed on the stop's timetable.
 */
const clock = new Intl.DateTimeFormat("de-DE", {
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Europe/Berlin",
});

const clockWithSeconds = new Intl.DateTimeFormat("de-DE", {
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  timeZone: "Europe/Berlin",
});

/** "09:41" */
export function formatClock(iso: string | number | Date): string {
  return clock.format(new Date(iso));
}

/** "09:41:07" */
export function formatClockWithSeconds(iso: string | number | Date): string {
  return clockWithSeconds.format(new Date(iso));
}

/** Whole minutes from `now` until `iso` (0 if it is due or already gone). */
export function minutesUntil(iso: string, now: number): number {
  return Math.max(0, Math.floor((new Date(iso).getTime() - now) / 60_000));
}

/**
 * What the board shows on the right: "now", "4 min", or a clock time for later departures.
 * Like real displays, the countdown is only shown for the next hour.
 */
export function formatCountdown(iso: string, now: number): string {
  const minutes = minutesUntil(iso, now);
  if (minutes < 1) return "now";
  if (minutes < 60) return `${minutes} min`;
  return formatClock(iso);
}

/** "800 m" or "1.2 km" */
export function formatDistance(metres: number): string {
  return metres < 1000 ? `${Math.round(metres / 10) * 10} m` : `${(metres / 1000).toFixed(1)} km`;
}
