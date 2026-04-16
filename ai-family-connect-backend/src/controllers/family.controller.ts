import { Response } from "express";
import { AuthRequest } from "../middleware/auth.middleware";
import FamilyLink, { LinkStatus } from "../models/FamilyLink";
import User from "../models/User";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiResponse } from "../utils/ApiResponse";
import { AppError } from "../utils/AppError";

export const inviteByCode = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { inviteCode } = req.body;
  const requesterId = req.user?.id;

  if (!inviteCode) throw new AppError("Invite code is required.", 400);

  const targetUser = await User.findOne({ inviteCode: inviteCode.toUpperCase() });
  if (!targetUser) throw new AppError("No user found with this invite code.", 404);
  if (targetUser._id.toString() === requesterId) throw new AppError("You cannot link to yourself.", 400);

  const existingLink = await FamilyLink.findOne({
    $or: [
      { requester: requesterId, recipient: targetUser._id },
      { requester: targetUser._id, recipient: requesterId },
    ],
  });

  if (existingLink) {
    throw new AppError(
      existingLink.status === "accepted"
        ? "You are already linked with this person."
        : "A pending link request already exists.",
      409
    );
  }

  const newLink = await FamilyLink.create({
    requester: requesterId,
    recipient: targetUser._id,
    status: "pending",
  });

  res.status(201).json(new ApiResponse(201, { link: newLink }, `Link request sent to ${targetUser.fullName()}.`));
});

export const inviteByEmail = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { email } = req.body;
  const requesterId = req.user?.id;

  if (!email) throw new AppError("Email is required.", 400);

  const targetUser = await User.findOne({ email: email.toLowerCase() });
  if (!targetUser) throw new AppError("No user found with this email.", 404);
  if (targetUser._id.toString() === requesterId) throw new AppError("You cannot link to yourself.", 400);

  const existingLink = await FamilyLink.findOne({
    $or: [
      { requester: requesterId, recipient: targetUser._id },
      { requester: targetUser._id, recipient: requesterId },
    ],
  });

  if (existingLink) {
    throw new AppError(
      existingLink.status === "accepted"
        ? "You are already linked with this person."
        : "A pending link request already exists.",
      409
    );
  }

  const newLink = await FamilyLink.create({
    requester: requesterId,
    recipient: targetUser._id,
    status: "pending",
  });

  res.status(201).json(new ApiResponse(201, { link: newLink }, `Link request sent to ${targetUser.fullName()}.`));
});

export const respondToInvite = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { linkId } = req.params;
  const { action } = req.body;
  const userId = req.user?.id;

  if (!["accept", "reject"].includes(action)) {
    throw new AppError('Action must be "accept" or "reject".', 400);
  }

  const link = await FamilyLink.findOne({ _id: linkId, recipient: userId, status: "pending" });
  if (!link) throw new AppError("Pending link request not found.", 404);

  if (action === "accept") {
    link.status = LinkStatus.ACCEPTED;
    link.acceptedAt = new Date();
    await link.save();
    res.status(200).json(new ApiResponse(200, { link }, "Family link accepted."));
  } else {
    await FamilyLink.findByIdAndDelete(linkId);
    res.status(200).json(new ApiResponse(200, null, "Family link request rejected."));
  }
});

export const getMyFamilyMembers = asyncHandler(async (req: AuthRequest, res: Response) => {
  const userId = req.user?.id;

  const links = await FamilyLink.find({
    $or: [{ requester: userId }, { recipient: userId }],
    status: "accepted",
  })
    .populate("requester", "firstName lastName email role avatar inviteCode")
    .populate("recipient", "firstName lastName email role avatar inviteCode");

  const familyMembers = links.map((link: any) => {
    const other = link.requester._id.toString() === userId ? link.recipient : link.requester;
    return {
      linkId: link._id,
      member: other,
      linkedSince: link.acceptedAt,
    };
  });

  res.status(200).json(new ApiResponse(200, { familyMembers }));
});

export const getPendingRequests = asyncHandler(async (req: AuthRequest, res: Response) => {
  const userId = req.user?.id;

  const pendingLinks = await FamilyLink.find({
    recipient: userId,
    status: "pending",
  }).populate("requester", "firstName lastName email role avatar inviteCode");

  res.status(200).json(new ApiResponse(200, { pendingRequests: pendingLinks }));
});

export const removeFamilyMember = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { linkId } = req.params;
  const userId = req.user?.id;

  const link = await FamilyLink.findOne({
    _id: linkId,
    $or: [{ requester: userId }, { recipient: userId }],
  });

  if (!link) throw new AppError("Family link not found.", 404);

  await FamilyLink.findByIdAndDelete(linkId);
  res.status(200).json(new ApiResponse(200, null, "Family member removed."));
});

export const getMyInviteCode = asyncHandler(async (req: AuthRequest, res: Response) => {
  const user = await User.findById(req.user?.id).select("firstName lastName inviteCode");
  if (!user) throw new AppError("User not found.", 404);

  res.status(200).json(new ApiResponse(200, {
    name: user.fullName(),
    inviteCode: user.inviteCode,
  }));
});