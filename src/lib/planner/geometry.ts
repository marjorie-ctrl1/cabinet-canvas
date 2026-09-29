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

/** inner volume between the solid panels: floor + left/right + back/front walls, open top */
export function interiorOf(c: Cabinet) {
  return {
    w: Math.max(1, c.w - 2 * WALL),
    h: Math.max(1, c.h - WALL),
    d: Math.max(1, c.d - 2 * WALL),
  };
}

export function mainSpace(c: Cabinet): Space {
  const i = interiorOf(c);
  const s = c.spaces[0];
  // always size the main space to the real inner wall surfaces
  return s
    ? { ...s, x: 0, y: 0, z: 0, w: i.w, d: i.d, h: i.h }
    : { id: `${c.id}-main`, name: "Main interior", x: 0, y: 0, z: 0, w: i.w, d: i.d, h: i.h };
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
): Record<string, PlacementStatus> {
  const boxes = placements
    .map((p) => {
      const o = organizers[p.organizerId];
      return o ? { id: p.id, box: boxOf(p, o) } : null;
    })
    .filter(Boolean) as { id: string; box: Box }[];

  const out: Record<string, PlacementStatus> = {};
  for (const a of boxes) {
    const collides = boxes.some((b) => b.id !== a.id && overlaps(a.box, b.box));
    out[a.id] = { fits: fitsInSpace(a.box, space), collides };
  }
  return out;
}

export const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
export const round1 = (v: number) => Math.round(v * 10) / 10;
