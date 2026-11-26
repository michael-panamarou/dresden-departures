"use client";

import { useSyncExternalStore } from "react";

/**
 * Small settings kept in the browser's localStorage (theme, recently viewed stops).
 * useSyncExternalStore renders the server value first and then the stored one,
 * which avoids React hydration errors.
 */

const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  window.addEventListener("storage", listener); // changes made in other tabs
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

function read(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null; // private mode or blocked storage: behave as if nothing was saved
  }
}

export function writeStored(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Not fatal: the setting just won't be remembered.
  }
  listeners.forEach((listener) => listener());
}

export function useStored(key: string): string | null {
  return useSyncExternalStore(
    subscribe,
    () => read(key),
    () => null,
  );
}

// ─── Theme ──────────────────────────────────────────────────────────────

export type ThemeChoice = "system" | "light" | "dark";
export const THEME_KEY = "theme";

export function applyTheme(choice: ThemeChoice) {
  const dark = choice === "dark" || (choice === "system" && matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.classList.toggle("dark", dark);
}

// ─── Recent stops ───────────────────────────────────────────────────────

export type RecentStop = { id: string; name: string };
const RECENT_KEY = "recent-stops";
const RECENT_MAX = 5;

export function parseRecent(raw: string | null): RecentStop[] {
  try {
    const list: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(list)
      ? list.filter((s): s is RecentStop => typeof s?.id === "string" && typeof s?.name === "string")
      : [];
  } catch {
    return [];
  }
}

export function useRecentStops(): RecentStop[] {
  return parseRecent(useStored(RECENT_KEY));
}

export function rememberStop(stop: RecentStop) {
  const list = parseRecent(read(RECENT_KEY)).filter((s) => s.id !== stop.id);
  writeStored(RECENT_KEY, JSON.stringify([stop, ...list].slice(0, RECENT_MAX)));
}

export function clearRecentStops() {
  writeStored(RECENT_KEY, "[]");
}
