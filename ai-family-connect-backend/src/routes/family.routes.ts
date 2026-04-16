import { Router } from "express";
import {
  inviteByCode,
  inviteByEmail,
  respondToInvite,
  getMyFamilyMembers,
  getPendingRequests,
  removeFamilyMember,
  getMyInviteCode,
} from "../controllers/family.controller";
import { protectRoute } from "../middleware/auth.middleware";

const router = Router();

// All family routes require authentication
router.use(protectRoute);

// ─────────────────────────────────────────────
// Invite / Link Routes
// ─────────────────────────────────────────────

/**
 * @route   GET /api/family/my-invite-code
 * @desc    Get your personal invite code to share with family
 */
router.get("/my-invite-code", getMyInviteCode);

/**
 * @route   POST /api/family/invite-by-code
 * @desc    Send a link request using a family member's invite code
 * @body    { inviteCode: string }
 */
router.post("/invite-by-code", inviteByCode);

/**
 * @route   POST /api/family/invite-by-email
 * @desc    Send a link request by looking up a family member's email
 * @body    { email: string }
 */
router.post("/invite-by-email", inviteByEmail);

// ─────────────────────────────────────────────
// Manage Requests
// ─────────────────────────────────────────────

/**
 * @route   GET /api/family/pending
 * @desc    View all incoming pending link requests
 */
router.get("/pending", getPendingRequests);

/**
 * @route   PUT /api/family/respond/:linkId
 * @desc    Accept or reject a pending link request
 * @body    { action: "accept" | "reject" }
 */
router.put("/respond/:linkId", respondToInvite);

// ─────────────────────────────────────────────
// Family Members
// ─────────────────────────────────────────────

/**
 * @route   GET /api/family/members
 * @desc    Get all accepted (linked) family members
 */
router.get("/members", getMyFamilyMembers);

/**
 * @route   DELETE /api/family/remove/:linkId
 * @desc    Unlink / remove a family member
 */
router.delete("/remove/:linkId", removeFamilyMember);

export default router;
