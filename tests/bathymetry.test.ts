import { describe, it, expect } from "vitest";
import { bathymetry, marianaTerrain } from "../src/game/bathymetry";
import { swimStep, swimmerAt } from "../src/game/locomotion";
describe("terrain and collision share physical coordinates", () => {
  it("preserves north-to-south orientation and triangular surface elevations", () => {
    const t = bathymetry({
      bounds: { latMin: 0, latMax: 1, lonMin: 0, lonMax: 1 },
      grid: { rows: 2, cols: 2 },
      elevationsMeters: [-10, -20, -30, -100],
    });
    expect(t.sample(-t.width / 2, -t.length / 2)).toBe(-10);
    expect(t.sample(t.width / 2, t.length / 2)).toBe(-100);
    expect(t.sample(0, 0)).toBe(-25); // shared diagonal between northeast/southwest
    expect(t.sample(-t.width / 4, -t.length / 4)).toBe(-17.5);
    expect(t.sample(t.width / 4, t.length / 4)).toBe(-62.5);
  });
  it("preserves actual Mariana depth, metric extents and grid extrema", () => {
    expect(marianaTerrain.waypoints[1].y).toBe(-10925);
    expect(marianaTerrain.width).toBeGreaterThan(75000);
    expect(marianaTerrain.length).toBeGreaterThan(55000);
    for (let i = 0; i < marianaTerrain.rows * marianaTerrain.cols; i++) {
      const p = marianaTerrain.point(i);
      expect(marianaTerrain.sample(p.x, p.z)).toBeCloseTo(p.y, 5);
    }
  });
  it("blocks a vertical wall without lifting a sub through it, and allows sliding", () => {
    const s = swimmerAt(6, 600);
    Object.assign(s, { x: -1, z: 0, y: -600 });
    const ground = (x: number) => (x < 0 ? -610 : -590);
    for (let n = 0; n < 180; n++)
      swimStep(s, { x: 1, z: 1, y: 0 }, 1 / 60, true, true, ground);
    expect(s.x).toBeLessThan(0);
    expect(s.z).toBeGreaterThan(1);
    expect(s.y).toBe(-600);
  });
  it("rejects incomplete bathymetry", () =>
    expect(() =>
      bathymetry({
        bounds: { latMin: 0, latMax: 1, lonMin: 0, lonMax: 1 },
        grid: { rows: 2, cols: 2 },
        elevationsMeters: [-1],
      }),
    ).toThrow());
});
