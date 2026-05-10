import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Boxes, Users, FileSearch, Package, CheckCircle2, Ship, MapPin } from "lucide-react";

async function getDashboardStats() {
  const supabase = createClient();

  const [
    { count: totalPackages },
    { data: statusCounts },
    { count: totalClients },
    { count: pendingInvoices },
  ] = await Promise.all([
    supabase.from("packages").select("*", { count: "exact", head: true }),
    supabase.from("packages").select("status"),
    supabase.from("profiles").select("*", { count: "exact", head: true }).eq("role", "client"),
    supabase
      .from("invoices")
      .select("*", { count: "exact", head: true })
      .eq("review_status", "pending"),
  ]);

  const byStatus: Record<string, number> = {};
  statusCounts?.forEach((p) => {
    byStatus[p.status] = (byStatus[p.status] || 0) + 1;
  });

  return { totalPackages, byStatus, totalClients, pendingInvoices };
}

export default async function AdminDashboard() {
  const { totalPackages, byStatus, totalClients, pendingInvoices } = await getDashboardStats();

  const statusCards = [
    { label: "Ready to Send", key: "ready_to_send", icon: Package, color: "text-slate-600" },
    { label: "Pending Invoice Review", key: "pending_invoice_review", icon: FileSearch, color: "text-amber-600" },
    { label: "Invoice Approved", key: "invoice_approved", icon: CheckCircle2, color: "text-emerald-600" },
    { label: "Ship Requested", key: "ship_requested", icon: Ship, color: "text-blue-600" },
    { label: "Shipped", key: "shipped", icon: Ship, color: "text-violet-600" },
    { label: "Delivered", key: "delivered", icon: MapPin, color: "text-green-600" },
  ];

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-1">Overview of your package forwarding operations</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Boxes className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalPackages ?? 0}</p>
                <p className="text-xs text-muted-foreground">Total Packages</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center">
                <FileSearch className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{pendingInvoices ?? 0}</p>
                <p className="text-xs text-muted-foreground">Pending Invoice Reviews</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center">
                <Users className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalClients ?? 0}</p>
                <p className="text-xs text-muted-foreground">Total Clients</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Status breakdown */}
      <div>
        <h2 className="text-base font-semibold mb-4">Packages by Status</h2>
        <div className="grid grid-cols-3 gap-3">
          {statusCards.map(({ label, key, icon: Icon, color }) => (
            <Card key={key} className="hover:shadow-md transition-shadow">
              <CardContent className="pt-5 pb-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xl font-bold">{byStatus[key] ?? 0}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
                  </div>
                  <Icon className={`w-5 h-5 ${color}`} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
