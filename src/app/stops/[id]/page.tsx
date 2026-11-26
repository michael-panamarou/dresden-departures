import { Suspense } from "react";

import { StopPageContent } from "./stop-page-content";

/**
 * /stops/33000028: the live departure board for one stop.
 * The board fetches its data in the browser (and refreshes it every 30 s),
 * so the page itself is a small static shell that loads instantly.
 */
export default function StopPage() {
  return (
    <Suspense>
      <StopPageContent />
    </Suspense>
  );
}
