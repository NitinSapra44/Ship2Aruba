import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { formatDate } from "@/lib/utils";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Package } from "@/types";

export default async function ClientDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient();

  const { data: client } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", params.id)
    .single();

  if (!client) notFound();

  const { data: packages } = await supabase
    .from("packages")
    .select("*")
    .eq("client_id", params.id)
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6 animate-fade-in max-w-3xl">
      <div>
        <Link
          href="/admin/clients"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ChevronLeft className="w-4 h-4" /> All Clients
        </Link>
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-xl font-bold text-primary">
            {client.full_name.charAt(0)}
          </div>
          <div>
            <h1 className="text-2xl font-bold">{client.full_name}</h1>
            <p className="text-sm text-muted-foreground">{client.email}</p>
          </div>
          <span className="ml-auto font-mono font-bold text-lg">{client.suite_number}</span>
        </div>
      </div>

      <div>
        <h2 className="text-base font-semibold mb-3">Packages ({packages?.length ?? 0})</h2>
        <Card>
          <div className="divide-y">
            {packages?.map((pkg: Package) => (
              <Link
                key={pkg.id}
                href={`/admin/packages/${pkg.id}`}
                className="flex items-center justify-between px-6 py-4 hover:bg-muted/40 transition-colors group"
              >
                <div>
                  <p className="font-mono text-sm font-medium">{pkg.tracking_number}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{pkg.contents_description}</p>
                </div>
                <div className="flex items-center gap-3">
                  <p className="text-xs text-muted-foreground">{formatDate(pkg.created_at)}</p>
                  <StatusBadge status={pkg.status} />
                  <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                </div>
              </Link>
            ))}
            {!packages?.length && (
              <div className="px-6 py-10 text-center text-sm text-muted-foreground">
                No packages yet
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
