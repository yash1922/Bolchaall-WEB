import { Award, Flame, Medal, Rocket, Star, Target, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";

const ICON_MAP: Record<string, typeof Trophy> = {
  trophy: Trophy,
  flame: Flame,
  rocket: Rocket,
  target: Target,
  medal: Medal,
  star: Star,
  award: Award,
};

export function AchievementBadge({
  name,
  description,
  icon,
  unlocked,
  glow = false,
}: {
  name: string;
  description: string;
  icon: string;
  unlocked: boolean;
  glow?: boolean;
}) {
  const Icon = ICON_MAP[icon] ?? Trophy;
  return (
    <div
      className={cn(
        "rounded-xl border p-3 flex flex-col items-center text-center gap-2 transition",
        unlocked
          ? "bg-gradient-to-br from-brand-50 to-brand-100 border-brand-300 text-ink-900 shadow-soft"
          : "bg-ink-100 border-ink-200 text-ink-400",
        glow && unlocked && "ring-2 ring-gold-400 shadow-[0_0_20px_rgba(251,191,36,0.4)]"
      )}
      title={description}
    >
      <Icon
        className={cn(
          "w-6 h-6",
          unlocked ? "text-gold-500" : "text-ink-300"
        )}
      />
      <span className="text-xs font-medium leading-tight">{name}</span>
    </div>
  );
}
