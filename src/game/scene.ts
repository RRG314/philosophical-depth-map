import * as T from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { Sky } from "three/addons/objects/Sky.js";
import { Water } from "three/addons/objects/Water.js";
import { seabed, swimmerAt, swimStep } from "./locomotion";
import { populateModels, disposeObject, type AssetState } from "./models";
import { marianaTerrain } from "./bathymetry";
import { reefHabitat } from "./reefHabitat";
import { questionStations } from "./questionStations";
import { stations } from "./progression";
export type StationTarget = {
  index: number;
  x: number;
  y: number;
  visible: boolean;
};
export type SceneAPI = {
  overview: (enabled: boolean) => void;
  travel: (waypoint: number) => void;
  step: (ms: number) => void;
  snapshot: () => unknown;
  move: (x: number, z: number, y?: number) => void;
  reset: () => void;
  zoom: (value: number) => void;
  setMotion: (enabled: boolean) => void;
  dispose: () => void;
};
export function createExpeditionScene(
  canvas: HTMLCanvasElement,
  index: number,
  initialMotion: boolean,
  onLost: () => void,
  onAssets: (state: AssetState) => void,
  onTelemetry: (state: { depth: number; swimming: boolean }) => void,
  onQuestion: (n: number) => void,
  onTargets: (targets: StationTarget[]) => void = () => {},
): SceneAPI {
  let motion = initialMotion;
  let overview = false;
  const station = stations[index],
    shallow = index < 3,
    sub = index >= 6;
  const terrain = index === 8 ? marianaTerrain : null;
  const ground = terrain?.sample ?? seabed;
  const spawn = () => {
    const s = swimmerAt(index, station.meters);
    if (terrain)
      Object.assign(s, terrain.waypoints[1], { y: terrain.waypoints[1].y + 6 });
    return s;
  };
  const swimmer = spawn();
  const originZ = swimmer.z;
  const floorAtStart = ground(swimmer.x, originZ);
  const bounds = terrain?.bounds ?? {
    minX: -250,
    maxX: 250,
    minZ: originZ - 350,
    maxZ: originZ + 350,
  };
  const renderer = new T.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: false,
  });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = T.PCFShadowMap;
  renderer.outputColorSpace = T.SRGBColorSpace;
  renderer.toneMapping = T.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.7;
  const scene = new T.Scene();
  const pmrem = new T.PMREMGenerator(renderer);
  const room = new RoomEnvironment();
  const environment = pmrem.fromScene(room, 0.05, 0.1, 100, { size: 128 });
  room.dispose();
  pmrem.dispose();
  scene.environment = environment.texture;
  scene.environmentIntensity = sub ? 0.3 : 0.75;
  scene.background = new T.Color("#9ac7db");
  scene.fog = new T.FogExp2("#9ac7db", 0.004);
  const camera = new T.PerspectiveCamera(58, 1, 0.08, 1500);
  scene.add(
    new T.HemisphereLight(0xc5e4f2, 0x293529, index >= 6 ? 0.16 : 0.85),
  );
  const sun = new T.DirectionalLight(0xfff3d9, index >= 6 ? 0 : 2.5);
  sun.position.set(-20, swimmer.y + 35, originZ + 10);
  sun.target.position.set(0, swimmer.y, originZ);
  scene.add(sun.target);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  Object.assign(sun.shadow.camera, {
    left: -14,
    right: 14,
    top: 14,
    bottom: -14,
  });
  sun.shadow.bias = -0.001;
  scene.add(sun);
  const mat = (color: T.ColorRepresentation, metalness = 0, roughness = 0.65) =>
    new T.MeshStandardMaterial({ color, metalness, roughness });
  const sand = mat(index < 6 ? 0xc1b494 : 0x77716a);
  const mesh = (
    g: T.BufferGeometry,
    m: T.Material,
    parent: T.Object3D,
    x = 0,
    y = 0,
    z = 0,
  ) => {
    const o = new T.Mesh(g, m);
    o.position.set(x, y, z);
    o.castShadow = true;
    o.receiveShadow = true;
    parent.add(o);
    return o;
  };
  const sky = new Sky();
  sky.scale.setScalar(1200);
  scene.add(sky);
  sky.material.uniforms.turbidity.value = 3;
  sky.material.uniforms.rayleigh.value = 1.4;
  sky.material.uniforms.sunPosition.value.set(-0.4, 0.6, -0.7).normalize();
  const floorGeo = new T.PlaneGeometry(
    terrain?.width ?? 500,
    terrain?.length ?? 700,
    terrain ? terrain.cols - 1 : 120,
    terrain ? terrain.rows - 1 : 150,
  );
  floorGeo.rotateX(-Math.PI / 2);
  const fp = floorGeo.attributes.position;
  for (let i = 0; i < fp.count; i++) {
    const x = fp.getX(i),
      z = fp.getZ(i) + (terrain ? 0 : originZ);
    fp.setXYZ(i, x, ground(x, z), z);
  }
  floorGeo.computeVertexNormals();
  const floorMesh = mesh(floorGeo, sand, scene);
  floorMesh.castShadow = false;
  const surveyMaterial = new T.MeshStandardMaterial({
    color: 0x739aa6,
    roughness: 0.9,
    flatShading: true,
  });
  const surveyLight = new T.DirectionalLight(0xffffff, 2.5);
  surveyLight.position.set(-20000, 50000, 20000);
  surveyLight.visible = false;
  scene.add(surveyLight);
  sand.onBeforeCompile = (shader) => {
    shader.uniforms.oceanTime = { value: 0 };
    shader.vertexShader =
      "varying vec3 floorPoint;\n" +
      shader.vertexShader.replace(
        "#include <begin_vertex>",
        "#include <begin_vertex>\nfloorPoint=position;",
      );
    shader.fragmentShader =
      "varying vec3 floorPoint;\n" +
      shader.fragmentShader.replace(
        "#include <color_fragment>",
        `#include <color_fragment>
      float grain=fract(sin(dot(floorPoint.xz,vec2(12.9898,78.233)))*43758.5453);
      float ridges=sin(floorPoint.x*15.0+sin(floorPoint.z*1.8)*2.0);
      diffuseColor.rgb *= .86 + .12*grain + .035*ridges;
      if(floorPoint.y>0.0) diffuseColor.rgb*=1.12;`,
      );
  };
  const normals = new Uint8Array(128 * 128 * 4);
  for (let y = 0; y < 128; y++)
    for (let x = 0; x < 128; x++) {
      const i = (y * 128 + x) * 4;
      normals[i] =
        128 +
        Math.round(22 * Math.sin(x * 0.4 + y * 0.24) + 12 * Math.cos(y * 0.7));
      normals[i + 1] = 128 + Math.round(22 * Math.cos(y * 0.33 + x * 0.21));
      normals[i + 2] = 230;
      normals[i + 3] = 255;
    }
  const normalMap = new T.DataTexture(normals, 128, 128);
  normalMap.wrapS = normalMap.wrapT = T.RepeatWrapping;
  normalMap.magFilter = T.LinearFilter;
  normalMap.minFilter = T.LinearMipmapLinearFilter;
  normalMap.generateMipmaps = true;
  normalMap.needsUpdate = true;
  const water = new Water(new T.PlaneGeometry(2000, 2000), {
    textureWidth: 512,
    textureHeight: 512,
    waterNormals: normalMap,
    sunDirection: new T.Vector3(-0.4, 0.6, -0.7),
    sunColor: 0xfff4de,
    waterColor: 0x166e76,
    distortionScale: 0.45,
    alpha: 0.66,
    fog: true,
  });
  water.material.uniforms.size.value = 8;
  // Approximate colour absorption in the reflected path; the surface shader
  // alone otherwise reads as a silver mirror in this bright coastal sky.
  water.material.fragmentShader = water.material.fragmentShader.replace(
    "vec3 outgoingLight = albedo;",
    "vec3 outgoingLight = albedo * vec3(0.42, 0.76, 0.83);",
  );
  water.rotation.x = -Math.PI / 2;
  water.position.z = originZ;
  water.material.transparent = true;
  scene.add(water);
  const underwaterSurface = new T.Mesh(
    new T.PlaneGeometry(2000, 2000),
    new T.MeshBasicMaterial({
      color: 0x54afaf,
      side: T.DoubleSide,
      transparent: true,
      opacity: 0.24,
    }),
  );
  underwaterSurface.rotation.x = -Math.PI / 2;
  underwaterSurface.position.z = originZ;
  scene.add(underwaterSurface);
  const rand = (n: number) => {
    const v = Math.sin(n * 127.1 + index * 43.7) * 43758.5453;
    return v - Math.floor(v);
  };
  const avatar = new T.Group();
  scene.add(avatar);
  avatar.position.set(swimmer.x, swimmer.y, swimmer.z);
  const habitat = new T.Scene();
  habitat.position.set(swimmer.x, floorAtStart, originZ);
  scene.add(habitat);
  let dirty = true;
  const models = populateModels(
    habitat,
    avatar,
    index,
    0,
    (state) => {
      dirty = true;
      onAssets(state);
    },
    ground,
  );
  reefHabitat(scene, ground, swimmer, index);
  let markers = questionStations(scene, ground, swimmer, shallow);
  if (sub) {
    const deckLight = new T.PointLight(0xc2deed, 18, 8, 1);
    deckLight.position.set(0, 2, 2);
    avatar.add(deckLight);
    for (const x of [-1, 1]) {
      const light = new T.SpotLight(0xdceeff, 500, 110, 0.8, 0.65, 1);
      light.position.set(x * 0.7, 0, -1);
      light.target.position.set(x * 2, -1, -9);
      avatar.add(light, light.target);
    }
  }
  if (shallow) {
    const ripple = mesh(
      new T.TorusGeometry(0.5, 0.018, 6, 48),
      new T.MeshBasicMaterial({
        color: 0xd8ffff,
        transparent: true,
        opacity: 0.5,
      }),
      avatar,
      0,
      -swimmer.y,
      0,
    );
    ripple.rotation.x = Math.PI / 2;
    ripple.castShadow = false;
  }
  // Suspended marine snow and shafts make the water column visible without remote textures.
  const dustGeo = new T.BufferGeometry();
  const dust = new Float32Array(240 * 3);
  for (let i = 0; i < 240; i++) {
    dust[i * 3] = (rand(i + 600) - 0.5) * 38;
    dust[i * 3 + 1] = rand(i + 900) * 14;
    dust[i * 3 + 2] = (rand(i + 1200) - 0.5) * 38;
  }
  dustGeo.setAttribute("position", new T.BufferAttribute(dust, 3));
  const particles = new T.Points(
    dustGeo,
    new T.PointsMaterial({
      color: 0xaeeaf0,
      size: 0.035,
      transparent: true,
      opacity: shallow ? 0.15 : 0.45,
      depthWrite: false,
    }),
  );
  particles.position.set(0, floorAtStart, originZ);
  scene.add(particles);
  let elapsed = 0,
    frame = 0,
    previous = 0,
    disposed = false,
    manualUntil = 0,
    lastTelemetry = -1;
  const keys = new Set<string>();
  const input = { x: 0, z: 0, y: 0 };
  let yaw = 0.25,
    pitch = index >= 3 && index <= 5 ? 0.42 : 0.15;
  let drag: { x: number; y: number } | null = null;
  function resize() {
    const r = canvas.getBoundingClientRect();
    renderer.setSize(r.width, r.height, false);
    camera.aspect = r.width / r.height;
    camera.updateProjectionMatrix();
    draw();
  }
  function stationTargets(): StationTarget[] {
    camera.updateMatrixWorld();
    return markers.map((marker, index) => {
      const point = marker.position.clone();
      point.y += Number(marker.userData.height) + 0.8;
      const projected = point.clone().project(camera);
      return {
        index,
        x: (projected.x + 1) / 2,
        y: (1 - projected.y) / 2,
        visible:
          !overview &&
          projected.z > -1 &&
          projected.z < 1 &&
          Math.abs(projected.x) < 0.92 &&
          Math.abs(projected.y) < 0.85,
      };
    });
  }
  function draw() {
    if (overview && terrain) {
      floorMesh.material = surveyMaterial;
      surveyLight.visible = true;
      camera.far = 200000;
      camera.updateProjectionMatrix();
      camera.position.set(terrain.width * 0.32, 46000, terrain.length * 0.63);
      camera.lookAt(0, -8500, 0);
      scene.background = new T.Color(0x122b38);
      scene.fog = null;
      sky.visible = false;
      water.visible = false;
      underwaterSurface.visible = false;
      renderer.render(scene, camera);
      onTargets(
        markers.map((_, index) => ({ index, x: 0, y: 0, visible: false })),
      );
      return;
    }
    floorMesh.material = sand;
    surveyLight.visible = false;
    camera.far = 1500;
    camera.updateProjectionMatrix();
    const aim = new T.Vector3(
      avatar.position.x,
      avatar.position.y + (swimmer.swimming ? 0.15 : 1.2),
      avatar.position.z - 0.5,
    );
    const distance = sub ? 7 : 5;
    camera.position
      .copy(aim)
      .add(
        new T.Vector3(
          Math.sin(yaw) * distance,
          1.0 + Math.sin(pitch) * distance,
          Math.cos(yaw) * distance,
        ),
      );
    camera.position.y = Math.max(
      camera.position.y,
      ground(camera.position.x, camera.position.z) + 0.4,
    );
    camera.lookAt(aim);
    const under = camera.position.y < -0.1;
    sky.visible = !under;
    water.visible = !under;
    underwaterSurface.visible = under;
    scene.background = new T.Color(
      under ? (index >= 6 ? 0x020d16 : 0x0b4859) : 0x9ac7db,
    );
    scene.fog = new T.FogExp2(
      under ? (index >= 6 ? 0x020d16 : 0x0b4859) : 0x9ac7db,
      under ? (index >= 6 ? 0.012 : 0.022) : 0.0035,
    );
    renderer.render(scene, camera);
    onTargets(stationTargets());
  }
  function step(ms: number, render = true) {
    if (disposed) return;
    const dt = Math.min(Math.max(ms, 0), 1000) / 1000;
    elapsed += dt;
    const ix =
      input.x +
      Number(keys.has("ArrowRight") || keys.has("KeyD")) -
      Number(keys.has("ArrowLeft") || keys.has("KeyA"));
    const iz =
      input.z +
      Number(keys.has("ArrowDown") || keys.has("KeyS")) -
      Number(keys.has("ArrowUp") || keys.has("KeyW"));
    const iy = input.y + Number(keys.has("KeyE")) - Number(keys.has("KeyQ"));
    if (!overview)
      swimStep(
        swimmer,
        {
          x: ix * Math.cos(yaw) + iz * Math.sin(yaw),
          z: -ix * Math.sin(yaw) + iz * Math.cos(yaw),
          y: iy,
        },
        dt,
        index >= 4,
        sub,
        ground,
        bounds,
      );
    avatar.position.set(swimmer.x, swimmer.y, swimmer.z);
    avatar.rotation.y = swimmer.heading;
    const speed = Math.hypot(swimmer.vx, swimmer.vy, swimmer.vz);
    models.animatePlayer(dt, speed, swimmer.swimming, swimmer.vy);
    if (elapsed - lastTelemetry > 0.25) {
      lastTelemetry = elapsed;
      onTelemetry({
        depth: Math.max(0, -swimmer.y),
        swimming: swimmer.swimming,
      });
    }
    if (motion) water.material.uniforms.time.value = elapsed * 0.45;
    models.step(dt, elapsed, motion);
    particles.rotation.y = motion ? elapsed * 0.003 : 0;
    if (render) draw();
  }
  let inView = true;
  const visibility = new IntersectionObserver(([entry]) => {
    inView = entry.isIntersecting;
  });
  visibility.observe(canvas);
  function tick(t: number) {
    if (disposed) return;
    if (
      t > manualUntil &&
      !document.hidden &&
      inView &&
      !canvas.parentElement?.querySelector("dialog[open]") &&
      t - previous >= 33 &&
      (motion ||
        dirty ||
        keys.size ||
        input.x ||
        input.z ||
        input.y ||
        Math.hypot(swimmer.vx, swimmer.vy, swimmer.vz) > 0.005)
    ) {
      step(previous ? Math.min(t - previous, 50) : 16);
      previous = t;
      dirty = false;
    }
    frame = requestAnimationFrame(tick);
  }
  function down(e: KeyboardEvent) {
    if (
      [
        "ArrowUp",
        "ArrowDown",
        "ArrowLeft",
        "ArrowRight",
        "KeyW",
        "KeyA",
        "KeyS",
        "KeyD",
        "KeyE",
        "KeyQ",
      ].includes(e.code)
    ) {
      e.preventDefault();
      keys.add(e.code);
    }
    if (e.code === "KeyF") {
      e.preventDefault();
      if (document.fullscreenElement) void document.exitFullscreen();
      else void canvas.parentElement?.requestFullscreen?.().catch(() => {});
    }
  }
  function up(e: KeyboardEvent) {
    keys.delete(e.code);
  }
  function clear() {
    keys.clear();
    input.x = 0;
    input.z = 0;
    input.y = 0;
  }
  let pointerStart: { x: number; y: number } | null = null;
  function click(e: PointerEvent) {
    canvas.focus();
    drag = { x: e.clientX, y: e.clientY };
    canvas.setPointerCapture(e.pointerId);
    pointerStart = { x: e.clientX, y: e.clientY };
  }
  function pick(e: PointerEvent) {
    const rect = canvas.getBoundingClientRect();
    const ray = new T.Raycaster();
    ray.setFromCamera(
      new T.Vector2(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        1 - ((e.clientY - rect.top) / rect.height) * 2,
      ),
      camera,
    );
    const hit = ray.intersectObjects(markers, true)[0];
    if (!hit) return null;
    let o: T.Object3D | null = hit.object;
    while (o && o.userData.questionStation === undefined) o = o.parent;
    return o ? Number(o.userData.questionStation) : null;
  }

  function look(e: PointerEvent) {
    if (!drag) {
      canvas.style.cursor = pick(e) === null ? "grab" : "pointer";
      return;
    }
    yaw -= (e.clientX - drag.x) * 0.005;
    pitch = T.MathUtils.clamp(pitch + (e.clientY - drag.y) * 0.004, -0.6, 0.8);
    drag = { x: e.clientX, y: e.clientY };
    dirty = true;
  }
  function stopLook(e: PointerEvent) {
    if (
      e.type === "pointerup" &&
      pointerStart &&
      Math.hypot(e.clientX - pointerStart.x, e.clientY - pointerStart.y) < 6
    ) {
      const station = pick(e);
      if (station !== null) onQuestion(station);
    }
    drag = null;
    pointerStart = null;
  }
  canvas.addEventListener("pointermove", look);
  canvas.addEventListener("pointerup", stopLook);
  canvas.addEventListener("pointercancel", stopLook);
  canvas.addEventListener("keydown", down);
  window.addEventListener("keyup", up);
  canvas.addEventListener("blur", clear);
  canvas.addEventListener("pointerdown", click);
  canvas.addEventListener("webglcontextlost", onLost);
  const observer = new ResizeObserver(resize);
  observer.observe(canvas);
  resize();
  step(0);
  frame = requestAnimationFrame(tick);
  return {
    overview(enabled) {
      overview = enabled;
      dirty = true;
      draw();
    },
    travel(n) {
      if (!terrain || !terrain.waypoints[n]) return;
      overview = false;
      const p = terrain.waypoints[n];
      Object.assign(swimmer, {
        x: p.x,
        y: p.y + 6,
        z: p.z,
        vx: 0,
        vy: 0,
        vz: 0,
      });
      markers.forEach((m) => {
        scene.remove(m);
        disposeObject(m);
      });
      markers = questionStations(scene, ground, swimmer, false);
      particles.position.set(p.x, p.y, p.z);
      lastTelemetry = -1;
      step(0);
    },
    setMotion(enabled) {
      motion = enabled;
      dirty = true;
    },
    step(ms) {
      manualUntil = performance.now() + 200;
      if (!Number.isFinite(ms) || ms < 0) return;
      for (
        let remaining = Math.min(ms, 60000);
        remaining > 0;
        remaining -= 1000 / 60
      )
        step(Math.min(remaining, 1000 / 60), false);
      draw();
    },
    move(x, z, y = 0) {
      input.y = y;
      input.x = x;
      input.z = z;
    },
    zoom(value) {
      camera.zoom = T.MathUtils.clamp(value, 1, 2);
      camera.updateProjectionMatrix();
      draw();
    },
    reset() {
      yaw = 0.25;
      pitch = index >= 3 && index <= 5 ? 0.42 : 0.15;
      Object.assign(swimmer, spawn());
      avatar.position.set(swimmer.x, swimmer.y, swimmer.z);
      clear();
      lastTelemetry = -1;
      step(0);
    },
    snapshot() {
      return {
        renderer: "three-webgl",
        station: index,
        depth: station.depth,
        overview,
        terrain: terrain
          ? "GEBCO 2020 Mariana; metres, no vertical exaggeration"
          : "Authored coastal habitat",
        seafloor: ground(swimmer.x, swimmer.z),
        questionStations: markers.length,
        stationTargets: stationTargets(),
        cameraZoom: camera.zoom,
        equipment: station.gear,
        assets: models.state,
        locomotion: {
          swimming: swimmer.swimming,
          velocity: [swimmer.vx, swimmer.vy, swimmer.vz],
          pose: models.playerPose(),
        },
        cameraUnderwater: camera.position.y < -0.1,
        wildlife: models.animals
          .filter((a) => a.species !== "player")
          .map((a) => a.species),
        player: {
          x: +avatar.position.x.toFixed(3),
          y: +avatar.position.y.toFixed(3),
          z: +avatar.position.z.toFixed(3),
        },
        waterDepth: Math.max(0, -swimmer.y),
        coordinates:
          "meters; sea level y=0, +y up, +z toward shore; movement is camera-relative",
        elapsedSeconds: +elapsed.toFixed(3),
        drawCalls: renderer.info.render.calls,
        triangles: renderer.info.render.triangles,
      };
    },
    dispose() {
      disposed = true;
      cancelAnimationFrame(frame);
      observer.disconnect();
      visibility.disconnect();
      canvas.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      canvas.removeEventListener("blur", clear);
      canvas.removeEventListener("pointerdown", click);
      canvas.removeEventListener("webglcontextlost", onLost);
      canvas.removeEventListener("pointermove", look);
      canvas.removeEventListener("pointerup", stopLook);
      canvas.removeEventListener("pointercancel", stopLook);
      normalMap.dispose();
      environment.dispose();
      surveyMaterial.dispose();
      models.dispose();
      disposeObject(scene);
      scene.traverse((o) => {
        if (o instanceof T.Sprite) {
          o.material.map?.dispose();
          o.material.dispose();
        }
      });
      particles.geometry.dispose();
      particles.material.dispose();
      renderer.dispose();
    },
  };
}
