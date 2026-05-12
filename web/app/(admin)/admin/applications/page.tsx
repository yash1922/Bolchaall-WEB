"use client";

import { useEffect, useState } from "react";
import { Check, X, ShieldCheck } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Spinner } from "@/components/ui/Spinner";
import { useToast } from "@/components/ui/Toast";
import { api } from "@/lib/api-client";
import { formatRelative } from "@/lib/utils";

export default function ApplicationsPage() {
  const { toast } = useToast();
  const [list, setList] = useState<Awaited<ReturnType<typeof api.adminApplications>> | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    try {
      const d = await api.adminApplications();
      setList(d);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function decide(id: string, name: string, decision: "approve" | "reject") {
    try {
      await api.adminDecide(id, decision);
      toast({
        title: `${decision === "approve" ? "Approved" : "Rejected"} ${name}`,
        variant: "success",
      });
      load();
    } catch (e) {
      toast({
        title: "Could not update",
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
      <div>
        <h1 className="font-display text-3xl mb-1">Doctor applications</h1>
        <p className="text-sm text-ink-600">{list.length} pending review.</p>
      </div>

      {list.length === 0 ? (
        <Card>
          <p className="text-sm text-ink-500 py-6 text-center">No pending applications.</p>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {list.map((a) => (
            <Card key={a.id}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <CardHeader
                    title={
                      <span className="inline-flex items-center gap-2">
                        <ShieldCheck className="w-5 h-5 text-ink-500" />
                        {a.name}
                      </span>
                    }
                    subtitle={`${a.email} · applied ${formatRelative(a.appliedAt)}`}
                    action={<Badge variant="warning">pending</Badge>}
                  />
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                    <div>
                      <p className="text-xs uppercase tracking-wider text-ink-500">License</p>
                      <p className="text-ink-900 font-mono text-xs mt-0.5">{a.license}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wider text-ink-500">Experience</p>
                      <p className="text-ink-900 mt-0.5">{a.experienceYears} yr</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wider text-ink-500">Certifications</p>
                      <p className="text-ink-900 mt-0.5">{a.certifications.join(", ") || "—"}</p>
                    </div>
                  </div>
                  {a.bio && <p className="text-sm text-ink-700 mt-3">{a.bio}</p>}
                </div>
                <div className="flex flex-col gap-2 shrink-0">
                  <Button onClick={() => decide(a.id, a.name, "approve")} size="sm">
                    <Check className="w-4 h-4" />
                    Approve
                  </Button>
                  <Button
                    onClick={() => decide(a.id, a.name, "reject")}
                    size="sm"
                    variant="ghost"
                  >
                    <X className="w-4 h-4" />
                    Reject
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
