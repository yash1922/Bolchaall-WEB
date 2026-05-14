"use client";

import { useEffect, useState } from "react";
import { Trash2, MessageSquare } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Spinner } from "@/components/ui/Spinner";
import { useToast } from "@/components/ui/Toast";
import { api } from "@/lib/api-client";
import { formatDateTime, formatRelative, cn } from "@/lib/utils";

type Chat = Awaited<ReturnType<typeof api.adminListChats>>[number];
type Message = Awaited<ReturnType<typeof api.adminChatMessages>>[number];

export default function AdminChatsPage() {
  const { toast } = useToast();
  const [chats, setChats] = useState<Chat[] | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  async function loadChats() {
    try {
      const list = await api.adminListChats();
      setChats(list);
      if (list.length > 0 && !activeId) setActiveId(list[0]!.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    }
  }

  async function loadMessages(chatId: string) {
    setMessages(null);
    try {
      const list = await api.adminChatMessages(chatId);
      setMessages(list);
    } catch (e) {
      toast({
        title: "Could not load messages",
        description: e instanceof Error ? e.message : String(e),
        variant: "error",
      });
    }
  }

  useEffect(() => {
    loadChats();
  }, []);

  useEffect(() => {
    if (activeId) loadMessages(activeId);
  }, [activeId]);

  async function deleteMessage(messageId: string) {
    if (!confirm("Delete this message permanently?")) return;
    setBusy(messageId);
    try {
      await api.adminDeleteMessage(messageId);
      toast({ title: "Message deleted", variant: "success" });
      if (activeId) await loadMessages(activeId);
    } catch (e) {
      toast({
        title: "Could not delete",
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
  if (!chats)
    return (
      <div className="flex items-center justify-center py-24">
        <Spinner size={28} />
      </div>
    );

  const active = chats.find((c) => c.id === activeId);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="font-display text-3xl mb-1 text-ink-900 dark:text-ink-100">Chat monitor</h1>
        <p className="text-sm text-ink-600 dark:text-ink-400">
          {chats.length} active conversations. Read-only view; you can also delete individual messages for moderation.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-4">
        <Card className="p-2 max-h-[70vh] overflow-y-auto">
          {chats.length === 0 ? (
            <p className="text-sm text-ink-500 py-6 text-center">No conversations yet.</p>
          ) : (
            chats.map((c) => {
              const unread = c.unreadByPatient + c.unreadByDoctor;
              return (
                <button
                  key={c.id}
                  onClick={() => setActiveId(c.id)}
                  className={cn(
                    "w-full text-left rounded-lg p-3 text-sm transition flex items-start justify-between gap-2",
                    c.id === activeId
                      ? "bg-brand-100 dark:bg-brand-900"
                      : "hover:bg-ink-100 dark:hover:bg-ink-800"
                  )}
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-ink-900 dark:text-ink-100 truncate">
                      {c.patientName} ↔ {c.doctorName}
                    </p>
                    <p className="text-xs text-ink-500">
                      {c.lastMessageAt ? formatRelative(c.lastMessageAt) : "no messages"}
                    </p>
                  </div>
                  {unread > 0 && <Badge variant="primary">{unread}</Badge>}
                </button>
              );
            })
          )}
        </Card>

        <div>
          {active ? (
            <Card className="flex flex-col h-[70vh] p-0 overflow-hidden">
              <div className="px-5 py-3 border-b border-ink-200 dark:border-ink-700 flex items-center justify-between gap-2">
                <CardHeader
                  title={
                    <span className="inline-flex items-center gap-2 text-base">
                      <MessageSquare className="w-4 h-4 text-brand-500" />
                      {active.patientName} &nbsp;⟷&nbsp; {active.doctorName}
                    </span>
                  }
                  subtitle={
                    active.lastMessageAt
                      ? `Last activity ${formatDateTime(active.lastMessageAt)}`
                      : "No messages yet"
                  }
                />
              </div>
              <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-2">
                {!messages && (
                  <div className="flex items-center justify-center py-12">
                    <Spinner size={20} />
                  </div>
                )}
                {messages && messages.length === 0 && (
                  <p className="text-sm text-ink-500 text-center py-12">
                    No messages in this conversation.
                  </p>
                )}
                {messages?.map((m) => {
                  const isPatient = m.senderRole === "patient";
                  return (
                    <div
                      key={m.id}
                      className={cn(
                        "max-w-[80%] flex flex-col gap-0.5 group",
                        isPatient ? "self-start items-start" : "self-end items-end"
                      )}
                    >
                      <p className="text-[11px] text-ink-500 px-1">
                        {m.senderName} · {m.senderRole}
                      </p>
                      <div
                        className={cn(
                          "rounded-2xl px-3.5 py-2 text-sm relative",
                          isPatient
                            ? "bg-white dark:bg-ink-900 border border-ink-200 dark:border-ink-700 text-ink-900 dark:text-ink-100"
                            : "bg-brand-100 dark:bg-brand-900 border border-brand-200 dark:border-brand-800 text-ink-900 dark:text-ink-100"
                        )}
                      >
                        {m.body}
                        <button
                          type="button"
                          aria-label="Delete message"
                          onClick={() => deleteMessage(m.id)}
                          disabled={busy === m.id}
                          className="opacity-0 group-hover:opacity-100 absolute -top-2 -right-2 p-1 rounded-full bg-rose-100 dark:bg-rose-900 text-rose-700 dark:text-rose-300 hover:bg-rose-200 transition"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                      <span className="text-[10px] text-ink-500 px-1">
                        {formatRelative(m.createdAt)}
                      </span>
                    </div>
                  );
                })}
              </div>
              <div className="px-5 py-3 border-t border-ink-200 dark:border-ink-700">
                <p className="text-xs text-ink-500 text-center">
                  Admin view — read-only. Use the trash icon on hover to remove a message for moderation.
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-2 mx-auto block"
                  onClick={() => activeId && loadMessages(activeId)}
                >
                  Refresh
                </Button>
              </div>
            </Card>
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
