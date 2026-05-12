"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { api, setAccessToken, setOnAuthLost } from "@/lib/api-client";
import { useAuthStore } from "@/lib/store";

const PUBLIC_PATHS = ["/", "/login", "/signup", "/forgot-password"];

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const setSession = useAuthStore((s) => s.setSession);
  const clearSession = useAuthStore((s) => s.clearSession);
  const setHydrated = useAuthStore((s) => s.setHydrated);
  const hydrated = useAuthStore((s) => s.hydrated);

  useEffect(() => {
    setOnAuthLost(() => {
      clearSession();
      setAccessToken(null);
      if (!PUBLIC_PATHS.includes(pathname ?? "")) router.push("/login");
    });
  }, [clearSession, router, pathname]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const me = await api.me();
        if (!cancelled) setSession(me);
      } catch {
        if (!cancelled) clearSession();
      } finally {
        if (!cancelled) setHydrated(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [setSession, clearSession, setHydrated]);

  // Route guards
  const user = useAuthStore((s) => s.user);
  useEffect(() => {
    if (!hydrated) return;
    if (!user && !PUBLIC_PATHS.includes(pathname ?? "")) {
      router.push("/login");
    }
  }, [hydrated, user, pathname, router]);

  return <>{children}</>;
}
