import type { MetadataRoute } from "next";

/**
 * Web app manifest, served at /manifest.webmanifest.
 * It lets phones and desktop browsers install the site like an app ("Add to Home Screen").
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Dresden Departures",
    short_name: "Departures",
    description: "Live departures for Dresden trams and buses.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#e8ecf0",
    theme_color: "#1b2430",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [{ name: "Stops near me", url: "/nearby", icons: [{ src: "/icon-192.png", sizes: "192x192" }] }],
  };
}
