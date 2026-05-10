import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ClientSidebar } from "@/components/client/ClientSidebar";

export default async function ClientLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "client") redirect("/admin/dashboard");

  return (
    <div className="flex min-h-screen">
      <ClientSidebar profile={profile} />
      <main className="flex-1 ml-60 p-8 bg-muted/20">
        {children}
      </main>
    </div>
  );
}
