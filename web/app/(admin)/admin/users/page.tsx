"use client";

import { useEffect, useState } from "react";
import { Ban, RotateCcw } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Spinner } from "@/components/ui/Spinner";
import { useToast } from "@/components/ui/Toast";
import { api } from "@/lib/api-client";
import { formatRelative } from "@/lib/utils";

export default function UsersPage() {
  const { toast } = useToast();
  const [list, setList] = useState<Awaited<ReturnType<typeof api.adminUsers>> | null>(null);
  const [error, setError] = useState<string | null>(null);

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

  async function toggle(id: string, name: string, suspend: boolean) {
    try {
      await api.adminSuspend(id, suspend);
      toast({
        title: `${suspend ? "Suspended" : "Reinstated"} ${name}`,
        variant: "success",
      });
      load();
    } catch (e) {
      toast({ title: "Could not update", description: String(e), variant: "error" });
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
      <div>
        <h1 className="font-display text-3xl mb-1">All users</h1>
        <p className="text-sm text-ink-600">{list.length} accounts (most recent first).</p>
      </div>

      <Card className="p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-white">
            <tr>
              <th className="text-left py-3 px-4 text-xs uppercase tracking-wider text-ink-600">
                Name
              </th>
              <th className="text-left py-3 px-4 text-xs uppercase tracking-wider text-ink-600">
                Email
              </th>
              <th className="text-left py-3 px-4 text-xs uppercase tracking-wider text-ink-600">
                Role
              </th>
              <th className="text-left py-3 px-4 text-xs uppercase tracking-wider text-ink-600">
                Joined
              </th>
              <th className="text-left py-3 px-4 text-xs uppercase tracking-wider text-ink-600">
                Status
              </th>
              <th />
            </tr>
          </thead>
          <tbody>
            {list.map((u) => (
              <tr key={u.id} className="border-t border-ink-200">
                <td className="py-3 px-4">{u.name}</td>
                <td className="py-3 px-4 text-ink-600">{u.email}</td>
                <td className="py-3 px-4">
                  <Badge variant={u.role === "admin" ? "primary" : u.role === "doctor" ? "info" : "muted"}>
                    {u.role}
                  </Badge>
                </td>
                <td className="py-3 px-4 text-ink-500 text-xs">{formatRelative(u.createdAt)}</td>
                <td className="py-3 px-4">
                  {u.suspended ? <Badge variant="danger">suspended</Badge> : <Badge variant="success">active</Badge>}
                </td>
                <td className="py-3 px-4 text-right">
                  {u.role !== "admin" &&
                    (u.suspended ? (
                      <Button size="sm" variant="ghost" onClick={() => toggle(u.id, u.name, false)}>
                        <RotateCcw className="w-3.5 h-3.5" />
                        Reinstate
                      </Button>
                    ) : (
                      <Button size="sm" variant="ghost" onClick={() => toggle(u.id, u.name, true)}>
                        <Ban className="w-3.5 h-3.5" />
                        Suspend
                      </Button>
                    ))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
