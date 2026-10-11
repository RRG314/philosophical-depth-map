import { z } from "zod";
import {
  methods,
  validateAction,
  actionSchema,
  type Method,
  type Problem,
  type Action,
  type Trace,
} from "./schema";
import { aiEventSchema } from "./ai";
import { runEngine } from "./engine";
export const config = {
  id: "four-methods-1.0" as const,
  version: "1.0",
  turns: 4,
  responseCharacters: 4000,
  interventionItems: 3,
  delayedDays: 7,
  implementation: "deterministic" as const,
  researchEnabled: false,
};
export function hash(text: string) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
export function shuffle<T>(items: T[], seed: number): T[] {
  let x = seed >>> 0;
  const next = () => {
    x = (Math.imul(1664525, x) + 1013904223) >>> 0;
    return x / 4294967296;
  };
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(next() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}
export function assign(seed: number, participant: string): Method {
  return shuffle(
    [...methods],
    hash(`${config.id}:${seed}:${participant}:assignment`),
  )[0];
}
export function schedule(
  bank: Problem[],
  seed: number,
  participant: string,
  delayed = false,
) {
  const rng = (phase: string) =>
    hash(`${config.id}:${seed}:${participant}:${phase}`);
  const pre = shuffle(
    bank.filter((p) => p.pool === "pre"),
    rng("pre"),
  );
  const intervention = shuffle(
    bank.filter((p) => p.pool === "intervention"),
    rng("intervention"),
  ).slice(0, config.interventionItems);
  const post = shuffle(
    bank.filter((p) => p.pool === "post"),
    rng("post"),
  );
  const follow = delayed
    ? shuffle(
        bank.filter((p) => p.pool === "delayed"),
        rng("delayed"),
      )
    : [];
  const result = [...pre, ...intervention, ...post, ...follow].map((p) => ({
    id: p.id,
    phase: p.pool,
  }));
  if (new Set(result.map((p) => p.id)).size !== result.length)
    throw Error("Contaminated schedule");
  return result;
}
const methodSchema = z.enum(methods);
export const recordSchema = z
  .object({
    id: z.string().uuid(),
    itemId: z.string(),
    itemVersion: z.literal("1.0"),
    phase: z.enum(["intervention", "pre", "post", "delayed"]),
    turn: z.number().int().min(0).max(3),
    action: actionSchema,
    trace: z.unknown().nullable(),
    generatedQuestion: z.string().max(6000),
    timestamp: z.string().datetime(),
  })
  .strict();
export type RecordEntry = z.infer<typeof recordSchema>;
export const sessionSchema = z
  .object({
    version: z.literal("1.0"),
    id: z.string().uuid(),
    participantId: z.string().uuid(),
    mode: z.enum(["demo", "rehearsal"]),
    implementation: z.enum(["deterministic", "llm"]),
    method: methodSchema,
    seed: z.number().int().min(0).max(4294967295),
    configId: z.literal("four-methods-1.0"),
    startedAt: z.string().datetime(),
    delayedDueAt: z.string().datetime().nullable(),
    schedule: z
      .array(
        z
          .object({
            id: z.string(),
            phase: z.enum(["intervention", "pre", "post", "delayed"]),
          })
          .strict(),
      )
      .min(1)
      .max(21),
    records: z.array(recordSchema).max(60),
    status: z.enum(["active", "completed"]),
    synthetic: z.boolean(),
    aiEvents: z.array(aiEventSchema).max(120).default([]),
  })
  .strict();
export type Session = z.infer<typeof sessionSchema>;
export function createSession(
  bank: Problem[],
  mode: "demo" | "rehearsal",
  method: Method,
  itemId: string,
  seed = crypto.getRandomValues(new Uint32Array(1))[0],
  delayed = false,
): Session {
  const participantId = crypto.randomUUID();
  return {
    version: "1.0",
    id: crypto.randomUUID(),
    participantId,
    mode,
    implementation: "deterministic",
    method: mode === "demo" ? method : assign(seed, participantId),
    seed,
    configId: config.id,
    startedAt: new Date().toISOString(),
    delayedDueAt: delayed
      ? new Date(Date.now() + config.delayedDays * 86400000).toISOString()
      : null,
    schedule:
      mode === "demo"
        ? [{ id: itemId, phase: "intervention" }]
        : schedule(bank, seed, participantId, delayed),
    records: [],
    status: "active",
    synthetic: false,
    aiEvents: [],
  };
}
export function cursor(s: Session) {
  let offset = 0;
  for (let index = 0; index < s.schedule.length; index++) {
    const task = s.schedule[index],
      n = task.phase === "intervention" ? config.turns : 1;
    if (s.records.length < offset + n)
      return { task, index, turn: s.records.length - offset };
    offset += n;
  }
  return null;
}
export function append(
  s: Session,
  bank: Problem[],
  action: Action,
  generatedQuestion?: string,
): Session {
  const c = cursor(s);
  if (!c || s.status === "completed") throw Error("Session complete");
  if (
    c.task.phase === "delayed" &&
    s.delayedDueAt &&
    Date.now() < Date.parse(s.delayedDueAt)
  )
    throw Error("Delayed follow-up is not due");
  const p = bank.find((p) => p.id === c.task.id);
  if (!p) throw Error("Missing item");
  validateAction(p, action);
  const previous = s.records.filter((r) => r.itemId === p.id).at(-1)?.action;
  const trace =
    c.task.phase === "intervention"
      ? runEngine(p, s.method, action, c.turn, previous)
      : null;
  const rec: RecordEntry = {
    id: crypto.randomUUID(),
    itemId: p.id,
    itemVersion: p.version,
    phase: c.task.phase,
    turn: c.turn,
    action,
    trace,
    generatedQuestion: generatedQuestion || "",
    timestamp: new Date().toISOString(),
  };
  recordSchema.parse(rec);
  const next = { ...s, records: [...s.records, rec] };
  if (c.task.phase === "post" && cursor(next)?.task.phase === "delayed")
    next.delayedDueAt = new Date(
      Date.now() + config.delayedDays * 86400000,
    ).toISOString();
  return { ...next, status: cursor(next) ? "active" : "completed" };
}
export function replay(s: Session, bank: Problem[]) {
  return s.records
    .filter((r) => r.phase === "intervention")
    .map((r) => {
      const p = bank.find((p) => p.id === r.itemId)!;
      const prior = s.records
        .filter((x) => x.itemId === r.itemId && x.turn < r.turn)
        .at(-1)?.action;
      const actual = runEngine(p, s.method, r.action, r.turn, prior);
      return {
        recordId: r.id,
        matches: JSON.stringify(actual) === JSON.stringify(r.trace),
        trace: actual,
      };
    });
}
export function validateSession(raw: unknown, bank: Problem[]) {
  const s = sessionSchema.parse(raw);
  if (
    s.mode === "demo" &&
    (s.schedule.length !== 1 || s.schedule[0].phase !== "intervention")
  )
    throw Error("Invalid demonstration schedule");
  if (s.implementation === "deterministic" && s.aiEvents.length)
    throw Error("Unexpected AI events in deterministic session");
  const successful = s.aiEvents.filter((e) => e.result && !e.error);
  const fingerprint = (e: (typeof successful)[number]) =>
    JSON.stringify([
      e.result!.model,
      e.result!.parameters,
      e.result!.protocolVersion,
    ]);
  if (new Set(successful.map(fingerprint)).size > 1)
    throw Error("Mixed AI configurations");
  for (const e of s.aiEvents) {
    if (
      e.condition !== s.method ||
      !s.schedule.some(
        (x) => x.id === e.itemId && x.phase === "intervention",
      ) ||
      (e.result && e.result.condition !== s.method)
    )
      throw Error("AI provenance mismatch");
  }
  if (s.implementation === "llm")
    for (const r of s.records.filter((r) => r.phase === "intervention")) {
      if (
        !successful.some(
          (e) =>
            e.itemId === r.itemId &&
            e.turn === r.turn &&
            e.result!.question === r.generatedQuestion,
        )
      )
        throw Error("Missing generated-question provenance");
    }
  const seen = new Set<string>();
  for (const item of s.schedule) {
    const p = bank.find((p) => p.id === item.id);
    if (!p || p.pool !== item.phase || seen.has(item.id))
      throw Error("Invalid schedule");
    seen.add(item.id);
  }
  if (
    s.mode === "rehearsal" &&
    (s.method !== assign(s.seed, s.participantId) ||
      JSON.stringify(s.schedule) !==
        JSON.stringify(
          schedule(bank, s.seed, s.participantId, Boolean(s.delayedDueAt)),
        ))
  )
    throw Error("Allocation or schedule does not replay");
  const temp = {
    ...s,
    records: [] as RecordEntry[],
    status: "active" as Session["status"],
  };
  for (const r of s.records) {
    const c = cursor(temp);
    if (
      !c ||
      c.task.id !== r.itemId ||
      c.task.phase !== r.phase ||
      c.turn !== r.turn
    )
      throw Error("Record order mismatch");
    runEngine(
      bank.find((p) => p.id === r.itemId)!,
      s.method,
      r.action,
      0,
    );
    temp.records.push(r);
  }
  if (
    new Set(s.records.map((r) => r.id)).size !== s.records.length ||
    s.status !== (cursor(s) ? "active" : "completed")
  )
    throw Error("Invalid completion or duplicate records");
  if (
    s.implementation === "deterministic" &&
    replay(s, bank).some((r) => !r.matches)
  )
    throw Error("Trace does not replay");
  return s;
}
export type BlindPacket = {
  version: "blind-1.0";
  packetId: string;
  synthetic: boolean;
  responses: {
    blindId: string;
    question: string;
    response: string;
    itemVersion: string;
  }[];
};
export function blindExport(
  sessions: Session[],
  bank: Problem[],
  seed: number,
) {
  const mapping: Record<
    string,
    {
      participantId: string;
      recordId: string;
      itemId: string;
      phase: string;
      method: Method;
      implementation: Session["implementation"];
    }
  > = {};
  const responses = sessions.flatMap((s) =>
    s.records
      .filter((r) => r.phase !== "intervention")
      .map((r) => {
        const blindId = crypto.randomUUID();
        mapping[blindId] = {
          participantId: s.participantId,
          recordId: r.id,
          itemId: r.itemId,
          phase: r.phase,
          method: s.method,
          implementation: s.implementation,
        };
        return {
          blindId,
          question: bank.find((p) => p.id === r.itemId)!.question,
          response: r.action.response,
          itemVersion: r.itemVersion,
        };
      }),
  );
  const packet: BlindPacket = {
    version: "blind-1.0",
    packetId: crypto.randomUUID(),
    synthetic: sessions.every((s) => s.synthetic),
    responses: shuffle(responses, seed),
  };
  return { packet, mapping };
}
export function asTrace(value: unknown) {
  return value as Trace | null;
}
