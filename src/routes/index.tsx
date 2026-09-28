import { createFileRoute } from "@tanstack/react-router";
import { PlannerApp } from "@/components/planner/PlannerApp";

export const Route = createFileRoute("/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Shelfcraft — 3D Cabinet & Organizer Planner" },
      {
        name: "description",
        content:
          "Plan cabinets, drawers and storage in real 3D. Enter real centimetre sizes, drag organizers inside, check fit and overlaps, and save layout options.",
      },
      { property: "og:title", content: "Shelfcraft — 3D Cabinet & Organizer Planner" },
      {
        property: "og:description",
        content:
          "Design your storage in 3D with true-to-size cabinets and organizers, drag-and-drop placement and instant fit checks.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PlannerApp,
});
