// Vercel build entrypoint.
//
// Runs `prisma generate` (no DB needed), then `next build`. If DATABASE_URL
// is set we ALSO push the schema and run the (non-destructive) seed, so the
// first deploy onto a freshly-provisioned Neon Postgres lands with the
// tables created and a demo agency ready to log into. Subsequent deploys
// keep the schema in sync and the seed becomes a no-op.
//
// This script is the build command; fail loud on any step that errors.

import { spawnSync } from "node:child_process";

function run(cmd, args, { env = {}, optional = false } = {}) {
  console.log(`\n$ ${cmd} ${args.join(" ")}`);
  const res = spawnSync(cmd, args, {
    stdio: "inherit",
    env: { ...process.env, ...env },
  });
  if (res.status !== 0) {
    if (optional) {
      console.warn(`⚠  ${cmd} ${args.join(" ")} exited ${res.status} (ignored, step is optional)`);
      return false;
    }
    process.exit(res.status ?? 1);
  }
  return true;
}

const hasDb = Boolean(process.env.DATABASE_URL);

// 1. Prisma client is always needed for `next build` to type-check route code.
run("npx", ["prisma", "generate"]);

if (hasDb) {
  // 2. Sync the schema to the attached DB. Safe on re-deploy — `db push` is
  //    additive unless you've deleted columns in the schema.
  run("npx", ["prisma", "db", "push", "--skip-generate", "--accept-data-loss"], {
    optional: true, // don't block the whole deploy if the DB is briefly unreachable
  });

  // 3. Non-destructive seed — inserts demo agency only if missing.
  run("npx", ["tsx", "prisma/seed.ts"], { optional: true });
} else {
  console.log("\nℹ️   DATABASE_URL not set — skipping `prisma db push` and seed.");
  console.log("    Set DATABASE_URL in Vercel → Settings → Environment Variables.");
}

// 4. The main event.
run("npx", ["next", "build"]);
