"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/store";

export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const patient = useAuthStore((s) => s.patient);
  const hydrated = useAuthStore((s) => s.hydrated);

  useEffect(() => {
    if (!hydrated) return;
    if (!user) router.replace("/login");
    else if (user.role !== "patient") router.replace(user.role === "doctor" ? "/doctor" : "/admin");
    else if (patient?.onboardingComplete) router.replace("/app");
  }, [hydrated, user, patient, router]);

  if (!hydrated || !user) return null;
  return <main className="min-h-screen flex items-center justify-center px-6 py-10">{children}</main>;
}
