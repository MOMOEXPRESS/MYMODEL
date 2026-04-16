import { defineConfig } from "@playwright/test";

const PORT = 3000;

export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "retain-on-failure",
  },
  // Assumes the dev server is already running (via `npm run dev`) OR that
  // you run `npm run build && npm start` in another terminal. We don't spin
  // one up here because the DB also has to be seeded.
  retries: 0,
  workers: 1,
});
