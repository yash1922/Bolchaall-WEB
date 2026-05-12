"use client";

import { useEffect, useState } from "react";
import { Card, CardHeader } from "@/components/ui/Card";
import { Spinner } from "@/components/ui/Spinner";
import { Chat } from "@/components/shared/Chat";
import { api } from "@/lib/api-client";
import type { ChatDTO } from "shared";

export default function PatientChatPage() {
  const [chats, setChats] = useState<ChatDTO[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const list = await api.listChats();
        if (!cancelled) setChats(list);
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
        <CardHeader title="No conversations yet" subtitle="A therapist will reach out soon." />
      </Card>
    );
  }

  const c = chats[0]!;
  return (
    <div className="flex flex-col gap-4">
      <h1 className="font-display text-3xl">Chat with {c.doctorName}</h1>
      <Chat chatId={c.id} otherName={c.doctorName} />
    </div>
  );
}
