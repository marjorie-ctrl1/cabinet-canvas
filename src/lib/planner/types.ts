export type Space = {
  id: string;
  name: string;
  /** offset from the cabinet interior origin, in cm */
  x: number;
  y: number;
  z: number;
  /** usable size in cm */
  w: number;
  d: number;
  h: number;
};

export type Cabinet = {
  id: string;
  name: string;
  w: number;
  d: number;
  h: number;
  /** a cabinet can hold several independent interior spaces (shelves/drawers later) */
  spaces: Space[];
};

export type Organizer = {
  id: string;
  name: string;
  w: number;
  d: number;
  h: number;
  quantity: number;
  color: string;
};

export type Placement = {
  id: string;
  organizerId: string;
  spaceId: string;
  /** min corner, relative to the space origin, in cm */
  x: number;
  y: number;
  z: number;
  rotation: 0 | 90 | 180 | 270;
};

export type Layout = {
  id: string;
  name: string;
  cabinetId: string;
  placements: Placement[];
};

export type Selection =
  | { kind: "cabinet"; id: string }
  | { kind: "organizer"; id: string }
  | { kind: "placement"; id: string }
  | null;

export type PlannerData = {
  cabinets: Cabinet[];
  organizers: Organizer[];
  layouts: Layout[];
  activeLayoutId: string | null;
};
