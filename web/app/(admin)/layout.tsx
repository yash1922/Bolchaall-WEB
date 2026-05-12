"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { Home, ShieldCheck, Users, Sparkles, LogOut } from "lucide-react";
import { useAuthStore } from "@/lib/store";
import { api, setAccessToken } from "@/lib/api-client";
import { PageTransition } from "@/components/providers/PageTransition";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/admin", label: "Overview", icon: Home },
  { href: "/admin/applications", label: "Applications", icon: ShieldCheck },
  { href: "/admin/users", label: "Users", icon: Users },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname() ?? "";
  const user = useAuthStore((s) => s.user);
  const hydrated = useAuthStore((s) => s.hydrated);
  const clearSession = useAuthStore((s) => s.clearSession);

  useEffect(() => {
    if (!hydrated) return;
    if (!user) router.replace("/login");
    else if (user.role !== "admin") router.replace(user.role === "doctor" ? "/doctor" : "/app");
  }, [hydrated, user, router]);

  async function handleLogout() {
    try {
      await api.logout();
    } catch {}
    setAccessToken(null);
    clearSession();
    router.replace("/login");
  }

  if (!hydrated || !user) return null;

  return (
    <div className="min-h-screen flex">
      <aside className="w-60 border-r border-ink-200 bg-white/80 backdrop-blur-xl px-4 py-6 flex flex-col gap-1 sticky top-0 h-screen">
        <Link href="/admin" className="flex items-center gap-2 mb-6 px-2">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-brand-400 to-brand-700 flex items-center justify-center text-white shadow-soft">
            <Sparkles className="w-4 h-4" />
          </div>
          <span className="font-display text-xl text-ink-900">Bolchall · Admin</span>
        </Link>
        {NAV.map((n) => {
          const active = pathname === n.href || (n.href !== "/admin" && pathname.startsWith(n.href));
          return (
            <Link
              key={n.href}
              href={n.href}
              className={cn(
                "flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition",
                active
                  ? "bg-brand-100 text-brand-800"
                  : "text-ink-600 hover:bg-brand-50 hover:text-brand-700"
              )}
            >
              <n.icon className="w-4 h-4" />
              {n.label}
            </Link>
          );
        })}
        <div className="mt-auto pt-4 border-t border-ink-200">
          <p className="px-2 text-sm text-ink-800 font-medium truncate mb-3">{user.name}</p>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-ink-600 hover:bg-brand-50 hover:text-brand-700 w-full font-medium"
          >
            <LogOut className="w-4 h-4" />
            Log out
          </button>
        </div>
      </aside>
      <main className="flex-1 px-8 py-8 max-w-6xl mx-auto w-full">
        <PageTransition>{children}</PageTransition>
      </main>
    </div>
  );
}
