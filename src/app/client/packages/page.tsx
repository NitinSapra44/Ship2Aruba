import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { formatDate, formatWeight, formatDimensions } from "@/lib/utils";
import { ChevronRight } from "lucide-react";
import { Package } from "@/types";

export default async function ClientPackagesPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: packages } = await supabase
    .from("packages")
    .select("*")
    .eq("client_id", user?.id)
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">My Packages</h1>
        <p className="text-sm text-muted-foreground mt-1">{packages?.length ?? 0} packages total</p>
      </div>

      <Card>
        <div className="divide-y">
          {packages?.map((pkg: Package) => (
            <Link
              key={pkg.id}
              href={`/client/packages/${pkg.id}`}
              className="flex items-center justify-between px-6 py-4 hover:bg-muted/40 transition-colors group"
            >
              <div>
                <p className="font-mono text-sm font-medium">{pkg.tracking_number}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{pkg.contents_description}</p>
                <p className="text-xs text-muted-foreground">
                  {formatWeight(pkg.weight_kg)} · {formatDimensions(pkg.width_cm, pkg.height_cm, pkg.length_cm)}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <StatusBadge status={pkg.status} />
                  <p className="text-xs text-muted-foreground mt-1">{formatDate(pkg.created_at)}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
              </div>
            </Link>
          ))}
          {!packages?.length && (
            <div className="px-6 py-12 text-center text-sm text-muted-foreground">
              No packages yet. They will appear here once logged by the warehouse team.
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
