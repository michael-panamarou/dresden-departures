import Link from "next/link";

import { SavedStops } from "@/components/saved-stops";
import { StopSearch } from "@/components/stop-search";

export default function HomePage() {
  return (
    <div className="space-y-12">
      <section aria-labelledby="search-heading" className="space-y-5">
        <h1 id="search-heading" className="font-display text-4xl font-bold leading-[1.05] tracking-tight sm:text-5xl">
          Where are you leaving from?
        </h1>
        <StopSearch />
        <p className="text-muted">
          Or{" "}
          <Link href="/nearby" className="font-semibold text-action underline underline-offset-2">
            find stops near you
          </Link>{" "}
          on the map.
        </p>
      </section>

      <SavedStops />
    </div>
  );
}
