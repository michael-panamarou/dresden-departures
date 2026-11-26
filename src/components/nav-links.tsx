"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Search" },
  { href: "/nearby", label: "Nearby" },
];

export function NavLinks() {
  return <Links pathname={usePathname()} />;
}

/** Shown while the current URL isn't known yet: the same links, none highlighted. */
export function StaticNavLinks() {
  return <Links pathname={null} />;
}

function Links({ pathname }: { pathname: string | null }) {
  return LINKS.map(({ href, label }) => {
    const current = pathname !== null && (href === "/" ? pathname === "/" : pathname.startsWith(href));
    return (
      <Link
        key={href}
        href={href}
        aria-current={current ? "page" : undefined}
        className={`rounded-md px-3 py-1.5 text-[0.95rem] font-medium ${
          current ? "bg-ink text-page" : "text-muted hover:bg-rule/60 hover:text-ink"
        }`}
      >
        {label}
      </Link>
    );
  });
}
