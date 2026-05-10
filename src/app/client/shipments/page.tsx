import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { formatDate, formatWeight } from "@/lib/utils";
import { Ship, MapPin, CheckCircle2 } from "lucide-react";
import { Package } from "@/types";

export default async function ClientShipmentsPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: packages } = await supabase
    .from("packages")
    .select("*")
    .eq("client_id", user?.id)
    .in("status", ["ship_requested", "shipped", "ready_for_pickup", "delivered"])
    .order("updated_at", { ascending: false });

  const inTransit = packages?.filter((p: Package) =>
    ["ship_requested", "shipped"].includes(p.status)
  );
  const arrived = packages?.filter((p: Package) =>
    ["ready_for_pickup", "delivered"].includes(p.status)
  );

  const statusIcon = (status: string) => {
    if (status === "shipped" || status === "ship_requested") return Ship;
    if (status === "ready_for_pickup") return MapPin;
    return CheckCircle2;
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Shipment Status</h1>
        <p className="text-sm text-muted-foreground mt-1">Track your packages after they've been shipped</p>
      </div>

      {(inTransit?.length ?? 0) > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">In Transit</h2>
          <div className="space-y-3">
            {inTransit?.map((pkg: Package) => {
              const Icon = statusIcon(pkg.status);
              return (
                <Card key={pkg.id}>
                  <CardContent className="pt-5 pb-5">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center">
                        <Icon className="w-5 h-5 text-blue-600" />
                      </div>
                      <div className="flex-1">
                        <p className="font-mono text-sm font-medium">{pkg.tracking_number}</p>
                        <p className="text-xs text-muted-foreground">{pkg.contents_description}</p>
                        <p className="text-xs text-muted-foreground">{formatWeight(pkg.weight_kg)}</p>
                      </div>
                      <div className="text-right">
                        <StatusBadge status={pkg.status} />
                        <p className="text-xs text-muted-foreground mt-1">{formatDate(pkg.updated_at)}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {(arrived?.length ?? 0) > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Arrived in Aruba</h2>
          <div className="space-y-3">
            {arrived?.map((pkg: Package) => {
              const Icon = statusIcon(pkg.status);
              return (
                <Card key={pkg.id} className="opacity-80">
                  <CardContent className="pt-5 pb-5">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center">
                        <Icon className="w-5 h-5 text-emerald-600" />
                      </div>
                      <div className="flex-1">
                        <p className="font-mono text-sm font-medium">{pkg.tracking_number}</p>
                        <p className="text-xs text-muted-foreground">{pkg.contents_description}</p>
                      </div>
                      <div className="text-right">
                        <StatusBadge status={pkg.status} />
                        <p className="text-xs text-muted-foreground mt-1">{formatDate(pkg.updated_at)}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {!packages?.length && (
        <Card>
          <CardContent className="py-16 text-center">
            <Ship className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
            <p className="font-medium">No shipments yet</p>
            <p className="text-sm text-muted-foreground mt-1">
              Packages will appear here after you submit a ship request
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
