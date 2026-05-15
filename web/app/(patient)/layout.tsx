"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Home,
  Mic,
  BookOpen,
  Stethoscope,
  MessageCircle,
  Sparkles,
  LogOut,
  Crown,
  Flame,
  ClipboardList,
  Gamepad2,
  Menu,
  X,
} from "lucide-react";
import { useAuthStore } from "@/lib/store";
import { api, setAccessToken } from "@/lib/api-client";
import { CoinCounter } from "@/components/patient/CoinCounter";
import { PageTransition } from "@/components/providers/PageTransition";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/app", label: "Dashboard", icon: Home },
  { href: "/app/phonemes", label: "Phonemes", icon: BookOpen },
  { href: "/app/exercise/free", label: "Free practice", icon: Mic },
  { href: "/app/activities", label: "Activities", icon: Gamepad2 },
  { href: "/app/assignments", label: "Assignments", icon: ClipboardList },
  { href: "/app/therapist", label: "Therapist", icon: Stethoscope },
  { href: "/app/chat", label: "Chat", icon: MessageCircle },
];

export default function PatientLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname() ?? "";
  const user = useAuthStore((s) => s.user);
  const patient = useAuthStore((s) => s.patient);
  const hydrated = useAuthStore((s) => s.hydrated);
  const clearSession = useAuthStore((s) => s.clearSession);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (!hydrated) return;
    if (!user) {
      router.replace("/login");
    } else if (user.role !== "patient") {
      router.replace(user.role === "doctor" ? "/doctor" : "/admin");
    } else if (patient && !patient.onboardingComplete && !pathname.startsWith("/welcome")) {
      router.replace("/welcome");
    }
  }, [hydrated, user, patient, pathname, router]);

  // Auto-close drawer on route change so it doesn't linger after the user navigates
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  async function handleLogout() {
    try {
      await api.logout();
    } catch {
      // ignore
    }
    setAccessToken(null);
    clearSession();
    router.replace("/login");
  }

  if (!hydrated || !user) return null;

  return (
    <div className="min-h-screen flex">
      {/* Mobile backdrop — visible when drawer is open on small screens */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/40 backdrop-blur-sm md:hidden"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside
        className={cn(
          "w-60 border-r border-ink-200 dark:border-ink-700 bg-white dark:bg-ink-950 px-4 py-6 flex flex-col gap-1 z-40",
          // Desktop: sticky in normal layout flow.
          "md:sticky md:top-0 md:h-screen md:bg-white/80 md:dark:bg-ink-950/80 md:backdrop-blur-xl",
          // Mobile: fixed slide-over drawer.
          "fixed inset-y-0 left-0 h-screen transition-transform duration-200",
          mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        )}
      >
        <Link href="/app" className="flex items-center gap-2 mb-6 px-2">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-brand-400 to-brand-700 flex items-center justify-center text-white shadow-soft">
            <Sparkles className="w-4 h-4" />
          </div>
          <span className="font-display text-xl text-ink-900 dark:text-ink-100">Bolchall</span>
        </Link>
        {NAV.map((n) => {
          const active = pathname === n.href || (n.href !== "/app" && pathname.startsWith(n.href));
          return (
            <Link
              key={n.href}
              href={n.href}
              className={cn(
                "flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition",
                active
                  ? "bg-brand-100 text-brand-800 dark:bg-brand-900 dark:text-brand-200"
                  : "text-ink-600 dark:text-ink-300 hover:bg-brand-50 dark:hover:bg-ink-800 hover:text-brand-700 dark:hover:text-brand-300"
              )}
            >
              <n.icon className="w-4 h-4" />
              {n.label}
            </Link>
          );
        })}
        <div className="mt-auto pt-4 border-t border-ink-200 dark:border-ink-700">
          <div className="px-2 mb-3 flex items-center justify-between gap-2">
            <div className="flex-1 min-w-0">
              <p className="text-sm text-ink-800 dark:text-ink-200 font-medium truncate">{user.name}</p>
              <p className="text-xs text-ink-500 truncate">{user.email}</p>
            </div>
            <ThemeToggle compact />
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-ink-600 dark:text-ink-300 hover:bg-brand-50 dark:hover:bg-ink-800 hover:text-brand-700 dark:hover:text-brand-300 w-full font-medium"
          >
            <LogOut className="w-4 h-4" />
            Log out
          </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0">
        <header className="px-4 md:px-8 py-4 border-b border-ink-200 dark:border-ink-700 flex items-center justify-between gap-3 sticky top-0 bg-white/80 dark:bg-ink-950/80 backdrop-blur-xl z-20">
          {/* Mobile-only hamburger toggle */}
          <button
            onClick={() => setMobileOpen((v) => !v)}
            className="md:hidden h-9 w-9 rounded-lg flex items-center justify-center text-ink-700 dark:text-ink-200 hover:bg-brand-50 dark:hover:bg-ink-800 transition"
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
          {/* Spacer pushes the rest to the right on desktop where the hamburger isn't shown */}
          <div className="hidden md:block flex-1" />
          <div className="flex items-center gap-3">
          {patient && (
            <>
              <span className="inline-flex items-center gap-1.5 text-sm text-ink-700 dark:text-ink-300 font-medium">
                <Flame className="w-4 h-4 text-coral-500" />
                {patient.streakDays} day{patient.streakDays === 1 ? "" : "s"}
              </span>
              <CoinCounter coins={patient.coins} />
              {patient.subscriptionStatus === "trial" && (
                <Link
                  href="/app/billing/success"
                  className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg bg-coral-50 dark:bg-coral-950 text-coral-700 dark:text-coral-300 border border-coral-200 dark:border-coral-800 hover:bg-coral-100 dark:hover:bg-coral-900 transition font-medium"
                >
                  <Crown className="w-3.5 h-3.5" />
                  Upgrade
                </Link>
              )}
            </>
          )}
          </div>
        </header>
        <div className="flex-1 px-4 md:px-8 py-6 md:py-8 max-w-6xl mx-auto w-full">
          <PageTransition>{children}</PageTransition>
        </div>
      </main>
    </div>
  );
}
