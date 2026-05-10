"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  Upload,
  PackagePlus,
  MapPin,
  LogOut,
  Anchor,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Profile } from "@/types";

const navItems = [
  { href: "/client/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/client/packages", label: "My Packages", icon: Package },
  { href: "/client/upload-invoice", label: "Upload Invoice", icon: Upload },
  { href: "/client/ship-request", label: "Ship Request", icon: PackagePlus },
  { href: "/client/shipments", label: "Shipment Status", icon: MapPin },
];

interface ClientSidebarProps {
  profile: Profile;
}

export function ClientSidebar({ profile }: ClientSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/auth/login");
    router.refresh();
  };

  return (
    <aside className="fixed left-0 top-0 h-screen w-60 border-r bg-card flex flex-col z-30">
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-5 border-b">
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary text-primary-foreground">
          <Anchor className="w-4 h-4" />
        </div>
        <div>
          <p className="font-bold text-sm tracking-tight">Ship2Aruba</p>
          <p className="text-xs text-muted-foreground">Customer Portal</p>
        </div>
      </div>

      {/* Suite number */}
      {profile.suite_number && (
        <div className="mx-3 mt-3 px-3 py-2.5 rounded-lg bg-muted">
          <p className="text-xs text-muted-foreground">Your Suite</p>
          <p className="text-sm font-bold tracking-widest">{profile.suite_number}</p>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                active
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              )}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* User + Sign Out */}
      <div className="px-3 py-4 border-t space-y-1">
        <div className="px-3 py-2">
          <p className="text-sm font-medium truncate">{profile.full_name}</p>
          <p className="text-xs text-muted-foreground truncate">{profile.email}</p>
        </div>
        <button
          onClick={handleSignOut}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>
    </aside>
  );
}
