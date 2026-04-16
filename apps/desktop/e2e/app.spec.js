import { test, expect } from "@playwright/test";

test.describe("App Launch", () => {
  test("loads the app and shows the shell", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByTestId("app-shell")).toBeVisible();
  });

  test("renders the sidebar", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByTestId("sidebar")).toBeVisible();
  });
});

test.describe("Navigation", () => {
  test("navigates to Import view", async ({ page }) => {
    await page.goto("/");
    await page.getByTestId("nav-import").click();
    await expect(page.getByTestId("import-view")).toBeVisible();
  });

  test("navigates to Library view", async ({ page }) => {
    await page.goto("/");
    await page.getByTestId("nav-library").click();
    await expect(page.getByTestId("library-view")).toBeVisible();
  });

  test("navigates to Analysis view", async ({ page }) => {
    await page.goto("/");
    await page.getByTestId("nav-analysis").click();
    await expect(page.getByTestId("analysis-view")).toBeVisible();
  });

  test("navigates to Review view", async ({ page }) => {
    await page.goto("/");
    await page.getByTestId("nav-review").click();
    await expect(page.getByTestId("review-view")).toBeVisible();
  });

  test("navigates to Settings view", async ({ page }) => {
    await page.goto("/");
    await page.getByTestId("nav-settings").click();
    await expect(page.getByTestId("settings-view")).toBeVisible();
  });
});

test.describe("Sidebar", () => {
  test("toggles sidebar collapse", async ({ page }) => {
    await page.goto("/");
    const sidebar = page.getByTestId("sidebar");
    await expect(sidebar).toBeVisible();
    await page.getByTestId("toggle-sidebar").click();
    await expect(sidebar).toBeVisible();
  });
});

test.describe("Library View", () => {
  test("shows search input", async ({ page }) => {
    await page.goto("/");
    await page.getByTestId("nav-library").click();
    await expect(page.getByTestId("library-search")).toBeVisible();
  });

  test("shows empty state", async ({ page }) => {
    await page.goto("/");
    await page.getByTestId("nav-library").click();
    await expect(page.getByText(/No notes yet/i)).toBeVisible();
  });
});

test.describe("Settings View", () => {
  test("shows backend connection section", async ({ page }) => {
    await page.goto("/");
    await page.getByTestId("nav-settings").click();
    await expect(page.getByText("Backend Connection")).toBeVisible();
  });
});