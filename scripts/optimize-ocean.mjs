import process from "node:process";
import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import {
  dedup,
  prune,
  resample,
  textureCompress,
  weld,
  simplify,
  flatten,
  join,
} from "@gltf-transform/functions";
import sharp from "sharp";
import { MeshoptSimplifier } from "meshoptimizer";
// Preserve characters and animation. Terrain additionally receives a static geometry LOD.
const [input, output] = process.argv.slice(2);
if (!input || !output)
  throw Error("Usage: node scripts/optimize-ocean.mjs input.glb output.glb");
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const doc = await io.read(input);
await doc.transform(
  dedup(),
  resample(),
  prune(),
  textureCompress({
    encoder: sharp,
    targetFormat: "webp",
    resize: process.argv.includes("--terrain") ? [1024, 1024] : [2048, 2048],
    quality: 90,
  }),
);
if (process.argv.includes("--terrain")) {
  await MeshoptSimplifier.ready;
  await doc.transform(
    flatten(),
    join(),
    weld(),
    simplify({
      simplifier: MeshoptSimplifier,
      ratio: 0.018,
      error: 0.006,
      lockBorder: false,
    }),
  );
}
await io.write(output, doc);
