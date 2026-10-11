import { it, expect } from "vitest";
import {
  seabed,
  shorePosition,
  swimmerAt,
  swimStep,
} from "../src/game/locomotion";
it("uses one sea level and a continuous coast for all starting depths", () => {
  for (const d of [0.15, 0.7, 1.4, 3, 18, 60, 600, 4000])
    expect(-seabed(0, shorePosition(d))).toBeCloseTo(d, 7);
});
it("walks into swimming depth, then can return to standing without teleportation", () => {
  const s = swimmerAt(0, 0.15);
  let previous = s.y;
  for (let i = 0; i < 900; i++) {
    swimStep(s, { x: 0, z: -1, y: 0 }, 1 / 60, false, false);
    expect(Math.abs(s.y - previous)).toBeLessThan(0.13);
    previous = s.y;
  }
  expect(s.swimming).toBe(true);
  expect(s.y).toBeCloseTo(-0.35, 1);
  for (let i = 0; i < 900; i++)
    swimStep(s, { x: 0, z: 1, y: 0 }, 1 / 60, false, false);
  expect(s.swimming).toBe(false);
  expect(s.y).toBeCloseTo(seabed(s.x, s.z));
});
it("dives and rises continuously, slows after release, and respects surface and bottom", () => {
  const s = swimmerAt(4, 18);
  for (let i = 0; i < 180; i++)
    swimStep(s, { x: 0, z: -1, y: -1 }, 1 / 60, true, false);
  expect(s.y).toBeLessThan(-18);
  expect(s.z).toBeLessThan(shorePosition(23));
  for (let i = 0; i < 180; i++)
    swimStep(s, { x: 0, z: 0, y: 0 }, 1 / 60, true, false);
  expect(Math.hypot(s.vx, s.vy, s.vz)).toBeLessThan(0.001);
  for (let i = 0; i < 2000; i++)
    swimStep(s, { x: 0, z: 0, y: 1 }, 1 / 60, true, false);
  expect(s.y).toBe(-0.35);
  for (let i = 0; i < 2000; i++)
    swimStep(s, { x: 0, z: 0, y: -1 }, 1 / 60, true, false);
  expect(s.y).toBeCloseTo(seabed(s.x, s.z) + 0.7);
});
