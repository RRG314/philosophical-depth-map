import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
async function snapshot(page: import("@playwright/test").Page) {
  return page.evaluate(() =>
    JSON.parse(
      (
        window as unknown as { render_game_to_text: () => string }
      ).render_game_to_text(),
    ),
  );
}
test("3D habitats, controls, equivalent text path, draft protection and shared journal", async ({
  page,
}, info) => {
  test.setTimeout(600000);
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/#expedition");
  await expect(page.locator(".habitat canvas")).toBeVisible({ timeout: 30000 });
  await expect
    .poll(async () => (await snapshot(page)).renderer)
    .toBe("three-webgl");
  const start = await snapshot(page);
  await page.locator(".habitat canvas").focus();
  await page.keyboard.down("ArrowRight");
  await page.evaluate(() =>
    (window as unknown as { advanceTime: (ms: number) => void }).advanceTime(
      500,
    ),
  );
  await page.keyboard.up("ArrowRight");
  expect((await snapshot(page)).player.x).toBeGreaterThan(start.player.x);
  await page.getByRole("button", { name: "Recenter", exact: true }).click();
  expect((await snapshot(page)).player.x).toBe(0);
  for (let n = 0; n < 9; n++) {
    await page.locator(".habitat-strip button").nth(n).click();
    await expect
      .poll(async () => (await snapshot(page)).station, { timeout: 30000 })
      .toBe(n);
    await expect(page.locator(".gear-card")).toBeVisible();
    await expect
      .poll(async () => (await snapshot(page)).assets.pending, {
        timeout: 90000,
      })
      .toBe(0);
    expect((await snapshot(page)).assets.failed).toEqual([]);
    expect((await snapshot(page)).assets.loaded).toContain(
      n >= 6 ? "submersible" : "diver",
    );
    expect((await snapshot(page)).drawCalls).toBeLessThan(220);
    if (n === 0 || n === 2 || n === 4 || n === 7 || n === 8)
      await page.locator(".habitat").screenshot({
        path: `output/expedition-${info.project.name}-${n}.png`,
      });
  }
  await page.locator(".habitat-strip button").nth(4).click();
  await expect
    .poll(async () => (await snapshot(page)).assets.pending, { timeout: 90000 })
    .toBe(0);
  await page.locator(".habitat canvas").focus();
  const beforeDive = await snapshot(page);
  await page.keyboard.down("KeyW");
  await page.keyboard.down("KeyQ");
  await page.evaluate(() =>
    (window as unknown as { advanceTime: (ms: number) => void }).advanceTime(
      750,
    ),
  );
  const swimming = await snapshot(page);
  await page.keyboard.up("KeyW");
  await page.keyboard.up("KeyQ");
  expect(swimming.player.y).toBeLessThan(beforeDive.player.y);
  expect(swimming.locomotion.pose.effort).toBeGreaterThan(0.1);
  expect(swimming.locomotion.pose.leftKick).not.toBe(
    swimming.locomotion.pose.rightKick,
  );
  await page.locator(".habitat-strip button").nth(7).click();
  await expect
    .poll(async () => (await snapshot(page)).station, { timeout: 30000 })
    .toBe(7);
  expect((await snapshot(page)).equipment).toContain("submersible");
  expect((await snapshot(page)).completedInquiries).toBe(0);
  await page
    .getByRole("button", { name: "View progress as text", exact: true })
    .click();
  expect((await snapshot(page)).renderer).toBe("accessible-text");
  await page.locator(".station-cards button").first().click();
  await page
    .getByRole("button", { name: "Open inquiry →", exact: true })
    .click();
  await expect(page).toHaveURL(/#play/);
  const response = page.getByLabel("Your initial response");
  // The selected mission is a public open-response question.
  const boxes = page.locator("textarea");
  await boxes
    .first()
    .fill("I would distinguish a claim from its supporting reasons.");
  await page
    .getByLabel("What leads you there?")
    .fill("An objection tests whether the reason supports that conclusion.");
  await page.getByRole("button", { name: /Meet another perspective/ }).click();
  await page
    .getByLabel("Your response", { exact: true })
    .fill(
      "I retain the qualified claim because the objection targets a stronger one.",
    );
  await page.getByRole("button", { name: /Reflect & connect/ }).click();
  await page.getByRole("button", { name: "Save & finish dive" }).click();
  const skip = page.getByRole("button", { name: /Skip animation/ });
  if (await skip.isVisible()) await skip.click();
  await page.getByRole("link", { name: "Return to your expedition →" }).click();
  await expect(page.getByText("1 question explored")).toBeVisible({
    timeout: 30000,
  });
  await page.reload();
  await expect(page.getByText("1 question explored")).toBeVisible({
    timeout: 30000,
  });
  await page.locator(".station-cards button").first().click();
  await page.getByRole("button", { name: "Open inquiry →" }).click();
  await expect(page).toHaveURL(/#play/);
  await page.goto("/#expedition");
  await page.locator(".station-cards button").first().click();
  await expect(
    page.getByRole("link", { name: "Resume draft", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Keep exploring" }).click();
  expect(await response.count()).toBe(0);
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  expect(errors).toEqual([]);
});
test("degrades to a complete text expedition when WebGL is unavailable", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (
      this: HTMLCanvasElement,
      type: string,
      ...args: unknown[]
    ) {
      if (type.startsWith("webgl")) return null;
      return Reflect.apply(original, this, [type, ...args]);
    } as typeof original;
  });
  await page.goto("/#expedition");
  await expect(page.getByText("Your ocean progress")).toBeVisible();
  await page.locator(".station-cards button").first().click();
  await page.getByRole("button", { name: "Open inquiry →" }).click();
  await expect(page).toHaveURL(/#play/);
});

test("Mariana overview and travel preserve the sampled seafloor", async ({
  page,
}, info) => {
  test.setTimeout(180000);
  await page.goto("/#expedition/8");
  await expect(page.locator(".habitat canvas")).toBeVisible({ timeout: 30000 });
  await expect
    .poll(async () => (await snapshot(page)).assets.pending, { timeout: 90000 })
    .toBe(0);
  const start = await snapshot(page);
  await page
    .getByRole("button", { name: "Pause ocean movement", exact: true })
    .click();
  expect(start.seafloor).toBe(-10925);
  expect(start.player.y - start.seafloor).toBeGreaterThan(1.8);
  await page
    .getByRole("button", { name: "Seafloor overview", exact: true })
    .click();
  expect((await snapshot(page)).overview).toBe(true);
  await page
    .locator(".habitat")
    .screenshot({ path: `output/mariana-overview-${info.project.name}.png` });
  await page
    .getByRole("button", { name: "Travel to trench wall", exact: true })
    .click();
  const wall = await snapshot(page);
  expect(wall.overview).toBe(false);
  expect(wall.player.x).not.toBe(start.player.x);
  expect(wall.player.y - wall.seafloor).toBeCloseTo(6, 2);
  expect(wall.completedInquiries).toBe(0);
  await expect(page.locator(".depth-reading")).toContainText(
    (-wall.player.y).toFixed(1),
  );
  await page.getByRole("button", { name: "Recenter", exact: true }).click();
  await expect(page.locator(".depth-reading")).toContainText(
    (-start.player.y).toFixed(1),
  );
});

test("ocean markers open readable questions and camera drags do not select", async ({
  page,
}, info) => {
  test.setTimeout(180000);
  await page.emulateMedia({ reducedMotion: "reduce" });
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/#expedition/4");
  await expect(page.locator(".habitat canvas")).toBeVisible({ timeout: 30000 });
  await expect
    .poll(async () => (await snapshot(page)).assets.pending, { timeout: 90000 })
    .toBe(0);
  const target = page.getByRole("button", { name: /Read station 2:/ });
  await expect(target).toBeVisible();
  await target.click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await expect(dialog.locator(".reading-prompt")).not.toBeEmpty();
  await dialog.screenshot({
    path: `output/question-window-${info.project.name}.png`,
  });
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();
  await expect(target).toBeFocused();
  const canvas = page.locator(".habitat canvas"),
    box = (await canvas.boundingBox())!;
  await page.mouse.move(box.x + box.width * 0.5, box.y + box.height * 0.35);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.65, box.y + box.height * 0.4, {
    steps: 8,
  });
  await page.mouse.up();
  await expect(dialog).not.toBeVisible();
  await page.getByRole("button", { name: "Recenter", exact: true }).click();
  await page
    .locator(".habitat")
    .screenshot({ path: `output/reef-polish-${info.project.name}.png` });
  await page.locator(".station-cards button").first().click();
  await page
    .getByRole("button", { name: "Open inquiry →", exact: true })
    .click();
  await expect(page).toHaveURL(/#play/);
  await page.goto("/#expedition/4");
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await page.locator(".station-cards button").first().click();
  await expect(
    page.getByRole("link", { name: "Resume draft", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Keep exploring", exact: true })
    .click();
  expect(errors).toEqual([]);
});
