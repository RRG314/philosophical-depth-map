import { test, expect } from "@playwright/test";

test("depth window follows navigation, respects motion, and can be minimized or hidden", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/#home");
  const window = page.getByRole("complementary", { name: "Your ocean depth" });
  await expect(window).toContainText("The shoreline");
  await expect(
    window.getByRole("meter", { includeHidden: true }),
  ).toHaveAttribute("value", "0");
  await expect(window).toBeInViewport();
  expect(
    await window
      .locator(".depth-water i")
      .first()
      .evaluate((el) => getComputedStyle(el).animationName),
  ).toBe("none");
  await window.getByRole("button", { name: "Minimize depth window" }).click();
  await expect(
    window.getByRole("button", { name: "Expand depth window" }),
  ).toBeEnabled();
  await page.reload();
  await expect(
    window.getByRole("button", { name: "Expand depth window" }),
  ).toBeVisible();
  await page.goto("/#learn");
  await window.getByRole("button", { name: "Expand depth window" }).click();
  await expect(
    window.getByRole("button", { name: "Minimize depth window" }),
  ).toBeEnabled();
  await page.goto("/#settings");
  await page
    .getByLabel("Depth window", { exact: true })
    .selectOption("dismissed");
  await expect(window).toHaveCount(0);
  await page.goto("/#lab");
  await expect(
    page.getByRole("heading", { name: "How should we examine an argument?" }),
  ).toBeVisible();
  await expect(window).toHaveCount(0);
});
