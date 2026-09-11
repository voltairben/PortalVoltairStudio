"use client";

import {
  CircleCheck,
  PencilLine,
  UploadCloud,
  UserPlus,
  Waypoints,
} from "lucide-react";
import Link from "next/link";
import { collection, limit, onSnapshot, orderBy, query } from "firebase/firestore";
import { useEffect, useState } from "react";
import { useFirebaseUser } from "@/hooks/use-firebase-user";
import { db } from "@/lib/firebase/client";
import { relativeTime } from "@/lib/format";
import { type Activity, type ActivityType, COLLECTIONS } from "@/types";

const ICONS: Record<ActivityType, typeof CircleCheck> = {
  "client-onboarded": UserPlus,
  "project-created": Waypoints,
  "deliverable-published": UploadCloud,
  "deliverable-approved": CircleCheck,
  "deliverable-changes-requested": PencilLine,
};

export function ActivityStream({ initial }: { initial: Activity[] }) {
  const { user } = useFirebaseUser();
  const [items, setItems] = useState<Activity[]>(initial);

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, COLLECTIONS.activity),
      orderBy("createdAt", "desc"),
      limit(20),
    );
    return onSnapshot(
      q,
      (snap) => setItems(snap.docs.map((d) => ({ ...(d.data() as Activity), id: d.id }))),
      () => {},
    );
  }, [user]);

  if (items.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-zinc-800 bg-surface-1/50 px-4 py-10 text-center text-[13px] text-ink-subtle">
        Client actions across every project will stream in here.
      </p>
    );
  }

  return (
    <ol className="divide-y divide-zinc-800 overflow-hidden rounded-xl border border-zinc-800 bg-surface-1">
      {items.map((item) => {
        const Icon = ICONS[item.type];
        const href =
          item.projectId && item.deliverableId
            ? `/admin/projects/${item.projectId}/deliverables/${item.deliverableId}`
            : item.projectId
              ? `/admin/projects/${item.projectId}`
              : "/admin/clients";
        return (
          <li key={item.id}>
            <Link
              href={href}
              className="flex items-start gap-3 px-4 py-3 transition-colors hover:bg-surface-2/50"
            >
              <span
                className={
                  item.actorRole === "client"
                    ? "mt-0.5 grid size-7 shrink-0 place-items-center rounded-full border border-brand-persimmon/30 bg-brand-persimmon/10 text-brand-persimmon"
                    : "mt-0.5 grid size-7 shrink-0 place-items-center rounded-full border border-zinc-800 bg-surface-2 text-ink-muted"
                }
              >
                <Icon className="size-3.5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[13px] text-ink">{item.summary}</p>
                <p className="tnum mt-0.5 text-[11px] text-ink-subtle">
                  {item.projectName ? `${item.projectName} · ` : ""}
                  <time dateTime={item.createdAt} suppressHydrationWarning>
                    {relativeTime(item.createdAt)}
                  </time>
                </p>
              </div>
            </Link>
          </li>
        );
      })}
    </ol>
  );
}
