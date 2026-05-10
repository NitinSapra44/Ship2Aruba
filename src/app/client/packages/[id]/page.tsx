import { createClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { formatDateTime, formatWeight, formatDimensions } from "@/lib/utils";
import { ChevronLeft, ArrowRight } from "lucide-react";
import { STATUS_LABELS } from "@/types";

export default async function ClientPackageDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: pkg } = await supabase
    .from("packages")
    .select("*, invoice:invoices(*), status_history(*)")
    .eq("id", params.id)
    .eq("client_id", user?.id)
    .single();

  if (!pkg) notFound();

  const history = pkg.status_history?.sort(
    (a: { changed_at: string }, b: { changed_at: string }) =>
      new Date(a.changed_at).getTime() - new Date(b.changed_at).getTime()
  );

  return (
    <div className="space-y-6 animate-fade-in max-w-2xl">
      <div>
        <Link
          href="/client/packages"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ChevronLeft className="w-4 h-4" /> My Packages
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold font-mono">{pkg.tracking_number}</h1>
            <p className="text-sm text-muted-foreground mt-1">{pkg.contents_description}</p>
          </div>
          <StatusBadge status={pkg.status} />
        </div>
      </div>

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
            <span className="text-muted-foreground">Arrived</span>
            <span className="font-medium">{formatDateTime(pkg.created_at)}</span>
          </div>
        </CardContent>
      </Card>

      {/* Invoice status */}
      {pkg.invoice && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Invoice Status</CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            <div className={`inline-flex items-center rounded-md px-2.5 py-1 text-xs font-medium border ${
              pkg.invoice.review_status === "approved"
                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                : pkg.invoice.review_status === "needs_review"
                ? "bg-red-50 text-red-700 border-red-200"
                : "bg-amber-50 text-amber-700 border-amber-200"
            }`}>
              {pkg.invoice.review_status === "approved" ? "Approved" :
               pkg.invoice.review_status === "needs_review" ? "Needs Review" : "Under Review"}
            </div>
            {pkg.invoice.admin_notes && (
              <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-xs">
                <p className="font-medium mb-1">Note from Ship2Aruba team:</p>
                <p>{pkg.invoice.admin_notes}</p>
              </div>
            )}
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
                  <div>
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
                    </div>
                    <p className="text-xs text-muted-foreground">{formatDateTime(h.changed_at)}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No history recorded.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
