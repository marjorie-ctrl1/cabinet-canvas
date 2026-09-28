<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## 3D planner architecture

- Planner state (cabinets, organizers, layouts, placements) lives in `src/lib/planner/store.tsx` React context and is persisted to `localStorage` under `cabinet-planner-v1` — no backend needed for the MVP.
- All sizes and positions are stored in centimetres; the 3D scene renders them inside a `scale={0.01}` group so 1 cm = 1 unit in scene math.
- Cabinets own an array of `spaces` (interior volumes); the MVP uses one "Main interior" space so shelves/drawers can be added later without changing placements.
- Fit and overlap checks live in `src/lib/planner/geometry.ts` and never block placement — invalid boxes only render red.
