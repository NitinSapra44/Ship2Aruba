import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import Link from "next/link";
import { Package, FileSearch, CheckCircle2, Ship, MapPin, ChevronRight } from "lucide-react";
import { STATUS_LABELS } from "@/types";

export default async function ClientDashboard() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: packages } = await supabase
    .from("packages")
    .select("status")
    .eq("client_id", user?.id);

  const byStatus: Record<string, number> = {};
  packages?.forEach((p) => {
    byStatus[p.status] = (byStatus[p.status] || 0) + 1;
  });

  const total = packages?.length ?? 0;

  const statusSummary = [
    { key: "ready_to_send", icon: Package, color: "text-slate-600", bg: "bg-slate-50", href: "/client/packages" },
    { key: "pending_invoice_review", icon: FileSearch, color: "text-amber-600", bg: "bg-amber-50", href: "/client/upload-invoice" },
    { key: "invoice_approved", icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-50", href: "/client/ship-request" },
    { key: "ship_requested", icon: Ship, color: "text-blue-600", bg: "bg-blue-50", href: "/client/shipments" },
    { key: "shipped", icon: Ship, color: "text-violet-600", bg: "bg-violet-50", href: "/client/shipments" },
    { key: "delivered", icon: MapPin, color: "text-green-600", bg: "bg-green-50", href: "/client/shipments" },
  ];

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">My Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">
          You have {total} package{total !== 1 ? "s" : ""} in the system
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {statusSummary.map(({ key, icon: Icon, color, bg, href }) => {
          const count = byStatus[key] ?? 0;
          if (count === 0) return null;
          return (
            <Link key={key} href={href}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="pt-5 pb-5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-lg ${bg} flex items-center justify-center`}>
                        <Icon className={`w-4 h-4 ${color}`} />
                      </div>
                      <div>
                        <p className="text-xl font-bold">{count}</p>
                        <p className="text-xs text-muted-foreground leading-tight">
                          {STATUS_LABELS[key as keyof typeof STATUS_LABELS]}
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      {total === 0 && (
        <Card>
          <CardContent className="py-16 text-center">
            <Package className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
            <p className="font-medium">No packages yet</p>
            <p className="text-sm text-muted-foreground mt-1">
              Your packages will appear here once they arrive at the warehouse
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
