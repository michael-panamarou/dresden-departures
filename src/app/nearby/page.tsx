import type { Metadata } from "next";

import { NearbyView } from "./nearby-view";

export const metadata: Metadata = {
  title: "Stops near you",
  description: "Find tram and bus stops near your location in Dresden.",
};

export default function NearbyPage() {
  return <NearbyView />;
}
