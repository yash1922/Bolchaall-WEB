import { cn } from "@/lib/utils";

type Variant =
  | "default"
  | "primary"
  | "success"
  | "warning"
  | "danger"
  | "info"
  | "muted"
  | "trial";

const variants: Record<Variant, string> = {
  default: "bg-ink-100 text-ink-700 border-ink-200",
  primary: "bg-brand-50 text-brand-700 border-brand-200",
  success: "bg-emerald-50 text-emerald-700 border-emerald-200",
  warning: "bg-amber-50 text-amber-700 border-amber-200",
  danger: "bg-rose-50 text-rose-700 border-rose-200",
  info: "bg-sky-50 text-sky-700 border-sky-200",
  muted: "bg-ink-100 text-ink-600 border-ink-200",
  trial: "bg-coral-50 text-coral-600 border-coral-200",
};

export function Badge({
  children,
  variant = "default",
  className,
}: {
  children: React.ReactNode;
  variant?: Variant;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium",
        variants[variant],
        className
      )}
    >
      {children}
    </span>
  );
}

export function DifficultyBadge({ level }: { level: "easy" | "medium" | "hard" }) {
  if (level === "easy") return <Badge variant="success">easy</Badge>;
  if (level === "medium") return <Badge variant="warning">medium</Badge>;
  return <Badge variant="danger">hard</Badge>;
}
