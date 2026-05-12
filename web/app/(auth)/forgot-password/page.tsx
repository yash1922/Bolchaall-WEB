"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Card, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, FormField } from "@/components/ui/Input";

export default function ForgotPasswordPage() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="w-full max-w-md"
    >
      <Card>
        <CardHeader
          title="Forgot password?"
          subtitle="Enter your email — we'll send you a reset link."
        />
        <form className="flex flex-col gap-4" onSubmit={(e) => e.preventDefault()}>
          <FormField
            label="Email"
            htmlFor="email"
            hint="In hackathon mode, password reset is logged to the API console."
          >
            <Input id="email" type="email" placeholder="you@example.com" />
          </FormField>
          <Button type="submit" className="w-full">
            Send reset link
          </Button>
        </form>
        <p className="text-xs text-ink-600 mt-5 text-center">
          <Link href="/login" className="text-ink-700 hover:underline">
            Back to login
          </Link>
        </p>
      </Card>
    </motion.div>
  );
}
