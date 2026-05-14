"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Card, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, FormField } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import { api, setAccessToken } from "@/lib/api-client";
import { useAuthStore } from "@/lib/store";

export default function LoginPage() {
  const router = useRouter();
  const { toast } = useToast();
  const setSession = useAuthStore((s) => s.setSession);
  const user = useAuthStore((s) => s.user);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) router.replace(roleHome(user.role));
  }, [user, router]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { user, accessToken } = await api.login({ email, password });
      setAccessToken(accessToken);
      const me = await api.me();
      setSession(me);
      toast({ title: `Welcome back, ${user.name}`, variant: "success" });
      router.replace(roleHome(user.role));
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Login failed";
      setError(msg);
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
        <CardHeader title="Welcome back" subtitle="Log in to continue your practice." />
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
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
          <FormField label="Password" htmlFor="password" error={error}>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </FormField>
          <Button type="submit" loading={loading} className="w-full">
            Log in
          </Button>
        </form>

        <div className="text-xs text-ink-600 mt-5 flex items-center justify-between">
          <span>
            New here?{" "}
            <Link href="/signup" className="text-ink-700 hover:underline">
              Create an account
            </Link>
          </span>
          <Link href="/forgot-password" className="text-ink-500 hover:text-ink-800">
            Forgot password?
          </Link>
        </div>
      </Card>
    </motion.div>
  );
}

function roleHome(role: string) {
  if (role === "doctor") return "/doctor";
  if (role === "admin") return "/admin";
  return "/app";
}
