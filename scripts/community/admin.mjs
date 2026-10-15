import { createRequire } from "node:module";
const require = createRequire(
  new URL("../../functions/package.json", import.meta.url),
);
const { initializeApp, applicationDefault } = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");
const [uid, role] = process.argv.slice(2);
if (
  !uid ||
  !["admin", "moderator", "none"].includes(role) ||
  !process.env.GCLOUD_PROJECT
)
  throw Error(
    "Usage: GCLOUD_PROJECT=... node scripts/community/admin.mjs UID admin|moderator|none",
  );
initializeApp({
  projectId: process.env.GCLOUD_PROJECT,
  ...(!process.env.FIREBASE_AUTH_EMULATOR_HOST
    ? { credential: applicationDefault() }
    : {}),
});
const auth = getAuth();
const user = await auth.getUser(uid);
const claims = { ...user.customClaims };
delete claims.admin;
delete claims.moderator;
if (role !== "none") claims[role] = true;
await auth.setCustomUserClaims(uid, claims);
console.log("Role updated. Sign out and back in to refresh claims.");
