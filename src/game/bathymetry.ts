import mariana from "./data/mariana.json";
export type DepthGrid = {
  bounds: { latMin: number; latMax: number; lonMin: number; lonMax: number };
  grid: { rows: number; cols: number };
  elevationsMeters: number[];
};
// Local equirectangular coordinates, metres at the grid's central latitude.
// North is -z. Triangular interpolation matches PlaneGeometry's diagonals exactly.
export function bathymetry(data: DepthGrid) {
  const {
    bounds: b,
    grid: { rows, cols },
    elevationsMeters: values,
  } = data;
  if (
    rows < 2 ||
    cols < 2 ||
    values.length !== rows * cols ||
    values.some((v) => !Number.isFinite(v)) ||
    b.latMax <= b.latMin ||
    b.lonMax <= b.lonMin
  )
    throw new Error("Invalid bathymetry grid");
  const width =
    (b.lonMax - b.lonMin) *
    111195 *
    Math.cos((((b.latMin + b.latMax) / 2) * Math.PI) / 180);
  const length = (b.latMax - b.latMin) * 111195;
  const point = (i: number) => ({
    x: ((i % cols) / (cols - 1)) * width - width / 2,
    z: (Math.floor(i / cols) / (rows - 1)) * length - length / 2,
    y: values[i],
  });
  const sample = (x: number, z: number) => {
    const u = Math.max(0, Math.min(cols - 1, (x / width + 0.5) * (cols - 1)));
    const v = Math.max(0, Math.min(rows - 1, (z / length + 0.5) * (rows - 1)));
    const c = Math.min(cols - 2, Math.floor(u)),
      r = Math.min(rows - 2, Math.floor(v));
    const a = values[r * cols + c],
      d = values[(r + 1) * cols + c + 1];
    const right = values[r * cols + c + 1],
      below = values[(r + 1) * cols + c];
    const fx = u - c,
      fz = v - r;
    return fx + fz <= 1
      ? a + (right - a) * fx + (below - a) * fz
      : d + (below - d) * (1 - fx) + (right - d) * (1 - fz);
  };
  const deepest = values.indexOf(Math.min(...values));
  let wall = deepest,
    steepest = 0;
  for (let r = 1; r < rows - 1; r++)
    for (let c = 1; c < cols - 1; c++) {
      const i = r * cols + c;
      const slope = Math.hypot(
        (values[i + 1] - values[i - 1]) / ((2 * width) / (cols - 1)),
        (values[i + cols] - values[i - cols]) / ((2 * length) / (rows - 1)),
      );
      if (slope > steepest) {
        wall = i;
        steepest = slope;
      }
    }
  return {
    width,
    length,
    rows,
    cols,
    sample,
    point,
    bounds: {
      minX: -width / 2,
      maxX: width / 2,
      minZ: -length / 2,
      maxZ: length / 2,
    },
    waypoints: [
      { name: "Trench wall", ...point(wall) },
      { name: "Deepest grid point", ...point(deepest) },
    ],
  };
}
export const marianaTerrain = bathymetry(mariana);
export const bathymetrySource = mariana.source;
