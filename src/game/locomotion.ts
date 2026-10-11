export const seabed = (_x: number, z: number) =>
  z > 4
    ? -0.15 + (z - 4) * 0.035
    : -(0.15 + Math.max(0, 4 - z) * 0.075 + Math.max(0, -z - 25) * 0.35);
export function shorePosition(depth: number) {
  return depth <= 2.325 ? 4 - (depth - 0.15) / 0.075 : -(depth + 8.3) / 0.425;
}
export type Swimmer = {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  heading: number;
  swimming: boolean;
};
export function swimmerAt(index: number, depth: number): Swimmer {
  const z = shorePosition(index < 3 ? depth : index === 3 ? 3 : depth + 5);
  return {
    x: 0,
    y: index < 3 ? seabed(0, z) : index === 3 ? -0.35 : -depth,
    z,
    vx: 0,
    vy: 0,
    vz: 0,
    heading: 0,
    swimming: index >= 3,
  };
}
export function swimStep(
  s: Swimmer,
  input: { x: number; z: number; y: number },
  dt: number,
  canDive: boolean,
  sub: boolean,
  ground = seabed,
  bounds = { minX: -245, maxX: 245, minZ: -Infinity, maxZ: Infinity },
) {
  const amount = Math.hypot(input.x, input.y, input.z),
    n = Math.max(1, amount),
    speed = sub ? 3.4 : 2.1;
  const blend = 1 - Math.exp(-dt * 4);
  s.vx += ((input.x / n) * speed - s.vx) * blend;
  s.vz += ((input.z / n) * speed - s.vz) * blend;
  s.vy += ((canDive ? (input.y / n) * speed : 0) - s.vy) * blend;
  const clearance = sub ? 1.8 : 0.7;
  const nextX = Math.max(
    bounds.minX + 2,
    Math.min(bounds.maxX - 2, s.x + s.vx * dt),
  );
  const nextZ = Math.max(
    bounds.minZ + 2,
    Math.min(bounds.maxZ - 2, s.z + s.vz * dt),
  );
  // Slide along walls instead of teleporting vertically onto the seabed.
  if (
    !canDive ||
    ground(nextX, s.z) + clearance <= s.y + Math.max(0, s.vy * dt)
  )
    s.x = nextX;
  else s.vx = 0;
  if (
    !canDive ||
    ground(s.x, nextZ) + clearance <= s.y + Math.max(0, s.vy * dt)
  )
    s.z = nextZ;
  else s.vz = 0;
  s.swimming = -ground(s.x, s.z) > 1.45;
  if (!s.swimming) {
    s.y = ground(s.x, s.z);
    s.vy = 0;
  } else if (!canDive) {
    s.y += (-0.35 - s.y) * (1 - Math.exp(-dt * 6));
    s.vy = 0;
  } else {
    s.y = Math.max(
      ground(s.x, s.z) + (sub ? 1.8 : 0.7),
      Math.min(-0.35, s.y + s.vy * dt),
    );
  }
  if (Math.hypot(s.vx, s.vz) > 0.05) {
    const target = Math.atan2(-s.vx, -s.vz);
    const delta = Math.atan2(
      Math.sin(target - s.heading),
      Math.cos(target - s.heading),
    );
    s.heading += delta * (1 - Math.exp(-dt * 6));
  }
  return s;
}
