import Link from "next/link";
import { Suspense } from "react";

import { AccountButton } from "./account-button";
import { NavLinks, StaticNavLinks } from "./nav-links";
import { StopSign } from "./stop-sign";
import { ThemeToggle } from "./theme-toggle";

export function SiteHeader() {
  return (
    <header className="border-b border-rule bg-surface">
      <div className="mx-auto flex max-w-3xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
        <Link href="/" className="flex items-center gap-2.5 rounded-md">
          <StopSign size={30} />
          <span className="font-display text-xl font-bold tracking-tight">Dresden Departures</span>
        </Link>
        <nav aria-label="Main" className="order-3 flex w-full gap-1 sm:order-none sm:w-auto">
          {/* The highlighted link depends on the URL, which is only known per request. */}
          <Suspense fallback={<StaticNavLinks />}>
            <NavLinks />
          </Suspense>
        </nav>
        <div className="ml-auto flex items-center gap-1">
          <ThemeToggle />
          <AccountButton />
        </div>
      </div>
    </header>
  );
}
