"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { formatDateTime } from "@/lib/utils";
import { Ship, Loader2, CheckCircle2, Package } from "lucide-react";
import { toast } from "sonner";

interface ShipRequestRow {
  id: string;
  submitted_at: string;
  status: "pending" | "processed";
  client: { full_name: string; suite_number: string };
  ship_request_packages: {
    package: {
      id: string;
      tracking_number: string;
      contents_description: string;
      status: string;
      weight_kg: number;
    };
  }[];
}

export default function ShipRequestsPage() {
  const [requests, setRequests] = useState<ShipRequestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const supabase = createClient();

  const fetchRequests = async () => {
    const { data } = await supabase
      .from("ship_requests")
      .select(`
        *,
        client:profiles!ship_requests_client_id_fkey(full_name, suite_number),
        ship_request_packages(
          package:packages!ship_request_packages_package_id_fkey(
            id, tracking_number, contents_description, status, weight_kg
          )
        )
      `)
      .order("submitted_at", { ascending: false });
    setRequests(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchRequests(); }, []);

  const processShipRequest = async (request: ShipRequestRow) => {
    setProcessing(request.id);
    const { data: { user } } = await supabase.auth.getUser();

    const packageIds = request.ship_request_packages.map((srp) => srp.package.id);

    // Update all packages to shipped
    for (const pkgId of packageIds) {
      await supabase.from("packages").update({ status: "shipped" }).eq("id", pkgId);
      await supabase.from("status_history").insert({
        package_id: pkgId,
        old_status: "ship_requested",
        new_status: "shipped",
        changed_by_id: user?.id,
        changed_by_role: "admin",
      });
    }

    // Update ship request
    await supabase
      .from("ship_requests")
      .update({ status: "processed", processed_at: new Date().toISOString(), processed_by: user?.id })
      .eq("id", request.id);

    toast.success("Ship request processed — packages marked as Shipped");
    setProcessing(null);
    fetchRequests();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const pending = requests.filter((r) => r.status === "pending");
  const processed = requests.filter((r) => r.status === "processed");

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Ship Requests</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {pending.length} pending · {processed.length} processed
        </p>
      </div>

      {pending.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Pending</h2>
          <div className="space-y-3">
            {pending.map((req) => (
              <Card key={req.id} className="border-blue-100">
                <CardContent className="pt-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <p className="font-semibold text-sm">{req.client.full_name}</p>
                        <span className="font-mono text-xs text-muted-foreground">{req.client.suite_number}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mb-3">Submitted {formatDateTime(req.submitted_at)}</p>
                      <div className="space-y-1.5">
                        {req.ship_request_packages.map((srp) => (
                          <div key={srp.package.id} className="flex items-center gap-2 text-xs">
                            <Package className="w-3 h-3 text-muted-foreground shrink-0" />
                            <span className="font-mono">{srp.package.tracking_number}</span>
                            <span className="text-muted-foreground">— {srp.package.contents_description}</span>
                            <span className="text-muted-foreground">({srp.package.weight_kg} kg)</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => processShipRequest(req)}
                      disabled={processing === req.id}
                      className="shrink-0"
                    >
                      {processing === req.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Ship className="w-3.5 h-3.5" />
                      )}
                      Mark as Shipped
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {processed.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Processed</h2>
          <div className="space-y-2">
            {processed.map((req) => (
              <Card key={req.id} className="opacity-70">
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">{req.client.full_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {req.ship_request_packages.length} package{req.ship_request_packages.length !== 1 ? "s" : ""} · {formatDateTime(req.submitted_at)}
                      </p>
                    </div>
                    <span className="inline-flex items-center gap-1.5 text-xs text-emerald-600 font-medium">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Shipped
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {requests.length === 0 && (
        <Card>
          <CardContent className="py-16 text-center">
            <Ship className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
            <p className="font-medium">No ship requests yet</p>
            <p className="text-sm text-muted-foreground mt-1">Ship requests submitted by clients will appear here</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
