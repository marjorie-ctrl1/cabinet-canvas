import type { Organizer, Placement, Space } from "./types";
import { boxOf, fitsInSpace, overlaps, round1, sizeOf, statusMap, type Box } from "./geometry";

/** 2D floor-packing optimizer: no stacking, only 0°/90° horizontal rotation. */

export type Candidate = {
  placements: Omit<Placement, "id" | "spaceId">[];
  usedArea: number;
  unusedArea: number;
  placedCount: number;
};

type Item = { organizer: Organizer; anchor: boolean };

const TOL = 0.05;

function shuffle<T>(a: T[], rnd: () => number) {
  const r = [...a];
  for (let i = r.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [r[i], r[j]] = [r[j]!, r[i]!];
  }
  return r;
}

function pack(items: Item[], space: Space, rotPref: (i: number) => (0 | 90)[]) {
  const boxes: Box[] = [];
  const out: Candidate["placements"] = [];
  const points: { x: number; z: number }[] = [{ x: 0, z: 0 }];
  for (let idx = 0; idx < items.length; idx++) {
    const it = items[idx]!;
    let best: { x: number; z: number; r: 0 | 90; box: Box } | null = null;
    for (const r of rotPref(idx)) {
      const s = sizeOf(it.organizer, r);
      if (s.h > space.h + TOL) continue;
      for (const p of points) {
        const b: Box = { x0: p.x, x1: p.x + s.w, y0: 0, y1: s.h, z0: p.z, z1: p.z + s.d };
        if (b.x1 > space.w + TOL || b.z1 > space.d + TOL) continue;
        if (boxes.some((o) => overlaps(b, o))) continue;
        if (!best || p.z < best.z - TOL || (Math.abs(p.z - best.z) <= TOL && p.x < best.x)) {
          best = { x: p.x, z: p.z, r, box: b };
        }
      }
    }
    if (!best) {
      if (it.anchor) return null; // anchors are mandatory
      continue;
    }
    boxes.push(best.box);
    out.push({ organizerId: it.organizer.id, x: round1(best.x), y: 0, z: round1(best.z), rotation: best.r });
    points.push({ x: best.box.x1, z: best.box.z0 }, { x: best.box.x0, z: best.box.z1 }, { x: best.box.x1, z: best.box.z1 });
    // project new points against walls/boxes (slide toward origin)
    for (const b of boxes) points.push({ x: b.x1, z: 0 }, { x: 0, z: b.z1 });
  }
  return out;
}

/** strict validation with the same rules as manual placement */
export function isValid(pl: Candidate["placements"], organizers: Record<string, Organizer>, space: Space) {
  const withIds = pl.map((p, i) => ({ ...p, id: String(i), spaceId: space.id }));
  const st = statusMap(withIds, organizers, space);
  return withIds.every((p) => {
    const o = organizers[p.organizerId];
    const s = st[p.id];
    return !!o && !!s && s.fits && !s.collides && p.y === 0 && fitsInSpace(boxOf(p, o), space);
  });
}

export function optimize(
  organizers: Organizer[],
  space: Space,
  anchorIds: string[],
  opts: { timeMs?: number; max?: number } = {},
): Candidate[] {
  const map = Object.fromEntries(organizers.map((o) => [o.id, o]));
  const items: Item[] = [];
  for (const o of organizers) {
    for (let i = 0; i < Math.max(0, o.quantity); i++) {
      // one copy of each anchor type is mandatory; extra copies are optional
      items.push({ organizer: o, anchor: i === 0 && anchorIds.includes(o.id) });
    }
  }
  if (items.length === 0) return [];
  const area = space.w * space.d;
  const anchors = items.filter((i) => i.anchor);
  const rest = items.filter((i) => !i.anchor);
  const a = (i: Item) => i.organizer.w * i.organizer.d;
  const orders: Item[][] = [
    [...rest].sort((x, y) => a(y) - a(x)),
    [...rest].sort((x, y) => Math.max(y.organizer.w, y.organizer.d) - Math.max(x.organizer.w, x.organizer.d)),
    [...rest].sort((x, y) => y.organizer.w - x.organizer.w),
    [...rest].sort((x, y) => y.organizer.d - x.organizer.d),
    [...rest].sort((x, y) => a(x) - a(y)),
  ];
  let seed = 12345;
  const rnd = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);
  const seen = new Map<string, Candidate>();
  const start = Date.now();
  const budget = opts.timeMs ?? 350;
  let iter = 0;
  while (Date.now() - start < budget && iter < 4000) {
    const base = iter < orders.length * 3 ? orders[iter % orders.length]! : shuffle(rest, rnd);
    const anch = iter % 2 ? shuffle(anchors, rnd) : anchors;
    const mode = Math.floor(iter / orders.length) % 3;
    const rotPref = (i: number): (0 | 90)[] =>
      mode === 0 ? [0, 90] : mode === 1 ? [90, 0] : rnd() < 0.5 || i < 0 ? [0, 90] : [90, 0];
    iter++;
    const pl = pack([...anch, ...base], space, rotPref);
    if (!pl || pl.length === 0) continue;
    if (!isValid(pl, map, space)) continue;
    const key = pl
      .map((p) => `${p.organizerId}:${p.x}:${p.z}:${p.rotation}`)
      .sort()
      .join("|");
    if (seen.has(key)) continue;
    const used = pl.reduce((s, p) => s + map[p.organizerId]!.w * map[p.organizerId]!.d, 0);
    seen.set(key, { placements: pl, usedArea: used, unusedArea: Math.max(0, area - used), placedCount: pl.length });
  }
  return [...seen.values()]
    .sort((x, y) => x.unusedArea - y.unusedArea || y.placedCount - x.placedCount)
    .slice(0, opts.max ?? 6);
}
