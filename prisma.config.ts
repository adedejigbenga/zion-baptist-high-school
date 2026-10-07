// Prisma 7 configuration. Prisma CLI does not load .env files on its own,
// so load the same file Next.js uses for local development (Node 24+ built-in).
import { defineConfig } from "prisma/config";

try {
  process.loadEnvFile(".env.local");
} catch {
  // No .env.local (e.g. CI / production): rely on real environment variables.
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    // `npx prisma db seed` (development/demo data only)
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: process.env.DATABASE_URL,
  },
});
