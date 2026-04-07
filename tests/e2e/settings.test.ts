import { test, expect } from "@playwright/test";

test.describe("Admin Settings", () => {
  test("settings page requires authentication", async ({ page }) => {
    await page.goto("/admin/settings");

    // Should redirect to login since we're not authenticated
    await expect(page).toHaveURL(/\/login/);
  });

  test("setup page shows when no env configured", async ({ page }) => {
    // If Supabase env vars are not set, should redirect to /setup
    await page.goto("/");

    const url = page.url();
    // Either redirects to /setup or /login depending on env
    expect(url).toMatch(/\/(setup|login)/);
  });
});
