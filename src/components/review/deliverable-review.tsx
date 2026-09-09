"use client";

import { Download } from "lucide-react";
import { useRef } from "react";
import type { ComposerHandle } from "@/components/review/comment-composer";
import { CommentThread } from "@/components/review/comment-thread";
import { DecisionPanel } from "@/components/review/decision-panel";
import { ImageViewer } from "@/components/review/image-viewer";
import { PdfViewer } from "@/components/review/pdf-viewer";
import { VideoPlayer } from "@/components/review/video-player";
import type { Deliverable, FeedbackItem } from "@/types";

const CHANGES_PREFILL = "[Changes Requested] ";

export function DeliverableReview({
  deliverable,
  projectId,
  user,
  initialComments,
}: {
  deliverable: Deliverable;
  projectId: string;
  user: { uid: string; name: string; clientId: string };
  initialComments: FeedbackItem[];
}) {
  const composerRef = useRef<ComposerHandle>(null);

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
      <div className="min-w-0">
        {deliverable.fileType === "video" && <VideoPlayer src={deliverable.fileUrl} />}
        {deliverable.fileType === "image" && (
          <ImageViewer src={deliverable.fileUrl} alt={deliverable.name} />
        )}
        {deliverable.fileType === "document" && (
          <PdfViewer src={deliverable.fileUrl} name={deliverable.name} />
        )}
        {deliverable.fileType === "other" && (
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
        <DecisionPanel
          deliverableId={deliverable.deliverableId}
          projectId={projectId}
          status={deliverable.status}
          decidedAt={deliverable.decidedAt}
          onRequestChanges={() => composerRef.current?.insertPrefix(CHANGES_PREFILL)}
        />
        <div className="lg:max-h-[calc(100dvh-22rem)]">
          <CommentThread
            deliverableId={deliverable.deliverableId}
            projectId={projectId}
            clientId={user.clientId}
            authorName={user.name}
            initialComments={initialComments}
            composerRef={composerRef}
          />
        </div>
      </aside>
    </div>
  );
}
