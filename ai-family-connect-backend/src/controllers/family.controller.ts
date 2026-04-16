import { Response } from "express";
import { AuthRequest } from "../middleware/auth.middleware";
import { FamilyLink } from "../models/FamilyLink";
import { User } from "../models/User";

// ─────────────────────────────────────────────
// @route   POST /api/family/invite-by-code
// @desc    Link to a family member using their invite code
// @access  Private
// ─────────────────────────────────────────────
export const inviteByCode = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { inviteCode } = req.body;
    const requesterId = req.user?.id;

    if (!inviteCode) {
      res.status(400).json({ success: false, message: "Invite code is required." });
      return;
    }

    // Find the target user by their invite code
    const targetUser = await User.findOne({ inviteCode: inviteCode.toUpperCase() });
    if (!targetUser) {
      res.status(404).json({ success: false, message: "No user found with this invite code." });
      return;
    }

    // Prevent self-linking
    if (targetUser._id.toString() === requesterId) {
      res.status(400).json({ success: false, message: "You cannot link to yourself." });
      return;
    }

    // Check if link already exists (in either direction)
    const existingLink = await FamilyLink.findOne({
      $or: [
        { requester: requesterId, recipient: targetUser._id },
        { requester: targetUser._id, recipient: requesterId },
      ],
    });

    if (existingLink) {
      if (existingLink.status === "accepted") {
        res.status(409).json({ success: false, message: "You are already linked with this person." });
      } else {
        res.status(409).json({ success: false, message: "A pending link request already exists." });
      }
      return;
    }

    // Create a new pending link request
    const newLink = await FamilyLink.create({
      requester: requesterId,
      recipient: targetUser._id,
      status: "pending",
    });

    res.status(201).json({
      success: true,
      message: `Family link request sent to ${targetUser.name}.`,
      link: newLink,
    });
  } catch (error: any) {
    console.error("[FAMILY] InviteByCode error:", error.message);
    res.status(500).json({ success: false, message: "Server error." });
  }
};

// ─────────────────────────────────────────────
// @route   POST /api/family/invite-by-email
// @desc    Send a family link request by searching user's email
// @access  Private
// ─────────────────────────────────────────────
export const inviteByEmail = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { email } = req.body;
    const requesterId = req.user?.id;

    if (!email) {
      res.status(400).json({ success: false, message: "Email is required." });
      return;
    }

    // Find the target user by email
    const targetUser = await User.findOne({ email: email.toLowerCase() });
    if (!targetUser) {
      res.status(404).json({ success: false, message: "No user found with this email address." });
      return;
    }

    // Prevent self-linking
    if (targetUser._id.toString() === requesterId) {
      res.status(400).json({ success: false, message: "You cannot link to yourself." });
      return;
    }

    // Check if link already exists
    const existingLink = await FamilyLink.findOne({
      $or: [
        { requester: requesterId, recipient: targetUser._id },
        { requester: targetUser._id, recipient: requesterId },
      ],
    });

    if (existingLink) {
      const msg =
        existingLink.status === "accepted"
          ? "You are already linked with this person."
          : "A pending link request already exists.";
      res.status(409).json({ success: false, message: msg });
      return;
    }

    // Create new pending link
    const newLink = await FamilyLink.create({
      requester: requesterId,
      recipient: targetUser._id,
      status: "pending",
    });

    res.status(201).json({
      success: true,
      message: `Family link request sent to ${targetUser.name}.`,
      link: newLink,
    });
  } catch (error: any) {
    console.error("[FAMILY] InviteByEmail error:", error.message);
    res.status(500).json({ success: false, message: "Server error." });
  }
};

// ─────────────────────────────────────────────
// @route   PUT /api/family/respond/:linkId
// @desc    Accept or reject a family link request
// @access  Private
// @body    { action: "accept" | "reject" }
// ─────────────────────────────────────────────
export const respondToInvite = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { linkId } = req.params;
    const { action } = req.body;
    const userId = req.user?.id;

    if (!["accept", "reject"].includes(action)) {
      res.status(400).json({ success: false, message: 'Action must be "accept" or "reject".' });
      return;
    }

    // Find the link where the current user is the recipient
    const link = await FamilyLink.findOne({ _id: linkId, recipient: userId, status: "pending" });
    if (!link) {
      res.status(404).json({ success: false, message: "Pending link request not found." });
      return;
    }

    if (action === "accept") {
      link.status = "accepted";
      link.acceptedAt = new Date();
      await link.save();
      res.status(200).json({ success: true, message: "Family link accepted.", link });
    } else {
      // Reject = delete the link
      await FamilyLink.findByIdAndDelete(linkId);
      res.status(200).json({ success: true, message: "Family link request rejected." });
    }
  } catch (error: any) {
    console.error("[FAMILY] RespondToInvite error:", error.message);
    res.status(500).json({ success: false, message: "Server error." });
  }
};

// ─────────────────────────────────────────────
// @route   GET /api/family/members
// @desc    Get all accepted family members for the current user
// @access  Private
// ─────────────────────────────────────────────
export const getMyFamilyMembers = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;

    // Find all accepted links where the user is either requester or recipient
    const links = await FamilyLink.find({
      $or: [{ requester: userId }, { recipient: userId }],
      status: "accepted",
    })
      .populate("requester", "name email role profilePhoto inviteCode")
      .populate("recipient", "name email role profilePhoto inviteCode");

    // Extract the "other" person from each link
    const familyMembers = links.map((link) => {
      const requester = link.requester as any;
      const recipient = link.recipient as any;
      const otherPerson =
        requester._id.toString() === userId ? recipient : requester;
      return {
        linkId: link._id,
        member: otherPerson,
        linkedSince: link.acceptedAt,
      };
    });

    res.status(200).json({
      success: true,
      count: familyMembers.length,
      familyMembers,
    });
  } catch (error: any) {
    console.error("[FAMILY] GetMyFamilyMembers error:", error.message);
    res.status(500).json({ success: false, message: "Server error." });
  }
};

// ─────────────────────────────────────────────
// @route   GET /api/family/pending
// @desc    Get all pending incoming link requests for the current user
// @access  Private
// ─────────────────────────────────────────────
export const getPendingRequests = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;

    const pendingLinks = await FamilyLink.find({
      recipient: userId,
      status: "pending",
    }).populate("requester", "name email role profilePhoto inviteCode");

    res.status(200).json({
      success: true,
      count: pendingLinks.length,
      pendingRequests: pendingLinks,
    });
  } catch (error: any) {
    console.error("[FAMILY] GetPendingRequests error:", error.message);
    res.status(500).json({ success: false, message: "Server error." });
  }
};

// ─────────────────────────────────────────────
// @route   DELETE /api/family/remove/:linkId
// @desc    Remove (unlink) a family member
// @access  Private
// ─────────────────────────────────────────────
export const removeFamilyMember = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { linkId } = req.params;
    const userId = req.user?.id;

    // Only allow deletion if the user is part of this link
    const link = await FamilyLink.findOne({
      _id: linkId,
      $or: [{ requester: userId }, { recipient: userId }],
    });

    if (!link) {
      res.status(404).json({ success: false, message: "Family link not found." });
      return;
    }

    await FamilyLink.findByIdAndDelete(linkId);

    res.status(200).json({ success: true, message: "Family member removed successfully." });
  } catch (error: any) {
    console.error("[FAMILY] RemoveFamilyMember error:", error.message);
    res.status(500).json({ success: false, message: "Server error." });
  }
};

// ─────────────────────────────────────────────
// @route   GET /api/family/my-invite-code
// @desc    Get the current user's invite code to share with others
// @access  Private
// ─────────────────────────────────────────────
export const getMyInviteCode = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = await User.findById(req.user?.id).select("name inviteCode");
    if (!user) {
      res.status(404).json({ success: false, message: "User not found." });
      return;
    }

    res.status(200).json({
      success: true,
      name: user.name,
      inviteCode: user.inviteCode,
      message: `Share this code with family members so they can link to you.`,
    });
  } catch (error: any) {
    console.error("[FAMILY] GetMyInviteCode error:", error.message);
    res.status(500).json({ success: false, message: "Server error." });
  }
};
