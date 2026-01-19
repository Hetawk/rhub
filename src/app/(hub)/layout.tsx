import { SiteHeader } from "@/components/navigation/site-header";
import { SiteFooter } from "@/components/navigation/site-footer";
import { ReactNode } from "react";

export default function HubLayout({ children }: { children: ReactNode }) {
  return (
    <div className="relative isolate flex min-h-screen flex-col bg-background text-foreground">
      <div className="pointer-events-none absolute inset-0 -z-10 opacity-40">
        <div className="absolute -left-10 top-10 h-64 w-64 rounded-full bg-linear-to-br from-[#8E0E00]/40 via-[#C8A061]/30 to-transparent blur-3xl" />
        <div className="absolute right-0 top-64 h-72 w-72 rounded-full bg-linear-to-br from-[#182E5F]/40 via-[#1F1C18]/30 to-transparent blur-3xl" />
      </div>
      <SiteHeader />
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 pb-20 pt-8 sm:px-6 lg:px-8">
        {children}
      </main>
      <SiteFooter />
    </div>
  );
}
