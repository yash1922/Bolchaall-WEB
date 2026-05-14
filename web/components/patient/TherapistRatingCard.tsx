"use client";

import { useEffect, useState } from "react";
import { Star } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { useToast } from "@/components/ui/Toast";
import { api } from "@/lib/api-client";
import { cn } from "@/lib/utils";

export function TherapistRatingCard({ doctorName }: { doctorName: string }) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [stars, setStars] = useState<number | null>(null);
  const [hovered, setHovered] = useState<number | null>(null);
  const [comment, setComment] = useState("");
  const [average, setAverage] = useState<number | null>(null);
  const [count, setCount] = useState(0);
  const [editing, setEditing] = useState(false);

  async function load() {
    try {
      const r = await api.patientGetTherapistRating();
      setStars(r.stars);
      setComment(r.comment ?? "");
      setAverage(r.averageRating);
      setCount(r.ratingCount);
      setEditing(r.stars === null);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function submit() {
    if (!stars) {
      toast({ title: "Pick a star rating first", variant: "error" });
      return;
    }
    setBusy(true);
    try {
      const r = await api.patientRateTherapist({ stars, comment: comment.trim() });
      setAverage(r.averageRating);
      setCount(r.ratingCount);
      setEditing(false);
      toast({ title: "Thanks for the feedback!", variant: "success" });
    } catch (e) {
      toast({
        title: "Could not submit",
        description: e instanceof Error ? e.message : String(e),
        variant: "error",
      });
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <Card>
        <div className="flex items-center justify-center py-6">
          <Spinner size={20} />
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader
        title="Rate your therapist"
        subtitle={
          average !== null
            ? `${doctorName} has an average rating of ${average.toFixed(1)} ★ from ${count} patient${count === 1 ? "" : "s"}.`
            : `Be the first to rate ${doctorName}.`
        }
      />
      <div className="flex items-center gap-1 mb-3">
        {Array.from({ length: 5 }).map((_, i) => {
          const value = i + 1;
          const filled = (hovered ?? stars ?? 0) >= value;
          return (
            <button
              key={i}
              type="button"
              disabled={!editing}
              onMouseEnter={() => editing && setHovered(value)}
              onMouseLeave={() => editing && setHovered(null)}
              onClick={() => editing && setStars(value)}
              aria-label={`${value} star${value === 1 ? "" : "s"}`}
              className={cn(
                "h-9 w-9 rounded-lg flex items-center justify-center transition",
                editing
                  ? "hover:bg-gold-100 dark:hover:bg-gold-900/30"
                  : "cursor-default"
              )}
            >
              <Star
                className={cn(
                  "w-6 h-6 transition",
                  filled ? "text-gold-500 fill-gold-500" : "text-ink-300 dark:text-ink-700"
                )}
              />
            </button>
          );
        })}
      </div>
      {editing ? (
        <>
          <textarea
            rows={3}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder={`Anything you want ${doctorName} or future patients to know? (optional)`}
            className="w-full rounded-xl bg-white dark:bg-ink-900 border border-ink-200 dark:border-ink-700 px-3 py-2 text-sm text-ink-900 dark:text-ink-100 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 mb-3"
          />
          <div className="flex items-center justify-end gap-2">
            {stars !== null && (
              <Button variant="ghost" onClick={() => setEditing(false)} disabled={busy}>
                Cancel
              </Button>
            )}
            <Button onClick={submit} loading={busy} disabled={!stars}>
              {stars !== null ? "Submit rating" : "Pick stars first"}
            </Button>
          </div>
        </>
      ) : (
        <>
          {comment && (
            <p className="text-sm text-ink-700 dark:text-ink-300 italic mb-3">&ldquo;{comment}&rdquo;</p>
          )}
          <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
            Edit my rating
          </Button>
        </>
      )}
    </Card>
  );
}
