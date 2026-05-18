"use client";

import { Sidebar, MobileNav, Topbar, SidebarProvider, useSidebar } from "@/components/layout/navigation";

function DashboardContent({ children }: { children: React.ReactNode }) {
  const { collapsed } = useSidebar();

  return (
    <div className={`transition-all duration-300 ${collapsed ? "md:pl-[68px]" : "md:pl-64"}`}>
      <Topbar />
      <main className="p-4 md:p-8 mt-14 md:mt-0 max-w-7xl mx-auto">{children}</main>
    </div>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider>
      <div className="min-h-screen bg-background">
        <Sidebar />
        <MobileNav />
        <DashboardContent>{children}</DashboardContent>
      </div>
    </SidebarProvider>
  );
}
