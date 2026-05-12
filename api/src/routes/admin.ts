import { Router } from "express";
import { Types } from "mongoose";
import { asyncHandler } from "../lib/asyncHandler";
import { Errors } from "../lib/errors";
import { requireAuth, requireRole } from "../auth/middleware";
import { User } from "../models/User";
import { DoctorProfile } from "../models/DoctorProfile";
import { Patient } from "../models/Patient";
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
          license: d.license,
          experienceYears: d.experienceYears,
          certifications: d.certifications,
          bio: d.bio,
          credentialsUrl: d.credentialsUrl,
          appliedAt: u.createdAt.toISOString(),
        };
      }),
    });
  })
);

adminRouter.post(
  "/applications/:id/decision",
  asyncHandler(async (req, res) => {
    const decision = String(req.body?.decision ?? "");
    if (decision !== "approve" && decision !== "reject") {
      throw Errors.badRequest("decision must be approve|reject");
    }
    const status = decision === "approve" ? "approved" : "rejected";
    const updated = await DoctorProfile.findByIdAndUpdate(
      req.params.id,
      { $set: { status } },
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
