import { describe, it, expect } from "vitest";
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
