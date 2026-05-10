import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { formatDate, formatWeight, formatDimensions } from "@/lib/utils";
import { Package } from "@/types";
import { ChevronRight, Search } from "lucide-react";

interface Props {
  searchParams: { q?: string; status?: string };
}

export default async function AdminPackagesPage({ searchParams }: Props) {
  const supabase = createClient();
  const search = searchParams.q || "";

  let query = supabase
    .from("packages")
    .select("*, client:profiles!packages_client_id_fkey(id, full_name, email, suite_number)")
    .order("created_at", { ascending: false });

  if (search) {
    query = query.or(
      `tracking_number.ilike.%${search}%,contents_description.ilike.%${search}%`
    );
  }
  if (searchParams.status) {
    query = query.eq("status", searchParams.status);
  }

  const { data: packages } = await query;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">All Packages</h1>
          <p className="text-sm text-muted-foreground mt-1">{packages?.length ?? 0} packages total</p>
        </div>
      </div>

      {/* Search */}
      <form method="GET">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            name="q"
            defaultValue={search}
            placeholder="Search by tracking number or description…"
            className="w-full pl-9 pr-4 py-2 text-sm border rounded-lg bg-background focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>
      </form>

      <Card>
        <div className="divide-y">
          {packages && packages.length > 0 ? (
            packages.map((pkg: Package & { client: { full_name: string; suite_number: string } }) => (
              <Link
                key={pkg.id}
                href={`/admin/packages/${pkg.id}`}
                className="flex items-center justify-between px-6 py-4 hover:bg-muted/40 transition-colors group"
              >
                <div className="flex items-center gap-4">
                  <div>
                    <p className="font-mono text-sm font-medium">{pkg.tracking_number}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{pkg.contents_description}</p>
                    <p className="text-xs text-muted-foreground">
                      {pkg.client?.full_name} · {pkg.client?.suite_number}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right text-xs text-muted-foreground">
                    <p>{formatWeight(pkg.weight_kg)}</p>
                    <p>{formatDate(pkg.created_at)}</p>
                  </div>
                  <StatusBadge status={pkg.status} />
                  <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                </div>
              </Link>
            ))
          ) : (
            <div className="px-6 py-12 text-center text-sm text-muted-foreground">
              No packages found
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
