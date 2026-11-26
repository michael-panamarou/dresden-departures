/**
 * VVO sends times in Microsoft's old JSON date format:
 *   "/Date(1487778230000+0100)/"
 * The number is milliseconds since 1 January 1970 (UTC). The "+0100" is only
 * informational, so we ignore it: the milliseconds already describe the exact moment.
 */
const VVO_DATE_PATTERN = /^\/Date\((-?\d+)([+-]\d{4})?\)\/$/;

/** Turns "/Date(1487778230000+0100)/" into a Date, or null if the value is missing or broken. */
export function parseVvoDate(value: string | undefined): Date | null {
  if (!value) return null;
  const match = VVO_DATE_PATTERN.exec(value);
  if (!match) return null;
  const date = new Date(Number(match[1]));
  return Number.isNaN(date.getTime()) ? null : date;
}

/** How many whole minutes `real` is after `scheduled` (negative = early). */
export function delayInMinutes(scheduled: Date, real: Date): number {
  return Math.round((real.getTime() - scheduled.getTime()) / 60_000);
}
