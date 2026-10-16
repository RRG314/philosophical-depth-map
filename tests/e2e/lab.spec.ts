import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
test("Lab dialogue, persistence, replay and independent learning page", async ({
  page,
}) => {
  await page.goto("/#lab/demo");
  await expect(
    page.getByRole("heading", { name: "Compare & try", exact: true }),
  ).toBeVisible();
  await page
    .getByText("Side-by-side comparison on shared input", { exact: true })
    .click();
  await expect(
    page.getByRole("heading", {
      name: "Cartesian methodological doubt",
      exact: true,
    }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Start demonstration", exact: true })
    .click();
  await page
    .getByLabel("Your dialogue response", { exact: true })
    .fill("I suspend judgment because the bridge premise needs support.");
  await page
    .getByRole("button", { name: "Record response & continue" })
    .click();
  await page.reload();
  await expect(page.getByText(/turn 2 \/ 4/)).toBeVisible();
  for (let i = 0; i < 3; i++) {
    await page
      .getByLabel("Your dialogue response", { exact: true })
      .fill("A justified qualification.");
    await page
      .getByRole("button", { name: "Record response & continue" })
      .click();
  }
  await expect(
    page.getByText("Session completed locally. Export it from history."),
  ).toBeVisible();
  await page.goto("/#lab/history");
  await page.locator("main details > summary").first().click();
  await page.getByRole("button", { name: "Verify replay" }).first().click();
  await expect(page.getByRole("status")).toContainText(/match|replay/i);
  const sessionDownload = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export session trace" }).click();
  const sessionPath = await (await sessionDownload).path();
  await page.goto("/#lab/fidelity");
  await page.getByLabel("Reviewer alias").fill("fidelity-A");
  await page.getByLabel("Import session log").setInputFiles(sessionPath!);
  await page.locator("main details > summary").first().click();
  await page.getByLabel("Process observation").first().selectOption("met");
  await page
    .getByLabel("Evidence and rationale")
    .first()
    .fill(
      "The question asks for premises and assumptions; later stages invite suspension rather than automatic falsity.",
    );
  const fidelityDownload = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Save and export fidelity review" })
    .click();
  expect((await fidelityDownload).suggestedFilename()).toBe(
    "fidelity-review.json",
  );
  await page.goto("/#learn");
  await expect(
    page.getByRole("heading", { name: "Find your way into philosophy" }),
  ).toBeVisible();
  await page.getByLabel(/Search/).fill("Dewey");
  await expect(page.getByRole("link", { name: /John Dewey/ })).toBeVisible();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});
test("Rehearsal completes 24 responses and exports blinded assessments", async ({
  page,
}) => {
  await page.goto("/#lab/experiment");
  await page
    .getByLabel(
      "I understand this is local rehearsal, not research enrollment.",
    )
    .check();
  await page.getByRole("button", { name: "Start local rehearsal" }).click();
  for (let i = 0; i < 24; i++) {
    const intervention = i >= 6 && i < 18;
    await page
      .getByLabel(
        intervention
          ? "Your dialogue response"
          : "Your independent assessment response",
        { exact: true },
      )
      .fill(
        "The conclusion depends on a contested premise. I retain a qualified view.",
      );
    if (intervention) {
      await expect(
        page.getByText("CONDITION LABEL CONCEALED", { exact: false }),
      ).toBeVisible();
      await expect(
        page.getByRole("heading", { name: "Argument structure" }),
      ).toHaveCount(0);
    }
    await page
      .getByRole("button", { name: "Record response & continue" })
      .click();
  }
  await page.goto("/#lab/history");
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: /blind assessment packet/i }).click();
  const file = await download;
  expect(file.suggestedFilename()).toMatch(/blind/);
  const path = await file.path();
  await page.goto("/#lab/raters");
  await page.getByLabel("Import blind packet").setInputFiles(path!);
  await expect(page.getByText(/12 responses/)).toBeVisible();
  await page.getByLabel("Rater alias").fill("reviewer-A");
  await page.getByLabel("Observed score").selectOption("2");
  await page
    .getByLabel("Exact evidence excerpt")
    .fill("The conclusion depends on a contested premise.");
  await page
    .getByLabel("Rationale or missingness reason")
    .fill("Identifies a conclusion and a disputed support relation.");
  await page.getByRole("button", { name: "Save human rating" }).click();
  await expect(page.getByText("Human rating saved locally.")).toBeVisible();
  const rated = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Export ratings", exact: true })
    .click();
  expect((await rated).suggestedFilename()).toBe("lab-human-ratings.json");
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
});
test("All new routes are responsive and accessible", async ({ page }) => {
  for (const route of [
    "lab",
    "lab/demo",
    "lab/experiment",
    "lab/methods",
    "lab/research",
    "lab/privacy",
    "lab/fidelity",
  ]) {
    await page.goto("/#" + route);
    await expect(page.locator("main h1")).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  }
});
