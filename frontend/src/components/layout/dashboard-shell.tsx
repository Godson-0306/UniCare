"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { LogOut, Menu, X, Bell } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/auth-store";

export interface NavItem {
  label: string;
  href: string;
}

interface DashboardShellProps {
  title: string;
  subtitle?: string;
  navItems: NavItem[];
  hideSidebar?: boolean;
  children: ReactNode;
}

export function DashboardShell({ title, subtitle, navItems, hideSidebar = false, children }: DashboardShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, workstation, profile, logout } = useAuthStore();
  const [mobileOpen, setMobileOpen] = useState(false);
  const showSidebar = !hideSidebar && navItems.length > 0;

  function handleLogout() {
    logout();
    router.replace("/login");
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="fixed inset-x-0 top-0 z-50 border-b border-slate-200 bg-white/95 backdrop-blur-sm shadow-sm">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-3">
            {showSidebar && (
              <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setMobileOpen((v) => !v)}>
                {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </Button>
            )}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-teal-600">UniCare</p>
              <h1 className="text-lg font-semibold text-slate-900">{title}</h1>
            </div>
          </div>

          <div className="hidden items-center gap-4 text-right sm:flex">
            <button aria-label="Notifications" className="rounded-md p-2 text-slate-600 hover:bg-slate-100">
              <Bell className="h-5 w-5" />
            </button>
            <div>
              <p className="text-sm font-medium text-slate-900">{profile?.full_name ?? workstation?.station_name ?? user?.username}</p>
              {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleLogout}>
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Sign out</span>
            </Button>
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-7xl gap-6 px-4 pt-16 pb-6 sm:px-6">
        {showSidebar && (
          <aside
            className={cn(
              "fixed inset-y-0 left-0 z-30 w-64 transform border-r border-slate-200 bg-white p-4 pt-16 transition-transform lg:static lg:translate-x-0 lg:pt-4 lg:shadow-none",
              mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
            )}
          >
            <nav className="space-y-1">
              {navItems.map((item) => {
                const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className={cn(
                      "block rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                      active ? "bg-teal-50 text-teal-700" : "text-slate-600 hover:bg-slate-100"
                    )}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </aside>
        )}

        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
