import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
} from "@firebase/rules-unit-testing";
import { initializeApp, deleteApp } from "firebase/app";
import {
  getAuth,
  connectAuthEmulator,
  signInWithEmailAndPassword,
} from "firebase/auth";
import {
  getFunctions,
  connectFunctionsEmulator,
  httpsCallable,
} from "firebase/functions";
import {
  doc,
  getDoc,
  setDoc,
  getDocs,
  collection,
  query,
  where,
  limit,
} from "firebase/firestore";
const require = createRequire(
  new URL("../../functions/package.json", import.meta.url),
);
const { initializeApp: adminApp } = require("firebase-admin/app");
const { getAuth: adminAuth } = require("firebase-admin/auth");
const { getFirestore } = require("firebase-admin/firestore");
process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8080";
process.env.FIREBASE_AUTH_EMULATOR_HOST = "127.0.0.1:9099";
const admin = adminApp({ projectId: "demo-depth-map" }, "tests");
const db = getFirestore(admin);
const identities = adminAuth(admin);
const apps = [];
let env;
let alice, bob, editor, unverified;
const sample = JSON.parse(
  readFileSync(new URL("../../src/community/catalogue.json", import.meta.url)),
)[0];
async function login(name, role, verified = true) {
  const uid = `test-${name}`;
  try {
    await identities.deleteUser(uid);
  } catch {
    /* A prior emulator fixture may not exist. */
  }
  await identities.createUser({
    uid,
    email: `${name}@example.test`,
    password: "Testing-1234",
    emailVerified: verified,
  });
  if (role) await identities.setCustomUserClaims(uid, { [role]: true });
  await db.doc(`profiles/${uid}`).set({ uid, displayName: name });
  const app = initializeApp(
    {
      projectId: "demo-depth-map",
      apiKey: "demo-key",
      authDomain: "localhost",
    },
    name,
  );
  apps.push(app);
  const auth = getAuth(app);
  connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
  await signInWithEmailAndPassword(
    auth,
    `${name}@example.test`,
    "Testing-1234",
  );
  const f = getFunctions(app);
  connectFunctionsEmulator(f, "127.0.0.1", 5001);
  return {
    uid,
    call: async (action, payload = {}) =>
      (await httpsCallable(f, "community")({ action, payload })).data,
  };
}
before(async () => {
  env = await initializeTestEnvironment({
    projectId: "demo-depth-map",
    firestore: {
      host: "127.0.0.1",
      port: 8080,
      rules: readFileSync("firestore.rules", "utf8"),
    },
  });
  await env.clearFirestore();
  await db.doc("experiments/the-last-prisoner").set(sample);
  await db.doc("experimentVersions/the-last-prisoner_1").set(sample);
  await db
    .doc("experiments/draft")
    .set({ ...sample, slug: "draft", status: "draft" });
  await db
    .doc("settings/public")
    .set({ collectionEnabled: true, privacyContact: "testing@example.test" });
  alice = await login("alice");
  bob = await login("bob");
  editor = await login("editor", "admin");
  unverified = await login("unverified", null, false);
});
after(async () => {
  await Promise.all(apps.map(deleteApp));
  await env.cleanup();
});
test("rules: public publication boundary, bounded reads, direct writes and private response isolation", async () => {
  const anon = env.unauthenticatedContext().firestore();
  await assertSucceeds(getDoc(doc(anon, "experiments/the-last-prisoner")));
  await assertFails(getDoc(doc(anon, "experiments/draft")));
  await assertFails(getDocs(collection(anon, "experiments")));
  await assertSucceeds(
    getDocs(
      query(
        collection(anon, "experiments"),
        where("status", "==", "published"),
        limit(25),
      ),
    ),
  );
  const own = env
    .authenticatedContext(alice.uid, { email_verified: true })
    .firestore();
  await assertFails(
    setDoc(doc(own, `profiles/${alice.uid}`), { uid: alice.uid, admin: true }),
  );
  await assertFails(
    setDoc(doc(own, "posts/forged"), { uid: alice.uid, status: "published" }),
  );
  await db
    .doc("responses/private")
    .set({ uid: alice.uid, initial: "private", createdAt: 1 });
  await assertSucceeds(getDoc(doc(own, "responses/private")));
  await assertFails(
    getDoc(
      doc(env.authenticatedContext(bob.uid).firestore(), "responses/private"),
    ),
  );
  await assertFails(getDoc(doc(anon, "responses/private")));
  await assertFails(
    getDoc(
      doc(
        env.authenticatedContext("mod", { moderator: true }).firestore(),
        "responses/private",
      ),
    ),
  );
});
test("callable: verification, role escalation and owner checks cannot be bypassed", async () => {
  await assert.rejects(
    unverified.call("post", {
      thread: "general",
      body: "A question",
      parentId: null,
      requestId: crypto.randomUUID(),
    }),
    /Verify your email/,
  );
  await assert.rejects(
    alice.call("configure", {
      privacyContact: "a@example.test",
      collectionEnabled: true,
    }),
    /Administrator/,
  );
  await assert.rejects(
    alice.call("profile", { displayName: "Alice", admin: true }),
    /required fields/,
  );
  const result = await alice.call("post", {
    thread: "general",
    body: "A claim supported by reasons.",
    parentId: null,
    requestId: crypto.randomUUID(),
  });
  await assert.rejects(
    bob.call("editPost", { id: result.id, body: "Hijacked" }),
    /not yours/,
  );
  await assert.rejects(bob.call("deletePost", { id: result.id }), /not yours/);
  await assert.rejects(
    alice.call("moderate", {
      collection: "posts",
      id: result.id,
      status: "published",
      reason: "self approval",
    }),
    /Moderator/,
  );
  await editor.call("moderate", {
    collection: "posts",
    id: result.id,
    status: "published",
    reason: "Reviewed for guidelines",
  });
  const reply = await bob.call("post", {
    thread: "general",
    body: "An objection to that claim.",
    parentId: result.id,
    requestId: crypto.randomUUID(),
  });
  assert.equal(
    (await db.doc(`posts/${reply.id}`).get()).data().parentId,
    result.id,
  );
  await alice.call("editPost", { id: result.id, body: "A clarified claim." });
  assert.equal(
    (await db.doc(`posts/${result.id}`).get()).data().status,
    "pending",
  );
  await editor.call("moderate", {
    collection: "posts",
    id: result.id,
    status: "published",
    reason: "Reviewed edit",
  });
  await bob.call("report", {
    postId: result.id,
    reason: "Please review this contribution.",
  });
  await editor.call("moderate", {
    collection: "posts",
    id: result.id,
    status: "hidden",
    reason: "Review in progress",
  });
  await assertFails(
    getDoc(doc(env.unauthenticatedContext().firestore(), `posts/${result.id}`)),
  );
});
test("editorial versions are immutable, stale saves fail, proposals require moderation", async () => {
  const { version, ...payload } = sample;
  await editor.call("saveExperiment", {
    ...payload,
    title: "The Last Prisoner",
    expectedVersion: version,
  });
  assert.equal(
    (await db.doc("experimentVersions/the-last-prisoner_1").get()).data()
      .version,
    1,
  );
  assert.equal(
    (await db.doc("experiments/the-last-prisoner").get()).data().version,
    2,
  );
  await assert.rejects(
    editor.call("saveExperiment", { ...payload, expectedVersion: 1 }),
    /changed/,
  );
  const proposal = await alice.call("proposal", {
    title: "A test proposal",
    scenario: "Two agents disagree about a shared rule.",
    question: "What would justify the rule?",
    tags: ["Ethics"],
  });
  await assertFails(
    getDoc(
      doc(env.unauthenticatedContext().firestore(), `proposals/${proposal.id}`),
    ),
  );
  await editor.call("moderate", {
    collection: "proposals",
    id: proposal.id,
    status: "published",
    reason: "Reviewed scenario",
  });
  await assertSucceeds(
    getDoc(
      doc(env.unauthenticatedContext().firestore(), `proposals/${proposal.id}`),
    ),
  );
});
test("private answers require consent, retain exact prompt version, are idempotent and withdrawable", async () => {
  const data = {
    experimentId: sample.slug,
    version: 1,
    initial: "Confinement still limits liberty.",
    final: "I would first consider what justifies further action.",
    consent: "answers-1",
    priorExposure: false,
    requestId: crypto.randomUUID(),
  };
  await assert.rejects(
    alice.call("submitResponse", { ...data, consent: false }),
    /required fields/,
  );
  const first = await alice.call("submitResponse", data);
  const retry = await alice.call("submitResponse", {
    ...data,
    initial: "Attempt to overwrite",
  });
  assert.equal(first.id, retry.id);
  const record = (await db.doc(`responses/${first.id}`).get()).data();
  assert.equal(record.initial, data.initial);
  assert.equal(record.scenario, sample.scenario);
  assert.equal(record.consent, "answers-1");
  await assert.rejects(bob.call("withdraw", { id: first.id }), /not yours/);
  await alice.call("withdraw", { id: first.id });
  assert.equal((await db.doc(`responses/${first.id}`).get()).exists, false);
  await editor.call("configure", {
    privacyContact: "testing@example.test",
    collectionEnabled: false,
  });
  await assert.rejects(
    bob.call("submitResponse", { ...data, requestId: crypto.randomUUID() }),
    /not enabled/,
  );
});
test("account export and deletion remove owned records without deleting another participant", async () => {
  const exported = await alice.call("exportMine");
  assert.ok(Array.isArray(exported.posts));
  await alice.call("deleteAccount");
  for (const c of ["posts", "proposals", "responses", "reports", "bookmarks"])
    assert.equal(
      (await db.collection(c).where("uid", "==", alice.uid).get()).size,
      0,
    );
  await assert.rejects(identities.getUser(alice.uid));
  await assert.rejects(
    alice.call("profile", { displayName: "Recreated" }),
    /no longer available/,
  );
  assert.ok(await identities.getUser(bob.uid));
});
test("quota is enforced on the server", async () => {
  await db.doc(`limits/${bob.uid}`).set({ start: Date.now(), count: 30 });
  await assert.rejects(
    bob.call("bookmark", { thread: "general", enabled: true }),
    /wait a minute/,
  );
});
test("scheduled retention removes expired answers and preserves unexpired answers", async () => {
  process.env.GCLOUD_PROJECT = "demo-depth-map";
  const { expireAnswers } = await import("../../functions/lib/index.js");
  await db
    .doc("responses/expired-fixture")
    .set({ expiresAt: Date.now() - 1000 });
  await db
    .doc("responses/current-fixture")
    .set({ expiresAt: Date.now() + 86400000 });
  await expireAnswers.run({
    scheduleTime: new Date().toISOString(),
    jobName: "local-retention-test",
  });
  assert.equal((await db.doc("responses/expired-fixture").get()).exists, false);
  assert.equal((await db.doc("responses/current-fixture").get()).exists, true);
});
