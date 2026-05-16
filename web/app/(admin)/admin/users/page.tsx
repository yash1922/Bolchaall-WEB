"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Ban, RotateCcw, Trash2, Users as UsersIcon, Stethoscope, Shield, AlertTriangle } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Spinner } from "@/components/ui/Spinner";
import { useToast } from "@/components/ui/Toast";
import { api } from "@/lib/api-client";
import { formatRelative, cn } from "@/lib/utils";

type AdminUser = Awaited<ReturnType<typeof api.adminUsers>>[number];
type Tab = "patients" | "therapists" | "admins";

export default function UsersPage() {
  const { toast } = useToast();
  const [list, setList] = useState<AdminUser[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("patients");
  const [confirmDelete, setConfirmDelete] = useState<AdminUser | null>(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    try {
      const d = await api.adminUsers();
      setList(d);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function toggleSuspend(u: AdminUser) {
    try {
      await api.adminSuspend(u.id, !u.suspended);
      toast({
        title: `${!u.suspended ? "Suspended" : "Reinstated"} ${u.name}`,
        variant: "success",
      });
      load();
    } catch (e) {
      toast({ title: "Could not update", description: String(e), variant: "error" });
    }
  }

  async function performDelete() {
    if (!confirmDelete) return;
    setBusy(true);
    try {
      await api.adminDeleteUser(confirmDelete.id);
      toast({
        title: `Deleted ${confirmDelete.name}`,
        description: "All related data has been removed.",
        variant: "success",
      });
      setConfirmDelete(null);
      load();
    } catch (e) {
      toast({
        title: "Delete failed",
        description: e instanceof Error ? e.message : String(e),
        variant: "error",
      });
    } finally {
      setBusy(false);
    }
  }

  const buckets = useMemo(() => {
    const out = { patients: [] as AdminUser[], therapists: [] as AdminUser[], admins: [] as AdminUser[] };
    for (const u of list ?? []) {
      if (u.role === "patient") out.patients.push(u);
      else if (u.role === "doctor") out.therapists.push(u);
      else out.admins.push(u);
    }
    return out;
  }, [list]);

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

  const current = buckets[tab];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-3xl mb-1 text-ink-900 dark:text-ink-100">All users</h1>
        <p className="text-sm text-ink-600 dark:text-ink-400">
          {list.length} accounts total · {buckets.patients.length} patients ·{" "}
          {buckets.therapists.length} therapists · {buckets.admins.length} admins
        </p>
      </div>

      {/* Tab bar */}
      <div className="flex flex-wrap gap-2">
        <TabButton
          icon={<UsersIcon className="w-4 h-4" />}
          label="Patients"
          count={buckets.patients.length}
          active={tab === "patients"}
          onClick={() => setTab("patients")}
        />
        <TabButton
          icon={<Stethoscope className="w-4 h-4" />}
          label="Therapists"
          count={buckets.therapists.length}
          active={tab === "therapists"}
          onClick={() => setTab("therapists")}
        />
        <TabButton
          icon={<Shield className="w-4 h-4" />}
          label="Admins"
          count={buckets.admins.length}
          active={tab === "admins"}
          onClick={() => setTab("admins")}
        />
      </div>

      <Card className="p-0 overflow-hidden">
        {current.length === 0 ? (
          <p className="text-sm text-ink-500 dark:text-ink-400 py-12 text-center">
            No {tab} yet.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-ink-50 dark:bg-ink-900/40">
                <tr>
                  <Th>Name</Th>
                  <Th>Email</Th>
                  {tab === "patients" && (
                    <>
                      <Th>Age</Th>
                      <Th>Phone</Th>
                      <Th>Streak</Th>
                      <Th>Plan</Th>
                    </>
                  )}
                  {tab === "therapists" && (
                    <>
                      <Th>Specialization</Th>
                      <Th>Application</Th>
                      <Th>Rating</Th>
                    </>
                  )}
                  <Th>Joined</Th>
                  <Th>Status</Th>
                  <Th />
                </tr>
              </thead>
              <tbody>
                {current.map((u) => (
                  <tr
                    key={u.id}
                    className="border-t border-ink-200 dark:border-ink-700 hover:bg-brand-50/40 dark:hover:bg-ink-800/40 transition"
                  >
                    <td className="py-3 px-4">
                      <Link
                        href={`/admin/users/${u.id}`}
                        className="font-medium text-ink-900 dark:text-ink-100 hover:text-brand-700 dark:hover:text-brand-300 hover:underline"
                      >
                        {u.name}
                      </Link>
                    </td>
                    <td className="py-3 px-4 text-ink-600 dark:text-ink-400">{u.email}</td>
                    {tab === "patients" && (
                      <>
                        <td className="py-3 px-4 text-ink-700 dark:text-ink-300">
                          {u.age ?? <span className="text-ink-400">—</span>}
                        </td>
                        <td className="py-3 px-4 text-ink-700 dark:text-ink-300">
                          {u.phone || <span className="text-ink-400">—</span>}
                        </td>
                        <td className="py-3 px-4 text-ink-700 dark:text-ink-300">
                          {u.streakDays ?? 0}d
                        </td>
                        <td className="py-3 px-4">
                          {u.subscriptionStatus ? (
                            <Badge
                              variant={
                                u.subscriptionStatus === "active"
                                  ? "success"
                                  : u.subscriptionStatus === "trial"
                                  ? "warning"
                                  : "muted"
                              }
                            >
                              {u.subscriptionStatus}
                            </Badge>
                          ) : (
                            "—"
                          )}
                        </td>
                      </>
                    )}
                    {tab === "therapists" && (
                      <>
                        <td className="py-3 px-4 text-ink-700 dark:text-ink-300">
                          {u.specialization || <span className="text-ink-400">—</span>}
                        </td>
                        <td className="py-3 px-4">
                          {u.doctorStatus ? (
                            <Badge
                              variant={
                                u.doctorStatus === "approved"
                                  ? "success"
                                  : u.doctorStatus === "pending"
                                  ? "warning"
                                  : u.doctorStatus === "rejected"
                                  ? "danger"
                                  : "muted"
                              }
                            >
                              {u.doctorStatus}
                            </Badge>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="py-3 px-4 text-ink-700 dark:text-ink-300">
                          {u.rating !== null ? `${u.rating.toFixed(1)} ★` : "—"}
                        </td>
                      </>
                    )}
                    <td className="py-3 px-4 text-ink-500 dark:text-ink-400 text-xs">
                      {formatRelative(u.createdAt)}
                    </td>
                    <td className="py-3 px-4">
                      {u.suspended ? (
                        <Badge variant="danger">suspended</Badge>
                      ) : (
                        <Badge variant="success">active</Badge>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      {u.role !== "admin" && (
                        <div className="inline-flex items-center gap-1">
                          {u.suspended ? (
                            <Button size="sm" variant="ghost" onClick={() => toggleSuspend(u)}>
                              <RotateCcw className="w-3.5 h-3.5" />
                              Reinstate
                            </Button>
                          ) : (
                            <Button size="sm" variant="ghost" onClick={() => toggleSuspend(u)}>
                              <Ban className="w-3.5 h-3.5" />
                              Suspend
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setConfirmDelete(u)}
                            className="text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            Delete
                          </Button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Delete confirmation modal */}
      {confirmDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4"
          onClick={() => !busy && setConfirmDelete(null)}
        >
          <div
            className="bg-white dark:bg-ink-900 rounded-2xl shadow-lift border border-ink-200 dark:border-ink-700 p-6 max-w-md w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <CardHeader
              title={
                <span className="flex items-center gap-2 text-rose-700 dark:text-rose-300">
                  <AlertTriangle className="w-5 h-5" />
                  Delete {confirmDelete.name}?
                </span>
              }
              subtitle={`This will permanently remove the ${confirmDelete.role} and all their data.`}
            />
            <ul className="text-xs text-ink-700 dark:text-ink-300 space-y-1 mb-4 list-disc list-inside">
              <li>User account ({confirmDelete.email})</li>
              {confirmDelete.role === "patient" && (
                <>
                  <li>Patient profile, XP, coins, streak, achievements</li>
                  <li>All recording scores and exercise attempts</li>
                  <li>All assignments and therapist ratings</li>
                  <li>All chat messages with their therapist</li>
                </>
              )}
              {confirmDelete.role === "doctor" && (
                <>
                  <li>Doctor profile and credentials</li>
                  <li>All assignments they created</li>
                  <li>All chats with their patients</li>
                  <li>Their assigned patients will become unassigned</li>
                </>
              )}
              <li>All authentication tokens (will be logged out everywhere)</li>
            </ul>
            <p className="text-xs text-rose-700 dark:text-rose-400 mb-4 font-semibold">
              This action cannot be undone.
            </p>
            <div className="flex items-center justify-end gap-2">
              <Button variant="ghost" onClick={() => setConfirmDelete(null)} disabled={busy}>
                Cancel
              </Button>
              <Button variant="danger" onClick={performDelete} loading={busy}>
                <Trash2 className="w-4 h-4" />
                Yes, delete permanently
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function TabButton({
  icon,
  label,
  count,
  active,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium border-2 transition",
        active
          ? "border-brand-400 bg-brand-50 dark:bg-brand-950 text-brand-800 dark:text-brand-200"
          : "border-ink-200 dark:border-ink-700 bg-white dark:bg-ink-900 text-ink-700 dark:text-ink-300 hover:border-brand-300"
      )}
    >
      {icon}
      {label}
      <span
        className={cn(
          "text-xs px-1.5 py-0.5 rounded-md font-mono",
          active
            ? "bg-brand-200 dark:bg-brand-800 text-brand-900 dark:text-brand-100"
            : "bg-ink-100 dark:bg-ink-800 text-ink-600 dark:text-ink-400"
        )}
      >
        {count}
      </span>
    </button>
  );
}

function Th({ children }: { children?: React.ReactNode }) {
  return (
    <th className="text-left py-3 px-4 text-xs uppercase tracking-wider text-ink-600 dark:text-ink-400 font-semibold">
      {children}
    </th>
  );
}
