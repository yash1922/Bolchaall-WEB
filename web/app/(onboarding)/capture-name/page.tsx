"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Card, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, FormField } from "@/components/ui/Input";
import { useAuthStore } from "@/lib/store";

export default function CaptureNamePage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const [preferred, setPreferred] = useState(user?.name?.split(" ")[0] ?? "");

  function next() {
    sessionStorage.setItem("onboarding.preferredName", preferred.trim());
    router.push("/milestones");
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="max-w-md w-full"
    >
      <Card>
        <CardHeader title="What should we call you?" subtitle="Step 3a of 3" />
        <form
          onSubmit={(e) => {
            e.preventDefault();
            next();
          }}
          className="flex flex-col gap-4"
        >
          <FormField label="Preferred name" htmlFor="preferred">
            <Input
              id="preferred"
              value={preferred}
              onChange={(e) => setPreferred(e.target.value)}
              placeholder="Alex"
              required
            />
          </FormField>
          <Button type="submit" className="w-full" disabled={preferred.trim().length === 0}>
            Continue
          </Button>
        </form>
      </Card>
    </motion.div>
  );
}
