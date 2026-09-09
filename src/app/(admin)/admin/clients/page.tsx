import type { Metadata } from "next";
import { ClientOnboardModal } from "@/components/admin/client-onboard-modal";
import { ClientsTable } from "@/components/admin/clients-table";
import { PageHeader } from "@/components/admin/page-header";
import { getAllClients } from "@/lib/data/admin";
import { requireAdmin } from "@/lib/firebase/session";

export const metadata: Metadata = { title: "Clients" };

export default async function AdminClientsPage({
  searchParams,
}: {
  searchParams: Promise<{ new?: string }>;
}) {
  await requireAdmin();
  const [{ new: newParam }, clients] = await Promise.all([searchParams, getAllClients()]);

  return (
    <div className="space-y-7">
      <PageHeader
        title="Clients"
        subtitle={`${clients.length} client ${clients.length === 1 ? "company" : "companies"}`}
        action={<ClientOnboardModal openOnLoad={newParam === "1"} />}
      />
      <ClientsTable clients={clients} />
    </div>
  );
}
