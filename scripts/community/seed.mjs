import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
const require = createRequire(
  new URL("../../functions/package.json", import.meta.url),
);
const { initializeApp, applicationDefault } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const local = process.env.FIRESTORE_EMULATOR_HOST;
const project = process.env.GCLOUD_PROJECT || (local ? "demo-depth-map" : null);
if (!project || (!local && process.argv[2] !== "--live"))
  throw Error(
    "Specify GCLOUD_PROJECT and --live for a reviewed live seed; otherwise use the emulator.",
  );
initializeApp({
  projectId: project,
  ...(!local ? { credential: applicationDefault() } : {}),
});
const db = getFirestore();
const entries = JSON.parse(
  readFileSync(
    new URL("../../src/community/catalogue.json", import.meta.url),
    "utf8",
  ),
);
for (const e of entries)
  await db.runTransaction(async (t) => {
    const ref = db.doc(`experiments/${e.slug}`);
    if ((await t.get(ref)).exists) return;
    t.create(ref, { ...e, createdAt: Date.now(), updatedAt: Date.now() });
    t.create(db.doc(`experimentVersions/${e.slug}_1`), e);
  });
if (!(await db.doc("settings/public").get()).exists)
  await db
    .doc("settings/public")
    .set({
      collectionEnabled: false,
      privacyContact: "",
      consentVersion: "answers-1",
      retentionDays: 365,
    });
console.log(
  `Seeded missing catalogue entries in ${project}; existing content and collection settings preserved.`,
);
