import { CircleCheck, Clock3, PencilLine } from "lucide-react";
import type { ComponentType } from "react";
import { Badge, type BadgeTone } from "@/components/ui/badge";
import type { DeliverableStatus } from "@/types";

interface StatusMeta {
  label: string;
  tone: BadgeTone;
  Icon: ComponentType<{ className?: string }>;
}

export const DELIVERABLE_STATUS_META: Record<DeliverableStatus, StatusMeta> = {
  pending: { label: "Pending review", tone: "caution", Icon: Clock3 },
  approved: { label: "Approved", tone: "positive", Icon: CircleCheck },
  "changes-requested": { label: "Changes requested", tone: "critical", Icon: PencilLine },
};

export function DeliverableStatusBadge({ status }: { status: DeliverableStatus }) {
  const meta = DELIVERABLE_STATUS_META[status];
  return (
    <Badge tone={meta.tone}>
      <meta.Icon className="size-3" />
      {meta.label}
    </Badge>
  );
}
