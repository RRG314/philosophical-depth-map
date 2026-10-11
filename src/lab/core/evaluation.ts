import { z } from "zod";
export const criteria = {
  reconstruction: [
    "Misstates the central inference",
    "Identifies a claim but loses key support",
    "Identifies conclusion and relevant premises",
    "Represents the inferential bridge accurately",
    "Accurate reconstruction distinguishes explicit and added premises",
  ],
  assumptions: [
    "Misses an invited relevant assumption",
    "Names a vague presupposition",
    "Identifies a relevant unstated premise",
    "Explains its role and possible failure",
    "Tests the premise against a relevant alternative",
  ],
  consistency: [
    "Leaves an explicit central contradiction unresolved",
    "Notices tension without resolving it",
    "States a jointly consistent position within the task",
    "Uses a justified distinction to address a tension",
    "Checks the resolution against its implications",
  ],
  objections: [
    "Ignores or misrepresents an invited objection",
    "Mentions a loosely related challenge",
    "Offers a relevant objection or counterexample",
    "Explains how it affects the inference",
    "Engages a strong challenge through defense, qualification or rejection",
  ],
  justification: [
    "Gives no reason where invited",
    "Offers a reason of unclear relevance",
    "Gives relevant support",
    "Explains why the support bears on the conclusion",
    "Weighs relevant alternatives and limits of the support",
  ],
  uncertainty: [
    "Asserts certainty despite explicit unresolved grounds",
    "Signals uncertainty without specifying why",
    "Identifies a relevant evidential or conceptual limit",
    "Explains what would change confidence",
    "Calibrates a qualified conclusion or suspension to the available grounds",
  ],
  integration: [
    "Leaves invited connections unexplained",
    "Repeats claims without integrating them",
    "Connects earlier reasoning with the final position",
    "Explains justified revision or retention",
    "Integrates objection, evidence and remaining limits coherently",
  ],
  relevance: [
    "Does not address the issue or a relevant flaw in it",
    "Touches the topic without a clear connection",
    "Addresses the issue or a relevant premise objection",
    "Selects reasons that bear directly on the task",
    "Resolves the relevant demand concisely or explains why it remains open",
  ],
} as const;
export type Criterion = keyof typeof criteria;
export const criterionIds = Object.keys(criteria) as Criterion[];
export const ratingSchema = z
  .object({
    blindId: z.string().uuid(),
    criterion: z.enum(criterionIds as [Criterion, ...Criterion[]]),
    score: z.number().int().min(0).max(4).nullable(),
    evidence: z.string().max(4000),
    rationale: z.string().min(1).max(2000),
    raterId: z.string().min(1).max(80),
    rubricVersion: z.literal("lab-general-1.0"),
    timestamp: z.string().datetime(),
  })
  .strict();
export type Rating = z.infer<typeof ratingSchema>;
export function validateRating(raw: unknown, response: string) {
  const r = ratingSchema.parse(raw);
  if (
    r.score !== null &&
    (!r.evidence.trim() || !response.includes(r.evidence))
  )
    throw Error("An observed rating needs an exact response excerpt");
  return r;
}
export function weightedKappa(a: (number | null)[], b: (number | null)[]) {
  if (a.length !== b.length) throw Error("Paired ratings required");
  const pairs = a
    .map((x, i) => [x, b[i]])
    .filter((p): p is [number, number] => p[0] !== null && p[1] !== null);
  if (pairs.some((p) => p.some((x) => !Number.isInteger(x) || x < 0 || x > 4)))
    throw Error("Ratings must be 0–4");
  if (!pairs.length) return null;
  const observed =
    pairs.reduce((sum, [x, y]) => sum + (x - y) ** 2, 0) / pairs.length;
  const expected =
    pairs.reduce(
      (sum, [x]) => sum + pairs.reduce((s, [, y]) => s + (x - y) ** 2, 0),
      0,
    ) /
    pairs.length ** 2;
  return expected === 0 ? null : 1 - observed / expected;
}
export function agreement(
  ratings: Rating[],
  first: string,
  second: string,
  criterion: Criterion,
) {
  const a = ratings.filter(
      (r) => r.raterId === first && r.criterion === criterion,
    ),
    b = ratings.filter(
      (r) => r.raterId === second && r.criterion === criterion,
    );
  const pairs = a.flatMap((x) => {
    const y = b.find((y) => y.blindId === x.blindId);
    return y ? [{ a: x.score, b: y.score }] : [];
  });
  return {
    paired: pairs.filter((p) => p.a !== null && p.b !== null).length,
    kappa: weightedKappa(
      pairs.map((p) => p.a),
      pairs.map((p) => p.b),
    ),
  };
}
export const fidelity = {
  cartesian: [
    "Distinguishes doubt from refutation",
    "Tracks dependence and reconstructs qualified support",
  ],
  socratic: [
    "Elicits definitions and commitments",
    "Tests consistency and allows unresolved disagreement",
  ],
  pragmatist: [
    "Connects problem, hypothesis and operational evidence",
    "Revises only in light of stated outcomes; distinguishes values",
  ],
  neutral: [
    "Offers clarification and comparable engagement",
    "Avoids a systematic targeted method",
  ],
} as const;
