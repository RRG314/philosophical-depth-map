import { describe, it, expect } from "vitest";
import { emptyState, stateSchema, xp, achievements } from "../../src/lib/model";
import { expeditionProgress } from "../../src/game/progression";
import catalogue from "../../src/community/catalogue.json";
describe("editorial experiment data", () => {
  it("starts with the original, keeps the added condition separate, and has six referenced historical cases", () => {
    expect(catalogue[0].slug).toBe("the-last-prisoner");
    expect(catalogue[0].author).toBe("Steven Reid — Independent Researcher");
    expect(catalogue[0].scenario).not.toContain("powers of a god");
    expect(catalogue[0].reveal).toContain("you cannot kill the prisoner");
    expect(catalogue[0].finalQuestion).toBe("What would you do, and why?");
    expect(catalogue.filter((e) => e.kind === "historical")).toHaveLength(6);
    expect(new Set(catalogue.map((e) => e.slug)).size).toBe(catalogue.length);
    for (const item of catalogue) {
      expect(item.scenario.length).toBeGreaterThan(100);
      expect(item.question.length).toBeGreaterThan(20);
      expect(item.references.length).toBeGreaterThan(0);
      for (const reference of item.references)
        expect(new URL(reference.url).protocol).toBe("https:");
    }
  });
});

it("imports older journals and counts an experiment once across versions without rating its answer", () => {
  const s = stateSchema.parse(emptyState());
  expect(s.reflections).toBeUndefined();
  const e = catalogue[0];
  const reflection = {
    slug: e.slug,
    version: e.version,
    title: e.title,
    scenario: e.scenario,
    question: e.question,
    reveal: e.reveal,
    finalQuestion: e.finalQuestion,
    initial: "I remain uncertain.",
    final: "I would examine the premise.",
    timestamp: new Date().toISOString(),
  };
  const updated = stateSchema.parse({
    ...s,
    reflections: [reflection, { ...reflection, version: 2 }],
  });
  expect(xp(updated)).toBe(10);
  expect(expeditionProgress(updated).count).toBe(1);
  expect(updated.answers).toHaveLength(0);
  expect(achievements(updated, [])[0]).toBe(true);
  expect(achievements(updated, [])[1]).toBe(false);
  expect(() =>
    stateSchema.parse({ ...s, reflections: [{ ...reflection, initial: " " }] }),
  ).toThrow();
});
