import type { Metadata } from "next";
import { PageHeader } from "@/components/admin/page-header";
import { StudioInbox } from "@/components/admin/studio-inbox";
import { getInboxData } from "@/lib/data/admin";
import { requireAdmin } from "@/lib/firebase/session";

export const metadata: Metadata = { title: "Studio Inbox" };

export default async function StudioInboxPage() {
  await requireAdmin();
  const data = await getInboxData();

  return (
    <div className="space-y-7">
      <PageHeader
        title="Studio inbox"
        subtitle="Every client comment and decision, across all projects, in real time."
      />
      <StudioInbox data={data} />
    </div>
  );
}
