import { test, expect } from "@playwright/test";

test.describe("Onboarding Flow", () => {
  test("shows provider selection on step 2", async ({ page }) => {
    await page.goto("/onboarding");

    // Step 1: Company info
    await expect(page.getByText("Set Up Airlock")).toBeVisible();
    await page.getByLabel("Company Name").fill("Test Corp");
    await page.getByLabel("Slug").fill("test-corp");
    await page.getByLabel("Email Domain").fill("test.com");
    await page.getByRole("button", { name: "Next" }).click();

    // Step 2: Cloud Provider selection
    await expect(page.getByText("Cloud Provider")).toBeVisible();
    await expect(page.getByText("Choose where your team")).toBeVisible();
  });

  test("shows database selection on step 3", async ({ page }) => {
    await page.goto("/onboarding");

    // Fill step 1
    await page.getByLabel("Company Name").fill("Test Corp");
    await page.getByLabel("Slug").fill("test-corp");
    await page.getByLabel("Email Domain").fill("test.com");
    await page.getByRole("button", { name: "Next" }).click();

    // Skip step 2
    await page.getByRole("button", { name: "Skip for now" }).click();

    // Step 3: Database
    await expect(page.getByText("Database Type")).toBeVisible();
    await expect(page.getByText("Optionally configure a database")).toBeVisible();
  });

  test("shows all cloud provider options", async ({ page }) => {
    await page.goto("/onboarding");

    // Fill step 1
    await page.getByLabel("Company Name").fill("Test Corp");
    await page.getByLabel("Slug").fill("test-corp");
    await page.getByLabel("Email Domain").fill("test.com");
    await page.getByRole("button", { name: "Next" }).click();

    // Open cloud provider dropdown
    await page.getByRole("combobox").click();

    await expect(page.getByText("Vercel")).toBeVisible();
    await expect(page.getByText("AWS (Amplify)")).toBeVisible();
    await expect(page.getByText("Cloudflare Pages")).toBeVisible();
    await expect(page.getByText("Netlify")).toBeVisible();
  });

  test("shows provider-specific fields when selecting AWS", async ({ page }) => {
    await page.goto("/onboarding");

    // Fill step 1
    await page.getByLabel("Company Name").fill("Test Corp");
    await page.getByLabel("Slug").fill("test-corp");
    await page.getByLabel("Email Domain").fill("test.com");
    await page.getByRole("button", { name: "Next" }).click();

    // Select AWS
    await page.getByRole("combobox").click();
    await page.getByText("AWS (Amplify)").click();

    // Should show AWS-specific fields
    await expect(page.getByLabel("AWS Account ID")).toBeVisible();
    await expect(page.getByLabel("Access Key / Token")).toBeVisible();
    await expect(page.getByLabel("Region")).toBeVisible();
  });
});
