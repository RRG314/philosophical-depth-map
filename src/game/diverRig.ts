import * as T from "three";

/** A game-authored skeleton for the licensed, unrigged source character. */
export function rigDiver(source: T.Group) {
  source.updateMatrixWorld(true);
  const box = new T.Box3();
  source.traverse((o) => {
    if (o instanceof T.Mesh && o.visible) box.expandByObject(o, true);
  });
  const size = box.getSize(new T.Vector3()),
    center = box.getCenter(new T.Vector3());
  const scale = 1.82 / size.y;
  const transform = new T.Matrix4()
    .makeScale(scale, scale, scale)
    .multiply(
      new T.Matrix4().makeTranslation(-center.x, -box.min.y, -center.z),
    );
  const group = new T.Group();
  const bones: T.Bone[] = [];
  function bone(
    name: string,
    parent: T.Bone | null,
    x: number,
    y: number,
    z: number,
  ) {
    const b = new T.Bone();
    b.name = name;
    b.position.set(x, y, z);
    bones.push(b);
    if (parent) parent.add(b);
    else group.add(b);
    return b;
  }
  const root = bone("pelvis", null, 0, 0.91, 0);
  const limbs = [-1, 1].map((side) => {
    const hip = bone(`hip${side}`, root, side * 0.1, -0.03, 0);
    const knee = bone(`knee${side}`, hip, 0, -0.44, 0);
    const foot = bone(`foot${side}`, knee, 0, -0.35, 0);
    const shoulder = bone(`shoulder${side}`, root, side * 0.2, 0.51, 0);
    const elbow = bone(`elbow${side}`, shoulder, side * 0.34, 0, 0);
    const wrist = bone(`wrist${side}`, elbow, side * 0.28, 0, 0);
    return { side, hip, knee, foot, shoulder, elbow, wrist };
  });
  group.updateMatrixWorld(true);
  const skeleton = new T.Skeleton(bones);
  source.traverse((o) => {
    if (!(o instanceof T.Mesh)) return;
    const geometry = o.geometry
      .clone()
      .applyMatrix4(transform.clone().multiply(o.matrixWorld));
    const pos = geometry.attributes.position;
    const indices: number[] = [],
      weights: number[] = [];
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i),
        y = pos.getY(i),
        limb = limbs[x < 0 ? 0 : 1];
      let a = 0,
        b = 0,
        w = 0;
      if (y < 0.91) {
        a = bones.indexOf(limb.hip);
        b = bones.indexOf(limb.knee);
        w = 1 - T.MathUtils.smoothstep(y, 0.36, 0.59);
        if (y < 0.2) {
          a = b;
          b = bones.indexOf(limb.foot);
          w = 1 - T.MathUtils.smoothstep(y, 0.08, 0.2);
        }
      } else if (Math.abs(x) > 0.19 && y > 1.15 && y < 1.6) {
        a = bones.indexOf(limb.shoulder);
        b = bones.indexOf(limb.elbow);
        w = T.MathUtils.smoothstep(Math.abs(x), 0.44, 0.65);
        if (Math.abs(x) > 0.76) {
          a = b;
          b = bones.indexOf(limb.wrist);
          w = T.MathUtils.smoothstep(Math.abs(x), 0.76, 0.9);
        }
      }
      indices.push(a, b, 0, 0);
      weights.push(1 - w, w, 0, 0);
    }
    geometry.setAttribute("skinIndex", new T.Uint16BufferAttribute(indices, 4));
    geometry.setAttribute(
      "skinWeight",
      new T.Float32BufferAttribute(weights, 4),
    );
    const mesh = new T.SkinnedMesh(geometry, o.material);
    mesh.name = o.name;
    mesh.visible = o.visible;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.frustumCulled = false;
    group.add(mesh);
    mesh.bind(skeleton);
  });
  let phase = 0,
    effort = 0;
  return {
    group,
    update(dt: number, speed: number, swimming: boolean, vertical: number) {
      effort = T.MathUtils.damp(effort, Math.min(speed / 2.2, 1), 7, dt);
      phase += dt * (swimming ? 3.8 : 5.2) * Math.max(0.15, effort);
      for (const l of limbs) {
        const wave = Math.sin(phase + (l.side < 0 ? Math.PI : 0));
        l.hip.rotation.x = wave * (swimming ? 0.3 : 0.4) * effort;
        l.knee.rotation.x = Math.max(0, -wave) * 0.32 * effort;
        l.foot.rotation.x = swimming ? -0.12 + wave * 0.12 * effort : 0;
        l.shoulder.rotation.z =
          -l.side * (swimming ? 1.14 + 0.09 * wave : 1.22);
        l.shoulder.rotation.x = swimming
          ? -0.12 + wave * 0.09 * effort
          : -wave * 0.22 * effort;
        l.elbow.rotation.z = -l.side * (swimming ? 0.25 : 0.08);
        l.wrist.rotation.x = swimming ? -0.08 : 0;
      }
      group.rotation.x = swimming
        ? -Math.PI / 2 + T.MathUtils.clamp(vertical * 0.22, -0.4, 0.4)
        : 0;
    },
    snapshot: () => ({
      phase: +phase.toFixed(3),
      effort: +effort.toFixed(3),
      leftKick: +limbs[0].hip.rotation.x.toFixed(3),
      rightKick: +limbs[1].hip.rotation.x.toFixed(3),
    }),
  };
}
