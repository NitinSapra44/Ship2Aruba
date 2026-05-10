"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { formatWeight } from "@/lib/utils";
import { Ship, Loader2, Package, CheckSquare, Square } from "lucide-react";
import { toast } from "sonner";
import { Package as PkgType } from "@/types";

export default function ShipRequestPage() {
  const [packages, setPackages] = useState<PkgType[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const supabase = createClient();

  const fetchPackages = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    const { data } = await supabase
      .from("packages")
      .select("*")
      .eq("client_id", user?.id)
      .eq("status", "invoice_approved")
      .order("created_at");
    setPackages(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchPackages(); }, []);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    if (selected.size === packages.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(packages.map((p) => p.id)));
    }
  };

  const submitRequest = async () => {
    if (selected.size === 0) {
      toast.error("Select at least one package");
      return;
    }
    setSubmitting(true);
    const { data: { user } } = await supabase.auth.getUser();

    // Create ship request
    const { data: shipRequest, error } = await supabase
      .from("ship_requests")
      .insert({
        client_id: user?.id,
        status: "pending",
        submitted_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      toast.error("Failed to create ship request");
      setSubmitting(false);
      return;
    }

    // Link packages
    const packageLinks = Array.from(selected).map((pkgId) => ({
      ship_request_id: shipRequest.id,
      package_id: pkgId,
    }));
    await supabase.from("ship_request_packages").insert(packageLinks);

    // Update package statuses
    for (const pkgId of selected) {
      await supabase.from("packages").update({ status: "ship_requested" }).eq("id", pkgId);
      await supabase.from("status_history").insert({
        package_id: pkgId,
        old_status: "invoice_approved",
        new_status: "ship_requested",
        changed_by_id: user?.id,
        changed_by_role: "client",
      });
    }

    toast.success(`Ship request submitted for ${selected.size} package${selected.size > 1 ? "s" : ""}!`);
    setSelected(new Set());
    setSubmitting(false);
    fetchPackages();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Create Ship Request</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Select packages with approved invoices to request shipping to Aruba
        </p>
      </div>

      {packages.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Ship className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
            <p className="font-medium">No packages ready to ship</p>
            <p className="text-sm text-muted-foreground mt-1">
              Packages with approved invoices will appear here
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Select all */}
          <div className="flex items-center justify-between">
            <button
              onClick={selectAll}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              {selected.size === packages.length ? (
                <CheckSquare className="w-4 h-4 text-primary" />
              ) : (
                <Square className="w-4 h-4" />
              )}
              {selected.size === packages.length ? "Deselect All" : "Select All"}
            </button>
            <span className="text-sm text-muted-foreground">{selected.size} selected</span>
          </div>

          <div className="space-y-3">
            {packages.map((pkg) => {
              const isSelected = selected.has(pkg.id);
              return (
                <button
                  key={pkg.id}
                  onClick={() => toggle(pkg.id)}
                  className={`w-full text-left transition-all rounded-xl border p-4 ${
                    isSelected
                      ? "border-primary bg-primary/5 ring-1 ring-primary"
                      : "border-border bg-card hover:border-muted-foreground"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {isSelected ? (
                      <CheckSquare className="w-4 h-4 text-primary shrink-0" />
                    ) : (
                      <Square className="w-4 h-4 text-muted-foreground shrink-0" />
                    )}
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <p className="font-mono text-sm font-medium">{pkg.tracking_number}</p>
                        <StatusBadge status={pkg.status} />
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{pkg.contents_description}</p>
                      <p className="text-xs text-muted-foreground">{formatWeight(pkg.weight_kg)}</p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          <Button
            onClick={submitRequest}
            disabled={selected.size === 0 || submitting}
            className="w-full"
            size="lg"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Submitting…
              </>
            ) : (
              <>
                <Ship className="w-4 h-4" />
                Request Shipping for {selected.size} Package{selected.size !== 1 ? "s" : ""}
              </>
            )}
          </Button>
        </>
      )}
    </div>
  );
}
