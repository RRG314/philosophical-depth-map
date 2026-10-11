import * as T from "three";
import { seabed } from "./locomotion";
import { rigDiver } from "./diverRig";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { clone } from "three/addons/utils/SkeletonUtils.js";
export type Animal = {
  root: T.Group;
  mixer: T.AnimationMixer | null;
  species: string;
  phase: number;
  radius: number;
  height: number;
  speed: number;
};
export type AssetState = {
  loaded: string[];
  failed: string[];
  pending: number;
};
export function disposeObject(root: T.Object3D) {
  const gs = new Set<T.BufferGeometry>(),
    ms = new Set<T.Material>(),
    ts = new Set<T.Texture>();
  root.traverse((o) => {
    if (o instanceof T.Mesh) {
      gs.add(o.geometry);
      for (const m of Array.isArray(o.material) ? o.material : [o.material]) {
        ms.add(m);
        for (const value of Object.values(m))
          if (value instanceof T.Texture) ts.add(value);
      }
      if (o instanceof T.SkinnedMesh) o.skeleton.boneTexture?.dispose();
    }
  });
  gs.forEach((g) => g.dispose());
  ms.forEach((m) => m.dispose());
  ts.forEach((t) => t.dispose());
}
export function populateModels(
  scene: T.Scene,
  avatar: T.Group,
  index: number,
  waterLevel: number,
  onChange: (s: AssetState) => void,
  ground = seabed,
) {
  const loader = new GLTFLoader(),
    animals: Animal[] = [],
    roots: T.Group[] = [],
    state: AssetState = { loaded: [], failed: [], pending: 0 };
  let disposed = false;
  let diver: ReturnType<typeof rigDiver> | null = null;
  const update = () =>
    onChange({
      ...state,
      loaded: [...state.loaded],
      failed: [...state.failed],
    });
  function configure(root: T.Object3D) {
    root.traverse((o) => {
      if (o instanceof T.Mesh) {
        o.castShadow = true;
        o.receiveShadow = true;
        for (const m of Array.isArray(o.material) ? o.material : [o.material]) {
          if (m instanceof T.MeshStandardMaterial) m.envMapIntensity = 0.55;
        }
      }
    });
  }
  function normalized(root: T.Group, length: number, ground = false) {
    root.updateMatrixWorld(true);
    const box = new T.Box3().setFromObject(root, true),
      size = box.getSize(new T.Vector3()),
      center = box.getCenter(new T.Vector3());
    const scale = length / Math.max(size.x, size.y, size.z, 0.001);
    const wrapper = new T.Group();
    root.position.sub(center);
    if (ground) root.position.y += size.y / 2;
    wrapper.add(root);
    wrapper.scale.setScalar(scale);
    wrapper.userData.baseScale = scale;
    return wrapper;
  }
  function load(
    id: string,
    attach: (root: T.Group, animations: T.AnimationClip[]) => void,
  ) {
    state.pending++;
    update();
    loader
      .loadAsync(`${import.meta.env.BASE_URL}assets/ocean/${id}.glb`)
      .then((g) => {
        if (disposed) {
          disposeObject(g.scene);
          return;
        }
        g.scene.userData.assetId = id;
        configure(g.scene);
        if (!["diver", "submersible"].includes(id))
          g.scene.traverse((o) => {
            if (o instanceof T.Mesh) o.castShadow = false;
          });
        roots.push(g.scene);
        attach(g.scene, g.animations);
        state.loaded.push(id);
      })
      .catch(() => {
        if (!disposed) state.failed.push(id);
      })
      .finally(() => {
        if (!disposed) {
          state.pending--;
          update();
        }
      });
  }
  load(index >= 6 ? "submersible" : "diver", (root, clips) => {
    if (index < 4)
      root.traverse((o) => {
        if (o instanceof T.Mesh) {
          const names = (
            Array.isArray(o.material) ? o.material : [o.material]
          ).map((m) => m.name);
          // The source shares materials between skin, fins and regulator details.
          // Named source meshes let wading/snorkeling omit scuba equipment.
          if (
            names.includes("Diver_Objects") ||
            o.name === "Object_3" ||
            o.name === "Object_9" ||
            (index < 3 &&
              (names.includes("Diving_Mask") || o.name === "Object_4"))
          )
            o.visible = false;
        }
      });
    let wrapper: T.Group;
    if (index < 6) {
      diver = rigDiver(root);
      wrapper = diver.group;
      wrapper.rotation.y = Math.PI;
      diver.update(0, 0, index >= 3, 0);
    } else wrapper = normalized(root, 3.2);
    if (index < 3)
      root.traverse((o) => {
        if (o instanceof T.Mesh)
          for (const material of Array.isArray(o.material)
            ? o.material
            : [o.material]) {
            material.onBeforeCompile = (
              shader: T.WebGLProgramParametersWithUniforms,
            ) => {
              shader.uniforms.waterLevel = { value: waterLevel };
              shader.vertexShader =
                "varying float oceanWorldY;\n" +
                shader.vertexShader.replace(
                  "#include <project_vertex>",
                  "oceanWorldY=(modelMatrix*vec4(transformed,1.0)).y;\n#include <project_vertex>",
                );
              shader.fragmentShader =
                "uniform float waterLevel; varying float oceanWorldY;\n" +
                shader.fragmentShader.replace(
                  "#include <color_fragment>",
                  "#include <color_fragment>\nif(oceanWorldY<waterLevel)diffuseColor.rgb=mix(diffuseColor.rgb,vec3(0.025,0.3,0.34),0.65);",
                );
            };
          }
      });
    avatar.add(wrapper);
    if (clips.length) {
      const mixer = new T.AnimationMixer(root);
      mixer.clipAction(clips[0]).play();
      animals.push({
        root: wrapper,
        mixer,
        species: "player",
        phase: 0,
        radius: 0,
        height: 0,
        speed: 0,
      });
    }
  });
  function fauna(
    id: string,
    count: number,
    length: number,
    height: number,
    radius: number,
    speed: number,
  ) {
    load(id, (root, clips) => {
      for (let i = 0; i < count; i++) {
        const object = i ? (clone(root) as T.Group) : root;
        const wrapper = normalized(object, length * (0.85 + (i % 3) * 0.1));
        scene.add(wrapper);
        const mixer = clips.length ? new T.AnimationMixer(object) : null;
        if (mixer) {
          mixer.clipAction(clips[0]).play();
          mixer.setTime(i * 0.71);
        }
        animals.push({
          root: wrapper,
          mixer,
          species: id,
          phase: Math.floor(i / 7) * 2.399 + (i % 7) * 0.085 + index,
          radius: radius + Math.floor(i / 7) * 3.5 + (i % 3) * 0.35,
          height: height + (i % 3) * 0.16,
          speed,
        });
      }
    });
  }
  if (index >= 2 && index <= 5)
    load("reef", (root) => {
      const placements =
        index < 3
          ? [[-7, -8, 7]]
          : [
              [-13, 2, 15],
              [14, -2, 16],
              [-14, -17, 19],
              [17, -20, 21],
              [-25, -8, 18],
              [29, -12, 22],
              [-21, -37, 23],
              [24, -42, 23],
              [-40, -28, 26],
              [41, -35, 26],
            ];
      const template = clone(root) as T.Group;
      placements.forEach(([x, z, size], i) => {
        const patch = normalized(
          i ? (clone(template) as T.Group) : root,
          size,
          true,
        );
        patch.position.set(x, -0.65, z);
        patch.rotation.y = i * 1.7;
        scene.add(patch);
        scene.updateMatrixWorld(true);
        const bounds = new T.Box3().setFromObject(patch, true);
        patch.traverse((o) => {
          if (!(o instanceof T.Mesh)) return;
          const geometry = o.geometry.clone();
          o.geometry = geometry;
          const p = geometry.attributes.position,
            inverse = o.matrixWorld.clone().invert(),
            v = new T.Vector3();
          for (let n = 0; n < p.count; n++) {
            v.fromBufferAttribute(p, n).applyMatrix4(o.matrixWorld);
            v.y += ground(v.x, v.z) - scene.position.y;
            v.applyMatrix4(inverse);
            p.setXYZ(n, v.x, v.y, v.z);
          }
          geometry.computeVertexNormals();
          geometry.computeBoundingBox();
          geometry.computeBoundingSphere();
          const mats = (
            Array.isArray(o.material) ? o.material : [o.material]
          ).map((m) => {
            const material = m.clone();
            if (material instanceof T.MeshStandardMaterial)
              material.color.multiply(new T.Color(1, 0.82, 0.7));
            return material;
          });
          o.material = mats.length === 1 ? mats[0] : mats;
          mats.forEach((m) => {
            m.onBeforeCompile = (
              shader: T.WebGLProgramParametersWithUniforms,
            ) => {
              shader.uniforms.reefMin = { value: bounds.min };
              shader.uniforms.reefMax = { value: bounds.max };
              shader.vertexShader =
                "varying vec3 reefPoint;\n" +
                shader.vertexShader.replace(
                  "#include <project_vertex>",
                  "reefPoint=(modelMatrix*vec4(transformed,1.0)).xyz;\n#include <project_vertex>",
                );
              shader.fragmentShader =
                "varying vec3 reefPoint;uniform vec3 reefMin;uniform vec3 reefMax;\n" +
                shader.fragmentShader.replace(
                  "#include <color_fragment>",
                  `#include <color_fragment>
              float edge=min(min(reefPoint.x-reefMin.x,reefMax.x-reefPoint.x),min(reefPoint.z-reefMin.z,reefMax.z-reefPoint.z));
              float blend=smoothstep(0.0,1.5,edge);
              diffuseColor.rgb=mix(vec3(.53,.46,.33),diffuseColor.rgb,blend);`,
                );
            };
          });
        });
      });
    });
  if (index >= 2 && index <= 5)
    load("soft-corals", (root) => {
      root.updateMatrixWorld(true);
      let variant = 0;
      root.traverse((source) => {
        if (!(source instanceof T.Mesh)) return;
        const geometry = source.geometry
          .clone()
          .applyMatrix4(source.matrixWorld);
        geometry.computeBoundingBox();
        const box = geometry.boundingBox!,
          size = box.getSize(new T.Vector3()),
          center = box.getCenter(new T.Vector3());
        geometry.translate(-center.x, -box.min.y, -center.z);
        geometry.scale(
          1 / Math.max(size.x, size.y, size.z),
          1 / Math.max(size.x, size.y, size.z),
          1 / Math.max(size.x, size.y, size.z),
        );
        const count = index === 2 ? 3 : 12;
        const colony = new T.InstancedMesh(geometry, source.material, count);
        colony.receiveShadow = true;
        const transform = new T.Object3D();
        for (let n = 0; n < count; n++) {
          const seed = variant * 43.71 + n * 127.13;
          const noise = (offset: number) => {
            const v = Math.sin(seed + offset) * 43758.5453;
            return v - Math.floor(v);
          };
          const x = (n % 2 ? -1 : 1) * (7.5 + noise(1) * 28);
          const z = 8 - noise(2) * 65;
          transform.position.set(
            x,
            ground(x + scene.position.x, z + scene.position.z) -
              scene.position.y -
              0.04,
            z,
          );
          transform.rotation.set(0, noise(3) * Math.PI * 2, 0);
          transform.scale.setScalar((index === 2 ? 0.3 : 0.6) + noise(4) * 1.2);
          transform.updateMatrix();
          colony.setMatrixAt(n, transform.matrix);
        }
        scene.add(colony);
        variant++;
      });
    });
  if (index === 6) fauna("sperm-whale", 1, 9, 5.5, 10, 0.02);
  if (index === 7) fauna("octopus", 3, 0.9, 1.3, 6, 0.04);
  if (index === 6 || index === 7) fauna("anglerfish", 2, 1.15, 2.8, 6, 0.07);
  if (index >= 1 && index <= 5)
    fauna(
      "fish",
      index < 2 ? 8 : 42,
      index < 3 ? 0.16 : 0.42,
      index < 3 ? [0, 0.25, 0.6][index] : 1.5,
      5.2,
      0.17,
    );
  if (index === 3 || index === 4) {
    fauna("shark", 1, 2.5, 1.25, 8, 0.09);
    fauna("squid", 2, 0.55, 0.5, 6, 0.1);
  }
  if (index === 3 || index === 5 || index === 6)
    fauna("jellyfish", 3, 1.1, index === 3 ? 1 : 3.4, 6.5, 0.035);
  if (index === 5) fauna("whale", 1, 10, 5.5, 14, 0.025);
  return {
    state,
    animatePlayer(
      dt: number,
      speed: number,
      swimming: boolean,
      vertical: number,
    ) {
      diver?.update(dt, speed, swimming, vertical);
    },
    playerPose() {
      return diver?.snapshot() ?? null;
    },
    bounds() {
      return roots.map((root) => ({
        id: root.userData.assetId,
        min: new T.Box3().setFromObject(root, true).min.toArray(),
        max: new T.Box3().setFromObject(root, true).max.toArray(),
      }));
    },
    animals,
    load,
    fauna,
    step(dt: number, time: number, motion: boolean) {
      for (const a of animals) {
        if (a.species === "player") {
          if (motion) a.mixer?.update(dt);
          continue;
        }
        const t = (motion ? time : 0) * a.speed + a.phase;
        a.root.position.set(
          Math.sin(t) * a.radius,
          a.height + (motion ? Math.sin(t * 3) * 0.13 : 0),
          Math.cos(t) * a.radius - 3,
        );
        // Keep animals above the same seabed used by swimming collision.
        const worldX = a.root.position.x + scene.position.x;
        const worldZ = a.root.position.z + scene.position.z;
        a.root.position.y = Math.min(
          -scene.position.y - 0.18,
          Math.max(
            a.root.position.y,
            ground(worldX, worldZ) - scene.position.y + 0.45,
          ),
        );
        a.root.rotation.y = -t + Math.PI / 2;
        if (motion) {
          a.mixer?.update(dt);
          if (a.species === "jellyfish")
            a.root.scale.y =
              a.root.userData.baseScale *
              (1 + Math.sin(time * 2 + a.phase) * 0.035);
        }
      }
    },
    dispose() {
      disposed = true;
      animals.forEach((a) => {
        a.mixer?.stopAllAction();
        if (a.mixer) a.mixer.uncacheRoot(a.mixer.getRoot());
      });
      roots.forEach(disposeObject);
    },
  };
}
