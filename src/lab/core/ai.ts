import { z } from "zod";
export const aiResultSchema = z
  .object({
    question: z.string().min(1).max(1200),
    observation: z.string().max(1600),
    uncertainty: z.string().max(1200),
    model: z.string(),
    modelVersion: z.string(),
    protocolVersion: z.string(),
    promptVersion: z.string(),
    parameters: z
      .object({
        temperature: z.literal(1),
        maxOutputTokens: z.literal(1800),
        store: z.literal(false),
      })
      .strict(),
    condition: z.enum(["cartesian", "socratic", "pragmatist", "neutral"]),
    tokenUsage: z
      .object({
        inputTokens: z.number().nonnegative(),
        outputTokens: z.number().nonnegative(),
      })
      .strict(),
    latencyMs: z.number().nonnegative(),
    timestamp: z.string().datetime(),
    researchRecorded: z.literal(false),
  })
  .strict();
export type AIResult = z.infer<typeof aiResultSchema>;
export const aiEventSchema = z
  .object({
    itemId: z.string(),
    turn: z.number().int().min(0).max(3),
    inputQuestion: z.string().max(3000),
    participantResponse: z.string().max(4000),
    result: aiResultSchema.nullable(),
    error: z.string().nullable(),
    timestamp: z.string().datetime(),
    condition: z.enum(["cartesian", "socratic", "pragmatist", "neutral"]),
    latencyMs: z.number().nonnegative(),
  })
  .strict();
export type AIEvent = z.infer<typeof aiEventSchema>;
