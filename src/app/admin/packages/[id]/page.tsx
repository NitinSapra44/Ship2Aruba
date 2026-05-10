import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { formatDateTime, formatWeight, formatDimensions } from "@/lib/utils";
import { ChevronLeft, ArrowRight } from "lucide-react";
import { STATUS_LABELS } from "@/types";
import { AdminPackageActions } from "@/components/admin/AdminPackageActions";

export default async function PackageDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient();

  const { data: pkg } = await supabase
    .from("packages")
    .select(`
      *,
      client:profiles!packages_client_id_fkey(id, full_name, email, suite_number),
      invoice:invoices(*),
      status_history(*)
    `)
    .eq("id", params.id)
    .single();

  if (!pkg) notFound();

  const history = pkg.status_history?.sort(
    (a: { changed_at: string }, b: { changed_at: string }) =>
      new Date(a.changed_at).getTime() - new Date(b.changed_at).getTime()
  );

  return (
    <div className="space-y-6 animate-fade-in max-w-3xl">
      <div>
        <Link
          href="/admin/packages"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ChevronLeft className="w-4 h-4" /> All Packages
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold font-mono">{pkg.tracking_number}</h1>
            <p className="text-sm text-muted-foreground mt-1">{pkg.contents_description}</p>
          </div>
          <div className="flex items-center gap-3">
            <StatusBadge status={pkg.status} />
            <AdminPackageActions packageId={pkg.id} currentStatus={pkg.status} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Package Details */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Package Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Weight</span>
              <span className="font-medium">{formatWeight(pkg.weight_kg)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Dimensions</span>
              <span className="font-medium">{formatDimensions(pkg.width_cm, pkg.height_cm, pkg.length_cm)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Received</span>
              <span className="font-medium">{formatDateTime(pkg.created_at)}</span>
            </div>
          </CardContent>
        </Card>

        {/* Client Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Client</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Name</span>
              <Link href={`/admin/clients/${pkg.client?.id}`} className="font-medium text-primary hover:underline">
                {pkg.client?.full_name}
              </Link>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Email</span>
              <span className="font-medium">{pkg.client?.email}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Suite</span>
              <span className="font-mono font-bold">{pkg.client?.suite_number}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Invoice */}
      {pkg.invoice && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Invoice</CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Review Status</span>
              <span className={`font-medium ${
                pkg.invoice.review_status === "approved" ? "text-emerald-600" :
                pkg.invoice.review_status === "needs_review" ? "text-red-600" : "text-amber-600"
              }`}>
                {pkg.invoice.review_status === "approved" ? "Approved" :
                 pkg.invoice.review_status === "needs_review" ? "Needs Review" : "Pending"}
              </span>
            </div>
            {pkg.invoice.admin_notes && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-xs">
                <p className="font-medium mb-1">Admin Note:</p>
                <p>{pkg.invoice.admin_notes}</p>
              </div>
            )}
            <InvoiceViewButton filePath={pkg.invoice.file_path} />
          </CardContent>
        </Card>
      )}

      {/* Status History */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Status History</CardTitle>
        </CardHeader>
        <CardContent>
          {history?.length > 0 ? (
            <div className="space-y-3">
              {history.map((h: {
                id: string;
                old_status: string | null;
                new_status: string;
                changed_by_role: string;
                changed_at: string;
                note: string | null;
              }) => (
                <div key={h.id} className="flex items-start gap-3 text-sm">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      {h.old_status && (
                        <>
                          <span className="text-muted-foreground text-xs">
                            {STATUS_LABELS[h.old_status as keyof typeof STATUS_LABELS]}
                          </span>
                          <ArrowRight className="w-3 h-3 text-muted-foreground" />
                        </>
                      )}
                      <span className="font-medium text-xs">
                        {STATUS_LABELS[h.new_status as keyof typeof STATUS_LABELS]}
                      </span>
                      <span className="text-muted-foreground text-xs">by {h.changed_by_role}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">{formatDateTime(h.changed_at)}</p>
                    {h.note && <p className="text-xs text-muted-foreground italic mt-0.5">{h.note}</p>}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No history recorded yet.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Server component — generates a short-lived signed URL for secure invoice viewing
async function InvoiceViewButton({ filePath }: { filePath: string }) {
  const supabase = createClient();
  const { data } = await supabase.storage
    .from("invoices")
    .createSignedUrl(filePath, 300); // 5-minute expiry

  if (!data?.signedUrl) {
    return <span className="text-xs text-muted-foreground">File unavailable</span>;
  }

  return (
    <a
      href={data.signedUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 text-primary text-xs font-medium hover:underline"
    >
      View Invoice File →
    </a>
  );
}
