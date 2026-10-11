import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { it, expect } from "vitest";
import { oceanAssets } from "../src/game/assets";
import manifest from "../public/assets/ocean/manifest.json";
it("ships attributed, self-contained GLBs with the recorded geometry, animations and content hashes", () => {
  expect(manifest.map((a) => a.id).sort()).toEqual(
    oceanAssets.map((a) => a.id).sort(),
  );
  for (const asset of manifest) {
    const bytes = readFileSync(
      new URL(`../public/assets/ocean/${asset.id}.glb`, import.meta.url),
    );
    expect(bytes.readUInt32LE(0)).toBe(0x46546c67);
    expect(bytes.readUInt32LE(4)).toBe(2);
    expect(bytes.readUInt32LE(8)).toBe(bytes.length);
    expect(createHash("sha256").update(bytes).digest("hex")).toBe(asset.sha256);
    expect(bytes.length).toBeLessThan(6_000_000);
    const gltf = JSON.parse(
      bytes.subarray(20, 20 + bytes.readUInt32LE(12)).toString(),
    );
    expect((gltf.animations ?? []).length).toBe(asset.animationClips);
    expect(
      [...gltf.buffers, ...(gltf.images ?? [])].every((a: { uri?: string }) => !a.uri),
    ).toBe(true);
    expect(asset.license).toBe("CC BY 4.0");
    expect(asset.triangles).toBeLessThan(100000);
  }
});
