import Link from "next/link";
import { Button } from "@/components/ui/Button";

export default function NotFound() {
  return (
    <main className="min-h-screen flex items-center justify-center px-6">
      <div className="card-base rounded-2xl p-10 text-center max-w-md">
        <p className="font-mono text-xs uppercase tracking-[0.3em] text-brand-600 mb-3">
          404
        </p>
        <h1 className="font-display text-4xl mb-2 text-ink-900">Page not found</h1>
        <p className="text-sm text-ink-600 mb-6">
          That page doesn&apos;t exist. Let&apos;s get you back home.
        </p>
        <Link href="/">
          <Button>Back to home</Button>
        </Link>
      </div>
    </main>
  );
}
