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
