"use client";

import { ArrowDown, ArrowUp, Check, Circle, Dot, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { updateMilestones } from "@/lib/actions/admin";
import { cn } from "@/lib/utils";
import type { Milestone, MilestoneStatus } from "@/types";

interface Draft {
  id: string;
  title: string;
  status: MilestoneStatus;
  targetDate: string | null; // ISO or null
}

const STATUS_CYCLE: MilestoneStatus[] = ["pending", "active", "complete"];

const toInput = (iso: string | null) => (iso ? iso.slice(0, 10) : "");
const fromInput = (v: string) => (v ? `${v}T00:00:00.000Z` : null);

export function MilestoneEditor({
  projectId,
  milestones,
}: {
  projectId: string;
  milestones: Milestone[];
}) {
  const router = useRouter();
  const [drafts, setDrafts] = useState<Draft[]>(() =>
    milestones.map((m) => ({ id: m.id, title: m.title, status: m.status, targetDate: m.targetDate })),
  );
  const [saved, setSaved] = useState<Draft[]>(drafts);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const dirty = JSON.stringify(drafts) !== JSON.stringify(saved);

  function patch(index: number, next: Partial<Draft>) {
    setDrafts((prev) => prev.map((d, i) => (i === index ? { ...d, ...next } : d)));
  }
  function move(index: number, dir: -1 | 1) {
    setDrafts((prev) => {
      const next = [...prev];
      const target = index + dir;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }
  function add() {
    setDrafts((prev) => [
      ...prev,
      { id: crypto.randomUUID(), title: "", status: "pending", targetDate: null },
    ]);
  }
  function remove(index: number) {
    setDrafts((prev) => prev.filter((_, i) => i !== index));
  }

  function save() {
    setError(null);
    startTransition(async () => {
      const result = await updateMilestones({
        projectId,
        milestones: drafts
          .filter((d) => d.title.trim())
          .map((d) => ({
            id: d.id,
            title: d.title.trim(),
            status: d.status,
            targetDate: d.targetDate,
          })),
      });
      if (result.ok) {
        setSaved(drafts);
        router.refresh();
      } else {
        setError(result.error ?? "Could not save milestones.");
      }
    });
  }

  return (
    <div className="space-y-3">
      <ol className="space-y-2">
        {drafts.map((d, i) => (
          <li
            key={d.id}
            className="flex flex-wrap items-center gap-2 rounded-lg border border-zinc-800 bg-surface-1 p-2.5"
          >
            <button
              type="button"
              aria-label="Cycle status"
              onClick={() =>
                patch(i, {
                  status: STATUS_CYCLE[(STATUS_CYCLE.indexOf(d.status) + 1) % 3],
                })
              }
              className={cn(
                "grid size-7 shrink-0 place-items-center rounded-full border transition-colors",
                d.status === "complete" && "border-brand-persimmon bg-brand-persimmon text-brand-persimmon-fg",
                d.status === "active" && "border-brand-persimmon text-brand-persimmon",
                d.status === "pending" && "border-zinc-700 text-ink-subtle",
              )}
            >
              {d.status === "complete" ? (
                <Check className="size-3.5" strokeWidth={3} />
              ) : d.status === "active" ? (
                <Dot className="size-5" />
              ) : (
                <Circle className="size-2.5" />
              )}
            </button>

            <input
              value={d.title}
              onChange={(e) => patch(i, { title: e.target.value })}
              placeholder="Milestone title"
              className="h-9 min-w-40 flex-1 rounded-md border border-zinc-800 bg-brand-obsidian px-2.5 text-[13px] text-ink placeholder:text-ink-subtle focus:border-brand-persimmon focus:outline-none"
            />

            <input
              type="date"
              value={toInput(d.targetDate)}
              onChange={(e) => patch(i, { targetDate: fromInput(e.target.value) })}
              className="h-9 rounded-md border border-zinc-800 bg-brand-obsidian px-2 text-[12px] text-ink-muted focus:border-brand-persimmon focus:outline-none [color-scheme:dark]"
            />

            <div className="flex items-center">
              <IconBtn label="Move up" onClick={() => move(i, -1)} disabled={i === 0}>
                <ArrowUp className="size-3.5" />
              </IconBtn>
              <IconBtn
                label="Move down"
                onClick={() => move(i, 1)}
                disabled={i === drafts.length - 1}
              >
                <ArrowDown className="size-3.5" />
              </IconBtn>
              <IconBtn label="Remove" onClick={() => remove(i)} danger>
                <Trash2 className="size-3.5" />
              </IconBtn>
            </div>
          </li>
        ))}
      </ol>

      <button
        type="button"
        onClick={add}
        className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-zinc-700 py-2 text-[12px] text-ink-subtle transition-colors hover:border-brand-persimmon hover:text-brand-persimmon"
      >
        <Plus className="size-3.5" />
        Add milestone
      </button>

      {error && <p className="text-[12px] text-critical">{error}</p>}

      <div className="flex items-center gap-3">
        <Button onClick={save} disabled={!dirty} loading={pending} className="h-9 px-4 text-[13px]">
          {pending ? "Saving…" : "Save milestones"}
        </Button>
        {dirty && !pending && <span className="text-[11px] text-caution">Unsaved changes</span>}
      </div>
    </div>
  );
}

function IconBtn({
  label,
  onClick,
  disabled,
  danger,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "grid size-7 place-items-center rounded-md text-ink-subtle transition-colors disabled:opacity-30",
        danger ? "hover:text-critical" : "hover:text-ink",
      )}
    >
      {children}
    </button>
  );
}
