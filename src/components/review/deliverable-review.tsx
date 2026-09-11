"use client";

import { Download, UploadCloud } from "lucide-react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRef } from "react";
import { DELIVERABLE_STATUS_META } from "@/components/portal/deliverable-status";
import type { ComposerHandle } from "@/components/review/comment-composer";
import { CommentThread } from "@/components/review/comment-thread";
import { DecisionPanel } from "@/components/review/decision-panel";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Deliverable, DeliverableStatus, FeedbackItem } from "@/types";

// The three review tools are code-split: a given deliverable renders exactly one,
// so the other two never reach the browser. A fixed-height skeleton holds the
// layout so swapping the real tool in causes no CLS.
const ViewerSkeleton = () => (
  <div className="min-h-[60vh] animate-pulse rounded-xl border border-zinc-800 bg-surface-1" />
);

const VideoPlayer = dynamic(
  () => import("@/components/review/video-player").then((m) => m.VideoPlayer),
  { ssr: false, loading: ViewerSkeleton },
);
const ImageViewer = dynamic(
  () => import("@/components/review/image-viewer").then((m) => m.ImageViewer),
  { ssr: false, loading: ViewerSkeleton },
);
const PdfViewer = dynamic(
  () => import("@/components/review/pdf-viewer").then((m) => m.PdfViewer),
  { ssr: false, loading: ViewerSkeleton },
);
const GalleryViewer = dynamic(
  () => import("@/components/review/gallery-viewer").then((m) => m.GalleryViewer),
  { ssr: false, loading: ViewerSkeleton },
);

const CHANGES_PREFILL = "[Changes Requested] ";

const STUDIO_STATUS_BLOCK: Record<DeliverableStatus, string> = {
  pending: "border-caution/30 bg-caution/10 text-caution",
  approved: "border-positive/30 bg-positive/10 text-positive",
  "changes-requested": "border-critical/30 bg-critical/10 text-critical",
};

const STUDIO_STATUS_NOTE: Record<DeliverableStatus, string> = {
  pending: "Waiting on the client to review this version.",
  approved: "The client approved this version.",
  "changes-requested": "The client asked for changes — see the thread, then upload a new version.",
};

/** Read-only status for the studio side (the client owns approve / request-changes). */
function StudioStatusCard({
  status,
  decidedAt,
  projectId,
}: {
  status: DeliverableStatus;
  decidedAt: string | null;
  projectId: string;
}) {
  const meta = DELIVERABLE_STATUS_META[status];
  return (
    <div className="rounded-xl border border-zinc-800 bg-surface-1 p-5">
      <div
        className={cn(
          "flex items-center gap-2.5 rounded-lg border px-3 py-2.5 text-[13px] font-medium",
          STUDIO_STATUS_BLOCK[status],
        )}
      >
        <meta.Icon className="size-4 shrink-0" />
        <span>{meta.label}</span>
        {decidedAt && status !== "pending" && (
          <span className="tnum ml-auto font-mono text-[11px] opacity-70">
            {formatDate(decidedAt)}
          </span>
        )}
      </div>
      <p className="mt-3 text-[13px] leading-6 text-ink-muted">{STUDIO_STATUS_NOTE[status]}</p>
      <Link
        href={`/admin/deliverables/upload?project=${projectId}`}
        className="mt-4 inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-zinc-800 bg-surface-2 text-[13px] font-medium text-ink transition-colors hover:border-brand-persimmon hover:text-brand-persimmon"
      >
        <UploadCloud className="size-4" />
        Upload new version
      </Link>
    </div>
  );
}

/** Select the appropriate asset viewer and render the deliverable review workspace. */
export function DeliverableReview({
  deliverable,
  projectId,
  user,
  initialComments,
  asStudio = false,
}: {
  deliverable: Deliverable;
  projectId: string;
  user: { uid: string; name: string; clientId: string };
  initialComments: FeedbackItem[];
  asStudio?: boolean;
}) {
  const composerRef = useRef<ComposerHandle>(null);

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
      <div className="min-w-0">
        {deliverable.kind === "designs" && deliverable.assets.length > 1 ? (
          <GalleryViewer assets={deliverable.assets} name={deliverable.name} />
        ) : deliverable.assets[0]?.type === "video" ? (
          <VideoPlayer src={deliverable.assets[0].url} />
        ) : deliverable.assets[0]?.type === "image" ? (
          <ImageViewer src={deliverable.assets[0].url} alt={deliverable.name} />
        ) : deliverable.assets[0]?.type === "pdf" ? (
          <PdfViewer src={deliverable.assets[0].url} name={deliverable.name} />
        ) : (
          <a
            href={deliverable.fileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 rounded-xl border border-dashed border-zinc-800 bg-surface-1 px-4 py-16 text-[13px] text-ink-muted transition-colors hover:border-brand-persimmon hover:text-ink"
          >
            <Download className="size-4" />
            Download {deliverable.name}
          </a>
        )}
      </div>

      <aside className="space-y-4 lg:sticky lg:top-6 lg:self-start">
        {asStudio ? (
          <StudioStatusCard
            status={deliverable.status}
            decidedAt={deliverable.decidedAt}
            projectId={projectId}
          />
        ) : (
          <DecisionPanel
            deliverableId={deliverable.deliverableId}
            projectId={projectId}
            status={deliverable.status}
            decidedAt={deliverable.decidedAt}
            onRequestChanges={() => composerRef.current?.insertPrefix(CHANGES_PREFILL)}
          />
        )}
        <div className="lg:max-h-[calc(100dvh-22rem)]">
          <CommentThread
            deliverableId={deliverable.deliverableId}
            projectId={projectId}
            clientId={user.clientId}
            authorName={user.name}
            initialComments={initialComments}
            composerRef={composerRef}
            mode={asStudio ? "studio" : "client"}
          />
        </div>
      </aside>
    </div>
  );
}
