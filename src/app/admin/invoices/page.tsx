"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { formatDate, formatDateTime } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { CheckCircle2, AlertCircle, Eye, Loader2, FileText } from "lucide-react";
import { toast } from "sonner";
import { Package } from "@/types";

interface PendingInvoice {
  id: string;
  package_id: string;
  file_path: string;
  file_name: string;
  upload_date: string;
  admin_notes: string | null;
  package: Package & { client: { full_name: string; suite_number: string } };
}

export default function InvoiceReviewPage() {
  const [invoices, setInvoices] = useState<PendingInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionPkg, setActionPkg] = useState<PendingInvoice | null>(null);
  const [actionType, setActionType] = useState<"approve" | "flag" | null>(null);
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const supabase = createClient();

  const fetchInvoices = async () => {
    const { data } = await supabase
      .from("invoices")
      .select(`
        *,
        package:packages!invoices_package_id_fkey(
          *,
          client:profiles!packages_client_id_fkey(full_name, suite_number)
        )
      `)
      .eq("review_status", "pending")
      .order("upload_date", { ascending: true });
    setInvoices(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchInvoices(); }, []);

  const openAction = (inv: PendingInvoice, type: "approve" | "flag") => {
    setActionPkg(inv);
    setActionType(type);
    setNote("");
  };

  const viewFile = async (inv: PendingInvoice) => {
    const { data } = await supabase.storage
      .from("invoices")
      .createSignedUrl(inv.file_path, 300);
    if (data?.signedUrl) {
      window.open(data.signedUrl, "_blank");
    }
  };

  const submitAction = async () => {
    if (!actionPkg || !actionType) return;
    setSubmitting(true);

    const { data: { user } } = await supabase.auth.getUser();

    const newPkgStatus =
      actionType === "approve" ? "invoice_approved" : "pending_invoice_review";
    const reviewStatus = actionType === "approve" ? "approved" : "needs_review";

    // Update invoice
    await supabase
      .from("invoices")
      .update({
        review_status: reviewStatus,
        admin_notes: actionType === "flag" ? note : null,
        reviewed_at: new Date().toISOString(),
        reviewed_by: user?.id,
      })
      .eq("id", actionPkg.id);

    // Update package status
    if (actionType === "approve") {
      await supabase
        .from("packages")
        .update({ status: "invoice_approved" })
        .eq("id", actionPkg.package_id);

      // Status history
      await supabase.from("status_history").insert({
        package_id: actionPkg.package_id,
        old_status: "pending_invoice_review",
        new_status: "invoice_approved",
        changed_by_id: user?.id,
        changed_by_role: "admin",
      });
    } else {
      // Flag keeps package at pending_invoice_review, but invoice marked needs_review
      await supabase.from("status_history").insert({
        package_id: actionPkg.package_id,
        old_status: "pending_invoice_review",
        new_status: "pending_invoice_review",
        changed_by_id: user?.id,
        changed_by_role: "admin",
        note: `Invoice flagged: ${note}`,
      });
    }

    toast.success(actionType === "approve" ? "Invoice approved!" : "Invoice flagged for review");
    setActionPkg(null);
    setActionType(null);
    setSubmitting(false);
    fetchInvoices();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Invoice Review</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {invoices.length} invoice{invoices.length !== 1 ? "s" : ""} awaiting review
        </p>
      </div>

      {invoices.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-3" />
            <p className="font-medium">All caught up!</p>
            <p className="text-sm text-muted-foreground mt-1">No invoices are pending review</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {invoices.map((inv) => (
            <Card key={inv.id} className="hover:shadow-md transition-shadow">
              <CardContent className="pt-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 flex-1">
                    <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
                      <FileText className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="font-mono text-sm font-medium">{inv.package.tracking_number}</p>
                      <p className="text-xs text-muted-foreground">{inv.package.contents_description}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {inv.package.client?.full_name} · {inv.package.client?.suite_number}
                      </p>
                      <p className="text-xs text-muted-foreground">Uploaded {formatDateTime(inv.upload_date)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => viewFile(inv)}>
                      <Eye className="w-3.5 h-3.5" />
                      View File
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-red-200 text-red-600 hover:bg-red-50"
                      onClick={() => openAction(inv, "flag")}
                    >
                      <AlertCircle className="w-3.5 h-3.5" />
                      Flag
                    </Button>
                    <Button
                      size="sm"
                      className="bg-emerald-600 hover:bg-emerald-700 text-white"
                      onClick={() => openAction(inv, "approve")}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Approve
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Action Dialog */}
      <Dialog open={!!actionPkg} onOpenChange={() => setActionPkg(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionType === "approve" ? "Approve Invoice" : "Flag Invoice — Needs Review"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {actionPkg && (
              <div className="p-3 bg-muted rounded-lg text-sm">
                <p className="font-mono font-medium">{actionPkg.package.tracking_number}</p>
                <p className="text-muted-foreground text-xs mt-0.5">{actionPkg.package.contents_description}</p>
              </div>
            )}
            {actionType === "flag" && (
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Reason (shown to client)</label>
                <Textarea
                  placeholder="Explain what's wrong with the invoice…"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={3}
                />
              </div>
            )}
            {actionType === "approve" && (
              <p className="text-sm text-muted-foreground">
                This will approve the invoice and mark the package as <strong>Invoice Approved</strong>, making it eligible for a ship request.
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActionPkg(null)}>Cancel</Button>
            <Button
              onClick={submitAction}
              disabled={submitting || (actionType === "flag" && !note.trim())}
              className={actionType === "approve" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-red-600 hover:bg-red-700"}
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : actionType === "approve" ? "Approve" : "Flag Invoice"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
