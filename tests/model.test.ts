import nodes from "../src/data/nodes.json";
import { describe, it, expect } from "vitest";
import {
  summary,
  begin,
  emptyState,
  xp,
  achievements,
  parseImport,
  knowledge,
  neighbours,
  type Answer,
  type Question,
  type Concept,
  type Edge,
} from "../src/lib/model";
import questions from "../src/data/questions.json";
import concepts from "../src/data/concepts.json";
import edges from "../src/data/edges.json";
const qs = questions as Question[],
  cs = concepts as Concept[];
const make = (): Answer => ({
  id: crypto.randomUUID(),
  questionId: qs[0].id,
  itemVersion: qs[0].version,
  mode: "explore",
  sessionId: crypto.randomUUID(),
  position: "Because a reason matters",
  explanation: "A reason matters",
  reply: "I qualify the claim",
  choice: null,
  revised: false,
  assumptionNoted: false,
  uncertain: false,
  branch: 0,
  ratings: [],
  timestamp: new Date().toISOString(),
});
describe("measurement boundaries", () => {
  it("excludes NA and uses observed maxima", () => {
    const a = make();
    a.ratings = [
      {
        dimension: "justification",
        score: 4,
        max: 4,
        evidence: "reason",
        reason: "supported",
        rater: "self",
        rubricVersion: "reasoning-1.0",
        timestamp: a.timestamp,
      },
    ];
    const b = make();
    b.ratings = [{ ...a.ratings[0], score: null }];
    expect(summary([a, b], "justification")).toMatchObject({
      n: 1,
      na: 1,
      total: 4,
      denominator: 4,
      mean: 4,
    });
    expect(summary([], "precision").mean).toBeNull();
  });
  it("does not turn text or exploration into reasoning scores", () => {
    const s = emptyState();
    s.answers = [make()];
    expect(xp(s)).toBe(10);
    expect(summary(s.answers, "justification").n).toBe(0);
    s.answers.push(make());
    expect(xp(s)).toBe(10);
    expect(achievements(s, qs)[0]).toBe(true);
  });
  it("counts only applicable selected knowledge items", () => {
    const a = make();
    expect(knowledge([a], qs).n).toBe(0);
    const q = qs.find((q) => q.correctIndex !== undefined)!;
    a.questionId = q.id;
    a.choice = q.correctIndex!;
    expect(knowledge([a], qs)).toEqual({ n: 1, correct: 1 });
  });
  it("validates export/import and resets consent", () => {
    const s = emptyState();
    s.answers = [make()];
    s.settings.aiConsent = true;
    expect(parseImport(JSON.stringify(s), qs, cs).settings.aiConsent).toBe(
      false,
    );
    expect(() => parseImport('{"__proto__":{}}', qs, cs)).toThrow();
    expect(() => parseImport("x".repeat(2000001), qs, cs)).toThrow();
  });
  it("rejects spoofed evidence and duplicated records", () => {
    const s = emptyState(),
      a = make();
    s.answers = [a, a];
    expect(() => parseImport(JSON.stringify(s), qs, cs)).toThrow();
    s.answers = [a];
    a.ratings = [
      {
        dimension: "justification",
        score: 3,
        max: 4,
        evidence: "not in the answer",
        reason: "",
        rater: "self",
        rubricVersion: "reasoning-1.0",
        timestamp: a.timestamp,
      },
    ];
    expect(() => parseImport(JSON.stringify(s), qs, cs)).toThrow();
  });
  it("supports deterministic starts and graph traversal", () => {
    expect(begin(qs[0]).stage).toBe(0);
    expect(neighbours((edges as Edge[])[0].from, edges as Edge[])).toContain(
      (edges as Edge[])[0].to,
    );
  });
});
describe("content integrity", () => {
  it("has at least 160 unique substantive versioned items and 20 per domain", () => {
    expect(qs.length).toBeGreaterThanOrEqual(160);
    expect(new Set(qs.map((q) => q.id)).size).toBe(qs.length);
    expect(new Set(qs.map((q) => q.prompt)).size).toBe(qs.length);
    for (const d of [
      "ethics",
      "epistemology",
      "logic",
      "metaphysics",
      "mind",
      "politics",
      "aesthetics",
      "science",
    ])
      expect(qs.filter((q) => q.domain === d).length).toBeGreaterThanOrEqual(
        20,
      );
    expect(qs.filter((q) => q.assessment).length).toBe(16);
  });
  it("has meaningful prompts, anchors, complete links, and no calibrated claims", () => {
    const ids = new Set(cs.map((c) => c.id));
    for (const q of qs) {
      expect(q.prompt.length).toBeGreaterThan(40);
      expect(q.followup.length).toBeGreaterThan(20);
      expect(q.sampleAnchors.length).toBeGreaterThanOrEqual(2);
      expect(q.calibrationStatus).toBe("uncalibrated");
      expect(q.branches.length).toBeGreaterThanOrEqual(2);
      for (const id of [...q.concepts, ...q.branches.map((b) => b.concept)])
        expect(ids.has(id), `${q.id} -> ${id}`).toBe(true);
      for (const r of q.references) expect(r).toMatch(/^https:\/\//);
      if (q.correctIndex !== undefined)
        expect(q.options![q.correctIndex]).toBeTruthy();
    }
  });
  it("has graph endpoints and typed edge IDs", () => {
    const ids = new Set([
      ...cs.map((c) => c.id),
      ...nodes.map((n) => n.id),
      ...qs.map((q) => q.id),
    ]);
    expect(new Set(edges.map((e) => e.id)).size).toBe(edges.length);
    for (const e of edges) {
      expect(ids.has(e.from), e.from).toBe(true);
      expect(ids.has(e.to), e.to).toBe(true);
    }
  });
});

describe("progress and version invariants", () => {
  it("unlocks all ten achievements from their specified exploration evidence", () => {
    const s = emptyState();
    s.answers = [
      "ethics",
      "epistemology",
      "logic",
      "metaphysics",
      "mind",
      "politics",
      "aesthetics",
      "science",
    ].map((domain) => ({
      ...make(),
      questionId: qs.find((q) => q.domain === domain)!.id,
      reply: "An objection",
      assumptionNoted: true,
      revised: true,
    }));
    s.answers.push(
      { ...make(), questionId: s.answers[0].questionId, branch: 1 },
      make(),
    );
    s.saved = [qs[0].id];
    s.discovered = cs.slice(0, 12).map((c) => c.id);
    expect(achievements(s, qs)).toEqual(Array(10).fill(true));
    const before = xp(s);
    s.answers.push({ ...s.answers[0], id: crypto.randomUUID() });
    expect(xp(s)).toBe(before);
  });
  it("rejects stale item versions and misaligned fixed assessment imports", () => {
    const s = emptyState();
    s.answers = [{ ...make(), itemVersion: "obsolete" }];
    expect(() => parseImport(JSON.stringify(s), qs, cs)).toThrow();
    s.answers = [];
    s.active = begin(
      qs.find((q) => !q.assessment)!,
      "assessment",
    );
    expect(() => parseImport(JSON.stringify(s), qs, cs)).toThrow();
  });
  it("represents all five graph node types", () =>
    expect(new Set(nodes.map((n) => n.kind))).toEqual(
      new Set(["question", "concept", "position", "argument", "objection"]),
    ));
});

describe("adversarial engagement accounting", () => {
  it("gives equal exploration credit to retention and revision", () => {
    const s = emptyState();
    s.answers = [make()];
    const retained = xp(s);
    s.answers[0].revised = true;
    expect(xp(s)).toBe(retained);
  });
  it("does not reward blank or assessment-only records", () => {
    const s = emptyState();
    s.answers = [{ ...make(), mode: "assessment" }];
    expect(xp(s)).toBe(0);
    s.answers = [{ ...make(), position: "", explanation: "", reply: "" }];
    expect(xp(s)).toBe(0);
  });
});
