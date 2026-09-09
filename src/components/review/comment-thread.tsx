"use client";

import { CloudOff, Loader2, Paperclip, RadioTower } from "lucide-react";
import { type Ref, useEffect, useRef } from "react";
import { CommentComposer, type ComposerHandle } from "@/components/review/comment-composer";
import { type ThreadComment, type ThreadStatus, useFeedbackThread } from "@/hooks/use-feedback-thread";
import { initialsOf, relativeTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { FeedbackItem } from "@/types";

export function CommentThread({
  deliverableId,
  projectId,
  clientId,
  authorName,
  initialComments,
  composerRef,
}: {
  deliverableId: string;
  projectId: string;
  clientId: string;
  authorName: string;
  initialComments: FeedbackItem[];
  composerRef?: Ref<ComposerHandle>;
}) {
  const { comments, status, post, postError, ready } = useFeedbackThread({
    deliverableId,
    projectId,
    clientId,
    authorName,
    initialComments,
  });
  const scrollRef = useRef<HTMLDivElement>(null);
  const lastPending = comments.at(-1)?.pending ?? false;

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [comments.length, lastPending]);

  return (
    <div className="flex h-full min-h-[420px] flex-col overflow-hidden rounded-xl border border-zinc-800 bg-surface-1">
      <header className="flex items-center justify-between border-b border-zinc-800 px-4 py-2.5">
        <h2 className="text-[13px] font-semibold text-ink">
          Feedback{" "}
          <span className="tnum font-mono text-ink-subtle">({comments.length})</span>
        </h2>
        <StatusPill status={status} />
      </header>

      <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
        {comments.length === 0 ? (
          <p className="py-10 text-center text-[12px] text-ink-subtle">
            No comments yet. Leave a note for the studio.
          </p>
        ) : (
          comments.map((comment) => (
            <CommentRow key={comment.commentId} comment={comment} threadStatus={status} />
          ))
        )}
      </div>

      {postError && (
        <p className="border-t border-critical/20 bg-critical/5 px-4 py-2 text-[11px] text-critical">
          {postError}
        </p>
      )}

      <CommentComposer clientId={clientId} disabled={!ready} onPost={post} ref={composerRef} />
    </div>
  );
}

function CommentRow({
  comment,
  threadStatus,
}: {
  comment: ThreadComment;
  threadStatus: ThreadStatus;
}) {
  const isStudio = comment.userRole === "admin";
  return (
    <div className="flex gap-3">
      <span
        aria-hidden
        className={cn(
          "mt-0.5 grid size-7 shrink-0 place-items-center rounded-full border text-[10px] font-semibold",
          isStudio
            ? "border-brand-persimmon/40 bg-brand-persimmon/10 text-brand-persimmon"
            : "border-zinc-800 bg-surface-2 text-ink-muted",
        )}
      >
        {initialsOf(comment.userName)}
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-[12px] font-medium text-ink">{comment.userName}</span>
          {!isStudio && (
            <span className="rounded border border-zinc-800 bg-surface-2 px-1 py-px text-[9px] font-medium uppercase tracking-wide text-ink-subtle">
              Client
            </span>
          )}
          {comment.pending ? (
            <span className="flex items-center gap-1 text-[10px] text-ink-subtle">
              {threadStatus === "offline" ? (
                <>
                  <CloudOff className="size-3" />
                  Queued
                </>
              ) : (
                <>
                  <Loader2 className="size-3 animate-spin" />
                  Sending
                </>
              )}
            </span>
          ) : (
            <time
              dateTime={comment.timestamp}
              suppressHydrationWarning
              className="tnum text-[10px] text-ink-subtle"
            >
              {relativeTime(comment.timestamp)}
            </time>
          )}
        </div>

        <p className="mt-1 whitespace-pre-wrap text-[13px] leading-6 text-ink-muted">{comment.text}</p>

        {comment.attachments.length > 0 && (
          <ul className="mt-2 flex flex-wrap gap-1.5">
            {comment.attachments.map((a) => (
              <li key={a.url}>
                <a
                  href={a.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 rounded-md border border-zinc-800 bg-surface-2 px-2 py-1 text-[11px] text-ink-muted transition-colors hover:border-brand-persimmon hover:text-ink"
                >
                  <Paperclip className="size-3" />
                  <span className="max-w-40 truncate">{a.name}</span>
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

const STATUS_META: Record<ThreadStatus, { label: string; className: string; Icon: typeof RadioTower }> = {
  connecting: { label: "Connecting", className: "text-ink-subtle", Icon: Loader2 },
  live: { label: "Live", className: "text-positive", Icon: RadioTower },
  offline: { label: "Offline", className: "text-caution", Icon: CloudOff },
  error: { label: "Reconnecting", className: "text-ink-subtle", Icon: Loader2 },
};

function StatusPill({ status }: { status: ThreadStatus }) {
  const meta = STATUS_META[status];
  return (
    <span className={cn("flex items-center gap-1.5 text-[10px] font-medium", meta.className)}>
      <meta.Icon className={cn("size-3", status !== "live" && status !== "offline" && "animate-spin")} />
      {meta.label}
    </span>
  );
}
