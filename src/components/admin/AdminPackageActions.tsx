"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { MapPin, CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { PackageStatus } from "@/types";

interface AdminPackageActionsProps {
  packageId: string;
  currentStatus: PackageStatus;
}

export function AdminPackageActions({ packageId, currentStatus }: AdminPackageActionsProps) {
  const [open, setOpen] = useState(false);
  const [nextStatus, setNextStatus] = useState<PackageStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  // Only show actions for packages that are shipped or ready_for_pickup
  if (!["shipped", "ready_for_pickup"].includes(currentStatus)) return null;

  const actions: { label: string; status: PackageStatus; icon: typeof MapPin; className: string }[] =
    currentStatus === "shipped"
      ? [
          {
            label: "Mark Ready for Pickup",
            status: "ready_for_pickup",
            icon: MapPin,
            className: "border-cyan-200 text-cyan-700 hover:bg-cyan-50",
          },
          {
            label: "Mark Delivered",
            status: "delivered",
            icon: CheckCircle2,
            className: "border-emerald-200 text-emerald-700 hover:bg-emerald-50",
          },
        ]
      : [
          {
            label: "Mark Delivered",
            status: "delivered",
            icon: CheckCircle2,
            className: "border-emerald-200 text-emerald-700 hover:bg-emerald-50",
          },
        ];

  const openDialog = (status: PackageStatus) => {
    setNextStatus(status);
    setOpen(true);
  };

  const confirm = async () => {
    if (!nextStatus) return;
    setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { error } = await supabase
      .from("packages")
      .update({ status: nextStatus })
      .eq("id", packageId);

    if (error) {
      toast.error("Update failed: " + error.message);
      setLoading(false);
      return;
    }

    await supabase.from("status_history").insert({
      package_id: packageId,
      old_status: currentStatus,
      new_status: nextStatus,
      changed_by_id: user?.id,
      changed_by_role: "admin",
    });

    toast.success("Package status updated");
    setOpen(false);
    setLoading(false);
    router.refresh();
  };

  const selectedAction = actions.find((a) => a.status === nextStatus);

  return (
    <>
      <div className="flex gap-2">
        {actions.map(({ label, status, icon: Icon, className }) => (
          <Button
            key={status}
            variant="outline"
            size="sm"
            className={className}
            onClick={() => openDialog(status)}
          >
            <Icon className="w-3.5 h-3.5" />
            {label}
          </Button>
        ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Status Update</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            This will update the package status to{" "}
            <strong>{selectedAction?.label.replace("Mark ", "")}</strong>. The client will see
            the updated status in their portal.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={confirm} disabled={loading}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Confirm"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
