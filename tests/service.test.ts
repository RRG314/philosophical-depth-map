import { describe, it, expect, vi } from "vitest";
import { generate, openAIProvider, type Provider } from "../server/service";
const request = {
  questionId: "ethics-02",
  answer: "Fairness requires considering those affected.",
  consent: true,
};
describe("optional AI boundary", () => {
  it("rejects missing consent before invoking provider", async () => {
    const p = vi.fn();
    await expect(
      generate("guide", { ...request, consent: false }, p),
    ).rejects.toThrow();
    expect(p).not.toHaveBeenCalled();
  });
  it("returns provenance and no research claim for valid guide", async () => {
    const p: Provider = async () => ({
      text: JSON.stringify({
        question: "Who might be left out of that consideration?",
      }),
      model: "synthetic-test",
      inputTokens: 20,
      outputTokens: 12,
    });
    expect(await generate("guide", request, p)).toMatchObject({
      provisional: true,
      model: "synthetic-test",
      researchRecorded: false,
      promptVersion: "guide-1.0",
    });
  });
  it("rejects forged evidence and repeated dimensions", async () => {
    const p: Provider = async () => ({
      text: JSON.stringify({
        ratings: [
          {
            dimension: "justification",
            score: 4,
            evidence: "invented",
            rationale: "x",
            missingEvidence: "",
            uncertainty: "low",
            abstain: false,
          },
        ],
      }),
      model: "fixture",
      inputTokens: 0,
      outputTokens: 0,
    });
    await expect(generate("evaluate", request, p)).rejects.toThrow();
  });
  it("propagates provider outages without a simulated answer", async () => {
    await expect(
      generate("guide", request, async () => {
        throw Error("outage");
      }),
    ).rejects.toThrow("outage");
  });
  it("uses current Responses structure and disables storage", async () => {
    const transport = vi.fn().mockResolvedValue(
      Response.json({
        status: "completed",
        model: "fixture",
        output: [{ content: [{ type: "output_text", text: "{}" }] }],
        usage: { input_tokens: 1, output_tokens: 1 },
      }),
    );
    await openAIProvider("secret-test", "fixture", transport)(
      "trusted",
      "untrusted",
      {},
    );
    const body = JSON.parse(transport.mock.calls[0][1].body);
    expect(body.store).toBe(false);
    expect(body.text.format.type).toBe("json_schema");
    expect(body.tools).toBeUndefined();
  });
});

it("accepts complete provisional evidence while keeping untrusted text in its data field", async () => {
  const bank = await import("../src/data/questions.json");
  const item = bank.default.find((q) => q.id === request.questionId)!;
  const p = vi
    .fn<Provider>()
    .mockImplementation(async () => ({
      text: JSON.stringify({
        ratings: item.skills.map((d) => ({
          dimension: d,
          score: 2,
          evidence: "Fairness",
          rationale: "Synthetic test of transport, not a judgment.",
          missingEvidence: "",
          uncertainty: "high",
          abstain: false,
        })),
      }),
      model: "synthetic-evaluator",
      inputTokens: 30,
      outputTokens: 100,
    }));
  const result = await generate("evaluate", request, p);
  expect(result).toMatchObject({
    rubricVersion: "reasoning-1.0",
    model: "synthetic-evaluator",
  });
  expect(JSON.parse(p.mock.calls[0][1]).participantResponse).toBe(
    request.answer,
  );
  expect(p.mock.calls[0][0]).toContain("untrusted data");
});
