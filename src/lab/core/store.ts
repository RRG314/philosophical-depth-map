import { openDB } from "idb";
import { validateSession, type Session, type BlindPacket } from "./experiment";
import { validateRating, type Rating } from "./evaluation";
import type { Problem } from "./schema";
import { z } from "zod";
const db = () =>
  openDB("philosophical-reasoning-lab", 1, {
    upgrade(db) {
      db.createObjectStore("lab");
    },
  });
export async function readLocal<T>(key: string): Promise<T | undefined> {
  const d = await db();
  return d.get("lab", key);
}
export async function writeLocal(key: string, value: unknown) {
  const d = await db();
  await d.put("lab", value, key);
}
export async function clearLocal() {
  const d = await db();
  await d.clear("lab");
}
export function download(name: string, data: unknown) {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export async function fileJSON(file: File) {
  if (file.size > 5_000_000) throw Error("File exceeds 5 MB");
  return JSON.parse(await file.text()) as unknown;
}
export function importSessions(raw: unknown, bank: Problem[]) {
  if (!Array.isArray(raw) || raw.length > 100)
    throw Error("Expected at most 100 sessions");
  const sessions = raw.map((s) => validateSession(s, bank));
  if (new Set(sessions.map((s) => s.id)).size !== sessions.length)
    throw Error("Duplicate sessions");
  return sessions;
}
export const packetSchema = z
  .object({
    version: z.literal("blind-1.0"),
    packetId: z.string().uuid(),
    synthetic: z.boolean(),
    responses: z
      .array(
        z
          .object({
            blindId: z.string().uuid(),
            question: z.string().max(3000),
            response: z.string().max(4000),
            itemVersion: z.string().max(30),
          })
          .strict(),
      )
      .max(2000),
  })
  .strict();
export function parsePacket(raw: unknown): BlindPacket {
  const p = packetSchema.parse(raw);
  if (new Set(p.responses.map((r) => r.blindId)).size !== p.responses.length)
    throw Error("Duplicate blind IDs");
  return p;
}
export function importRatings(raw: unknown, packet: BlindPacket): Rating[] {
  if (!Array.isArray(raw) || raw.length > 16000)
    throw Error("Invalid rating file");
  const ratings = raw.map((r) => {
    const id = (r as { blindId?: string })?.blindId;
    const response = packet.responses.find((p) => p.blindId === id);
    if (!response) throw Error("Unknown blind response");
    return validateRating(r, response.response);
  });
  const keys = ratings.map((r) => `${r.blindId}:${r.criterion}:${r.raterId}`);
  if (new Set(keys).size !== keys.length)
    throw Error("Duplicate rater dimensions");
  return ratings;
}
export type LabStore = { sessions: Session[]; activeId: string | null };
