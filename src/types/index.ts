export type UserRole = "admin" | "client";

export type PackageStatus =
  | "ready_to_send"
  | "pending_invoice_review"
  | "invoice_approved"
  | "ship_requested"
  | "shipped"
  | "ready_for_pickup"
  | "delivered";

export type InvoiceReviewStatus = "pending" | "approved" | "needs_review";

export type ShipRequestStatus = "pending" | "processed";

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  suite_number: string | null;
  created_at: string;
}

export interface Package {
  id: string;
  tracking_number: string;
  width_cm: number;
  height_cm: number;
  length_cm: number;
  weight_kg: number;
  contents_description: string;
  status: PackageStatus;
  client_id: string;
  invoice_file_path: string | null;
  created_at: string;
  updated_at: string;
  // joined
  client?: Profile;
  invoice?: Invoice;
  status_history?: StatusHistory[];
}

export interface Invoice {
  id: string;
  package_id: string;
  file_path: string;
  file_name: string;
  upload_date: string;
  review_status: InvoiceReviewStatus;
  admin_notes: string | null;
  reviewed_at: string | null;
  reviewed_by: string | null;
}

export interface ShipRequest {
  id: string;
  client_id: string;
  status: ShipRequestStatus;
  submitted_at: string;
  processed_at: string | null;
  processed_by: string | null;
  // joined
  client?: Profile;
  packages?: Package[];
  ship_request_packages?: { package_id: string; package?: Package }[];
}

export interface StatusHistory {
  id: string;
  package_id: string;
  old_status: PackageStatus | null;
  new_status: PackageStatus;
  changed_by_id: string;
  changed_by_role: UserRole;
  changed_at: string;
  note: string | null;
}

export const STATUS_LABELS: Record<PackageStatus, string> = {
  ready_to_send: "Ready to Send",
  pending_invoice_review: "Pending Invoice Review",
  invoice_approved: "Invoice Approved",
  ship_requested: "Ship Requested",
  shipped: "Shipped",
  ready_for_pickup: "Ready for Pickup",
  delivered: "Delivered",
};

export const STATUS_COLORS: Record<PackageStatus, string> = {
  ready_to_send: "bg-slate-100 text-slate-700 border-slate-200",
  pending_invoice_review: "bg-amber-50 text-amber-700 border-amber-200",
  invoice_approved: "bg-emerald-50 text-emerald-700 border-emerald-200",
  ship_requested: "bg-blue-50 text-blue-700 border-blue-200",
  shipped: "bg-violet-50 text-violet-700 border-violet-200",
  ready_for_pickup: "bg-cyan-50 text-cyan-700 border-cyan-200",
  delivered: "bg-green-50 text-green-700 border-green-200",
};
