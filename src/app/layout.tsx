import type { Metadata, Viewport } from "next";

import { ServiceWorkerRegistration } from "@/components/service-worker";
import { SiteHeader } from "@/components/site-header";
import { THEME_SCRIPT } from "@/components/theme-toggle";
import { isFavoritesEnabled } from "@/lib/features";

import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: { default: "Dresden Departures", template: "%s · Dresden Departures" },
  description: "Live departures for Dresden trams and buses: search a stop and see when the next ones leave.",
  applicationName: "Dresden Departures",
  appleWebApp: { capable: true, title: "Departures", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f8fafb" },
    { media: "(prefers-color-scheme: dark)", color: "#17232f" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // suppressHydrationWarning: the theme script below may add class="dark" before React loads.
    <html lang="en" className="h-full antialiased" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="flex min-h-full flex-col">
        <Providers features={{ favorites: isFavoritesEnabled() }}>
          <a
            href="#main"
            className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-50 focus:rounded-md focus:bg-action focus:px-3 focus:py-2 focus:text-action-ink"
          >
            Skip to content
          </a>
          <SiteHeader />
          <main id="main" className="mx-auto w-full max-w-3xl flex-1 px-4 pb-16 pt-8 sm:pt-12">
            {children}
          </main>
          <footer className="border-t border-rule">
            <p className="mx-auto max-w-3xl px-4 py-5 text-sm text-muted">
              Data from the VVO WebAPI, the service behind Dresden&apos;s official transit apps. A personal
              project, not affiliated with VVO or DVB. Times may be incomplete; check official sources
              for important journeys.
            </p>
          </footer>
        </Providers>
        <ServiceWorkerRegistration />
      </body>
    </html>
  );
}
