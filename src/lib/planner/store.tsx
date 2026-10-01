import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type {
  Cabinet,
  Layout,
  Organizer,
  Placement,
  PlannerData,
  Selection,
  Space,
} from "./types";
import { boxOf, clamp, clampToWalls, interiorOf, mainSpace, restingY, round1, sizeOf } from "./geometry";
import { isValid } from "./optimizer";

const KEY = "cabinet-planner-v1";

const ORG_COLORS = ["#7fb3d5", "#f5cba7", "#a9dfbf", "#d7bde2", "#f9e79f", "#aeb6bf"];

const pickColor = (i: number) => ORG_COLORS[i % ORG_COLORS.length] ?? "#7fb3d5";

const uid = () => Math.random().toString(36).slice(2, 10);

function spaceForCabinet(cabinetId: string, c: { w: number; d: number; h: number }): Space {
  const i = interiorOf({ id: cabinetId, name: "", spaces: [], ...c } as Cabinet);
  return {
    id: `${cabinetId}-main`,
    name: "Main interior",
    x: 0,
    y: 0,
    z: 0,
    w: i.w,
    d: i.d,
    h: i.h,
  };
}

function seed(): PlannerData {
  const cabId = uid();
  const cabinet: Cabinet = {
    id: cabId,
    name: "Bathroom Cabinet",
    w: 60,
    d: 40,
    h: 80,
    spaces: [spaceForCabinet(cabId, { w: 60, d: 40, h: 80 })],
  };
  const organizers: Organizer[] = [
    {
      id: uid(),
      name: "Small Acrylic Bin",
      w: 15,
      d: 25,
      h: 10,
      quantity: 4,
      color: pickColor(0),
    },
    {
      id: uid(),
      name: "Wide Tray",
      w: 30,
      d: 20,
      h: 8,
      quantity: 2,
      color: pickColor(1),
    },
  ];
  const layout: Layout = {
    id: uid(),
    name: "Bathroom Cabinet — Option 1",
    cabinetId: cabId,
    placements: [],
  };
  return {
    cabinets: [cabinet],
    organizers,
    layouts: [layout],
    activeLayoutId: layout.id,
  };
}

function load(): PlannerData {
  if (typeof window === "undefined") return seed();
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return seed();
    const parsed = JSON.parse(raw) as PlannerData;
    if (!parsed.cabinets || !parsed.organizers || !parsed.layouts) return seed();
    return parsed;
  } catch {
    return seed();
  }
}

type Ctx = {
  data: PlannerData;
  selection: Selection;
  setSelection: (s: Selection) => void;
  activeLayout: Layout | null;
  activeCabinet: Cabinet | null;
  activeSpace: Space | null;
  organizerMap: Record<string, Organizer>;
  usedCount: (organizerId: string) => number;
  remaining: (organizerId: string) => number;
  addCabinet: (v: { name: string; w: number; d: number; h: number }) => void;
  updateCabinet: (id: string, v: Partial<Pick<Cabinet, "name" | "w" | "d" | "h" | "opening">>) => void;
  deleteCabinet: (id: string) => void;
  addOrganizer: (v: {
    name: string;
    w: number;
    d: number;
    h: number;
    quantity: number;
  }) => void;
  updateOrganizer: (id: string, v: Partial<Organizer>) => void;
  deleteOrganizer: (id: string) => void;
  addLayout: (v: { name: string; cabinetId: string }) => void;
  renameLayout: (id: string, name: string) => void;
  deleteLayout: (id: string) => void;
  loadLayout: (id: string) => void;
  placeOrganizer: (organizerId: string, x: number, z: number) => void;
  movePlacement: (id: string, x: number, z: number) => void;
  setPlacementPos: (id: string, v: { x?: number; y?: number; z?: number }) => void;
  rotatePlacement: (id: string, dir: 1 | -1) => void;
  dropToRest: (id: string) => void;
  deletePlacement: (id: string) => void;
  clearLayout: () => void;
  applyPlacements: (list: Omit<Placement, "id" | "spaceId">[]) => boolean;
  resetAll: () => void;
};

const PlannerCtx = createContext<Ctx | null>(null);

export function PlannerProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<PlannerData>(() => load());
  const [selection, setSelection] = useState<Selection>(null);

  useEffect(() => {
    try {
      window.localStorage.setItem(KEY, JSON.stringify(data));
    } catch {
      /* storage full or unavailable */
    }
  }, [data]);

  const organizerMap = useMemo(
    () => Object.fromEntries(data.organizers.map((o) => [o.id, o])),
    [data.organizers],
  );

  const activeLayout = useMemo(
    () => data.layouts.find((l) => l.id === data.activeLayoutId) ?? null,
    [data.layouts, data.activeLayoutId],
  );
  const activeCabinet = useMemo(
    () => data.cabinets.find((c) => c.id === activeLayout?.cabinetId) ?? null,
    [data.cabinets, activeLayout],
  );
  const activeSpace = useMemo(
    () => (activeCabinet ? mainSpace(activeCabinet) : null),
    [activeCabinet],
  );

  const updateLayout = useCallback(
    (fn: (l: Layout) => Layout) => {
      setData((d) => ({
        ...d,
        layouts: d.layouts.map((l) => (l.id === d.activeLayoutId ? fn(l) : l)),
      }));
    },
    [],
  );

  const usedCount = useCallback(
    (organizerId: string) =>
      (activeLayout?.placements ?? []).filter((p) => p.organizerId === organizerId).length,
    [activeLayout],
  );
  const remaining = useCallback(
    (organizerId: string) =>
      Math.max(0, (organizerMap[organizerId]?.quantity ?? 0) - usedCount(organizerId)),
    [organizerMap, usedCount],
  );

  const addCabinet: Ctx["addCabinet"] = useCallback((v) => {
    const id = uid();
    const cabinet: Cabinet = { id, ...v, spaces: [spaceForCabinet(id, v)] };
    const layout: Layout = {
      id: uid(),
      name: `${v.name} — Option 1`,
      cabinetId: id,
      placements: [],
    };
    setData((d) => ({
      ...d,
      cabinets: [...d.cabinets, cabinet],
      layouts: [...d.layouts, layout],
      activeLayoutId: layout.id,
    }));
    setSelection({ kind: "cabinet", id });
  }, []);

  const updateCabinet: Ctx["updateCabinet"] = useCallback((id, v) => {
    setData((d) => ({
      ...d,
      cabinets: d.cabinets.map((c) => {
        if (c.id !== id) return c;
        const next = { ...c, ...v };
        return { ...next, spaces: [spaceForCabinet(id, next)] };
      }),
    }));
  }, []);

  const deleteCabinet: Ctx["deleteCabinet"] = useCallback((id) => {
    setData((d) => {
      const layouts = d.layouts.filter((l) => l.cabinetId !== id);
      return {
        ...d,
        cabinets: d.cabinets.filter((c) => c.id !== id),
        layouts,
        activeLayoutId: layouts.some((l) => l.id === d.activeLayoutId)
          ? d.activeLayoutId
          : (layouts[0]?.id ?? null),
      };
    });
    setSelection(null);
  }, []);

  const addOrganizer: Ctx["addOrganizer"] = useCallback((v) => {
    const id = uid();
    setData((d) => ({
      ...d,
      organizers: [
        ...d.organizers,
        { id, ...v, color: pickColor(d.organizers.length) },
      ],
    }));
    setSelection({ kind: "organizer", id });
  }, []);

  const updateOrganizer: Ctx["updateOrganizer"] = useCallback((id, v) => {
    setData((d) => ({
      ...d,
      organizers: d.organizers.map((o) => (o.id === id ? { ...o, ...v } : o)),
    }));
  }, []);

  const deleteOrganizer: Ctx["deleteOrganizer"] = useCallback((id) => {
    setData((d) => ({
      ...d,
      organizers: d.organizers.filter((o) => o.id !== id),
      layouts: d.layouts.map((l) => ({
        ...l,
        placements: l.placements.filter((p) => p.organizerId !== id),
      })),
    }));
    setSelection(null);
  }, []);

  const addLayout: Ctx["addLayout"] = useCallback((v) => {
    const layout: Layout = { id: uid(), name: v.name, cabinetId: v.cabinetId, placements: [] };
    setData((d) => ({ ...d, layouts: [...d.layouts, layout], activeLayoutId: layout.id }));
    setSelection(null);
  }, []);

  const renameLayout: Ctx["renameLayout"] = useCallback((id, name) => {
    setData((d) => ({ ...d, layouts: d.layouts.map((l) => (l.id === id ? { ...l, name } : l)) }));
  }, []);

  const deleteLayout: Ctx["deleteLayout"] = useCallback((id) => {
    setData((d) => {
      const layouts = d.layouts.filter((l) => l.id !== id);
      return {
        ...d,
        layouts,
        activeLayoutId: d.activeLayoutId === id ? (layouts[0]?.id ?? null) : d.activeLayoutId,
      };
    });
    setSelection(null);
  }, []);

  const loadLayout: Ctx["loadLayout"] = useCallback((id) => {
    setData((d) => ({ ...d, activeLayoutId: id }));
    setSelection(null);
  }, []);

  /** place / move helpers -------------------------------------------------- */

  const solve = useCallback(
    (
      layout: Layout,
      organizer: Organizer,
      rotation: Placement["rotation"],
      x: number,
      z: number,
      space: Space,
      ignoreId?: string,
    ) => {
      const s = sizeOf(organizer, rotation);
      const w = clampToWalls(x, z, s, space);
      const px = round1(w.x);
      const pz = round1(w.z);
      const others = layout.placements
        .filter((p) => p.id !== ignoreId)
        .map((p) => {
          const o = organizerMap[p.organizerId];
          return o ? boxOf(p, o) : null;
        })
        .filter(Boolean) as ReturnType<typeof boxOf>[];
      const py = restingY({ x0: px, x1: px + s.w, z0: pz, z1: pz + s.d }, others);
      return { x: px, y: py, z: pz };
    },
    [organizerMap],
  );

  const placeOrganizer: Ctx["placeOrganizer"] = useCallback(
    (organizerId, x, z) => {
      if (!activeLayout || !activeSpace) return;
      if (remaining(organizerId) <= 0) return;
      const organizer = organizerMap[organizerId];
      if (!organizer) return;
      const pos = solve(activeLayout, organizer, 0, x, z, activeSpace);
      const placement: Placement = {
        id: uid(),
        organizerId,
        spaceId: activeSpace.id,
        rotation: 0,
        ...pos,
      };
      updateLayout((l) => ({ ...l, placements: [...l.placements, placement] }));
      setSelection({ kind: "placement", id: placement.id });
    },
    [activeLayout, activeSpace, organizerMap, remaining, solve, updateLayout],
  );

  const movePlacement: Ctx["movePlacement"] = useCallback(
    (id, x, z) => {
      if (!activeLayout || !activeSpace) return;
      const p = activeLayout.placements.find((it) => it.id === id);
      const o = p ? organizerMap[p.organizerId] : null;
      if (!p || !o) return;
      const pos = solve(activeLayout, o, p.rotation, x, z, activeSpace, id);
      updateLayout((l) => ({
        ...l,
        placements: l.placements.map((it) => (it.id === id ? { ...it, ...pos } : it)),
      }));
    },
    [activeLayout, activeSpace, organizerMap, solve, updateLayout],
  );

  const setPlacementPos: Ctx["setPlacementPos"] = useCallback(
    (id, v) => {
      updateLayout((l) => ({
        ...l,
        placements: l.placements.map((p) =>
          p.id === id
            ? (() => {
                const o = organizerMap[p.organizerId];
                const w =
                  o && activeSpace
                    ? clampToWalls(v.x ?? p.x, v.z ?? p.z, sizeOf(o, p.rotation), activeSpace)
                    : { x: v.x ?? p.x, z: v.z ?? p.z };
                return { ...p, x: round1(w.x), y: round1(Math.max(0, v.y ?? p.y)), z: round1(w.z) };
              })()
            : p,
        ),
      }));
    },
    [updateLayout, organizerMap, activeSpace],
  );

  const rotatePlacement: Ctx["rotatePlacement"] = useCallback(
    (id, dir) => {
      updateLayout((l) => ({
        ...l,
        placements: l.placements.map((p) =>
          p.id === id
            ? (() => {
                const rotation = ((p.rotation + dir * 90 + 360) % 360) as Placement["rotation"];
                const o = organizerMap[p.organizerId];
                if (!o || !activeSpace) return { ...p, rotation };
                const w = clampToWalls(p.x, p.z, sizeOf(o, rotation), activeSpace);
                return { ...p, rotation, x: round1(w.x), z: round1(w.z) };
              })()
            : p,
        ),
      }));
    },
    [updateLayout, organizerMap, activeSpace],
  );

  const dropToRest: Ctx["dropToRest"] = useCallback(
    (id) => {
      const p = activeLayout?.placements.find((it) => it.id === id);
      if (p) movePlacement(id, p.x, p.z);
    },
    [activeLayout, movePlacement],
  );

  const deletePlacement: Ctx["deletePlacement"] = useCallback(
    (id) => {
      updateLayout((l) => ({ ...l, placements: l.placements.filter((p) => p.id !== id) }));
      setSelection(null);
    },
    [updateLayout],
  );

  const clearLayout = useCallback(() => {
    updateLayout((l) => ({ ...l, placements: [] }));
    setSelection(null);
  }, [updateLayout]);

  const applyPlacements: Ctx["applyPlacements"] = useCallback(
    (list) => {
      if (!activeSpace) return false;
      if (!isValid(list, organizerMap, activeSpace)) return false;
      const counts: Record<string, number> = {};
      for (const p of list) counts[p.organizerId] = (counts[p.organizerId] ?? 0) + 1;
      if (Object.entries(counts).some(([id, n]) => n > (organizerMap[id]?.quantity ?? 0))) return false;
      const sid = activeSpace.id;
      updateLayout((l) => ({
        ...l,
        placements: list.map((p) => ({ ...p, y: 0, id: uid(), spaceId: sid })),
      }));
      setSelection(null);
      return true;
    },
    [activeSpace, organizerMap, updateLayout],
  );

  const resetAll = useCallback(() => {
    setData(seed());
    setSelection(null);
  }, []);

  const value: Ctx = {
    data,
    selection,
    setSelection,
    activeLayout,
    activeCabinet,
    activeSpace,
    organizerMap,
    usedCount,
    remaining,
    addCabinet,
    updateCabinet,
    deleteCabinet,
    addOrganizer,
    updateOrganizer,
    deleteOrganizer,
    addLayout,
    renameLayout,
    deleteLayout,
    loadLayout,
    placeOrganizer,
    movePlacement,
    setPlacementPos,
    rotatePlacement,
    dropToRest,
    deletePlacement,
    clearLayout,
    applyPlacements,
    resetAll,
  };

  return <PlannerCtx.Provider value={value}>{children}</PlannerCtx.Provider>;
}

export function usePlanner() {
  const ctx = useContext(PlannerCtx);
  if (!ctx) throw new Error("usePlanner must be used inside PlannerProvider");
  return ctx;
}
