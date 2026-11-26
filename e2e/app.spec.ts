import { expect, test } from "@playwright/test";

/** A plain stand-in for the map style, so the map test needs no internet connection. */
test.beforeEach(async ({ page }) => {
  await page.route("https://tiles.openfreemap.org/**", (route) =>
    route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ version: 8, sources: {}, layers: [{ id: "bg", type: "background", paint: { "background-color": "#dfe6dc" } }] }),
    }),
  );
});

test("search a stop and open its departure board", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Where are you leaving from?" })).toBeVisible();

  await page.getByRole("combobox", { name: "Stop name" }).fill("bahn");
  const options = page.getByRole("option");
  await expect(options).toHaveText(["Hauptbahnhof", "Bahnhof Neustadt"]);

  await options.filter({ hasText: "Hauptbahnhof" }).click();
  await expect(page).toHaveURL(/\/stops\/33000028$/);
  await expect(page.getByRole("heading", { level: 1, name: "Hauptbahnhof" })).toBeVisible();

  const board = page.getByRole("list", { name: "Next departures from Hauptbahnhof" });
  await expect(board.getByRole("listitem").first()).toBeVisible();
  await expect(page.getByText(/Showing generated sample data/)).toBeVisible();
  await expect(page.getByRole("status").filter({ hasText: /Refreshes every 30 seconds/ })).toBeVisible();
});

test("the search works with the keyboard alone", async ({ page }) => {
  await page.goto("/");
  const input = page.getByRole("combobox", { name: "Stop name" });
  await input.fill("bahn");
  await expect(page.getByRole("option")).toHaveCount(2);

  await input.press("ArrowDown");
  await input.press("ArrowDown");
  await expect(page.getByRole("option", { selected: true })).toHaveText("Bahnhof Neustadt");
  await input.press("Enter");
  await expect(page).toHaveURL(/\/stops\/33000016$/);
});

test("a search without results explains what to do", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("combobox", { name: "Stop name" }).fill("xyzxyz");
  await expect(page.getByText(/No stops match “xyzxyz”/)).toBeVisible();
});

test("visited stops appear under Recently viewed", async ({ page }) => {
  await page.goto("/stops/33000293");
  await expect(page.getByRole("heading", { level: 1, name: "Waldschlößchen" })).toBeVisible();
  await page.goto("/");
  await expect(page.getByRole("region", { name: "Recently viewed" }).getByRole("link", { name: "Waldschlößchen" })).toBeVisible();
});

test("an unknown stop shows a helpful message", async ({ page }) => {
  await page.goto("/stops/12345");
  await expect(page.getByRole("alert").filter({ hasText: "Stop not found" })).toContainText("Search for it by name");
  await page.getByRole("link", { name: "Search for a stop" }).click();
  await expect(page).toHaveURL("/");
});

test("the theme choice is remembered", async ({ page }) => {
  await page.goto("/");
  const toggle = page.getByRole("button", { name: /Colour theme/ });
  await toggle.click(); // Auto → Light
  await toggle.click(); // Light → Dark
  await expect(page.locator("html")).toHaveClass(/dark/);

  await page.reload();
  await expect(page.locator("html")).toHaveClass(/dark/);
  await expect(page.getByRole("button", { name: /Colour theme: Dark/ })).toBeVisible();
});

test("nearby stops use the visitor's location", async ({ page, context }) => {
  await context.grantPermissions(["geolocation"]);
  await context.setGeolocation({ latitude: 51.0658, longitude: 13.741 }); // Bahnhof Neustadt
  await page.goto("/nearby");

  await page.getByRole("button", { name: "Use my location" }).click();
  await expect(page.getByText("Nearest stops to your location.")).toBeVisible();

  const list = page.getByRole("region", { name: "Nearest stops" }).getByRole("link");
  await expect(list.first()).toContainText("Bahnhof Neustadt");
  await expect(page.getByRole("button", { name: /show departures/ })).toHaveCount(5); // map markers
});

test("the app can be installed (PWA manifest and offline page)", async ({ request }) => {
  const manifest = await (await request.get("/manifest.webmanifest")).json();
  expect(manifest).toMatchObject({ name: "Dresden Departures", display: "standalone", start_url: "/" });
  for (const icon of manifest.icons) {
    expect((await request.get(icon.src)).ok()).toBe(true);
  }
  expect((await request.get("/sw.js")).headers()["cache-control"]).toContain("no-cache");
  expect(await (await request.get("/offline.html")).text()).toContain("You're offline");
});
