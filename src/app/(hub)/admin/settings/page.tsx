"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Settings, ChevronLeft } from "lucide-react";
import Link from "next/link";
import { AppShell } from "@/components/app-shell";

export default function AdminSettingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [adminUser, setAdminUser] = useState<{
    id: string;
    name: string;
    role: string;
  } | null>(null);

  useEffect(() => {
    fetch("/api/auth/me", { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => {
        if (data.role !== "SUPER_ADMIN") {
          router.replace(
            data.id ? "/dashboard" : "/login?redirect=/admin/settings",
          );
          return;
        }
        setAdminUser({ id: data.id, name: data.name, role: data.role });
        setLoading(false);
      })
      .catch(() => router.replace("/login?redirect=/admin/settings"));
  }, [router]);

  if (loading || !adminUser) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-ekd-gold" />
      </div>
    );
  }

  return (
    <AppShell user={adminUser}>
      <div className="max-w-2xl space-y-6 py-2">
        <div>
          <Link
            href="/admin"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            Back to Admin Panel
          </Link>
          <div className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-ekd-gold" />
            <h1 className="text-2xl font-bold text-foreground">
              System Settings
            </h1>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Super Admin only. Global configuration for the EKD Digital Resource
            Hub.
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6">
          <div className="flex flex-col items-center justify-center py-10 gap-3 text-muted-foreground">
            <Settings className="h-10 w-10 opacity-20" />
            <p className="text-sm">System settings coming soon.</p>
            <p className="text-xs opacity-70">
              This section will contain application-wide configuration options.
            </p>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
