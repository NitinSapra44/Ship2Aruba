import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { ChevronRight, User } from "lucide-react";

export default async function AdminClientsPage() {
  const supabase = createClient();

  const { data: clients } = await supabase
    .from("profiles")
    .select("*")
    .eq("role", "client")
    .order("full_name");

  // Get package counts
  const clientIds = clients?.map((c) => c.id) || [];
  const { data: pkgCounts } = await supabase
    .from("packages")
    .select("client_id")
    .in("client_id", clientIds);

  const countMap: Record<string, number> = {};
  pkgCounts?.forEach((p) => {
    countMap[p.client_id] = (countMap[p.client_id] || 0) + 1;
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Clients</h1>
        <p className="text-sm text-muted-foreground mt-1">{clients?.length ?? 0} registered clients</p>
      </div>

      <Card>
        <div className="divide-y">
          {clients?.map((client) => (
            <Link
              key={client.id}
              href={`/admin/clients/${client.id}`}
              className="flex items-center justify-between px-6 py-4 hover:bg-muted/40 transition-colors group"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                  {client.full_name.charAt(0)}
                </div>
                <div>
                  <p className="font-medium text-sm">{client.full_name}</p>
                  <p className="text-xs text-muted-foreground">{client.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="font-mono text-xs font-bold">{client.suite_number}</p>
                  <p className="text-xs text-muted-foreground">{countMap[client.id] ?? 0} packages</p>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
              </div>
            </Link>
          ))}
          {!clients?.length && (
            <div className="px-6 py-12 text-center text-sm text-muted-foreground">
              No clients yet
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
