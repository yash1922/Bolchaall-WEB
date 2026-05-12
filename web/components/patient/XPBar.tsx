import { Zap } from "lucide-react";
import { xpToLevel } from "@/lib/utils";

export function XPBar({ xp }: { xp: number }) {
  const { level, current, next, pct } = xpToLevel(xp);
  return (
    <div className="flex items-center gap-3">
      <div className="h-10 w-10 rounded-xl bg-brand-100 text-brand-700 flex items-center justify-center">
        <Zap className="w-4 h-4" />
      </div>
      <div className="flex-1">
        <div className="flex items-center justify-between text-xs text-ink-600 mb-1 font-medium">
          <span>Level {level}</span>
          <span>
            {current} / {next} XP
          </span>
        </div>
        <div className="h-2.5 rounded-full bg-ink-100 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-brand-400 to-brand-600 transition-all duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    </div>
  );
}
