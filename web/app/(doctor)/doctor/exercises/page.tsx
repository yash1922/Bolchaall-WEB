"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, Trash2, X } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge, DifficultyBadge } from "@/components/ui/Badge";
import { Spinner } from "@/components/ui/Spinner";
import { Input, FormField } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { api } from "@/lib/api-client";

type Exercise = Awaited<ReturnType<typeof api.doctorExercises>>[number];

interface FormItem {
  prompt: string;
  targetWord: string;
  altWord: string;
}

const EMPTY_ITEM: FormItem = { prompt: "Say the word", targetWord: "", altWord: "" };

export default function DoctorExercisesPage() {
  const { toast } = useToast();
  const [list, setList] = useState<Exercise[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [openCreate, setOpenCreate] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<"perception" | "production">("production");
  const [difficulty, setDifficulty] = useState<"easy" | "medium" | "hard">("easy");
  const [phonemes, setPhonemes] = useState("");
  const [items, setItems] = useState<FormItem[]>([{ ...EMPTY_ITEM }]);

  async function load() {
    try {
      const d = await api.doctorExercises();
      setList(d);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    }
  }

  useEffect(() => {
    load();
  }, []);

  const mine = useMemo(() => list?.filter((e) => e.isMine) ?? [], [list]);
  const global = useMemo(() => list?.filter((e) => e.isGlobal) ?? [], [list]);

  function resetForm() {
    setTitle("");
    setDescription("");
    setType("production");
    setDifficulty("easy");
    setPhonemes("");
    setItems([{ ...EMPTY_ITEM }]);
  }

  async function handleCreate() {
    setSubmitting(true);
    try {
      const targetPhonemes = phonemes.split(",").map((s) => s.trim()).filter(Boolean);
      const cleanItems = items
        .map((i) => ({
          prompt: i.prompt.trim(),
          targetWord: i.targetWord.trim(),
          altWord: type === "perception" ? i.altWord.trim() : null,
        }))
        .filter((i) => i.targetWord.length > 0);

      await api.doctorCreateExercise({
        title: title.trim(),
        description: description.trim(),
        targetPhonemes,
        type,
        difficulty,
        items: cleanItems,
      });
      toast({ title: "Exercise created", variant: "success" });
      setOpenCreate(false);
      resetForm();
      await load();
    } catch (e) {
      toast({
        title: "Could not create",
        description: e instanceof Error ? e.message : String(e),
        variant: "error",
      });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string, title: string) {
    if (!confirm(`Delete "${title}"? This cannot be undone.`)) return;
    try {
      await api.doctorDeleteExercise(id);
      toast({ title: "Deleted", variant: "success" });
      await load();
    } catch (e) {
      toast({
        title: "Could not delete",
        description: e instanceof Error ? e.message : String(e),
        variant: "error",
      });
    }
  }

  if (error)
    return (
      <Card>
        <p className="text-rose-600">{error}</p>
      </Card>
    );
  if (!list)
    return (
      <div className="flex items-center justify-center py-24">
        <Spinner size={28} />
      </div>
    );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <h1 className="font-display text-3xl mb-1 text-ink-900 dark:text-ink-100">Exercises</h1>
          <p className="text-sm text-ink-600 dark:text-ink-400">
            {mine.length} of yours · {global.length} in the global library
          </p>
        </div>
        <Button onClick={() => setOpenCreate(true)}>
          <Plus className="w-4 h-4" />
          Create exercise
        </Button>
      </div>

      <section>
        <h2 className="font-display text-xl mb-3 text-ink-900 dark:text-ink-100">My exercises</h2>
        {mine.length === 0 ? (
          <Card>
            <p className="text-sm text-ink-500 py-4 text-center">
              You haven&apos;t created any exercises yet. Click <strong>Create exercise</strong> above to start.
            </p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {mine.map((ex) => (
              <Card key={ex.id}>
                <div className="flex items-start justify-between gap-2">
                  <CardHeader
                    title={ex.title}
                    subtitle={ex.description}
                    action={<DifficultyBadge level={ex.difficulty} />}
                  />
                  <button
                    type="button"
                    aria-label="Delete"
                    onClick={() => handleDelete(ex.id, ex.title)}
                    className="p-1.5 -mt-1 rounded-lg text-ink-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="primary">{ex.type}</Badge>
                  <span className="text-xs text-ink-500">{ex.items.length} items</span>
                  {ex.targetPhonemes.length > 0 && (
                    <span className="font-mono text-xs text-ink-500">
                      {ex.targetPhonemes.join(" · ")}
                    </span>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="font-display text-xl mb-3 text-ink-900 dark:text-ink-100">Global library</h2>
        <p className="text-sm text-ink-600 dark:text-ink-400 mb-3">
          These are the exercises available to all patients on free practice. Assign any to your own patients.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {global.map((ex) => (
            <Card key={ex.id}>
              <CardHeader
                title={ex.title}
                subtitle={ex.description}
                action={<DifficultyBadge level={ex.difficulty} />}
              />
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="primary">{ex.type}</Badge>
                <Badge variant="muted">{ex.setName}</Badge>
                <span className="text-xs text-ink-500">{ex.items.length} items</span>
                {ex.targetPhonemes.length > 0 && (
                  <span className="font-mono text-xs text-ink-500">
                    {ex.targetPhonemes.join(" · ")}
                  </span>
                )}
              </div>
            </Card>
          ))}
        </div>
      </section>

      <Modal
        open={openCreate}
        onOpenChange={setOpenCreate}
        title="Create exercise"
        description="This exercise will be available for you to assign to your patients."
        className="max-w-2xl"
      >
        <div className="flex flex-col gap-4 max-h-[70vh] overflow-y-auto pr-1">
          <FormField label="Title" htmlFor="ex-title">
            <Input
              id="ex-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. /th/ minimal pairs"
            />
          </FormField>
          <FormField label="Description" htmlFor="ex-desc">
            <Input
              id="ex-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What this exercise practices"
            />
          </FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Type" htmlFor="ex-type">
              <select
                id="ex-type"
                value={type}
                onChange={(e) => setType(e.target.value as "perception" | "production")}
                className="flex h-11 w-full rounded-xl bg-white dark:bg-ink-900 border border-ink-200 dark:border-ink-700 px-4 py-2 text-sm text-ink-900 dark:text-ink-100 shadow-sm"
              >
                <option value="production">Production (speak)</option>
                <option value="perception">Perception (listen + pick)</option>
              </select>
            </FormField>
            <FormField label="Difficulty" htmlFor="ex-diff">
              <select
                id="ex-diff"
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value as "easy" | "medium" | "hard")}
                className="flex h-11 w-full rounded-xl bg-white dark:bg-ink-900 border border-ink-200 dark:border-ink-700 px-4 py-2 text-sm text-ink-900 dark:text-ink-100 shadow-sm"
              >
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </FormField>
          </div>
          <FormField
            label="Target phonemes (comma-separated, optional)"
            htmlFor="ex-phon"
          >
            <Input
              id="ex-phon"
              value={phonemes}
              onChange={(e) => setPhonemes(e.target.value)}
              placeholder="/th/, /s/"
            />
          </FormField>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-ink-600 dark:text-ink-400 mb-2">
              Items {type === "perception" ? "(needs target + alternative for each)" : "(target word for each)"}
            </p>
            <div className="flex flex-col gap-2">
              {items.map((it, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-2 rounded-lg bg-ink-100 dark:bg-ink-800 p-2"
                >
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 flex-1">
                    <Input
                      value={it.prompt}
                      onChange={(e) =>
                        setItems((prev) =>
                          prev.map((p, i) => (i === idx ? { ...p, prompt: e.target.value } : p))
                        )
                      }
                      placeholder="Prompt"
                      className="h-9"
                    />
                    <Input
                      value={it.targetWord}
                      onChange={(e) =>
                        setItems((prev) =>
                          prev.map((p, i) =>
                            i === idx ? { ...p, targetWord: e.target.value } : p
                          )
                        )
                      }
                      placeholder="Target word"
                      className="h-9"
                    />
                    {type === "perception" && (
                      <Input
                        value={it.altWord}
                        onChange={(e) =>
                          setItems((prev) =>
                            prev.map((p, i) =>
                              i === idx ? { ...p, altWord: e.target.value } : p
                            )
                          )
                        }
                        placeholder="Alt word"
                        className="h-9"
                      />
                    )}
                  </div>
                  <button
                    type="button"
                    aria-label="Remove item"
                    onClick={() => setItems((prev) => prev.filter((_, i) => i !== idx))}
                    className="p-1.5 mt-1 text-ink-400 hover:text-rose-600 rounded"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-2"
              onClick={() => setItems((prev) => [...prev, { ...EMPTY_ITEM }])}
            >
              <Plus className="w-3.5 h-3.5" />
              Add item
            </Button>
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-ink-200 dark:border-ink-700">
          <Button variant="ghost" onClick={() => setOpenCreate(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={handleCreate} loading={submitting} disabled={!title.trim() || items.every((i) => !i.targetWord.trim())}>
            Create
          </Button>
        </div>
      </Modal>
    </div>
  );
}
