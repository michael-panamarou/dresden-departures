"use client";

import { applyTheme, THEME_KEY, useStored, writeStored, type ThemeChoice } from "@/lib/browser-store";

const NEXT: Record<ThemeChoice, ThemeChoice> = { system: "light", light: "dark", dark: "system" };
const LABEL: Record<ThemeChoice, string> = { system: "Auto", light: "Light", dark: "Dark" };

function Icon({ choice }: { choice: ThemeChoice }) {
  const common = { width: 18, height: 18, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, "aria-hidden": true } as const;
  if (choice === "light")
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
      </svg>
    );
  if (choice === "dark")
    return (
      <svg {...common}>
        <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z" />
      </svg>
    );
  return (
    <svg {...common}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 3a9 9 0 0 1 0 18z" fill="currentColor" />
    </svg>
  );
}

/** Cycles Auto → Light → Dark. "Auto" follows the device's setting. */
export function ThemeToggle() {
  const stored = useStored(THEME_KEY);
  const choice: ThemeChoice = stored === "light" || stored === "dark" ? stored : "system";

  function next() {
    const value = NEXT[choice];
    writeStored(THEME_KEY, value);
    applyTheme(value);
  }

  return (
    <button
      type="button"
      onClick={next}
      className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm font-medium text-muted hover:bg-rule/60 hover:text-ink"
      aria-label={`Colour theme: ${LABEL[choice]}. Switch to ${LABEL[NEXT[choice]]}`}
      data-theme-choice={choice}
    >
      <Icon choice={choice} />
      <span>{LABEL[choice]}</span>
    </button>
  );
}

/**
 * Runs before the page is painted, so dark mode never flashes white first.
 * Kept tiny and dependency-free because it is inlined into every page.
 */
export const THEME_SCRIPT = `(function(){try{var t=localStorage.getItem("${THEME_KEY}");var d=t==="dark"||(t!=="light"&&matchMedia("(prefers-color-scheme: dark)").matches);document.documentElement.classList.toggle("dark",d);}catch(e){}})()`;
