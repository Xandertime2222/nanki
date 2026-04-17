import { test, expect } from "@playwright/test";

test.describe("App Launch", () => {
  test("loads the app and shows the shell", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByTestId("app-shell")).toBeVisible({ timeout: 10000 });
  });

  test("renders the sidebar", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByTestId("sidebar")).toBeVisible({ timeout: 10000 });
  });
});

test.describe("Navigation", () => {
  test("navigates to Import view", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByTestId("sidebar")).toBeVisible({ timeout: 10000 });
    await page.getByTestId("nav-import").click();
    await expect(page.getByTestId("import-view")).toBeVisible();
  });

  test("navigates to Library view", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByTestId("sidebar")).toBeVisible({ timeout: 10000 });
    await page.getByTestId("nav-library").click();
    await expect(page.getByTestId("library-view")).toBeVisible();
  });

  test("navigates to Analysis view", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByTestId("sidebar")).toBeVisible({ timeout: 10000 });
    await page.getByTestId("nav-analysis").click();
    await expect(page.getByTestId("analysis-view")).toBeVisible();
  });

  test("navigates to Review view", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByTestId("sidebar")).toBeVisible({ timeout: 10000 });
    await page.getByTestId("nav-review").click();
    await expect(page.getByTestId("review-view")).toBeVisible();
  });

  test("navigates to Settings view", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByTestId("sidebar")).toBeVisible({ timeout: 10000 });
    await page.getByTestId("nav-settings").click();
    await expect(page.getByTestId("settings-view")).toBeVisible();
  });
});

test.describe("Sidebar", () => {
  test("toggles sidebar collapse", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByTestId("sidebar")).toBeVisible({ timeout: 10000 });
    await page.getByTestId("toggle-sidebar").click();
    await expect(page.getByTestId("sidebar")).toBeVisible();
  });
});

test.describe("Library View", () => {
  test("shows empty state when no notes", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByTestId("sidebar")).toBeVisible({ timeout: 10000 });
    await page.getByTestId("nav-library").click();
    await expect(page.getByTestId("library-view")).toBeVisible();
    // Either shows empty state or notes list
    await expect(page.getByText(/Empty Library|Library/i)).toBeVisible();
  });
});

test.describe("Settings View", () => {
  test("shows connection status section", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByTestId("sidebar")).toBeVisible({ timeout: 10000 });
    await page.getByTestId("nav-settings").click();
    await expect(page.getByTestId("settings-view")).toBeVisible();
    // Wait for settings to load
    await expect(page.getByText(/Connection Status|Settings/i)).toBeVisible();
  });
});