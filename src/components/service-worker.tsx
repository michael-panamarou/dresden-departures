"use client";

import { useEffect } from "react";

/**
 * Registers public/sw.js, which shows a friendly offline page instead of the browser's error.
 * Only in production: during development a service worker would get in the way of hot reload.
 */
export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch((error) => {
      console.warn("Service worker registration failed:", error);
    });
  }, []);
  return null;
}
