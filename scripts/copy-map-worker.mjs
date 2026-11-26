// MapLibre runs its map rendering in a Web Worker loaded from a separate file.
// Next.js bundles MapLibre, so the worker file isn't found automatically: we copy it
// into public/ (served at /maplibre-gl-worker.mjs) after every `npm install`.
// The copy always matches the installed MapLibre version and is ignored by Git.
import { copyFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";

const require = createRequire(import.meta.url);
const distDir = dirname(require.resolve("maplibre-gl/dist/maplibre-gl.mjs"));
copyFileSync(join(distDir, "maplibre-gl-worker.mjs"), join(import.meta.dirname, "..", "public", "maplibre-gl-worker.mjs"));
console.log("Copied the MapLibre worker to public/maplibre-gl-worker.mjs");
