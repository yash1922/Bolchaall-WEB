import { Router } from "express";
import { Types } from "mongoose";
import { asyncHandler } from "../lib/asyncHandler";
import { Errors } from "../lib/errors";
import { requireAuth } from "../auth/middleware";
import { SendMessageInput } from "../lib/zodSchemas";
import { Chat } from "../models/Chat";
import { Message } from "../models/Message";
import { Patient } from "../models/Patient";
import { User } from "../models/User";

export const chatRouter = Router();

chatRouter.use(requireAuth);

chatRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const userId = req.auth!.sub;
    const role = req.auth!.role;

    // Scope chats to the CURRENT therapist relationship only.
    //  - Patient: only see the chat with their currently-assigned doctor (history with old
    //    therapists stays in the DB but is hidden from both sides on re-assignment)
    //  - Doctor: only see chats with patients who are currently assigned to them
    //  - Admin: see everything (moderation)
    type ChatLean = {
      _id: unknown;
      patientId: unknown;
      doctorId: unknown;
      lastMessageAt?: Date | null;
      unreadByPatient: number;
      unreadByDoctor: number;
    };
    let chats: ChatLean[] = [];

    if (role === "patient") {
      const patient = await Patient.findOne({ userId }).lean();
      if (patient?.assignedDoctorId) {
        // Lazy-create the chat row if this is the first time we see this pair
        let chat = (await Chat.findOne({
          patientId: userId,
          doctorId: patient.assignedDoctorId,
        }).lean()) as ChatLean | null;
        if (!chat) {
          const created = await Chat.create({
            patientId: userId,
            doctorId: patient.assignedDoctorId,
          });
          chat = created.toObject() as ChatLean;
        }
        chats = [chat];
      }
    } else if (role === "doctor") {
      // Find all patients currently assigned to this doctor
      const myPatients = await Patient.find({ assignedDoctorId: userId })
        .select("userId")
        .lean();
      const patientUserIds = myPatients.map((p) => p.userId);
      if (patientUserIds.length > 0) {
        chats = (await Chat.find({
          doctorId: userId,
          patientId: { $in: patientUserIds },
        })
          .sort({ lastMessageAt: -1 })
          .lean()) as ChatLean[];
        // Lazy-create chats for assigned patients that don't have a chat row yet
        const haveChatFor = new Set(chats.map((c) => String(c.patientId)));
        for (const pid of patientUserIds) {
          if (!haveChatFor.has(String(pid))) {
            const created = await Chat.create({ patientId: pid, doctorId: userId });
            chats.push(created.toObject() as ChatLean);
          }
        }
      }
    } else {
      // Admin — show all chats unfiltered
      chats = (await Chat.find({}).sort({ lastMessageAt: -1 }).lean()) as ChatLean[];
    }

    const userIds = new Set<string>();
    for (const c of chats) {
      userIds.add(String(c.patientId));
      userIds.add(String(c.doctorId));
    }
    const users = await User.find({ _id: { $in: Array.from(userIds) } })
      .select("name")
      .lean();
    const nameMap = new Map(users.map((u) => [String(u._id), u.name]));

    res.json({
      ok: true,
      data: chats.map((c) => ({
        id: String(c._id),
        patientId: String(c.patientId),
        doctorId: String(c.doctorId),
        patientName: nameMap.get(String(c.patientId)) ?? "Patient",
        doctorName: nameMap.get(String(c.doctorId)) ?? "Doctor",
        unreadCount: role === "patient" ? c.unreadByPatient : c.unreadByDoctor,
        lastMessageAt: c.lastMessageAt?.toISOString() ?? null,
      })),
    });
  })
);

chatRouter.get(
  "/:chatId/messages",
  asyncHandler(async (req, res) => {
    const userId = req.auth!.sub;
    const chatId = String(req.params.chatId ?? "");
    const chat = await ensureMembership(chatId, userId, req.auth!.role);
    const list = await Message.find({ chatId: chat._id })
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();
    res.json({
      ok: true,
      data: list.reverse().map((m) => ({
        id: String(m._id),
        chatId: String(m.chatId),
        senderId: String(m.senderId),
        body: m.body,
        createdAt: m.createdAt.toISOString(),
        readAt: m.readAt?.toISOString() ?? null,
      })),
    });
  })
);

chatRouter.post(
  "/messages",
  asyncHandler(async (req, res) => {
    const input = SendMessageInput.parse(req.body);
    const userId = req.auth!.sub;
    const chat = await ensureMembership(input.chatId, userId, req.auth!.role);

    const created = await Message.create({
      chatId: chat._id,
      senderId: userId,
      body: input.body,
    });

    const update: Record<string, unknown> = { lastMessageAt: created.createdAt };
    if (req.auth!.role === "patient") update.$inc = { unreadByDoctor: 1 };
    else update.$inc = { unreadByPatient: 1 };
    await Chat.updateOne({ _id: chat._id }, update);

    res.json({
      ok: true,
      data: {
        id: String(created._id),
        chatId: String(created.chatId),
        senderId: String(created.senderId),
        body: created.body,
        createdAt: created.createdAt.toISOString(),
        readAt: null,
      },
    });
  })
);

chatRouter.post(
  "/:chatId/read",
  asyncHandler(async (req, res) => {
    const userId = req.auth!.sub;
    const chatId = String(req.params.chatId ?? "");
    const chat = await ensureMembership(chatId, userId, req.auth!.role);
    const reset = req.auth!.role === "patient" ? { unreadByPatient: 0 } : { unreadByDoctor: 0 };
    await Chat.updateOne({ _id: chat._id }, { $set: reset });
    await Message.updateMany(
      { chatId: chat._id, readAt: null, senderId: { $ne: userId } },
      { $set: { readAt: new Date() } }
    );
    res.json({ ok: true, data: { ok: true } });
  })
);

async function ensureMembership(chatId: string, userId: string, role: string) {
  const chat = await Chat.findById(chatId);
  if (!chat) throw Errors.notFound("Chat not found");
  // Base membership: must actually be a party to this chat.
  const isMember =
    (role === "patient" && String(chat.patientId) === userId) ||
    (role === "doctor" && String(chat.doctorId) === userId) ||
    role === "admin";
  if (!isMember) throw Errors.forbidden("Not a chat member");
  // Stricter check: the relationship must STILL be active. After re-assignment
  // the old chat is hidden — refuse direct URL access too.
  if (role === "patient") {
    const patient = await Patient.findOne({ userId }).select("assignedDoctorId").lean();
    if (!patient || String(patient.assignedDoctorId ?? "") !== String(chat.doctorId)) {
      throw Errors.forbidden("Chat archived — your therapist has changed");
    }
  } else if (role === "doctor") {
    const stillMine = await Patient.exists({
      userId: chat.patientId,
      assignedDoctorId: userId,
    });
    if (!stillMine) {
      throw Errors.forbidden("Chat archived — patient is no longer assigned to you");
    }
  }
  return chat as unknown as {
    _id: Types.ObjectId;
    patientId: Types.ObjectId;
    doctorId: Types.ObjectId;
  };
}
