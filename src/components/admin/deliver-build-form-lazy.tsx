"use client";

import dynamic from "next/dynamic";
import type { UploadTarget } from "@/lib/data/admin";

const DeliverBuildForm = dynamic(
  () => import("@/components/admin/deliver-build-form").then((m) => m.DeliverBuildForm),
  {
    ssr: false,
    loading: () => (
      <div className="min-h-80 animate-pulse rounded-xl border border-zinc-800 bg-surface-1" />
    ),
  },
);

export function DeliverBuildFormLazy(props: {
  targets: UploadTarget[];
  preselectedProjectId?: string;
}) {
  return <DeliverBuildForm {...props} />;
}
