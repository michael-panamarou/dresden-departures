import { MODE_STYLES } from "@/lib/lines";
import type { Mode } from "@/lib/vvo/types";

/** A coloured line number, e.g. a red square "3" for tram 3 or a blue circle-ish "61" for bus 61. */
export function LineBadge({ line, mode, size = "md" }: { line: string; mode: Mode; size?: "sm" | "md" }) {
  const style = MODE_STYLES[mode];
  const dimensions = size === "sm" ? "h-6 min-w-6 px-1.5 text-sm" : "h-9 min-w-11 px-2 text-lg";
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center font-display font-bold leading-none tabular ${dimensions} ${style.shape}`}
      style={{ backgroundColor: style.background, color: style.text }}
    >
      <span className="sr-only">{style.label} </span>
      {line}
    </span>
  );
}
