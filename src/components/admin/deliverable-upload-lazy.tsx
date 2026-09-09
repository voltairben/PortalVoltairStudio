"use client";

import dynamic from "next/dynamic";
import type { UploadTarget } from "@/lib/data/admin";

/**
 * The resumable-upload engine (500 MB, pause/resume, EWMA speed) is the only
 * real weight on /admin/deliverables/upload — code-split it so the route shell
 * paints immediately and the engine streams in behind a fixed-height skeleton.
 */
const DeliverableUpload = dynamic(
  () => import("@/components/admin/deliverable-upload").then((m) => m.DeliverableUpload),
  {
    ssr: false,
    loading: () => (
      <div className="min-h-80 animate-pulse rounded-xl border border-zinc-800 bg-surface-1" />
    ),
  },
);

export function DeliverableUploadLazy(props: {
  targets: UploadTarget[];
  preselectedProjectId?: string;
}) {
  return <DeliverableUpload {...props} />;
}
