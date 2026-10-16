import { openDB } from "idb";
import { emptyState, stateSchema, type State } from "./model";
const db = () =>
  openDB("philosophical-depth-map", 1, {
    upgrade(d) {
      d.createObjectStore("progress");
    },
  });
export async function load() {
  const d = await db();
  const value = await d.get("progress", "state");
  return value ? stateSchema.parse(value) : emptyState();
}
export async function save(state: State) {
  const d = await db();
  await d.put("progress", state, "state");
}
export async function erase() {
  const d = await db();
  await d.clear("progress");
}

export async function saveReflection(
  reflection: NonNullable<State["reflections"]>[number],
) {
  const d = await db();
  const tx = d.transaction("progress", "readwrite");
  const value = await tx.store.get("state");
  const current = value ? stateSchema.parse(value) : emptyState();
  const reflections = (current.reflections ?? []).filter(
    (r) => !(r.slug === reflection.slug && r.version === reflection.version),
  );
  const next = stateSchema.parse({
    ...current,
    reflections: [...reflections, reflection],
  });
  await tx.store.put(next, "state");
  await tx.done;
  window.dispatchEvent(new Event("journey-saved"));
}
