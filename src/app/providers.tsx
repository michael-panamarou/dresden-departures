"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createContext, useContext, useState, type ReactNode } from "react";

/** Which optional features this deployment has switched on (see src/lib/features.ts). */
type Features = { favorites: boolean };
const FeaturesContext = createContext<Features>({ favorites: false });

export function useFeatures() {
  return useContext(FeaturesContext);
}

export function Providers({ children, features }: { children: ReactNode; features: Features }) {
  // One QueryClient per browser tab. useState makes sure it isn't recreated on every render.
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: { queries: { refetchOnWindowFocus: true } },
      }),
  );

  return (
    <FeaturesContext value={features}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </FeaturesContext>
  );
}
