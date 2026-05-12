"use client";

import { useEffect, useState } from "react";
import { Card, CardHeader } from "@/components/ui/Card";
import { Spinner } from "@/components/ui/Spinner";
import { Chat } from "@/components/shared/Chat";
import { api } from "@/lib/api-client";
import type { ChatDTO } from "shared";
import { cn } from "@/lib/utils";

export default function DoctorChatPage() {
  const [chats, setChats] = useState<ChatDTO[] | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const list = await api.listChats();
        if (!cancelled) {
          setChats(list);
          if (list.length > 0) setActiveId(list[0]!.id);
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (error)
    return (
      <Card>
        <p className="text-rose-600">{error}</p>
      </Card>
    );
  if (!chats)
    return (
      <div className="flex items-center justify-center py-24">
        <Spinner size={28} />
      </div>
    );

  if (chats.length === 0) {
    return (
      <Card>
        <CardHeader title="No conversations yet" subtitle="Once you have patients, chats will appear here." />
      </Card>
    );
  }

  const active = chats.find((c) => c.id === activeId);

  return (
    <div className="flex flex-col gap-4">
      <h1 className="font-display text-3xl">Chat</h1>
      <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-4">
        <Card className="p-2">
          {chats.map((c) => (
            <button
              key={c.id}
              onClick={() => setActiveId(c.id)}
              className={cn(
                "w-full text-left rounded-lg p-3 text-sm transition",
                c.id === activeId ? "bg-brand-100" : "hover:bg-white"
              )}
            >
              <p className="font-medium">{c.patientName}</p>
              <p className="text-xs text-ink-500">
                {c.unreadCount > 0 ? `${c.unreadCount} unread` : "no new messages"}
              </p>
            </button>
          ))}
        </Card>
        <div>
          {active ? (
            <Chat chatId={active.id} otherName={active.patientName} />
          ) : (
            <Card>
              <p className="text-sm text-ink-500">Select a conversation.</p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
