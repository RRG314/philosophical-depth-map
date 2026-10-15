import { initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import {
  onCall,
  HttpsError,
  type CallableRequest,
} from "firebase-functions/v2/https";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { z } from "zod";
initializeApp();
const db = getFirestore();
const id = z.string().regex(/^[a-zA-Z0-9_-]{1,128}$/);
const text = z.string().trim().min(1).max(10000);
const short = z.string().trim().min(1).max(160);
const experiment = z
  .object({
    slug: id,
    title: short,
    subtitle: z.string().max(250),
    author: short,
    kind: z.enum(["original", "historical", "community"]),
    tags: z.array(z.string().max(35)).min(1).max(6),
    scenario: text,
    question: text,
    reveal: z.string().max(5000),
    finalQuestion: z.string().max(1000),
    context: z.string().max(10000),
    references: z
      .array(
        z
          .object({
            title: short,
            url: z.url().refine((v) => v.startsWith("https://")),
          })
          .strict(),
      )
      .max(12),
    featured: z.boolean(),
    order: z.number().int().min(0).max(10000),
    status: z.enum(["draft", "published"]),
    expectedVersion: z.number().int().min(0),
  })
  .strict();
const allowedTopics = [
  "ethics",
  "knowledge",
  "mind",
  "reality",
  "society",
  "general",
];
const fail = (message: string): never => {
  throw new HttpsError("failed-precondition", message);
};
function user(req: CallableRequest) {
  if (!req.auth)
    throw new HttpsError("unauthenticated", "Sign in to continue.");
  return req.auth.uid;
}
function moderator(req: CallableRequest) {
  if (req.auth?.token.admin !== true && req.auth?.token.moderator !== true)
    throw new HttpsError("permission-denied", "Moderator access required.");
}
function admin(req: CallableRequest) {
  if (req.auth?.token.admin !== true)
    throw new HttpsError("permission-denied", "Administrator access required.");
}
async function own(collection: string, key: string, uid: string) {
  const ref = db.collection(collection).doc(id.parse(key));
  const snap = await ref.get();
  if (!snap.exists || snap.data()?.uid !== uid)
    throw new HttpsError("permission-denied", "This record is not yours.");
  return { ref, data: snap.data()! };
}
async function removeOwned(collection: string, uid: string) {
  while (true) {
    const rows = await db
      .collection(collection)
      .where("uid", "==", uid)
      .limit(200)
      .get();
    if (rows.empty) return;
    const batch = db.batch();
    rows.docs.forEach((d) => batch.delete(d.ref));
    await batch.commit();
  }
}
async function rate(uid: string) {
  await db.runTransaction(async (tx) => {
    const ref = db.doc(`limits/${uid}`);
    const snap = await tx.get(ref);
    const old = snap.data();
    const now = Date.now();
    const recent = old && now - old.start < 60000;
    const count = recent ? old.count + 1 : 1;
    if (count > 30)
      throw new HttpsError(
        "resource-exhausted",
        "Please wait a minute before trying again.",
      );
    tx.set(ref, { start: recent ? old.start : now, count });
  });
}
export async function dispatch(req: CallableRequest) {
  const uid = user(req);
  const account = await getAuth()
    .getUser(uid)
    .catch(() => {
      throw new HttpsError(
        "unauthenticated",
        "This account is no longer available. Sign in again.",
      );
    });
  if (account.disabled)
    throw new HttpsError("permission-denied", "This account is disabled.");
  req.auth!.token.admin = account.customClaims?.admin === true;
  req.auth!.token.moderator = account.customClaims?.moderator === true;
  if (JSON.stringify(req.data).length > 64000)
    throw new HttpsError("invalid-argument", "Request is too large.");
  const input = z
    .object({ action: z.string(), payload: z.unknown() })
    .strict()
    .parse(req.data);
  const p = input.payload;
  await rate(uid);
  if (input.action === "deleteAccount") {
    if (Date.now() / 1000 - Number(req.auth!.token.auth_time) > 300)
      throw new HttpsError(
        "unauthenticated",
        "Sign in again before deleting your account.",
      );
    await db.doc(`profiles/${uid}`).set({ deleting: true }, { merge: true });
    for (const c of [
      "posts",
      "proposals",
      "responses",
      "reports",
      "bookmarks",
      "audit",
    ])
      await removeOwned(c, uid);
    await db.doc(`profiles/${uid}`).delete();
    await db.doc(`limits/${uid}`).delete();
    await getAuth().deleteUser(uid);
    return { deleted: true };
  }
  const profile = await db.doc(`profiles/${uid}`).get();
  if (profile.data()?.deleting) fail("Account deletion is in progress.");
  if (input.action === "profile") {
    const data = z
      .object({ displayName: z.string().trim().min(2).max(60) })
      .strict()
      .parse(p);
    await db
      .doc(`profiles/${uid}`)
      .set({ ...data, uid, updatedAt: Date.now(), deleting: false });
    await getAuth().updateUser(uid, { displayName: data.displayName });
    return { ok: true };
  }
  if (input.action === "exportMine") {
    const result: Record<string, unknown> = { profile: profile.data() ?? null };
    for (const c of [
      "posts",
      "proposals",
      "responses",
      "reports",
      "bookmarks",
    ]) {
      const rows = await db
        .collection(c)
        .where("uid", "==", uid)
        .limit(1000)
        .get();
      if (rows.size === 1000)
        fail(
          "Please contact the site owner for a complete export exceeding 1,000 records per category.",
        );
      result[c] = rows.docs.map((d) => ({ id: d.id, ...d.data() }));
    }
    return result;
  }
  if (input.action === "withdraw") {
    const data = z.object({ id }).strict().parse(p);
    const row = await own("responses", data.id, uid);
    await row.ref.delete();
    return { ok: true };
  }
  if (account.emailVerified !== true)
    throw new HttpsError(
      "permission-denied",
      "Verify your email and refresh your session before contributing.",
    );
  const displayName = profile.data()?.displayName;
  if (!displayName) fail("Choose a display name on your account page first.");
  const now = Date.now();
  if (input.action === "saveExperiment") {
    admin(req);
    const data = experiment.parse(p);
    const ref = db.doc(`experiments/${data.slug}`);
    await db.runTransaction(async (tx) => {
      const old = await tx.get(ref);
      const version = old.data()?.version ?? 0;
      if (version !== data.expectedVersion)
        throw new HttpsError(
          "aborted",
          "This experiment changed. Reload it before saving.",
        );
      const { expectedVersion, ...fields } = data;
      void expectedVersion;
      const record = {
        ...fields,
        version: version + 1,
        updatedAt: now,
        createdAt: old.data()?.createdAt ?? now,
      };
      tx.set(ref, record);
      tx.set(db.doc(`experimentVersions/${data.slug}_${version + 1}`), record);
      tx.set(db.collection("audit").doc(), {
        uid,
        action: "saveExperiment",
        target: data.slug,
        at: now,
      });
    });
    return { ok: true };
  }
  if (input.action === "configure") {
    admin(req);
    const data = z
      .object({ privacyContact: z.email(), collectionEnabled: z.boolean() })
      .strict()
      .parse(p);
    await db.doc("settings/public").set({
      ...data,
      consentVersion: "answers-1",
      retentionDays: 365,
      updatedAt: now,
    });
    return { ok: true };
  }
  if (input.action === "submitResponse") {
    const data = z
      .object({
        experimentId: id,
        version: z.number().int().positive(),
        initial: text,
        final: z.string().max(10000),
        consent: z.literal("answers-1"),
        priorExposure: z.boolean(),
        requestId: z.uuid(),
      })
      .strict()
      .parse(p);
    const settings = (await db.doc("settings/public").get()).data();
    if (!settings?.collectionEnabled || !settings?.privacyContact)
      fail(
        "Private answer collection is not enabled. Your answer stays on this device.",
      );
    const current = await db.doc(`experiments/${data.experimentId}`).get();
    if (current.data()?.status !== "published")
      fail("This experiment is not currently published.");
    const exp = (
      await db
        .doc(`experimentVersions/${data.experimentId}_${data.version}`)
        .get()
    ).data();
    if (!exp || exp.status !== "published")
      throw new HttpsError(
        "failed-precondition",
        "This published version is unavailable.",
      );
    if (exp.reveal && !data.final.trim())
      fail("Complete the second response before submitting.");
    const ref = db.doc(`responses/${uid}_${data.requestId}`);
    await db.runTransaction(async (tx) => {
      const existing = await tx.get(ref);
      if (existing.exists) {
        if (existing.data()?.experimentId !== data.experimentId)
          fail("Submission identifier already used.");
        return;
      }
      tx.create(ref, {
        ...data,
        uid,
        createdAt: now,
        expiresAt: now + 365 * 86400000,
        scenario: exp.scenario,
        question: exp.question,
        reveal: exp.reveal,
        finalQuestion: exp.finalQuestion,
        sequence: "local-staged-v1",
      });
    });
    return { id: ref.id };
  }
  if (input.action === "post") {
    const data = z
      .object({
        thread: id,
        body: text,
        parentId: id.nullable(),
        requestId: z.uuid(),
      })
      .strict()
      .parse(p);
    if (!allowedTopics.includes(data.thread)) {
      const exp = await db.doc(`experiments/${data.thread}`).get();
      if (exp.data()?.status !== "published")
        fail("Discussion is not available.");
    }
    if (data.parentId) {
      const parent = await db.doc(`posts/${data.parentId}`).get();
      if (
        parent.data()?.thread !== data.thread ||
        parent.data()?.status !== "published"
      )
        fail("Reply to a visible post in this discussion.");
    }
    const ref = db.doc(`posts/${uid}_${data.requestId}`);
    await db.runTransaction(async (tx) => {
      if ((await tx.get(ref)).exists) return;
      tx.create(ref, {
        uid,
        displayName,
        thread: data.thread,
        body: data.body,
        parentId: data.parentId,
        status: "pending",
        createdAt: now,
        updatedAt: now,
      });
    });
    return { id: ref.id };
  }
  if (input.action === "editPost") {
    const data = z.object({ id, body: text }).strict().parse(p);
    const row = await own("posts", data.id, uid);
    if (row.data.status === "hidden") fail("A hidden post cannot be edited.");
    await row.ref.update({
      body: data.body,
      status: "pending",
      updatedAt: now,
    });
    return { ok: true };
  }
  if (input.action === "deletePost") {
    const data = z.object({ id }).strict().parse(p);
    const row = await own("posts", data.id, uid);
    await row.ref.delete();
    return { ok: true };
  }
  if (input.action === "proposal") {
    const data = z
      .object({
        id: id.optional(),
        title: short,
        scenario: text,
        question: text,
        tags: z.array(z.string().max(35)).min(1).max(6),
      })
      .strict()
      .parse(p);
    const ref = data.id
      ? (await own("proposals", data.id, uid)).ref
      : db.collection("proposals").doc();
    const old = await ref.get();
    await ref.set({
      uid,
      displayName,
      title: data.title,
      scenario: data.scenario,
      question: data.question,
      tags: data.tags,
      status: "pending",
      createdAt: old.data()?.createdAt ?? now,
      updatedAt: now,
    });
    return { id: ref.id };
  }
  if (input.action === "deleteProposal") {
    const data = z.object({ id }).strict().parse(p);
    await (await own("proposals", data.id, uid)).ref.delete();
    return { ok: true };
  }
  if (input.action === "report") {
    const data = z
      .object({ postId: id, reason: z.string().trim().min(3).max(2000) })
      .strict()
      .parse(p);
    const post = await db.doc(`posts/${data.postId}`).get();
    if (post.data()?.status !== "published") fail("This post is not visible.");
    await db
      .doc(`reports/${uid}_${data.postId}`)
      .set({ ...data, uid, status: "pending", createdAt: now });
    return { ok: true };
  }
  if (input.action === "bookmark") {
    const data = z
      .object({ thread: id, enabled: z.boolean() })
      .strict()
      .parse(p);
    const ref = db.doc(`bookmarks/${uid}_${data.thread}`);
    if (data.enabled)
      await ref.set({ uid, thread: data.thread, createdAt: now });
    else await ref.delete();
    return { ok: true };
  }
  if (input.action === "moderate") {
    moderator(req);
    const data = z
      .object({
        collection: z.enum(["posts", "proposals", "reports"]),
        id,
        status: z.enum(["published", "hidden", "rejected", "resolved"]),
        reason: z.string().trim().min(3).max(1000),
      })
      .strict()
      .parse(p);
    if (data.collection === "reports" && data.status !== "resolved")
      fail("Reports can only be resolved.");
    if (
      data.collection === "proposals" &&
      !["published", "rejected"].includes(data.status)
    )
      fail("Choose published or rejected.");
    if (
      data.collection === "posts" &&
      !["published", "hidden"].includes(data.status)
    )
      fail("Choose published or hidden.");
    const ref = db.doc(`${data.collection}/${data.id}`);
    await db.runTransaction(async (tx) => {
      if (!(await tx.get(ref)).exists) fail("Record no longer exists.");
      tx.update(ref, { status: data.status, updatedAt: now });
      tx.set(db.collection("audit").doc(), {
        uid,
        action: "moderate",
        target: `${data.collection}/${data.id}`,
        reason: data.reason,
        status: data.status,
        at: now,
      });
    });
    return { ok: true };
  }
  throw new HttpsError("invalid-argument", "Unknown action.");
}
export const community = onCall(
  {
    region: "us-central1",
    maxInstances: 4,
    timeoutSeconds: 120,
    memory: "256MiB",
  },
  async (req) => {
    try {
      return await dispatch(req);
    } catch (error) {
      if (error instanceof HttpsError) throw error;
      if (error instanceof z.ZodError)
        throw new HttpsError(
          "invalid-argument",
          "Check the required fields and length limits.",
        );
      throw new HttpsError(
        "internal",
        "The request could not be completed. Please retry.",
      );
    }
  },
);
export const expireAnswers = onSchedule(
  { schedule: "every 24 hours", region: "us-central1", maxInstances: 1 },
  async () => {
    while (true) {
      const rows = await db
        .collection("responses")
        .where("expiresAt", "<=", Date.now())
        .limit(200)
        .get();
      if (rows.empty) return;
      const batch = db.batch();
      rows.docs.forEach((d) => batch.delete(d.ref));
      await batch.commit();
    }
  },
);
