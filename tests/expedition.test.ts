import { describe, it, expect } from "vitest";
import {
  stations,
  expeditionProgress,
  missions,
} from "../src/game/progression";
import {
  emptyState,
  region,
  regions,
  regionThresholds,
  recommendations,
  type Question,
  type Answer,
} from "../src/lib/model";
import raw from "../src/data/questions.json";
const qs = raw as Question[],
  pool = qs.filter((q) => !q.assessment);
function answer(i: number, time = "2026-10-01T12:00:00Z"): Answer {
  return {
    id: crypto.randomUUID(),
    questionId: pool[i].id,
    itemVersion: pool[i].version,
    mode: "explore",
    sessionId: crypto.randomUUID(),
    position: "A qualified position.",
    explanation: "A reason.",
    reply: "A counterargument.",
    choice: null,
    revised: false,
    assumptionNoted: false,
    uncertain: false,
    branch: 0,
    ratings: [],
    timestamp: time,
  };
}
describe("shared expedition and text progress", () => {
  it("uses the same thresholds everywhere and equips the correct habitats", () => {
    expect(stations.map((s) => s.need)).toEqual(regionThresholds);
    expect(stations.map((s) => s.name)).toEqual(regions);
    for (let n = 0; n <= 40; n++) {
      const s = emptyState();
      s.answers = Array.from({ length: n }, (_, i) => answer(i));
      const p = expeditionProgress(s);
      expect(region(s)).toBe(stations[p.unlocked].name);
      expect(p.count).toBe(n);
      expect(p.unlocked).toBeGreaterThanOrEqual(0);
      expect(p.unlocked).toBeLessThan(9);
    }
    expect(stations[2].meters).toBe(1.4);
    expect(stations[3].gear).toContain("snorkel");
    expect(stations[4].gear).toContain("Scuba");
    expect(stations[5].gear).toContain("redundant");
    expect(stations[6].gear).toContain("submersible");
    expect(stations[7].gear).toContain("submersible");
  });
  it("does not manufacture milestones from repeats, blank responses or assessments", () => {
    const s = emptyState();
    s.answers = [
      answer(0),
      answer(0),
      { ...answer(1), mode: "assessment" },
      { ...answer(2), position: " ", explanation: "", reply: "" },
    ];
    expect(expeditionProgress(s).count).toBe(1);
  });
  it("always offers three distinct public exploration items; never assessment items", () => {
    for (const n of [0, 3, 144]) {
      const s = emptyState();
      s.answers = Array.from({ length: n }, (_, i) => answer(i));
      for (let station = 0; station < 9; station++) {
        const m = missions(s, qs, station);
        expect(m).toHaveLength(3);
        expect(new Set(m.map((m) => m.question.id)).size).toBe(3);
        expect(m.every((m) => !m.question.assessment)).toBe(true);
        expect(recommendations(s, qs).every((q) => !q.assessment)).toBe(true);
      }
    }
  });
  it("spaces revisits from the latest visit and preserves deliberate saved inquiries", () => {
    const s = emptyState();
    s.answers = [answer(0)];
    s.saved = [pool[1].id];
    let m = missions(s, qs, 0, Date.parse("2026-10-05T12:00:00Z"));
    expect(m[0]).toMatchObject({
      kind: "Revisit",
      question: { id: pool[0].id },
    });
    expect(m[1]).toMatchObject({
      kind: "Saved inquiry",
      question: { id: pool[1].id },
    });
    s.answers.push(answer(0, "2026-10-05T11:00:00Z"));
    m = missions(s, qs, 0, Date.parse("2026-10-05T12:00:00Z"));
    expect(m.some((m) => m.kind === "Revisit")).toBe(false);
  });
});
