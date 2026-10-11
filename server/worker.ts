import { generateLab, labRequestSchema } from "./lab-service";
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
    const { ip } = (await req.json()) as { ip: string };
    const caps = [
      this.env.DAILY_CALL_CAP,
      this.env.PER_IP_CAP,
      this.env.DAILY_TOKEN_CAP,
    ].map(Number);
    if (caps.some((n) => !Number.isSafeInteger(n) || n <= 0))
      return json({ allowed: false });
    const day = new Date().toISOString().slice(0, 10);
    const allowed = await this.state.storage.transaction(async (tx) => {
      const old = await tx.get<{
        day: string;
        calls: number;
        reserved: number;
        ips: Record<string, number>;
      }>("budget");
      const value =
        old?.day === day ? old : { day, calls: 0, reserved: 0, ips: {} };
      if (
        value.calls >= Number(this.env.DAILY_CALL_CAP) ||
        (value.ips[ip] || 0) >= Number(this.env.PER_IP_CAP) ||
        value.reserved + 40000 > Number(this.env.DAILY_TOKEN_CAP)
      )
        return false;
      value.calls++;
      value.reserved += 40000;
      value.ips[ip] = (value.ips[ip] || 0) + 1;
      await tx.put("budget", value);
      return true;
    });
    await this.state.storage.setAlarm(Date.now() + 86400000);
    return json({ allowed });
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
      if (path !== "/lab" && !/^[a-z]+-\d{2}$/.test(qid))
        return json({ error: "Invalid item" }, 400, headers);
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
      if (!((await limit.json()) as { allowed: boolean }).allowed)
        return json({ error: "Daily service allowance reached" }, 429, headers);
      return json(
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
            ),
        200,
        headers,
      );
    } catch {
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
