import questions from "../src/data/questions.json";
import {
  generateLab,
  labRequestSchema,
  validateLabRequest,
} from "./lab-service";
import { generate, openAIProvider, requestSchema } from "./service";
export interface Env {
  OPENAI_API_KEY?: string;
  AI_MODEL?: string;
  LAB_MODEL?: string;
  ALLOWED_ORIGINS: string;
  LIMITS: DurableObjectNamespace;
  DAILY_CALL_CAP: string;
  PER_IP_CAP: string;
  DAILY_TOKEN_CAP: string;
  IP_HASH_SALT?: string;
}
const json = (
  body: unknown,
  status = 200,
  headers: Record<string, string> = {},
) =>
  Response.json(body, {
    status,
    headers: { "Cache-Control": "no-store", ...headers },
  });
export class Limits {
  constructor(
    private state: DurableObjectState,
    private env: Env,
  ) {}
  async fetch(req: Request) {
    const body = (await req.json()) as {
      ip?: string;
      reservationId?: string;
      tokens?: number;
    };
    const caps = [
      this.env.DAILY_CALL_CAP,
      this.env.PER_IP_CAP,
      this.env.DAILY_TOKEN_CAP,
    ].map(Number);
    if (caps.some((n) => !Number.isSafeInteger(n) || n <= 0))
      return json({ allowed: false });
    const day = new Date().toISOString().slice(0, 10);
    const result = await this.state.storage.transaction(async (tx) => {
      const old = await tx.get<{
        day: string;
        calls: number;
        reserved: number;
        ips: Record<string, number>;
        pending?: Record<string, number>;
      }>("budget");
      const value =
        old?.day === day
          ? old
          : { day, calls: 0, reserved: 0, ips: {}, pending: {} };
      value.pending ??= {};
      if (new URL(req.url).pathname === "/settle") {
        const id = body.reservationId;
        if (
          !id ||
          !Object.hasOwn(value.pending, id) ||
          !Number.isSafeInteger(body.tokens) ||
          body.tokens! < 1
        )
          return { allowed: false };
        // Only trusted provider usage can release a reservation; unknown usage stays charged.
        value.reserved += body.tokens! - value.pending[id];
        delete value.pending[id];
        await tx.put("budget", value);
        return { allowed: true };
      }
      const ip = body.ip;
      if (
        !ip ||
        !/^[a-zA-Z0-9_-]{1,128}$/.test(ip) ||
        value.calls >= caps[0] ||
        (Object.hasOwn(value.ips, ip) ? value.ips[ip] : 0) >= caps[1] ||
        value.reserved + 40000 > caps[2]
      )
        return { allowed: false };
      const reservationId = crypto.randomUUID();
      value.calls++;
      value.reserved += 40000;
      value.ips[ip] = (Object.hasOwn(value.ips, ip) ? value.ips[ip] : 0) + 1;
      value.pending[reservationId] = 40000;
      await tx.put("budget", value);
      return { allowed: true, reservationId };
    });
    await this.state.storage.setAlarm(Date.now() + 86400000);
    return json(result);
  }
  async alarm() {
    await this.state.storage.deleteAll();
  }
}
export default {
  async fetch(req: Request, env: Env) {
    const path = new URL(req.url).pathname;
    if (path === "/health")
      return json({
        status: "ok",
        labConfigured: Boolean(
          env.OPENAI_API_KEY && env.LAB_MODEL && env.IP_HASH_SALT,
        ),
        aiConfigured: Boolean(
          env.OPENAI_API_KEY && env.AI_MODEL && env.IP_HASH_SALT,
        ),
        researchEnabled: false,
      });
    const origin = req.headers.get("Origin") || "";
    const origins = env.ALLOWED_ORIGINS.split(",").map((s) => s.trim());
    if (!origins.includes(origin))
      return json({ error: "Origin not allowed" }, 403);
    const headers = {
      "Access-Control-Allow-Origin": origin,
      Vary: "Origin",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };
    if (req.method === "OPTIONS")
      return new Response(null, { status: 204, headers });
    if (path === "/research")
      return json(
        { error: "Research enrollment is disabled pending authorization." },
        503,
        headers,
      );
    if (!["/guide", "/evaluate", "/lab"].includes(path))
      return json({ error: "Not found" }, 404, headers);
    if (req.method !== "POST")
      return json({ error: "POST required" }, 405, headers);
    const model = path === "/lab" ? env.LAB_MODEL : env.AI_MODEL;
    if (!env.OPENAI_API_KEY || !model || !env.IP_HASH_SALT)
      return json({ error: "Optional AI is not configured" }, 503, headers);
    if (!req.headers.get("Content-Type")?.startsWith("application/json"))
      return json({ error: "JSON required" }, 415, headers);
    try {
      const reader = req.body?.getReader();
      if (!reader) return json({ error: "Body required" }, 400, headers);
      let total = 0;
      const parts: Uint8Array[] = [];
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        total += value.byteLength;
        if (total > 22000) {
          await reader.cancel();
          return json({ error: "Request too large" }, 413, headers);
        }
        parts.push(value);
      }
      const bytes = new Uint8Array(total);
      let offset = 0;
      for (const part of parts) {
        bytes.set(part, offset);
        offset += part.length;
      }
      const raw = (
        path === "/lab" ? labRequestSchema : requestSchema
      ).safeParse(JSON.parse(new TextDecoder().decode(bytes)));
      if (!raw.success)
        return json(
          { error: "Invalid request or missing consent" },
          400,
          headers,
        );
      const qid =
        "questionId" in raw.data ? raw.data.questionId : raw.data.problemId;
      if (path !== "/lab" && !questions.some((q) => q.id === qid))
        return json({ error: "Invalid item" }, 400, headers);
      if (path === "/lab") {
        try {
          validateLabRequest(raw.data);
        } catch {
          return json(
            { error: "Invalid intervention or history" },
            400,
            headers,
          );
        }
      }
      const day = new Date().toISOString().slice(0, 10);
      const ip = req.headers.get("CF-Connecting-IP") || "local";
      const digest = await crypto.subtle.digest(
        "SHA-256",
        new TextEncoder().encode(`${env.IP_HASH_SALT}:${day}:${ip}`),
      );
      const hash = Array.from(new Uint8Array(digest))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
      const limit = await env.LIMITS.get(env.LIMITS.idFromName("global")).fetch(
        "https://internal/reserve",
        { method: "POST", body: JSON.stringify({ ip: hash }) },
      );
      const allowance = (await limit.json()) as {
        allowed: boolean;
        reservationId?: string;
      };
      if (!allowance.allowed)
        return json({ error: "Daily service allowance reached" }, 429, headers);
      const result =
        path === "/lab"
          ? await generateLab(
              raw.data,
              openAIProvider(env.OPENAI_API_KEY, model, fetch, {
                temperature: 1,
              }),
            )
          : await generate(
              path === "/guide" ? "guide" : "evaluate",
              raw.data,
              openAIProvider(env.OPENAI_API_KEY, model),
            );
      const usage = "tokenUsage" in result ? result.tokenUsage : result.usage;
      const tokens = usage.inputTokens + usage.outputTokens;
      if (
        allowance.reservationId &&
        Number.isSafeInteger(tokens) &&
        tokens > 0
      ) {
        await env.LIMITS.get(env.LIMITS.idFromName("global")).fetch(
          "https://internal/settle",
          {
            method: "POST",
            body: JSON.stringify({
              reservationId: allowance.reservationId,
              tokens,
            }),
          },
        );
      }
      return json(result, 200, headers);
    } catch (error) {
      if (error instanceof SyntaxError)
        return json({ error: "Malformed JSON" }, 400, headers);
      return json(
        {
          error: "Request could not be completed; local progress is unaffected",
        },
        502,
        headers,
      );
    }
  },
} satisfies ExportedHandler<Env>;
