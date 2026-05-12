"use client";

import { useEffect, useRef, useState } from "react";
import { Send } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { api } from "@/lib/api-client";
import { useAuthStore } from "@/lib/store";
import { useSocket } from "@/lib/hooks";
import type { MessageDTO } from "shared";
import { cn, formatRelative } from "@/lib/utils";

export function Chat({ chatId, otherName }: { chatId: string; otherName: string }) {
  const user = useAuthStore((s) => s.user);
  const socket = useSocket();
  const [messages, setMessages] = useState<MessageDTO[] | null>(null);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [otherTyping, setOtherTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const list = await api.listMessages(chatId);
        if (!cancelled) {
          setMessages(list);
          requestAnimationFrame(() => {
            scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
          });
        }
      } catch {
        // ignore
      }
    }
    load();
    api.markChatRead(chatId).catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [chatId]);

  useEffect(() => {
    if (!socket) return;
    socket.emit("chat:join", chatId);
    const onMessage = (m: MessageDTO) => {
      if (m.chatId !== chatId) return;
      setMessages((prev) => (prev ? [...prev, m] : [m]));
      requestAnimationFrame(() => {
        scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
      });
      api.markChatRead(chatId).catch(() => {});
    };
    const onTyping = (data: { chatId: string; userId: string; typing: boolean }) => {
      if (data.chatId !== chatId || data.userId === user?.id) return;
      setOtherTyping(data.typing);
    };
    socket.on("message:new", onMessage);
    socket.on("typing", onTyping);
    return () => {
      socket.off("message:new", onMessage);
      socket.off("typing", onTyping);
      socket.emit("chat:leave", chatId);
    };
  }, [socket, chatId, user?.id]);

  function handleTyping(value: string) {
    setBody(value);
    if (!socket) return;
    socket.emit("typing:start", chatId);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit("typing:stop", chatId);
    }, 1500);
  }

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim() || sending) return;
    setSending(true);
    try {
      // Prefer socket for live delivery; fall back to HTTP if socket unavailable.
      if (socket && socket.connected) {
        socket.emit("message:send", { chatId, body: body.trim() });
      } else {
        const m = await api.sendMessage({ chatId, body: body.trim() });
        setMessages((prev) => (prev ? [...prev, m] : [m]));
      }
      setBody("");
      socket?.emit("typing:stop", chatId);
      requestAnimationFrame(() => {
        scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
      });
    } finally {
      setSending(false);
    }
  }

  if (!messages) {
    return (
      <Card className="h-[500px] flex items-center justify-center">
        <Spinner size={24} />
      </Card>
    );
  }

  return (
    <Card className="flex flex-col h-[600px] p-0 overflow-hidden">
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-2">
        {messages.length === 0 && (
          <p className="text-center text-sm text-ink-500 py-12">
            No messages yet. Say hi to {otherName}!
          </p>
        )}
        {messages.map((m) => {
          const mine = m.senderId === user?.id;
          return (
            <div
              key={m.id}
              className={cn("max-w-[75%] flex flex-col gap-0.5", mine ? "self-end items-end" : "self-start items-start")}
            >
              <div
                className={cn(
                  "rounded-2xl px-3.5 py-2 text-sm",
                  mine
                    ? "bg-brand-200 border border-brand-200 text-ink-900"
                    : "bg-white border border-ink-200 text-ink-900"
                )}
              >
                {m.body}
              </div>
              <span className="text-[10px] text-ink-500 px-1">
                {formatRelative(m.createdAt)}
              </span>
            </div>
          );
        })}
      </div>
      {otherTyping && (
        <p className="px-5 pb-1 text-[11px] text-ink-500 italic">{otherName} is typing…</p>
      )}
      <form onSubmit={send} className="border-t border-ink-200 p-3 flex items-center gap-2">
        <Input
          value={body}
          onChange={(e) => handleTyping(e.target.value)}
          placeholder="Type a message…"
          disabled={sending}
        />
        <Button type="submit" loading={sending} disabled={!body.trim()}>
          <Send className="w-4 h-4" />
        </Button>
      </form>
    </Card>
  );
}
