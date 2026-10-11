import { z } from "zod";
export const methods = [
  "cartesian",
  "socratic",
  "pragmatist",
  "neutral",
] as const;
export type Method = (typeof methods)[number];
export const domains = [
  "epistemology",
  "ethics",
  "metaphysics",
  "logic",
  "mind",
  "politics",
] as const;
const id = z.string().regex(/^[a-z0-9_-]{1,80}$/);
export const problemSchema = z
  .object({
    id,
    version: z.literal("1.0"),
    domain: z.enum(domains),
    pool: z.enum(["intervention", "pre", "post", "delayed"]),
    title: z.string().min(3).max(200),
    question: z.string().min(20).max(3000),
    terms: z.array(z.string().max(100)).min(1).max(6),
    propositions: z
      .array(
        z
          .object({
            id,
            text: z.string().max(1500),
            kind: z.enum(["premise", "assumption", "conclusion"]),
            source: z.enum([
              "perception",
              "testimony",
              "definition",
              "inference",
              "normative",
            ]),
            grounded: z.boolean(),
          })
          .strict(),
      )
      .min(3)
      .max(20),
    arguments: z
      .array(
        z
          .object({
            id,
            premises: z.array(id).min(1).max(10),
            conclusion: id,
            kind: z.enum(["strict", "defeasible"]),
            warrant: z.string().max(1000),
          })
          .strict(),
      )
      .max(20),
    incompatibilities: z.array(z.tuple([id, id])).max(20),
    objections: z
      .array(
        z
          .object({
            id,
            target: id,
            text: z.string().max(1500),
            type: z.enum(["counterexample", "undercutter", "alternative"]),
            refutesWhenAdmitted: z.boolean(),
          })
          .strict(),
      )
      .min(1)
      .max(10),
    hypotheses: z
      .array(
        z
          .object({
            id,
            claim: id,
            consequence: z.string().max(1000),
            operation: z.string().max(1000),
            evidenceNeeded: z.string().max(1000),
          })
          .strict(),
      )
      .min(2)
      .max(6),
    explanation: z.string().max(3000),
    references: z.array(z.string().url()).min(1),
    biasNote: z.string().max(1500),
  })
  .strict()
  .superRefine((p, c) => {
    const ids = new Set(p.propositions.map((x) => x.id));
    if (ids.size !== p.propositions.length)
      c.addIssue({ code: "custom", message: "Duplicate proposition" });
    for (const a of p.arguments)
      if (!ids.has(a.conclusion) || a.premises.some((x) => !ids.has(x)))
        c.addIssue({ code: "custom", message: "Unknown dependency" });
    for (const pair of p.incompatibilities)
      if (pair.some((x) => !ids.has(x)) || pair[0] === pair[1])
        c.addIssue({ code: "custom", message: "Invalid incompatibility" });
    for (const o of p.objections)
      if (!ids.has(o.target))
        c.addIssue({ code: "custom", message: "Unknown target" });
    for (const h of p.hypotheses)
      if (!ids.has(h.claim))
        c.addIssue({ code: "custom", message: "Unknown hypothesis claim" });
    for (const xs of [p.arguments, p.objections, p.hypotheses])
      if (new Set(xs.map((x) => x.id)).size !== xs.length)
        c.addIssue({ code: "custom", message: "Duplicate identifiers" });
  });
export type Problem = z.infer<typeof problemSchema>;
export const actionSchema = z
  .object({
    response: z.string().max(4000),
    commitments: z.record(id, z.enum(["accept", "reject", "suspend"])),
    definitions: z.record(z.string().max(100), z.string().max(500)),
    admittedObjections: z.array(id).max(10),
    outcomes: z.record(id, z.enum(["confirmed", "disconfirmed", "unmeasured"])),
    revisionNote: z.string().max(1000),
  })
  .strict();
export type Action = z.infer<typeof actionSchema>;
export const blankAction = (): Action => ({
  response: "",
  commitments: {},
  definitions: {},
  admittedObjections: [],
  outcomes: {},
  revisionNote: "",
});
export function validateAction(problem: Problem, raw: unknown) {
  const a = actionSchema.parse(raw);
  if (
    Object.keys(a.commitments).some(
      (id) => !problem.propositions.some((p) => p.id === id),
    ) ||
    Object.keys(a.definitions).some((t) => !problem.terms.includes(t)) ||
    a.admittedObjections.some(
      (id) => !problem.objections.some((o) => o.id === id),
    ) ||
    Object.keys(a.outcomes).some(
      (id) => !problem.hypotheses.some((h) => h.id === id),
    )
  )
    throw Error("Action references unknown problem fields");
  return a;
}
export type Trace = {
  engineVersion: string;
  protocolVersion: string;
  method: Method;
  stage: number;
  operation: string;
  question: string;
  facts: {
    id: string;
    status: "supported" | "refuted" | "conflicted" | "undetermined";
    basis: string[];
  }[];
  dependencies: { from: string; to: string; kind: string }[];
  unsupported: string[];
  conflicts: string[][];
  doubted: string[];
  survivingArguments: string[];
  changes: { id: string; before: string; after: string }[];
  hypotheses: { id: string; status: string; requirement: string }[];
  limitations: string[];
};
