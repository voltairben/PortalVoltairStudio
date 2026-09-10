"use client";

import { ArrowUpRight, GitCommitHorizontal, GitPullRequest, Rocket } from "lucide-react";
import { useProjectPulse } from "@/hooks/use-project-pulse";
import { relativeTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { DeploymentState, ProjectDeployment, PulseEvent, PulseKind } from "@/types";

interface Props {
  projectId: string;
  clientId: string;
  initialEvents: PulseEvent[];
  initialDeployment: ProjectDeployment | null;
}

const KIND_ICON: Record<PulseKind, typeof GitCommitHorizontal> = {
  commit: GitCommitHorizontal,
  "pull-request": GitPullRequest,
  deployment: Rocket,
};

const DEPLOY_UI: Record<DeploymentState | "none", { label: string; dot: string; text: string }> = {
  ready: { label: "Live staging preview", dot: "bg-positive", text: "text-positive" },
  building: { label: "Building…", dot: "bg-caution animate-pulse", text: "text-caution" },
  queued: { label: "Build queued", dot: "bg-caution animate-pulse", text: "text-caution" },
  error: { label: "Deployment issue", dot: "bg-critical", text: "text-critical" },
  canceled: { label: "Deployment canceled", dot: "bg-ink-subtle", text: "text-ink-muted" },
  none: { label: "No deploys yet", dot: "bg-ink-subtle", text: "text-ink-subtle" },
};

export function DeveloperPulse({ projectId, clientId, initialEvents, initialDeployment }: Props) {
  const { events, deployment, status } = useProjectPulse({
    projectId,
    clientId,
    initialEvents,
    initialDeployment,
  });

  const ui = DEPLOY_UI[deployment?.state ?? "none"];

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2">
        <h2 className="text-2xs font-semibold uppercase tracking-[0.15em] text-ink-subtle">
          Developer Pulse
        </h2>
        <span
          className={cn(
            "size-1.5 rounded-full",
            status === "live" ? "bg-positive" : status === "offline" ? "bg-ink-subtle" : "bg-caution",
          )}
          title={status === "offline" ? "Showing saved data" : status === "live" ? "Live" : "Connecting"}
        />
      </div>

      {/* Deployment status card */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl border border-zinc-800 bg-surface-1 px-4 py-3">
        <span className={cn("size-2.5 shrink-0 rounded-full", ui.dot)} aria-hidden />
        <span className={cn("text-[13px] font-medium", ui.text)}>{ui.label}</span>
        {deployment?.branch && (
          <span className="tnum rounded-md border border-zinc-800 bg-surface-2 px-1.5 py-0.5 font-mono text-[11px] text-ink-muted">
            {deployment.branch}
          </span>
        )}
        {deployment?.updatedAt && (
          <time
            dateTime={deployment.updatedAt}
            suppressHydrationWarning
            className="tnum text-[11px] text-ink-subtle"
          >
            {relativeTime(deployment.updatedAt)}
          </time>
        )}
        {deployment?.url && (
          <a
            href={deployment.url}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-auto inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-line-strong px-3 text-[12px] font-medium text-ink transition-colors hover:border-brand-persimmon hover:text-brand-persimmon"
          >
            Open preview
            <ArrowUpRight className="size-3.5" />
          </a>
        )}
      </div>

      {/* Development velocity stream */}
      {events.length === 0 ? (
        <p className="rounded-xl border border-dashed border-zinc-800 bg-surface-1/50 px-4 py-8 text-center text-[13px] text-ink-subtle">
          Commits and deploys for this project will appear here as the team works.
        </p>
      ) : (
        <ol className="divide-y divide-zinc-800 overflow-hidden rounded-xl border border-zinc-800 bg-surface-1">
          {events.map((e) => {
            const Icon = KIND_ICON[e.kind];
            const Row = e.url ? "a" : "div";
            return (
              <li key={e.id}>
                <Row
                  {...(e.url
                    ? { href: e.url, target: "_blank", rel: "noopener noreferrer" }
                    : {})}
                  className={cn(
                    "flex items-start gap-3 px-4 py-3",
                    e.url && "group transition-colors hover:bg-surface-2/50",
                  )}
                >
                  <span
                    className={cn(
                      "mt-0.5 grid size-7 shrink-0 place-items-center rounded-full border",
                      e.state === "error"
                        ? "border-critical/30 bg-critical/10 text-critical"
                        : e.kind === "deployment"
                          ? "border-brand-persimmon/30 bg-brand-persimmon/10 text-brand-persimmon"
                          : "border-zinc-800 bg-surface-2 text-ink-muted",
                    )}
                  >
                    <Icon className="size-3.5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] text-ink">{e.title}</p>
                    <p className="tnum mt-0.5 truncate text-[11px] text-ink-subtle">
                      {e.detail ? `${e.detail} · ` : ""}
                      <time dateTime={e.createdAt} suppressHydrationWarning>
                        {relativeTime(e.createdAt)}
                      </time>
                    </p>
                  </div>
                  {e.url && (
                    <ArrowUpRight className="mt-0.5 size-4 shrink-0 text-ink-subtle transition-colors group-hover:text-brand-persimmon" />
                  )}
                </Row>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
