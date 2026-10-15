import { test, expect } from "@playwright/test";
import { createRequire } from "node:module";
import AxeBuilder from "@axe-core/playwright";
const require = createRequire(
  new URL("../../functions/package.json", import.meta.url),
);
const { initializeApp } = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");
const { getFirestore } = require("firebase-admin/firestore");
process.env.FIREBASE_AUTH_EMULATOR_HOST = "127.0.0.1:9099";
process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8080";
const admin = initializeApp(
  { projectId: "demo-depth-map" },
  `browser-${process.pid}`,
);
const identities = getAuth(admin);
const db = getFirestore(admin);
test("real emulator accounts, staged private answers, discussions, proposals and editorial publishing", async ({
  page,
  browser,
}, info) => {
  const suffix = `${info.project.name}-${Date.now()}`;
  const email = `reader-${suffix}@example.test`;
  const password = "Testing-1234";
  const adminEmail = `editor-${suffix}@example.test`;
  const editor = await identities.createUser({
    email: adminEmail,
    password,
    emailVerified: true,
  });
  await identities.setCustomUserClaims(editor.uid, { admin: true });
  await db
    .doc(`profiles/${editor.uid}`)
    .set({ uid: editor.uid, displayName: "Test editor" });
  await page.goto("/#account");
  await page
    .getByRole("button", { name: "Create an account", exact: true })
    .click();
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByLabel("Public display name").fill("Test reader");
  await page
    .getByRole("button", { name: "Create account", exact: true })
    .click();
  await expect(
    page.getByText(
      "Please verify your email before posting or submitting answers.",
    ),
  ).toBeVisible();
  const user = await identities.getUserByEmail(email);
  await identities.updateUser(user.uid, { emailVerified: true });
  await page.getByRole("button", { name: "Refresh verification" }).click();
  await expect(
    page.getByText(
      "Please verify your email before posting or submitting answers.",
    ),
  ).toHaveCount(0);
  // Separate authenticated browser context exercises the actual admin interface.
  const adminContext = await browser.newContext();
  const editorial = await adminContext.newPage();
  await editorial.goto("http://127.0.0.1:5174/#account");
  await editorial.getByLabel("Email", { exact: true }).fill(adminEmail);
  await editorial.getByLabel("Password", { exact: true }).fill(password);
  await editorial.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(editorial.getByText("Signed in as")).toBeVisible();
  await editorial.goto("http://127.0.0.1:5174/#admin");
  await editorial
    .getByRole("button", { name: "Settings", exact: true })
    .click();
  await editorial
    .getByLabel("Privacy contact email")
    .fill("privacy@example.test");
  await editorial
    .getByLabel("Enable voluntary private answer submission", { exact: false })
    .check();
  await editorial
    .getByRole("button", { name: "Save collection settings" })
    .click();
  await expect(editorial.getByRole("status")).toContainText(
    "Collection settings saved",
  );
  await page.goto("/#experiment/the-last-prisoner");
  await page
    .getByLabel("Your initial response", { exact: true })
    .fill("The loss of liberty still needs justification.");
  await page
    .getByRole("button", { name: "Record my response and continue" })
    .click();
  await page
    .getByLabel("Your response to this condition")
    .fill("I would consider the scope of my moral authority.");
  await page.getByRole("button", { name: "Finish my response" }).click();
  await page
    .getByLabel("I agree to share these answers privately", { exact: false })
    .check();
  await page.getByRole("button", { name: "Submit private answers" }).click();
  await expect(page.getByRole("status")).toContainText("submitted privately");
  await page.getByRole("link", { name: "Join the discussion" }).click();
  await page
    .getByLabel("Your contribution")
    .fill(`A public argument ${suffix}`);
  await page.getByRole("button", { name: "Submit post for review" }).click();
  await expect(page.getByRole("status")).toContainText("awaiting review");
  await editorial.getByRole("button", { name: "Posts", exact: true }).click();
  const pending = editorial
    .locator(".community-entry")
    .filter({ hasText: `A public argument ${suffix}` });
  await expect(pending).toBeVisible();
  await editorial
    .getByLabel("Reason for this moderation decision")
    .fill("Reviewed against community guidelines");
  await pending.getByRole("button", { name: "Publish post" }).click();
  await expect(
    page
      .locator(".community-entry")
      .filter({ hasText: `A public argument ${suffix}` }),
  ).toBeVisible();
  await page.reload();
  const postId = await page
    .locator(".community-entry")
    .filter({ hasText: `A public argument ${suffix}` })
    .getAttribute("id");
  const post = page.locator(`#${postId}`);
  await post.getByRole("button", { name: "Edit", exact: true }).click();
  await post
    .getByLabel("Edit your post")
    .fill(`A clarified argument ${suffix}`);
  await post.getByRole("button", { name: "Save for review" }).click();
  await expect(post).toHaveCount(0);
  await editorial
    .locator(".community-entry")
    .filter({ hasText: `A clarified argument ${suffix}` })
    .getByRole("button", { name: "Publish post" })
    .click();
  await expect(
    page
      .locator(".community-entry")
      .filter({ hasText: `A clarified argument ${suffix}` }),
  ).toBeVisible();
  await editorial.goto("http://127.0.0.1:5174/#community/the-last-prisoner");
  const otherPost = editorial
    .locator(".community-entry")
    .filter({ hasText: `A clarified argument ${suffix}` });
  await expect(
    otherPost.getByRole("button", { name: "Edit", exact: true }),
  ).toHaveCount(0);
  await otherPost.getByRole("button", { name: "Reply", exact: true }).click();
  await editorial
    .getByLabel("Your contribution")
    .fill("What would establish that authority?");
  await editorial
    .getByRole("button", { name: "Submit post for review" })
    .click();
  await expect(editorial.getByRole("status")).toContainText("awaiting review");
  await otherPost.getByRole("button", { name: "Report", exact: true }).click();
  await otherPost
    .getByLabel("Reason for report")
    .fill("Testing the report workflow");
  await otherPost.getByRole("button", { name: "Send report" }).click();
  await expect(otherPost.getByRole("status")).toContainText("Report sent");
  await page.goto("/#community/submit");
  await page
    .getByLabel("Title", { exact: true })
    .fill(`A shared rule ${suffix}`);
  await page
    .getByLabel("Scenario", { exact: true })
    .fill("Two strangers must agree on a rule they will both live under.");
  await page
    .getByLabel("Question", { exact: true })
    .fill("What would make the rule fair?");
  await page
    .getByRole("button", { name: "Submit proposal for review" })
    .click();
  await expect(page.getByRole("status")).toContainText("Proposal submitted");
  await editorial.goto("http://127.0.0.1:5174/#admin");
  await editorial
    .getByRole("button", { name: "Proposals", exact: true })
    .click();
  await editorial
    .locator(".community-entry")
    .filter({ hasText: `A shared rule ${suffix}` })
    .getByRole("button", { name: "Prepare featured experiment" })
    .click();
  await editorial
    .getByLabel("Publication", { exact: true })
    .selectOption("published");
  await editorial.getByLabel("Featured", { exact: true }).check();
  await editorial.getByRole("button", { name: "Save experiment" }).click();
  await expect(editorial.getByRole("status")).toContainText("Experiment saved");
  await page.goto("/#experiments");
  await expect(
    page.getByRole("link", { name: `A shared rule ${suffix}`, exact: true }),
  ).toBeVisible();
  await editorial
    .getByRole("button", { name: "Private answers", exact: true })
    .click();
  await expect(
    editorial
      .locator(".community-entry")
      .filter({ hasText: "The loss of liberty still needs justification." })
      .first(),
  ).toBeVisible();
  await page.goto("/#account");
  await page.getByLabel("Show", { exact: true }).selectOption("responses");
  await page
    .getByRole("button", { name: "Withdraw answer" })
    .click({ trial: true });
  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "Withdraw answer" }).click();
  await expect(page.getByText("No entries here yet.")).toBeVisible();
  expect(
    (await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze())
      .violations,
  ).toEqual([]);
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Sign in", exact: true }),
  ).toBeVisible();
  await adminContext.close();
});
