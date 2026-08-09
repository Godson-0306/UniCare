"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useEffect, useId, useRef, useState } from "react";
import { Bell, LogOut, Menu, X } from "lucide-react";

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

function notificationsHref(pathname: string, portal: string | null) {
  if (pathname.startsWith("/student") || portal === "student") return "/student/notifications";
  if (pathname.startsWith("/hospital/reception")) return "/hospital/reception/chat";
  return "/hospital/appointments";
}

export function DashboardShell({ title, subtitle, navItems, hideSidebar = false, children }: DashboardShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, workstation, profile, portal, logout } = useAuthStore();
  const [mobileOpen, setMobileOpen] = useState(false);
  const showSidebar = !hideSidebar && navItems.length > 0;
  const navId = useId();
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  function handleLogout() {
    logout();
    router.replace("/login");
  }

  useEffect(() => {
    if (!mobileOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setMobileOpen(false);
    }

    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [mobileOpen]);

  return (
    <div className="min-h-screen app-atmosphere">
      <header className="fixed inset-x-0 top-0 z-50 border-b border-[var(--border)] bg-white/90 backdrop-blur-sm">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-3">
            {showSidebar ? (
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden"
                aria-expanded={mobileOpen}
                aria-controls={navId}
                aria-label={mobileOpen ? "Close navigation" : "Open navigation"}
                onClick={() => setMobileOpen((v) => !v)}
              >
                {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </Button>
            ) : null}
            <div>
              <p className="font-display text-base font-semibold tracking-tight text-[var(--brand-ink)]">UniCare</p>
              <h1 className="text-sm font-medium text-slate-700">{title}</h1>
            </div>
          </div>

          <div className="hidden items-center gap-3 text-right sm:flex">
            <Button
              asChild
              variant="ghost"
              size="icon"
              aria-label="Open notifications"
            >
              <Link href={notificationsHref(pathname, portal)}>
                <Bell className="h-5 w-5" />
              </Link>
            </Button>
            <div>
              <p className="text-sm font-medium text-slate-900">
                {profile?.full_name ?? workstation?.station_name ?? user?.username}
              </p>
              {subtitle ? <p className="text-xs text-[var(--muted)]">{subtitle}</p> : null}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              asChild
              variant="ghost"
              size="icon"
              className="sm:hidden"
              aria-label="Open notifications"
            >
              <Link href={notificationsHref(pathname, portal)}>
                <Bell className="h-5 w-5" />
              </Link>
            </Button>
            <Button variant="outline" size="sm" onClick={handleLogout}>
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Sign out</span>
            </Button>
          </div>
        </div>
      </header>

      {showSidebar && mobileOpen ? (
        <button
          type="button"
          className="fixed inset-0 z-30 bg-slate-900/35 lg:hidden"
          aria-label="Close navigation overlay"
          onClick={() => setMobileOpen(false)}
        />
      ) : null}

      <div className="mx-auto flex max-w-7xl gap-6 px-4 pt-16 pb-6 sm:px-6">
        {showSidebar ? (
          <aside
            id={navId}
            className={cn(
              "fixed inset-y-0 left-0 z-40 w-64 transform border-r border-[var(--border)] bg-white p-4 pt-16 shadow-lg transition-transform duration-200 lg:static lg:translate-x-0 lg:pt-4 lg:shadow-none",
              mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
            )}
          >
            <div className="mb-3 flex items-center justify-between lg:hidden">
              <p className="text-sm font-semibold text-slate-800">Navigation</p>
              <Button
                ref={closeButtonRef}
                variant="ghost"
                size="icon"
                aria-label="Close navigation"
                onClick={() => setMobileOpen(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <nav className="space-y-1" aria-label="Primary">
              {navItems.map((item) => {
                const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className={cn(
                      "relative block rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                      active
                        ? "bg-teal-50 text-teal-800 before:absolute before:inset-y-2 before:left-0 before:w-1 before:rounded-full before:bg-teal-600"
                        : "text-slate-600 hover:bg-slate-100"
                    )}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </aside>
        ) : null}

        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
