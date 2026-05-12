import { Coins } from "lucide-react";

export function CoinCounter({ coins }: { coins: number }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-lg bg-gold-500/15 text-gold-400 border border-gold-500/30 px-2.5 py-1 text-sm font-medium">
      <Coins className="w-3.5 h-3.5" />
      {coins.toLocaleString()}
    </span>
  );
}
