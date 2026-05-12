"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Sparkles, ArrowRight } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useAuthStore } from "@/lib/store";

export default function WelcomePage() {
  const user = useAuthStore((s) => s.user);
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="max-w-md w-full"
    >
      <Card className="text-center py-10">
        <Sparkles className="w-10 h-10 mx-auto mb-4 text-ink-500" />
        <h1 className="font-display text-3xl mb-2">Welcome, {user?.name?.split(" ")[0] ?? "friend"}</h1>
        <p className="text-sm text-ink-600 mb-1">
          Let's tune Bolchall to you. Three quick questions.
        </p>
        <p className="text-xs text-ink-400 mb-8">Step 1 of 3</p>
        <Link href="/select-language">
          <Button size="lg">
            Begin <ArrowRight className="w-4 h-4" />
          </Button>
        </Link>
      </Card>
    </motion.div>
  );
}
