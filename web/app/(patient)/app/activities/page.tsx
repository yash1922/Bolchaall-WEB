"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Layers, Scissors, Sparkles } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

const ACTIVITIES = [
  {
    href: "/app/activities/blending",
    title: "Phoneme blending",
    tagline: "Hear the sounds, build the word",
    body: "Listen to individual phonemes and put them together into a real word. Builds reading + decoding for kids who get stuck on unfamiliar words.",
    icon: Layers,
    color: "brand",
    duration: "5 min",
  },
  {
    href: "/app/activities/deleting",
    title: "Phoneme deletion",
    tagline: "Drop a sound, what's left?",
    body: "Hear a word, then say it again with one sound removed. Great for phonological awareness and fast articulation switching.",
    icon: Scissors,
    color: "coral",
    duration: "5 min",
  },
] as const;

export default function ActivitiesPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <div className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.25em] text-brand-700 dark:text-brand-300 font-semibold mb-3">
          <Sparkles className="w-3.5 h-3.5" />
          Activities
        </div>
        <h1 className="font-display text-4xl mb-2 text-ink-900 dark:text-ink-100">
          Quick brain games for sound awareness
        </h1>
        <p className="text-base text-ink-700 dark:text-ink-300 max-w-2xl">
          Bite-sized activities especially helpful for kids learning to read and recover articulation
          control. Each round earns XP and coins based on your accuracy.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {ACTIVITIES.map((a, i) => (
          <motion.div
            key={a.href}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: i * 0.06 }}
          >
            <Link href={a.href} className="block group">
              <Card className="h-full hover:border-brand-400 transition border-2 border-transparent">
                <CardHeader
                  title={
                    <span className="flex items-center gap-2">
                      <span
                        className={
                          a.color === "brand"
                            ? "h-9 w-9 rounded-xl bg-brand-100 dark:bg-brand-900 text-brand-700 dark:text-brand-300 flex items-center justify-center"
                            : "h-9 w-9 rounded-xl bg-coral-100 dark:bg-coral-900 text-coral-700 dark:text-coral-300 flex items-center justify-center"
                        }
                      >
                        <a.icon className="w-4 h-4" />
                      </span>
                      {a.title}
                    </span>
                  }
                  subtitle={a.tagline}
                  action={<Badge variant="muted">{a.duration}</Badge>}
                />
                <p className="text-sm text-ink-700 dark:text-ink-300 mb-3">{a.body}</p>
                <span className="inline-flex items-center gap-1 text-sm font-medium text-brand-700 dark:text-brand-300 group-hover:underline">
                  Start
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition" />
                </span>
              </Card>
            </Link>
          </motion.div>
        ))}
      </div>

      <Card className="bg-brand-50 dark:bg-brand-950 border-brand-200 dark:border-brand-800">
        <CardHeader
          title="Why these matter"
          subtitle="Two foundational phonological-awareness skills"
        />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-ink-700 dark:text-ink-300">
          <p>
            <strong className="text-brand-700 dark:text-brand-300">Phoneme blending</strong> is the
            skill of connecting sounds in words you see but don&apos;t know. It&apos;s the bridge
            between letter knowledge and reading.
          </p>
          <p>
            <strong className="text-coral-700 dark:text-coral-300">Phoneme deletion</strong> is
            identifying each sound in words you hear, then mentally removing one. It strengthens
            sound-symbol mapping and articulation flexibility.
          </p>
        </div>
      </Card>
    </div>
  );
}
