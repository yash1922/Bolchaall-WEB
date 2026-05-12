"use client";

import { useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";
import { getAccessToken } from "./api-client";
import { useAuthStore } from "./store";

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL ?? "http://localhost:4000";

let socketSingleton: Socket | null = null;

export function useSocket(): Socket | null {
  const user = useAuthStore((s) => s.user);
  const [, force] = useState(0);
  const initialized = useRef(false);

  useEffect(() => {
    if (!user || initialized.current) return;
    const token = getAccessToken();
    if (!token) return;
    initialized.current = true;
    socketSingleton = io(SOCKET_URL, {
      auth: { token },
      transports: ["websocket"],
    });
    socketSingleton.on("connect", () => force((n) => n + 1));
    socketSingleton.on("disconnect", () => force((n) => n + 1));
    return () => {
      socketSingleton?.disconnect();
      socketSingleton = null;
      initialized.current = false;
    };
  }, [user]);

  return socketSingleton;
}

export function useAuth() {
  return useAuthStore();
}
