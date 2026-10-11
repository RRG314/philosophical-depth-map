import protocols from "../data/protocols.json";
import {
  problemSchema,
  validateAction,
  blankAction,
  type Problem,
  type Action,
  type Method,
  type Trace,
} from "./schema";
export const ENGINE_VERSION = "symbolic-1.0";
export function runEngine(
  raw: Problem,
  method: Method,
  action: Action = blankAction(),
  stage = 0,
  previous: Action = blankAction(),
): Trace {
  const p = problemSchema.parse(raw),
    a = validateAction(p, action);
  validateAction(p, previous);
  if (!Number.isInteger(stage) || stage < 0 || stage > 3)
    throw Error("Four-stage budget exceeded");
  if (!["cartesian", "socratic", "pragmatist", "neutral"].includes(method))
    throw Error("Unknown method");
  const positive = new Set(
    p.propositions
      .filter((x) => a.commitments[x.id] === "accept")
      .map((x) => x.id),
  );
  const negative = new Set(
    p.propositions
      .filter((x) => a.commitments[x.id] === "reject")
      .map((x) => x.id),
  );
  const basis: Record<string, string[]> = {};
  for (const x of p.propositions)
    basis[x.id] = a.commitments[x.id]
      ? [`commitment:${a.commitments[x.id]}`]
      : [];
  for (const o of p.objections)
    if (a.admittedObjections.includes(o.id) && o.refutesWhenAdmitted) {
      negative.add(o.target);
      basis[o.target].push(`admitted:${o.id}`);
    }
  // Positive closure is finite, non-explosive and monotone. Defeasible links remain suggestions.
  for (let i = 0; i < p.propositions.length; i++) {
    let changed = false;
    for (const arg of p.arguments)
      if (
        arg.kind === "strict" &&
        arg.premises.every((id) => positive.has(id)) &&
        !positive.has(arg.conclusion)
      ) {
        positive.add(arg.conclusion);
        basis[arg.conclusion].push(`rule:${arg.id}`);
        changed = true;
      }
    if (!changed) break;
  }
  const conflicts = p.incompatibilities.filter(
    ([x, y]) => positive.has(x) && positive.has(y),
  );
  for (const [x, y] of conflicts) {
    negative.add(x);
    negative.add(y);
    basis[x].push(`incompatible:${y}`);
    basis[y].push(`incompatible:${x}`);
  }
  // Grounding is least-fixed-point support, so circular rules cannot ground themselves.
  const grounded = new Set(
    p.propositions
      .filter((x) => x.grounded && positive.has(x.id) && !negative.has(x.id))
      .map((x) => x.id),
  );
  for (let i = 0; i < p.propositions.length; i++)
    for (const arg of p.arguments)
      if (
        arg.kind === "strict" &&
        arg.premises.every((id) => grounded.has(id)) &&
        !negative.has(arg.conclusion)
      )
        grounded.add(arg.conclusion);
  const unsupported = p.propositions
    .filter((x) => a.commitments[x.id] === "accept" && !grounded.has(x.id))
    .map((x) => x.id);
  const doubted = new Set<string>();
  if (method === "cartesian") {
    for (const x of p.propositions)
      if (
        (!x.grounded && !grounded.has(x.id)) ||
        x.source === "perception" ||
        x.source === "testimony"
      )
        doubted.add(x.id);
    for (const o of p.objections)
      if (a.admittedObjections.includes(o.id)) doubted.add(o.target);
    for (let i = 0; i < p.propositions.length; i++)
      for (const arg of p.arguments)
        if (arg.premises.some((id) => doubted.has(id)))
          doubted.add(arg.conclusion);
  }
  const survivingArguments = p.arguments
    .filter(
      (arg) =>
        arg.kind === "strict" &&
        arg.premises.every(
          (id) => positive.has(id) && !negative.has(id) && !doubted.has(id),
        ) &&
        !negative.has(arg.conclusion) &&
        !doubted.has(arg.conclusion),
    )
    .map((arg) => arg.id);
  const changes = p.propositions
    .filter(
      (x) =>
        (previous.commitments[x.id] || "unrecorded") !==
        (a.commitments[x.id] || "unrecorded"),
    )
    .map((x) => ({
      id: x.id,
      before: previous.commitments[x.id] || "unrecorded",
      after: a.commitments[x.id] || "unrecorded",
    }));
  const target =
    p.objections.find((o) => !a.admittedObjections.includes(o.id)) ||
    p.objections[0];
  const term = p.terms.find((t) => !a.definitions[t]?.trim()) || p.terms[0];
  const hypothesis = p.hypotheses[stage % p.hypotheses.length];
  const questions: Record<Method, string[]> = {
    cartesian: [
      `Which propositions support the proposed conclusion? Reconstruct ${p.arguments[0]?.id || "the argument"} and distinguish its premises from assumptions.`,
      `What grounds support ${unsupported[0] || p.propositions[0].id}? Consider: ${target.text} Does this justify suspension, or a refutation within the stated assumptions?`,
      `Which conclusions depend on the challenged premises (${[...doubted].join(", ") || "none currently flagged"})? What independent support would be needed?`,
      `What can you retain conditionally? Explain any revision or justified suspension; an unchallenged conclusion is not proven indubitable.`,
    ],
    socratic: [
      `What do you mean by “${term}”? State your definition and commitments.`,
      conflicts.length
        ? `Your commitments include incompatible pairs ${conflicts.map((x) => x.join("/")).join(", ")}. Which commitment or distinction needs examination?`
        : `No encoded incompatible pair is jointly accepted. Does your definition of “${term}” fit each stated commitment?`,
      `Consider this proposed challenge: ${target.text} Does it apply to your definition, or need a distinction?`,
      `State your revised or defended position. What disagreement remains unresolved? A contradiction alone does not select the belief to abandon.`,
    ],
    pragmatist: [
      `What makes this situation problematic: ${p.question} Which hypothesis would address it?`,
      `For ${hypothesis.id}, consider: ${hypothesis.consequence} Operational step: ${hypothesis.operation} What value judgment still needs justification?`,
      `What evidence would distinguish the hypotheses? For ${hypothesis.id}: ${hypothesis.evidenceNeeded}`,
      `Recorded outcomes: ${p.hypotheses.map((h) => `${h.id}=${a.outcomes[h.id] || "unmeasured"}`).join(", ")}. What revision is warranted, and which empirical or normative question remains open?`,
    ],
    neutral: [
      `In your own words, what is the issue in this question: ${p.question}`,
      `Clarify one statement you want a reader to understand. You may explain “${p.terms[0]}” in your own terms.`,
      `Give an example that illustrates your position, without needing to settle the whole issue.`,
      `Summarize your current position and anything you want to add. You may retain your original view.`,
    ],
  };
  return {
    engineVersion: ENGINE_VERSION,
    protocolVersion: protocols.version,
    method,
    stage,
    operation: protocols[method].stages[stage],
    question: questions[method][stage],
    facts: p.propositions.map((x) => ({
      id: x.id,
      status: positive.has(x.id)
        ? negative.has(x.id)
          ? "conflicted"
          : "supported"
        : negative.has(x.id)
          ? "refuted"
          : "undetermined",
      basis: basis[x.id],
    })),
    dependencies: p.arguments.flatMap((arg) =>
      arg.premises.map((id) => ({
        from: id,
        to: arg.conclusion,
        kind: arg.kind,
      })),
    ),
    unsupported,
    conflicts,
    doubted: [...doubted],
    survivingArguments,
    changes,
    hypotheses: p.hypotheses.map((h) => ({
      id: h.id,
      status: a.outcomes[h.id] || "unmeasured",
      requirement: h.evidenceNeeded,
    })),
    limitations: [
      "Structured commitments and authored rules only; free text is not parsed.",
      "Supported/refuted are relative to this encoding, not established truths.",
      "No explosion from inconsistency; defeasible arguments do not establish conclusions.",
      "No automatic quality score, historical equivalence or personal proficiency inference.",
    ],
  };
}
