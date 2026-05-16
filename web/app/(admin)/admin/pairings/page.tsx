"use client";

import { useEffect, useMemo, useState } from "react";
import { UserCog, Stethoscope } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Spinner } from "@/components/ui/Spinner";
import { useToast } from "@/components/ui/Toast";
import { api } from "@/lib/api-client";

type Data = Awaited<ReturnType<typeof api.adminAssignments>>;

/**
 * Patient ↔ therapist pairings (NOT homework assignments — those live at /admin/assignments).
 * This page is purely for managing which doctor each patient is paired with.
 */
export default function AdminPairingsPage() {
  const { toast } = useToast();
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);

  async function load() {
    try {
      const d = await api.adminAssignments();
      setData(d);
      setPending({});
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    }
  }

  useEffect(() => {
    load();
  }, []);

  const doctorById = useMemo(() => {
    const m = new Map<string, Data["doctors"][number]>();
    data?.doctors.forEach((d) => m.set(d.userId, d));
    return m;
  }, [data]);

  async function save(patientUserId: string) {
    const newDoctorId = pending[patientUserId];
    if (newDoctorId === undefined) return;
    setBusy(patientUserId);
    try {
      await api.adminAssignPatient(patientUserId, newDoctorId === "" ? null : newDoctorId);
      toast({ title: "Pairing updated", variant: "success" });
      await load();
    } catch (e) {
      toast({
        title: "Could not update",
        description: e instanceof Error ? e.message : String(e),
        variant: "error",
      });
    } finally {
      setBusy(null);
    }
  }

  if (error)
    return (
      <Card>
        <p className="text-rose-600">{error}</p>
      </Card>
    );
  if (!data)
    return (
      <div className="flex items-center justify-center py-24">
        <Spinner size={28} />
      </div>
    );

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-3xl mb-1 text-ink-900 dark:text-ink-100">
          Patient ↔ therapist pairings
        </h1>
        <p className="text-sm text-ink-600 dark:text-ink-400">
          {data.patients.length} patients · {data.doctors.length} approved therapists.
          Use this page to reassign which therapist a patient sees. Homework assignments live
          under <a href="/admin/assignments" className="text-brand-700 dark:text-brand-300 underline">Assignments</a>.
        </p>
      </div>

      <Card>
        <CardHeader
          title="Therapist load"
          subtitle="Approved therapists and how many patients each currently has."
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {data.doctors.map((d) => (
            <div
              key={d.userId}
              className="rounded-xl border border-ink-200 dark:border-ink-700 p-3 bg-white dark:bg-ink-900"
            >
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-lg bg-brand-100 dark:bg-brand-900 text-brand-700 dark:text-brand-300 flex items-center justify-center">
                  <Stethoscope className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-ink-900 dark:text-ink-100 truncate">
                    {d.name}
                  </p>
                  <p className="text-xs text-ink-500 truncate">{d.specialization || "—"}</p>
                </div>
                <Badge variant="primary">{d.rosterCount}</Badge>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-ink-100 dark:bg-ink-800">
              <tr>
                <th className="text-left py-2.5 px-4 text-xs uppercase tracking-wider text-ink-600 dark:text-ink-400">
                  Patient
                </th>
                <th className="text-left py-2.5 px-4 text-xs uppercase tracking-wider text-ink-600 dark:text-ink-400">
                  Subscription
                </th>
                <th className="text-left py-2.5 px-4 text-xs uppercase tracking-wider text-ink-600 dark:text-ink-400">
                  Currently paired with
                </th>
                <th className="text-left py-2.5 px-4 text-xs uppercase tracking-wider text-ink-600 dark:text-ink-400">
                  Re-pair with
                </th>
                <th />
              </tr>
            </thead>
            <tbody>
              {data.patients.map((p) => {
                const current = p.assignedDoctorId ? doctorById.get(p.assignedDoctorId) : null;
                const selected = pending[p.userId] ?? p.assignedDoctorId ?? "";
                return (
                  <tr key={p.userId} className="border-t border-ink-200 dark:border-ink-700">
                    <td className="py-3 px-4">
                      <p className="text-ink-900 dark:text-ink-100">{p.name}</p>
                      <p className="text-xs text-ink-500">{p.email}</p>
                    </td>
                    <td className="py-3 px-4">
                      <Badge variant={p.subscriptionStatus === "active" ? "success" : "warning"}>
                        {p.subscriptionStatus}
                      </Badge>
                    </td>
                    <td className="py-3 px-4">
                      {current ? (
                        <span className="text-ink-900 dark:text-ink-100">{current.name}</span>
                      ) : (
                        <span className="text-ink-500 italic">unassigned</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <select
                        value={selected}
                        onChange={(e) =>
                          setPending((prev) => ({ ...prev, [p.userId]: e.target.value }))
                        }
                        className="h-9 rounded-lg bg-white dark:bg-ink-900 border border-ink-200 dark:border-ink-700 px-2 text-sm text-ink-900 dark:text-ink-100"
                      >
                        <option value="">— Unassign —</option>
                        {data.doctors.map((d) => (
                          <option key={d.userId} value={d.userId}>
                            {d.name} ({d.rosterCount})
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="py-3 px-4 text-right">
                      {pending[p.userId] !== undefined &&
                        pending[p.userId] !== (p.assignedDoctorId ?? "") && (
                          <Button
                            size="sm"
                            loading={busy === p.userId}
                            onClick={() => save(p.userId)}
                          >
                            <UserCog className="w-3.5 h-3.5" />
                            Save
                          </Button>
                        )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
