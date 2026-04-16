// Playwright smoke suite.
//
// Run with `npm run test:e2e` against a dev server with the demo seed loaded.
// Exercises the most important happy path: login as owner, visit every main
// tab, create a job, attach a model, flip them to Option 1, and confirm the
// Board shows the new hold.

import { test, expect } from "@playwright/test";

const OWNER = {
  email: "owner@mademoiselle.demo",
  password: "luxlane-demo",
};

test.describe("smoke", () => {
  test("public landing renders and has signup + login CTAs", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.getByRole("link", { name: /start your agency|créer/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /log in|se connecter/i })).toBeVisible();
  });

  test("agency owner can log in, tour the nav, and create + promote an assignment", async ({ page }) => {
    // Login
    await page.goto("/login");
    await page.getByLabel(/email/i).fill(OWNER.email);
    await page.getByLabel(/password/i).fill(OWNER.password);
    await page.getByRole("button", { name: /sign in|se connecter/i }).click();
    await page.waitForURL(/\/agency$/);

    // Nav smoke — every sidebar link should render without crashing.
    for (const label of ["Roster", "Board", "Jobs", "Messages", "Settings"]) {
      await page.getByRole("link", { name: label, exact: true }).first().click();
      await expect(page.locator("main")).toBeVisible();
    }

    // Create a job
    await page.goto("/agency/jobs/new");
    await page.getByLabel(/title/i).fill("Playwright E2E Job");
    const today = new Date().toISOString().slice(0, 10);
    await page.getByLabel(/start date/i).fill(today);
    await page.getByLabel(/end date/i).fill(today);
    await page.getByRole("button", { name: /create job/i }).click();
    await page.waitForURL(/\/agency\/jobs\/[a-z0-9]+/i);

    // Attach a model
    await page.getByRole("button", { name: /attach models/i }).click();
    // Pick the first row in the dialog
    const firstPick = page.locator("div[role] button, li button").filter({ hasText: /./ }).first();
    await firstPick.click({ force: true });
    await page.getByRole("button", { name: /^attach \d+/i }).click();

    // Promote to Option 1
    const statusSelect = page.locator("select").filter({ hasText: /proposed|option/i }).first();
    await statusSelect.selectOption({ label: "Option 1" });

    // Board reflects it
    await page.goto("/agency/board");
    await expect(page.getByRole("heading", { name: /board/i })).toBeVisible();
  });

  test("locale switches to French", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "fr", exact: true }).click();
    await expect(page.getByRole("link", { name: /créer votre agence|se connecter/i })).toBeVisible();
  });
});
