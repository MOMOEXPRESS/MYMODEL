// Prisma config (replaces the deprecated `"prisma": {...}` block in package.json).
//
// When a prisma.config.ts is present, Prisma stops auto-loading .env for you,
// so load it explicitly on local machines. On Vercel / other PaaS the env is
// already injected by the platform, so the try/catch is a no-op there.

import { defineConfig } from "prisma/config";
import { loadEnvFile } from "node:process";

try {
  loadEnvFile(".env");
} catch {
  // No .env file — envs come from the environment (CI/prod).
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    seed: "tsx prisma/seed.ts",
  },
});
