"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Upload, Loader2, AlertCircle, CheckCircle2, FileText } from "lucide-react";
import { toast } from "sonner";
import { Package } from "@/types";

interface EligiblePackage extends Package {
  invoice: {
    review_status: string;
    admin_notes: string | null;
  } | null;
}

export default function UploadInvoicePage() {
  const [packages, setPackages] = useState<EligiblePackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState<string | null>(null);
  const supabase = createClient();

  const fetchPackages = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    const { data } = await supabase
      .from("packages")
      .select("*, invoice:invoices(*)")
      .eq("client_id", user?.id)
      .in("status", ["ready_to_send", "pending_invoice_review"])
      .order("created_at", { ascending: false });
    setPackages(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchPackages(); }, []);

  const handleUpload = async (pkg: EligiblePackage, file: File) => {
    // Validate file
    const allowedTypes = ["application/pdf", "image/jpeg", "image/png", "image/jpg"];
    if (!allowedTypes.includes(file.type)) {
      toast.error("Only PDF, JPG, and PNG files are allowed");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("File must be under 10MB");
      return;
    }

    setUploading(pkg.id);
    const { data: { user } } = await supabase.auth.getUser();

    const filePath = `${user?.id}/${pkg.id}/${Date.now()}_${file.name}`;

    // Upload to storage
    const { error: uploadError } = await supabase.storage
      .from("invoices")
      .upload(filePath, file, { upsert: true });

    if (uploadError) {
      toast.error("Upload failed: " + uploadError.message);
      setUploading(null);
      return;
    }

    // Upsert invoice record
    const { error: invoiceError } = await supabase
      .from("invoices")
      .upsert({
        package_id: pkg.id,
        file_path: filePath,
        file_name: file.name,
        upload_date: new Date().toISOString(),
        review_status: "pending",
        admin_notes: null,
        reviewed_at: null,
        reviewed_by: null,
      }, { onConflict: "package_id" });

    if (invoiceError) {
      toast.error("Failed to save invoice record");
      setUploading(null);
      return;
    }

    // Update package status
    await supabase
      .from("packages")
      .update({ status: "pending_invoice_review" })
      .eq("id", pkg.id);

    // Status history
    await supabase.from("status_history").insert({
      package_id: pkg.id,
      old_status: pkg.status,
      new_status: "pending_invoice_review",
      changed_by_id: user?.id,
      changed_by_role: "client",
    });

    toast.success("Invoice uploaded successfully!");
    setUploading(null);
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
        <h1 className="text-2xl font-bold tracking-tight">Upload Invoice</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Upload purchase invoices for customs clearance. Accepted: PDF, JPG, PNG (max 10MB)
        </p>
      </div>

      {packages.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-3" />
            <p className="font-medium">No packages need an invoice right now</p>
            <p className="text-sm text-muted-foreground mt-1">
              Packages that need invoices will appear here
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {packages.map((pkg) => (
            <Card key={pkg.id}>
              <CardContent className="pt-5">
                {/* Admin note if flagged */}
                {pkg.invoice?.review_status === "needs_review" && pkg.invoice.admin_notes && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex gap-2">
                    <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-medium text-red-800">Action Required</p>
                      <p className="text-xs text-red-700 mt-0.5">{pkg.invoice.admin_notes}</p>
                    </div>
                  </div>
                )}

                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-mono text-sm font-medium">{pkg.tracking_number}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{pkg.contents_description}</p>
                    <div className="mt-2">
                      <StatusBadge status={pkg.status} />
                    </div>
                    {pkg.invoice && pkg.invoice.review_status !== "needs_review" && (
                      <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                        <FileText className="w-3 h-3" />
                        Invoice uploaded — awaiting review
                      </p>
                    )}
                  </div>

                  <label className="cursor-pointer">
                    <input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleUpload(pkg, file);
                        e.target.value = "";
                      }}
                      disabled={uploading === pkg.id}
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={uploading === pkg.id}
                      asChild
                    >
                      <span>
                        {uploading === pkg.id ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            Uploading…
                          </>
                        ) : (
                          <>
                            <Upload className="w-3.5 h-3.5" />
                            {pkg.invoice ? "Replace Invoice" : "Upload Invoice"}
                          </>
                        )}
                      </span>
                    </Button>
                  </label>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
