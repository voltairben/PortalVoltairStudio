"use client";

import { collection, limit, onSnapshot, orderBy, query } from "firebase/firestore";
import { ExternalLink, Paperclip, Reply, Send } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState, useTransition } from "react";
import { DeliverableStatusBadge } from "@/components/portal/deliverable-status";
import { Button } from "@/components/ui/button";
import { useFirebaseUser } from "@/hooks/use-firebase-user";
import { postStudioReply } from "@/lib/actions/admin";
import type { InboxData } from "@/lib/data/admin";
import { db } from "@/lib/firebase/client";
import { initialsOf, relativeTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { COLLECTIONS, type Deliverable, type DeliverableStatus, type FeedbackItem } from "@/types";

const TABS: { key: "all" | DeliverableStatus; label: string }[] = [
  { key: "all", label: "All" },
  { key: "pending", label: "Pending review" },
  { key: "changes-requested", label: "Changes requested" },
  { key: "approved", label: "Approved" },
];

export function StudioInbox({ data }: { data: InboxData }) {
  const { user } = useFirebaseUser();
  const [comments, setComments] = useState<FeedbackItem[]>(data.comments);
  const [deliverables, setDeliverables] = useState<Deliverable[]>(data.deliverables);
  const [tab, setTab] = useState<(typeof TABS)[number]["key"]>("all");

  const projectNames = useMemo(
    () => new Map(data.projects.map((p) => [p.projectId, p.name])),
    [data.projects],
  );
  const clientNames = useMemo(
    () => new Map(data.clients.map((c) => [c.clientId, c.name])),
    [data.clients],
  );
  const statusByDeliverable = useMemo(
    () => new Map(deliverables.map((d) => [d.deliverableId, d.status])),
    [deliverables],
  );

  useEffect(() => {
    if (!user) return;
    const unsubComments = onSnapshot(
      query(collection(db, COLLECTIONS.comments), orderBy("timestamp", "desc"), limit(200)),
      (snap) =>
        setComments(snap.docs.map((d) => ({ ...(d.data() as FeedbackItem), commentId: d.id }))),
      () => {},
    );
    const unsubDeliverables = onSnapshot(
      collection(db, COLLECTIONS.deliverables),
      (snap) => setDeliverables(snap.docs.map((d) => d.data() as Deliverable)),
      () => {},
    );
    return () => {
      unsubComments();
      unsubDeliverables();
    };
  }, [user]);

  const visible = comments.filter((c) => {
    if (tab === "all") return true;
    return statusByDeliverable.get(c.deliverableId) === tab;
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-1.5">
        {TABS.map((t) => {
          const count =
            t.key === "all"
              ? comments.length
              : comments.filter((c) => statusByDeliverable.get(c.deliverableId) === t.key).length;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={cn(
                "rounded-lg border px-3 py-1.5 text-[12px] font-medium transition-colors",
                tab === t.key
                  ? "border-brand-persimmon/40 bg-brand-persimmon/10 text-brand-persimmon"
                  : "border-zinc-800 text-ink-muted hover:text-ink",
              )}
            >
              {t.label}
              <span className="tnum ml-1.5 font-mono text-ink-subtle">{count}</span>
            </button>
          );
        })}
      </div>

      {visible.length === 0 ? (
        <p className="rounded-xl border border-dashed border-zinc-800 bg-surface-1/50 px-4 py-12 text-center text-[13px] text-ink-subtle">
          Nothing here. Client feedback appears the moment it&rsquo;s posted.
        </p>
      ) : (
        <ol className="space-y-3">
          {visible.map((c) => (
            <InboxRow
              key={c.commentId}
              comment={c}
              status={statusByDeliverable.get(c.deliverableId)}
              projectName={projectNames.get(c.projectId) ?? c.projectId}
              clientName={clientNames.get(c.clientId) ?? c.clientId}
            />
          ))}
        </ol>
      )}
    </div>
  );
}

function InboxRow({
  comment,
  status,
  projectName,
  clientName,
}: {
  comment: FeedbackItem;
  status?: DeliverableStatus;
  projectName: string;
  clientName: string;
}) {
  const [replying, setReplying] = useState(false);
  const [text, setText] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const isStudio = comment.userRole === "admin";
  const reviewHref = `/projects/${comment.projectId}/deliverables/${comment.deliverableId}`;

  function submit() {
    const trimmed = text.trim();
    if (!trimmed) return;
    setError(null);
    startTransition(async () => {
      const result = await postStudioReply({
        deliverableId: comment.deliverableId,
        projectId: comment.projectId,
        clientId: comment.clientId,
        text: trimmed,
      });
      if (result.ok) {
        setText("");
        setReplying(false);
      } else {
        setError(result.error ?? "Could not send.");
      }
    });
  }

  return (
    <li className="rounded-xl border border-zinc-800 bg-surface-1 p-4">
      <div className="flex flex-wrap items-center gap-2 text-[11px] text-ink-subtle">
        <span className="font-medium text-ink-muted">{clientName}</span>
        <span>·</span>
        <span>{projectName}</span>
        {status && (
          <span className="ml-auto">
            <DeliverableStatusBadge status={status} />
          </span>
        )}
      </div>

      <div className="mt-2.5 flex gap-3">
        <span
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
            <time
              dateTime={comment.timestamp}
              suppressHydrationWarning
              className="tnum text-[10px] text-ink-subtle"
            >
              {relativeTime(comment.timestamp)}
            </time>
          </div>
          <p className="mt-1 whitespace-pre-wrap text-[13px] leading-6 text-ink-muted">
            {comment.text}
          </p>
          {comment.attachments.length > 0 && (
            <ul className="mt-2 flex flex-wrap gap-1.5">
              {comment.attachments.map((a) => (
                <li key={a.url}>
                  <a
                    href={a.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 rounded-md border border-zinc-800 bg-surface-2 px-2 py-1 text-[11px] text-ink-muted hover:text-ink"
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

      <div className="mt-3 flex items-center gap-3 border-t border-zinc-800 pt-3">
        <Link
          href={reviewHref}
          className="inline-flex items-center gap-1 text-[12px] text-ink-subtle transition-colors hover:text-brand-persimmon"
        >
          <ExternalLink className="size-3.5" />
          Open review
        </Link>
        {!replying && (
          <button
            type="button"
            onClick={() => setReplying(true)}
            className="inline-flex items-center gap-1 text-[12px] text-ink-subtle transition-colors hover:text-ink"
          >
            <Reply className="size-3.5" />
            Reply as studio
          </button>
        )}
      </div>

      {replying && (
        <div className="mt-3 space-y-2">
          <textarea
            value={text}
            autoFocus
            rows={2}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                e.preventDefault();
                submit();
              }
            }}
            placeholder="Reply to the client…"
            className="w-full resize-none rounded-lg border border-zinc-800 bg-brand-obsidian px-3 py-2 text-[13px] text-ink placeholder:text-ink-subtle focus:border-brand-persimmon focus:outline-none focus:ring-2 focus:ring-brand-persimmon/25"
          />
          {error && <p className="text-[11px] text-critical">{error}</p>}
          <div className="flex gap-2">
            <Button onClick={submit} disabled={!text.trim()} loading={pending} className="h-8 px-3 text-[12px]">
              <Send className="size-3" />
              Send
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                setReplying(false);
                setText("");
              }}
              className="h-8 px-3 text-[12px]"
            >
              Cancel
            </Button>
          </div>
        </div>
      )}
    </li>
  );
}
