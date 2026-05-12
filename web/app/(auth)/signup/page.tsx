"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Card, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, FormField, Label } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import { api, setAccessToken } from "@/lib/api-client";
import { useAuthStore } from "@/lib/store";
import { cn } from "@/lib/utils";

type Role = "patient" | "doctor";

export default function SignupPage() {
  const router = useRouter();
  const { toast } = useToast();
  const setSession = useAuthStore((s) => s.setSession);
  const user = useAuthStore((s) => s.user);

  const [role, setRole] = useState<Role>("patient");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) router.replace(user.role === "doctor" ? "/doctor" : "/welcome");
  }, [user, router]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { user, accessToken } = await api.signup({ name, email, password, role });
      setAccessToken(accessToken);
      const me = await api.me();
      setSession(me);
      toast({ title: `Welcome to Bolchall, ${user.name}`, variant: "success" });
      if (role === "patient") router.replace("/welcome");
      else router.replace("/doctor");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Signup failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="w-full max-w-md"
    >
      <Card>
        <CardHeader title="Create your account" subtitle="Start your 3-day free trial." />

        <div className="grid grid-cols-2 gap-2 mb-5">
          <RoleTile
            active={role === "patient"}
            onClick={() => setRole("patient")}
            title="I'm a patient"
            body="Practice at home with a therapist."
          />
          <RoleTile
            active={role === "doctor"}
            onClick={() => setRole("doctor")}
            title="I'm a therapist"
            body="Take on new patients on the platform."
          />
        </div>

        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <FormField label="Full name" htmlFor="name">
            <Input
              id="name"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Alex Rivera"
            />
          </FormField>
          <FormField label="Email" htmlFor="email">
            <Input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
            />
          </FormField>
          <FormField
            label="Password"
            htmlFor="password"
            hint="At least 8 characters."
            error={error}
          >
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </FormField>
          <Button type="submit" loading={loading} className="w-full">
            Create account
          </Button>
        </form>

        <p className="text-xs text-ink-600 mt-5 text-center">
          Already have an account?{" "}
          <Link href="/login" className="text-ink-700 hover:underline">
            Log in
          </Link>
        </p>
      </Card>
    </motion.div>
  );
}

function RoleTile({
  active,
  onClick,
  title,
  body,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  body: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-xl p-3 text-left border transition",
        active
          ? "border-brand-400 bg-brand-500/15"
          : "border-ink-200 bg-white hover:border-ink-300"
      )}
    >
      <Label className={active ? "text-ink-700" : ""}>{title}</Label>
      <p className="text-xs text-ink-500 mt-1">{body}</p>
    </button>
  );
}
