"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Sparkles, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { api, setAccessToken } from "@/lib/api-client";
import { useAuthStore } from "@/lib/store";

type DemoRole = "patient.sara" | "dr.priya" | "admin";

const DEMO_OPTIONS: Array<{ id: DemoRole; label: string; email: string; href: string }> = [
  { id: "patient.sara", label: "Patient", email: "patient.sara@bolchall.demo", href: "/app" },
  { id: "dr.priya", label: "Therapist", email: "dr.priya@bolchall.demo", href: "/doctor" },
  { id: "admin", label: "Admin", email: "admin@bolchall.demo", href: "/admin" },
];

export default function Landing() {
  const router = useRouter();
  const setSession = useAuthStore((s) => s.setSession);
  const [demoLoading, setDemoLoading] = useState<DemoRole | null>(null);

  async function quickDemo(opt: (typeof DEMO_OPTIONS)[number]) {
    setDemoLoading(opt.id);
    try {
      const { accessToken } = await api.login({ email: opt.email, password: "Bolchall@2026" });
      setAccessToken(accessToken);
      const me = await api.me();
      setSession(me);
      router.push(opt.href);
    } catch (e) {
      console.error(e);
      setDemoLoading(null);
    }
  }

  return (
    <main className="min-h-screen flex flex-col">
      <header className="px-6 lg:px-12 py-6 flex items-center justify-between max-w-6xl mx-auto w-full">
        <div className="flex items-center gap-2">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-brand-400 to-brand-700 flex items-center justify-center text-white shadow-soft">
            <Sparkles className="w-4 h-4" />
          </div>
          <span className="font-display text-xl text-ink-900">Bolchall</span>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/login">
            <Button variant="ghost" size="sm">Log in</Button>
          </Link>
          <Link href="/signup">
            <Button size="sm">Get started</Button>
          </Link>
        </div>
      </header>

      <section className="flex-1 flex items-center justify-center px-6 lg:px-12 pb-12">
        <div className="max-w-2xl text-center">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <span className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-brand-700 mb-6 font-semibold">
              Speech therapy at home
            </span>
            <h1 className="font-display text-5xl lg:text-7xl leading-[1.05] mb-6 text-ink-900">
              Speak with{" "}
              <span className="text-brand-600">confidence</span>.
            </h1>
            <p className="text-lg text-ink-700 mb-8 max-w-xl mx-auto">
              Daily phoneme practice with a friendly speaking guide and instant pronunciation feedback.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3 mb-12">
              <Link href="/signup">
                <Button size="lg">
                  Start free trial <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
              <Link href="/login">
                <Button variant="outline" size="lg">
                  I already have an account
                </Button>
              </Link>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="card-base rounded-2xl p-5 max-w-md mx-auto"
          >
            <p className="text-xs uppercase tracking-wider text-ink-500 mb-3 font-semibold">
              Try the demo
            </p>
            <div className="grid grid-cols-3 gap-2">
              {DEMO_OPTIONS.map((opt) => (
                <Button
                  key={opt.id}
                  variant="outline"
                  size="sm"
                  loading={demoLoading === opt.id}
                  onClick={() => quickDemo(opt)}
                >
                  {opt.label}
                </Button>
              ))}
            </div>
          </motion.div>
        </div>
      </section>
    </main>
  );
}
