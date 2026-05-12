"use client";

import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <Card className="max-w-xl mx-auto mt-12">
      <h2 className="font-display text-2xl mb-2">Something broke</h2>
      <p className="text-sm text-ink-600 mb-4">{error.message || "Unknown error"}</p>
      <Button onClick={reset}>Try again</Button>
    </Card>
  );
}
