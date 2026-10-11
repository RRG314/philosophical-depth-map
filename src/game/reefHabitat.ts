import * as T from "three";
import { mergeVertices } from "three/addons/utils/BufferGeometryUtils.js";

// Authored habitat dressing, complementary to the licensed photogrammetry.
// A clear central sand channel keeps the swimming route and reading instruments visible.
export function reefHabitat(
  scene: T.Scene,
  ground: (x: number, z: number) => number,
  origin: { x: number; z: number },
  index: number,
) {
  if (index < 2 || index > 5) return;
  let seed = 9147 + index;
  const random = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  const transform = new T.Object3D();
  let rockGeometry: T.BufferGeometry = new T.IcosahedronGeometry(1, 3);
  const vertices = rockGeometry.attributes.position;
  for (let i = 0; i < vertices.count; i++) {
    const x = vertices.getX(i),
      y = vertices.getY(i),
      z = vertices.getZ(i);
    const bump = 1 + 0.13 * Math.sin(x * 13 + z * 9) * Math.cos(y * 11);
    vertices.setXYZ(i, x * bump, y * bump, z * bump);
  }
  rockGeometry.deleteAttribute("normal");
  rockGeometry.deleteAttribute("uv");
  const original = rockGeometry;
  rockGeometry = mergeVertices(original);
  original.dispose();
  rockGeometry.computeVertexNormals();
  const rockMaterial = new T.MeshStandardMaterial({
    color: 0x7c8170,
    roughness: 0.98,
  });
  const rocks = new T.InstancedMesh(rockGeometry, rockMaterial, 180);
  rocks.receiveShadow = true;
  const color = new T.Color();
  for (let n = 0; n < rocks.count; n++) {
    const side = n % 2 ? -1 : 1;
    const x = origin.x + side * (8 + random() * 43);
    const z = origin.z + 12 - random() * 95;
    const size = 0.3 + Math.pow(random(), 2) * (index === 2 ? 0.7 : 1.4);
    transform.position.set(x, ground(x, z) - size * 0.22, z);
    transform.rotation.set(
      random() * 0.6,
      random() * Math.PI * 2,
      random() * 0.4,
    );
    transform.scale.set(size * (1 + random()), size * 0.7, size);
    transform.updateMatrix();
    rocks.setMatrixAt(n, transform.matrix);
    rocks.setColorAt(
      n,
      color.setHSL(0.12 + random() * 0.08, 0.12, 0.25 + random() * 0.17),
    );
  }
  scene.add(rocks);
  // Ribbon leaves are instanced rather than thousands of separately drawn meshes.
  if (index === 5) return;
  const leaf = new T.PlaneGeometry(0.065, 0.65, 1, 4);
  leaf.translate(0, 0.325, 0);
  const p = leaf.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const y = p.getY(i);
    p.setX(i, p.getX(i) * (1 - y * 1.1));
    p.setZ(i, y * y * 0.6);
  }
  leaf.computeVertexNormals();
  const grass = new T.InstancedMesh(
    leaf,
    new T.MeshStandardMaterial({
      color: 0x536a37,
      roughness: 0.9,
      side: T.DoubleSide,
    }),
    2200,
  );
  grass.receiveShadow = true;
  for (let i = 0; i < grass.count; i++) {
    const cluster = i % 24,
      side = cluster % 2 ? -1 : 1;
    const x = origin.x + side * (9 + (cluster % 6) * 3) + (random() - 0.5) * 5;
    const z = origin.z + 4 - Math.floor(cluster / 2) * 4 + (random() - 0.5) * 5;
    transform.position.set(x, ground(x, z), z);
    transform.rotation.set(0, random() * Math.PI * 2, (random() - 0.5) * 0.3);
    transform.scale.setScalar(0.65 + random() * 0.8);
    transform.updateMatrix();
    grass.setMatrixAt(i, transform.matrix);
    grass.setColorAt(
      i,
      color.setHSL(0.2 + random() * 0.06, 0.28, 0.22 + random() * 0.12),
    );
  }
  scene.add(grass);
}
