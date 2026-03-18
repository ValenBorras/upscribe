"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/app/lib/supabase/client";
import {
  BookOpen,
  LayoutDashboard,
  PlusCircle,
  LogOut,
  Crown,
} from "lucide-react";

type Props = {
  user: { id: string; email: string };
  subscriptionStatus: string;
  children: React.ReactNode;
};

const NAV_ITEMS = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Mis cuadernos" },
  { href: "/dashboard/new-summary", icon: PlusCircle, label: "Nuevo resumen" },
];

export default function DashboardShell({
  user,
  subscriptionStatus,
  children,
}: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  };

  return (
    <div className="min-h-screen bg-[#030712] flex">
      {/* Sidebar */}
      <aside className="hidden md:flex w-64 flex-col border-r border-white/[0.06] bg-[#030712]">
        <div className="p-6">
          <Link href="/" className="flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-indigo-400" />
            <span className="text-lg font-bold text-white tracking-tight">
              UP-Scribe
            </span>
          </Link>
        </div>

        <nav className="flex-1 px-3 space-y-1">
          {NAV_ITEMS.map((item) => {
            const active =
              item.href === "/dashboard"
                ? pathname === "/dashboard"
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  active
                    ? "bg-indigo-600/10 text-indigo-400"
                    : "text-white/50 hover:text-white/80 hover:bg-white/[0.04]"
                }`}
              >
                <item.icon className="w-4 h-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Subscription badge */}
        <div className="px-3 pb-2">
          {subscriptionStatus === "active" ? (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-indigo-600/10 border border-indigo-500/20">
              <Crown className="w-4 h-4 text-indigo-400" />
              <span className="text-xs text-indigo-300 font-medium">
                Suscripción activa
              </span>
            </div>
          ) : (
            <Link
              href="/pricing"
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/[0.03] border border-white/[0.06] hover:border-indigo-500/20 transition-colors"
            >
              <Crown className="w-4 h-4 text-white/40" />
              <span className="text-xs text-white/50 font-medium">
                Plan gratuito
              </span>
            </Link>
          )}
        </div>

        {/* User + Logout */}
        <div className="p-3 border-t border-white/[0.06]">
          <div className="flex items-center gap-3 px-3 py-2">
            <div className="w-8 h-8 rounded-full bg-indigo-600/20 flex items-center justify-center">
              <span className="text-xs font-medium text-indigo-400">
                {user.email[0].toUpperCase()}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-white/80 truncate">{user.email}</p>
            </div>
            <button
              onClick={handleLogout}
              className="p-1.5 rounded-lg text-white/30 hover:text-white/60 hover:bg-white/[0.04] transition-colors"
              title="Cerrar sesión"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile header */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 bg-[#030712]/90 backdrop-blur-xl border-b border-white/[0.06]">
        <div className="flex items-center justify-between px-4 h-14">
          <Link href="/" className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-indigo-400" />
            <span className="text-sm font-bold text-white">UP-Scribe</span>
          </Link>
          <div className="flex items-center gap-2">
            {NAV_ITEMS.map((item) => {
              const active =
                item.href === "/dashboard"
                  ? pathname === "/dashboard"
                  : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`p-2 rounded-lg transition-colors ${
                    active
                      ? "bg-indigo-600/10 text-indigo-400"
                      : "text-white/50"
                  }`}
                >
                  <item.icon className="w-4 h-4" />
                </Link>
              );
            })}
            <button
              onClick={handleLogout}
              className="p-2 rounded-lg text-white/30 hover:text-white/60"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto md:max-h-screen">
        <div className="pt-14 md:pt-0">{children}</div>
      </main>
    </div>
  );
}
