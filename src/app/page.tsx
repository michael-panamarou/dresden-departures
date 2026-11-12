import Image from "next/image";

export default function HomePage() {
  return (
      <main className="mx-auto max-w-xl p-6">
        <h1 className="text-3xl font-bold">Dresden Departures</h1>
        <p className="mt-2 text-gray-600">
            Live departures for Dresden trams and buses — updated every 30 seconds.
        </p>
      </main>
  );
}