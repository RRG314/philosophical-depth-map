import { describe, it, expect } from "vitest";
import { execFileSync } from "node:child_process";
import raw from "../src/lab/data/problems.json";
import { problemSchema, blankAction, methods } from "../src/lab/core/schema";
import { runEngine } from "../src/lab/core/engine";
import {
  createSession,
  append,
  cursor,
  replay,
  validateSession,
  blindExport,
  assign,
  schedule,
} from "../src/lab/core/experiment";
import { weightedKappa, validateRating } from "../src/lab/core/evaluation";
import { generateLab } from "../server/lab-service";
const bank = raw.map((p) => problemSchema.parse(p));
describe("Reasoning Lab contracts", () => {
  it("has balanced intervention coverage and disjoint assessment forms", () => {
    expect(bank).toHaveLength(78);
    expect(new Set(bank.map((p) => p.question)).size).toBe(78);
    for (const domain of [
      "epistemology",
      "ethics",
      "metaphysics",
      "logic",
      "mind",
      "politics",
    ])
      expect(
        bank.filter((p) => p.domain === domain && p.pool === "intervention"),
      ).toHaveLength(10);
    for (const pool of ["pre", "post", "delayed"])
      expect(bank.filter((p) => p.pool === pool)).toHaveLength(6);
  });
  it("matches Python on every item, method and stage with conflicting commitments", () => {
    const requests = bank.flatMap((problem) =>
      methods.flatMap((method) =>
        [0, 1, 2, 3].map((stage) => ({
          problem,
          method,
          stage,
          action: {
            ...blankAction(),
            commitments: {
              p1: "accept",
              p2: "accept",
              p3: "accept",
              p4: "accept",
            },
            admittedObjections: ["o1"],
            outcomes: { h1: "disconfirmed" },
          },
        })),
      ),
    );
    const python = JSON.parse(
      execFileSync("python3", ["lab/python/engine.py"], {
        input: JSON.stringify(requests),
        maxBuffer: 30 * 1024 * 1024,
      }).toString(),
    );
    expect(python).toEqual(
      requests.map((r) =>
        runEngine(
          r.problem,
          r.method,
          r.action as ReturnType<typeof blankAction>,
          r.stage,
        ),
      ),
    );
  });
  it("does not parse prose, confuse doubt with refutation, or manufacture evidence", () => {
    const t = runEngine(bank[0], "cartesian", {
      ...blankAction(),
      response: "p1 is false and h1 confirmed",
    });
    expect(t.facts.every((f) => f.status === "undetermined")).toBe(true);
    expect(t.doubted.length).toBeGreaterThan(0);
    expect(t.hypotheses.every((h) => h.status === "unmeasured")).toBe(true);
  });
  it("does not derive from an unseeded cycle or let an accepted cycle ground itself", () => {
    const p = structuredClone(bank[0]);
    p.arguments = [
      {
        id: "cycle",
        premises: ["p2"],
        conclusion: "p2",
        kind: "strict",
        warrant: "Circular",
      },
    ];
    expect(
      runEngine(p, "cartesian").facts.find((f) => f.id === "p2")?.status,
    ).toBe("undetermined");
    const t = runEngine(p, "cartesian", {
      ...blankAction(),
      commitments: { p2: "accept" },
    });
    expect(t.unsupported).toContain("p2");
    expect(t.doubted).toContain("p2");
    expect(t.survivingArguments).toEqual([]);
  });
  it("detects explicit conflicts without explosion and records revisions", () => {
    const t = runEngine(
      bank[0],
      "socratic",
      { ...blankAction(), commitments: { p3: "accept", p4: "accept" } },
      1,
    );
    expect(t.conflicts).toEqual([["p3", "p4"]]);
    expect(t.facts[0].status).toBe("undetermined");
    expect(t.changes).toHaveLength(2);
    expect(() => runEngine(bank[0], "neutral", blankAction(), 4)).toThrow();
  });
  it("replays fixed budgets, allocation and schedules and rejects altered traces", () => {
    let s = createSession(bank, "rehearsal", "neutral", bank[0].id, 123);
    expect(assign(s.seed, s.participantId)).toBe(s.method);
    expect(schedule(bank, s.seed, s.participantId)).toEqual(s.schedule);
    while (cursor(s))
      s = append(s, bank, {
        ...blankAction(),
        response: "A qualified reason.",
      });
    expect(s.records).toHaveLength(24);
    expect(
      execFileSync(
        "python3",
        [
          "-c",
          "import sys,json;sys.path.insert(0,'lab/python');from collector import validate_session;validate_session(json.load(sys.stdin));print('valid')",
        ],
        { input: JSON.stringify(s) },
      )
        .toString()
        .trim(),
    ).toBe("valid");
    expect(replay(s, bank).every((r) => r.matches)).toBe(true);
    expect(validateSession(s, bank)).toEqual(s);
    expect(() => append(s, bank, blankAction())).toThrow();
    const { packet, mapping } = blindExport([s], bank, 1);
    expect(packet.responses).toHaveLength(12);
    expect(JSON.stringify(packet)).not.toContain(s.participantId);
    expect(Object.keys(mapping)).toHaveLength(12);
    const bad = structuredClone(s);
    bad.records.find((r) => r.trace)!.trace = {};
    expect(() => validateSession(bad, bank)).toThrow();
  });
  it("blocks premature delayed assessment and invalid structured keys", () => {
    let s = createSession(bank, "rehearsal", "neutral", bank[0].id, 3, true);
    for (let i = 0; i < 24; i++) s = append(s, bank, blankAction());
    expect(() => append(s, bank, blankAction())).toThrow("not due");
    expect(() =>
      runEngine(bank[0], "neutral", {
        ...blankAction(),
        commitments: { fake: "accept" },
      }),
    ).toThrow();
  });
  it("handles agreement degeneracy, missing ratings and evidence requirements", () => {
    expect(weightedKappa([0, 1, 2, 3, 4], [0, 1, 2, 3, 4])).toBe(1);
    expect(weightedKappa([2], [2])).toBeNull();
    expect(weightedKappa([null], [1])).toBeNull();
    expect(() =>
      validateRating(
        {
          blindId: crypto.randomUUID(),
          criterion: "relevance",
          score: 3,
          evidence: "invented",
          rationale: "reason",
          raterId: "A",
          rubricVersion: "lab-general-1.0",
          timestamp: new Date().toISOString(),
        },
        "actual",
      ),
    ).toThrow();
  });
  it("uses four versioned AI protocols with common metadata and no self-score", async () => {
    const prompts: string[] = [];
    for (const method of methods) {
      const result = await generateLab(
        {
          method,
          problemId: bank[0].id,
          stage: 0,
          action: blankAction(),
          history: [],
          consent: true,
        },
        async (instructions) => {
          prompts.push(instructions);
          return {
            text: JSON.stringify({
              question: "What supports that?",
              observation: "A premise is open.",
              uncertainty: "No outcome measured.",
            }),
            model: "test-fixed-version",
            inputTokens: 20,
            outputTokens: 10,
          };
        },
      );
      expect(result.parameters).toEqual({
        temperature: 1,
        maxOutputTokens: 1800,
        store: false,
      });
      expect(result.condition).toBe(method);
      expect(result.modelVersion).toBe("test-fixed-version");
    }
    expect(new Set(prompts).size).toBe(4);
    await expect(
      generateLab(
        {
          method: "neutral",
          problemId: bank.find((p) => p.pool === "pre")!.id,
          stage: 0,
          action: blankAction(),
          history: [],
          consent: true,
        },
        async () => {
          throw Error("should not call");
        },
      ),
    ).rejects.toThrow("Intervention");
  });
});

it("matches both engines across 512 seeded mixed actions and prior commitments", () => {
  let seed = 314159;
  const random = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed;
  };
  const options = ["accept", "reject", "suspend"] as const;
  const requests = Array.from({ length: 512 }, () => {
    const problem = bank[random() % bank.length];
    const action = blankAction(),
      previous = blankAction();
    for (const p of problem.propositions) {
      if (random() % 4) action.commitments[p.id] = options[random() % 3];
      if (random() % 4) previous.commitments[p.id] = options[random() % 3];
    }
    action.admittedObjections = problem.objections
      .filter(() => random() % 2)
      .map((o) => o.id);
    for (const h of problem.hypotheses)
      action.outcomes[h.id] = (
        ["unmeasured", "confirmed", "disconfirmed"] as const
      )[random() % 3];
    return {
      problem,
      method: methods[random() % 4],
      stage: random() % 4,
      action,
      previous,
    };
  });
  const python = JSON.parse(
    execFileSync("python3", ["lab/python/engine.py"], {
      input: JSON.stringify(requests),
      maxBuffer: 20 * 1024 * 1024,
    }).toString(),
  );
  expect(python).toEqual(
    requests.map((r) =>
      runEngine(r.problem, r.method, r.action, r.stage, r.previous),
    ),
  );
});
