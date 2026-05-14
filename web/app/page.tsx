"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Sparkles, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/Button";

export default function Landing() {
  return (
    <main className="min-h-screen flex flex-col">
      <header className="px-6 lg:px-12 py-6 flex items-center justify-between max-w-6xl mx-auto w-full">
        <div className="flex items-center gap-2">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-brand-400 to-brand-700 flex items-center justify-center text-white shadow-soft">
            <Sparkles className="w-4 h-4" />
          </div>
          <span className="font-display text-xl text-ink-900 dark:text-ink-100">Bolchall</span>
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
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="max-w-2xl text-center"
        >
          <span className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-brand-700 dark:text-brand-300 mb-6 font-semibold">
            Speech therapy at home
          </span>
          <h1 className="font-display text-5xl lg:text-7xl leading-[1.05] mb-6 text-ink-900 dark:text-ink-100">
            Speak with{" "}
            <span className="text-brand-600 dark:text-brand-400">confidence</span>.
          </h1>
          <p className="text-lg text-ink-700 dark:text-ink-300 mb-10 max-w-xl mx-auto">
            Daily phoneme practice with a friendly speaking guide and instant pronunciation feedback —
            paired with a certified therapist when you need one.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
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
          <p className="mt-6 text-xs text-ink-500">3-day free trial · No credit card required</p>
        </motion.div>
      </section>
    </main>
  );
}
