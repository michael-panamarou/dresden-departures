// Prisma CLI configuration (Prisma 7+).
// Loads DATABASE_URL from .env.local (Next.js convention), then from .env.
import { config } from "dotenv";
import { defineConfig } from "prisma/config";

config({ path: ".env.local", quiet: true });
config({ quiet: true });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations" },
  datasource: {
    // Not needed for `prisma generate`, so a missing value must not break installs and CI.
    url: process.env.DATABASE_URL ?? "",
  },
});
