import { redirect } from "next/navigation";

// /admin redirect → dashboard
export default function AdminRoot() {
  redirect("/admin/dashboard");
}
