import * as T from "three";
// Seabed-mounted reading instruments: brushed housing, recessed illuminated face,
// bolts and an anchored base. These are optional stops, never progress gates.
export function questionStations(
  scene: T.Scene,
  ground: (x: number, z: number) => number,
  origin: { x: number; z: number },
  shallow: boolean,
) {
  const stations: T.Group[] = [];
  for (let n = 0; n < 3; n++) {
    const root = new T.Group();
    root.position.set(
      origin.x + (n - 1) * 5.5,
      0,
      origin.z - 6 - (n === 1 ? 3 : 0),
    );
    root.position.y = ground(root.position.x, root.position.z);
    const metal = new T.MeshStandardMaterial({
      color: "#697b7c",
      metalness: 0.72,
      roughness: 0.32,
    });
    const ceramic = new T.MeshStandardMaterial({
      color: "#d7d1b6",
      roughness: 0.6,
    });
    const add = (
      g: T.BufferGeometry,
      m: T.Material,
      x: number,
      y: number,
      z: number,
    ) => {
      const o = new T.Mesh(g, m);
      o.position.set(x, y, z);
      o.castShadow = true;
      o.receiveShadow = true;
      root.add(o);
      return o;
    };
    add(new T.CylinderGeometry(0.6, 0.8, 0.18, 32), metal, 0, 0.09, 0);
    const height = shallow ? Math.max(1, -root.position.y + 0.7) : 1.4;
    add(
      new T.CylinderGeometry(0.055, 0.08, height, 16),
      metal,
      0,
      height / 2,
      0,
    );
    root.userData.height = height;
    const face = new T.Group();
    face.position.y = height;
    face.rotation.x = -0.25;
    root.add(face);
    const housing = new T.Mesh(new T.BoxGeometry(1, 0.66, 0.12), ceramic);
    face.add(housing);
    const cv = document.createElement("canvas");
    cv.width = 512;
    cv.height = 320;
    const ctx = cv.getContext("2d")!;
    ctx.fillStyle = "#102d36";
    ctx.fillRect(0, 0, 512, 320);
    ctx.strokeStyle = "#7fb8ae";
    ctx.lineWidth = 2;
    ctx.strokeRect(20, 20, 472, 280);
    ctx.fillStyle = "#e5ede0";
    ctx.font = "32px Georgia";
    ctx.textAlign = "center";
    ctx.fillText("FIELD NOTES", 256, 96);
    ctx.font = "94px Georgia";
    ctx.fillText(String(n + 1).padStart(2, "0"), 256, 211);
    ctx.font = "22px sans-serif";
    ctx.fillStyle = "#a7cec5";
    ctx.fillText("Select to read", 256, 265);
    const tex = new T.CanvasTexture(cv);
    tex.colorSpace = T.SRGBColorSpace;
    const screen = new T.Mesh(
      new T.PlaneGeometry(0.9, 0.56),
      new T.MeshBasicMaterial({ map: tex }),
    );
    screen.position.z = 0.062;
    face.add(screen);
    for (const x of [-0.46, 0.46])
      for (const y of [-0.28, 0.28]) {
        const bolt = new T.Mesh(new T.SphereGeometry(0.018, 8, 6), metal);
        bolt.position.set(x, y, 0.065);
        face.add(bolt);
      }
    root.userData.questionStation = n;
    scene.add(root);
    stations.push(root);
  }
  return stations;
}
