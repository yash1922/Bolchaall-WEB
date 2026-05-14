"use client";

import * as RToast from "@radix-ui/react-toast";
import { createContext, useCallback, useContext, useState } from "react";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";
import { cn } from "@/lib/utils";

type ToastVariant = "success" | "error" | "info";

interface ToastEntry {
  id: number;
  title: string;
  description?: string;
  variant: ToastVariant;
}

interface ToastCtx {
  toast: (t: { title: string; description?: string; variant?: ToastVariant }) => void;
}

const Ctx = createContext<ToastCtx | null>(null);

export function useToast() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useToast must be used within ToastProvider");
  return v;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [list, setList] = useState<ToastEntry[]>([]);

  const toast = useCallback<ToastCtx["toast"]>(({ title, description, variant = "info" }) => {
    const id = Date.now() + Math.random();
    setList((prev) => [...prev, { id, title, description, variant }]);
    setTimeout(() => setList((prev) => prev.filter((t) => t.id !== id)), 5000);
  }, []);

  return (
    <Ctx.Provider value={{ toast }}>
      <RToast.Provider swipeDirection="right" duration={5000}>
        {children}
        {list.map((t) => (
          <RToast.Root
            key={t.id}
            className={cn(
              "glass-strong rounded-xl p-4 grid grid-cols-[auto_1fr_auto] gap-3 items-start",
              "data-[state=open]:animate-slide-up",
              "data-[state=closed]:opacity-0",
              "transition-all"
            )}
          >
            <span
              className={cn(
                "h-8 w-8 rounded-lg flex items-center justify-center",
                t.variant === "success" && "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:ring-emerald-800",
                t.variant === "error" && "bg-rose-50 text-rose-700 ring-1 ring-rose-200 dark:bg-rose-950 dark:text-rose-300 dark:ring-rose-800",
                t.variant === "info" && "bg-brand-50 text-brand-700 ring-1 ring-brand-200 dark:bg-brand-950 dark:text-brand-300 dark:ring-brand-800"
              )}
            >
              {t.variant === "success" && <CheckCircle2 className="w-4 h-4" />}
              {t.variant === "error" && <AlertCircle className="w-4 h-4" />}
              {t.variant === "info" && <Info className="w-4 h-4" />}
            </span>
            <div>
              <RToast.Title className="font-medium text-sm">{t.title}</RToast.Title>
              {t.description && (
                <RToast.Description className="text-xs text-ink-600 dark:text-ink-400 mt-0.5">
                  {t.description}
                </RToast.Description>
              )}
            </div>
            <RToast.Close className="p-1 rounded hover:bg-white dark:hover:bg-ink-800">
              <X className="w-3.5 h-3.5" />
            </RToast.Close>
          </RToast.Root>
        ))}
        <RToast.Viewport className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 w-96 max-w-[calc(100vw-2rem)]" />
      </RToast.Provider>
    </Ctx.Provider>
  );
}
