import { useMemo, useState, type ReactNode } from "react";
import { PlannerProvider, usePlanner } from "@/lib/planner/store";
import { boxOf, fitsInSpace, interiorOf, sizeOf, statusMap } from "@/lib/planner/geometry";
import { Scene3D } from "./Scene3D";
import type { Cabinet, Organizer } from "@/lib/planner/types";
import { parseDimensions, type ParsedItem } from "@/lib/planner/parse";

/* ---------------------------------------------------------------- primitives */

function Button({
  children,
  onClick,
  variant = "default",
  disabled,
  title,
  full,
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: "default" | "primary" | "ghost" | "danger";
  disabled?: boolean;
  title?: string;
  full?: boolean;
}) {
  const styles: Record<string, string> = {
    default: "bg-secondary text-secondary-foreground hover:bg-secondary/80 border border-border",
    primary: "bg-primary text-primary-foreground hover:bg-primary/90",
    ghost: "text-muted-foreground hover:bg-secondary",
    danger: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
  };
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onClick={onClick}
      className={`inline-flex items-center justify-center gap-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${styles[variant]} ${full ? "w-full" : ""}`}
    >
      {children}
    </button>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "number",
  min,
}: {
  label: string;
  value: string | number;
  onChange: (v: string) => void;
  type?: "text" | "number";
  min?: number;
}) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <input
        type={type}
        min={min}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-md border border-input bg-card px-2 py-1.5 text-sm text-foreground outline-none focus:border-ring"
      />
    </label>
  );
}

function Modal({
  title,
  children,
  onClose,
  wide,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  wide?: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-4">
      <div className={`w-full ${wide ? "max-w-2xl" : "max-w-sm"} max-h-[90vh] overflow-y-auto rounded-xl border border-border bg-card p-5 shadow-lg`}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-foreground">{title}</h2>
          <Button variant="ghost" onClick={onClose}>
            ✕
          </Button>
        </div>
        {children}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------- dialogs */

function CabinetDialog({ onClose }: { onClose: () => void }) {
  const { addCabinet } = usePlanner();
  const [f, setF] = useState({ name: "New Cabinet", w: "60", d: "40", h: "80" });
  const set = (k: keyof typeof f) => (v: string) => setF((p) => ({ ...p, [k]: v }));
  return (
    <Modal title="New cabinet" onClose={onClose}>
      <div className="space-y-3">
        <Field label="Name" type="text" value={f.name} onChange={set("name")} />
        <div className="grid grid-cols-3 gap-2">
          <Field label="Width (cm)" value={f.w} onChange={set("w")} min={5} />
          <Field label="Depth (cm)" value={f.d} onChange={set("d")} min={5} />
          <Field label="Height (cm)" value={f.h} onChange={set("h")} min={5} />
        </div>
        <Button
          variant="primary"
          full
          onClick={() => {
            addCabinet({
              name: f.name.trim() || "Cabinet",
              w: Math.max(5, Number(f.w) || 60),
              d: Math.max(5, Number(f.d) || 40),
              h: Math.max(5, Number(f.h) || 80),
            });
            onClose();
          }}
        >
          Create cabinet
        </Button>
      </div>
    </Modal>
  );
}

function OrganizerDialog({ onClose }: { onClose: () => void }) {
  const { addOrganizer } = usePlanner();
  const [f, setF] = useState({ name: "New Organizer", w: "20", d: "30", h: "10", q: "4" });
  const set = (k: keyof typeof f) => (v: string) => setF((p) => ({ ...p, [k]: v }));
  return (
    <Modal title="New organizer" onClose={onClose}>
      <div className="space-y-3">
        <Field label="Name" type="text" value={f.name} onChange={set("name")} />
        <div className="grid grid-cols-3 gap-2">
          <Field label="Width (cm)" value={f.w} onChange={set("w")} min={1} />
          <Field label="Depth (cm)" value={f.d} onChange={set("d")} min={1} />
          <Field label="Height (cm)" value={f.h} onChange={set("h")} min={1} />
        </div>
        <Field label="Quantity to plan with" value={f.q} onChange={set("q")} min={1} />
        <Button
          variant="primary"
          full
          onClick={() => {
            addOrganizer({
              name: f.name.trim() || "Organizer",
              w: Math.max(1, Number(f.w) || 20),
              d: Math.max(1, Number(f.d) || 30),
              h: Math.max(1, Number(f.h) || 10),
              quantity: Math.max(1, Math.round(Number(f.q) || 1)),
            });
            onClose();
          }}
        >
          Add to inventory
        </Button>
      </div>
    </Modal>
  );
}

function LayoutDialog({ onClose }: { onClose: () => void }) {
  const { addLayout, data, activeCabinet } = usePlanner();
  const [name, setName] = useState("New layout");
  const [cabinetId, setCabinetId] = useState(activeCabinet?.id ?? data.cabinets[0]?.id ?? "");
  return (
    <Modal title="New layout" onClose={onClose}>
      <div className="space-y-3">
        <Field label="Layout name" type="text" value={name} onChange={setName} />
        <label className="block">
          <span className="text-xs font-medium text-muted-foreground">Cabinet</span>
          <select
            value={cabinetId}
            onChange={(e) => setCabinetId(e.target.value)}
            className="mt-1 w-full rounded-md border border-input bg-card px-2 py-1.5 text-sm text-foreground"
          >
            {data.cabinets.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <Button
          variant="primary"
          full
          disabled={!cabinetId}
          onClick={() => {
            addLayout({ name: name.trim() || "Layout", cabinetId });
            onClose();
          }}
        >
          Create layout
        </Button>
      </div>
    </Modal>
  );
}

function PasteDialog({ kind, onClose }: { kind: "cabinet" | "organizer"; onClose: () => void }) {
  const { addCabinet, addOrganizer } = usePlanner();
  const label = kind === "cabinet" ? "Cabinet" : "Organizer";
  const [text, setText] = useState("");
  const [rows, setRows] = useState<ParsedItem[] | null>(null);
  const min = kind === "cabinet" ? 5 : 1;
  const upd = (i: number, k: keyof ParsedItem, v: string) =>
    setRows((r) => r && r.map((x, j) => (j === i ? { ...x, [k]: k === "name" ? v : Number(v) || 0 } : x)));

  if (!rows)
    return (
      <Modal title={`Paste ${label.toLowerCase()} list`} onClose={onClose} wide>
        <p className="mb-2 text-xs text-muted-foreground">
          One {label.toLowerCase()} per line, sizes in cm. Examples: "Box A: W30 D20 H10", "Tray 30 x 20 x 8",
          or a table with Name / Width / Depth / Height columns.
          {kind === "organizer" && " Add \"qty 4\" to set a quantity."}
        </p>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={8}
          placeholder={"Box A: W30 D20 H10\nBox B: W15 D20 H10"}
          className="w-full rounded-md border border-input bg-card p-2 font-mono text-sm text-foreground outline-none focus:border-ring"
        />
        <div className="mt-3">
          <Button variant="primary" full disabled={!text.trim()} onClick={() => setRows(parseDimensions(text, label))}>
            Read sizes
          </Button>
        </div>
      </Modal>
    );

  const valid = rows.length > 0 && rows.every((r) => r.w >= min && r.d >= min && r.h >= min);
  return (
    <Modal title={`Check ${label.toLowerCase()}s before creating`} onClose={onClose} wide>
      {rows.length === 0 ? (
        <p className="text-sm text-destructive">No sizes found. Go back and check the text.</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-muted-foreground">
              <th className="pb-1">Name</th>
              <th className="pb-1">Type</th>
              <th className="pb-1">W</th>
              <th className="pb-1">D</th>
              <th className="pb-1">H</th>
              {kind === "organizer" && <th className="pb-1">Qty</th>}
              <th />
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i}>
                <td className="pr-1 py-0.5">
                  <input value={r.name} onChange={(e) => upd(i, "name", e.target.value)}
                    className="w-full rounded border border-input bg-card px-1.5 py-1 text-foreground" />
                </td>
                <td className="pr-1 text-xs font-semibold text-muted-foreground">{label}</td>
                {(["w", "d", "h", ...(kind === "organizer" ? ["quantity"] : [])] as (keyof ParsedItem)[]).map((k) => (
                  <td key={k} className="pr-1">
                    <input type="number" value={r[k]} onChange={(e) => upd(i, k, e.target.value)}
                      className="w-16 rounded border border-input bg-card px-1.5 py-1 text-foreground" />
                  </td>
                ))}
                <td>
                  <button type="button" className="text-xs text-destructive hover:underline"
                    onClick={() => setRows(rows.filter((_, j) => j !== i))}>Remove</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <div className="mt-4 flex gap-2">
        <Button onClick={() => setRows(null)}>Back</Button>
        <Button
          variant="primary"
          disabled={!valid}
          onClick={() => {
            for (const r of rows) {
              const base = { name: r.name.trim() || label, w: r.w, d: r.d, h: r.h };
              if (kind === "cabinet") addCabinet(base);
              else addOrganizer({ ...base, quantity: Math.max(1, Math.round(r.quantity)) });
            }
            onClose();
          }}
        >
          Create {rows.length} {label.toLowerCase()}{rows.length === 1 ? "" : "s"}
        </Button>
      </div>
    </Modal>
  );
}

/* --------------------------------------------------------------- left panel */

function CabinetList() {
  const { data, activeCabinet, selection, setSelection, deleteCabinet, loadLayout } = usePlanner();
  return (
    <div className="space-y-2">
      {data.cabinets.map((c) => {
        const active = activeCabinet?.id === c.id;
        const sel = selection?.kind === "cabinet" && selection.id === c.id;
        return (
          <div
            key={c.id}
            onClick={() => {
              setSelection({ kind: "cabinet", id: c.id });
              const l = data.layouts.find((x) => x.cabinetId === c.id);
              if (l) loadLayout(l.id);
              setSelection({ kind: "cabinet", id: c.id });
            }}
            className={`cursor-pointer rounded-lg border p-3 transition-colors ${sel ? "border-ring bg-secondary" : "border-border bg-card hover:bg-secondary/60"}`}
          >
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-semibold text-foreground">{c.name}</p>
              {active && (
                <span className="rounded bg-primary px-1.5 py-0.5 text-[10px] font-semibold text-primary-foreground">
                  in view
                </span>
              )}
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {c.w} × {c.d} × {c.h} cm
            </p>
            <button
              type="button"
              className="mt-2 text-xs text-destructive hover:underline"
              onClick={(e) => {
                e.stopPropagation();
                deleteCabinet(c.id);
              }}
            >
              Delete
            </button>
          </div>
        );
      })}
      {data.cabinets.length === 0 && (
        <p className="text-xs text-muted-foreground">No cabinets yet.</p>
      )}
    </div>
  );
}

function OrganizerList() {
  const { data, remaining, usedCount, setSelection, selection, placeOrganizer, activeSpace } =
    usePlanner();
  return (
    <div className="space-y-2">
      {data.organizers.map((o) => {
        const left = remaining(o.id);
        const sel = selection?.kind === "organizer" && selection.id === o.id;
        return (
          <div
            key={o.id}
            draggable={left > 0}
            onDragStart={(e) => {
              e.dataTransfer.setData("text/organizer-id", o.id);
              e.dataTransfer.effectAllowed = "copy";
            }}
            onClick={() => setSelection({ kind: "organizer", id: o.id })}
            className={`rounded-lg border p-3 transition-colors ${left > 0 ? "cursor-grab active:cursor-grabbing" : "opacity-60"} ${sel ? "border-ring bg-secondary" : "border-border bg-card hover:bg-secondary/60"}`}
          >
            <div className="flex items-center gap-2">
              <span
                className="h-4 w-4 shrink-0 rounded"
                style={{ backgroundColor: o.color }}
                aria-hidden
              />
              <p className="text-sm font-semibold text-foreground">{o.name}</p>
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {o.w} × {o.d} × {o.h} cm
            </p>
            <p className="text-xs text-muted-foreground">
              Quantity: {left} of {o.quantity} available
              {usedCount(o.id) > 0 && ` · ${usedCount(o.id)} placed`}
            </p>
            <div className="mt-2 flex gap-2" onClick={(e) => e.stopPropagation()}>
              <Button
                disabled={left <= 0 || !activeSpace}
                onClick={() =>
                  activeSpace &&
                  placeOrganizer(
                    o.id,
                    activeSpace.w / 2 - o.w / 2,
                    activeSpace.d / 2 - o.d / 2,
                  )
                }
              >
                Place in cabinet
              </Button>
            </div>
          </div>
        );
      })}
      {data.organizers.length === 0 && (
        <p className="text-xs text-muted-foreground">No organizers yet.</p>
      )}
    </div>
  );
}

function LayoutList() {
  const { data, loadLayout, deleteLayout, organizerMap } = usePlanner();
  return (
    <div className="space-y-2">
      {data.layouts.map((l) => {
        const active = l.id === data.activeLayoutId;
        const cabinet = data.cabinets.find((c) => c.id === l.cabinetId);
        return (
          <div
            key={l.id}
            className={`rounded-lg border p-3 ${active ? "border-ring bg-secondary" : "border-border bg-card"}`}
          >
            <p className="text-sm font-semibold text-foreground">{l.name}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {cabinet?.name ?? "Cabinet deleted"} ·{" "}
              {l.placements.filter((p) => organizerMap[p.organizerId]).length} organizers
            </p>
            <div className="mt-2 flex gap-2">
              <Button onClick={() => loadLayout(l.id)} disabled={active}>
                {active ? "Open" : "Load"}
              </Button>
              <button
                type="button"
                className="text-xs text-destructive hover:underline"
                onClick={() => deleteLayout(l.id)}
              >
                Delete
              </button>
            </div>
          </div>
        );
      })}
      {data.layouts.length === 0 && <p className="text-xs text-muted-foreground">No layouts yet.</p>}
    </div>
  );
}

function LeftSidebar() {
  const [tab, setTab] = useState<"cabinets" | "organizers" | "layouts">("organizers");
  const [dialog, setDialog] = useState<
    null | "cabinet" | "organizer" | "layout" | "pasteCabinet" | "pasteOrganizer"
  >(null);
  const tabs = [
    { id: "cabinets", label: "Cabinets" },
    { id: "organizers", label: "Organizers" },
    { id: "layouts", label: "Layouts" },
  ] as const;

  return (
    <aside className="flex w-72 shrink-0 flex-col border-r border-border bg-panel">
      <div className="space-y-2 border-b border-border p-3">
        <Button variant="primary" full onClick={() => setDialog("cabinet")}>
          + New Cabinet
        </Button>
        <Button full onClick={() => setDialog("organizer")}>
          + New Organizer
        </Button>
        <Button full onClick={() => setDialog("layout")}>
          + New Layout
        </Button>
        <div className="grid grid-cols-2 gap-2">
          <Button onClick={() => setDialog("pasteCabinet")} title="Paste text with cabinet sizes">
            Paste cabinets
          </Button>
          <Button onClick={() => setDialog("pasteOrganizer")} title="Paste text with organizer sizes">
            Paste organizers
          </Button>
        </div>
      </div>
      <div className="flex border-b border-border">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`flex-1 px-2 py-2 text-xs font-semibold transition-colors ${tab === t.id ? "border-b-2 border-primary text-foreground" : "text-muted-foreground hover:text-foreground"}`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-y-auto p-3">
        {tab === "cabinets" && <CabinetList />}
        {tab === "organizers" && <OrganizerList />}
        {tab === "layouts" && <LayoutList />}
      </div>
      {dialog === "cabinet" && <CabinetDialog onClose={() => setDialog(null)} />}
      {dialog === "organizer" && <OrganizerDialog onClose={() => setDialog(null)} />}
      {dialog === "layout" && <LayoutDialog onClose={() => setDialog(null)} />}
      {dialog === "pasteCabinet" && <PasteDialog kind="cabinet" onClose={() => setDialog(null)} />}
      {dialog === "pasteOrganizer" && <PasteDialog kind="organizer" onClose={() => setDialog(null)} />}
    </aside>
  );
}

/* -------------------------------------------------------------- right panel */

function CabinetProps({ cabinet }: { cabinet: Cabinet }) {
  const { updateCabinet, deleteCabinet } = usePlanner();
  const num = (k: "w" | "d" | "h") => (v: string) =>
    updateCabinet(cabinet.id, { [k]: Math.max(5, Number(v) || 5) });
  return (
    <div className="space-y-3">
      <Field
        label="Name"
        type="text"
        value={cabinet.name}
        onChange={(v) => updateCabinet(cabinet.id, { name: v })}
      />
      <div className="grid grid-cols-3 gap-2">
        <Field label="Width" value={cabinet.w} onChange={num("w")} />
        <Field label="Depth" value={cabinet.d} onChange={num("d")} />
        <Field label="Height" value={cabinet.h} onChange={num("h")} />
      </div>
      <p className="text-xs text-muted-foreground">
        Usable interior: {interiorOf(cabinet).w} × {interiorOf(cabinet).d} × {interiorOf(cabinet).h} cm
      </p>
      <Button variant="danger" full onClick={() => deleteCabinet(cabinet.id)}>
        Delete cabinet
      </Button>
    </div>
  );
}

function OrganizerProps({ organizer }: { organizer: Organizer }) {
  const { updateOrganizer, deleteOrganizer, usedCount } = usePlanner();
  const num = (k: "w" | "d" | "h" | "quantity") => (v: string) =>
    updateOrganizer(organizer.id, { [k]: Math.max(1, Number(v) || 1) });
  return (
    <div className="space-y-3">
      <Field
        label="Name"
        type="text"
        value={organizer.name}
        onChange={(v) => updateOrganizer(organizer.id, { name: v })}
      />
      <div className="grid grid-cols-3 gap-2">
        <Field label="Width" value={organizer.w} onChange={num("w")} />
        <Field label="Depth" value={organizer.d} onChange={num("d")} />
        <Field label="Height" value={organizer.h} onChange={num("h")} />
      </div>
      <Field label="Quantity" value={organizer.quantity} onChange={num("quantity")} />
      <p className="text-xs text-muted-foreground">
        Placed in this layout: {usedCount(organizer.id)}
      </p>
      <Button variant="danger" full onClick={() => deleteOrganizer(organizer.id)}>
        Delete organizer
      </Button>
    </div>
  );
}

function PlacementProps({ placementId }: { placementId: string }) {
  const {
    activeLayout,
    activeSpace,
    organizerMap,
    rotatePlacement,
    setPlacementPos,
    dropToRest,
    deletePlacement,
  } = usePlanner();
  const p = activeLayout?.placements.find((it) => it.id === placementId);
  const o = p ? organizerMap[p.organizerId] : null;
  const statuses = useMemo(
    () =>
      activeLayout && activeSpace
        ? statusMap(activeLayout.placements, organizerMap, activeSpace)
        : {},
    [activeLayout, activeSpace, organizerMap],
  );
  if (!p || !o || !activeSpace) return <p className="text-xs text-muted-foreground">Gone.</p>;
  const s = sizeOf(o, p.rotation);
  const st = statuses[p.id] ?? { fits: fitsInSpace(boxOf(p, o), activeSpace), collides: false };
  const num = (k: "x" | "y" | "z") => (v: string) =>
    setPlacementPos(p.id, { [k]: Number(v) || 0 });
  return (
    <div className="space-y-3">
      <div>
        <p className="text-sm font-semibold text-foreground">{o.name}</p>
        <p className="text-xs text-muted-foreground">
          Effective size: {s.w} × {s.d} × {s.h} cm (rotation {p.rotation}°)
        </p>
      </div>

      <div
        className={`rounded-md px-3 py-2 text-xs font-medium ${st.fits && !st.collides ? "bg-success-soft text-success-strong" : "bg-destructive/15 text-destructive"}`}
      >
        {!st.fits && "Sticks out of the cabinet space. "}
        {st.collides && "Overlaps another organizer. "}
        {st.fits && !st.collides && "Fits in the available space."}
      </div>

      <div className="grid grid-cols-3 gap-2">
        <Field label="X (cm)" value={p.x} onChange={num("x")} />
        <Field label="Y (height)" value={p.y} onChange={num("y")} />
        <Field label="Z (depth)" value={p.z} onChange={num("z")} />
      </div>

      <div className="flex gap-2">
        <Button onClick={() => rotatePlacement(p.id, -1)}>⟲ 90°</Button>
        <Button onClick={() => rotatePlacement(p.id, 1)}>⟳ 90°</Button>
        <Button onClick={() => dropToRest(p.id)}>Drop down</Button>
      </div>
      <div className="flex gap-2">
        <Button onClick={() => setPlacementPos(p.id, { y: p.y + 1 })}>Raise 1 cm</Button>
        <Button onClick={() => setPlacementPos(p.id, { y: Math.max(0, p.y - 1) })}>
          Lower 1 cm
        </Button>
      </div>

      <Button variant="danger" full onClick={() => deletePlacement(p.id)}>
        Delete from layout
      </Button>
    </div>
  );
}

function RightSidebar() {
  const { selection, data, activeCabinet, organizerMap } = usePlanner();
  let body: ReactNode = (
    <p className="text-xs text-muted-foreground">
      Select a cabinet, an organizer or a placed box to see its properties here.
    </p>
  );
  let title = "Properties";
  if (selection?.kind === "cabinet") {
    const c = data.cabinets.find((x) => x.id === selection.id);
    if (c) {
      title = "Cabinet";
      body = <CabinetProps cabinet={c} />;
    }
  } else if (selection?.kind === "organizer") {
    const o = organizerMap[selection.id];
    if (o) {
      title = "Organizer";
      body = <OrganizerProps organizer={o} />;
    }
  } else if (selection?.kind === "placement") {
    title = "Placed organizer";
    body = <PlacementProps placementId={selection.id} />;
  }
  return (
    <aside className="flex w-72 shrink-0 flex-col border-l border-border bg-panel">
      <div className="border-b border-border px-4 py-3">
        <h2 className="text-sm font-semibold text-foreground">{title}</h2>
        {activeCabinet && (
          <p className="text-xs text-muted-foreground">Viewing: {activeCabinet.name}</p>
        )}
      </div>
      <div className="flex-1 overflow-y-auto p-4">{body}</div>
    </aside>
  );
}

/* ---------------------------------------------------------------- app shell */

function Shell() {
  const { activeLayout, renameLayout, clearLayout, resetAll } = usePlanner();
  return (
    <div className="flex h-screen flex-col bg-background">
      <header className="flex items-center justify-between gap-4 border-b border-border bg-panel px-4 py-2">
        <div className="flex items-center gap-3">
          <span className="text-sm font-bold tracking-tight text-foreground">Shelfcraft</span>
          <span className="text-xs text-muted-foreground">3D cabinet &amp; organizer planner</span>
        </div>
        <div className="flex items-center gap-2">
          {activeLayout && (
            <input
              value={activeLayout.name}
              onChange={(e) => renameLayout(activeLayout.id, e.target.value)}
              className="w-64 rounded-md border border-input bg-card px-2 py-1 text-sm text-foreground outline-none focus:border-ring"
            />
          )}
          <span className="text-xs text-muted-foreground">Saved automatically</span>
          <Button onClick={clearLayout}>Empty layout</Button>
          <Button
            variant="ghost"
            onClick={() => {
              if (window.confirm("Reset everything back to the starting example?")) resetAll();
            }}
          >
            Reset
          </Button>
        </div>
      </header>
      <div className="flex min-h-0 flex-1">
        <LeftSidebar />
        <main className="min-w-0 flex-1">
          <Scene3D />
        </main>
        <RightSidebar />
      </div>
    </div>
  );
}

export function PlannerApp() {
  return (
    <PlannerProvider>
      <Shell />
    </PlannerProvider>
  );
}
