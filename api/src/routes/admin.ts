import { Router } from "express";
import { Types } from "mongoose";
import { asyncHandler } from "../lib/asyncHandler";
import { Errors } from "../lib/errors";
import { requireAuth, requireRole } from "../auth/middleware";
import { User } from "../models/User";
import { DoctorProfile } from "../models/DoctorProfile";
import { Patient } from "../models/Patient";
import { Chat } from "../models/Chat";
import { Message } from "../models/Message";
import { Emails } from "../services/email";

export const adminRouter = Router();

adminRouter.use(requireAuth, requireRole("admin"));

adminRouter.get(
  "/analytics",
  asyncHandler(async (_req, res) => {
    const [totalUsers, activePatients, trialPatients, paidPatients, approvedDoctors, pendingApplications] =
      await Promise.all([
        User.countDocuments({ suspended: { $ne: true } }),
        Patient.countDocuments({ subscriptionStatus: "active" }),
        Patient.countDocuments({ subscriptionStatus: "trial" }),
        Patient.countDocuments({ subscriptionStatus: "active" }),
        DoctorProfile.countDocuments({ status: "approved" }),
        DoctorProfile.countDocuments({ status: "pending" }),
      ]);

    res.json({
      ok: true,
      data: {
        totalUsers,
        activePatients,
        trialPatients,
        paidPatients,
        approvedDoctors,
        pendingApplications,
        monthlyRevenueDemo: paidPatients * 29,
      },
    });
  })
);

adminRouter.get(
  "/applications",
  asyncHandler(async (_req, res) => {
    const list = await DoctorProfile.find({ status: "pending" })
      .populate("userId", "name email createdAt")
      .lean();
    res.json({
      ok: true,
      data: list.map((d) => {
        const u = d.userId as unknown as {
          _id: Types.ObjectId;
          name: string;
          email: string;
          createdAt: Date;
        };
        return {
          id: String(d._id),
          userId: String(u._id),
          name: u.name,
          email: u.email,
          fullName: d.fullName ?? "",
          phone: d.phone ?? "",
          qualification: d.qualification ?? "",
          specialization: d.specialization ?? "",
          linkedinUrl: d.linkedinUrl ?? "",
          clinicName: d.clinicName ?? "",
          license: d.license,
          experienceYears: d.experienceYears,
          certifications: d.certifications,
          bio: d.bio,
          govIdUrl: d.govIdUrl ?? null,
          licenseDocUrl: d.licenseDocUrl ?? null,
          certificationsUrls: d.certificationsUrls ?? [],
          credentialsUrl: d.credentialsUrl ?? null,
          appliedAt: (d.submittedAt ?? u.createdAt).toISOString(),
        };
      }),
    });
  })
);

adminRouter.post(
  "/applications/:id/decision",
  asyncHandler(async (req, res) => {
    const decision = String(req.body?.decision ?? "");
    const remarks = String(req.body?.remarks ?? "").slice(0, 800);
    if (decision !== "approve" && decision !== "reject") {
      throw Errors.badRequest("decision must be approve|reject");
    }
    const status = decision === "approve" ? "approved" : "rejected";
    const now = new Date();
    const updated = await DoctorProfile.findByIdAndUpdate(
      req.params.id,
      {
        $set: {
          status,
          adminRemarks: remarks,
          ...(status === "approved" ? { approvedAt: now } : { rejectedAt: now }),
        },
      },
      { new: true }
    );
    if (!updated) throw Errors.notFound("Application not found");
    const u = await User.findById(updated.userId).select("email name").lean();
    if (u) {
      if (status === "approved") void Emails.doctorApproved(u.email, u.name);
      else void Emails.doctorRejected(u.email, u.name);
    }
    res.json({ ok: true, data: { status: updated.status } });
  })
);

adminRouter.get(
  "/users",
  asyncHandler(async (_req, res) => {
    const list = await User.find().sort({ createdAt: -1 }).limit(200).lean();
    res.json({
      ok: true,
      data: list.map((u) => ({
        id: String(u._id),
        email: u.email,
        name: u.name,
        role: u.role,
        suspended: u.suspended,
        createdAt: u.createdAt.toISOString(),
      })),
    });
  })
);

adminRouter.post(
  "/users/:id/suspend",
  asyncHandler(async (req, res) => {
    const suspend = req.body?.suspend !== false;
    const updated = await User.findByIdAndUpdate(
      req.params.id,
      { $set: { suspended: suspend } },
      { new: true }
    );
    if (!updated) throw Errors.notFound("User not found");
    res.json({ ok: true, data: { suspended: updated.suspended } });
  })
);

// ---- Admin: patient ↔ therapist assignment ----

adminRouter.get(
  "/assignments",
  asyncHandler(async (_req, res) => {
    const [patients, doctors] = await Promise.all([
      Patient.find().populate("userId", "name email").lean(),
      DoctorProfile.find({ status: "approved" }).populate("userId", "name email").lean(),
    ]);

    const doctorList = doctors.map((d) => {
      const u = d.userId as unknown as { _id: Types.ObjectId; name: string; email: string };
      return {
        userId: String(u._id),
        name: u.name,
        email: u.email,
        specialization: d.specialization ?? "",
        rating: d.rating ?? 5,
        rosterCount: 0, // filled below
      };
    });
    const counts = new Map<string, number>();
    for (const p of patients) {
      if (p.assignedDoctorId) {
        const k = String(p.assignedDoctorId);
        counts.set(k, (counts.get(k) ?? 0) + 1);
      }
    }
    for (const d of doctorList) d.rosterCount = counts.get(d.userId) ?? 0;

    const patientList = patients.map((p) => {
      const u = p.userId as unknown as { _id: Types.ObjectId; name: string; email: string };
      return {
        userId: String(u._id),
        name: u.name,
        email: u.email,
        subscriptionStatus: p.subscriptionStatus,
        assignedDoctorId: p.assignedDoctorId ? String(p.assignedDoctorId) : null,
        conditions: p.conditions ?? [],
      };
    });

    res.json({ ok: true, data: { patients: patientList, doctors: doctorList } });
  })
);

adminRouter.post(
  "/assignments",
  asyncHandler(async (req, res) => {
    const patientUserId = String(req.body?.patientUserId ?? "");
    const doctorUserId = req.body?.doctorUserId ? String(req.body.doctorUserId) : null;

    if (!Types.ObjectId.isValid(patientUserId)) {
      throw Errors.badRequest("Invalid patientUserId");
    }
    if (doctorUserId !== null && !Types.ObjectId.isValid(doctorUserId)) {
      throw Errors.badRequest("Invalid doctorUserId");
    }

    if (doctorUserId) {
      const doctor = await DoctorProfile.findOne({
        userId: doctorUserId,
        status: "approved",
      });
      if (!doctor) throw Errors.badRequest("Doctor must be an approved therapist.");
    }

    const updated = await Patient.findOneAndUpdate(
      { userId: patientUserId },
      { $set: { assignedDoctorId: doctorUserId } },
      { new: true }
    );
    if (!updated) throw Errors.notFound("Patient not found");
    res.json({
      ok: true,
      data: {
        patientUserId,
        assignedDoctorId: updated.assignedDoctorId ? String(updated.assignedDoctorId) : null,
      },
    });
  })
);

// ---- Admin: read-only chat monitor ----

adminRouter.get(
  "/chats",
  asyncHandler(async (_req, res) => {
    const chats = await Chat.find().sort({ lastMessageAt: -1 }).lean();
    const userIds = new Set<string>();
    for (const c of chats) {
      userIds.add(String(c.patientId));
      userIds.add(String(c.doctorId));
    }
    const users = await User.find({ _id: { $in: Array.from(userIds) } })
      .select("name email")
      .lean();
    const map = new Map(users.map((u) => [String(u._id), u]));

    res.json({
      ok: true,
      data: chats.map((c) => ({
        id: String(c._id),
        patientId: String(c.patientId),
        doctorId: String(c.doctorId),
        patientName: map.get(String(c.patientId))?.name ?? "Patient",
        doctorName: map.get(String(c.doctorId))?.name ?? "Doctor",
        lastMessageAt: c.lastMessageAt?.toISOString() ?? null,
        unreadByPatient: c.unreadByPatient ?? 0,
        unreadByDoctor: c.unreadByDoctor ?? 0,
      })),
    });
  })
);

adminRouter.get(
  "/chats/:id/messages",
  asyncHandler(async (req, res) => {
    const id = String(req.params.id ?? "");
    if (!Types.ObjectId.isValid(id)) throw Errors.notFound("Chat not found");
    const chat = await Chat.findById(id).lean();
    if (!chat) throw Errors.notFound("Chat not found");

    const messages = await Message.find({ chatId: chat._id })
      .sort({ createdAt: 1 })
      .lean();
    const userIds = Array.from(new Set(messages.map((m) => String(m.senderId))));
    const users = await User.find({ _id: { $in: userIds } })
      .select("name role")
      .lean();
    const map = new Map(users.map((u) => [String(u._id), u]));

    res.json({
      ok: true,
      data: messages.map((m) => ({
        id: String(m._id),
        senderId: String(m.senderId),
        senderName: map.get(String(m.senderId))?.name ?? "Unknown",
        senderRole: map.get(String(m.senderId))?.role ?? "unknown",
        body: m.body,
        createdAt: m.createdAt.toISOString(),
        readAt: m.readAt?.toISOString() ?? null,
      })),
    });
  })
);

// Admin moderation: delete a single message (audit trail not yet implemented).
adminRouter.delete(
  "/chats/messages/:id",
  asyncHandler(async (req, res) => {
    const id = String(req.params.id ?? "");
    if (!Types.ObjectId.isValid(id)) throw Errors.notFound("Message not found");
    const msg = await Message.findByIdAndDelete(id);
    if (!msg) throw Errors.notFound("Message not found");
    res.json({ ok: true, data: { deleted: true } });
  })
);
