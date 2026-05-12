import type { Server as HttpServer } from "http";
import { Server } from "socket.io";
import { verifyAccessToken } from "./auth/tokens";
import { Chat } from "./models/Chat";
import { Message } from "./models/Message";

export function attachSocket(httpServer: HttpServer): Server {
  const io = new Server(httpServer, {
    cors: {
      origin: process.env.WEB_ORIGIN ?? "http://localhost:3000",
      credentials: true,
    },
  });

  io.use((socket, next) => {
    try {
      const raw = socket.handshake.auth?.token;
      if (typeof raw !== "string" || !raw) return next(new Error("missing token"));
      const payload = verifyAccessToken(raw);
      socket.data.userId = payload.sub;
      socket.data.role = payload.role;
      next();
    } catch {
      next(new Error("invalid token"));
    }
  });

  io.on("connection", (socket) => {
    const userId: string = socket.data.userId;
    const role: string = socket.data.role;

    socket.join(`user:${userId}`);

    socket.on("chat:join", async (chatId: string) => {
      const chat = await Chat.findById(chatId);
      if (!chat) return;
      const allowed =
        (role === "patient" && String(chat.patientId) === userId) ||
        (role === "doctor" && String(chat.doctorId) === userId) ||
        role === "admin";
      if (!allowed) return;
      socket.join(`chat:${chatId}`);
    });

    socket.on("chat:leave", (chatId: string) => {
      socket.leave(`chat:${chatId}`);
    });

    socket.on(
      "message:send",
      async (payload: { chatId: string; body: string }, ack?: (ok: boolean) => void) => {
        try {
          const chat = await Chat.findById(payload.chatId);
          if (!chat) {
            ack?.(false);
            return;
          }
          const allowed =
            (role === "patient" && String(chat.patientId) === userId) ||
            (role === "doctor" && String(chat.doctorId) === userId);
          if (!allowed) {
            ack?.(false);
            return;
          }
          if (typeof payload.body !== "string" || payload.body.length === 0 || payload.body.length > 2000) {
            ack?.(false);
            return;
          }
          const created = await Message.create({
            chatId: chat._id,
            senderId: userId,
            body: payload.body,
          });
          const update: Record<string, unknown> = { lastMessageAt: created.createdAt };
          if (role === "patient") update.$inc = { unreadByDoctor: 1 };
          else update.$inc = { unreadByPatient: 1 };
          await Chat.updateOne({ _id: chat._id }, update);

          io.to(`chat:${payload.chatId}`).emit("message:new", {
            id: String(created._id),
            chatId: String(created.chatId),
            senderId: String(created.senderId),
            body: created.body,
            createdAt: created.createdAt.toISOString(),
            readAt: null,
          });
          ack?.(true);
        } catch {
          ack?.(false);
        }
      }
    );

    socket.on("typing:start", (chatId: string) => {
      socket.to(`chat:${chatId}`).emit("typing", { userId, chatId, typing: true });
    });
    socket.on("typing:stop", (chatId: string) => {
      socket.to(`chat:${chatId}`).emit("typing", { userId, chatId, typing: false });
    });
  });

  return io;
}
