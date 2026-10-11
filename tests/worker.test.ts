import { describe, it, expect, vi } from "vitest";
import worker, { Limits, type Env } from "../server/worker";
const env = {
  ALLOWED_ORIGINS: "https://example.test",
  DAILY_CALL_CAP: "2",
  PER_IP_CAP: "1",
  DAILY_TOKEN_CAP: "80000",
} as Env;
const call = (path: string, init?: RequestInit, e = env) =>
  worker.fetch(new Request("https://api.test" + path, init), e);
describe("worker fail-closed routes", () => {
  it("health does not imply configured AI or research", async () =>
    expect(await (await call("/health")).json()).toMatchObject({
      aiConfigured: false,
      researchEnabled: false,
    }));
  it("rejects other origins and research writes", async () => {
    expect(
      (
        await call("/guide", {
          method: "POST",
          headers: { Origin: "https://bad.test" },
        })
      ).status,
    ).toBe(403);
    expect(
      (
        await call("/research", {
          method: "POST",
          headers: { Origin: "https://example.test" },
        })
      ).status,
    ).toBe(503);
  });
  it("reports missing credentials honestly", async () =>
    expect(
      (
        await call("/guide", {
          method: "POST",
          headers: { Origin: "https://example.test" },
        })
      ).status,
    ).toBe(503));
  it("enforces per-IP and shared token reservations", async () => {
    const map = new Map<string, unknown>();
    const tx = {
      get: async (k: string) => structuredClone(map.get(k)),
      put: async (k: string, v: unknown) => {
        map.set(k, structuredClone(v));
      },
    };
    const state = {
      storage: {
        transaction: async (fn: (t: typeof tx) => unknown) => fn(tx),
        setAlarm: async () => {},
        deleteAll: async () => map.clear(),
      },
    } as unknown as DurableObjectState;
    const limits = new Limits(state, env);
    const reserve = async (ip: string) =>
      (await (
        await limits.fetch(
          new Request("https://internal", {
            method: "POST",
            body: JSON.stringify({ ip }),
          }),
        )
      ).json()) as { allowed: boolean };
    expect((await reserve("a")).allowed).toBe(true);
    expect((await reserve("a")).allowed).toBe(false);
    expect((await reserve("b")).allowed).toBe(true);
    expect((await reserve("c")).allowed).toBe(false);
  });
});

function budgetHarness() {
  const map = new Map<string, unknown>();
  const tx = {
    get: async (k: string) => structuredClone(map.get(k)),
    put: async (k: string, v: unknown) => {
      map.set(k, structuredClone(v));
    },
  };
  const state = {
    storage: {
      transaction: async (fn: (t: typeof tx) => unknown) => fn(tx),
      setAlarm: async () => {},
      deleteAll: async () => map.clear(),
    },
  } as unknown as DurableObjectState;
  const limits = new Limits(state, {
    ...env,
    DAILY_CALL_CAP: "100",
    PER_IP_CAP: "40",
    DAILY_TOKEN_CAP: "400000",
  });
  return async (path: string, body: unknown) =>
    (await (
      await limits.fetch(
        new Request("https://internal/" + path, {
          method: "POST",
          body: JSON.stringify(body),
        }),
      )
    ).json()) as { allowed: boolean; reservationId?: string };
}
it("permits a complete 12-turn rehearsal after verified usage settles each reservation", async () => {
  const budget = budgetHarness();
  for (let n = 0; n < 12; n++) {
    const r = await budget("reserve", { ip: "participant" });
    expect(r.allowed).toBe(true);
    expect(
      (await budget("settle", { reservationId: r.reservationId, tokens: 1500 }))
        .allowed,
    ).toBe(true);
    expect(
      (await budget("settle", { reservationId: r.reservationId, tokens: 1 }))
        .allowed,
    ).toBe(false);
  }
});
it("retains unknown-usage reservations and rejects fabricated refunds", async () => {
  const budget = budgetHarness();
  const r = await budget("reserve", { ip: "a" });
  for (const tokens of [-1, 0, 1.5])
    expect(
      (await budget("settle", { reservationId: r.reservationId, tokens }))
        .allowed,
    ).toBe(false);
  expect(
    (await budget("settle", { reservationId: "not-issued", tokens: 1 }))
      .allowed,
  ).toBe(false);
  for (let i = 1; i < 10; i++)
    expect((await budget("reserve", { ip: "a" })).allowed).toBe(true);
  expect((await budget("reserve", { ip: "a" })).allowed).toBe(false);
});
it("does not replenish the per-IP request allowance by settling tokens", async () => {
  const budget = budgetHarness();
  for (let n = 0; n < 40; n++) {
    const r = await budget("reserve", { ip: "a" });
    expect(r.allowed).toBe(true);
    await budget("settle", { reservationId: r.reservationId, tokens: 1 });
  }
  expect((await budget("reserve", { ip: "a" })).allowed).toBe(false);
});

it("settles only validated provider usage through the actual Worker route", async () => {
  const internal = vi.fn(async (url: string) =>
    Response.json(
      url.endsWith("/reserve")
        ? { allowed: true, reservationId: "issued-id" }
        : { allowed: true },
    ),
  );
  const configured = {
    ...env,
    OPENAI_API_KEY: "test-only",
    AI_MODEL: "fixture",
    IP_HASH_SALT: "test-only",
    LIMITS: { idFromName: () => "global", get: () => ({ fetch: internal }) },
  } as unknown as Env;
  const transport = vi.fn(async () =>
    Response.json({
      status: "completed",
      model: "fixture",
      output: [
        {
          content: [
            {
              type: "output_text",
              text: JSON.stringify({ question: "What supports that reason?" }),
            },
          ],
        },
      ],
      usage: { input_tokens: 120, output_tokens: 40 },
    }),
  );
  vi.stubGlobal("fetch", transport);
  try {
    const r = await call(
      "/guide",
      {
        method: "POST",
        headers: {
          Origin: "https://example.test",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          questionId: "ethics-01",
          answer: "A reason.",
          consent: true,
        }),
      },
      configured,
    );
    expect(r.status).toBe(200);
    expect(transport).toHaveBeenCalledTimes(1);
    expect(internal).toHaveBeenCalledTimes(2);
    expect(internal.mock.calls[1][0]).toBe("https://internal/settle");
  } finally {
    vi.unstubAllGlobals();
  }
});
it("rejects malformed, oversized and unknown-item requests before quota allocation", async () => {
  const internal = vi.fn();
  const configured = {
    ...env,
    OPENAI_API_KEY: "test-only",
    AI_MODEL: "fixture",
    LAB_MODEL: "fixture",
    IP_HASH_SALT: "test-only",
    LIMITS: { idFromName: () => "global", get: () => ({ fetch: internal }) },
  } as unknown as Env;
  for (const [body, status] of [
    ["{", 400],
    ["x".repeat(22001), 413],
    [
      JSON.stringify({
        questionId: "ethics-99",
        answer: "A reason.",
        consent: true,
      }),
      400,
    ],
  ] as const) {
    expect(
      (
        await call(
          "/guide",
          {
            method: "POST",
            headers: {
              Origin: "https://example.test",
              "Content-Type": "application/json",
            },
            body,
          },
          configured,
        )
      ).status,
    ).toBe(status);
  }
  expect(internal).not.toHaveBeenCalled();
});
