import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
test("featured experiment preserves the staged reveal without collecting offline answers", async ({
  page,
}) => {
  await page.goto("/#experiments");
  const navigation = page.getByRole("navigation", {
    name: "Main navigation",
    exact: true,
  });
  for (const name of [
    "Home",
    "Thought experiments",
    "Learn",
    "Discuss",
    "My journey",
  ]) {
    await expect(
      navigation.getByRole("link", { name, exact: true }),
    ).toBeVisible();
  }
  await expect(
    page.getByRole("heading", {
      name: "Thought experiments",
    }),
  ).toBeVisible();
  await expect(page.locator(".experiment-index-row").first()).toContainText(
    "The Last Prisoner",
  );
  await page
    .getByRole("link", { name: "The Last Prisoner", exact: true })
    .click();
  await expect(
    page.getByText("A further condition", { exact: true }),
  ).toHaveCount(0);
  await expect(page.getByText(/Assume you possess/)).toHaveCount(0);
  await expect(
    page.getByText("Philosophical context and sources", { exact: true }),
  ).toHaveCount(0);
  await page
    .getByLabel("Your initial response", { exact: true })
    .fill(
      "Confinement remains a loss of liberty even without a living authority.",
    );
  await page
    .getByRole("button", { name: "Record my response and continue" })
    .click();
  await expect(page.getByText(/you cannot kill the prisoner/)).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "A further condition" }),
  ).toBeVisible();
  await page
    .getByLabel("Your response to this condition")
    .fill(
      "The appropriate action needs a reason beyond the ability to impose it.",
    );
  await page.getByRole("button", { name: "Finish my response" }).click();
  await expect(
    page.getByText("Private answer collection is not open.", { exact: false }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Save to My journey", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("Saved to My journey");
  await page
    .getByRole("button", { name: "Save to My journey", exact: true })
    .click();
  await expect(
    page.getByRole("complementary", { name: "Your ocean depth" }),
  ).toContainText("1 question explored");
  await page
    .getByText("Philosophical context and sources", { exact: true })
    .click();
  await expect(page.getByRole("link", { name: /Kant’s Social/ })).toBeVisible();
  expect(
    (
      await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze()
    ).violations,
  ).toEqual([]);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
  ).toBe(true);
  await page.goto("/#progress");
  await expect(
    page.getByRole("heading", { name: "My journey", exact: true }),
  ).toBeVisible();
  await page.getByText(/The Last Prisoner ·/).click();
  await expect(
    page.getByText(
      "Confinement remains a loss of liberty even without a living authority.",
      { exact: true },
    ),
  ).toBeVisible();
  await page.reload();
  await expect(page.getByText(/The Last Prisoner ·/)).toBeVisible();
  page.once("dialog", (d) => d.accept());
  await page.getByText(/The Last Prisoner ·/).click();
  await page.getByRole("button", { name: "Remove local reflection" }).click();
  await expect(
    page.getByRole("complementary", { name: "Your ocean depth" }),
  ).toContainText("0 questions explored");
});
