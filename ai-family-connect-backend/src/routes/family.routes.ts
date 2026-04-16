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
import { protect } from "../middleware/auth.middleware";

const router = Router();
router.use(protect);

router.get("/my-invite-code", getMyInviteCode);
router.post("/invite-by-code", inviteByCode);
router.post("/invite-by-email", inviteByEmail);
router.get("/pending", getPendingRequests);
router.put("/respond/:linkId", respondToInvite);
router.get("/members", getMyFamilyMembers);
router.delete("/remove/:linkId", removeFamilyMember);

export default router;