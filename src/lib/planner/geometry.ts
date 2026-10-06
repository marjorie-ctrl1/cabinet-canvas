import type { Cabinet, Organizer, Placement, Space } from "./types";

/** panel thickness of the cabinet carcass, in cm */
export const WALL = 1.8;

export type Box = {
  x0: number;
  x1: number;
  y0: number;
  y1: number;
  z0: number;
  z1: number;
};

export const openingOf = (c: Cabinet) => c.opening ?? "front";

/** wall thickness on each side (0 on the open side) */
export function wallsOf(c: Cabinet) {
  const o = openingOf(c);
  return {
    left: o === "left" ? 0 : WALL,
    right: o === "right" ? 0 : WALL,
    bottom: o === "bottom" ? 0 : WALL,
    top: o === "top" ? 0 : WALL,
    back: WALL,
    front: o === "front" ? 0 : WALL,
  };
}

/** entered W × D × H ARE the usable interior; walls are drawn outside it, never subtracted */
export function interiorOf(c: Cabinet) {
  return { w: Math.max(1, c.w), h: Math.max(1, c.h), d: Math.max(1, c.d) };
}

/** outer carcass size = interior + wall panels */
export function outerOf(c: Cabinet) {
  const k = wallsOf(c);
  return { w: c.w + k.left + k.right, h: c.h + k.bottom + k.top, d: c.d + k.back + k.front };
}

export type Gaps = { left: number; right: number; back: number; front: number; bottom: number; top: number };

/** unused space between the placed boxes and each inner wall, in space cm (same coords as placement) */
export function gapsOf(boxes: Box[], space: Space): Gaps | null {
  if (boxes.length === 0) return null;
  const min = (f: (b: Box) => number) => Math.min(...boxes.map(f));
  const max = (f: (b: Box) => number) => Math.max(...boxes.map(f));
  return {
    left: round1(min((b) => b.x0)),
    right: round1(space.w - max((b) => b.x1)),
    back: round1(min((b) => b.z0)),
    front: round1(space.d - max((b) => b.z1)),
    bottom: round1(min((b) => b.y0)),
    top: round1(space.h - max((b) => b.y1)),
  };
}

export function mainSpace(c: Cabinet): Space {
  const i = interiorOf(c);
  const k = wallsOf(c);
  const s = c.spaces[0];
  const off = { x: 0, y: 0, z: 0 };
  // always size the main space to the real inner wall surfaces
  return s
    ? { ...s, ...off, w: i.w, d: i.d, h: i.h }
    : { id: `${c.id}-main`, name: "Main interior", ...off, w: i.w, d: i.d, h: i.h };
}

/** keep a footprint's outer edges inside the inner wall surfaces */
export function clampToWalls(x: number, z: number, s: { w: number; d: number }, space: Space) {
  return {
    x: clamp(x, 0, Math.max(0, space.w - s.w)),
    z: clamp(z, 0, Math.max(0, space.d - s.d)),
  };
}

/** effective footprint of an organizer at a given rotation */
export function sizeOf(o: Organizer, rotation: number) {
  const turned = rotation === 90 || rotation === 270;
  return turned ? { w: o.d, d: o.w, h: o.h } : { w: o.w, d: o.d, h: o.h };
}

export function boxOf(p: Placement, o: Organizer): Box {
  const s = sizeOf(o, p.rotation);
  return {
    x0: p.x,
    x1: p.x + s.w,
    y0: p.y,
    y1: p.y + s.h,
    z0: p.z,
    z1: p.z + s.d,
  };
}

const EPS = 0.2;

export function fitsInSpace(b: Box, space: Space) {
  return (
    b.x0 >= -EPS &&
    b.z0 >= -EPS &&
    b.y0 >= -EPS &&
    b.x1 <= space.w + EPS &&
    b.z1 <= space.d + EPS &&
    b.y1 <= space.h + EPS
  );
}

export function overlaps(a: Box, b: Box) {
  return (
    a.x0 < b.x1 - EPS &&
    b.x0 < a.x1 - EPS &&
    a.y0 < b.y1 - EPS &&
    b.y0 < a.y1 - EPS &&
    a.z0 < b.z1 - EPS &&
    b.z0 < a.z1 - EPS
  );
}

/** lowest free height for a footprint: rests on the floor or on top of whatever is under it */
export function restingY(
  footprint: { x0: number; x1: number; z0: number; z1: number },
  others: Box[],
) {
  let y = 0;
  for (const o of others) {
    const overlapXZ =
      footprint.x0 < o.x1 - EPS &&
      o.x0 < footprint.x1 - EPS &&
      footprint.z0 < o.z1 - EPS &&
      o.z0 < footprint.z1 - EPS;
    if (overlapXZ) y = Math.max(y, o.y1);
  }
  return Math.round(y * 10) / 10;
}

export type PlacementStatus = { fits: boolean; collides: boolean };

/** fit + overlap status for every placement of a layout */
export function statusMap(
  placements: Placement[],
  organizers: Record<string, Organizer>,
  space: Space,
  allowStacking = true,
): Record<string, PlacementStatus> {
  const boxes = placements
    .map((p) => {
      const o = organizers[p.organizerId];
      return o ? { id: p.id, box: boxOf(p, o) } : null;
    })
    .filter(Boolean) as { id: string; box: Box }[];

  const out: Record<string, PlacementStatus> = {};
  for (const a of boxes) {
    const collides = boxes.some(
      (b) =>
        b.id !== a.id &&
        (allowStacking
          ? overlaps(a.box, b.box)
          : overlaps({ ...a.box, y0: 0, y1: 1 }, { ...b.box, y0: 0, y1: 1 })),
    );
    out[a.id] = { fits: fitsInSpace(a.box, space), collides };
  }
  return out;
}

export const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
export const round1 = (v: number) => Math.round(v * 10) / 10;

type Foot = { w: number; d: number };
const hitXZ = (x: number, z: number, s: Foot, o: Box) =>
  x < o.x1 - EPS && o.x0 < x + s.w - EPS && z < o.z1 - EPS && o.z0 < z + s.d - EPS;

/** solid-body move on the floor: slide from prev toward target, stopping at other boxes' edges */
export function sweepXZ(
  prev: { x: number; z: number },
  target: { x: number; z: number },
  s: Foot,
  others: Box[],
) {
  const solid = others.filter((o) => !hitXZ(prev.x, prev.z, s, o)); // ignore boxes already overlapping
  let x = target.x;
  for (const o of solid) {
    if (!(prev.z < o.z1 - EPS && o.z0 < prev.z + s.d - EPS)) continue;
    if (x > prev.x && o.x0 >= prev.x + s.w - EPS) x = Math.min(x, o.x0 - s.w);
    if (x < prev.x && o.x1 <= prev.x + EPS) x = Math.max(x, o.x1);
  }
  let z = target.z;
  for (const o of solid) {
    if (!(x < o.x1 - EPS && o.x0 < x + s.w - EPS)) continue;
    if (z > prev.z && o.z0 >= prev.z + s.d - EPS) z = Math.min(z, o.z0 - s.d);
    if (z < prev.z && o.z1 <= prev.z + EPS) z = Math.max(z, o.z1);
  }
  return { x, z };
}

/** nearest floor spot to target that touches no other box and stays inside the walls; null if none */
export function nearestFreeXZ(target: { x: number; z: number }, s: Foot, others: Box[], space: Space) {
  const mx = Math.max(0, space.w - s.w);
  const mz = Math.max(0, space.d - s.d);
  const xs = [target.x, 0, mx, ...others.flatMap((o) => [o.x1, o.x0 - s.w])];
  const zs = [target.z, 0, mz, ...others.flatMap((o) => [o.z1, o.z0 - s.d])];
  let best: { x: number; z: number } | null = null;
  let bd = Infinity;
  for (const rx of xs)
    for (const rz of zs) {
      const x = clamp(rx, 0, mx);
      const z = clamp(rz, 0, mz);
      if (others.some((o) => hitXZ(x, z, s, o))) continue;
      const dd = (x - target.x) ** 2 + (z - target.z) ** 2;
      if (dd < bd) { bd = dd; best = { x, z }; }
    }
  return best;
}
