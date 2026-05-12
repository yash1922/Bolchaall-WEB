"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
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
} from "lucide-react";
import { useAuthStore } from "@/lib/store";
import { api, setAccessToken } from "@/lib/api-client";
import { CoinCounter } from "@/components/patient/CoinCounter";
import { PageTransition } from "@/components/providers/PageTransition";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/app", label: "Dashboard", icon: Home },
  { href: "/app/phonemes", label: "Phonemes", icon: BookOpen },
  { href: "/app/exercise/free", label: "Free practice", icon: Mic },
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
      <aside className="w-60 border-r border-ink-200 bg-white/80 backdrop-blur-xl px-4 py-6 flex flex-col gap-1 sticky top-0 h-screen">
        <Link href="/app" className="flex items-center gap-2 mb-6 px-2">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-brand-400 to-brand-700 flex items-center justify-center text-white shadow-soft">
            <Sparkles className="w-4 h-4" />
          </div>
          <span className="font-display text-xl text-ink-900">Bolchall</span>
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
          <div className="px-2 mb-3">
            <p className="text-sm text-ink-800 font-medium truncate">{user.name}</p>
            <p className="text-xs text-ink-500 truncate">{user.email}</p>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-ink-600 hover:bg-brand-50 hover:text-brand-700 w-full font-medium"
          >
            <LogOut className="w-4 h-4" />
            Log out
          </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col">
        <header className="px-8 py-4 border-b border-ink-200 flex items-center justify-end gap-3 sticky top-0 bg-white/80 backdrop-blur-xl z-10">
          {patient && (
            <>
              <span className="inline-flex items-center gap-1.5 text-sm text-ink-700 font-medium">
                <Flame className="w-4 h-4 text-coral-500" />
                {patient.streakDays} day{patient.streakDays === 1 ? "" : "s"}
              </span>
              <CoinCounter coins={patient.coins} />
              {patient.subscriptionStatus === "trial" && (
                <Link
                  href="/app/billing/success"
                  className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg bg-coral-50 text-coral-700 border border-coral-200 hover:bg-coral-100 transition font-medium"
                >
                  <Crown className="w-3.5 h-3.5" />
                  Upgrade
                </Link>
              )}
            </>
          )}
        </header>
        <div className="flex-1 px-8 py-8 max-w-6xl mx-auto w-full">
          <PageTransition>{children}</PageTransition>
        </div>
      </main>
    </div>
  );
}
